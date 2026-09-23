# AGP Fincas

App móvil para administración de fincas: comunidades, propietarios, incidencias, cuotas, documentos y **juntas de propietarios con votación online y presencial en tiempo real**.

Construida con [Expo](https://expo.dev) (SDK 57, Expo Router) y [Supabase](https://supabase.com) como backend. Disponible en español, inglés, francés y alemán.

## Módulos

- **Bienvenida y acceso** — selector de idioma, y un portal de entrada que separa "Administración" (despacho) de "Propietario". Los propietarios entran con un código que les da su administración; no hay alta libre.
- **Roles y permisos** — un despacho de administración de fincas (`administraciones`) tiene un titular (`super_admin`) y puede tener empleados (`empleados`) con permisos independientes por módulo (comunidades, incidencias, cuotas, documentos, juntas, mantenimiento), cada uno en "ninguno / ver / editar". El titular siempre tiene acceso total. Los propietarios solo ven su propia comunidad. Esto permite dar de alta a un jardinero o a alguien de mantenimiento con acceso solo a sus tareas, sin tocar el resto de la app.
- **Comunidades y propietarios** — fichas de comunidades, viviendas, coeficiente de participación y derecho a voto. Generación de códigos de acceso por vivienda.
- **Incidencias** — los propietarios reportan avisos con foto (cámara o galería) y ubicación exacta por GPS, con un campo de texto como alternativa si no hay señal o el propietario prefiere describir el lugar a mano. El personal con permiso de "editar" en incidencias cambia su estado.
- **Cuotas** — estado de pagos por vivienda (pendiente / pagada / vencida).
- **Documentos** — subida de archivos a Supabase Storage, o enlace a un documento externo (por ejemplo, SharePoint del propio despacho) para no ocupar espacio en la app.
- **Propietarios y contacto** — cada vivienda guarda su propio nombre de propietario, teléfono, email, bloque/portal y dirección de notificación, con independencia de si esa persona ha llegado a registrarse en la app. Conforme a la LPH, si no se ha indicado una dirección de notificación distinta, se usa la de la propia comunidad.
- **Cargos de la junta directiva** — presidente, vicepresidente, secretario y vocal se marcan por vivienda desde la ficha de la comunidad, tal como se acuerda cada año en la junta ordinaria.
- **Circulares** — avisos a toda la comunidad, a un bloque/portal concreto o a una selección de viviendas. Por ahora se guardan y se muestran dentro de la app; el envío real por email o SMS es un paso posterior.
- **Proveedores** — directorio propio del despacho por categoría (fontanería, electricidad, ascensores...), pensado para derivar incidencias sin depender de un buscador externo.
- **Mantenimiento** — tareas rutinarias de cada comunidad (jardinería, piscina, ascensores, contraincendios, pintura periódica...), asignadas a personal propio o a un proveedor del directorio, con su frecuencia y un histórico de cuándo se han realizado. Un mismo empleado puede llevar varias tareas si la comunidad es pequeña.
- **Juntas de propietarios** (el módulo más completo):
  - Convocatoria con orden del día (puntos con descripción y si requieren votación), generada como texto conforme a la LPH (encabezado, orden del día y ruegos y preguntas) y compartible desde la propia junta. Incluye el listado de propietarios morosos, que conservan voz pero no voto (art. 15.2 LPH), calculado a partir de las cuotas vencidas.
  - Asistencia presencial u online, registrada por propietario/vivienda, o **delegación de voto**: el propietario indica quién le representa (no hace falta que sea otro propietario) y puede dejar instrucción de voto por adelantado para cada punto (a favor / en contra / abstención / libre).
  - Votación en remoto desde el móvil: quien tiene permiso de editar en juntas abre la votación de un punto y cada propietario emite su voto. El mismo personal puede votar **en representación** de una vivienda delegada o presente sin acceso a la app, viendo la instrucción dejada por el propietario.
  - **Recuento en directo** ponderado por coeficiente de participación, vía Supabase Realtime.
  - Cierre de la votación y **generación automática del acta** con los resultados de cada punto.
  - **Listado de propietarios tipo Excel**: vivienda, propietario, coeficiente, si es deudor, asistencia, representante y el voto de cada punto, en columnas, exportable como CSV.
- **Fichaje y ausencias** — cada empleado ficha su entrada y salida con la hora que pone el propio servidor (no editable, para que el registro no se pueda manipular), y puede solicitar vacaciones o un día libre. Si es personal fijo de una comunidad, la solicitud necesita el visto bueno tanto de la administración como del presidente de esa comunidad; si es del despacho en general, basta con la administración.

## Cómo funciona el voto

El peso de cada voto es el **coeficiente de participación** de la vivienda (como marca la Ley de Propiedad Horizontal), no "una vivienda, un voto". El recuento en vivo suma los coeficientes de quienes ya han votado y se actualiza para todos los que tienen la pantalla del punto abierta, gracias a una suscripción Realtime a la tabla `votos`. Al cerrar la votación, una función de base de datos (`cerrar_votacion`) calcula el resultado final de forma atómica y lo guarda en el punto del orden del día; ese resultado es el que se muestra en el acta.

## Cómo entra cada persona

- **Titular de la administración (super_admin)**: se da de alta a mano en Supabase la primera vez (ver más abajo). Desde la pestaña "Equipo" genera códigos para invitar empleados y da o quita permisos por módulo.
- **Empleado**: recibe un código de la pestaña "Equipo" del titular, y se registra con él en "Regístrate con el código de tu comunidad" (el mismo flujo que un propietario; el código decide si acaba como empleado del despacho o como propietario de una vivienda).
- **Propietario**: recibe un código generado desde la ficha de su comunidad (botón "Generar código para el propietario" en cada vivienda sin propietario asignado) y se registra con él.

## Puesta en marcha

1. Instala dependencias:

   ```bash
   npm install
   ```

2. Crea un proyecto en [Supabase](https://supabase.com) y ejecuta `supabase/schema.sql` en el SQL Editor. Crea las políticas y funciones tal cual están (puedes revisarlas y ajustarlas antes).

3. Copia `.env.example` a `.env` y rellena tus credenciales:

   ```bash
   cp .env.example .env
   ```

4. Da de alta al primer titular del despacho (super_admin):
   - Crea un usuario en Supabase Auth (Authentication → Users → Add user).
   - Inserta una fila en `profiles` con ese `id`, `rol = 'super_admin'`.
   - Inserta una fila en `administraciones` con `propietario_id` = ese mismo `id`.

   A partir de ahí, ese usuario ya puede entrar por "Administración", crear comunidades (asociadas a su `administracion_id`), invitar empleados desde "Equipo" y generar códigos de propietario desde cada comunidad.

5. Arranca la app:

   ```bash
   npx expo start
   ```

## Idiomas

Los textos viven en `src/i18n/locales/{es,en,fr,de}.ts`. De momento la pantalla de bienvenida, el portal, el login, el registro, las pestañas y el perfil están traducidos; el resto de pantallas (incidencias, cuotas, juntas...) sigue en español y se puede ir traduciendo con el mismo patrón (`useTranslation()` + claves nuevas en los cuatro archivos).

## Estructura

```
src/
  app/                    rutas de Expo Router (una pantalla por archivo)
  components/             componentes reutilizables (Button, Card, VoteBar...)
  constants/              colores y espaciados
  context/auth-context.tsx  sesión, perfil, rol, permisos por módulo (can())
  i18n/                   configuración de idiomas y diccionarios
  hooks/                  hooks de datos (useComunidades, tema...)
  lib/supabase.ts         cliente de Supabase
  lib/codes.ts            generador de códigos de acceso
  lib/pending-registration.ts  registro pendiente de confirmación de email
  types/database.ts       tipos de las tablas
supabase/schema.sql        esquema, RLS, roles y funciones de votación/códigos
```

## Pendiente / próximos pasos

Esto es un punto de partida sólido, no un producto terminado. Lo que se ha dejado fuera deliberadamente en esta fase, para ir por partes:

- Traducción automática del texto de las incidencias entre el idioma del propietario y el de la administración (de momento se muestra tal cual se escribió).
- Búsqueda automática de proveedores para presupuestos: por ahora cada despacho gestiona su propia lista de proveedores dentro de la app (ver módulo "Proveedores"), sin buscador externo.
- Envío real de circulares por email/SMS: hoy quedan guardadas y visibles dentro de la app para quien vaya dirigida.
- Flujo de solicitud de tres presupuestos a proveedores y aprobación de gastos.
- Generación automática de la agenda de mantenimiento según la frecuencia (hoy cada aviso de "realizada" se registra a mano; no se generan avisos ni recordatorios de la próxima fecha prevista).
- Control de acuses de recibo de la convocatoria y reenvío por correo certificado si no hay confirmación.
- Registro horario: cumple el Real Decreto-ley 8/2019 vigente (registro diario, no manipulable, accesible al trabajador y a la administración/presidente). La normativa que exigiría un formato digital concreto está en trámite pero no publicada en el BOE a fecha de este commit; conviene revisar este módulo cuando se publique.
- Revisar y probar a fondo las políticas RLS de `supabase/schema.sql` antes de producción.
- La "junta online" de momento es un enlace a la videollamada que prefieras (Meet, Zoom...); la app no aloja vídeo.
- No hay tests automatizados todavía.
