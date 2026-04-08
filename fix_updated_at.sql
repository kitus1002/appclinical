-- AppClínica: Parche de Sincronización de Esquema (updated_at)
-- Este script soluciona el error de "updated_at column not found".

-- 1. Añadir updated_at a Perfiles
ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 2. Añadir updated_at a Consultorios (Sedes)
ALTER TABLE consultorios ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 3. Opcional: Trigger para actualización automática (Buena práctica)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar trigger a perfiles
DROP TRIGGER IF EXISTS update_perfiles_updated_at ON perfiles;
CREATE TRIGGER update_perfiles_updated_at
BEFORE UPDATE ON perfiles
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Aplicar trigger a consultorios
DROP TRIGGER IF EXISTS update_consultorios_updated_at ON consultorios;
CREATE TRIGGER update_consultorios_updated_at
BEFORE UPDATE ON consultorios
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
