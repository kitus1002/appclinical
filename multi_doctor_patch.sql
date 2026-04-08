-- AppClínica: Parche Maestro Multi-Doctor y Corrección Final de 'cedula_profesional'
-- Este script soluciona los errores de esquema y habilita el acceso total para pacientes.

-- 1. Arreglar Tabla Consultorios (Tenants)
ALTER TABLE consultorios ADD COLUMN IF NOT EXISTS cedula_profesional TEXT;
ALTER TABLE consultorios ADD COLUMN IF NOT EXISTS especialidad TEXT;
ALTER TABLE consultorios ADD COLUMN IF NOT EXISTS universidad TEXT;
ALTER TABLE consultorios ADD COLUMN IF NOT EXISTS direccion_fisica TEXT;
ALTER TABLE consultorios ADD COLUMN IF NOT EXISTS telefono_contacto TEXT;
ALTER TABLE consultorios ADD COLUMN IF NOT EXISTS email_contacto TEXT;

-- 2. Crear Tabla de Doctores (Soporta múltiples especialidades por sede)
CREATE TABLE IF NOT EXISTS doctores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultorio_id UUID REFERENCES consultorios(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  especialidad TEXT,
  foto_url TEXT DEFAULT 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?q=80&w=2670&auto=format&fit=crop',
  biografia TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Vincular Citas a Doctores
ALTER TABLE citas ADD COLUMN IF NOT EXISTS doctor_id UUID REFERENCES doctores(id);

-- 4. Seguridad Pública (RLS) - REQUISITO PARA QUE EL WIZARD FUNCIONE
ALTER TABLE consultorios ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctores ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN 
    -- Política para Sedes (Clínicas)
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Lectura pública de sedes') THEN
        CREATE POLICY "Lectura pública de sedes" ON consultorios FOR SELECT USING (true);
    END IF;
    
    -- Política para Doctores
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Lectura pública de doctores') THEN
        CREATE POLICY "Lectura pública de doctores" ON doctores FOR SELECT USING (true);
    END IF;
END $$;

-- 5. Crear un Doctor Inicial (Asegúrate de que ya tengas una clínica en Step 1)
INSERT INTO doctores (nombre, especialidad, consultorio_id)
SELECT 'Dr. House Demo', 'Diagnóstico General', id 
FROM consultorios 
LIMIT 1
ON CONFLICT DO NOTHING;
