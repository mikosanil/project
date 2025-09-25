-- project_task_assignments tablosundaki geçersiz verileri temizle

-- 1. Önce mevcut durumu kontrol et
SELECT 
  'Mevcut project_task_assignments kayıtları:' as info,
  COUNT(*) as total_count
FROM project_task_assignments;

-- 2. Geçersiz work_stage_id'leri kontrol et
SELECT 
  'Geçersiz work_stage_id\'ler:' as info,
  COUNT(*) as invalid_count
FROM project_task_assignments pta
LEFT JOIN project_stages ps ON pta.work_stage_id = ps.id
WHERE ps.id IS NULL;

-- 3. Geçersiz kayıtları göster
SELECT 
  pta.id,
  pta.user_id,
  pta.work_stage_id,
  pta.project_id,
  'Bu work_stage_id project_stages tablosunda yok' as problem
FROM project_task_assignments pta
LEFT JOIN project_stages ps ON pta.work_stage_id = ps.id
WHERE ps.id IS NULL;

-- 4. Tüm project_task_assignments kayıtlarını sil (temiz başlangıç)
DELETE FROM project_task_assignments;

-- 5. Foreign key constraint'i güncelle
ALTER TABLE project_task_assignments DROP CONSTRAINT IF EXISTS project_task_assignments_work_stage_id_fkey;
ALTER TABLE project_task_assignments ADD CONSTRAINT project_task_assignments_work_stage_id_fkey 
FOREIGN KEY (work_stage_id) REFERENCES project_stages(id) ON DELETE CASCADE;

-- 6. Temizlik sonrası kontrol
SELECT 
  'Temizlik sonrası project_task_assignments kayıt sayısı:' as info,
  COUNT(*) as remaining_count
FROM project_task_assignments;
