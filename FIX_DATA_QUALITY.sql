-- Veri Kalitesi Düzeltme Scripti
-- Eksik verileri tamamla ve veri bütünlüğünü sağla

-- 1. Kullanıcı verilerini düzelt
-- Eksik isimleri email'den oluştur
UPDATE users 
SET full_name = INITCAP(SPLIT_PART(email, '@', 1))
WHERE full_name IS NULL OR full_name = '' OR LENGTH(TRIM(full_name)) < 2;

-- Boş department'ları varsayılan yap
UPDATE users 
SET department = 'Genel'
WHERE department IS NULL OR department = '';

-- Email'leri küçük harfe çevir ve trim yap
UPDATE users 
SET email = LOWER(TRIM(email))
WHERE email IS NOT NULL;

-- 2. Assembly verilerini düzelt
-- Eksik poz kodlarını oluştur
UPDATE assemblies 
SET poz_code = 'P' || LPAD(EXTRACT(EPOCH FROM created_at)::text, 10, '0')
WHERE poz_code IS NULL OR poz_code = '' OR LENGTH(TRIM(poz_code)) = 0;

-- Eksik ağırlık değerlerini varsayılan yap
UPDATE assemblies 
SET weight_per_unit = 1.0
WHERE weight_per_unit IS NULL OR weight_per_unit = 0;

-- 3. Progress entries verilerini düzelt
-- Eksik user_id'leri düzelt (eğer worker_name varsa)
UPDATE progress_entries 
SET user_id = (
  SELECT u.id 
  FROM users u 
  WHERE u.full_name = progress_entries.worker_name 
  LIMIT 1
)
WHERE user_id IS NULL AND worker_name IS NOT NULL;

-- Eksik time_spent değerlerini varsayılan yap
UPDATE progress_entries 
SET time_spent = 1
WHERE time_spent IS NULL OR time_spent = 0;

-- 4. Veri bütünlüğü için constraint'ler ekle
-- Kullanıcı isim kontrolü
ALTER TABLE users 
ADD CONSTRAINT chk_users_full_name 
CHECK (full_name IS NOT NULL AND LENGTH(TRIM(full_name)) >= 2);

-- Email format kontrolü
ALTER TABLE users 
ADD CONSTRAINT chk_users_email 
CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Poz kodu kontrolü
ALTER TABLE assemblies 
ADD CONSTRAINT chk_assemblies_poz_code 
CHECK (poz_code IS NOT NULL AND LENGTH(TRIM(poz_code)) > 0);

-- Ağırlık kontrolü
ALTER TABLE assemblies 
ADD CONSTRAINT chk_assemblies_weight 
CHECK (weight_per_unit IS NULL OR weight_per_unit > 0);

-- 5. Düzeltme sonrası kontrol
SELECT 
  'DÜZELTME SONRASI KULLANICI VERİ KALİTESİ' as kategori,
  COUNT(*) as toplam_kullanici,
  COUNT(full_name) as isim_var,
  COUNT(*) - COUNT(full_name) as isim_eksik,
  ROUND((COUNT(full_name)::float / COUNT(*)) * 100, 2) as isim_tamamlama_orani
FROM users;

SELECT 
  'DÜZELTME SONRASI ASSEMBLY VERİ KALİTESİ' as kategori,
  COUNT(*) as toplam_assembly,
  COUNT(poz_code) as poz_kodu_var,
  COUNT(*) - COUNT(poz_code) as poz_kodu_eksik,
  COUNT(weight_per_unit) FILTER (WHERE weight_per_unit > 0) as gecerli_agirlik,
  ROUND((COUNT(poz_code)::float / COUNT(*)) * 100, 2) as poz_kodu_tamamlama_orani
FROM assemblies;
