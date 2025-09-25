-- progress_entries tablosundaki foreign key constraint'i güncelle

-- 1. Önce mevcut durumu kontrol et
SELECT 
  'Mevcut progress_entries kayıtları:' as info,
  COUNT(*) as total_count
FROM progress_entries;

-- 2. Geçersiz work_stage_id'leri kontrol et
SELECT 
  'Geçersiz work_stage_id\'ler:' as info,
  COUNT(*) as invalid_count
FROM progress_entries pe
LEFT JOIN project_stages ps ON pe.work_stage_id = ps.id
WHERE ps.id IS NULL;

-- 3. Geçersiz kayıtları göster
SELECT 
  pe.id,
  pe.assembly_id,
  pe.work_stage_id,
  pe.quantity_completed,
  'Bu work_stage_id project_stages tablosunda yok' as problem
FROM progress_entries pe
LEFT JOIN project_stages ps ON pe.work_stage_id = ps.id
WHERE ps.id IS NULL;

-- 4. Tüm progress_entries kayıtlarını sil (temiz başlangıç)
DELETE FROM progress_entries;

-- 5. Foreign key constraint'i güncelle
ALTER TABLE progress_entries DROP CONSTRAINT IF EXISTS progress_entries_work_stage_id_fkey;
ALTER TABLE progress_entries ADD CONSTRAINT progress_entries_work_stage_id_fkey 
FOREIGN KEY (work_stage_id) REFERENCES project_stages(id) ON DELETE CASCADE;

-- 6. Temizlik sonrası kontrol
SELECT 
  'Temizlik sonrası progress_entries kayıt sayısı:' as info,
  COUNT(*) as remaining_count
FROM progress_entries;
