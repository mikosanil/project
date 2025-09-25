-- Adım adım düzeltme - önce mevcut durumu kontrol et

-- ADIM 1: Mevcut durumu kontrol et
SELECT 'ADIM 1: Mevcut durum kontrolü' as step;

-- progress_entries tablosundaki kayıt sayısı
SELECT 
  'progress_entries kayıt sayısı:' as info,
  COUNT(*) as count
FROM progress_entries;

-- project_task_assignments tablosundaki kayıt sayısı
SELECT 
  'project_task_assignments kayıt sayısı:' as info,
  COUNT(*) as count
FROM project_task_assignments;

-- project_stages tablosundaki kayıt sayısı
SELECT 
  'project_stages kayıt sayısı:' as info,
  COUNT(*) as count
FROM project_stages;

-- ADIM 2: Geçersiz foreign key'leri kontrol et
SELECT 'ADIM 2: Geçersiz foreign key kontrolü' as step;

-- progress_entries'deki geçersiz work_stage_id'ler
SELECT 
  'progress_entries geçersiz work_stage_id sayısı:' as info,
  COUNT(*) as count
FROM progress_entries pe
LEFT JOIN project_stages ps ON pe.work_stage_id = ps.id
WHERE ps.id IS NULL;

-- project_task_assignments'deki geçersiz work_stage_id'ler
SELECT 
  'project_task_assignments geçersiz work_stage_id sayısı:' as info,
  COUNT(*) as count
FROM project_task_assignments pta
LEFT JOIN project_stages ps ON pta.work_stage_id = ps.id
WHERE ps.id IS NULL;

-- ADIM 3: Constraint'leri kaldır
SELECT 'ADIM 3: Constraint\'leri kaldır' as step;

-- progress_entries constraint'ini kaldır
ALTER TABLE progress_entries DROP CONSTRAINT IF EXISTS progress_entries_work_stage_id_fkey;

-- project_task_assignments constraint'ini kaldır
ALTER TABLE project_task_assignments DROP CONSTRAINT IF EXISTS project_task_assignments_work_stage_id_fkey;

-- ADIM 4: Tüm eski verileri sil
SELECT 'ADIM 4: Eski verileri sil' as step;

-- progress_entries tablosunu temizle
DELETE FROM progress_entries;

-- project_task_assignments tablosunu temizle
DELETE FROM project_task_assignments;

-- ADIM 5: Yeni constraint'leri ekle
SELECT 'ADIM 5: Yeni constraint\'leri ekle' as step;

-- progress_entries için yeni constraint
ALTER TABLE progress_entries ADD CONSTRAINT progress_entries_work_stage_id_fkey 
FOREIGN KEY (work_stage_id) REFERENCES project_stages(id) ON DELETE CASCADE;

-- project_task_assignments için yeni constraint
ALTER TABLE project_task_assignments ADD CONSTRAINT project_task_assignments_work_stage_id_fkey 
FOREIGN KEY (work_stage_id) REFERENCES project_stages(id) ON DELETE CASCADE;

-- ADIM 6: Son kontrol
SELECT 'ADIM 6: Son kontrol' as step;

-- Temizlik sonrası durum
SELECT 
  'Temizlik sonrası progress_entries kayıt sayısı:' as info,
  COUNT(*) as count
FROM progress_entries;

SELECT 
  'Temizlik sonrası project_task_assignments kayıt sayısı:' as info,
  COUNT(*) as count
FROM project_task_assignments;

SELECT 'Tüm adımlar tamamlandı! Artık yeni veri ekleyebilirsiniz.' as result;
