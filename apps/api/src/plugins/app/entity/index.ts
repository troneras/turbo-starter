import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import {
  sql,
  and,
  eq
} from 'drizzle-orm';
import * as schema from '@cms/db/schema';

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
  entityId: number;
  releaseId: number;
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
  fn: (tx: any, releaseId: number) => Promise<T>
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
    // Set the active release within the transaction
    await tx.execute(sql`SELECT set_active_release(${rel})`);

    // Pass the transaction and release ID to the function
    // Note: No need for manual cleanup - transaction rollback/commit handles it
    return await fn(tx, rel);
  });
}

function bigintToNum(value: unknown): number {
  if (typeof value === 'bigint') return Number(value);
  return value as number;
}

/* ------------------------------------------------------------------ */
/* 3. core service                                                    */
/* ------------------------------------------------------------------ */
export class EntityService<P extends EntityPayload> {
  constructor(private db: DB, private spec: EntitySpec<P>) { }

  /* ---------- private helpers ------------------ */
  private fieldToColumn(fieldName: string): string {
    // Convert camelCase to snake_case for database column names
    return fieldName.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }

  private rowToDomain(row: any): Entity<P> {
    const payload: any = row.payload ?? {};
    const typed: any = {};
    this.spec.typedCols.forEach((col) => {
      const columnName = this.fieldToColumn(col as string);
      typed[col] = row[columnName];
    });
    return {
      entityId: bigintToNum(row.entity_id),
      releaseId: bigintToNum(row.release_id),
      entityType: row.entity_type,
      createdBy: row.created_by,
      createdAt: row.created_at,
      isDeleted: row.is_deleted,
      ...payload,
      ...typed
    };
  }

  private async assertUnique(draft: P, releaseId?: number) {
    if (!this.spec.uniqueKeys?.length) return;

    // Filter out conditions where the unique key value is invalid
    const conds = this.spec.uniqueKeys
      .filter(k => this.isValidFilterValue(draft[k]))
      .map(k => {
        const columnName = this.fieldToColumn(k as string);
        return sql`${sql.raw(columnName)} = ${draft[k]}`;
      });

    // If no valid unique key values, skip uniqueness check
    if (conds.length === 0) return;

    const exists = await withRelease(this.db, releaseId, (tx, releaseId) =>
      tx.execute(sql`
        SELECT 1 FROM v_entities
        WHERE entity_type::text = ${this.spec.entityType}
          AND ${sql.join(conds, sql` AND `)}
        LIMIT 1
      `)
    );
    if ((exists as any[]).length) throw new Error('Entity already exists for the given unique keys');
  }

  private async assertUniqueInTx(draft: P, tx: any) {
    if (!this.spec.uniqueKeys?.length) return;

    // Filter out conditions where the unique key value is invalid
    const conds = this.spec.uniqueKeys
      .filter(k => this.isValidFilterValue(draft[k]))
      .map(k => {
        const columnName = this.fieldToColumn(k as string);
        return sql`${sql.raw(columnName)} = ${draft[k]}`;
      });

    // If no valid unique key values, skip uniqueness check
    if (conds.length === 0) return;

    const exists = await tx.execute(sql`
      SELECT 1 FROM v_entities
      WHERE entity_type::text = ${this.spec.entityType}
        AND ${sql.join(conds, sql` AND `)}
      LIMIT 1
    `);
    if ((exists as any[]).length) throw new Error('Entity already exists for the given unique keys');
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

    const { json, cols } = this.splitPayload(draft);

    return withRelease(this.db, opts.releaseId, async (tx, releaseId) => {
      // Check uniqueness within the release context
      await this.assertUniqueInTx(draft, tx);

      const [row] = await tx.execute(sql`
        WITH new_e AS (
          INSERT INTO ${schema.entities} (entity_type)
          VALUES (${this.spec.entityType}::entity_type_enum)
          RETURNING id
        ),
        new_v AS (
          INSERT INTO ${schema.entityVersions} (
            entity_id, release_id, entity_type,
            ${sql.join(Object.keys(cols).map(k => sql.raw(this.fieldToColumn(k))), sql`, `)},
            payload, change_type, created_by
          )
          SELECT
            id,
            ${releaseId},
            ${this.spec.entityType}::entity_type_enum,
            ${sql.join(Object.values(cols), sql`, `)},
            ${JSON.stringify(json)}::jsonb,
            'CREATE'::entity_change_type,
            ${opts.userId}
          FROM new_e
          RETURNING *
        )
        SELECT * FROM new_v;
      `);

      return this.rowToDomain(row);
    });
  }

