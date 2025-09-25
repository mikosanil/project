-- Supabase SQL Editor için tam kod
-- Bu kodu kopyalayıp Supabase SQL Editor'e yapıştırın

-- 1. Proje aşamaları tablosu oluştur
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

-- 2. Assemblies tablosuna eksik kolonları ekle
ALTER TABLE assemblies ADD COLUMN IF NOT EXISTS stage_id UUID REFERENCES project_stages(id) ON DELETE CASCADE;
ALTER TABLE assemblies ADD COLUMN IF NOT EXISTS completed_quantity INTEGER DEFAULT 0;
ALTER TABLE assemblies ADD COLUMN IF NOT EXISTS material TEXT;
ALTER TABLE assemblies ADD COLUMN IF NOT EXISTS part_number TEXT;
ALTER TABLE assemblies ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE assemblies ADD COLUMN IF NOT EXISTS total_quantity INTEGER DEFAULT 1;
ALTER TABLE assemblies ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'adet';
ALTER TABLE assemblies ADD COLUMN IF NOT EXISTS weight_per_unit DECIMAL(10,2);
ALTER TABLE assemblies ADD COLUMN IF NOT EXISTS poz_code TEXT;

-- 3. Mevcut assemblies için eksik kolonları güncelle
UPDATE assemblies SET completed_quantity = 0 WHERE completed_quantity IS NULL;
UPDATE assemblies SET part_number = 'P' || id::text WHERE part_number IS NULL;
UPDATE assemblies SET description = 'Poz ' || id::text WHERE description IS NULL;
UPDATE assemblies SET total_quantity = 1 WHERE total_quantity IS NULL;
UPDATE assemblies SET unit = 'adet' WHERE unit IS NULL;
UPDATE assemblies SET material = NULL WHERE material IS NULL;
UPDATE assemblies SET poz_code = 'P' || id::text WHERE poz_code IS NULL;

-- 4. Index'ler oluştur
CREATE INDEX IF NOT EXISTS idx_project_stages_project_id ON project_stages(project_id);
CREATE INDEX IF NOT EXISTS idx_project_stages_stage_name ON project_stages(stage_name);
CREATE INDEX IF NOT EXISTS idx_assemblies_stage_id ON assemblies(stage_id);
CREATE INDEX IF NOT EXISTS idx_assemblies_completed_quantity ON assemblies(completed_quantity);

-- 5. RLS politikaları
ALTER TABLE project_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE assemblies ENABLE ROW LEVEL SECURITY;

-- 6. Proje aşamaları için politikalar
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

-- 7. Assemblies için politikalar
CREATE POLICY "Users can view assemblies" ON assemblies
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects p 
      WHERE p.id = assemblies.project_id 
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

CREATE POLICY "Users can insert assemblies" ON assemblies
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p 
      WHERE p.id = assemblies.project_id 
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

CREATE POLICY "Users can update assemblies" ON assemblies
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM projects p 
      WHERE p.id = assemblies.project_id 
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

CREATE POLICY "Users can delete assemblies" ON assemblies
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM projects p 
      WHERE p.id = assemblies.project_id 
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

-- 8. Mevcut projeler için varsayılan aşamalar oluştur
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

-- 9. Mevcut assemblies'leri kesim aşamasına ata
UPDATE assemblies 
SET stage_id = (
  SELECT ps.id 
  FROM project_stages ps 
  WHERE ps.project_id = assemblies.project_id 
  AND ps.stage_name = 'kesim'
  LIMIT 1
)
WHERE stage_id IS NULL;

-- 10. Trigger fonksiyonu - updated_at otomatik güncelleme
CREATE OR REPLACE FUNCTION update_project_stages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 11. Trigger oluştur
CREATE TRIGGER update_project_stages_updated_at_trigger
  BEFORE UPDATE ON project_stages
  FOR EACH ROW
  EXECUTE FUNCTION update_project_stages_updated_at();

-- 12. completed_quantity için constraint ekle
ALTER TABLE assemblies ADD CONSTRAINT check_completed_quantity_non_negative 
CHECK (completed_quantity >= 0);

-- 13. project_task_assignments foreign key constraint'ini güncelle
ALTER TABLE project_task_assignments DROP CONSTRAINT IF EXISTS project_task_assignments_work_stage_id_fkey;
ALTER TABLE project_task_assignments ADD CONSTRAINT project_task_assignments_work_stage_id_fkey 
FOREIGN KEY (work_stage_id) REFERENCES project_stages(id) ON DELETE CASCADE;

-- 14. Tüm project_task_assignments kayıtlarını sil (temiz başlangıç)
-- Çünkü eski work_stages ID'leri project_stages'de mevcut değil
DELETE FROM project_task_assignments;

-- 15. progress_entries foreign key constraint'ini güncelle
ALTER TABLE progress_entries DROP CONSTRAINT IF EXISTS progress_entries_work_stage_id_fkey;
ALTER TABLE progress_entries ADD CONSTRAINT progress_entries_work_stage_id_fkey 
FOREIGN KEY (work_stage_id) REFERENCES project_stages(id) ON DELETE CASCADE;

-- 16. Tüm progress_entries kayıtlarını sil (temiz başlangıç)
-- Çünkü eski work_stages ID'leri project_stages'de mevcut değil
DELETE FROM progress_entries;
