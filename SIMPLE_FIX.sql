-- Basit düzeltme - sadece gerekli adımlar

-- 1. Constraint'leri kaldır
ALTER TABLE progress_entries DROP CONSTRAINT IF EXISTS progress_entries_work_stage_id_fkey;
ALTER TABLE project_task_assignments DROP CONSTRAINT IF EXISTS project_task_assignments_work_stage_id_fkey;

-- 2. Tüm eski verileri sil
DELETE FROM progress_entries;
DELETE FROM project_task_assignments;

-- 3. Yeni constraint'leri ekle
ALTER TABLE progress_entries ADD CONSTRAINT progress_entries_work_stage_id_fkey 
FOREIGN KEY (work_stage_id) REFERENCES project_stages(id) ON DELETE CASCADE;

ALTER TABLE project_task_assignments ADD CONSTRAINT project_task_assignments_work_stage_id_fkey 
FOREIGN KEY (work_stage_id) REFERENCES project_stages(id) ON DELETE CASCADE;

-- 4. Başarı mesajı
SELECT 'Düzeltme tamamlandı! Artık yeni veri ekleyebilirsiniz.' as result;
