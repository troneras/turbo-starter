-- Translation-specific indexes and constraints
-- These extend the base entity system for optimal translation performance

-- Create indexes for translation keys
CREATE INDEX IF NOT EXISTS idx_translation_keys_full_key 
ON entity_versions((payload->>'full_key'), release_id) 
WHERE entity_type = 'translation_key';

-- Create unique partial indexes for translations
-- One generic translation per key/locale/release
CREATE UNIQUE INDEX IF NOT EXISTS uq_tr_generic
  ON entity_versions((payload->>'full_key'), (payload->>'locale'), release_id)
  WHERE entity_type = 'translation' AND brand_id IS NULL;

-- One brand override per key/locale/brand/release
CREATE UNIQUE INDEX IF NOT EXISTS uq_tr_brand
  ON entity_versions((payload->>'full_key'), (payload->>'locale'), brand_id, release_id)
  WHERE entity_type = 'translation' AND brand_id IS NOT NULL;

-- Index for fast lookup by key_id
CREATE INDEX IF NOT EXISTS idx_translation_key_id
  ON entity_versions(((payload->>'key_id')::bigint), release_id)
  WHERE entity_type = 'translation';

-- Index for status filtering in review queue
CREATE INDEX IF NOT EXISTS idx_translation_status
  ON entity_versions((payload->>'status'), release_id)
  WHERE entity_type = 'translation';

-- Function to validate translation key format
CREATE OR REPLACE FUNCTION validate_translation_key(key_text text)
RETURNS boolean AS $$
BEGIN
  -- Key must match pattern: lowercase letters, numbers, dots, underscores
  RETURN key_text ~ '^[a-z0-9_.]+$';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get translation with brand fallback
CREATE OR REPLACE FUNCTION get_translation(
  p_key text,
  p_locale text,
  p_brand_id integer DEFAULT NULL,
  p_release_id bigint DEFAULT NULL
)
RETURNS text AS $$
DECLARE
  v_release_id bigint;
  v_result text;
BEGIN
  -- Use provided release or get active release
  v_release_id := COALESCE(p_release_id, get_active_release());
  
  -- Try brand-specific first, then fallback to generic
  SELECT COALESCE(
    -- Brand-specific translation
    (SELECT payload->>'value'
     FROM v_entities
     WHERE entity_type = 'translation'
       AND payload->>'full_key' = p_key
       AND payload->>'locale' = p_locale
       AND brand_id = p_brand_id
     LIMIT 1),
    -- Generic translation
    (SELECT payload->>'value'
     FROM v_entities
     WHERE entity_type = 'translation'
       AND payload->>'full_key' = p_key
       AND payload->>'locale' = p_locale
       AND brand_id IS NULL
     LIMIT 1)
  ) INTO v_result;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get translation key tree at a specific depth
CREATE OR REPLACE FUNCTION get_translation_key_tree(
  p_parent_path text DEFAULT '',
  p_depth integer DEFAULT 1,
  p_release_id bigint DEFAULT NULL
)
RETURNS TABLE (
  segment text,
  full_path text,
  is_folder boolean,
  child_count bigint
) AS $$
DECLARE
  v_release_id bigint;
  v_parent_pattern text;
  v_depth_pattern text;
