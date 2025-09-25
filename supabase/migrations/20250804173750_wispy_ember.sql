/*
  # Proje Atama Sistemi

  1. Yeni Tablolar
    - `project_assignments`
      - `id` (uuid, primary key)
      - `project_id` (uuid, foreign key to projects)
      - `user_id` (uuid, foreign key to auth.users)
      - `assigned_by` (uuid, foreign key to auth.users)
      - `assigned_at` (timestamp)
      - `role` (text) - 'viewer', 'worker', 'manager'

  2. Güvenlik
    - Enable RLS on project_assignments table
    - Add policies for project assignments

  3. Değişiklikler
    - Projects tablosuna department alanı eklendi
    - Assembly ve progress entry politikaları güncellendi
*/

-- Create project assignments table
CREATE TABLE IF NOT EXISTS project_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_by uuid NOT NULL REFERENCES auth.users(id),
  assigned_at timestamptz DEFAULT now(),
  role text NOT NULL DEFAULT 'worker' CHECK (role IN ('viewer', 'worker', 'manager')),
  UNIQUE(project_id, user_id)
);

ALTER TABLE project_assignments ENABLE ROW LEVEL SECURITY;

-- Project assignment policies
CREATE POLICY "Admins can manage all assignments"
  ON project_assignments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

CREATE POLICY "Project owners can manage assignments"
  ON project_assignments
  FOR ALL
  TO authenticated
  USING (
    project_id IN (
      SELECT id FROM projects 
      WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Users can view their assignments"
  ON project_assignments
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Update projects policies to include assigned users
DROP POLICY IF EXISTS "Users can view projects they created" ON projects;
CREATE POLICY "Users can view their projects"
  ON projects
  FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid() OR
    id IN (
      SELECT project_id FROM project_assignments 
      WHERE user_id = auth.uid()
    )
  );

-- Update assemblies policies
DROP POLICY IF EXISTS "Users can view assemblies for their projects" ON assemblies;
CREATE POLICY "Users can view assemblies for accessible projects"
  ON assemblies
  FOR SELECT
  TO authenticated
  USING (
    project_id IN (
      SELECT id FROM projects 
      WHERE created_by = auth.uid()
    ) OR
    project_id IN (
      SELECT project_id FROM project_assignments 
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create assemblies for their projects" ON assemblies;
CREATE POLICY "Project owners can manage assemblies"
  ON assemblies
  FOR ALL
  TO authenticated
  USING (
    project_id IN (
      SELECT id FROM projects 
      WHERE created_by = auth.uid()
    )
  );

-- Update progress entries policies
DROP POLICY IF EXISTS "Users can view progress entries for their projects" ON progress_entries;
CREATE POLICY "Users can view progress entries for accessible projects"
  ON progress_entries
  FOR SELECT
  TO authenticated
  USING (
    assembly_id IN (
      SELECT a.id FROM assemblies a
      JOIN projects p ON a.project_id = p.id
      WHERE p.created_by = auth.uid()
    ) OR
    assembly_id IN (
      SELECT a.id FROM assemblies a
      JOIN project_assignments pa ON a.project_id = pa.project_id
      WHERE pa.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create progress entries for their projects" ON progress_entries;
CREATE POLICY "Assigned users can create progress entries"
  ON progress_entries
  FOR INSERT
  TO authenticated
  WITH CHECK (
    assembly_id IN (
      SELECT a.id FROM assemblies a
      JOIN projects p ON a.project_id = p.id
      WHERE p.created_by = auth.uid()
    ) OR
    assembly_id IN (
      SELECT a.id FROM assemblies a
      JOIN project_assignments pa ON a.project_id = pa.project_id
      WHERE pa.user_id = auth.uid() AND pa.role IN ('worker', 'manager')
    )
  );