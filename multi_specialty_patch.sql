-- AppClínica: Parche de Especialidades Múltiples y Selección de Consulta
-- Este script permite que un doctor tenga varias áreas de atención.

-- 1. Actualizar Tabla Doctores para usar TEXT[] (Array de Especialidades)
-- Usamos un array para que sea fácil listar múltiples especialidades.
ALTER TABLE doctores RENAME COLUMN especialidad TO especialidades_old;
ALTER TABLE doctores ADD COLUMN especialidades TEXT[] DEFAULT '{}';

-- Migrar datos viejos (si existían) como primer elemento del array
UPDATE doctores SET especialidades = ARRAY[especialidades_old] WHERE especialidades_old IS NOT NULL;
ALTER TABLE doctores DROP COLUMN especialidades_old;

-- 2. Actualizar Tabla Citas para registrar qué especialidad eligió el paciente
ALTER TABLE citas ADD COLUMN IF NOT EXISTS especialidad_consulta TEXT;

-- 3. Ejemplo de Médico con varias especialidades
UPDATE doctores SET especialidades = ARRAY['Medicina General', 'Pediatría', 'Urgencias'] 
WHERE nombre LIKE '%House%';
