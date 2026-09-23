-- AGP Fincas — esquema de base de datos (Supabase / Postgres)
-- Ejecuta este archivo en el SQL Editor de tu proyecto de Supabase.
-- Pensado como punto de partida: revisa las políticas RLS antes de pasar a producción.

create extension if not exists "pgcrypto";

-- ============================================================
-- TABLAS
-- ============================================================

create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nombre text not null,
  apellidos text,
  email text not null,
  telefono text,
  rol text not null default 'propietario' check (rol in ('super_admin', 'empleado', 'propietario')),
  created_at timestamptz not null default now()
);

-- Una "administración" es el despacho de administración de fincas: la empresa
-- que gestiona una o varias comunidades, con un titular (super_admin) y, opcionalmente,
-- empleados con permisos distintos por módulo.
create table if not exists administraciones (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  propietario_id uuid not null references profiles (id),
  -- URL base del gestor documental propio del despacho (por ejemplo, un sitio de
  -- SharePoint). Es informativa: cada documento guarda su propio enlace en `documentos.url`;
  -- esto solo sirve para mostrar de dónde vienen los documentos de este despacho.
  enlace_documentos_base text,
  created_at timestamptz not null default now()
);

-- Empleados del despacho, con permisos por módulo: 'ninguno' | 'ver' | 'editar'.
create table if not exists empleados (
  id uuid primary key default gen_random_uuid(),
  administracion_id uuid not null references administraciones (id) on delete cascade,
  profile_id uuid not null references profiles (id),
  permisos jsonb not null default '{}'::jsonb,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  unique (administracion_id, profile_id)
);

create table if not exists comunidades (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  direccion text not null,
  cif text,
  administracion_id uuid not null references administraciones (id),
  created_at timestamptz not null default now()
);

create table if not exists viviendas (
  id uuid primary key default gen_random_uuid(),
  comunidad_id uuid not null references comunidades (id) on delete cascade,
  propietario_id uuid references profiles (id),
  identificador text not null,
  -- portal/bloque para poder agrupar y filtrar viviendas dentro de una misma
  -- comunidad o urbanización con varios edificios.
  bloque text,
  coeficiente numeric(6, 4) not null default 0,
  derecho_voto boolean not null default true,
  -- cargo directivo del propietario de esta vivienda en la comunidad, asignado
  -- tras cada junta ordinaria a partir de lo acordado en el acta.
  cargo text check (cargo in ('presidente', 'vicepresidente', 'secretario', 'vocal')),
  -- Datos de contacto del propietario, mantenidos por la administración con
  -- independencia de si esa persona ha llegado a registrarse en la app (si lo
  -- hace, propietario_id la vincula, pero el listado de contacto sigue siendo
  -- este). Conforme a la LPH, a efectos de notificaciones se usa la dirección
  -- de la propia comunidad salvo que el propietario haya comunicado otra.
  nombre_propietario text,
  telefono text,
  email text,
  direccion_notificacion text,
  created_at timestamptz not null default now()
);

