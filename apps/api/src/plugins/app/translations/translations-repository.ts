import fp from 'fastify-plugin'
import type { FastifyInstance } from 'fastify'
import { sql } from 'drizzle-orm'
import type {
  TranslationKey,
  TranslationVariant,
  CreateTranslationKeyRequest,
  UpdateTranslationKeyRequest,
  CreateTranslationVariantRequest,
  UpdateTranslationVariantRequest,
  TranslationStats
} from '@cms/contracts/types/translations'

declare module 'fastify' {
  interface FastifyInstance {
    translationsRepository: ReturnType<typeof translationsRepository>
  }
}

export function translationsRepository(fastify: FastifyInstance) {
  const db = fastify.db

  // Helper function to safely convert dates to ISO strings
  const toISOString = (date: any): string => {
    if (!date) return new Date().toISOString()
    return date instanceof Date ? date.toISOString() : new Date(date).toISOString()
  }

  return {
    /**
     * Get translation keys with tree structure
     */
    async getTranslationKeys(parentPath?: string, depth: number = 1): Promise<TranslationKey[]> {
      const result = await db.execute(sql`
        SELECT DISTINCT
          ev.entity_id as id,
          ev.payload->>'full_key' as full_key,
          ev.payload->>'description' as description,
          ev.created_by,
          ev.created_at
        FROM v_entities ev
        WHERE ev.entity_type = 'translation_key'
        ORDER BY ev.payload->>'full_key'
      `)

      return (result as any).map((row: any) => ({
        id: Number(row.id),
        fullKey: row.full_key,
        description: row.description,
        createdBy: row.created_by,
        createdAt: toISOString(row.created_at)
      }))
    },

    /**
     * Create a new translation key
     */
    async createTranslationKey(data: CreateTranslationKeyRequest, userId: string): Promise<TranslationKey> {
      // Check if key already exists
      const existing = await db.execute(sql`
        SELECT 1 FROM v_entities
        WHERE entity_type = 'translation_key'
          AND payload->>'full_key' = ${data.fullKey}
        LIMIT 1
      `)

      if ((existing as any).length > 0) {
        throw new Error('Translation key already exists')
      }

      // Create entity and version
      const payload = {
        full_key: data.fullKey,
        description: data.description || null
      }

      const result = await db.execute(sql`
        WITH new_entity AS (
          INSERT INTO entities (entity_type)
          VALUES ('translation_key')
          RETURNING id
        ),
        new_version AS (
          INSERT INTO entity_versions (
            entity_id, release_id, entity_type, entity_name, entity_key,
            payload, change_type, created_by
          )
          SELECT 
            e.id,
            get_active_release(),
            'translation_key',
            ${data.fullKey},
            ${data.fullKey},
            ${JSON.stringify(payload)},
            'CREATE',
            ${userId}
          FROM new_entity e
          RETURNING *
        )
        SELECT 
          entity_id as id,
          payload->>'full_key' as full_key,
          payload->>'description' as description,
          created_by,
          created_at
        FROM new_version
      `)

      const row = (result as any)[0]
      return {
        id: Number(row.id),
        fullKey: row.full_key,
        description: row.description,
        createdBy: row.created_by,
        createdAt: toISOString(row.created_at)
      }
    },

    /**
     * Update a translation key
     */
    async updateTranslationKey(id: number, data: UpdateTranslationKeyRequest, userId: string): Promise<TranslationKey> {
      // Create new version for the update (append-only)
      const result = await db.execute(sql`
        INSERT INTO entity_versions (
          entity_id, release_id, entity_type, entity_name, entity_key,
          payload, change_type, created_by
        )
        SELECT 
          entity_id,
          get_active_release(),
          entity_type,
          entity_name,
          entity_key,
          jsonb_set(
            payload,
            '{description}',
            to_jsonb(${data.description}::text)
          ),
          'UPDATE',
          ${userId}
        FROM v_entities
        WHERE entity_id = ${id}
          AND entity_type = 'translation_key'
        RETURNING 
          entity_id as id,
          payload->>'full_key' as full_key,
          payload->>'description' as description,
          created_by,
          created_at
      `)

      if ((result as any).length === 0) {
        throw new Error('Translation key not found')
      }

      const row = (result as any)[0]
      return {
        id: Number(row.id),
        fullKey: row.full_key,
        description: row.description,
        createdBy: row.created_by,
        createdAt: toISOString(row.created_at)
      }
    },

    /**
     * Delete a translation key
     */
    async deleteTranslationKey(id: number, userId: string): Promise<void> {
      // Create new version for the deletion (append-only)
      const result = await db.execute(sql`
        INSERT INTO entity_versions (
          entity_id, release_id, entity_type, entity_name, entity_key,
          payload, change_type, is_deleted, created_by
        )
        SELECT 
          entity_id,
          get_active_release(),
          entity_type,
          entity_name,
          entity_key,
          payload,
          'DELETE',
          true,
          ${userId}
        FROM v_entities
        WHERE entity_id = ${id}
          AND entity_type = 'translation_key'
      `)

      if ((result as any).length === 0) {
        throw new Error('Translation key not found')
      }
    },

    /**
     * Get translation variants with filters
     */
    async getTranslationVariants(filters: {
      fullKey?: string
      locale?: string
      brandId?: number
      status?: 'DRAFT' | 'PENDING' | 'APPROVED'
    }): Promise<TranslationVariant[]> {
      let query = sql`
        SELECT 
          ev.entity_id as id,
          (ev.payload->>'key_id')::bigint as key_id,
          ev.payload->>'full_key' as full_key,
          ev.payload->>'locale' as locale,
          ev.brand_id,
          ev.payload->>'value' as value,
          ev.payload->>'status' as status,
          ev.created_by,
          ev.created_at
        FROM v_entities ev
        WHERE ev.entity_type = 'translation'
      `

      if (filters.fullKey) {
        query = sql`${query} AND ev.payload->>'full_key' = ${filters.fullKey}`
      }
      if (filters.locale) {
        query = sql`${query} AND ev.payload->>'locale' = ${filters.locale}`
      }
      if (filters.brandId !== undefined) {
        if (filters.brandId === null) {
          query = sql`${query} AND ev.brand_id IS NULL`
        } else {
          query = sql`${query} AND ev.brand_id = ${filters.brandId}`
        }
      }
      if (filters.status) {
        query = sql`${query} AND ev.payload->>'status' = ${filters.status}`
      }

      query = sql`${query} ORDER BY ev.payload->>'full_key', ev.payload->>'locale', ev.brand_id`

      const result = await db.execute(query)

      return (result as any).map((row: any) => ({
        id: Number(row.id),
        keyId: Number(row.key_id),
        fullKey: row.full_key,
        locale: row.locale,
        brandId: row.brand_id ? Number(row.brand_id) : null,
        value: row.value,
        status: row.status as 'DRAFT' | 'PENDING' | 'APPROVED',
        createdBy: row.created_by,
        createdAt: toISOString(row.created_at),
        approvedBy: row.status === 'APPROVED' ? row.created_by : null,
        approvedAt: row.status === 'APPROVED' ? toISOString(row.created_at) : null
      }))
    },

    /**
     * Create a translation variant
     */
    async createTranslationVariant(data: CreateTranslationVariantRequest, userId: string): Promise<TranslationVariant> {
      // Get the translation key
      const keyResult = await db.execute(sql`
        SELECT entity_id FROM v_entities
        WHERE entity_type = 'translation_key'
          AND payload->>'full_key' = ${data.fullKey}
        LIMIT 1
      `)

      if ((keyResult as any).length === 0) {
        throw new Error('Translation key not found')
      }

      const keyId = (keyResult as any)[0].entity_id

      // Check if variant already exists
      const existingQuery = data.brandId
        ? sql`
          SELECT 1 FROM v_entities
          WHERE entity_type = 'translation'
            AND payload->>'full_key' = ${data.fullKey}
            AND payload->>'locale' = ${data.locale}
            AND brand_id = ${data.brandId}
          LIMIT 1
        `
        : sql`
          SELECT 1 FROM v_entities
          WHERE entity_type = 'translation'
            AND payload->>'full_key' = ${data.fullKey}
            AND payload->>'locale' = ${data.locale}
            AND brand_id IS NULL
          LIMIT 1
        `

      const existing = await db.execute(existingQuery)

      if ((existing as any).length > 0) {
        throw new Error('Translation variant already exists')
      }

      // Create entity and version
      const result = await db.execute(sql`
        WITH new_entity AS (
          INSERT INTO entities (entity_type)
          VALUES ('translation')
          RETURNING id
        ),
        new_version AS (
          INSERT INTO entity_versions (
            entity_id, release_id, entity_type, entity_name,
            brand_id, payload, change_type, created_by
          )
          SELECT 
            e.id,
            get_active_release(),
            'translation',
            ${data.fullKey} || ' (' || ${data.locale} || ')',
            ${data.brandId || null},
            jsonb_build_object(
              'key_id', ${keyId},
              'full_key', ${data.fullKey},
              'locale', ${data.locale},
              'value', ${data.value},
              'status', ${data.status || 'DRAFT'}
            ),
            'CREATE',
            ${userId}
          FROM new_entity e
          RETURNING *
        )
        SELECT 
          entity_id as id,
          (payload->>'key_id')::bigint as key_id,
          payload->>'full_key' as full_key,
          payload->>'locale' as locale,
          brand_id,
          payload->>'value' as value,
          payload->>'status' as status,
          created_by,
          created_at
        FROM new_version
      `)

      const row = (result as any)[0]
      return {
        id: Number(row.id),
        keyId: Number(row.key_id),
        fullKey: row.full_key,
        locale: row.locale,
        brandId: row.brand_id ? Number(row.brand_id) : null,
        value: row.value,
        status: row.status as 'DRAFT' | 'PENDING' | 'APPROVED',
        createdBy: row.created_by,
        createdAt: toISOString(row.created_at),
        approvedBy: null,
        approvedAt: null
      }
    },

    /**
     * Update a translation variant
     */
    async updateTranslationVariant(
      id: number,
      data: UpdateTranslationVariantRequest,
      userId: string
    ): Promise<TranslationVariant> {
      // Create new version for the update (append-only)
      const result = await db.execute(sql`
        INSERT INTO entity_versions (
          entity_id, release_id, entity_type, entity_name,
          brand_id, payload, change_type, created_by
        )
        SELECT 
          entity_id,
          get_active_release(),
          entity_type,
          entity_name,
          brand_id,
          jsonb_set(
            jsonb_set(
              payload,
              '{value}',
              to_jsonb(${data.value}::text)
            ),
            '{status}',
            to_jsonb(${data.status || 'DRAFT'}::text)
          ),
          'UPDATE',
          ${userId}
        FROM v_entities
        WHERE entity_id = ${id}
          AND entity_type = 'translation'
        RETURNING 
          entity_id as id,
          (payload->>'key_id')::bigint as key_id,
          payload->>'full_key' as full_key,
          payload->>'locale' as locale,
          brand_id,
          payload->>'value' as value,
          payload->>'status' as status,
          created_by,
          created_at
      `)

      if ((result as any).length === 0) {
        throw new Error('Translation variant not found')
      }

      const row = (result as any)[0]
      return {
        id: Number(row.id),
        keyId: Number(row.key_id),
        fullKey: row.full_key,
        locale: row.locale,
        brandId: row.brand_id ? Number(row.brand_id) : null,
        value: row.value,
        status: row.status as 'DRAFT' | 'PENDING' | 'APPROVED',
        createdBy: row.created_by,
        createdAt: toISOString(row.created_at),
        approvedBy: row.status === 'APPROVED' ? row.created_by : null,
        approvedAt: row.status === 'APPROVED' ? toISOString(row.created_at) : null
      }
    },

    /**
     * Update translation status
     */
    async updateTranslationStatus(
      id: number,
      status: 'DRAFT' | 'PENDING' | 'APPROVED',
      userId: string
    ): Promise<TranslationVariant> {
      // Create new version for the update (append-only)
      const result = await db.execute(sql`
        INSERT INTO entity_versions (
          entity_id, release_id, entity_type, entity_name,
          brand_id, payload, change_type, created_by
        )
        SELECT 
          entity_id,
          get_active_release(),
          entity_type,
          entity_name,
          brand_id,
          jsonb_set(
            payload,
            '{status}',
            to_jsonb(${status}::text)
          ),
          'UPDATE',
          ${userId}
        FROM v_entities
        WHERE entity_id = ${id}
          AND entity_type = 'translation'
        RETURNING 
          entity_id as id,
          (payload->>'key_id')::bigint as key_id,
          payload->>'full_key' as full_key,
          payload->>'locale' as locale,
          brand_id,
          payload->>'value' as value,
          payload->>'status' as status,
          created_by,
          created_at
      `)

      if ((result as any).length === 0) {
        throw new Error('Translation variant not found')
      }

      const row = (result as any)[0]
      return {
        id: Number(row.id),
        keyId: Number(row.key_id),
        fullKey: row.full_key,
        locale: row.locale,
        brandId: row.brand_id ? Number(row.brand_id) : null,
        value: row.value,
        status: row.status as 'DRAFT' | 'PENDING' | 'APPROVED',
        createdBy: row.created_by,
        createdAt: toISOString(row.created_at),
        approvedBy: status === 'APPROVED' ? row.created_by : null,
        approvedAt: status === 'APPROVED' ? toISOString(row.created_at) : null
      }
    },

    /**
     * Delete a translation variant
     */
    async deleteTranslationVariant(id: number, userId: string): Promise<void> {
      // Create new version for the deletion (append-only)
      const result = await db.execute(sql`
        INSERT INTO entity_versions (
          entity_id, release_id, entity_type, entity_name,
          brand_id, payload, change_type, is_deleted, created_by
        )
        SELECT 
          entity_id,
          get_active_release(),
          entity_type,
          entity_name,
          brand_id,
          payload,
          'DELETE',
          true,
          ${userId}
        FROM v_entities
        WHERE entity_id = ${id}
          AND entity_type = 'translation'
      `)

      if ((result as any).length === 0) {
        throw new Error('Translation variant not found')
      }
    },

    /**
     * Get translation statistics
     */
    async getTranslationStats(): Promise<TranslationStats> {
      const result = await db.execute(sql`
        WITH stats AS (
          SELECT
            COUNT(DISTINCT CASE WHEN entity_type = 'translation_key' THEN entity_id END) AS total_keys,
            COUNT(CASE WHEN entity_type = 'translation' THEN 1 END) AS total_translations,
            COUNT(CASE WHEN entity_type = 'translation' AND payload->>'status' = 'DRAFT' THEN 1 END) AS draft_count,
            COUNT(CASE WHEN entity_type = 'translation' AND payload->>'status' = 'PENDING' THEN 1 END) AS pending_count,
            COUNT(CASE WHEN entity_type = 'translation' AND payload->>'status' = 'APPROVED' THEN 1 END) AS approved_count
          FROM v_entities
          WHERE entity_type IN ('translation_key', 'translation')
        )
        SELECT 
          total_keys,
          total_translations,
          draft_count,
          pending_count,
          approved_count
        FROM stats
      `)

      const row = (result as any)[0] || {
        total_keys: 0,
        total_translations: 0,
        draft_count: 0,
        pending_count: 0,
        approved_count: 0
      }

      return {
        totalKeys: Number(row.total_keys),
        totalTranslations: Number(row.total_translations),
        draftCount: Number(row.draft_count),
        pendingCount: Number(row.pending_count),
        approvedCount: Number(row.approved_count),
        localeCoverage: {}
      }
    }
  }
}

export const translationsRepositoryPlugin = fp(async function (fastify: FastifyInstance) {
  fastify.decorate('translationsRepository', translationsRepository(fastify))
}, {
  name: 'translations-repository',
  dependencies: ['db']
})