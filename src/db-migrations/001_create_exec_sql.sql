-- Create a procedure to execute arbitrary SQL
-- This is used by the migration script to apply migrations
CREATE OR REPLACE FUNCTION public.exec_sql(sql text)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql;
END;
$$;

-- Grant execute privileges on the function to authenticated users
GRANT EXECUTE ON FUNCTION public.exec_sql TO authenticated; 