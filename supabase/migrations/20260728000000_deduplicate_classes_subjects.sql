-- Migration: Deduplicate classes/subjects + add UNIQUE constraints
-- 
-- Context: The seed script (seed-school.ts) was run twice on the same
-- school, creating duplicate classes and subjects with different UUIDs
-- but identical names. This migration:
--  1. Adds UNIQUE constraints to prevent recurrence
--  2. Cleanup was executed via a Node.js script (cleanup_dupes.js)
--
-- NOTE: The actual data cleanup (deleting orphan rows, updating
-- programme references) was done via the cleanup_dupes.js script.
-- This migration only adds the constraints.

-- Classes: same name cannot exist twice within the same academic year
-- (but can legitimately repeat across different years)
ALTER TABLE classes ADD CONSTRAINT classes_school_year_name_unique UNIQUE (school_id, academic_year_id, name);

-- Subjects: same name cannot exist twice within the same school
-- (subjects have no academic_year_id, so they are unique per school)
ALTER TABLE subjects ADD CONSTRAINT subjects_school_name_unique UNIQUE (school_id, name);

-- Note: If this fails because hidden duplicates still exist, run:
--   SELECT name, COUNT(*) FROM subjects WHERE school_id = '<school_id>' GROUP BY name HAVING COUNT(*) > 1;
--   SELECT c.name, c.academic_year_id, COUNT(*) FROM classes c WHERE c.school_id = '<school_id>' GROUP BY c.name, c.academic_year_id HAVING COUNT(*) > 1;
-- And delete the surplus rows before re-applying this migration.