  /** patch existing logical entity – INSERT new version or UPDATE existing version in same release */
  async patch(
    entityId: number,
    patch: Partial<P>,
    opts: { userId: string; releaseId?: number }
  ): Promise<Entity<P>> {
    if (!Object.keys(patch).length) throw new Error('empty patch');
    console.log('patch', patch);
    const { json, cols } = this.splitPayload(patch);

    return withRelease(this.db, opts.releaseId, async (tx, releaseId) => {
      // Check if there's already a version in this release for this entity
      const existingVersionResult = await tx.execute(sql`
        SELECT entity_id, change_type, payload
        FROM ${schema.entityVersions}
        WHERE entity_id = ${entityId}
          AND release_id = ${releaseId}
          AND entity_type = ${this.spec.entityType}::entity_type_enum
        LIMIT 1
      `);

      const existingVersion = (existingVersionResult as any[])[0];

      if (existingVersion) {

        console.log('existingVersion', existingVersion);
        console.log('cols', cols);
        console.log('json', json);

        // UPDATE existing version in the same release
        const assignments = [
          // update typed columns only if provided
          ...Object.keys(cols).map((k) => {
            const colName = this.fieldToColumn(k);
            return sql`${sql.raw(colName)} = ${cols[k as keyof typeof cols]}`;
          }),
          // merge json payload
          sql`payload = COALESCE(payload, '{}'::jsonb) || ${JSON.stringify(json)}::jsonb`,
          // Only change to 'UPDATE' if it wasn't originally a 'CREATE'
          sql`change_type = CASE 
                WHEN change_type = 'CREATE' THEN 'CREATE'::entity_change_type
                ELSE 'UPDATE'::entity_change_type
              END`
        ];

        const [row] = await tx.execute(sql`
          UPDATE ${schema.entityVersions}
          SET ${sql.join(assignments, sql`, `)}
          WHERE entity_id = ${entityId}
            AND release_id = ${releaseId}
            AND entity_type = ${this.spec.entityType}::entity_type_enum
          RETURNING *;
        `);

        if (!row) throw new Error('entity not found');
        return this.rowToDomain(row);
      } else {
        // INSERT new version for this release (audit trail)
        // Get the current state to merge with the patch
        const currentStateResult = await tx.execute(sql`
          SELECT *
          FROM v_entities
          WHERE entity_id = ${entityId}
            AND entity_type = ${this.spec.entityType}
          LIMIT 1
        `);

        const currentState = (currentStateResult as any[])[0];
        if (!currentState) {
          throw new Error('entity not found');
        }

        // Build the column assignments for INSERT
        const allTypedCols = this.spec.typedCols;
        const insertCols = allTypedCols.map(col => sql.raw(this.fieldToColumn(col as string)));
        const insertValues = allTypedCols.map(col => {
          // Use the patch value if provided, otherwise use current value
          if (cols.hasOwnProperty(col)) {
            return cols[col as string];
          } else {
            const columnName = this.fieldToColumn(col as string);
            return currentState[columnName];
          }
        });

        // Merge JSON payload
        const mergedPayload = {
          ...(currentState.payload || {}),
          ...json
        };

        const [row] = await tx.execute(sql`
          INSERT INTO ${schema.entityVersions} (
            entity_id, release_id, entity_type,
            ${sql.join(insertCols, sql`, `)},
            payload, change_type, created_by
          )
          VALUES (
            ${entityId},
            ${releaseId},
            ${this.spec.entityType}::entity_type_enum,
            ${sql.join(insertValues, sql`, `)},
            ${JSON.stringify(mergedPayload)}::jsonb,
            'UPDATE'::entity_change_type,
            ${opts.userId}
          )
          RETURNING *;
        `);

        if (!row) throw new Error('failed to create new version');
        return this.rowToDomain(row);
      }
    });
  }

  /** soft-delete a logical entity */
  async remove(entityId: number, opts: { userId: string; releaseId?: number }): Promise<void> {
    await withRelease(this.db, opts.releaseId, async (tx, releaseId) => {
      // Check if there's already a version in this release for this entity
      const existingVersionResult = await tx.execute(sql`
        SELECT entity_id, change_type, payload
        FROM ${schema.entityVersions}
        WHERE entity_id = ${entityId}
          AND release_id = ${releaseId}
          AND entity_type = ${this.spec.entityType}::entity_type_enum
        LIMIT 1
      `);

      const existingVersion = (existingVersionResult as any[])[0];

      if (existingVersion) {
        if (existingVersion.change_type === 'CREATE') {
          // Case 1: Entity was created in this release and never deployed
          // Remove the version and delete the logical entity entirely
          await tx.execute(sql`
            DELETE FROM ${schema.entityVersions}
            WHERE entity_id = ${entityId}
              AND release_id = ${releaseId}
              AND entity_type = ${this.spec.entityType}::entity_type_enum
          `);

          await tx.execute(sql`
            DELETE FROM ${schema.entities}
            WHERE id = ${entityId}
          `);
        } else {
          // Case 2: Entity has UPDATE version in this release
          // Replace the existing version with a DELETE version
          await tx.execute(sql`
            UPDATE ${schema.entityVersions}
            SET 
              change_type = 'DELETE'::entity_change_type,
              is_deleted = true
            WHERE entity_id = ${entityId}
              AND release_id = ${releaseId}
              AND entity_type = ${this.spec.entityType}::entity_type_enum
          `);

          // Also mark the logical entity as deleted
          await tx.execute(sql`
            UPDATE ${schema.entities}
            SET deleted_at = NOW()
            WHERE id = ${entityId}
          `);
        }
      } else {
        // Case 3: No existing version in this release
        // Mark the logical entity as deleted and create a new DELETE version
        await tx.execute(sql`
          UPDATE ${schema.entities}
          SET deleted_at = NOW()
          WHERE id = ${entityId}
        `);

        // Create a deletion version with all required fields preserved
        await tx.execute(sql`
          INSERT INTO ${schema.entityVersions} (
            entity_id, release_id, entity_type,
            entity_key, brand_id, jurisdiction_id, locale_id, parent_entity_id,
            value, status, published_at,
            payload, change_type, is_deleted, created_by
          )
          SELECT
            ${entityId},
            ${releaseId},
            ${this.spec.entityType}::entity_type_enum,
            entity_key, brand_id, jurisdiction_id, locale_id, parent_entity_id,
            value, status, published_at,
            payload, 'DELETE'::entity_change_type, true, ${opts.userId}
          FROM v_entities
          WHERE entity_id = ${entityId}
        `);
      }
    });
  }

