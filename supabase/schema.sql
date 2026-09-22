-- AGP Fincas — esquema inicial de base de datos (Supabase / Postgres)
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
  rol text not null default 'propietario' check (rol in ('admin', 'propietario')),
  created_at timestamptz not null default now()
);

create table if not exists comunidades (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  direccion text not null,
  cif text,
  administrador_id uuid not null references profiles (id),
  created_at timestamptz not null default now()
);

create table if not exists viviendas (
  id uuid primary key default gen_random_uuid(),
  comunidad_id uuid not null references comunidades (id) on delete cascade,
  propietario_id uuid references profiles (id),
  identificador text not null,
  coeficiente numeric(6, 4) not null default 0,
  derecho_voto boolean not null default true,
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
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
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

-- ============================================================
-- FUNCIONES AUXILIARES (security definer: evitan recursión de RLS)
-- ============================================================

create or replace function es_admin_comunidad(cid uuid)
returns boolean language sql stable security definer as $$
  select exists (select 1 from comunidades where id = cid and administrador_id = auth.uid());
$$;

create or replace function es_propietario_comunidad(cid uuid)
returns boolean language sql stable security definer as $$
  select exists (select 1 from viviendas where comunidad_id = cid and propietario_id = auth.uid());
$$;

create or replace function es_visible_comunidad(cid uuid)
returns boolean language sql stable security definer as $$
  select es_admin_comunidad(cid) or es_propietario_comunidad(cid);
$$;

create or replace function es_visible_junta(jid uuid)
returns boolean language sql stable security definer as $$
  select exists (select 1 from juntas j where j.id = jid and es_visible_comunidad(j.comunidad_id));
$$;

create or replace function es_admin_junta(jid uuid)
returns boolean language sql stable security definer as $$
  select exists (select 1 from juntas j where j.id = jid and es_admin_comunidad(j.comunidad_id));
$$;

create or replace function es_visible_punto(pid uuid)
returns boolean language sql stable security definer as $$
  select exists (select 1 from puntos_orden_dia p where p.id = pid and es_visible_junta(p.junta_id));
$$;

create or replace function es_admin_punto(pid uuid)
returns boolean language sql stable security definer as $$
  select exists (select 1 from puntos_orden_dia p where p.id = pid and es_admin_junta(p.junta_id));
$$;

create or replace function es_mi_vivienda(vid uuid)
returns boolean language sql stable security definer as $$
  select exists (select 1 from viviendas where id = vid and propietario_id = auth.uid());
$$;

-- ============================================================
-- RPC: abrir y cerrar votación de un punto del orden del día
-- ============================================================

create or replace function abrir_votacion(punto uuid)
returns void language plpgsql security definer as $$
begin
  if not es_admin_punto(punto) then
    raise exception 'Solo el administrador de la comunidad puede abrir una votación';
  end if;

  update puntos_orden_dia set estado = 'pendiente'
  where junta_id = (select junta_id from puntos_orden_dia where id = punto)
    and estado = 'en_votacion';

  update puntos_orden_dia set estado = 'en_votacion' where id = punto;
end;
$$;

create or replace function cerrar_votacion(punto uuid)
returns void language plpgsql security definer as $$
declare
  v_total numeric;
  v_favor numeric;
  v_contra numeric;
  v_abstencion numeric;
  v_votos integer;
begin
  if not es_admin_punto(punto) then
    raise exception 'Solo el administrador de la comunidad puede cerrar una votación';
  end if;

  select coalesce(sum(coeficiente), 0) into v_total
  from viviendas
  where comunidad_id = (
    select j.comunidad_id from juntas j
    join puntos_orden_dia p on p.junta_id = j.id
    where p.id = punto
  );

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
-- RLS
-- ============================================================

alter table profiles enable row level security;
alter table comunidades enable row level security;
alter table viviendas enable row level security;
alter table incidencias enable row level security;
alter table cuotas enable row level security;
alter table documentos enable row level security;
alter table juntas enable row level security;
alter table puntos_orden_dia enable row level security;
alter table asistentes enable row level security;
alter table votos enable row level security;

-- profiles
create policy "ver mi perfil o el de mis vecinos/administrados" on profiles for select
  using (
    id = auth.uid()
    or exists (
      select 1 from viviendas v join comunidades c on c.id = v.comunidad_id
      where v.propietario_id = profiles.id and c.administrador_id = auth.uid()
    )
  );
create policy "actualizar mi propio perfil" on profiles for update using (id = auth.uid());
create policy "crear mi propio perfil" on profiles for insert with check (id = auth.uid());

-- comunidades
create policy "ver comunidades propias o administradas" on comunidades for select
  using (es_visible_comunidad(id));
create policy "el administrador crea comunidades" on comunidades for insert
  with check (administrador_id = auth.uid());
create policy "el administrador edita su comunidad" on comunidades for update
  using (administrador_id = auth.uid());

-- viviendas
create policy "ver viviendas de mi comunidad" on viviendas for select
  using (es_visible_comunidad(comunidad_id));
create policy "el administrador gestiona viviendas" on viviendas for all
  using (es_admin_comunidad(comunidad_id)) with check (es_admin_comunidad(comunidad_id));

-- incidencias
create policy "ver incidencias de mi comunidad" on incidencias for select
  using (es_visible_comunidad(comunidad_id));
create policy "crear incidencias en mi comunidad" on incidencias for insert
  with check (es_visible_comunidad(comunidad_id) and creado_por = auth.uid());
create policy "el administrador actualiza incidencias" on incidencias for update
  using (es_admin_comunidad(comunidad_id));

-- cuotas
create policy "el administrador ve todas las cuotas" on cuotas for select
  using (es_admin_comunidad(comunidad_id) or es_mi_vivienda(vivienda_id));
create policy "el administrador gestiona cuotas" on cuotas for all
  using (es_admin_comunidad(comunidad_id)) with check (es_admin_comunidad(comunidad_id));

-- documentos
create policy "ver documentos de mi comunidad" on documentos for select
  using (es_visible_comunidad(comunidad_id));
create policy "el administrador sube documentos" on documentos for insert
  with check (es_admin_comunidad(comunidad_id));

-- juntas
create policy "ver juntas de mi comunidad" on juntas for select
  using (es_visible_comunidad(comunidad_id));
create policy "el administrador convoca juntas" on juntas for insert
  with check (es_admin_comunidad(comunidad_id) and creado_por = auth.uid());
create policy "el administrador actualiza juntas" on juntas for update
  using (es_admin_comunidad(comunidad_id));

-- puntos_orden_dia
create policy "ver orden del dia de juntas visibles" on puntos_orden_dia for select
  using (es_visible_junta(junta_id));
create policy "el administrador gestiona el orden del dia" on puntos_orden_dia for all
  using (es_admin_junta(junta_id)) with check (es_admin_junta(junta_id));

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
    and exists (
      select 1 from puntos_orden_dia p
      where p.id = punto_id and p.estado = 'en_votacion'
    )
    and exists (select 1 from viviendas v where v.id = vivienda_id and v.derecho_voto)
  );

-- ============================================================
-- STORAGE: bucket de documentos
-- ============================================================

insert into storage.buckets (id, name, public)
values ('documentos', 'documentos', true)
on conflict (id) do nothing;

create policy "leer documentos públicamente" on storage.objects for select
  using (bucket_id = 'documentos');

create policy "el administrador sube documentos al storage" on storage.objects for insert
  with check (
    bucket_id = 'documentos'
    and es_admin_comunidad((storage.foldername(name))[1]::uuid)
  );
