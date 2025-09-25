-- Montaj takip sistemi için gerekli tablolar ve alanlar

-- 1. Montaj lokasyonları tablosu
CREATE TABLE assembly_locations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT,
  district TEXT,
  coordinates JSONB, -- {lat: number, lng: number}
  contact_person TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  access_notes TEXT, -- Erişim notları
  special_requirements TEXT, -- Özel gereksinimler
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Montaj ekipleri tablosu
CREATE TABLE assembly_teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  team_leader_id UUID REFERENCES users(id),
  specialization TEXT, -- Uzmanlık alanı
  max_capacity INTEGER DEFAULT 5,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Montaj ekip üyeleri tablosu
CREATE TABLE assembly_team_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES assembly_teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL, -- 'leader', 'member', 'specialist'
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);

-- 4. Montaj görevleri tablosu
CREATE TABLE assembly_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  assembly_id UUID NOT NULL REFERENCES assemblies(id) ON DELETE CASCADE,
  location_id UUID REFERENCES assembly_locations(id),
  team_id UUID REFERENCES assembly_teams(id),
  task_name TEXT NOT NULL,
  description TEXT,
  assembly_type TEXT NOT NULL, -- 'field', 'workshop', 'prefabricated'
  priority TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
  status TEXT DEFAULT 'planned', -- 'planned', 'in_progress', 'completed', 'on_hold', 'cancelled'
  planned_start_date TIMESTAMP WITH TIME ZONE,
  planned_end_date TIMESTAMP WITH TIME ZONE,
  actual_start_date TIMESTAMP WITH TIME ZONE,
  actual_end_date TIMESTAMP WITH TIME ZONE,
  estimated_duration_hours INTEGER,
  actual_duration_hours INTEGER,
  weather_dependency BOOLEAN DEFAULT false,
  special_equipment TEXT[], -- Gerekli özel ekipmanlar
  safety_requirements TEXT[], -- Güvenlik gereksinimleri
  quality_standards TEXT[], -- Kalite standartları
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Montaj ilerleme kayıtları tablosu
CREATE TABLE assembly_progress_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  assembly_task_id UUID NOT NULL REFERENCES assembly_tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  progress_percentage INTEGER NOT NULL CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  work_description TEXT NOT NULL,
  work_hours DECIMAL(5,2) NOT NULL,
  weather_conditions TEXT,
  equipment_used TEXT[],
  materials_used TEXT[],
  issues_encountered TEXT,
  solutions_applied TEXT,
  quality_notes TEXT,
  photos JSONB, -- Fotoğraf URL'leri ve metadata
  entry_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Montaj kalite kontrolü tablosu
CREATE TABLE assembly_quality_checks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  assembly_task_id UUID NOT NULL REFERENCES assembly_tasks(id) ON DELETE CASCADE,
  checker_id UUID NOT NULL REFERENCES users(id),
  check_type TEXT NOT NULL, -- 'pre_assembly', 'during_assembly', 'post_assembly', 'final_inspection'
  check_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_passed BOOLEAN NOT NULL,
  check_notes TEXT,
  issues_found TEXT[],
  corrective_actions TEXT[],
  photos JSONB,
  approved_by UUID REFERENCES users(id),
  approval_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Montaj dokümantasyonu tablosu
