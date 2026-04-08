-- ====================================================================
-- APPCLÍNICA: PARCHE DE HISTORIAL CLÍNICO Y CRUD DE PACIENTES
-- ====================================================================

-- 1. TABLA: HISTORIAL CLÍNICO
-- Cada registro representa una visita o nota médica.
CREATE TABLE IF NOT EXISTS historial_clinico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id UUID REFERENCES pacientes(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES doctores(id) ON DELETE SET NULL,
  fecha TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  diagnostico TEXT,
  tratamiento TEXT,
  notas_internas TEXT,
  signos_vitales JSONB DEFAULT '{}'::jsonb, -- Presión, Peso, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE historial_clinico ENABLE ROW LEVEL SECURITY;

-- Solo staff autenticado puede gestionar historiales
DROP POLICY IF EXISTS "Staff gestiona historiales" ON historial_clinico;
CREATE POLICY "Staff gestiona historiales" ON historial_clinico 
FOR ALL USING (auth.role() = 'authenticated') 
WITH CHECK (auth.role() = 'authenticated');

-- Trigger de Updated At
DROP TRIGGER IF EXISTS update_historial_updated_at ON historial_clinico;
CREATE TRIGGER update_historial_updated_at BEFORE UPDATE ON historial_clinico FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ====================================================================
-- 2. AJUSTES EN TABLA PACIENTES
-- ====================================================================
-- Asegurar que los perfiles se pueden borrar y editar
ALTER TABLE pacientes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff gestiona pacientes" ON pacientes;
CREATE POLICY "Staff gestiona pacientes" ON pacientes 
FOR ALL USING (auth.role() = 'authenticated') 
WITH CHECK (auth.role() = 'authenticated');
