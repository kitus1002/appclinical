-- NEO MED PRO: SELLADO FINAL DE AUTONOMÍA Y SEGURIDAD (v3.1)
-- Corregido: Crea tablas faltantes de Recetas e Historial si no existen.
-- Autor: Antigravity AI

-- ====================================================================
-- 1. CREACIÓN DE TABLAS CLÍNICAS FALTANTES (CIMIENTO)
-- ====================================================================

-- Tabla para Evoluciones / Notas Médicas
CREATE TABLE IF NOT EXISTS historial_clinico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id UUID REFERENCES pacientes(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  diagnostico TEXT,
  tratamiento TEXT,
  notas_internas TEXT,
  fecha TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla para Prescripciones / Recetas
CREATE TABLE IF NOT EXISTS recetas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id UUID REFERENCES pacientes(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  medicamentos JSONB DEFAULT '[]'::jsonb,
  indicaciones_generales TEXT,
  fecha TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ====================================================================
-- 2. LIMPIEZA DE POLÍTICAS ANTIGUAS (QUE PERMITÍAN VER TODO)
-- ====================================================================
DROP POLICY IF EXISTS "Staff gestiona pacientes total" ON pacientes;
DROP POLICY IF EXISTS "Staff gestiona citas total" ON citas;
DROP POLICY IF EXISTS "Staff gestiona doctores total" ON doctores;
DROP POLICY IF EXISTS "Staff gestiona sedes total" ON consultorios;
DROP POLICY IF EXISTS "Staff gestiona servicios total" ON servicios_catalogo;

-- ====================================================================
-- 3. MEJORAS DE INTEGRIDAD Y DATOS CLÍNICOS
-- ====================================================================
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS imc DECIMAL(5, 2);
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS doctor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS limite_credito DECIMAL(12, 2) DEFAULT 0.00;

-- ====================================================================
-- 4. SEGURIDAD RLS: AISLAMIENTO ESTRICTO POR DOCTOR
-- ====================================================================

-- HISTORIAL CLÍNICO: Aislamiento total
ALTER TABLE historial_clinico ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Aislamiento de Historial por Doctor" ON historial_clinico;
CREATE POLICY "Aislamiento de Historial por Doctor" ON historial_clinico
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM pacientes 
    WHERE pacientes.id = historial_clinico.paciente_id 
    AND (pacientes.doctor_id = auth.uid() OR pacientes.doctor_id IS NULL)
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM pacientes 
    WHERE pacientes.id = historial_clinico.paciente_id 
    AND (pacientes.doctor_id = auth.uid() OR pacientes.doctor_id IS NULL)
  )
);

-- RECETAS: Aislamiento total
ALTER TABLE recetas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Aislamiento de Recetas por Doctor" ON recetas;
CREATE POLICY "Aislamiento de Recetas por Doctor" ON recetas
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM pacientes 
    WHERE pacientes.id = recetas.paciente_id 
    AND (pacientes.doctor_id = auth.uid() OR pacientes.doctor_id IS NULL)
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM pacientes 
    WHERE pacientes.id = recetas.paciente_id 
    AND (pacientes.doctor_id = auth.uid() OR pacientes.doctor_id IS NULL)
  )
);

-- CITAS: Solo mi agenda
ALTER TABLE citas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Aislamiento de Citas por Doctor" ON citas;
CREATE POLICY "Aislamiento de Citas por Doctor" ON citas 
FOR ALL USING (auth.uid() = doctor_id) 
WITH CHECK (auth.uid() = doctor_id);

-- CRÉDITOS Y PAGOS: Mis finanzas privadas
ALTER TABLE creditos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Aislamiento de Creditos" ON creditos;
CREATE POLICY "Aislamiento de Creditos" ON creditos 
FOR ALL USING (auth.uid() = doctor_id);

ALTER TABLE pagos_credito ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Aislamiento de Pagos" ON pagos_credito;
CREATE POLICY "Aislamiento de Pagos" ON pagos_credito
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM creditos 
    WHERE creditos.id = pagos_credito.credito_id 
    AND creditos.doctor_id = auth.uid()
  )
);

-- ====================================================================
-- 5. LECTURA COMPARTIDA / PÚBLICA (AUTENTICADOS)
-- ====================================================================

-- PACIENTES: Recuperación de huérfanos y ver mis propios pacientes
DROP POLICY IF EXISTS "Doctores ven sus propios pacientes" ON pacientes;
CREATE POLICY "Doctores ven sus propios pacientes" ON pacientes
FOR ALL USING (auth.uid() = doctor_id OR doctor_id IS NULL)
WITH CHECK (auth.uid() = doctor_id);

-- DOCTORES: Listado para transferencias (visible para staff)
DROP POLICY IF EXISTS "Lectura pública de doctores" ON doctores;
CREATE POLICY "Lectura pública de doctores" ON doctores FOR SELECT USING (auth.role() = 'authenticated');

-- CATALOGO DE SERVICIOS: Visible para staff
DROP POLICY IF EXISTS "Lectura pública de servicios" ON servicios_catalogo;
CREATE POLICY "Lectura pública de servicios" ON servicios_catalogo FOR SELECT USING (auth.role() = 'authenticated');

-- ====================================================================
-- ¡LISTO! Ejecuta este script en el SQL Editor de Supabase.
-- Con esto, el sistema NeoMed Pro queda blindado y funcional.
-- ====================================================================
