-- ==========================================
-- FIX DEFINITIVO: REALTIME SYNC DE CITAS
-- ==========================================
-- Ejecuta esto en el SQL Editor de Supabase
-- Esto es lo que hace que la Agenda de Pacientes
-- se actualice cuando mueves una cita en la Agenda Maestra

-- PASO 1: Activar REPLICA IDENTITY FULL
-- Necesario para que Realtime envíe los datos completos del registro
ALTER TABLE citas REPLICA IDENTITY FULL;

-- PASO 2: Asegurarse de que la tabla está en la publicación de Supabase Realtime
DO $$
BEGIN
    -- Intentar agregar la tabla si no está ya
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE citas;
    EXCEPTION 
        WHEN duplicate_object THEN 
            NULL; -- Ya está en la publicación, OK
    END;
END $$;

-- PASO 3: Confirmar que el campo 'fecha' existe correctamente como DATE
-- (Crítico: el campo fecha debe ser tipo DATE, no TIMESTAMP)
-- Si necesitas verificar, ejecuta esto también:
-- SELECT column_name, data_type FROM information_schema.columns 
-- WHERE table_name = 'citas' AND column_name = 'fecha';

-- PASO 4: Verificar políticas RLS para SELECT público
-- La agenda pública necesita poder leer las citas para ver qué slots están ocupados
DROP POLICY IF EXISTS "Lectura pública de disponibilidad citas" ON citas;
CREATE POLICY "Lectura pública de disponibilidad citas" ON citas
FOR SELECT USING (true);

-- ==========================================
-- ¡LISTO! Después de ejecutar esto:
-- 1. Recarga la Agenda de Pacientes en el navegador
-- 2. Mueve una cita en la Agenda Maestra
-- 3. La Agenda de Pacientes se actualizará automáticamente
-- ==========================================
