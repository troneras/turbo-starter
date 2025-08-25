import type { FastifyInstance } from 'fastify'
import { TranslationStatsResponseSchema } from '@cms/contracts/schemas/translations'
import { sql } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import * as schema from '@cms/db/schema'

type DB = PostgresJsDatabase<typeof schema>;

// withRelease function for release-aware queries
async function withRelease<T>(
  db: DB,
  releaseId: number | undefined,
  fn: (tx: DB, releaseId: number) => Promise<T>
): Promise<T> {
  // Default to OPEN release for modifications, latest deployed for reads
  let rel = releaseId;
  if (!rel) {
    // Try to get an OPEN release first
    const openRelease = await db.execute(sql`
      SELECT id FROM releases WHERE status = 'OPEN' ORDER BY created_at DESC LIMIT 1
    `);

    if (openRelease.length > 0) {
      rel = Number(openRelease[0]?.id);
    } else {
      // Fall back to latest deployed
      rel = Number(
        (await db.execute(sql`SELECT get_latest_deployed_release()`))
          .at(0)?.get_latest_deployed_release
      );
    }
  }

  if (!rel) {
    throw new Error('No valid release found for operation');
  }

  // Use a transaction to ensure all operations happen on the same connection
  return await db.transaction(async (tx) => {
    // Set the active release for this transaction
    await tx.execute(sql`SELECT set_config('cms.active_release', ${rel}::text, true)`);
    return await fn(tx, rel);
  });
}

export default async function (fastify: FastifyInstance) {
  // Get translation stats
  fastify.get('/', {
    schema: {
      tags: ['translations'],
      summary: 'Get translation statistics',
      security: [{ bearerAuth: [] }],
      response: {
        200: TranslationStatsResponseSchema
      }
    },
    onRequest: [
      fastify.authenticate,
      fastify.requirePermission('translations:read'),
      fastify.requireReleaseContext
    ]
  }, async (request) => {
    // Extract release context from request
    const releaseId = (request as any).releaseContext?.releaseId;

    console.log('releaseId', releaseId);

    return await withRelease(fastify.db, releaseId, async (tx, activeReleaseId) => {
      // Get total number of translation keys
      const keyCountResult = await tx.execute(sql`
        SELECT COUNT(*) as total
        FROM v_entities 
        WHERE entity_type = 'translation_key'
      `);
      const totalKeys = Number((keyCountResult as any[])[0]?.total || 0);

      // Get all locales
      const allLocales = await fastify.locales.getAllLocales();

      // Get translation statistics per locale
      const localeStats = await Promise.all(
        allLocales.map(async (locale) => {
          // Count translation variants by status for this locale
          const statsResult = await tx.execute(sql`
            SELECT 
              status,
              COUNT(*) as count
            FROM v_entities 
            WHERE entity_type = 'translation' 
              AND locale_id = ${locale.id}
            GROUP BY status
          `);

          // Initialize counters
          let approvedCount = 0;
          let needsTranslationCount = 0;
          let needsReviewCount = 0;

          // Process results
          (statsResult as any[]).forEach((row: any) => {
            switch (row.status) {
              case 'APPROVED':
                approvedCount = Number(row.count);
                break;
              case 'NEEDS_TRANSLATION':
                needsTranslationCount = Number(row.count);
                break;
              case 'NEEDS_REVIEW':
                needsReviewCount = Number(row.count);
                break;
            }
          });

          const totalVariants = approvedCount + needsTranslationCount + needsReviewCount;

          // Calculate percentages
          const translatedCount = approvedCount + needsReviewCount; // Both approved and needs review count as "translated"
          const completionPercentage = totalKeys > 0 ? Math.round((translatedCount / totalKeys) * 100) : 0;
          const approvalPercentage = translatedCount > 0 ? Math.round((approvedCount / translatedCount) * 100) : 0;

          return {
            localeId: locale.id,
            localeCode: locale.code,
            localeName: locale.name,
            isSource: locale.source || false,
            approvedCount,
            needsTranslationCount,
            needsReviewCount,
            totalVariants,
            completionPercentage,
            approvalPercentage
          };
        })
      );

      return {
        totalKeys,
        localeStats
      };
    });
  })
}