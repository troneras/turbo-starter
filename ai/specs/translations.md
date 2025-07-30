# Translations Feature – Design Document

_Last updated: 30 Jul 2025_

---

## 1 Purpose

Provide a scalable, release‑aware translations subsystem that lets editors:

- Organise keys in nested namespaces (`checkout.button.confirm`).
- Enter, review and approve locale variants.
- Handle brand‑specific overrides.
- Work safely inside CMS **releases** (see “Edition‑Based CMS – Release & Rollback Design”).
- Expose fast read APIs for runtime localisation.

## 2 High‑Level Requirements

| ID   | Requirement                                                     |
| ---- | --------------------------------------------------------------- |
| T‑01 | Key tree must lazy‑load < 100 ms per level (50 k+ keys).        |
| T‑02 | Editing a key, variant or metadata never blocks other releases. |
| T‑03 | Support brand‑scoped overrides that gracefully fall back.       |
| T‑04 | Review workflow: `draft → pending → approved` per variant.      |
| T‑05 | API lookup by key+locale ≤ 5 ms P95 in production.              |
| T‑06 | Bulk import/export JSON/CSV without downtime.                   |

## 3 Data Model (extends core **entity/entity_version**)

| Column                            | Purpose                            |
| --------------------------------- | ---------------------------------- |
| `entity_type = 'translation_key'` | One row per key path (`full_key`). |
| `full_key text`                   | Dotted path, unique per release.   |
| `description text`                | Editor‑facing description.         |

| Column                        | Purpose                                    |
| ----------------------------- | ------------------------------------------ |
| `entity_type = 'translation'` | One row per **(key, locale, brand?)**.     |
| `key_id bigint`               | FK → translation_key entity_id.            |
| `locale text`                 | IETF tag (`en-US`).                        |
| `brand_id bigint NULL`        | NULL = generic.                            |
| `status enum`                 | `DRAFT / PENDING / APPROVED`.              |
| `payload -> 'value'`          | The translated string (rich text allowed). |
| `payload -> 'meta'`           | Length limits, plural rules, comments.     |

**Uniqueness** (partial indexes)

```sql
-- one generic translation per key/locale/release
CREATE UNIQUE INDEX uq_tr_generic
  ON entity_version(full_key, locale, release_id)
  WHERE entity_type = 'translation' AND brand_id IS NULL;

-- one brand override per key/locale/brand/release
CREATE UNIQUE INDEX uq_tr_brand
  ON entity_version(full_key, locale, brand_id, release_id)
  WHERE entity_type = 'translation' AND brand_id IS NOT NULL;
```

## 4 Read Path

### 4.1 Runtime lookup

```sql
SELECT COALESCE(b.value, g.value) AS text
FROM (
  SELECT payload->>'value' AS value
  FROM   v_entities          -- release‑aware view
  WHERE  entity_type = 'translation'
    AND  full_key  = :key
    AND  locale    = :locale
    AND  brand_id  = :brand
) AS b
FULL JOIN LATERAL (
  SELECT payload->>'value' AS value
  FROM   v_entities
  WHERE  entity_type = 'translation'
    AND  full_key  = :key
    AND  locale    = :locale
    AND  brand_id IS NULL
) AS g ON TRUE
LIMIT 1;
```

*Returns brand override if present, else generic.* Indexes: `(full_key, locale, brand_id NULLS FIRST)`.

### 4.2 Tree hydrate

```sql
SELECT DISTINCT split_part(full_key,'.',1) AS segment,
       bool_or(full_key LIKE split_part(full_key,'.',1)||'.%') AS is_folder
FROM   v_entities
WHERE  entity_type = 'translation_key'
ORDER  BY segment;
```

Repeat at each depth (`split_part(full_key,'.',n+1)`). No explicit namespace table needed.

## 5 Write Workflow

