-- Proje aşamaları tablosu oluştur
CREATE TABLE IF NOT EXISTS project_stages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  stage_name VARCHAR(50) NOT NULL CHECK (stage_name IN ('kesim', 'imalat', 'kaynak', 'boya')),
  stage_order INTEGER NOT NULL DEFAULT 1,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'on_hold')),
  start_date TIMESTAMP WITH TIME ZONE,
  target_completion_date TIMESTAMP WITH TIME ZONE,
  actual_completion_date TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Assemblies tablosuna stage_id ekle
ALTER TABLE assemblies ADD COLUMN IF NOT EXISTS stage_id UUID REFERENCES project_stages(id) ON DELETE CASCADE;

-- Index'ler oluştur
CREATE INDEX IF NOT EXISTS idx_project_stages_project_id ON project_stages(project_id);
CREATE INDEX IF NOT EXISTS idx_project_stages_stage_name ON project_stages(stage_name);
CREATE INDEX IF NOT EXISTS idx_assemblies_stage_id ON assemblies(stage_id);

-- RLS politikaları
ALTER TABLE project_stages ENABLE ROW LEVEL SECURITY;

-- Proje aşamaları için politikalar
CREATE POLICY "Users can view project stages" ON project_stages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects p 
      WHERE p.id = project_stages.project_id 
      AND (
        p.created_by = auth.uid() 
        OR EXISTS (
          SELECT 1 FROM project_assignments pa 
          WHERE pa.project_id = p.id 
          AND pa.user_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM users u 
          WHERE u.id = auth.uid() 
          AND u.role IN ('admin', 'manager')
        )
      )
    )
  );

CREATE POLICY "Users can insert project stages" ON project_stages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p 
      WHERE p.id = project_stages.project_id 
      AND (
        p.created_by = auth.uid() 
        OR EXISTS (
          SELECT 1 FROM users u 
          WHERE u.id = auth.uid() 
          AND u.role IN ('admin', 'manager')
        )
      )
    )
  );

CREATE POLICY "Users can update project stages" ON project_stages
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM projects p 
      WHERE p.id = project_stages.project_id 
      AND (
        p.created_by = auth.uid() 
        OR EXISTS (
          SELECT 1 FROM project_assignments pa 
          WHERE pa.project_id = p.id 
          AND pa.user_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM users u 
          WHERE u.id = auth.uid() 
          AND u.role IN ('admin', 'manager')
        )
      )
    )
  );

CREATE POLICY "Users can delete project stages" ON project_stages
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM projects p 
      WHERE p.id = project_stages.project_id 
      AND (
        p.created_by = auth.uid() 
        OR EXISTS (
          SELECT 1 FROM users u 
          WHERE u.id = auth.uid() 
          AND u.role IN ('admin', 'manager')
        )
      )
    )
  );

-- Mevcut projeler için varsayılan aşamalar oluştur
INSERT INTO project_stages (project_id, stage_name, stage_order, status)
SELECT 
  p.id,
  stage_name,
  stage_order,
  CASE 
    WHEN p.status = 'completed' THEN 'completed'
    WHEN p.status = 'in_progress' THEN 'in_progress'
    ELSE 'pending'
  END
FROM projects p
CROSS JOIN (
  VALUES 
    ('kesim', 1),
    ('imalat', 2),
    ('kaynak', 3),
    ('boya', 4)
) AS stages(stage_name, stage_order)
WHERE NOT EXISTS (
  SELECT 1 FROM project_stages ps 
  WHERE ps.project_id = p.id
);

-- Mevcut assemblies'leri kesim aşamasına ata
UPDATE assemblies 
SET stage_id = (
  SELECT ps.id 
  FROM project_stages ps 
  WHERE ps.project_id = assemblies.project_id 
  AND ps.stage_name = 'kesim'
  LIMIT 1
)
WHERE stage_id IS NULL;

-- Trigger fonksiyonu - updated_at otomatik güncelleme
CREATE OR REPLACE FUNCTION update_project_stages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger oluştur
CREATE TRIGGER update_project_stages_updated_at_trigger
  BEFORE UPDATE ON project_stages
  FOR EACH ROW
  EXECUTE FUNCTION update_project_stages_updated_at();
