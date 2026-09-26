-- TuitionSphere database cleanup
--
-- Deletes all application data from every table in the public schema while
-- preserving the database structure and Prisma migration history.
--
-- WARNING: This operation cannot be undone without a database backup.

BEGIN;

DO $cleanup$
DECLARE
  tables_to_clean text;
BEGIN
  SELECT string_agg(format('%I.%I', schemaname, tablename), ', ')
    INTO tables_to_clean
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename <> '_prisma_migrations';

  IF tables_to_clean IS NOT NULL THEN
    EXECUTE 'TRUNCATE TABLE '
      || tables_to_clean
      || ' RESTART IDENTITY CASCADE';
  END IF;
END
$cleanup$;

COMMIT;

