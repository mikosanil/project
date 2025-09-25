
/*
  # Manufacturing Tracking System Database Schema

  1. New Tables
    - `projects`
      - `id` (uuid, primary key)
      - `name` (text)
      - `description` (text)
      - `start_date` (date)
      - `target_completion_date` (date)
      - `status` (text)
      - `created_by` (uuid, references auth.users)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `assemblies`
      - `id` (uuid, primary key)
      - `project_id` (uuid, references projects)
      - `poz_code` (text)
      - `description` (text)
      - `total_quantity` (integer)
      - `created_at` (timestamp)

    - `work_stages`
      - `id` (uuid, primary key)
      - `name` (text) - kesim, imalat, kaynak, boya
      - `display_order` (integer)
      - `color` (text)

    - `progress_entries`
      - `id` (uuid, primary key)
      - `assembly_id` (uuid, references assemblies)
      - `work_stage_id` (uuid, references work_stages)
      - `quantity_completed` (integer)
      - `worker_name` (text)
      - `completion_date` (timestamp)
      - `notes` (text)
      - `created_by` (uuid, references auth.users)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their data
*/

-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  start_date date DEFAULT CURRENT_DATE,
  target_completion_date date,
  status text DEFAULT 'planning' CHECK (status IN ('planning', 'in_progress', 'completed', 'on_hold')),
  created_by uuid REFERENCES auth.users(id) DEFAULT auth.uid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create assemblies table
CREATE TABLE IF NOT EXISTS assemblies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  poz_code text NOT NULL,
  description text DEFAULT '',
  total_quantity integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create work_stages table
CREATE TABLE IF NOT EXISTS work_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  display_order integer NOT NULL,
  color text NOT NULL DEFAULT '#6B7280'
);

-- Create progress_entries table
CREATE TABLE IF NOT EXISTS progress_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assembly_id uuid NOT NULL REFERENCES assemblies(id) ON DELETE CASCADE,
  work_stage_id uuid NOT NULL REFERENCES work_stages(id),
  quantity_completed integer NOT NULL DEFAULT 0,
  worker_name text NOT NULL,
  completion_date timestamptz DEFAULT now(),
  notes text DEFAULT '',
  created_by uuid REFERENCES auth.users(id) DEFAULT auth.uid(),
  created_at timestamptz DEFAULT now()
);

-- Insert default work stages
INSERT INTO work_stages (name, display_order, color) VALUES
  ('Kesim', 1, '#EF4444'),
  ('İmalat', 2, '#F59E0B'),
  ('Kaynak', 3, '#3B82F6'),
  ('Boya', 4, '#10B981')
ON CONFLICT (name) DO NOTHING;

-- Enable Row Level Security
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE assemblies ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress_entries ENABLE ROW LEVEL SECURITY;

-- Create policies for projects
CREATE POLICY "Users can view projects they created"
  ON projects FOR SELECT
  TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Users can create projects"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their projects"
  ON projects FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Create policies for assemblies
CREATE POLICY "Users can view assemblies for their projects"
  ON assemblies FOR SELECT
  TO authenticated
  USING (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()));

CREATE POLICY "Users can create assemblies for their projects"
  ON assemblies FOR INSERT
  TO authenticated
  WITH CHECK (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()));

CREATE POLICY "Users can update assemblies for their projects"
  ON assemblies FOR UPDATE
  TO authenticated
  USING (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()));

-- Create policies for work_stages (read-only for all authenticated users)
CREATE POLICY "Authenticated users can view work stages"
  ON work_stages FOR SELECT
  TO authenticated
  USING (true);

-- Create policies for progress_entries
CREATE POLICY "Users can view progress entries for their projects"
  ON progress_entries FOR SELECT
  TO authenticated
  USING (assembly_id IN (
    SELECT a.id FROM assemblies a
    JOIN projects p ON a.project_id = p.id
    WHERE p.created_by = auth.uid()
  ));

CREATE POLICY "Users can create progress entries for their projects"
  ON progress_entries FOR INSERT
  TO authenticated
  WITH CHECK (assembly_id IN (
    SELECT a.id FROM assemblies a
    JOIN projects p ON a.project_id = p.id
    WHERE p.created_by = auth.uid()
  ));

-- Create updated_at trigger for projects
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();