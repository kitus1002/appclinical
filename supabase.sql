-- AppClínica: Esquema de Base de Datos (Supabase/PostgreSQL)

-- 1. Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Tabla de Consultorios (Tenants)
CREATE TABLE IF NOT EXISTS consultorios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID REFERENCES auth.users(id),
  nombre TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  descripcion TEXT,
  horarios JSONB DEFAULT '{"lun":{"inicio":"09:00","fin":"18:00"},"mar":{"inicio":"09:00","fin":"18:00"},"mie":{"inicio":"09:00","fin":"18:00"},"jue":{"inicio":"09:00","fin":"18:00"},"vie":{"inicio":"09:00","fin":"18:00"}}',
  duracion_cita_min INT DEFAULT 30,
  logo_url TEXT,
  cedula_profesional TEXT, -- Necesario para recetas
  especialidad TEXT,
  universidad TEXT,
  direccion_fisica TEXT, -- Dirección que aparecerá en la receta
  telefono_contacto TEXT,
  email_contacto TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabla de Pacientes
CREATE TABLE IF NOT EXISTS pacientes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  consultorio_id UUID REFERENCES consultorios(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  telefono TEXT,
  email TEXT,
  fecha_nacimiento DATE,
  genero TEXT,
  direccion_completa TEXT,
  alergias TEXT,
  antecedentes_patologicos TEXT,
  tipo_sangre TEXT,
  contacto_emergencia_nombre TEXT,
  contacto_emergencia_telefono TEXT,
  notas_generales TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Tabla de Citas (Agendas)
CREATE TABLE IF NOT EXISTS citas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  paciente_id UUID REFERENCES pacientes(id) ON DELETE CASCADE,
  consultorio_id UUID REFERENCES consultorios(id) ON DELETE CASCADE,
  fecha DATE NOT NULL,
  inicio TIMESTAMP WITH TIME ZONE NOT NULL,
  fin TIMESTAMP WITH TIME ZONE NOT NULL,
  motivo TEXT,
  estado TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'confirmada', 'en_curso', 'finalizada', 'cancelada')),
  retraso_min INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Tabla de Catálogo de Servicios
CREATE TABLE IF NOT EXISTS servicios_catalogo (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  consultorio_id UUID REFERENCES consultorios(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  precio DECIMAL(10, 2) NOT NULL,
  duracion_min INT DEFAULT 30,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Notas de Historial Clínico
CREATE TABLE IF NOT EXISTS historiales_notas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  paciente_id UUID REFERENCES pacientes(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES auth.users(id),
  contenido TEXT NOT NULL, -- Soporta HTML/Rich Text JSON
  fecha TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Presupuestos
CREATE TABLE IF NOT EXISTS presupuestos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  paciente_id UUID REFERENCES pacientes(id) ON DELETE CASCADE,
  consultorio_id UUID REFERENCES consultorios(id) ON DELETE CASCADE,
  detalles JSONB NOT NULL, -- Array de objetos {servicio_id: uuid, qty: int, subtotal: decimal}
  total DECIMAL(10, 2) NOT NULL,
  estado TEXT DEFAULT 'borrador' CHECK (estado IN ('borrador', 'enviado', 'aceptado', 'rechazado')),
  validez_hasta DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Blog Posts (Público)
CREATE TABLE IF NOT EXISTS posts_blog (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  consultorio_id UUID REFERENCES consultorios(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  contenido TEXT NOT NULL,
  imagen_url TEXT,
  publicado BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Funcionalidad Realtime
-- Habilitar Realtime para citas (importante para el Dashboard En Vivo)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'citas'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE citas;
    END IF;
END $$;

-- 10. Función para Desplazamiento de Citas (+5, +10 min)
-- Esta función se llamará desde el Dashboard para ajustar toda la agenda del día
CREATE OR REPLACE FUNCTION desplazar_citas_dia(
    p_consultorio_id UUID, 
    p_fecha DATE, 
    p_minutos INT
) RETURNS VOID AS $$
BEGIN
    UPDATE citas 
    SET inicio = inicio + (p_minutos * INTERVAL '1 minute'),
        fin = fin + (p_minutos * INTERVAL '1 minute'),
        retraso_min = retraso_min + p_minutos
    WHERE consultorio_id = p_consultorio_id 
      AND fecha = p_fecha
      AND estado IN ('pendiente', 'confirmada');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Tabla de Blog (Para SEO y Casos de Éxito)
CREATE TABLE IF NOT EXISTS blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultorio_id UUID DEFAULT '00000000-0000-0000-0000-000000000000',
  titulo TEXT NOT NULL,
  resumen TEXT,
  contenido TEXT,
  imagen_url TEXT,
  slug TEXT UNIQUE,
  publicado BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS para Blog
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

-- Politica publica para lectura
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can read published posts') THEN
        CREATE POLICY "Public can read published posts" ON blog_posts FOR SELECT USING (publicado = true);
    END IF;
END $$;

-- Politica admin para todo
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage posts') THEN
        CREATE POLICY "Admins can manage posts" ON blog_posts FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;
