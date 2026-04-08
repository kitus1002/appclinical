-- ====================================================================
-- APPCLÍNICA: PARCHE DE DOCUMENTOS (RECETAS Y PRESUPUESTOS)
-- ====================================================================

-- 1. TABLA: RECETAS MÉDICAS
CREATE TABLE IF NOT EXISTS recetas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id UUID REFERENCES pacientes(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES doctores(id) ON DELETE SET NULL,
  consultorio_id UUID REFERENCES consultorios(id) ON DELETE SET NULL,
  diagnostico TEXT,
  medicacion TEXT, -- JSON o Texto con medicinas y dosis
  indicaciones TEXT,
  fecha TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE recetas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff gestiona recetas" ON recetas;
CREATE POLICY "Staff gestiona recetas" ON recetas FOR ALL USING (auth.role() = 'authenticated');

-- 2. TABLA: PRESUPUESTOS
CREATE TABLE IF NOT EXISTS presupuestos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id UUID REFERENCES pacientes(id) ON DELETE CASCADE,
  consultorio_id UUID REFERENCES consultorios(id) ON DELETE SET NULL,
  items JSONB DEFAULT '[]'::jsonb, -- Lista de conceptos y costos
  total DECIMAL(10,2) DEFAULT 0,
  notas TEXT,
  validez_dias INTEGER DEFAULT 15,
  fecha TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE presupuestos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff gestiona presupuestos" ON presupuestos;
CREATE POLICY "Staff gestiona presupuestos" ON presupuestos FOR ALL USING (auth.role() = 'authenticated');
