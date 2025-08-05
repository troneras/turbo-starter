import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import {
  sql,
  and,
  eq
} from 'drizzle-orm';
import * as schema from '@cms/db/schema';
import { entityTypeEnum } from '@cms/db/schema/enums';

declare module 'fastify' {
  interface FastifyInstance {
    entity: ReturnType<typeof entityService>
  }
}

type DB = PostgresJsDatabase<typeof schema>;

/* ------------------------------------------------------------------ */
/* 1. shared types                                                    */
/* ------------------------------------------------------------------ */
type CoreCols = {
  entityId: bigint;
  releaseId: bigint;
  entityType: string;
  createdBy: string;
  createdAt: Date;
  isDeleted: boolean;
};

export type EntityPayload = Record<string, any>;

export interface EntitySpec<P extends EntityPayload> {
  entityType: string;              // required: 'translation', 'page', …
  typedCols: (keyof P)[];          // mapped to columns of same name
  uniqueKeys?: (keyof P)[];        // optional “business-key” uniqueness
  validate?: (draft: Partial<P>) => asserts draft is P;
}

export type Entity<P> = CoreCols & P;

/* ------------------------------------------------------------------ */
/* 2. utility helpers                                                 */
/* ------------------------------------------------------------------ */
async function withRelease<T>(
  db: DB,
  releaseId: number | undefined,
  fn: () => Promise<T>
): Promise<T> {
  // default to latest deployed if no explicit id
  const rel = releaseId ?? Number(
    (await db.execute(sql`SELECT get_latest_deployed_release()`))
      .at(0)?.get_latest_deployed_release
  );

  await db.execute(sql`SELECT set_active_release(${rel})`);
  try      { return await fn(); }
  finally  { await db.execute(sql`SELECT set_active_release(NULL)`); }
}

function bigintToNum(value: unknown): number {
  if (typeof value === 'bigint') return Number(value);
  return value as number;
}

/* ------------------------------------------------------------------ */
/* 3. core service                                                    */
/* ------------------------------------------------------------------ */
export class EntityService<P extends EntityPayload> {
  constructor(private db: DB, private spec: EntitySpec<P>) {}

  /* ---------- private helpers ------------------ */
  private fieldToColumn(fieldName: string): string {
    // Convert camelCase to snake_case for database column names
    return fieldName.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }

  private rowToDomain(row: any): Entity<P> {
    const payload: any = row.payload ?? {};
    const typed: any   = {};
    this.spec.typedCols.forEach(col => { typed[col] = row[col]; });
    return {
      entityId   : bigintToNum(row.entity_id),
      releaseId  : bigintToNum(row.release_id),
      entityType : row.entity_type,
      createdBy  : row.created_by,
      createdAt  : row.created_at,
      isDeleted  : row.is_deleted,
      ...payload,
      ...typed
    };
  }

  private async assertUnique(draft: P, releaseId?: number) {
    if (!this.spec.uniqueKeys?.length) return;
    const conds = this.spec.uniqueKeys.map(k => {
      // Map camelCase field names to snake_case column names
      const columnName = this.fieldToColumn(k as string);
      return sql`${sql.identifier(columnName)} = ${draft[k]}`;
    });
    const exists = await withRelease(this.db, releaseId, () =>
      this.db.execute(sql`
        SELECT 1 FROM v_entities
        WHERE entity_type = ${this.spec.entityType}
          AND ${sql.join(conds, sql` AND `)}
        LIMIT 1
      `)
    );
    if (exists.length) throw new Error('Duplicate entity for given keys');
  }

  private splitPayload(draft: Partial<P>) {
    const json: Record<string, any> = {};
    const cols: Record<string, any> = {};
    Object.entries(draft).forEach(([k, v]) => {
      if (this.spec.typedCols.includes(k as keyof P)) cols[k] = v;
      else json[k] = v;
    });
    return { json, cols };
  }

  /* ---------- public API ----------------------- */

