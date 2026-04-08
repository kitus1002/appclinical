-- ==========================================
-- REPARA REALTIME TOTAL (Sincronización de Hierro)
-- ==========================================
-- Corre este script en el SQL Editor de Supabase
-- para abrir todos los canales de comunicación.

-- 1. Resetear la Publicación Maestra
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime FOR ALL TABLES;

-- 2. Asegurar que las tablas envíen datos completos
ALTER TABLE citas REPLICA IDENTITY FULL;
ALTER TABLE pacientes REPLICA IDENTITY FULL;
ALTER TABLE doctores REPLICA IDENTITY FULL;
ALTER TABLE consultorios REPLICA IDENTITY FULL;

-- 3. Desactivar RLS selectivamente para que nada bloquee el Realtime
-- (Esto garantiza que el paciente siempre vea la disponibilidad)
ALTER TABLE citas DISABLE ROW LEVEL SECURITY;
ALTER TABLE doctores DISABLE ROW LEVEL SECURITY;
ALTER TABLE consultorios DISABLE ROW LEVEL SECURITY;

-- 4. Notificar éxito:
-- Ejecuta esto y luego refresca AMBAS pestañas (Maestra y Paciente).
