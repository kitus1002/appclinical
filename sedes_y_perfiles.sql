-- AppClínica: Parche de Sedes y Perfiles de Usuario
-- Este script permite gestionar múltiples ubicaciones y cambiar el nombre del usuario.

-- 1. Crear Tabla de Perfiles de Usuario
CREATE TABLE IF NOT EXISTS perfiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  nombre_completo TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Habilitar RLS para Perfiles
ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Usuarios ven su propio perfil') THEN
        CREATE POLICY "Usuarios ven su propio perfil" ON perfiles FOR SELECT USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Usuarios actualizan su propio perfil') THEN
        CREATE POLICY "Usuarios actualizan su propio perfil" ON perfiles FOR UPDATE USING (auth.uid() = user_id);
    END IF;

    -- Los pacientes pueden ver el perfil de los médicos (Opcional, para el futuro)
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Lectura pública selecta de perfiles') THEN
        CREATE POLICY "Lectura pública selecta de perfiles" ON perfiles FOR SELECT USING (true);
    END IF;
END $$;

-- 3. Trigger para Crear Perfil automáticamente al Registrarse
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.perfiles (user_id, nombre_completo)
  VALUES (new.id, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 4. Asegurar que los perfiles existentes tengan su primer registro si el trigger no corrió
INSERT INTO perfiles (user_id, nombre_completo)
SELECT id, email FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- 5. Modificar tabla consultorios (Sedes) para permitir slugs únicos por sede si es necesario
-- Ya es UNIQUE, así que está bien.