| Action                 | API endpoint                                                 | DB effect                                             |
| ---------------------- | ------------------------------------------------------------ | ----------------------------------------------------- |
| **Create key**         | `POST /translation‑keys`                                     | INSERT `translation_key` row in active release.       |
| **Add/Update variant** | `PUT /translations/{id}`                                     | INSERT a new `translation` version row (append‑only). |
| **Toggle brand scope** | Copy generic row → new row with `brand_id`; update key list. |                                                       |
| **Status change**      | `PATCH /translations/{id}/status`                            |  INSERT with updated `status` field.                  |

> Edits inside CLOSED / DEPLOYED releases are blocked by middleware.

## 6 UI Blueprint (maps to existing side panel)

1. **Translation Keys** (route `/translations/keys`)
   - Sidebar tree (lazy, virtualised)
   - Header: _New key_ CTA + Release badge.

2. **Key Details**
   - Path + description inputs.
   - Brand‑specific toggle → shows secondary list when on.
   - Variant table: locale chip · value preview · status pill · edit/delete buttons.
   - _Add locale_ modal with auto‑complete of missing locales.

3. **Bulk tools**
   - Import JSON/CSV modal (maps to `/import` API).
   - Export current release/brand subset.

4. **Review queue** (toggle tab)
   - Table filtered `status=PENDING`, grouped by key; one‑click _Approve_.

## 7 API Surface (REST)

| Verb   | Path                                      | Purpose                               |
| ------ | ----------------------------------------- | ------------------------------------- |
| GET    | `/translation‑keys?release=`              | Tree fragments (`parent=` query).     |
| POST   | `/translation‑keys`                       | Create key.                           |
| DELETE | `/translation‑keys/{id}`                  | Soft‑delete.                          |
| GET    | `/translations?key_id=&locale=&brand_id=` | List variants.                        |
| PUT    | `/translations/{id}`                      | Upsert variant text / meta.           |
| PATCH  | `/translations/{id}/status`               | Change status.                        |
| POST   | `/import/translations`                    | Bulk import (expects release header). |
| GET    | `/export/translations`                    | Stream export.                        |

All endpoints accept `X‑CMS‑Release` and set `cms.active_release` accordingly.

## 8 Validation Rules

| Rule                                     | Enforcement                                               |
| ---------------------------------------- | --------------------------------------------------------- |
| `full_key` pattern `^[a-z0-9_.]+$`       | DB check constraint + front‑end regex.                    |
| Unique per release (see indexes)         | DB unique indexes.                                        |
| Variant length ≤ 1024 chars              | Front‑end + check constraint.                             |
| Status transition DRAFT→PENDING→APPROVED | Trigger on `entity_version` insert rejects invalid jumps. |

## 9 Audit & Diff

Audit already captured by generic `audit_events` trigger. Diff between two releases uses the `calculate_release_diff()` function filtered to `entity_type IN ('translation','translation_key')`.

## 10 Import/Export Strategy

- **Import**: parse file, split into _create‑key_ + _upsert translation_ batches, wrap in one release.
- **Export**: SQL cursor streams `{ key, locale, brand, value, status }` as CSV/JSON.
- Handles > 1 M rows using server‑side cursors; memory‑safe.

## 11 Performance & Scaling Targets

| Tier       | Keys  | Variants | Nodes | Expected P95 read        |
| ---------- | ----- | -------- | ----- | ------------------------ |
| MVP        | 10 k  | 100 k    | <500  | <10 ms                   |
| Growth     | 100 k | 1 M      | 3 k   | <20 ms                   |
| Enterprise | 1 M   | 10 M     | 20 k  | <40 ms with partitioning |

Partition `entity_version` by `entity_type='translation'` once variants exceed \~5 M rows.

## 12 Open Questions & Next Steps

1. **Pluralisation rules** – do we store ICU plural forms in `payload`, or create adjunct table?
2. **Rich text vs plain** – if rich text, enforce HTML subset or use Markdown?
3. **Per‑locale QA step** – dedicated permission (`translations:approve`) or piggy‑back on existing editor roles?
4. **CDN edge cache** – do we snapshot approved translations into a static JSON bundle per brand/locale for ultra‑fast delivery?

---

_End of document_
