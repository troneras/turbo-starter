import fp from 'fastify-plugin'
import type { FastifyInstance } from 'fastify'
import { eq, sql, desc, and, isNull, or, isNotNull, count } from 'drizzle-orm'
import { releases, entityVersions, entities, relationVersions } from '@cms/db/schema'
import type {
  Release,
  CreateReleaseRequest,
  UpdateReleaseRequest,
  ReleaseQuery,
  EntityVersion,
  DiffChange,
  ReleaseStatus
} from '@cms/contracts/types/releases'

declare module 'fastify' {
  interface FastifyInstance {
    releases: ReturnType<typeof releasesRepository>
  }
}

interface ReleaseFilters {
  status?: ReleaseStatus
  createdBy?: string
  limit?: number
  offset?: number
}

interface ReleasesListResult {
  releases: Release[]
  total: number
  limit: number
  offset: number
}

export function releasesRepository(fastify: FastifyInstance) {
  return {
    /**
     * Create a new release
     */
    async createRelease(data: CreateReleaseRequest, userId: string): Promise<Release> {
      return await fastify.db.transaction(async (tx) => {
        // Create the release
        const [release] = await tx
          .insert(releases)
          .values({
            name: data.name,
            description: data.description || null,
            createdBy: userId,
            status: 'OPEN'
          })
          .returning()

        // Note: We deliberately do NOT copy content from another release
        // Releases start empty and only contain intentional changes
        // This avoids O(n) performance issues and aligns with Git-like workflow

        return this.formatRelease(release!)
      })
    },

    /**
     * Get a single release by ID
     */
    async getRelease(id: number): Promise<Release | null> {
      const [release] = await fastify.db
        .select()
        .from(releases)
        .where(eq(releases.id, BigInt(id)))
        .limit(1)

      return release ? this.formatRelease(release) : null
    },

    /**
     * List releases with filters
     */
    async getReleases(filters: ReleaseFilters = {}): Promise<ReleasesListResult> {
      const { status, createdBy, limit = 50, offset = 0 } = filters

      // Build where conditions
      const conditions = []
      if (status) conditions.push(eq(releases.status, status))
      if (createdBy) conditions.push(eq(releases.createdBy, createdBy))

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined

      // Get releases
      const [releasesList, [countResult]] = await Promise.all([
        fastify.db
          .select()
          .from(releases)
          .where(whereClause)
          .orderBy(desc(releases.createdAt))
          .limit(limit)
          .offset(offset),
        fastify.db
          .select({ total: count() })
          .from(releases)
          .where(whereClause)
      ])

      return {
        releases: releasesList.map(r => this.formatRelease(r)),
        total: countResult?.total || 0,
        limit,
        offset
      }
    },

    /**
     * Update release metadata
     */
    async updateRelease(id: number, data: UpdateReleaseRequest): Promise<Release> {
      const updateData: any = {}
      if (data.name !== undefined) updateData.name = data.name
      if (data.description !== undefined) updateData.description = data.description
      if (data.status !== undefined) updateData.status = data.status

      const [updated] = await fastify.db
        .update(releases)
        .set(updateData)
        .where(eq(releases.id, BigInt(id)))
        .returning()

      if (!updated) {
        throw new Error('Release not found')
      }

      return this.formatRelease(updated)
    },

    /**
     * Deploy a release
     */
    async deployRelease(id: number, userId: string): Promise<Release> {
      return await fastify.db.transaction(async (tx) => {
        // Check release exists and is CLOSED
        const [release] = await tx
          .select()
          .from(releases)
          .where(eq(releases.id, BigInt(id)))
          .limit(1)

        if (!release) {
          throw new Error('Release not found')
        }

        if (release.status !== 'CLOSED') {
          throw new Error('Only CLOSED releases can be deployed')
        }

        // Check for conflicts with other open releases
        const conflictsResult = await tx.execute(
          sql`SELECT * FROM check_release_conflicts(${id})`
        )
        const conflicts = conflictsResult as any[]

        if (conflicts.length > 0) {
          const conflictMsg = conflicts
            .slice(0, 5) // Show first 5 conflicts
            .map(c => `Entity ${c.entity_id} (${c.entity_type}) conflicts with release "${c.conflicting_release_name}"`)
            .join('; ')
          const moreConflicts = conflicts.length > 5 ? ` and ${conflicts.length - 5} more conflicts` : ''
          throw new Error(`Cannot deploy: ${conflictMsg}${moreConflicts}`)
        }

        // Get next deploy sequence number
        const result = await tx.execute(
          sql`SELECT nextval('deploy_seq') as nextval`
        )
        const nextval = (result as any)[0]?.nextval

        // Update release
        const [deployed] = await tx
          .update(releases)
          .set({
            status: 'DEPLOYED',
            deploySeq: BigInt(nextval),
            deployedAt: new Date(),
            deployedBy: userId
          })
          .where(eq(releases.id, BigInt(id)))
          .returning()

        return this.formatRelease(deployed!)
      })
    },

    /**
     * Rollback to a previous release
     */
    async rollbackToRelease(targetReleaseId: number, userId: string): Promise<Release> {
      return await fastify.db.transaction(async (tx) => {
        // Check target release exists and was previously deployed
        const [targetRelease] = await tx
          .select()
          .from(releases)
          .where(
            and(
              eq(releases.id, BigInt(targetReleaseId)),
              isNotNull(releases.deploySeq)
            )
          )
          .limit(1)

        if (!targetRelease) {
          throw new Error('Target release not found or was never deployed')
        }

        // Get the currently deployed release (highest deploy_seq)
        const [currentDeployed] = await tx
          .select()
          .from(releases)
          .where(eq(releases.status, 'DEPLOYED'))
          .orderBy(desc(releases.deploySeq))
          .limit(1)

        // Mark current deployed release as ROLLED_BACK
        if (currentDeployed) {
          await tx
            .update(releases)
            .set({ status: 'ROLLED_BACK' })
            .where(eq(releases.id, currentDeployed.id))
        }

        // Get next deploy sequence
        const result = await tx.execute(
          sql`SELECT nextval('deploy_seq') as nextval`
        )
        const nextval = (result as any)[0]?.nextval

        // Update target release to be deployed again with new deploy sequence
        const [redeployed] = await tx
          .update(releases)
          .set({
            status: 'DEPLOYED',
            deploySeq: BigInt(nextval),
            deployedAt: new Date(),
            deployedBy: userId
          })
          .where(eq(releases.id, BigInt(targetReleaseId)))
          .returning()

        return this.formatRelease(redeployed!)
      })
    },

    /**
     * Execute a query with release context
     * This ensures the release context is properly set for views that depend on it
     */
    async executeWithReleaseContext<T>(releaseId: number, queryFn: () => Promise<T>): Promise<T> {
      // Set release context for this query
      await fastify.db.execute(sql`SELECT set_active_release(${releaseId})`)

      try {
        return await queryFn()
      } finally {
        // Clear release context to avoid leaking to other queries
        await fastify.db.execute(sql`SELECT set_active_release(NULL)`)
      }
    },

    /**
     * Preview differences between two releases
     */
    async previewDiff(
      fromReleaseId: number,
      toReleaseId: number,
      entityTypes?: string[],
      brandIds?: number[]
    ): Promise<DiffChange[]> {
      // Build filter conditions
      const typeFilter = entityTypes?.length
        ? sql`AND ev.entity_type = ANY(${entityTypes})`
        : sql``

      const brandFilter = brandIds?.length
        ? sql`AND ev.brand_id = ANY(${brandIds})`
        : sql``

      // Get all changes between releases
      const changes = await fastify.db.execute<{
        entity_id: string
        entity_type: string
        from_version: EntityVersion | null
        to_version: EntityVersion | null
      }>(sql`
        WITH from_versions AS (
          SELECT * FROM entity_versions 
          WHERE release_id = ${fromReleaseId}
          ${typeFilter}
          ${brandFilter}
        ),
        to_versions AS (
          SELECT * FROM entity_versions 
          WHERE release_id = ${toReleaseId}
          ${typeFilter}
          ${brandFilter}
        ),
        all_entities AS (
          SELECT DISTINCT entity_id FROM (
            SELECT entity_id FROM from_versions
            UNION
            SELECT entity_id FROM to_versions
          ) e
        )
        SELECT 
          ae.entity_id,
          COALESCE(fv.entity_type, tv.entity_type) as entity_type,
          row_to_json(fv) as from_version,
          row_to_json(tv) as to_version
        FROM all_entities ae
        LEFT JOIN from_versions fv ON ae.entity_id = fv.entity_id
        LEFT JOIN to_versions tv ON ae.entity_id = tv.entity_id
        WHERE fv IS DISTINCT FROM tv
      `)

      // Format changes
      return (changes as any).map((change: any) => {
        let changeType: 'ADDED' | 'MODIFIED' | 'DELETED'
        if (!change.from_version) changeType = 'ADDED'
        else if (!change.to_version) changeType = 'DELETED'
        else changeType = 'MODIFIED'

        // Convert JSON to EntityVersion format
        const formatVersion = (v: any): EntityVersion | undefined => {
          if (!v) return undefined
          return {
            entityId: Number(v.entity_id),
            releaseId: Number(v.release_id),
            entityType: v.entity_type,
            brandId: v.brand_id,
            jurisdictionId: v.jurisdiction_id,
            localeId: v.locale_id,
            title: v.title,
            slug: v.slug,
            status: v.status || 'draft',
            payload: v.payload || {},
            changeType: v.change_type,
            changeSetId: v.change_set_id,
            changeReason: v.change_reason,
            createdBy: v.created_by,
            createdAt: new Date(v.created_at).toISOString()
          }
        }

        return {
          entityId: Number(change.entity_id),
          entityType: change.entity_type,
          changeType,
          fromVersion: formatVersion(change.from_version),
          toVersion: formatVersion(change.to_version),
          differences: this.calculateDifferences(change.from_version as any, change.to_version as any)
        }
      })
    },

    /**
     * Calculate field-level differences between versions
     */
    calculateDifferences(
      fromVersion: EntityVersion | null,
      toVersion: EntityVersion | null
    ): Record<string, any> | undefined {
      if (!fromVersion || !toVersion) return undefined

      const differences: Record<string, any> = {}
      const fields = ['title', 'slug', 'status', 'payload'] as const

      for (const field of fields) {
        if (fromVersion[field] !== toVersion[field]) {
          differences[field] = {
            from: fromVersion[field],
            to: toVersion[field]
          }
        }
      }

      return Object.keys(differences).length > 0 ? differences : undefined
    },

    /**
     * Format release for API response
     * Safely converts BigInt values to Numbers for JSON serialization
     */
    formatRelease(release: any): Release {
      // Ensure safe conversion of BigInt IDs
      const id = typeof release.id === 'bigint' ? Number(release.id) : release.id
      const deploySeq = release.deploySeq ?
        (typeof release.deploySeq === 'bigint' ? Number(release.deploySeq) : release.deploySeq) :
        null

      // Warn if values are too large for safe Number representation
      if (typeof release.id === 'bigint' && release.id > Number.MAX_SAFE_INTEGER) {
        fastify.log.warn({ releaseId: release.id.toString() }, 'Release ID exceeds MAX_SAFE_INTEGER')
      }

      return {
        id,
        name: release.name,
        description: release.description,
        status: release.status,
        deploySeq,
        createdBy: release.createdBy,
        createdAt: release.createdAt.toISOString(),
        deployedAt: release.deployedAt ? release.deployedAt.toISOString() : null,
        deployedBy: release.deployedBy
      }
    },
    async setActiveRelease(releaseId: number) {
      await fastify.db.execute(sql`SELECT set_active_release(${releaseId})`)
    }
  }
}

export const releasesRepositoryPlugin = fp(async function (fastify: FastifyInstance) {
  fastify.decorate('releases', releasesRepository(fastify))
}, {
  name: 'releases-repository',
  dependencies: ['db']
})