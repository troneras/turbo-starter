
# Edition‑Based CMS – Release & Rollback Design Document

_Last updated: 29 Jul 2025_

---

## 1. Purpose

Design a relational data model and runtime pattern that lets a custom CMS:

- Group arbitrary edits into **releases** (a.k.a. “editions”).
- Preview, deploy, and roll back any release instantly.
- Work on **multiple releases in parallel** without clashes.
- Keep a full **audit trail** of every change.

## 2. High‑Level Requirements

| ID   | Requirement                                                               |
| ---- | ------------------------------------------------------------------------- |
| R‑01 | Reads must be _fast_—ideally a single indexed query.                      |
| R‑02 | Deploy/Rollback must be atomic and sub‑second.                            |
| R‑03 | Editors can branch off an existing production state and iterate safely.   |
| R‑04 | Must record _who/what/when/why_ for each change.                          |
| R‑05 | Model must tolerate sparse edits (only touched rows appear in a release). |

## 3. Core Concepts

| Concept         | Description                                                                                                                                                                                         |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Entity**      | Logical business object (Brand, Post, Translation…). Stable `entity_id`. _All object types reside in the same **`** and **`** tables, distinguished only by **\`\`**—there are no per‑type tables._ |
| **Release**     | Metadata bucket that tags a set of edits. _Statuses_: `OPEN`, `CLOSED`, `DEPLOYED`, `ROLLED_BACK`.                                                                                                  |
| **Version Row** | Immutable snapshot of an entity _within_ a release. Always an **INSERT**, never an UPDATE.                                                                                                          |
| **deploy_seq**  | Monotonically increasing integer set when a release is deployed—gives a total order of production releases.                                                                                         |

## 4. Database Schema (PostgreSQL 16 syntax)

```sql
CREATE TABLE release (
  release_id   bigint  GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name         text    NOT NULL,
  status       text    CHECK (status IN ('OPEN','CLOSED','DEPLOYED','ROLLED_BACK')),
  deploy_seq   bigint  UNIQUE,  -- NULL until deployed
  created_by   bigint,
  created_at   timestamptz DEFAULT now(),
  deployed_at  timestamptz
);

CREATE TABLE entity (
  entity_id   bigint PRIMARY KEY,
  entity_type text NOT NULL  -- e.g. 'BRAND','TRANSLATION',…
);

CREATE TABLE entity_version (
  entity_id     bigint NOT NULL REFERENCES entity,
  release_id    bigint NOT NULL REFERENCES release,
  /* business columns */
  title         text,
  body          text,
  locale        text,
  /* audit */
  created_by    bigint,
  created_at    timestamptz DEFAULT now(),
  PRIMARY KEY (entity_id, release_id)
);