BEGIN
  -- Use provided release or get active release
  v_release_id := COALESCE(p_release_id, get_active_release());
  
  -- Build patterns for matching
  IF p_parent_path = '' THEN
    v_parent_pattern := '';
    v_depth_pattern := '^[^.]+$';
  ELSE
    v_parent_pattern := p_parent_path || '.';
    v_depth_pattern := '^' || regexp_escape(p_parent_path) || '\.[^.]+$';
  END IF;
  
  RETURN QUERY
  WITH key_segments AS (
    SELECT DISTINCT
      CASE 
        WHEN p_parent_path = '' THEN split_part(payload->>'full_key', '.', 1)
        ELSE regexp_replace(payload->>'full_key', '^' || regexp_escape(v_parent_pattern), '')
      END AS segment_name,
      CASE 
        WHEN p_parent_path = '' THEN split_part(payload->>'full_key', '.', 1)
        ELSE v_parent_pattern || regexp_replace(payload->>'full_key', '^' || regexp_escape(v_parent_pattern), '')
      END AS segment_path
    FROM v_entities
    WHERE entity_type = 'translation_key'
      AND CASE 
        WHEN p_parent_path = '' THEN true
        ELSE payload->>'full_key' LIKE v_parent_pattern || '%'
      END
  )
  SELECT 
    ks.segment_name AS segment,
    ks.segment_path AS full_path,
    EXISTS (
      SELECT 1 
      FROM v_entities 
      WHERE entity_type = 'translation_key'
        AND payload->>'full_key' LIKE ks.segment_path || '.%'
      LIMIT 1
    ) AS is_folder,
    COUNT(DISTINCT v.id) FILTER (
      WHERE v.payload->>'full_key' LIKE ks.segment_path || '.%'
    ) AS child_count
  FROM key_segments ks
  LEFT JOIN v_entities v ON v.entity_type = 'translation_key'
  WHERE ks.segment_name ~ v_depth_pattern
  GROUP BY ks.segment_name, ks.segment_path
  ORDER BY ks.segment_name;
END;
$$ LANGUAGE plpgsql STABLE;

-- Helper function to escape regexp special characters
CREATE OR REPLACE FUNCTION regexp_escape(text_in text)
RETURNS text AS $$
BEGIN
  RETURN regexp_replace(text_in, '([.\\[\\](){}^$*+?|])', '\\\1', 'g');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to count translations by status
CREATE OR REPLACE FUNCTION get_translation_stats(
  p_release_id bigint DEFAULT NULL
)
RETURNS TABLE (
  total_keys bigint,
  total_translations bigint,
  draft_count bigint,
  pending_count bigint,
  approved_count bigint,
  locale_coverage jsonb
) AS $$
DECLARE
  v_release_id bigint;
BEGIN
  v_release_id := COALESCE(p_release_id, get_active_release());
  
  RETURN QUERY
  WITH stats AS (
    SELECT
      COUNT(DISTINCT CASE WHEN entity_type = 'translation_key' THEN id END) AS keys,
      COUNT(CASE WHEN entity_type = 'translation' THEN 1 END) AS translations,
      COUNT(CASE WHEN entity_type = 'translation' AND payload->>'status' = 'DRAFT' THEN 1 END) AS draft,
      COUNT(CASE WHEN entity_type = 'translation' AND payload->>'status' = 'PENDING' THEN 1 END) AS pending,
      COUNT(CASE WHEN entity_type = 'translation' AND payload->>'status' = 'APPROVED' THEN 1 END) AS approved
    FROM v_entities
    WHERE entity_type IN ('translation_key', 'translation')
  ),
  locale_stats AS (
    SELECT jsonb_object_agg(
      payload->>'locale',
      json_build_object(
        'total', COUNT(*),
        'approved', COUNT(CASE WHEN payload->>'status' = 'APPROVED' THEN 1 END)
      )
    ) AS coverage
    FROM v_entities
    WHERE entity_type = 'translation'
    GROUP BY payload->>'locale'
  )
  SELECT 
    stats.keys,
    stats.translations,
    stats.draft,
    stats.pending,
    stats.approved,
    COALESCE(locale_stats.coverage, '{}'::jsonb)
  FROM stats
  CROSS JOIN locale_stats;
END;
$$ LANGUAGE plpgsql STABLE;

-- Add check constraint for translation key format
ALTER TABLE entity_versions
ADD CONSTRAINT check_translation_key_format
CHECK (
  entity_type != 'translation_key' OR 
  validate_translation_key(payload->>'full_key')
);

-- Add check constraint for translation status
ALTER TABLE entity_versions
ADD CONSTRAINT check_translation_status
CHECK (
  entity_type != 'translation' OR 
  payload->>'status' IN ('DRAFT', 'PENDING', 'APPROVED')
);