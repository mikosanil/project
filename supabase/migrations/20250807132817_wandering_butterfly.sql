/*
  # Fix projects table RLS policy recursion

  1. Security Changes
    - Drop all existing policies on projects table that cause recursion
    - Create simple, non-recursive policies for projects table
    - Ensure policies only use auth.uid() without querying related tables

  2. Policy Details
    - Users can view projects they created
    - Users can view projects they are assigned to (via project_assignments)
    - Users can create projects (with created_by = auth.uid())
    - Users can update their own projects
*/

-- Drop all existing policies on projects table
DROP POLICY IF EXISTS "Users can create projects" ON projects;
DROP POLICY IF EXISTS "Users can update their projects" ON projects;
DROP POLICY IF EXISTS "Users can view their projects" ON projects;

-- Create simple, non-recursive policies
CREATE POLICY "Users can create projects" ON projects
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update own projects" ON projects
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can view own projects" ON projects
  FOR SELECT TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Users can view assigned projects" ON projects
  FOR SELECT TO authenticated
  USING (
    id IN (
      SELECT project_id 
      FROM project_assignments 
      WHERE user_id = auth.uid()
    )
  );