create table if not exists incidencias (
  id uuid primary key default gen_random_uuid(),
  comunidad_id uuid not null references comunidades (id) on delete cascade,
  vivienda_id uuid references viviendas (id),
  creado_por uuid not null references profiles (id),
  titulo text not null,
  descripcion text not null,
  estado text not null default 'abierta' check (estado in ('abierta', 'en_proceso', 'cerrada')),
  foto_url text,
  latitud double precision,
  longitud double precision,
  -- si no hay GPS disponible o el propietario prefiere describirla a mano.
  ubicacion_texto text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Proveedores habituales del despacho (fontanería, electricidad, ascensores...),
-- para poder derivar una incidencia sin depender de un buscador externo.
create table if not exists proveedores (
  id uuid primary key default gen_random_uuid(),
  administracion_id uuid not null references administraciones (id) on delete cascade,
  categoria text not null,
  nombre text not null,
  telefono text,
  email text,
  notas text,
  creado_por uuid not null references profiles (id),
  created_at timestamptz not null default now()
);

-- Circulares/avisos que la administración envía a los propietarios: a toda la
-- comunidad, a un bloque/portal concreto, o a una selección de viviendas.
create table if not exists circulares (
  id uuid primary key default gen_random_uuid(),
  comunidad_id uuid not null references comunidades (id) on delete cascade,
  titulo text not null,
  mensaje text not null,
  destinatarios text not null check (destinatarios in ('todos', 'bloque', 'seleccion')),
  bloque text,
  creado_por uuid not null references profiles (id),
  created_at timestamptz not null default now(),
  constraint circular_bloque_informado check (destinatarios <> 'bloque' or bloque is not null)
);

create table if not exists circulares_destinatarios (
  id uuid primary key default gen_random_uuid(),
  circular_id uuid not null references circulares (id) on delete cascade,
  vivienda_id uuid not null references viviendas (id) on delete cascade,
  unique (circular_id, vivienda_id)
);

-- Tareas rutinarias de mantenimiento de una comunidad: jardinería, limpieza de
-- piscina, revisión de ascensores, control de plagas... Puede hacerlas
-- personal propio (un empleado con permiso sobre el módulo 'mantenimiento') o
-- una empresa externa del directorio de proveedores.
create table if not exists tareas_mantenimiento (
  id uuid primary key default gen_random_uuid(),
  comunidad_id uuid not null references comunidades (id) on delete cascade,
  titulo text not null,
  categoria text not null,
  descripcion text,
  tipo_ejecutor text not null check (tipo_ejecutor in ('personal', 'externa')),
  asignado_a uuid references profiles (id),
  proveedor_id uuid references proveedores (id),
  frecuencia text not null check (
    frecuencia in ('puntual', 'semanal', 'quincenal', 'mensual', 'trimestral', 'semestral', 'anual')
  ),
  activa boolean not null default true,
  creado_por uuid not null references profiles (id),
  created_at timestamptz not null default now(),
  constraint tarea_ejecutor_coherente check (
    (tipo_ejecutor = 'personal' and proveedor_id is null)
    or (tipo_ejecutor = 'externa' and asignado_a is null)
  )
);

-- Cada fila es una marca del checklist: una ocasión concreta (con su fecha
-- prevista) en la que esa tarea rutinaria debe hacerse o se ha hecho.
create table if not exists tareas_mantenimiento_registros (
  id uuid primary key default gen_random_uuid(),
  tarea_id uuid not null references tareas_mantenimiento (id) on delete cascade,
  fecha_prevista date not null,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'completada')),
  fecha_completada date,
  completado_por uuid references profiles (id),
  notas text,
  created_at timestamptz not null default now()
);

create table if not exists cuotas (
  id uuid primary key default gen_random_uuid(),
  comunidad_id uuid not null references comunidades (id) on delete cascade,
  vivienda_id uuid not null references viviendas (id) on delete cascade,
  periodo text not null,
  concepto text not null default 'Cuota ordinaria',
  importe numeric(10, 2) not null,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'pagada', 'vencida')),
  fecha_vencimiento date,
  fecha_pago date,
  created_at timestamptz not null default now()
);

create table if not exists juntas (
  id uuid primary key default gen_random_uuid(),
  comunidad_id uuid not null references comunidades (id) on delete cascade,
  titulo text not null,
  tipo text not null default 'ordinaria' check (tipo in ('ordinaria', 'extraordinaria')),
  modalidad text not null default 'presencial' check (modalidad in ('presencial', 'online', 'mixta')),
  fecha date not null,
  hora time not null,
  lugar text,
  enlace_online text,
  estado text not null default 'convocada' check (estado in ('convocada', 'en_curso', 'finalizada')),
  creado_por uuid not null references profiles (id),
  created_at timestamptz not null default now()
);

