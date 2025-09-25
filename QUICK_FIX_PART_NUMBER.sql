-- part_number kolonu eksikliğini düzelt
ALTER TABLE assemblies ADD COLUMN IF NOT EXISTS part_number TEXT;
ALTER TABLE assemblies ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE assemblies ADD COLUMN IF NOT EXISTS total_quantity INTEGER DEFAULT 1;
ALTER TABLE assemblies ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'adet';
ALTER TABLE assemblies ADD COLUMN IF NOT EXISTS weight_per_unit DECIMAL(10,2);

-- Mevcut veriler için varsayılan değerler
UPDATE assemblies SET part_number = 'P' || id::text WHERE part_number IS NULL;
UPDATE assemblies SET description = 'Poz ' || id::text WHERE description IS NULL;
UPDATE assemblies SET total_quantity = 1 WHERE total_quantity IS NULL;
UPDATE assemblies SET unit = 'adet' WHERE unit IS NULL;
