-- project_task_assignments tablosundaki foreign key constraint'i güncelle

-- Önce mevcut constraint'i kaldır
ALTER TABLE project_task_assignments DROP CONSTRAINT IF EXISTS project_task_assignments_work_stage_id_fkey;

-- Yeni constraint'i ekle (project_stages tablosuna referans)
ALTER TABLE project_task_assignments ADD CONSTRAINT project_task_assignments_work_stage_id_fkey 
FOREIGN KEY (work_stage_id) REFERENCES project_stages(id) ON DELETE CASCADE;

-- Mevcut verileri temizle (eğer work_stages'e referans eden veriler varsa)
-- Bu veriler artık geçersiz olacak çünkü project_stages'e referans etmiyorlar
DELETE FROM project_task_assignments WHERE work_stage_id NOT IN (
  SELECT id FROM project_stages
);
