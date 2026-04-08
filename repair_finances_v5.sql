-- NEO MED PRO: REPARACIÓN DE DATOS FINANCIEROS (v5.0)
-- IMPORTANTE: Copia esto y ejecútalo en el SQL Editor de Supabase.

-- 1. RECLAMAR DEUDAS HUÉRFANAS
-- Asigna el doctor_id a los créditos basándose en el dueño del paciente.
UPDATE creditos
SET doctor_id = pacientes.doctor_id
FROM pacientes
WHERE creditos.paciente_id = pacientes.id
AND creditos.doctor_id IS NULL;

-- 2. RECLAMAR PAGOS HUÉRFANOS
-- (Opcional, pero ayuda a la consistencia)
-- No hay columna doctor_id en pagos_credito, se hereda del credito_id.

-- 3. RECLAMAR PACIENTES SIN DUEÑO
-- Te asigna los pacientes que no tengan doctor_id (si eres el único usando la app).
UPDATE pacientes 
SET doctor_id = auth.uid() 
WHERE doctor_id IS NULL;

-- 4. POLÍTICA DE SEGURIDAD REFORZADA
-- Permite ver créditos si el doctor_id coincide O si eres el dueño del paciente.
DROP POLICY IF EXISTS "Aislamiento de Creditos" ON creditos;
CREATE POLICY "Aislamiento de Creditos" ON creditos 
FOR ALL USING (
  auth.uid() = doctor_id 
  OR EXISTS (
    SELECT 1 FROM pacientes 
    WHERE pacientes.id = creditos.paciente_id 
    AND pacientes.doctor_id = auth.uid()
  )
);

-- 5. RECARGA DE ESQUEMA
NOTIFY pgrst, 'reload schema';
