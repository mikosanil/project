/*
  # Fix project visibility policies

  1. Security Changes
    - Drop all existing policies that may be causing visibility issues
    - Create simple, working policies for project access
    - Ensure authenticated users can see projects appropriately

  2. Policy Updates
    - Allow users to create projects
    - Allow users to view their own projects
    - Allow users to view projects they're assigned to
    - Allow project owners to update their projects
*/

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can create projects" ON projects;
DROP POLICY IF EXISTS "Users can update own projects" ON projects;
DROP POLICY IF EXISTS "Users can view own projects" ON projects;
DROP POLICY IF EXISTS "Users can view assigned projects" ON projects;

-- Create new, simple policies
CREATE POLICY "Enable insert for authenticated users" ON projects
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Enable select for project owners" ON projects
  FOR SELECT TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Enable select for assigned users" ON projects
  FOR SELECT TO authenticated
  USING (
    id IN (
      SELECT project_id 
      FROM project_assignments 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Enable update for project owners" ON projects
  FOR UPDATE TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Enable delete for project owners" ON projects
  FOR DELETE TO authenticated
  USING (auth.uid() = created_by);