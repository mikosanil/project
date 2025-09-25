-- Veri Kalitesi Analizi
-- Mevcut durumu tespit etmek için SQL sorguları

-- 1. Kullanıcı veri kalitesi
SELECT 
  'KULLANICI VERİ KALİTESİ' as kategori,
  COUNT(*) as toplam_kullanici,
  COUNT(full_name) as isim_var,
  COUNT(*) - COUNT(full_name) as isim_eksik,
  COUNT(email) as email_var,
  COUNT(*) - COUNT(email) as email_eksik,
  COUNT(role) as rol_var,
  COUNT(*) - COUNT(role) as rol_eksik,
  ROUND((COUNT(full_name)::float / COUNT(*)) * 100, 2) as isim_tamamlama_orani,
  ROUND((COUNT(email)::float / COUNT(*)) * 100, 2) as email_tamamlama_orani
FROM users;

-- 2. Proje veri kalitesi
SELECT 
  'PROJE VERİ KALİTESİ' as kategori,
  COUNT(*) as toplam_proje,
  COUNT(description) as aciklama_var,
  COUNT(*) - COUNT(description) as aciklama_eksik,
  COUNT(target_date) as hedef_tarih_var,
  COUNT(*) - COUNT(target_date) as hedef_tarih_eksik,
  ROUND((COUNT(description)::float / COUNT(*)) * 100, 2) as aciklama_tamamlama_orani
FROM projects;

-- 3. Assembly veri kalitesi
SELECT 
  'ASSEMBLY VERİ KALİTESİ' as kategori,
  COUNT(*) as toplam_assembly,
  COUNT(poz_code) as poz_kodu_var,
  COUNT(*) - COUNT(poz_code) as poz_kodu_eksik,
  COUNT(weight_per_unit) as agirlik_var,
  COUNT(*) - COUNT(weight_per_unit) as agirlik_eksik,
  COUNT(weight_per_unit) FILTER (WHERE weight_per_unit > 0) as gecerli_agirlik,
  ROUND((COUNT(poz_code)::float / COUNT(*)) * 100, 2) as poz_kodu_tamamlama_orani
FROM assemblies;

-- 4. Progress entries veri kalitesi
SELECT 
  'PROGRESS ENTRIES VERİ KALİTESİ' as kategori,
  COUNT(*) as toplam_ilerleme,
  COUNT(user_id) as kullanici_id_var,
  COUNT(*) - COUNT(user_id) as kullanici_id_eksik,
  COUNT(time_spent) as sure_var,
  COUNT(*) - COUNT(time_spent) as sure_eksik,
  ROUND((COUNT(user_id)::float / COUNT(*)) * 100, 2) as kullanici_id_tamamlama_orani
FROM progress_entries;

-- 5. Eksik veri detayları
SELECT 
  'EKSİK KULLANICI İSİMLERİ' as kategori,
  id,
  email,
  full_name,
  role,
  department
FROM users 
WHERE full_name IS NULL OR full_name = '' OR LENGTH(TRIM(full_name)) < 2
ORDER BY created_at DESC;

-- 6. Geçersiz email formatları
SELECT 
  'GEÇERSİZ EMAIL FORMATLARI' as kategori,
  id,
  email,
  full_name
FROM users 
WHERE email IS NULL 
   OR email = '' 
   OR email !~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
ORDER BY created_at DESC;

-- 7. Eksik poz kodları
SELECT 
  'EKSİK POZ KODLARI' as kategori,
  id,
  poz_code,
  description,
  total_quantity
FROM assemblies 
WHERE poz_code IS NULL OR poz_code = '' OR LENGTH(TRIM(poz_code)) = 0
ORDER BY created_at DESC;

-- 8. Eksik ağırlık değerleri
SELECT 
  'EKSİK AĞIRLIK DEĞERLERİ' as kategori,
  id,
  poz_code,
  weight_per_unit,
  total_quantity
FROM assemblies 
WHERE weight_per_unit IS NULL OR weight_per_unit = 0
ORDER BY created_at DESC;