  /** create a brand-new logical entity (INSERT into entities + entity_versions) */
  async create(draft: P, opts: { userId: string; releaseId?: number }): Promise<Entity<P>> {
    this.spec.validate?.(draft);
    await this.assertUnique(draft, opts.releaseId);

    const { json, cols } = this.splitPayload(draft);

    return withRelease(this.db, opts.releaseId, async () => {
      const [row] = await this.db.execute(sql`
        WITH new_e AS (
          INSERT INTO ${schema.entities} (entity_type)
          VALUES (${this.spec.entityType})
          RETURNING id
        ),
        new_v AS (
          INSERT INTO ${schema.entityVersions} (
            entity_id, release_id, entity_type,
            ${sql.join(Object.keys(cols).map(k => this.fieldToColumn(k)), sql`, `)},
            payload, change_type, created_by
          )
          SELECT
            id,
            get_active_release(),
            ${this.spec.entityType},
            ${sql.join(Object.values(cols), sql`, `)},
            ${JSON.stringify(json)}::jsonb,
            'CREATE',
            ${opts.userId}
          FROM new_e
          RETURNING *
        )
        SELECT * FROM new_v;
      `);
      return this.rowToDomain(row);
    });
  }

  /** patch existing logical entity – always INSERT new version row */
  async patch(
    entityId: bigint,
    patch: Partial<P>,
    opts: { userId: string; releaseId?: number }
  ): Promise<Entity<P>> {
    if (!Object.keys(patch).length) throw new Error('empty patch');
    const { json, cols } = this.splitPayload(patch);

    return withRelease(this.db, opts.releaseId, async () => {
      const [row] = await this.db.execute(sql`
        INSERT INTO ${schema.entityVersions} (
          entity_id, release_id, entity_type,
          ${sql.join(Object.keys(cols).map(k => this.fieldToColumn(k)), sql`, `)},
          payload, change_type, created_by
        )
        SELECT
          ${entityId},
          get_active_release(),
          ${this.spec.entityType},
          ${sql.join(Object.values(cols), sql`, `)},
          COALESCE(
            (SELECT payload FROM v_entities WHERE entity_id = ${entityId}) || 
            ${JSON.stringify(json)}::jsonb,
            ${JSON.stringify(json)}::jsonb
          ),
          'UPDATE',
          ${opts.userId}
        RETURNING *;
      `);
      if (!row) throw new Error('entity not found');
      return this.rowToDomain(row);
    });
  }

  /** soft-delete a logical entity */
  async remove(entityId: bigint, opts: { userId: string; releaseId?: number }): Promise<void> {
    await withRelease(this.db, opts.releaseId, () =>
      this.db.execute(sql`
        INSERT INTO ${schema.entityVersions} (
          entity_id, release_id, entity_type,
          payload, change_type, is_deleted, created_by
        )
        SELECT
          ${entityId},
          get_active_release(),
          ${this.spec.entityType},
          payload, 'DELETE', true, ${opts.userId}
        FROM v_entities
        WHERE entity_id = ${entityId}
      `)
    );
  }

  /** generic find – leverages v_entities so caller needn't care about release logic */
  async find(filter: Partial<P>, ctx: { releaseId?: number } = {}): Promise<Entity<P>[]> {
    const where: any[] = [eq(schema.entityVersions.entityType, this.spec.entityType as typeof entityTypeEnum.enumValues[number])];
    Object.entries(filter).forEach(([k, v]) => {
      const columnName = this.fieldToColumn(k);
      where.push(sql`${sql.identifier(columnName)} = ${v}`);
    });

    const rows = await withRelease(this.db, ctx.releaseId, () =>
      this.db.select().from(schema.vEntities).where(and(...where))
    );
    return rows.map(r => this.rowToDomain(r));
  }

  async get(entityId: bigint, ctx: { releaseId?: number } = {}): Promise<Entity<P> | null> {
    const [row] = await withRelease(this.db, ctx.releaseId, () =>
      this.db.execute(sql`
        SELECT * FROM v_entities
        WHERE entity_id = ${entityId}
          AND entity_type = ${this.spec.entityType}
        LIMIT 1
      `)
    );
    return row ? this.rowToDomain(row) : null;
  }
}

/* ------------------------------------------------------------------ */
/* 4. Fastify plugin wrapper                                          */
/* ------------------------------------------------------------------ */
function entityService(fastify: FastifyInstance) {
  return {
    /** obtain a typed service for a concrete entityType */
    getService<P extends EntityPayload>(spec: EntitySpec<P>) {
      return new EntityService<P>(fastify.db as DB, spec);
    }
  };
}



export default fp(
  async function (fastify) {
    if (!fastify.db) throw new Error('db plugin required before entity-service');
    fastify.decorate('entity', entityService(fastify));
  },
  { name: 'entity-service', dependencies: ['db'] }
);
