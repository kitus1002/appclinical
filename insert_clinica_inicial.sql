-- AppClínica: Inserción de Consultorio Inicial
-- Ejecuta este script para habilitar el agendamiento público.

INSERT INTO consultorios (id, nombre, slug, especialidad, telefono_contacto, email_contacto)
VALUES (
  '00000000-0000-0000-0000-000000000000', -- ID Fijo para las pruebas
  'Tu Clínica Premium',
  'clinica-demo',
  'Medicina General',
  '5555555555',
  'contacto@tudomino.com'
)
ON CONFLICT (id) DO NOTHING;

-- Si ya existe un registro pero con otro ID, asegúrate de que al menos haya UNO.
-- Puedes editar los datos una vez insertados desde el panel de Configuración.
