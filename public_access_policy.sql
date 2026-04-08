-- AppClínica: Políticas de Acceso Público para Citas
-- Permiten que los pacientes (sin login) puedan registrarse y agendar.

-- 1. Habilitar RLS en las tablas si no estaban habilitadas
ALTER TABLE pacientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE citas ENABLE ROW LEVEL SECURITY;

-- 2. Política para permitir INSERCION pública de pacientes
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Cualquiera puede registrarse como paciente') THEN
        CREATE POLICY "Cualquiera puede registrarse como paciente" ON pacientes 
        FOR INSERT 
        WITH CHECK (true);
    END IF;
END $$;

-- 3. Política para permitir INSERCION pública de citas
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Cualquiera puede agendar citas') THEN
        CREATE POLICY "Cualquiera puede agendar citas" ON citas 
        FOR INSERT 
        WITH CHECK (true);
    END IF;
END $$;

-- 4. Política para permitir que pacientes vean sus propias citas (por telefono/id opcionalmente)
-- Por ahora permitimos lectura pública para que el calendario sepa qué está ocupado
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Lectura pública de disponibilidad') THEN
        CREATE POLICY "Lectura pública de disponibilidad" ON citas 
        FOR SELECT 
        USING (true);
    END IF;
END $$;
