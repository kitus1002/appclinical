-- AppClínica: Parche de Actualización para Tabla Pacientes
-- Este script agrega las columnas clínicas necesarias si no existen.

DO $$ 
BEGIN 
    -- Columnas de Identificación y Perfil
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'pacientes' AND COLUMN_NAME = 'fecha_nacimiento') THEN
        ALTER TABLE pacientes ADD COLUMN fecha_nacimiento DATE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'pacientes' AND COLUMN_NAME = 'genero') THEN
        ALTER TABLE pacientes ADD COLUMN genero TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'pacientes' AND COLUMN_NAME = 'direccion_completa') THEN
        ALTER TABLE pacientes ADD COLUMN direccion_completa TEXT;
    END IF;

    -- Columnas Clínicas (Críticas)
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'pacientes' AND COLUMN_NAME = 'alergias') THEN
        ALTER TABLE pacientes ADD COLUMN alergias TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'pacientes' AND COLUMN_NAME = 'antecedentes_patologicos') THEN
        ALTER TABLE pacientes ADD COLUMN antecedentes_patologicos TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'pacientes' AND COLUMN_NAME = 'tipo_sangre') THEN
        ALTER TABLE pacientes ADD COLUMN tipo_sangre TEXT;
    END IF;

    -- Contactos de Emergencia
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'pacientes' AND COLUMN_NAME = 'contacto_emergencia_nombre') THEN
        ALTER TABLE pacientes ADD COLUMN contacto_emergencia_nombre TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'pacientes' AND COLUMN_NAME = 'contacto_emergencia_telefono') THEN
        ALTER TABLE pacientes ADD COLUMN contacto_emergencia_telefono TEXT;
    END IF;

    -- Notas
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'pacientes' AND COLUMN_NAME = 'notas_generales') THEN
        ALTER TABLE pacientes ADD COLUMN notas_generales TEXT;
    END IF;

END $$;
