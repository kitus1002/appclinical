-- ====================================================================
-- NEO MED PRO: PARCHE MAESTRO DE SEGURIDAD RLS (CORRECCIÓN FINAL)
-- ====================================================================
-- Este script soluciona los errores de "new row violates row-level security policy"
-- Permite que pacientes (anon) se registren y agenden, mientras mantiene
-- el acceso total para el staff autenticado.

-- 1. TABLA: PACIENTES
ALTER TABLE pacientes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Cualquiera puede registrarse como paciente" ON pacientes;
DROP POLICY IF EXISTS "Staff gestiona pacientes" ON pacientes;

-- Politica para registro público (INSERT)
CREATE POLICY "Registro público de pacientes" ON pacientes 
FOR INSERT WITH CHECK (true);

-- Politica para staff (ALL)
CREATE POLICY "Staff gestiona pacientes total" ON pacientes 
FOR ALL USING (auth.role() = 'authenticated') 
WITH CHECK (auth.role() = 'authenticated');

-- 2. TABLA: CITAS
ALTER TABLE citas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Cualquiera puede agendar citas" ON citas;
DROP POLICY IF EXISTS "Lectura pública de disponibilidad" ON citas;
DROP POLICY IF EXISTS "Staff gestiona citas" ON citas;

-- Politica para agendar (INSERT)
CREATE POLICY "Agendamiento público de citas" ON citas 
FOR INSERT WITH CHECK (true);

-- Politica para staff (ALL - Incluye SELECT, UPDATE, DELETE)
-- Se quita el SELECT público total para proteger la privacidad.
CREATE POLICY "Staff gestiona citas total" ON citas 
FOR ALL USING (auth.role() = 'authenticated') 
WITH CHECK (auth.role() = 'authenticated');

-- 2.1 FUNCIÓN SEGURA PARA DISPONIBILIDAD (RPC)
-- Esta función permite que la agenda pública vea qué horas están ocupadas sin ver quién es el paciente.
CREATE OR REPLACE FUNCTION get_occupied_slots(p_doctor_id UUID, p_start_range TEXT, p_end_range TEXT)
RETURNS TABLE (inicio TIMESTAMP WITH TIME ZONE, retraso_min INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER -- Ejecuta con permisos del creador para saltar el RLS restrictivo
AS $$
BEGIN
  RETURN QUERY
  SELECT c.inicio, c.retraso_min
  FROM citas c
  WHERE c.doctor_id = p_doctor_id
    AND c.inicio >= p_start_range::timestamp with time zone
    AND c.inicio <= p_end_range::timestamp with time zone;
END;
$$;

-- 3. TABLA: DOCTORES
ALTER TABLE doctores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Lectura pública de doctores" ON doctores;
DROP POLICY IF EXISTS "Staff gestiona doctores" ON doctores;

CREATE POLICY "Lectura pública de doctores" ON doctores FOR SELECT USING (true);
CREATE POLICY "Staff gestiona doctores total" ON doctores 
FOR ALL USING (auth.role() = 'authenticated') 
WITH CHECK (auth.role() = 'authenticated');

-- 4. TABLA: CONSULTORIOS (SEDES)
ALTER TABLE consultorios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Lectura pública de sedes" ON consultorios;
DROP POLICY IF EXISTS "Duenos gestionan sus sedes" ON consultorios;
DROP POLICY IF EXISTS "Usuarios autenticados crean sedes" ON consultorios;

CREATE POLICY "Lectura pública de sedes" ON consultorios FOR SELECT USING (true);
CREATE POLICY "Staff gestiona sedes total" ON consultorios 
FOR ALL USING (auth.role() = 'authenticated') 
WITH CHECK (auth.role() = 'authenticated');

-- 5. TABLA: SERVICIOS CATALOGO
ALTER TABLE servicios_catalogo ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public select services" ON servicios_catalogo;
DROP POLICY IF EXISTS "Staff manage services" ON servicios_catalogo;

CREATE POLICY "Lectura pública de servicios" ON servicios_catalogo FOR SELECT USING (true);
CREATE POLICY "Staff gestiona servicios total" ON servicios_catalogo 
FOR ALL USING (auth.role() = 'authenticated') 
WITH CHECK (auth.role() = 'authenticated');

-- 6. TABLA: PERFILES
-- Ya tiene sus políticas, pero aseguramos lectura pública de nombres
ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Lectura pública de perfiles" ON perfiles;
CREATE POLICY "Lectura pública de perfiles" ON perfiles FOR SELECT USING (true);

-- ====================================================================
-- ¡LISTO! Ejecuta este script en el SQL Editor de Supabase.
-- ====================================================================
