-- NEO MED PRO: Parche de Autonomía de Doctores y Finanzas (v2)
-- Este script habilita la gestión de créditos, intereses y aislamiento de pacientes.

-- 1. EXTENDER TABLA DE DOCTORES
-- Añadimos email y vinculación con Auth para permitir login autónomo
ALTER TABLE doctores ADD COLUMN IF NOT EXISTS email_login TEXT;
ALTER TABLE doctores ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. VINCULAR PACIENTES A DOCTORES
-- Cada paciente ahora pertenece a un doctor específico para aislamiento de datos.
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS doctor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 3. TABLA DE CRÉDITOS (DEUDAS)
CREATE TABLE IF NOT EXISTS creditos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id UUID REFERENCES pacientes(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  monto_inicial DECIMAL(12, 2) NOT NULL,
  tasa_interes DECIMAL(5, 2) DEFAULT 0.00, -- Porcentaje (ej: 10.00 para 10%)
  total_con_interes DECIMAL(12, 2) NOT NULL,
  saldo_pendiente DECIMAL(12, 2) NOT NULL,
  notas TEXT,
  estado TEXT DEFAULT 'vigente' CHECK (estado IN ('vigente', 'liquidado', 'vencido')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. TABLA DE PAGOS / ABONOS
CREATE TABLE IF NOT EXISTS pagos_credito (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credito_id UUID REFERENCES creditos(id) ON DELETE CASCADE,
  monto_pagado DECIMAL(12, 2) NOT NULL,
  metodo_pago TEXT DEFAULT 'efectivo' CHECK (metodo_pago IN ('efectivo', 'tarjeta', 'transferencia', 'otro')),
  tipo_pago TEXT DEFAULT 'abono' CHECK (tipo_pago IN ('abono', 'liquidacion')),
  fecha_pago TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. SEGURIDAD RLS: AISLAMIENTO POR DOCTOR
-- Aseguramos que un doctor solo vea SUS pacientes y SUS finanzas.

-- RLS para Pacientes
ALTER TABLE pacientes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Doctores ven sus propios pacientes" ON pacientes;
CREATE POLICY "Doctores ven sus propios pacientes" ON pacientes
FOR ALL USING (auth.uid() = doctor_id OR doctor_id IS NULL)
WITH CHECK (auth.uid() = doctor_id);

-- RLS para Créditos
ALTER TABLE creditos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Doctores ven sus propios creditos" ON creditos;
CREATE POLICY "Doctores ven sus propios creditos" ON creditos
FOR ALL USING (auth.uid() = doctor_id)
WITH CHECK (auth.uid() = doctor_id);

-- RLS para Pagos
ALTER TABLE pagos_credito ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Doctores ven sus propios pagos" ON pagos_credito;
CREATE POLICY "Doctores ven sus propios pagos" ON pagos_credito
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM creditos 
    WHERE creditos.id = pagos_credito.credito_id 
    AND creditos.doctor_id = auth.uid()
  )
);

-- 6. HABILITAR REALTIME PARA FINANZAS
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'creditos') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE creditos;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'pagos_credito') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE pagos_credito;
    END IF;
END $$;
