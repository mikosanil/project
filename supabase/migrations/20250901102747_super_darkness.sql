/*
  # Görev Atama Sistemi Güvenlik Güncellemeleri

  Bu migration, kullanıcıların sadece atandıkları görevlerden ilerleme kaydedebilmesini sağlar.

  1. Progress Entries tablosu için güvenlik politikaları
  2. Task assignment kontrolleri
  3. Kullanıcı yetki kontrolleri
*/

-- Progress entries için güvenlik politikalarını güncelle
DROP POLICY IF EXISTS "Task assigned users can create progress entries" ON progress_entries;
DROP POLICY IF EXISTS "Users can view progress entries for accessible projects" ON progress_entries;

-- Kullanıcıların sadece atandıkları görevlerden ilerleme kaydedebilmesi için politika
CREATE POLICY "Task assigned users can create progress entries"
  ON progress_entries
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Kullanıcı bu projede bu göreve atanmış olmalı
    EXISTS (
      SELECT 1 FROM project_task_assignments pta
      JOIN assemblies a ON a.project_id = pta.project_id
      WHERE a.id = assembly_id 
        AND pta.user_id = auth.uid()
        AND pta.work_stage_id = progress_entries.work_stage_id
    )
    OR
    -- Proje sahipleri herhangi bir görevden ilerleme kaydedebilir
    EXISTS (
      SELECT 1 FROM assemblies a
      JOIN projects p ON a.project_id = p.id
      WHERE a.id = assembly_id AND p.created_by = auth.uid()
    )
    OR
    -- Adminler herhangi bir görevden ilerleme kaydedebilir
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Kullanıcıların erişebileceği projelerdeki ilerleme kayıtlarını görebilmesi için politika
CREATE POLICY "Users can view progress entries for accessible projects"
  ON progress_entries
  FOR SELECT
  TO authenticated
  USING (
    -- Kullanıcı bu projeye atanmış olmalı
    assembly_id IN (
      SELECT a.id FROM assemblies a
      JOIN project_task_assignments pta ON a.project_id = pta.project_id
      WHERE pta.user_id = auth.uid()
    )
    OR
    -- Proje sahipleri tüm ilerleme kayıtlarını görebilir
    assembly_id IN (
      SELECT a.id FROM assemblies a
      JOIN projects p ON a.project_id = p.id
      WHERE p.created_by = auth.uid()
    )
    OR
    -- Adminler tüm ilerleme kayıtlarını görebilir
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Progress entries güncelleme politikası
CREATE POLICY "Users can update their own progress entries"
  ON progress_entries
  FOR UPDATE
  TO authenticated
  USING (
    -- Kullanıcı kendi kaydını güncelleyebilir
    user_id = auth.uid()
    OR
    -- Proje sahipleri güncelleyebilir
    EXISTS (
      SELECT 1 FROM assemblies a
      JOIN projects p ON a.project_id = p.id
      WHERE a.id = assembly_id AND p.created_by = auth.uid()
    )
    OR
    -- Adminler güncelleyebilir
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    -- Güncelleme sırasında da aynı kontroller geçerli
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM assemblies a
      JOIN projects p ON a.project_id = p.id
      WHERE a.id = assembly_id AND p.created_by = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Progress entries silme politikası
CREATE POLICY "Users can delete their own progress entries"
  ON progress_entries
  FOR DELETE
  TO authenticated
  USING (
    -- Kullanıcı kendi kaydını silebilir
    user_id = auth.uid()
    OR
    -- Proje sahipleri silebilir
    EXISTS (
      SELECT 1 FROM assemblies a
      JOIN projects p ON a.project_id = p.id
      WHERE a.id = assembly_id AND p.created_by = auth.uid()
    )
    OR
    -- Adminler silebilir
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Task assignments için güvenlik politikalarını güncelle
DROP POLICY IF EXISTS "Project owners can manage task assignments" ON project_task_assignments;
DROP POLICY IF EXISTS "Admins can manage all task assignments" ON project_task_assignments;
DROP POLICY IF EXISTS "Users can view their task assignments" ON project_task_assignments;

-- Proje sahipleri görev atamalarını yönetebilir
CREATE POLICY "Project owners can manage task assignments"
  ON project_task_assignments
  FOR ALL
  TO authenticated
  USING (project_id IN (
    SELECT id FROM projects WHERE created_by = auth.uid()
  ));

-- Adminler tüm görev atamalarını yönetebilir
CREATE POLICY "Admins can manage all task assignments"
  ON project_task_assignments
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ));

-- Kullanıcılar kendi görev atamalarını görebilir
CREATE POLICY "Users can view their task assignments"
  ON project_task_assignments
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Kullanıcılar kendi görev atamalarını güncelleyebilir (sadece belirli alanlar)
CREATE POLICY "Users can update their own task assignments"
  ON project_task_assignments
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Kullanıcılar kendi görev atamalarını silebilir
CREATE POLICY "Users can delete their own task assignments"
  ON project_task_assignments
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Proje eklemek için policy (kendi projesi veya admin)
CREATE POLICY "Users and admins can insert projects"
  ON projects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Proje silmek için policy (kendi projesi veya admin)
CREATE POLICY "Users and admins can delete projects"
  ON projects
  FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Proje güncellemek için policy (kendi projesi veya admin)
CREATE POLICY "Users and admins can update projects"
  ON projects
  FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );