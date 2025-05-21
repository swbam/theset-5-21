-- Helper functions for database testing and debugging
-- Run these SQL commands in your Supabase SQL Editor

-- Function to get database configuration (URL and anon key)
-- This helps verify which database the app is connected to
CREATE OR REPLACE FUNCTION public.get_db_config()
RETURNS json
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT json_build_object(
    'supabase_url', current_setting('supabase_anon.app_settings.endpoint')::text,
    'anon_key', current_setting('supabase_anon.app_settings.anon_key')::text
  );
$$;

-- Grant execute permission to the anon role
GRANT EXECUTE ON FUNCTION public.get_db_config() TO anon;

-- Function to get RLS policies for all tables
-- This helps debug permission issues
CREATE OR REPLACE FUNCTION public.get_rls_policies()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  policies json;
BEGIN
  -- Query all RLS policies from pg_catalog
  SELECT json_agg(policy_info)
  INTO policies
  FROM (
    SELECT
      schemaname as schema,
      tablename as table,
      policyname as policy_name,
      permissive,
      roles,
      cmd as operation,
      qual as using_expression,
      with_check as with_check_expression
    FROM
      pg_policies
    WHERE
      schemaname = 'public'
    ORDER BY
      tablename, policyname
  ) as policy_info;
  
  RETURN policies;
END;
$$;

-- Grant execute permission to the anon role
GRANT EXECUTE ON FUNCTION public.get_rls_policies() TO anon;

-- Function to test write permission on a specific table
-- Returns whether the current role can insert, update, and delete
CREATE OR REPLACE FUNCTION public.test_table_permissions(table_name text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  can_select boolean;
  can_insert boolean;
  can_update boolean;
  can_delete boolean;
  result json;
BEGIN
  -- Test SELECT permission
  BEGIN
    EXECUTE format('SELECT 1 FROM %I LIMIT 1', table_name);
    can_select := true;
  EXCEPTION
    WHEN insufficient_privilege THEN
      can_select := false;
  END;
  
  -- Test INSERT permission
  BEGIN
    EXECUTE format('SELECT has_table_privilege(current_user, %L, ''INSERT'')', table_name);
    can_insert := true;
  EXCEPTION
    WHEN insufficient_privilege THEN
      can_insert := false;
  END;
  
  -- Test UPDATE permission
  BEGIN
    EXECUTE format('SELECT has_table_privilege(current_user, %L, ''UPDATE'')', table_name);
    can_update := true;
  EXCEPTION
    WHEN insufficient_privilege THEN
      can_update := false;
  END;
  
  -- Test DELETE permission
  BEGIN
    EXECUTE format('SELECT has_table_privilege(current_user, %L, ''DELETE'')', table_name);
    can_delete := true;
  EXCEPTION
    WHEN insufficient_privilege THEN
      can_delete := false;
  END;
  
  -- Build result json
  SELECT json_build_object(
    'table', table_name,
    'can_select', can_select,
    'can_insert', can_insert,
    'can_update', can_update,
    'can_delete', can_delete
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Grant execute permission to the anon role
GRANT EXECUTE ON FUNCTION public.test_table_permissions(text) TO anon; 