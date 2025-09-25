-- Assemblies tablosuna eksik kolonları ekle
ALTER TABLE assemblies ADD COLUMN IF NOT EXISTS material TEXT;

-- Mevcut assemblies için material'ı null olarak güncelle
UPDATE assemblies SET material = NULL WHERE material IS NULL;

-- material için index ekle (opsiyonel)
CREATE INDEX IF NOT EXISTS idx_assemblies_material ON assemblies(material);