create table if not exists documentos (
  id uuid primary key default gen_random_uuid(),
  comunidad_id uuid not null references comunidades (id) on delete cascade,
  junta_id uuid references juntas (id),
  nombre text not null,
  tipo text not null default 'otro' check (tipo in ('acta', 'convocatoria', 'presupuesto', 'factura', 'otro')),
  url text not null,
  subido_por uuid not null references profiles (id),
  created_at timestamptz not null default now()
);

create table if not exists puntos_orden_dia (
  id uuid primary key default gen_random_uuid(),
  junta_id uuid not null references juntas (id) on delete cascade,
  orden integer not null,
  titulo text not null,
  descripcion text,
  requiere_votacion boolean not null default true,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'en_votacion', 'cerrado')),
  resultado jsonb,
  created_at timestamptz not null default now()
);

create table if not exists asistentes (
  id uuid primary key default gen_random_uuid(),
  junta_id uuid not null references juntas (id) on delete cascade,
  vivienda_id uuid not null references viviendas (id),
  propietario_id uuid not null references profiles (id),
  modalidad text not null default 'online' check (modalidad in ('presencial', 'online')),
  representada boolean not null default false,
  hora_registro timestamptz not null default now(),
  unique (junta_id, vivienda_id)
);

create table if not exists votos (
  id uuid primary key default gen_random_uuid(),
  punto_id uuid not null references puntos_orden_dia (id) on delete cascade,
  vivienda_id uuid not null references viviendas (id),
  propietario_id uuid not null references profiles (id),
  opcion text not null check (opcion in ('a_favor', 'en_contra', 'abstencion')),
  created_at timestamptz not null default now(),
  unique (punto_id, vivienda_id)
);

-- Códigos de un solo uso para dar acceso a la app. Sirven para dos cosas:
-- - dar de alta a un propietario en una vivienda concreta (vivienda_id)
-- - invitar a un empleado a un despacho con unos permisos iniciales (administracion_id + permisos)
-- Exactamente uno de los dos destinos debe estar informado.
create table if not exists codigos_acceso (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  vivienda_id uuid references viviendas (id),
  administracion_id uuid references administraciones (id),
  permisos jsonb,
  usado boolean not null default false,
  usado_por uuid references profiles (id),
  creado_por uuid not null references profiles (id),
  expira_en timestamptz,
  created_at timestamptz not null default now(),
  constraint codigo_un_solo_destino check (
    (vivienda_id is not null and administracion_id is null)
    or (vivienda_id is null and administracion_id is not null)
  )
);

-- ============================================================
-- FUNCIONES AUXILIARES (security definer: evitan recursión de RLS)
-- ============================================================

create or replace function administracion_de_comunidad(cid uuid)
returns uuid language sql stable security definer as $$
  select administracion_id from comunidades where id = cid;
$$;

create or replace function es_super_admin_administracion(aid uuid)
returns boolean language sql stable security definer as $$
  select exists (select 1 from administraciones where id = aid and propietario_id = auth.uid());
$$;

create or replace function permisos_empleado(aid uuid)
returns jsonb language sql stable security definer as $$
  select permisos from empleados
  where administracion_id = aid and profile_id = auth.uid() and activo
  limit 1;
$$;

-- Nivel de permiso del usuario actual sobre un módulo de una comunidad.
-- 'editar' > 'ver' > null. El titular del despacho (super_admin) siempre tiene 'editar'.
create or replace function nivel_permiso(cid uuid, modulo text)
returns text language sql stable security definer as $$
  select case
    when es_super_admin_administracion(administracion_de_comunidad(cid)) then 'editar'
    else permisos_empleado(administracion_de_comunidad(cid)) ->> modulo
  end;
$$;

create or replace function puede_ver(cid uuid, modulo text)
returns boolean language sql stable security definer as $$
  select nivel_permiso(cid, modulo) in ('ver', 'editar');
$$;

create or replace function puede_editar(cid uuid, modulo text)
returns boolean language sql stable security definer as $$
  select nivel_permiso(cid, modulo) = 'editar';
