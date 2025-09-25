-- Hızlı çözüm: Sadece eksik kolonu ekle
ALTER TABLE assemblies ADD COLUMN IF NOT EXISTS material TEXT;
