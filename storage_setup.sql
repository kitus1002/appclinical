-- AppClínica: Configuración de Almacenamiento (Supabase Storage)
-- Este script habilita las subidas de logos y fotos.

-- 1. Crear el bucket si no existe (Requiere extension storage instalada)
INSERT INTO storage.buckets (id, name, public)
VALUES ('clinic-assets', 'clinic-assets', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Permitir que CUALQUIERA vea las imágenes (Público)
CREATE POLICY "Public Access" ON storage.objects
FOR SELECT USING (bucket_id = 'clinic-assets');

-- 3. Permitir que usuarios autenticados SUBAN imágenes
CREATE POLICY "Authenticated Upload" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'clinic-assets' 
  AND auth.role() = 'authenticated'
);

-- 4. Permitir que usuarios autenticados ACTUALICEN sus imágenes
CREATE POLICY "Authenticated Update" ON storage.objects
FOR UPDATE WITH CHECK (
  bucket_id = 'clinic-assets' 
  AND auth.role() = 'authenticated'
);

-- 5. Permitir ELIMINAR imágenes
CREATE POLICY "Authenticated Delete" ON storage.objects
FOR DELETE USING (
  bucket_id = 'clinic-assets' 
  AND auth.role() = 'authenticated'
);
