import type { FastifyInstance } from 'fastify';
import type { EntityService, EntitySpec, Entity } from '../entity';

/* ------------------------------------------------------------------ */
/* 1.  Contract types (already exist in @cms/contracts)               */
/* ------------------------------------------------------------------ */
export type VariantStatus = 'DRAFT' | 'PENDING' | 'APPROVED';

export interface TranslationKeyDto {
  id: number;
  entityKey: string;
  description?: string | null;
  createdBy: string;
  createdAt: string;
}

export interface TranslationVariantDto {
  id: number;
  entityKey: string;
  localeId: number;
  brandId?: number | null;
  value: string;
  status: VariantStatus;
  createdBy: string;
  createdAt: string;
  approvedBy?: string | null;
  approvedAt?: string | null;
}

/* ------------------------------------------------------------------ */
/* 2.  Payload shapes for EntityService                               */
/* ------------------------------------------------------------------ */
type KeyPayload = {
  entityKey: string;
  description?: string | null;
};

type VariantPayload = {
  entityKey: string;     // Links to the logical translation key
  localeId: number;      // Reference to locales table
  value: string;
  status: VariantStatus;
  brandId?: number | null;
  jurisdictionId?: number | null;
};

/* ------------------------------------------------------------------ */
/* 3.  Spec definitions                                               */
/* ------------------------------------------------------------------ */
const keySpec: EntitySpec<KeyPayload> = {
  entityType: 'translation_key',
  typedCols: ['entityKey'],                         // all fields inside payload JSON
  uniqueKeys: ['entityKey'],
  validate: (draft: Partial<KeyPayload>) => {
    if (!draft.entityKey) throw new Error('entityKey required');
  }
};

const variantSpec: EntitySpec<VariantPayload> = {
  entityType: 'translation',
  typedCols: ['entityKey', 'status', 'brandId', 'jurisdictionId', 'localeId', 'value'],   // mapped to actual columns in entity_versions
  uniqueKeys: ['entityKey', 'localeId', 'brandId'], // Each variant is unique by key + locale + brand combination
  validate: (draft: Partial<VariantPayload>) => {
    if (!draft.entityKey || !draft.localeId || !draft.value) throw new Error('entityKey & localeId & value required');
  }
};

