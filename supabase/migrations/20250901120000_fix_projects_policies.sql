/*
  # Projects Tablosu RLS Policy Düzeltmeleri
  
  Bu migration, projects tablosu için eksik olan INSERT, UPDATE ve DELETE 
  policy'lerini ekler.
*/

-- Mevcut policy'leri temizle (varsa)
DROP POLICY IF EXISTS "Users and admins can insert projects" ON projects;
DROP POLICY IF EXISTS "Users and admins can update projects" ON projects;
DROP POLICY IF EXISTS "Users and admins can delete projects" ON projects;
DROP POLICY IF EXISTS "Users can insert projects" ON projects;
DROP POLICY IF EXISTS "Users can update their own projects" ON projects;
DROP POLICY IF EXISTS "Users can delete their own projects" ON projects;

-- Proje ekleme policy'si
CREATE POLICY "Users and admins can insert projects"
  ON projects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Proje güncelleme policy'si
CREATE POLICY "Users and admins can update projects"
  ON projects
  FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Proje silme policy'si
CREATE POLICY "Users and admins can delete projects"
  ON projects
  FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Projects tablosunda RLS'nin aktif olduğundan emin ol
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