$$;

-- Visibilidad general de "personal del despacho" sobre una comunidad (cualquier
-- módulo con al menos permiso de ver, o super_admin). Se usa para el SELECT general.
create or replace function es_personal_comunidad(cid uuid)
returns boolean language sql stable security definer as $$
  select es_super_admin_administracion(administracion_de_comunidad(cid))
    or permisos_empleado(administracion_de_comunidad(cid)) is not null;
$$;

create or replace function es_propietario_comunidad(cid uuid)
returns boolean language sql stable security definer as $$
  select exists (select 1 from viviendas where comunidad_id = cid and propietario_id = auth.uid());
$$;

create or replace function es_visible_comunidad(cid uuid)
returns boolean language sql stable security definer as $$
  select es_personal_comunidad(cid) or es_propietario_comunidad(cid);
$$;

create or replace function es_visible_junta(jid uuid)
returns boolean language sql stable security definer as $$
  select exists (select 1 from juntas j where j.id = jid and es_visible_comunidad(j.comunidad_id));
$$;

create or replace function comunidad_de_junta(jid uuid)
returns uuid language sql stable security definer as $$
  select comunidad_id from juntas where id = jid;
$$;

create or replace function es_visible_punto(pid uuid)
returns boolean language sql stable security definer as $$
  select exists (select 1 from puntos_orden_dia p where p.id = pid and es_visible_junta(p.junta_id));
$$;

create or replace function comunidad_de_punto(pid uuid)
returns uuid language sql stable security definer as $$
  select comunidad_de_junta(junta_id) from puntos_orden_dia where id = pid;
$$;

create or replace function es_mi_vivienda(vid uuid)
returns boolean language sql stable security definer as $$
  select exists (select 1 from viviendas where id = vid and propietario_id = auth.uid());
$$;

create or replace function comunidad_de_vivienda(vid uuid)
returns uuid language sql stable security definer as $$
  select comunidad_id from viviendas where id = vid;
$$;

create or replace function comunidad_de_tarea(tid uuid)
returns uuid language sql stable security definer as $$
  select comunidad_id from tareas_mantenimiento where id = tid;
$$;

create or replace function circular_es_para_mi(cid uuid)
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from circulares c
    where c.id = cid
    and (
      c.destinatarios = 'todos'
      or (
        c.destinatarios = 'bloque'
        and exists (
          select 1 from viviendas v
          where v.comunidad_id = c.comunidad_id and v.propietario_id = auth.uid() and v.bloque = c.bloque
        )
      )
      or (
        c.destinatarios = 'seleccion'
        and exists (
          select 1 from circulares_destinatarios cd
          join viviendas v on v.id = cd.vivienda_id
          where cd.circular_id = c.id and v.propietario_id = auth.uid()
        )
      )
    )
  );
$$;

-- ============================================================
-- RPC: abrir y cerrar votación de un punto del orden del día
-- ============================================================

create or replace function abrir_votacion(punto uuid)
returns void language plpgsql security definer as $$
declare
  v_junta uuid;
  v_comunidad uuid;
begin
  select junta_id into v_junta from puntos_orden_dia where id = punto;
  v_comunidad := comunidad_de_junta(v_junta);

  if not puede_editar(v_comunidad, 'juntas') then
    raise exception 'No tienes permiso para abrir la votación de este punto';
  end if;

  update puntos_orden_dia set estado = 'pendiente'
  where junta_id = v_junta and estado = 'en_votacion';

  update puntos_orden_dia set estado = 'en_votacion' where id = punto;
end;
$$;

create or replace function cerrar_votacion(punto uuid)
returns void language plpgsql security definer as $$
declare
  v_comunidad uuid;
  v_total numeric;
  v_favor numeric;
  v_contra numeric;
  v_abstencion numeric;
  v_votos integer;
