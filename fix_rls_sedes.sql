-- AppClínica: Parche de Seguridad RLS Final (Sedes y Multimedia)
-- Este script soluciona los errores de "new row violates row-level security policy".

-- 1. Habilitar RLS en Consultorios (si no está habilitado)
ALTER TABLE consultorios ENABLE ROW LEVEL SECURITY;

-- 2. Política para INSERT (Permitir a usuarios autenticados crear sus sedes)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Usuarios autenticados crean sedes') THEN
        CREATE POLICY "Usuarios autenticados crean sedes" ON consultorios 
        FOR INSERT WITH CHECK (auth.role() = 'authenticated');
    END IF;
END $$;

-- 3. Política para UPDATE/DELETE (Permitir solo al dueño gestionar sus sedes)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Duenos gestionan sus sedes') THEN
        CREATE POLICY "Duenos gestionan sus sedes" ON consultorios 
        FOR ALL USING (auth.uid() = owner_id);
    END IF;
END $$;

-- 4. Asegurar Acceso de Lectura Pública (Para pacientes en la Agenda)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Lectura pública de consultorios') THEN
        CREATE POLICY "Lectura pública de consultorios" ON consultorios 
        FOR SELECT USING (true);
    END IF;
END $$;

-- 5. Reforzar Almacenamiento (Bucket: clinic-assets)
-- Asegurar que el bucket exista y sea público
INSERT INTO storage.buckets (id, name, public)
VALUES ('clinic-assets', 'clinic-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Borrar políticas de storage viejas para evitar conflictos y aplicar las correctas
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated CRUD" ON storage.objects;

-- Politica: Lectura Publica Total
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'clinic-assets');

-- Politica: Usuarios autenticados gestionan todo en el bucket
CREATE POLICY "Authenticated CRUD" ON storage.objects 
FOR ALL USING (bucket_id = 'clinic-assets' AND auth.role() = 'authenticated') 
WITH CHECK (bucket_id = 'clinic-assets' AND auth.role() = 'authenticated');
