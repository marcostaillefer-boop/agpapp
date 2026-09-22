# AGP Fincas

App móvil para administración de fincas: comunidades, propietarios, incidencias, cuotas, documentos y **juntas de propietarios con votación online y presencial en tiempo real**.

Construida con [Expo](https://expo.dev) (SDK 57, Expo Router) y [Supabase](https://supabase.com) como backend.

## Módulos

- **Comunidades y propietarios** — fichas de comunidades, viviendas, coeficiente de participación y derecho a voto.
- **Incidencias** — los propietarios reportan avisos, el administrador cambia su estado.
- **Cuotas** — estado de pagos por vivienda (pendiente / pagada / vencida).
- **Documentos** — actas, convocatorias y otros documentos, con subida a Supabase Storage.
- **Juntas de propietarios** (el módulo principal):
  - Convocatoria con orden del día (puntos con descripción y si requieren votación).
  - Asistencia presencial u online, registrada por propietario/vivienda.
  - Votación en remoto desde el móvil: el administrador abre la votación de un punto y cada propietario emite su voto (a favor / en contra / abstención).
  - **Recuento en directo** ponderado por coeficiente de participación, vía Supabase Realtime.
  - Cierre de la votación y **generación automática del acta** con los resultados de cada punto.

## Cómo funciona el voto

El peso de cada voto es el **coeficiente de participación** de la vivienda (como marca la Ley de Propiedad Horizontal), no "una vivienda, un voto". El recuento en vivo suma los coeficientes de quienes ya han votado y se actualiza para todos los que tienen la pantalla del punto abierta, gracias a una suscripción Realtime a la tabla `votos`. Al cerrar la votación, una función de base de datos (`cerrar_votacion`) calcula el resultado final de forma atómica y lo guarda en el punto del orden del día; ese resultado es el que se muestra en el acta.

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

4. Da de alta al primer administrador: crea un usuario en Supabase Auth y luego una fila en `profiles` con `rol = 'admin'` y el mismo `id`. Desde ahí, ese administrador puede crear comunidades, viviendas (asociando el `propietario_id` de cada una) y convocar juntas.

5. Arranca la app:

   ```bash
   npx expo start
   ```

## Estructura

```
src/
  app/              rutas de Expo Router (una pantalla por archivo)
  components/       componentes reutilizables (Button, Card, VoteBar...)
  constants/        colores y espaciados
  context/          contexto de autenticación (sesión + perfil)
  hooks/            hooks de datos (useComunidades, tema...)
  lib/supabase.ts   cliente de Supabase
  types/database.ts tipos de las tablas
supabase/schema.sql  esquema, RLS y funciones de votación
```

## Pendiente / próximos pasos

Esto es un punto de partida sólido, no un producto terminado. Antes de producción conviene:

- Revisar y probar a fondo las políticas RLS de `supabase/schema.sql` (están pensadas para funcionar, pero cada comunidad real puede necesitar matices).
- La "junta online" de momento es un enlace a la videollamada que prefieras (Meet, Zoom...); la app no aloja vídeo. El valor añadido de la app es el orden del día, la votación y el acta, no la videoconferencia en sí.
- Falta gestión de altas de propietarios desde la propia app (hoy se hace directamente en Supabase).
- Falta generación de acta en PDF (hoy se comparte como texto) y notificaciones push para avisar de nuevas juntas o incidencias.
- No hay tests automatizados todavía.