begin
  v_comunidad := comunidad_de_punto(punto);

  if not puede_editar(v_comunidad, 'juntas') then
    raise exception 'No tienes permiso para cerrar la votación de este punto';
  end if;

  select coalesce(sum(coeficiente), 0) into v_total from viviendas where comunidad_id = v_comunidad;

  select
    coalesce(sum(case when v.opcion = 'a_favor' then vi.coeficiente else 0 end), 0),
    coalesce(sum(case when v.opcion = 'en_contra' then vi.coeficiente else 0 end), 0),
    coalesce(sum(case when v.opcion = 'abstencion' then vi.coeficiente else 0 end), 0),
    count(*)
  into v_favor, v_contra, v_abstencion, v_votos
  from votos v
  join viviendas vi on vi.id = v.vivienda_id
  where v.punto_id = punto;

  update puntos_orden_dia
  set estado = 'cerrado',
      resultado = jsonb_build_object(
        'votos_emitidos', v_votos,
        'coeficiente_a_favor', v_favor,
        'coeficiente_en_contra', v_contra,
        'coeficiente_abstencion', v_abstencion,
        'coeficiente_total', v_total,
        'aprobado', v_favor > v_contra
      )
  where id = punto;
end;
$$;

-- ============================================================
-- RPC: redimir un código de acceso (propietario o empleado)
-- ============================================================

create or replace function redimir_codigo_acceso(codigo_input text)
returns void language plpgsql security definer as $$
declare
  v_codigo codigos_acceso;
begin
  select * into v_codigo from codigos_acceso
  where codigo = codigo_input and not usado and (expira_en is null or expira_en > now())
  limit 1;

  if v_codigo.id is null then
    raise exception 'Código inválido o ya utilizado';
  end if;

  if v_codigo.vivienda_id is not null then
    update viviendas set propietario_id = auth.uid() where id = v_codigo.vivienda_id;
    update profiles set rol = 'propietario' where id = auth.uid();
  else
    insert into empleados (administracion_id, profile_id, permisos, activo)
    values (v_codigo.administracion_id, auth.uid(), coalesce(v_codigo.permisos, '{}'::jsonb), true)
    on conflict (administracion_id, profile_id) do update
      set permisos = excluded.permisos, activo = true;
    update profiles set rol = 'empleado' where id = auth.uid();
  end if;

  update codigos_acceso set usado = true, usado_por = auth.uid() where id = v_codigo.id;
end;
$$;

-- ============================================================
-- RLS
-- ============================================================

alter table profiles enable row level security;
alter table administraciones enable row level security;
alter table empleados enable row level security;
alter table comunidades enable row level security;
alter table viviendas enable row level security;
alter table incidencias enable row level security;
alter table cuotas enable row level security;
alter table documentos enable row level security;
alter table juntas enable row level security;
alter table puntos_orden_dia enable row level security;
alter table asistentes enable row level security;
alter table votos enable row level security;
alter table codigos_acceso enable row level security;
alter table circulares enable row level security;
alter table circulares_destinatarios enable row level security;
alter table tareas_mantenimiento enable row level security;
alter table tareas_mantenimiento_registros enable row level security;

-- profiles
create policy "ver mi perfil o el de mi comunidad/despacho" on profiles for select
  using (
    id = auth.uid()
    or exists (
      select 1 from viviendas v where v.propietario_id = profiles.id and es_visible_comunidad(v.comunidad_id)
    )
    or exists (
      select 1 from empleados e where e.profile_id = profiles.id and es_super_admin_administracion(e.administracion_id)
    )
  );
create policy "actualizar mi propio perfil" on profiles for update using (id = auth.uid());
create policy "crear mi propio perfil" on profiles for insert with check (id = auth.uid());

-- administraciones
create policy "ver mi despacho" on administraciones for select
  using (
    propietario_id = auth.uid()
    or exists (select 1 from empleados e where e.administracion_id = administraciones.id and e.profile_id = auth.uid())
  );