CREATE TABLE assembly_documentation (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  assembly_task_id UUID NOT NULL REFERENCES assembly_tasks(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL, -- 'photo', 'video', 'drawing', 'instruction', 'certificate'
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  description TEXT,
  uploaded_by UUID NOT NULL REFERENCES users(id),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_public BOOLEAN DEFAULT false
);

-- 8. Montaj hata raporları tablosu
CREATE TABLE assembly_issue_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  assembly_task_id UUID NOT NULL REFERENCES assembly_tasks(id) ON DELETE CASCADE,
  reported_by UUID NOT NULL REFERENCES users(id),
  issue_type TEXT NOT NULL, -- 'safety', 'quality', 'delay', 'equipment', 'material'
  severity TEXT NOT NULL, -- 'low', 'medium', 'high', 'critical'
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'open', -- 'open', 'in_progress', 'resolved', 'closed'
  resolution_notes TEXT,
  resolved_by UUID REFERENCES users(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  photos JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Kullanıcı rolleri tablosuna montaj rolleri ekle
ALTER TABLE users ADD COLUMN IF NOT EXISTS assembly_roles TEXT[] DEFAULT '{}';

-- 10. Proje aşamalarına montaj aşamaları ekle
INSERT INTO project_stages (project_id, stage_name, stage_order, description, is_active)
SELECT 
  p.id,
  'saha_montaji',
  4,
  'Sahada montaj işlemleri',
  true
FROM projects p
WHERE NOT EXISTS (
  SELECT 1 FROM project_stages ps 
  WHERE ps.project_id = p.id AND ps.stage_name = 'saha_montaji'
);

INSERT INTO project_stages (project_id, stage_name, stage_order, description, is_active)
SELECT 
  p.id,
  'kalite_kontrol',
  5,
  'Montaj kalite kontrolü ve onay',
  true
FROM projects p
WHERE NOT EXISTS (
  SELECT 1 FROM project_stages ps 
  WHERE ps.project_id = p.id AND ps.stage_name = 'kalite_kontrol'
);

-- 11. İndeksler
CREATE INDEX idx_assembly_locations_project_id ON assembly_locations(project_id);
CREATE INDEX idx_assembly_teams_active ON assembly_teams(is_active);
CREATE INDEX idx_assembly_team_members_team_id ON assembly_team_members(team_id);
CREATE INDEX idx_assembly_team_members_user_id ON assembly_team_members(user_id);
CREATE INDEX idx_assembly_tasks_project_id ON assembly_tasks(project_id);
CREATE INDEX idx_assembly_tasks_assembly_id ON assembly_tasks(assembly_id);
CREATE INDEX idx_assembly_tasks_status ON assembly_tasks(status);
CREATE INDEX idx_assembly_tasks_team_id ON assembly_tasks(team_id);
CREATE INDEX idx_assembly_progress_entries_task_id ON assembly_progress_entries(assembly_task_id);
CREATE INDEX idx_assembly_progress_entries_user_id ON assembly_progress_entries(user_id);
CREATE INDEX idx_assembly_quality_checks_task_id ON assembly_quality_checks(assembly_task_id);
CREATE INDEX idx_assembly_documentation_task_id ON assembly_documentation(assembly_task_id);
CREATE INDEX idx_assembly_issue_reports_task_id ON assembly_issue_reports(assembly_task_id);

-- 12. RLS (Row Level Security) politikaları
ALTER TABLE assembly_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE assembly_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE assembly_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE assembly_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE assembly_progress_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE assembly_quality_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE assembly_documentation ENABLE ROW LEVEL SECURITY;
ALTER TABLE assembly_issue_reports ENABLE ROW LEVEL SECURITY;

-- Montaj lokasyonları politikaları
CREATE POLICY "Users can view assembly locations for their projects" ON assembly_locations
  FOR SELECT USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN project_task_assignments pta ON p.id = pta.project_id
      WHERE pta.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage assembly locations" ON assembly_locations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- Montaj ekipleri politikaları
CREATE POLICY "Users can view assembly teams" ON assembly_teams
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage assembly teams" ON assembly_teams
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- Montaj ekip üyeleri politikaları
CREATE POLICY "Users can view team members" ON assembly_team_members
  FOR SELECT USING (true);

CREATE POLICY "Team leaders can manage their team members" ON assembly_team_members
  FOR ALL USING (
    team_id IN (
      SELECT at.id FROM assembly_teams at
      WHERE at.team_leader_id = auth.uid()
    )
  );

-- Montaj görevleri politikaları
CREATE POLICY "Users can view assembly tasks for their projects" ON assembly_tasks
  FOR SELECT USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN project_task_assignments pta ON p.id = pta.project_id
      WHERE pta.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage assembly tasks" ON assembly_tasks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- Montaj ilerleme kayıtları politikaları
CREATE POLICY "Users can view progress entries for their tasks" ON assembly_progress_entries
  FOR SELECT USING (
    assembly_task_id IN (
      SELECT at.id FROM assembly_tasks at
      JOIN project_task_assignments pta ON at.project_id = pta.project_id
      WHERE pta.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create progress entries for their tasks" ON assembly_progress_entries
  FOR INSERT WITH CHECK (
    assembly_task_id IN (
      SELECT at.id FROM assembly_tasks at
      JOIN project_task_assignments pta ON at.project_id = pta.project_id
      WHERE pta.user_id = auth.uid()
    )
  );

-- Diğer tablolar için benzer politikalar...
CREATE POLICY "Users can view quality checks for their projects" ON assembly_quality_checks
  FOR SELECT USING (
    assembly_task_id IN (
      SELECT at.id FROM assembly_tasks at
      JOIN project_task_assignments pta ON at.project_id = pta.project_id
      WHERE pta.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view documentation for their projects" ON assembly_documentation
  FOR SELECT USING (
    assembly_task_id IN (
      SELECT at.id FROM assembly_tasks at
      JOIN project_task_assignments pta ON at.project_id = pta.project_id
      WHERE pta.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view issue reports for their projects" ON assembly_issue_reports
  FOR SELECT USING (
    assembly_task_id IN (
      SELECT at.id FROM assembly_tasks at
      JOIN project_task_assignments pta ON at.project_id = pta.project_id
      WHERE pta.user_id = auth.uid()
    )
  );

-- 13. Trigger fonksiyonları
CREATE OR REPLACE FUNCTION update_assembly_task_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_assembly_locations_updated_at
  BEFORE UPDATE ON assembly_locations
  FOR EACH ROW EXECUTE FUNCTION update_assembly_task_updated_at();

CREATE TRIGGER update_assembly_teams_updated_at
  BEFORE UPDATE ON assembly_teams
  FOR EACH ROW EXECUTE FUNCTION update_assembly_task_updated_at();

CREATE TRIGGER update_assembly_tasks_updated_at
  BEFORE UPDATE ON assembly_tasks
  FOR EACH ROW EXECUTE FUNCTION update_assembly_task_updated_at();

CREATE TRIGGER update_assembly_issue_reports_updated_at
  BEFORE UPDATE ON assembly_issue_reports
  FOR EACH ROW EXECUTE FUNCTION update_assembly_task_updated_at();