  /** Find entities with built-in pagination and safety limits */
  async find(
    filter: Partial<P>,
    ctx: {
      releaseId?: number;
      page?: number;
      pageSize?: number;
      orderBy?: keyof P | 'entityId' | 'createdAt';
      orderDirection?: 'ASC' | 'DESC';
    } = {}
  ): Promise<{
    data: Entity<P>[];
    pagination: {
      page: number;
      pageSize: number;
      totalItems: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
    };
  }> {
    const page = ctx.page || 1;
    const pageSize = Math.min(ctx.pageSize || 100, 500); // Default 100, max 500 per page
    const offset = (page - 1) * pageSize;

    // Build conditions
    const conds = [sql`entity_type = ${this.spec.entityType}`];
    Object.entries(filter).forEach(([k, v]) => {
      if (this.isValidFilterValue(v)) {
        const columnName = this.fieldToColumn(k);
        conds.push(sql`${sql.raw(columnName)} = ${v}`);
      }
    });

    // Build ORDER BY clause
    let orderByClause = sql`ORDER BY created_at DESC`; // Default ordering
    if (ctx.orderBy) {
      const orderColumn = ctx.orderBy === 'entityId' ? 'entity_id' :
        ctx.orderBy === 'createdAt' ? 'created_at' :
          this.fieldToColumn(ctx.orderBy as string);
      const direction = ctx.orderDirection || 'DESC';
      orderByClause = sql`ORDER BY ${sql.raw(orderColumn)} ${sql.raw(direction)}`;
    }

    const result = await withRelease(this.db, ctx.releaseId, async (tx, releaseId) => {
      // Get total count
      const countResult = await tx.execute(sql`
        SELECT COUNT(*) as total FROM v_entities
        WHERE ${sql.join(conds, sql` AND `)}
      `);
      const totalItems = Number((countResult as any[])[0]?.total || 0);

      // Get paginated data
      const dataResult = await tx.execute(sql`
        SELECT * FROM v_entities
        WHERE ${sql.join(conds, sql` AND `)}
        ${orderByClause}
        LIMIT ${pageSize}
        OFFSET ${offset}
      `);

      const data = (dataResult as any[]).map(r => this.rowToDomain(r));

      return { data, totalItems };
    });

    const totalPages = Math.ceil(result.totalItems / pageSize);

    return {
      data: result.data,
      pagination: {
        page,
        pageSize,
        totalItems: result.totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  /** Check if a filter value is valid for querying */
  private isValidFilterValue(value: any): boolean {
    // Exclude null, undefined, empty strings
    if (value === null || value === undefined || value === '') {
      return false;
    }

    // For arrays, exclude empty arrays
    if (Array.isArray(value) && value.length === 0) {
      return false;
    }

    // For objects, exclude empty objects (but allow Date objects, numbers as objects, etc.)
    if (typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      return Object.keys(value).length > 0;
    }

    // Allow boolean false and number 0 as valid filter values
    if (typeof value === 'boolean' || typeof value === 'number') {
      return true;
    }

    return true;
  }

  async get(entityId: number, ctx: { releaseId?: number } = {}): Promise<Entity<P> | null> {
    const result = await withRelease(this.db, ctx.releaseId, (tx, releaseId) =>
      tx.execute(sql`
        SELECT * FROM v_entities
        WHERE entity_id = ${entityId}
          AND entity_type = ${this.spec.entityType}
        LIMIT 1
      `)
    );
    const [row] = result as any[];
    return row ? this.rowToDomain(row) : null;
  }

  async getByEntityKey(entityKey: string, ctx: { releaseId?: number } = {}): Promise<Entity<P> | null> {
    const result = await withRelease(this.db, ctx.releaseId, (tx, releaseId) =>
      tx.execute(sql`
        SELECT * FROM v_entities
        WHERE entity_key = ${entityKey}
        LIMIT 1
      `)
    );
    const [row] = result as any[];
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