-- Many‑to‑many example (Brand ↔ Jurisdiction)
CREATE TABLE relation_version (
  relation_id   bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  release_id    bigint NOT NULL REFERENCES release,
  left_entity   bigint NOT NULL,
  right_entity  bigint NOT NULL,
  action        text   CHECK (action IN ('ADD','REMOVE')),
  created_by    bigint,
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX ON entity_version (entity_id, release_id);
```

_Optional_: `change_set`, `audit_event` tables for finer‑grained grouping and diffing.

### 4.1 Attribute storage patterns

If you need attributes that differ wildly across types, choose one of:

1. **Wide table** (shown above): add superset columns to `entity_version`; nullable when not used.
2. **JSONB payload**: replace typed columns with `payload JSONB`, letting the application enforce schema per `entity_type`.
3. **Table inheritance / adjunct tables**: keep a small core in `entity_version` and store rare or large blobs in per‑type extension tables keyed by `(entity_id, release_id)`.

The runtime view logic is identical whichever storage form you choose.

### 4.2 "Wide" Table Viability

Even if you adopt a **single shared `entity_version` table** with many core columns, Postgres handles it well:

| Myth                                                   | Reality                                                                                                                   |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| _“Hundreds of nullable columns will bloat every row.”_ | NULLs cost one bit in the row’s **null‑bitmap**; variable‑width columns (`text`, `jsonb`) occupy no heap space when NULL. |
| _“Postgres will choke on a large schema.”_             | Hard limit is **≈ 1 600 columns**. Most CMS core schemas need < 50.                                                       |
| _“Queries will pull 200 columns I don’t need.”_        | Use narrow _covering indexes_ or `SELECT column_list …`—only referenced columns are fetched.                              |

#### Recommended approach

1. **Keep the truly universal set small** (≤ 15 fields): `entity_id`, `release_id`, `entity_type`, `brand_id`, `jurisdiction_id`, `locale`, `title`, `slug`, `status`, `published_at`, audit columns.
2. **Everything else** → `payload JSONB` or an adjunct table. Promote a field to a typed column **only when** it becomes hot for filtering/ordering.
3. **Index surgically**: B‑tree on dimension columns; GIN/expression indexes on JSONB paths you filter; never index the entire payload.
4. **Row size check**: aim for average < 8 kB so many rows fit in shared buffers.

#### Rules of thumb

- Wide table simpler than n adjunct joins _until_ you hit dozens of hot optional fields.
- Monitor query plans; if you see repeated `->> 'foo'` JSON extraction in filters, consider promoting `foo`.
- Column additions in Postgres are metadata‑only and near‑instant if placed at the end of the table.

> In short, a moderately wide table is usually **the sweet spot**: fast predicates & joins on stable dimensions, full flexibility via JSONB for everything else.

## 5. Read Path

### 5.1 Session variable

```sql
SET cms.active_release = :release_id;  -- set by UI or request middleware
```

### 5.2 Canonical view (example for brands)

```sql
CREATE OR REPLACE VIEW v_brand AS
SELECT DISTINCT ON (ev.entity_id)
       ev.*
FROM   entity_version ev
JOIN   release        r    ON r.release_id = ev.release_id
JOIN   release        live ON live.release_id = current_setting('cms.active_release')::bigint
WHERE  -- (a) row belongs to the active release
       ev.release_id = live.release_id
   OR  -- (b) row’s release is already deployed
       r.deploy_seq IS NOT NULL
ORDER BY ev.entity_id,
         (ev.release_id = live.release_id) DESC,  -- live rows win
         r.deploy_seq DESC;                       -- else newest deployed
```

_Guarantees_: ignores edits in releases that are still `OPEN`/`CLOSED`, picks newest deployed version when entity untouched in the active release. Query cost ≈ one index seek + sort in memory.

## 6. Write Workflow

1. **Create release** `INSERT INTO release (name, status) VALUES ('Summer Sale', 'OPEN') RETURNING release_id;`
2. **Editor session**: `SET cms.active_release = <new id>`.
3. **Edits**: every save inserts rows into `entity_version` or `relation_version`, tagged with the release id.
4. **Close for QA**: `UPDATE release SET status='CLOSED' WHERE release_id=?;`

## 7. Deploy & Rollback

```sql
CREATE SEQUENCE deploy_seq;

CREATE FUNCTION cms.deploy(_release bigint) RETURNS void LANGUAGE plpgsql AS $$
DECLARE new_seq bigint;
BEGIN
  SELECT nextval('deploy_seq') INTO new_seq;
  UPDATE release
     SET status      = 'DEPLOYED',
         deploy_seq  = new_seq,
         deployed_at = now()
   WHERE release_id  = _release;
  -- Point site to new release
  PERFORM set_config('cms.active_release', _release::text, false);
END;$$;
```

_Rollback_: call the same function with the previous good release id. _Latency_: < 50 ms, independent of data volume.

## 8. Parallel Releases & Conflict Detection

- Editors set their own `cms.active_release` (e.g., 43, 44…).
- When QA attempts to deploy 43 the system checks for each edited entity whether a newer `deploy_seq` already exists (i.e., someone else shipped a change). If yes → ask for re‑base.
- Merge is row‑level: copy latest row into 43, redo change, or abandon.

## 9. Auditing & Diff

- `audit_event` trigger logs `INSERT` into all `*_version` tables.
- Diff two releases:

  ```sql
  SELECT e.entity_id
  FROM   entity_version e FULL JOIN entity_version p USING (entity_id)
  WHERE  e.release_id = :left AND p.release_id = :right
    AND  e IS DISTINCT FROM p;
  ```

- UI can group by `change_set` and display who/when/why.

## 10. Optional Enhancement – Materialised Live Tables

If absolute minimal read complexity is required, deploy script can COPY winning rows into `entity_live`, replacing in‑place via `ON CONFLICT`. Reads touch only `entity_live`, at the cost of a bulk write during deploy.

## 11. Scalability & Maintenance

| Concern             | Mitigation                                                                                      |
| ------------------- | ----------------------------------------------------------------------------------------------- |
| History bloat       | Partition `*_version` by `release_id`; drop partitions for `ROLLED_BACK` releases after N days. |
| FTS performance     | Store concatenated docs in `fts_document_version`, same pattern.                                |
| Very large releases | Batched deploy (`LIMIT …`) wrapped in transaction – still atomic thanks to pointer flip.        |

## 12. Trade‑Offs & Alternatives

| Approach                                    | Pros                                                          | Cons                                                   |
| ------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------ |
| **Append‑only per release** _(this design)_ | No overwrite; instant deploy; Git‑like branching; cheap reads | Slightly smarter view; more rows overall               |
| Clone whole DB per release                  | Isolation is trivial                                          | Heavy storage; cross‑release diff painful; deploy slow |
| Temporal tables (system‑versioned) only     | Built‑in history                                              | Needs extra filter logic for _non‑deployed_ releases   |

## 13. Appendix – Example Timeline

| Time | Action                                 | Live release | deploy_seq |
| ---- | -------------------------------------- | ------------ | ---------- |
| T₀   | Deploy 42 (`translate 123`)            | 42           | 141        |
| T₁   | Edits in 43 (`post 311`) – still OPEN  | 42           | 141        |
| T₂   | Edits in 44 (`translate 124`) – CLOSED | 42           | 141        |
| T₃   | Deploy 44 → pointer flips              | **44**       | 142        |
| T₄   | 43 still ignored until deployed        | 44           | 142        |

---

## 14. Extending to Rich Content (Posts, Pages, Components)

The same **Entity + Entity_version + Relation_version** backbone scales to an entire headless CMS. You simply register new `entity_type` values and, if needed, adjunct tables or JSONB payloads for their bespoke fields.

| Content type | `entity_type` | Core columns in `entity_version`                                   | Typical adjunct / JSONB fields             |
| ------------ | ------------- | ------------------------------------------------------------------ | ------------------------------------------ |
| Blog post    | `POST`        | `title`, `slug`, `author_id`, `published_at`, `locale`, `brand_id` | body (markdown/HTML), hero_image, SEO JSON |
| Web page     | `PAGE`        | `title`, `path`, `locale`, `brand_id`, `status` (draft/published)  | layout options JSON, meta_tags JSON        |
| Component    | `COMPONENT`   | `component_type`, `locale`, `brand_id`                             | props JSON (flexible per component)        |
| Media asset  | `ASSET`       | `file_id`, `mime_type`, `original_name`, `size`                    | focal_point, alt_text (JSON)               |

### 14.1 Nested & repeatable regions

Pages are usually built from **component instances**:

```
PAGE (entity_id = 5001)
 ├── COMPONENT (5010 ‑ hero)
 ├── COMPONENT (5011 ‑ product‑grid)
 └── COMPONENT (5012 ‑ footer‑cta)
```

Store each component as an entity row and link it via `relation_version` rows:

```sql
-- add component 5010 into page 5001 in release 42
INSERT INTO relation_version (
  release_id, left_entity, right_entity, action, created_by
) VALUES (
  42,           5001,        5010,        'ADD',  :user_id
);
```

_Ordering_ can be kept in a `position` numeric column on `relation_version`, or in a JSONB `children` array inside the parent component/page payload.

### 14.2 Tags, categories, menus

All many‑to‑many metadata (post ↔ tag, page ↔ menu‑item) fits the same pattern—just different `entity_type`s and `relation_version` rows.

### 14.3 Search and listings

Materialise search docs into `fts_document_version` (one row per `(entity_id, release_id)`) so every release can be full‑text‑searched in isolation. A nightly job (or trigger) updates this table whenever a post/page/component row changes in that release.

### 14.4 Rendering & API delivery

GraphQL/REST resolvers read via the canonical views (`v_entity`, `v_relation`) scoped to `cms.active_release`. Your front‑end framework (Next.js, Nuxt, etc.) can therefore preview or publish simply by toggling the release id in the header.

### 14.5 Storage cost estimate

| Volume                                     | Approx rows                      |
| ------------------------------------------ | -------------------------------- |
| 10 k pages × 20 releases                   | 200 k `PAGE` rows                |
| 50 k components × 20 releases              | 1 M `COMPONENT` rows             |
| 100 k blog posts (5 locales) × 30 releases | 15 M `POST` rows                 |
| Relations (avg 5 per parent)               | \~5–10 M `relation_version` rows |

PostgreSQL with partitioning and zstd TOAST comfortably handles this on a single medium instance (\~8‑16 vCPU, 64 GB RAM) with sub‑50 ms P95 read latency.

---

_End of document_


After finishing that task, we continued with 