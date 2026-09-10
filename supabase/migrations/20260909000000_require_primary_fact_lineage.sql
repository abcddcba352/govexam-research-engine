-- A fact may be marked verified only when its source record has a direct
-- primary URL. This prevents cache labels and seed metadata from becoming
-- evidence in the examination readiness gate.
CREATE OR REPLACE FUNCTION govexam.require_primary_fact_lineage()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.verification_status IN ('VERIFIED_OFFICIAL', 'VERIFIED_MULTIPLE_SOURCES')
     AND NOT EXISTS (
       SELECT 1 FROM govexam.sources source
       WHERE source.source_id = NEW.source_id
         AND source.source_url ~ '^https://'
         AND source.source_level IN ('LEVEL_5_OFFICIAL', 'LEVEL_4_GOVERNMENT')
     ) THEN
    RAISE EXCEPTION 'verified fact % requires a primary HTTPS source record', NEW.fact_name;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_require_primary_fact_lineage ON govexam.exam_fact_verifications;
CREATE TRIGGER trg_require_primary_fact_lineage
BEFORE INSERT OR UPDATE ON govexam.exam_fact_verifications
FOR EACH ROW EXECUTE FUNCTION govexam.require_primary_fact_lineage();
