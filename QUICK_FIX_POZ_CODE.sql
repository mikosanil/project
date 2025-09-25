-- poz_code kolonu eksikliğini düzelt
ALTER TABLE assemblies ADD COLUMN IF NOT EXISTS poz_code TEXT;

-- Mevcut veriler için varsayılan poz_code değeri
UPDATE assemblies SET poz_code = 'P' || id::text WHERE poz_code IS NULL;

-- poz_code kolonu için NOT NULL constraint'i kaldır (geçici olarak)
ALTER TABLE assemblies ALTER COLUMN poz_code DROP NOT NULL;

-- poz_code kolonu için varsayılan değer ekle
ALTER TABLE assemblies ALTER COLUMN poz_code SET DEFAULT 'P' || gen_random_uuid()::text;
