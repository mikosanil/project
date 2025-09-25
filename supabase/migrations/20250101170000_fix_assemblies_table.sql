-- Assemblies tablosuna eksik kolonları ekle
ALTER TABLE assemblies ADD COLUMN IF NOT EXISTS completed_quantity INTEGER DEFAULT 0;

-- Mevcut assemblies için completed_quantity'yi 0 olarak güncelle
UPDATE assemblies SET completed_quantity = 0 WHERE completed_quantity IS NULL;

-- completed_quantity için constraint ekle
ALTER TABLE assemblies ADD CONSTRAINT check_completed_quantity_non_negative 
CHECK (completed_quantity >= 0);

-- completed_quantity için index ekle (performans için)
CREATE INDEX IF NOT EXISTS idx_assemblies_completed_quantity ON assemblies(completed_quantity);

-- RLS politikalarını güncelle (assemblies tablosu için)
ALTER TABLE assemblies ENABLE ROW LEVEL SECURITY;

-- Mevcut politikaları temizle
DROP POLICY IF EXISTS "Users can view assemblies" ON assemblies;
DROP POLICY IF EXISTS "Users can insert assemblies" ON assemblies;
DROP POLICY IF EXISTS "Users can update assemblies" ON assemblies;
DROP POLICY IF EXISTS "Users can delete assemblies" ON assemblies;

-- Yeni politikalar oluştur
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
