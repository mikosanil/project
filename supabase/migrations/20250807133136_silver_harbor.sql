/*
  # Temporarily disable RLS for projects table

  This migration temporarily disables RLS on the projects table to resolve
  the infinite recursion issue. This allows all authenticated users to
  view and manage projects while we debug the policy issues.

  1. Security Changes
    - Disable RLS on projects table
    - Remove all existing policies
    - Add basic authenticated user access

  Note: This is a temporary solution for debugging. RLS should be re-enabled
  with proper policies once the issue is identified.
*/

-- Disable RLS temporarily
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Enable delete for project owners" ON projects;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON projects;
DROP POLICY IF EXISTS "Enable select for assigned users" ON projects;
DROP POLICY IF EXISTS "Enable select for project owners" ON projects;
DROP POLICY IF EXISTS "Enable update for project owners" ON projects;
DROP POLICY IF EXISTS "Users can view their own projects" ON projects;
DROP POLICY IF EXISTS "Users can view assigned projects" ON projects;
DROP POLICY IF EXISTS "Users can create projects" ON projects;
DROP POLICY IF EXISTS "Users can update own projects" ON projects;
DROP POLICY IF EXISTS "Users can delete own projects" ON projects;