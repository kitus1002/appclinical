-- AppClínica: Parche de Seguridad de Perfiles (INSERT Policy)
-- Este script soluciona el error de RLS al guardar el perfil por primera vez.

-- 1. Asegurar que RLS esté activo
ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;

-- 2. Borrar políticas existentes de perfiles para recrearlas correctamente
DROP POLICY IF EXISTS "Usuarios ven su propio perfil" ON perfiles;
DROP POLICY IF EXISTS "Usuarios actualizan su propio perfil" ON perfiles;
DROP POLICY IF EXISTS "Usuarios crean su propio perfil" ON perfiles;
DROP POLICY IF EXISTS "Lectura pública selecta de perfiles" ON perfiles;

-- 3. Crear Políticas Robustas
-- SELECT: Ver mi propio perfil (o todos si eres admin, pero por ahora el propio)
CREATE POLICY "Usuarios ven su propio perfil" ON perfiles 
FOR SELECT USING (auth.uid() = user_id);

-- INSERT: Crear mi propio perfil
CREATE POLICY "Usuarios crean su propio perfil" ON perfiles 
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- UPDATE: Editar mi propio perfil
CREATE POLICY "Usuarios actualizan su propio perfil" ON perfiles 
FOR UPDATE USING (auth.uid() = user_id);

-- SELECT Público: Para que otros (pacientes) vean nombres de doctores
CREATE POLICY "Lectura pública de perfiles" ON perfiles 
FOR SELECT USING (true);
