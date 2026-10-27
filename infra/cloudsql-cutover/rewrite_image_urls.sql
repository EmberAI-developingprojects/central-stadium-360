-- Point every Supabase Storage image URL at the GCS bucket (same object keys).
DO $$
DECLARE
  old_prefix constant text := 'https://kbtjblklzurzgddflnaa.supabase.co/storage/v1/object/public/event-images/';
  new_prefix constant text := 'https://storage.googleapis.com/stadium360-event-images/';
  col record;
  n bigint;
BEGIN
  FOR col IN
    SELECT table_name, column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND data_type IN ('text', 'character varying', 'jsonb', 'json')
  LOOP
    IF col.data_type IN ('jsonb', 'json') THEN
      EXECUTE format(
        'UPDATE public.%I SET %I = replace(%I::text, $1, $2)::%s WHERE %I::text LIKE ''%%'' || $1 || ''%%''',
        col.table_name, col.column_name, col.column_name, col.data_type, col.column_name)
        USING old_prefix, new_prefix;
    ELSE
      EXECUTE format(
        'UPDATE public.%I SET %I = replace(%I, $1, $2) WHERE %I LIKE ''%%'' || $1 || ''%%''',
        col.table_name, col.column_name, col.column_name, col.column_name)
        USING old_prefix, new_prefix;
    END IF;
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n > 0 THEN
      RAISE NOTICE '%.%: % rows', col.table_name, col.column_name, n;
    END IF;
  END LOOP;
END $$;
