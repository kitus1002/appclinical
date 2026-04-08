-- ====================================================================
-- APPCLÍNICA: PARCHE DE NORMATIVA MEXICANA (COFEPRIS)
-- ====================================================================

-- 1. EXTENSIÓN DE TABLA DOCTORES
-- Añadir campos para respaldo legal de la receta
ALTER TABLE doctores 
ADD COLUMN IF NOT EXISTS institucion_titulo TEXT,
ADD COLUMN IF NOT EXISTS universidad TEXT;

-- 2. EXTENSIÓN DE TABLA PACIENTES
-- Añadir campos recomendados para prescripción segura
ALTER TABLE pacientes
ADD COLUMN IF NOT EXISTS peso_kg DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS talla_cm INTEGER,
ADD COLUMN IF NOT EXISTS sexo_biologico TEXT CHECK (sexo_biologico IN ('masculino', 'femenino', 'otro')),
ADD COLUMN IF NOT EXISTS imc DECIMAL(4,2);

-- 3. AJUSTES EN TABLA CONSULTORIOS
-- Asegurar que el domicilio y teléfono estén disponibles
ALTER TABLE consultorios
ADD COLUMN IF NOT EXISTS domicilio_completo TEXT,
ADD COLUMN IF NOT EXISTS telefono_contacto TEXT;

-- ====================================================================
-- TRIGER PARA CALCULAR IMC AUTOMÁTICAMENTE
-- ====================================================================
CREATE OR REPLACE FUNCTION calcular_imc_paciente()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.peso_kg IS NOT NULL AND NEW.talla_cm IS NOT NULL AND NEW.talla_cm > 0 THEN
    NEW.imc := NEW.peso_kg / ((NEW.talla_cm::decimal / 100) * (NEW.talla_cm::decimal / 100));
  ELSE
    NEW.imc := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_calcular_imc ON pacientes;
CREATE TRIGGER tr_calcular_imc
BEFORE INSERT OR UPDATE OF peso_kg, talla_cm
ON pacientes
FOR EACH ROW
EXECUTE FUNCTION calcular_imc_paciente();