create policy "crear mi despacho" on administraciones for insert with check (propietario_id = auth.uid());
create policy "el titular edita su despacho" on administraciones for update using (propietario_id = auth.uid());

-- empleados
create policy "ver empleados de mi despacho" on empleados for select
  using (
    es_super_admin_administracion(administracion_id)
    or profile_id = auth.uid()
  );
create policy "el titular gestiona empleados" on empleados for all
  using (es_super_admin_administracion(administracion_id))
  with check (es_super_admin_administracion(administracion_id));

-- comunidades
create policy "ver comunidades propias o administradas" on comunidades for select
  using (es_visible_comunidad(id));
create policy "gestionar comunidades con permiso" on comunidades for insert
  with check (puede_editar(id, 'comunidades') or es_super_admin_administracion(administracion_id));
create policy "editar comunidades con permiso" on comunidades for update
  using (puede_editar(id, 'comunidades'));

-- viviendas
create policy "ver viviendas de mi comunidad" on viviendas for select
  using (es_visible_comunidad(comunidad_id));
create policy "gestionar viviendas con permiso" on viviendas for all
  using (puede_editar(comunidad_id, 'comunidades'))
  with check (puede_editar(comunidad_id, 'comunidades'));

-- incidencias
create policy "ver incidencias de mi comunidad" on incidencias for select
  using (es_visible_comunidad(comunidad_id));
create policy "crear incidencias en mi comunidad" on incidencias for insert
  with check (es_visible_comunidad(comunidad_id) and creado_por = auth.uid());
create policy "gestionar incidencias con permiso" on incidencias for update
  using (puede_editar(comunidad_id, 'incidencias'));

-- cuotas
create policy "ver mis cuotas o las de mi comunidad" on cuotas for select
  using (puede_ver(comunidad_id, 'cuotas') or es_mi_vivienda(vivienda_id));
create policy "gestionar cuotas con permiso" on cuotas for all
  using (puede_editar(comunidad_id, 'cuotas'))
  with check (puede_editar(comunidad_id, 'cuotas'));

-- documentos
create policy "ver documentos de mi comunidad" on documentos for select
  using (es_visible_comunidad(comunidad_id));
create policy "gestionar documentos con permiso" on documentos for insert
  with check (puede_editar(comunidad_id, 'documentos'));

-- juntas
create policy "ver juntas de mi comunidad" on juntas for select
  using (es_visible_comunidad(comunidad_id));
create policy "convocar juntas con permiso" on juntas for insert
  with check (puede_editar(comunidad_id, 'juntas') and creado_por = auth.uid());
create policy "gestionar juntas con permiso" on juntas for update
  using (puede_editar(comunidad_id, 'juntas'));

-- puntos_orden_dia
create policy "ver orden del dia de juntas visibles" on puntos_orden_dia for select
  using (es_visible_junta(junta_id));
create policy "gestionar orden del dia con permiso" on puntos_orden_dia for all
  using (puede_editar(comunidad_de_junta(junta_id), 'juntas'))
  with check (puede_editar(comunidad_de_junta(junta_id), 'juntas'));

-- asistentes
create policy "ver asistentes de juntas visibles" on asistentes for select
  using (es_visible_junta(junta_id));
create policy "registrar mi propia asistencia" on asistentes for insert
  with check (
    es_visible_junta(junta_id)
    and propietario_id = auth.uid()
    and es_mi_vivienda(vivienda_id)
  );

-- votos
create policy "ver votos de puntos visibles" on votos for select
  using (es_visible_punto(punto_id));
create policy "votar con mi propia vivienda" on votos for insert
  with check (
    propietario_id = auth.uid()
    and es_mi_vivienda(vivienda_id)
    and exists (select 1 from puntos_orden_dia p where p.id = punto_id and p.estado = 'en_votacion')
    and exists (select 1 from viviendas v where v.id = vivienda_id and v.derecho_voto)
  );

