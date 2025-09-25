/*
  # Add weight tracking and task assignments

  1. New Tables
    - `project_task_assignments` - Assigns specific tasks (kesim, imalat, kaynak, boya) to users per project
  
  2. Modified Tables
    - `assemblies` - Add weight_per_unit column for kg tracking
    - `progress_entries` - Remove worker_name, add user_id reference
  
  3. Security
    - Enable RLS on new table
    - Add policies for task assignments
    - Update progress entry policies
*/

-- Add weight tracking to assemblies
ALTER TABLE assemblies ADD COLUMN IF NOT EXISTS weight_per_unit DECIMAL(10,3) DEFAULT 0;

-- Create project task assignments table
CREATE TABLE IF NOT EXISTS project_task_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  work_stage_id uuid NOT NULL REFERENCES work_stages(id),
  assigned_by uuid NOT NULL REFERENCES auth.users(id),
  assigned_at timestamptz DEFAULT now(),
  UNIQUE(project_id, user_id, work_stage_id)
);

-- Enable RLS
ALTER TABLE project_task_assignments ENABLE ROW LEVEL SECURITY;

-- Add policies for project task assignments
CREATE POLICY "Project owners can manage task assignments"
  ON project_task_assignments
  FOR ALL
  TO authenticated
  USING (project_id IN (
    SELECT id FROM projects WHERE created_by = auth.uid()
  ));

CREATE POLICY "Admins can manage all task assignments"
  ON project_task_assignments
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Users can view their task assignments"
  ON project_task_assignments
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Modify progress_entries table
DO $$
BEGIN
  -- Add user_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'progress_entries' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE progress_entries ADD COLUMN user_id uuid REFERENCES auth.users(id);
  END IF;
  
  -- Make worker_name nullable for transition
  ALTER TABLE progress_entries ALTER COLUMN worker_name DROP NOT NULL;
END $$;

-- Update progress entry policies
DROP POLICY IF EXISTS "Assigned users can create progress entries" ON progress_entries;
DROP POLICY IF EXISTS "Users can view progress entries for accessible projects" ON progress_entries;

CREATE POLICY "Task assigned users can create progress entries"
  ON progress_entries
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- User must be assigned to this specific task for this project
    EXISTS (
      SELECT 1 FROM project_task_assignments pta
      JOIN assemblies a ON a.project_id = pta.project_id
      WHERE a.id = assembly_id 
        AND pta.user_id = auth.uid()
        AND pta.work_stage_id = progress_entries.work_stage_id
    )
    OR
    -- Project owners can create entries
    EXISTS (
      SELECT 1 FROM assemblies a
      JOIN projects p ON a.project_id = p.id
      WHERE a.id = assembly_id AND p.created_by = auth.uid()
    )
    OR
    -- Admins can create entries
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can view progress entries for accessible projects"
  ON progress_entries
  FOR SELECT
  TO authenticated
  USING (
    -- Users can see entries for projects they're assigned to
    assembly_id IN (
      SELECT a.id FROM assemblies a
      JOIN project_task_assignments pta ON a.project_id = pta.project_id
      WHERE pta.user_id = auth.uid()
    )
    OR
    -- Project owners can see all entries
    assembly_id IN (
      SELECT a.id FROM assemblies a
      JOIN projects p ON a.project_id = p.id
      WHERE p.created_by = auth.uid()
    )
    OR
    -- Admins can see all entries
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );