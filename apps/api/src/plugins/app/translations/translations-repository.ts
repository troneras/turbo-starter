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
  keyId: number;
  entityKey: string;
  locale: string;
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
  keyId: number;
  entityKey: string;
  locale: string;
  value: string;
  status: VariantStatus;
  brandId?: number | null;
};

/* ------------------------------------------------------------------ */
/* 3.  Spec definitions                                               */
/* ------------------------------------------------------------------ */
const keySpec: EntitySpec<KeyPayload> = {
  entityType: 'translation_key',
  typedCols : ['entityKey', 'description'],                         // all fields inside payload JSON
  uniqueKeys: ['entityKey'],
  validate  : (draft: Partial<KeyPayload>) => {
    if (!draft.entityKey) throw new Error('entityKey required');
  }
};

const variantSpec: EntitySpec<VariantPayload> = {
  entityType: 'translation',
  typedCols : ['entityKey', 'locale', 'status', 'brandId', 'value'],   // mapped to columns
  uniqueKeys: [],
  validate  : (draft: Partial<VariantPayload>) => {
    if (!draft.entityKey || !draft.locale || !draft.value) throw new Error('entityKey & locale & value required');
  }
};

/* ------------------------------------------------------------------ */
/* 4.  Factory that plugs into Fastify                                */
/* ------------------------------------------------------------------ */
export function translationService(fastify: FastifyInstance) {
  const keySvc     = fastify.entity.getService<KeyPayload>(keySpec);
  const variantSvc = fastify.entity.getService<VariantPayload>(variantSpec);

  /* -------------------- helpers to map Entity → DTO -------------- */
  const iso = (d: Date) => d.toISOString();

  const mapKey = (e: Entity<KeyPayload>): TranslationKeyDto => ({
    id         : Number(e.entityId),
    entityKey    : e.entityKey,
    description: e.description ?? null,
    createdBy  : e.createdBy,
    createdAt  : iso(e.createdAt)
  });

  const mapVar = (e: Entity<VariantPayload>): TranslationVariantDto => ({
    id        : Number(e.entityId),
    keyId     : e.keyId,
    entityKey   : e.entityKey,
    locale    : e.locale,
    brandId   : e.brandId ?? null,
    value     : e.value,
    status    : e.status,
    createdBy : e.createdBy,
    createdAt : iso(e.createdAt),
    approvedBy: e.status === 'APPROVED' ? e.createdBy : null,
    approvedAt: e.status === 'APPROVED' ? iso(e.createdAt) : null
  });

  /* -------------------- public API exposed to routes ------------- */
  return {
    // ── Translation Keys ──────────────────────────────────────────
    async listKeys(releaseId?: number) {
      const keys = await keySvc.find({}, { releaseId });
      return keys.map(mapKey);
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
      const key = await keySvc.patch(BigInt(id), patch, { userId, releaseId });
      return mapKey(key);
    },

    async deleteKey(id: number, userId: string, releaseId?: number) {
      await keySvc.remove(BigInt(id), { userId, releaseId });
    },

    // ── Translation Variants ──────────────────────────────────────
    async listVariants(
      filter: Partial<VariantPayload>,
      releaseId?: number
    ) {
      const variants = await variantSvc.find(filter, { releaseId });
      return variants.map(mapVar);
    },

    async createVariant(
      data: {
        keyId: number;
        entityKey: string;
        locale: string;
        value: string;
        status?: VariantStatus;
        brandId?: number | null;
      },
      userId: string,
      releaseId?: number
    ) {
      const v = await variantSvc.create(
        {
          keyId  : data.keyId,
          entityKey: data.entityKey,
          locale : data.locale,
          value  : data.value,
          status : data.status ?? 'DRAFT',
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
      const v = await variantSvc.patch(BigInt(id), patch, { userId, releaseId });
      return mapVar(v);
    },

    async setStatus(
      id: number,
      status: VariantStatus,
      userId: string,
      releaseId?: number
    ) {
      const v = await variantSvc.patch(
        BigInt(id),
        { status },
        { userId, releaseId }
      );
      return mapVar(v);
    },

    async deleteVariant(id: number, userId: string, releaseId?: number) {
      await variantSvc.remove(BigInt(id), { userId, releaseId });
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
    fastify.decorate('translations', translationService(fastify));
  },
  { name: 'translations', dependencies: ['entity-service'] }
);