-- codigos_acceso
create policy "ver codigos que he creado o de mi despacho" on codigos_acceso for select
  using (
    creado_por = auth.uid()
    or (vivienda_id is not null and puede_ver(comunidad_de_vivienda(vivienda_id), 'comunidades'))
    or (administracion_id is not null and es_super_admin_administracion(administracion_id))
  );
create policy "crear codigos de vivienda con permiso" on codigos_acceso for insert
  with check (
    creado_por = auth.uid()
    and (
      (vivienda_id is not null and puede_editar(comunidad_de_vivienda(vivienda_id), 'comunidades'))
      or (administracion_id is not null and es_super_admin_administracion(administracion_id))
    )
  );

-- proveedores
alter table proveedores enable row level security;

create policy "ver proveedores de mi despacho" on proveedores for select
  using (
    es_super_admin_administracion(administracion_id)
    or permisos_empleado(administracion_id) is not null
  );
create policy "gestionar proveedores con permiso" on proveedores for all
  using (
    es_super_admin_administracion(administracion_id)
    or permisos_empleado(administracion_id) ->> 'comunidades' = 'editar'
  )
  with check (
    es_super_admin_administracion(administracion_id)
    or permisos_empleado(administracion_id) ->> 'comunidades' = 'editar'
  );

-- circulares
create policy "ver circulares de mi comunidad o dirigidas a mi" on circulares for select
  using (es_personal_comunidad(comunidad_id) or circular_es_para_mi(id));
create policy "enviar circulares con permiso" on circulares for insert
  with check (puede_editar(comunidad_id, 'comunidades') and creado_por = auth.uid());

-- circulares_destinatarios
create policy "ver destinatarios de circulares que administro" on circulares_destinatarios for select
  using (exists (select 1 from circulares c where c.id = circular_id and es_personal_comunidad(c.comunidad_id)));
create policy "asignar destinatarios con permiso" on circulares_destinatarios for insert
  with check (exists (select 1 from circulares c where c.id = circular_id and puede_editar(c.comunidad_id, 'comunidades')));

-- tareas_mantenimiento
create policy "ver tareas de mantenimiento de mi comunidad" on tareas_mantenimiento for select
  using (es_visible_comunidad(comunidad_id));
create policy "gestionar tareas de mantenimiento con permiso" on tareas_mantenimiento for all
  using (puede_editar(comunidad_id, 'mantenimiento'))
  with check (puede_editar(comunidad_id, 'mantenimiento'));

-- tareas_mantenimiento_registros
create policy "ver registros de tareas de mi comunidad" on tareas_mantenimiento_registros for select
  using (es_visible_comunidad(comunidad_de_tarea(tarea_id)));
create policy "gestionar registros de tareas con permiso" on tareas_mantenimiento_registros for all
  using (puede_editar(comunidad_de_tarea(tarea_id), 'mantenimiento'))
  with check (puede_editar(comunidad_de_tarea(tarea_id), 'mantenimiento'));

-- ============================================================
-- STORAGE: bucket de documentos
-- ============================================================

insert into storage.buckets (id, name, public)
values ('documentos', 'documentos', true)
on conflict (id) do nothing;

create policy "leer documentos públicamente" on storage.objects for select
  using (bucket_id = 'documentos');

create policy "subir documentos con permiso" on storage.objects for insert
  with check (
    bucket_id = 'documentos'
    and puede_editar((storage.foldername(name))[1]::uuid, 'documentos')
  );

-- ============================================================
-- STORAGE: bucket de fotos de incidencias
-- ============================================================

insert into storage.buckets (id, name, public)
values ('incidencias', 'incidencias', true)
on conflict (id) do nothing;

create policy "leer fotos de incidencias públicamente" on storage.objects for select
  using (bucket_id = 'incidencias');

create policy "subir foto de incidencia si veo la comunidad" on storage.objects for insert
  with check (
    bucket_id = 'incidencias'
    and es_visible_comunidad((storage.foldername(name))[1]::uuid)
  );
