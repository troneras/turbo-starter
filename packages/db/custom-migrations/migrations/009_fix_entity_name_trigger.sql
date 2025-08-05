-- Fix the set_entity_name function to not reference non-existent entity_name field
CREATE OR REPLACE FUNCTION set_entity_name()
RETURNS TRIGGER AS $$
BEGIN
  -- This function is currently a no-op since entity_name field doesn't exist
  -- in the current entity_versions schema. Keeping for future compatibility.
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;