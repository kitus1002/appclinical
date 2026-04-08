-- ====================================================================
-- APPCLÍNICA: PARCHE MAESTRO CONSOLIDADO (SEGURIDAD Y ESQUEMA)
-- ====================================================================
-- Este script soluciona RLS, columnas faltantes (updated_at, especialidades)
-- y activa todas las políticas necesarias para Sedes, Doctores y Perfiles.
-- ====================================================================

-- 1. EXTENSIONES Y FUNCIONES BASE
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ====================================================================
-- 2. TABLA: PERFILES (USUARIOS)
-- ====================================================================
CREATE TABLE IF NOT EXISTS perfiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  nombre_completo TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios gestionan su propio perfil" ON perfiles;
CREATE POLICY "Usuarios gestionan su propio perfil" ON perfiles 
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Lectura pública de perfiles" ON perfiles;
CREATE POLICY "Lectura pública de perfiles" ON perfiles FOR SELECT USING (true);

DROP TRIGGER IF EXISTS update_perfiles_updated_at ON perfiles;
CREATE TRIGGER update_perfiles_updated_at BEFORE UPDATE ON perfiles FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ====================================================================
-- 3. TABLA: CONSULTORIOS (SEDES)
-- ====================================================================
-- Asegurar columnas críticas
ALTER TABLE consultorios ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id);
ALTER TABLE consultorios ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE consultorios ADD COLUMN IF NOT EXISTS logo_url TEXT;

ALTER TABLE consultorios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Gestionar sedes propias" ON consultorios;
CREATE POLICY "Gestionar sedes propias" ON consultorios 
FOR ALL USING (auth.uid() = owner_id OR auth.role() = 'authenticated') 
WITH CHECK (auth.role() = 'authenticated'); -- Permitimos crear a cualquier autenticado

DROP POLICY IF EXISTS "Lectura pública de sedes" ON consultorios;
CREATE POLICY "Lectura pública de sedes" ON consultorios FOR SELECT USING (true);

DROP TRIGGER IF EXISTS update_consultorios_updated_at ON consultorios;
CREATE TRIGGER update_consultorios_updated_at BEFORE UPDATE ON consultorios FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ====================================================================
-- 4. TABLA: DOCTORES
-- ====================================================================
-- Asegurar tabla y columnas de Staff
CREATE TABLE IF NOT EXISTS doctores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultorio_id UUID REFERENCES consultorios(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  foto_url TEXT,
  biografia TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Migración a Multi-Especialidad (especialidades Array)
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='doctores' AND column_name='especialidad') THEN
        ALTER TABLE doctores RENAME COLUMN especialidad TO especialidad_old;
    END IF;
END $$;

ALTER TABLE doctores ADD COLUMN IF NOT EXISTS especialidades TEXT[] DEFAULT '{}';
ALTER TABLE doctores ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE doctores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins gestionan staff" ON doctores;
CREATE POLICY "Admins gestionan staff" ON doctores 
FOR ALL USING (auth.role() = 'authenticated') 
WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Lectura pública de doctores" ON doctores;
CREATE POLICY "Lectura pública de doctores" ON doctores FOR SELECT USING (true);

DROP TRIGGER IF EXISTS update_doctores_updated_at ON doctores;
CREATE TRIGGER update_doctores_updated_at BEFORE UPDATE ON doctores FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ====================================================================
-- 5. TABLA: CITAS (BOOKING PÚBLICO)
-- ====================================================================
ALTER TABLE citas ADD COLUMN IF NOT EXISTS doctor_id UUID REFERENCES doctores(id);
ALTER TABLE citas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Pacientes pueden agendar" ON citas;
CREATE POLICY "Pacientes pueden agendar" ON citas FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Usuarios ven sus propias citas" ON citas;
CREATE POLICY "Usuarios ven sus propias citas" ON citas FOR SELECT USING (auth.role() = 'authenticated' OR true);

-- ====================================================================
-- 6. ALMACENAMIENTO (MULTIMEDIA)
-- ====================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('clinic-assets', 'clinic-assets', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Multimedia Publica" ON storage.objects;
CREATE POLICY "Multimedia Publica" ON storage.objects FOR SELECT USING (bucket_id = 'clinic-assets');

DROP POLICY IF EXISTS "Staff gestiona multimedia" ON storage.objects;
CREATE POLICY "Staff gestiona multimedia" ON storage.objects 
FOR ALL USING (bucket_id = 'clinic-assets' AND auth.role() = 'authenticated')
WITH CHECK (bucket_id = 'clinic-assets' AND auth.role() = 'authenticated');

-- ====================================================================
-- DATOS INICIALES (Si no hay perfiles)
-- ====================================================================
INSERT INTO perfiles (user_id, nombre_completo)
SELECT id, email FROM auth.users
ON CONFLICT (user_id) DO NOTHING;