/* ------------------------------------------------------------------ */
/* 4.  Factory that plugs into Fastify                                */
/* ------------------------------------------------------------------ */
export function translationService(fastify: FastifyInstance) {
  const keySvc = fastify.entity.getService<KeyPayload>(keySpec);
  const variantSvc = fastify.entity.getService<VariantPayload>(variantSpec);

  /* -------------------- helpers to map Entity → DTO -------------- */
  const iso = (input: Date | string | number) => {
    const date = input instanceof Date ? input : new Date(input);
    return date.toISOString();
  };

  const mapKey = (e: Entity<KeyPayload>): TranslationKeyDto => ({
    id: Number(e.entityId),
    entityKey: e.entityKey,
    description: e.description ?? null,
    createdBy: e.createdBy,
    createdAt: iso(e.createdAt)
  });

  const mapVar = (e: Entity<VariantPayload>): TranslationVariantDto => ({
    id: Number(e.entityId),
    entityKey: e.entityKey,
    localeId: e.localeId,
    brandId: e.brandId ?? null,
    value: e.value,
    status: e.status,
    createdBy: e.createdBy,
    createdAt: iso(e.createdAt),
    approvedBy: e.status === 'APPROVED' ? e.createdBy : null,
    approvedAt: e.status === 'APPROVED' ? iso(e.createdAt) : null
  });

  /* -------------------- public API exposed to routes ------------- */
  return {
    // ── Translation Keys ──────────────────────────────────────────
    async listKeys(options?: { releaseId?: number; page?: number; pageSize?: number }) {
      const result = await keySvc.find({}, options || {});
      return {
        data: result.data.map(mapKey),
        pagination: result.pagination
      };
    },

    async createKey(
      data: { entityKey: string; description?: string | null },
      userId: string,
      releaseId?: number
    ) {
      const key = await keySvc.create(
        { entityKey: data.entityKey, description: data.description ?? null },
        { userId, releaseId }
      );
      return mapKey(key);
    },

    async updateKey(
      id: number,
      patch: { description?: string | null },
      userId: string,
      releaseId?: number
    ) {
      const key = await keySvc.patch(id, patch, { userId, releaseId });
      return mapKey(key);
    },

    async deleteKey(id: number, userId: string, releaseId?: number) {
      await keySvc.remove(id, { userId, releaseId });
    },

    // ── Translation Variants ──────────────────────────────────────
    async listVariants(
      filter: Partial<VariantPayload>,
      options?: { releaseId?: number; page?: number; pageSize?: number }
    ) {
      const result = await variantSvc.find(filter, options || {});
      return {
        data: result.data.map(mapVar),
        pagination: result.pagination
      };
    },

    async createVariant(
      data: {
        entityKey: string;
        localeId: number;
        value: string;
        status?: VariantStatus;
        brandId?: number | null;
      },
      userId: string,
      releaseId?: number
    ) {
      // Validate that the translation key exists
      const keyResults = await keySvc.find({ entityKey: data.entityKey }, { releaseId });
      if (keyResults.data.length === 0) {
        throw new Error('Translation key not found');
      }

      const v = await variantSvc.create(
        {
          entityKey: data.entityKey,
          localeId: data.localeId,
          value: data.value,
          status: data.status ?? 'DRAFT',
          brandId: data.brandId ?? null
        },
        { userId, releaseId }
      );
      return mapVar(v);
    },

    async updateVariant(
      id: number,
      patch: Partial<Pick<VariantPayload, 'value' | 'status'>>,
      userId: string,
      releaseId?: number
    ) {
      const v = await variantSvc.patch(id, patch, { userId, releaseId });
      return mapVar(v);
    },

    async setStatus(
      id: number,
      status: VariantStatus,
      userId: string,
      releaseId?: number
    ) {
      const v = await variantSvc.patch(
        id,
        { status },
        { userId, releaseId }
      );
      return mapVar(v);
    },

    async deleteVariant(id: number, userId: string, releaseId?: number) {
      await variantSvc.remove(id, { userId, releaseId });
    },

    // ── Unified Translation Operations ────────────────────────────────

    async createUnifiedTranslation(
      data: {
        entityKey: string;
        description?: string | null;
        defaultValue: string;
        defaultLocaleId?: number;
        brandId?: number | null;
        jurisdictionId?: number | null;
        status?: VariantStatus;
        metadata?: any;
        additionalVariants?: Array<{
          localeId: number;
          value: string;
          brandId?: number | null;
          jurisdictionId?: number | null;
          status?: VariantStatus;
        }>;
      },
      userId: string,
      releaseId?: number
    ) {
      // Default to en-US (locale ID 1) if not specified
      const defaultLocaleId = data.defaultLocaleId || 1;

      // Create the translation key first
      const key = await keySvc.create(
        { entityKey: data.entityKey, description: data.description ?? null },
        { userId, releaseId }
      );

      // Create the default variant
      const defaultVariant = await variantSvc.create(
        {
          entityKey: data.entityKey,
          localeId: defaultLocaleId,
          value: data.defaultValue,
          status: data.status ?? 'DRAFT',
          brandId: data.brandId ?? null
        },
        { userId, releaseId }
      );

      // Create additional variants if provided
      const additionalVariants = [];
      if (data.additionalVariants && data.additionalVariants.length > 0) {
        for (const variantData of data.additionalVariants) {
          const variant = await variantSvc.create(
            {
              entityKey: data.entityKey,
              localeId: variantData.localeId,
              value: variantData.value,
              status: variantData.status ?? 'DRAFT',
              brandId: variantData.brandId ?? data.brandId ?? null
            },
            { userId, releaseId }
          );
          additionalVariants.push(mapVar(variant));
        }
      }

      return {
        key: mapKey(key),
        defaultVariant: mapVar(defaultVariant),
        additionalVariants: additionalVariants.length > 0 ? additionalVariants : undefined
      };
    },

    // ── Batch Translation Operations ───────────────────────────────────

    async batchCreateTranslations(
      data: {
        translations: Array<{
          entityKey: string;
          description?: string | null;
          localeId: number;
          value: string;
          status?: VariantStatus;
          metadata?: any;
        }>;
        defaultBrandId?: number | null;
        defaultJurisdictionId?: number | null;
        overwriteExisting?: boolean;
        createMissingKeys?: boolean;
      },
      userId: string,
      releaseId?: number
    ) {
      const result = {
        success: true,
        processed: 0,
        created: 0,
        updated: 0,
        errors: [] as Array<{ entityKey: string; localeId: number; error: string }>,
        createdKeys: [] as any[],
        createdVariants: [] as any[],
        updatedVariants: [] as any[]
      };

      // Group translations by entityKey to optimize key creation
      const translationsByKey = new Map<string, Array<typeof data.translations[0]>>();
      for (const translation of data.translations) {
        if (!translationsByKey.has(translation.entityKey)) {
          translationsByKey.set(translation.entityKey, []);
        }
        translationsByKey.get(translation.entityKey)!.push(translation);
      }

      // Process each translation key group
      for (const [entityKey, translations] of translationsByKey.entries()) {
        try {
          // Check if translation key exists
          const keyResults = await keySvc.find({ entityKey }, { releaseId });
          let key = keyResults.data[0];

          // Create key if it doesn't exist and createMissingKeys is true
          if (!key && data.createMissingKeys !== false) {
            // Use description from first translation
            const description = translations.find(t => t.description)?.description || null;
            key = await keySvc.create(
              { entityKey, description },
              { userId, releaseId }
            );
            result.createdKeys.push(mapKey(key));
          }

          if (!key) {
            // Skip all translations for this key if it doesn't exist
            for (const translation of translations) {
              result.errors.push({
                entityKey,
                localeId: translation.localeId,
                error: 'Translation key does not exist and createMissingKeys is disabled'
              });
            }
            continue;
          }

          // Process each translation variant
          for (const translation of translations) {
            try {
              result.processed++;

              // Check if variant already exists
              const existingVariants = await variantSvc.find({
                entityKey,
                localeId: translation.localeId,
                brandId: data.defaultBrandId ?? null
              }, { releaseId });

              if (existingVariants.data.length > 0) {
                if (data.overwriteExisting) {
                  // Update existing variant
                  const updated = await variantSvc.patch(
                    existingVariants.data[0]!.entityId,
                    {
                      value: translation.value,
                      status: translation.status ?? 'DRAFT'
                    },
                    { userId, releaseId }
                  );
                  result.updatedVariants.push(mapVar(updated));
                  result.updated++;
                } else {
                  result.errors.push({
                    entityKey,
                    localeId: translation.localeId,
                    error: 'Translation variant already exists and overwriteExisting is false'
                  });
                }
              } else {
                // Create new variant
                const variant = await variantSvc.create(
                  {
                    entityKey,
                    localeId: translation.localeId,
                    value: translation.value,
                    status: translation.status ?? 'DRAFT',
                    brandId: data.defaultBrandId ?? null
                  },
                  { userId, releaseId }
                );
                result.createdVariants.push(mapVar(variant));
                result.created++;
              }
            } catch (error: any) {
              result.errors.push({
                entityKey,
                localeId: translation.localeId,
                error: error.message || 'Unknown error'
              });
            }
          }
        } catch (error: any) {
          // Error creating key - mark all translations for this key as failed
          for (const translation of translations) {
            result.errors.push({
              entityKey,
              localeId: translation.localeId,
              error: `Key creation failed: ${error.message || 'Unknown error'}`
            });
          }
        }
      }

      result.success = result.errors.length === 0;
      return result;
    },

    // ── CSV Import Operations ──────────────────────────────────────────

    async importFromCsv(
      data: {
        csvContent: string;
        defaultBrandId?: number | null;
        defaultJurisdictionId?: number | null;
        overwriteExisting?: boolean;
        createMissingKeys?: boolean;
        csvOptions?: {
          delimiter?: string;
          hasHeader?: boolean;
          keyColumn?: string;
          valueColumn?: string;
          localeColumn?: string;
          descriptionColumn?: string;
        };
      },
      userId: string,
      releaseId?: number
    ) {
      const options = {
        delimiter: ',',
        hasHeader: true,
        keyColumn: 'key',
        valueColumn: 'value',
        localeColumn: 'locale',
        descriptionColumn: 'description',
        ...data.csvOptions
      };

      // Parse CSV content
      const lines = data.csvContent.trim().split('\n');
      if (lines.length === 0) {
        throw new Error('CSV content is empty');
      }

      let rows = lines;
      let headers: string[] = [];

      if (options.hasHeader) {
        headers = lines[0]!.split(options.delimiter).map(h => h.trim().replace(/^["']|["']$/g, ''));
        rows = lines.slice(1);
      }

      // Find column indices
      const getColumnIndex = (columnName: string, defaultIndex: number) => {
        if (options.hasHeader) {
          const index = headers.findIndex(h => h.toLowerCase() === columnName.toLowerCase());
          return index >= 0 ? index : defaultIndex;
        }
        return defaultIndex;
      };

      const keyColumnIndex = getColumnIndex(options.keyColumn, 0);
      const valueColumnIndex = getColumnIndex(options.valueColumn, 1);
      const localeColumnIndex = getColumnIndex(options.localeColumn, 2);
      const descriptionColumnIndex = options.descriptionColumn
        ? getColumnIndex(options.descriptionColumn, -1)
        : -1;

      // Get locale mappings for locale code to ID conversion
      const locales = await this.getLocales();
      const localeCodeToId = new Map<string, number>();
      for (const locale of locales) {
        localeCodeToId.set(locale.code.toLowerCase(), locale.id);
      }

      // Parse rows into translation data
      const translations = [];
      for (let i = 0; i < rows.length; i++) {
        try {
          const row = rows[i];
          if (!row || !row.trim()) continue; // Skip empty rows

          const columns = row.split(options.delimiter).map(c => c.trim().replace(/^["']|["']$/g, ''));

          const entityKey = columns[keyColumnIndex]?.trim();
          const value = columns[valueColumnIndex]?.trim();
          const localeCode = columns[localeColumnIndex]?.trim()?.toLowerCase();
          const description = descriptionColumnIndex >= 0
            ? columns[descriptionColumnIndex]?.trim()
            : undefined;

          if (!entityKey || !value || !localeCode) {
            throw new Error(`Missing required fields on row ${i + 1 + (options.hasHeader ? 1 : 0)}`);
          }

          const localeId = localeCodeToId.get(localeCode);
          if (!localeId) {
            throw new Error(`Unknown locale code "${localeCode}" on row ${i + 1 + (options.hasHeader ? 1 : 0)}`);
          }

          translations.push({
            entityKey,
            value,
            localeId,
            description: description || undefined
          });
        } catch (error: any) {
          throw new Error(`CSV parsing error on row ${i + 1 + (options.hasHeader ? 1 : 0)}: ${error.message}`);
        }
      }

      if (translations.length === 0) {
        throw new Error('No valid translations found in CSV');
      }

      // Use batch creation method
      return this.batchCreateTranslations(
        {
          translations,
          defaultBrandId: data.defaultBrandId,
          defaultJurisdictionId: data.defaultJurisdictionId,
          overwriteExisting: data.overwriteExisting,
          createMissingKeys: data.createMissingKeys
        },
        userId,
        releaseId
      );
    },

    // ── Helper Methods ─────────────────────────────────────────────────

    async getLocales() {
      // Use the locales service to get all locales
      return await fastify.locales.getAllLocales();
    },

    async getSourceLocale() {
      // Get the source locale for translation workflows
      return await fastify.locales.getSourceLocale();
    }
  };
}

/* ------------------------------------------------------------------ */
/* 5. Fastify plugin wrapper                                          */
/* ------------------------------------------------------------------ */
import fp from 'fastify-plugin';

declare module 'fastify' {
  interface FastifyInstance {
    translations: ReturnType<typeof translationService>;
  }
}

export const translationsPlugin = fp(
  async function (fastify) {
    if (!fastify.entity) throw new Error('entity-service plugin must be loaded');
    if (!fastify.locales) throw new Error('locales plugin must be loaded');
    fastify.decorate('translations', translationService(fastify));
  },
  { name: 'translations', dependencies: ['entity-service', 'locales'] }
);
