-- ============================================================
-- SIGAM Trazabilidad — Migration P1
-- Execute this in the Supabase SQL Editor.
-- ============================================================

-- DIMENSIONES --------------------------------------------------

create table establecimientos (
  codigo text primary key,
  nombre text,
  lat numeric(10,7),
  lng numeric(10,7),
  coordenadas_dms text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table proprietarios (
  codigo text primary key,
  razon_social text,
  ruc text,
  tipo text check (tipo in ('persona','empresa')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table establecimiento_proprietarios (
  establecimiento_codigo text references establecimientos(codigo) on delete cascade,
  proprietario_codigo text references proprietarios(codigo) on delete cascade,
  primary key (establecimiento_codigo, proprietario_codigo)
);

-- TRANSACCIONALES ---------------------------------------------

create table guias (
  guia_nro text primary key,
  cota text,
  fecha_emision date,
  proprietario_origen_codigo text references proprietarios(codigo),
  establecimiento_origen_codigo text references establecimientos(codigo),
  proprietario_destino_codigo text references proprietarios(codigo),
  establecimiento_destino_codigo text references establecimientos(codigo),
  finalidad text,
  composicion jsonb,
  cantidad_total int,
  qr_payload_bruto text,
  escaneada_at timestamptz default now(),
  escaneada_lat numeric(10,7),
  escaneada_lng numeric(10,7),
  escaneada_por uuid references auth.users(id)
);

create table sesiones (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('EGRESO','INGRESO')),
  guia_nro text not null references guias(guia_nro),
  chapa text,
  transportista text,
  precintos text[],
  animales_sin_boton int default 0 check (animales_sin_boton >= 0),
  cerrada_at timestamptz not null,
  fonte text default 'upload_manual',
  payload_bruto jsonb,
  created_at timestamptz default now(),
  unique (tipo, guia_nro)
);
create index on sesiones (guia_nro);

create table sesion_lecturas (
  sesion_id uuid not null references sesiones(id) on delete cascade,
  eid text not null,
  tipo_eid text generated always as (
    case
      when eid like '600010%' then 'SIAP'
      when eid like '98%'     then 'INTERNO'
      else 'DESCONOCIDO'
    end
  ) stored,
  origen_lectura text not null default 'bastao'
    check (origen_lectura in ('bastao','manual_caravana')),
  leido_at timestamptz,
  primary key (sesion_id, eid)
);
create index on sesion_lecturas (eid);
create index on sesion_lecturas (tipo_eid);
create index on sesion_lecturas (sesion_id, origen_lectura);

create table conferencias (
  id uuid primary key default gen_random_uuid(),
  guia_nro text not null unique references guias(guia_nro),
  sesion_origen_id uuid references sesiones(id),
  sesion_destino_id uuid references sesiones(id),
  estado text not null default 'PENDIENTE'
    check (estado in ('PENDIENTE','OK','DISCREPANCIA','RESUELTA')),
  total_origen int,
  total_destino int,
  eids_origen text[],
  eids_destino text[],
  discrepancias jsonb default '[]'::jsonb,
  verificada_por uuid references auth.users(id),
  verificada_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- RPC: buscar_eid_por_caravana
-- Reconstruye EID completo a partir de la terminación visual.
-- ============================================================
create or replace function buscar_eid_por_caravana(
  p_guia_nro text,
  p_caravana_terminacion text
)
returns table(eid text, tipo_eid text, match_count int)
language plpgsql
security definer
as $$
declare
  v_sesion_origen_id uuid;
begin
  select s.id into v_sesion_origen_id
  from sesiones s
  where s.guia_nro = p_guia_nro and s.tipo = 'EGRESO';

  if v_sesion_origen_id is null then
    return;
  end if;

  return query
  select sl.eid, sl.tipo_eid, count(*) over ()::int as match_count
  from sesion_lecturas sl
  where sl.sesion_id = v_sesion_origen_id
    and sl.eid like '%' || p_caravana_terminacion;
end $$;

-- ============================================================
-- RPC: conciliar — idempotente
-- ============================================================
create or replace function conciliar(p_guia_nro text)
returns conferencias
language plpgsql
security definer
as $$
declare
  v_origen  sesiones;
  v_destino sesiones;
  v_guia    guias;
  v_conf    conferencias;
  v_eids_solo_origen text[];
  v_eids_boton_perdido text[];
  v_eids_faltante text[];
  v_eids_extras text[];
  v_total_origen int;
  v_total_destino_lido int;
  v_total_destino_fisico int;
  v_discrep jsonb := '[]'::jsonb;
begin
  select * into v_guia    from guias    where guia_nro = p_guia_nro;
  select * into v_origen  from sesiones where guia_nro = p_guia_nro and tipo = 'EGRESO';
  select * into v_destino from sesiones where guia_nro = p_guia_nro and tipo = 'INGRESO';

  -- PENDIENTE si falta alguna sesión
  if v_origen is null or v_destino is null then
    insert into conferencias (guia_nro, sesion_origen_id, sesion_destino_id, estado)
    values (p_guia_nro, v_origen.id, v_destino.id, 'PENDIENTE')
    on conflict (guia_nro) do update
      set sesion_origen_id  = coalesce(excluded.sesion_origen_id,  conferencias.sesion_origen_id),
          sesion_destino_id = coalesce(excluded.sesion_destino_id, conferencias.sesion_destino_id),
          estado = 'PENDIENTE',
          updated_at = now()
    returning * into v_conf;
    return v_conf;
  end if;

  -- Conteos
  select count(*) into v_total_origen        from sesion_lecturas where sesion_id = v_origen.id;
  select count(*) into v_total_destino_lido  from sesion_lecturas where sesion_id = v_destino.id;
  v_total_destino_fisico := v_total_destino_lido + coalesce(v_destino.animales_sin_boton, 0);

  -- EIDs solo en EO (no llegaron a destino)
  select array_agg(eid order by eid) into v_eids_solo_origen from (
    select eid from sesion_lecturas where sesion_id = v_origen.id
    except
    select eid from sesion_lecturas where sesion_id = v_destino.id
  ) s;

  -- BOTON_PERDIDO_TRANSITO: EIDs en EO y en ED, donde la lectura en ED fue manual_caravana
  select array_agg(sl_eo.eid order by sl_eo.eid) into v_eids_boton_perdido
  from sesion_lecturas sl_eo
  join sesion_lecturas sl_ed
    on sl_ed.eid = sl_eo.eid
   and sl_ed.sesion_id = v_destino.id
   and sl_ed.origen_lectura = 'manual_caravana'
  where sl_eo.sesion_id = v_origen.id;

  -- EID_FALTANTE: EIDs de origen que no aparecen en destino ni siquiera por caravana
  v_eids_faltante := v_eids_solo_origen;

  -- EID_EXTRA: sólo en destino
  select array_agg(eid order by eid) into v_eids_extras from (
    select eid from sesion_lecturas where sesion_id = v_destino.id
    except
    select eid from sesion_lecturas where sesion_id = v_origen.id
  ) s;

  -- Construir jsonb de discrepancias
  if v_eids_faltante is not null then
    v_discrep := v_discrep || (
      select coalesce(jsonb_agg(jsonb_build_object(
        'tipo','EID_FALTANTE','eid',eid,'resuelta',false
      )), '[]'::jsonb)
      from unnest(v_eids_faltante) eid
    );
  end if;

  if v_eids_extras is not null then
    v_discrep := v_discrep || (
      select coalesce(jsonb_agg(jsonb_build_object(
        'tipo','EID_EXTRA','eid',eid,'resuelta',false
      )), '[]'::jsonb)
      from unnest(v_eids_extras) eid
    );
  end if;

  if v_eids_boton_perdido is not null then
    v_discrep := v_discrep || (
      select coalesce(jsonb_agg(jsonb_build_object(
        'tipo','BOTON_PERDIDO_TRANSITO','eid',eid,'resuelta',false
      )), '[]'::jsonb)
      from unnest(v_eids_boton_perdido) eid
    );
  end if;

  -- Conteo físico vs guía
  if v_guia.cantidad_total is not null and v_total_destino_fisico <> v_guia.cantidad_total then
    v_discrep := v_discrep || jsonb_build_array(jsonb_build_object(
      'tipo','CONTAGEM_FISICA_DIVERGENTE',
      'detalle', jsonb_build_object(
        'declarado_guia', v_guia.cantidad_total,
        'origen_lido',    v_total_origen,
        'destino_lido',   v_total_destino_lido,
        'destino_fisico', v_total_destino_fisico
      ),
      'resuelta', false
    ));
  end if;

  -- Precintos como conjunto
  if (select array(select unnest(v_origen.precintos) order by 1))
     is distinct from
     (select array(select unnest(v_destino.precintos) order by 1)) then
    v_discrep := v_discrep || jsonb_build_array(jsonb_build_object(
      'tipo','PRECINTO_DIVERGENTE',
      'detalle', jsonb_build_object('origen', v_origen.precintos, 'destino', v_destino.precintos),
      'resuelta', false
    ));
  end if;

  -- Chapa normalizada
  if regexp_replace(lower(coalesce(v_origen.chapa,'')), '\s+', '', 'g')
     <> regexp_replace(lower(coalesce(v_destino.chapa,'')), '\s+', '', 'g') then
    v_discrep := v_discrep || jsonb_build_array(jsonb_build_object(
      'tipo','CHAPA_DIVERGENTE',
      'detalle', jsonb_build_object('origen', v_origen.chapa, 'destino', v_destino.chapa),
      'resuelta', false
    ));
  end if;

  -- Transportista normalizado
  if regexp_replace(lower(coalesce(v_origen.transportista,'')), '\s+', '', 'g')
     <> regexp_replace(lower(coalesce(v_destino.transportista,'')), '\s+', '', 'g') then
    v_discrep := v_discrep || jsonb_build_array(jsonb_build_object(
      'tipo','TRANSPORTISTA_DIVERGENTE',
      'detalle', jsonb_build_object('origen', v_origen.transportista, 'destino', v_destino.transportista),
      'resuelta', false
    ));
  end if;

  -- Upsert conferencia
  insert into conferencias (
    guia_nro, sesion_origen_id, sesion_destino_id,
    estado, total_origen, total_destino,
    eids_origen, eids_destino, discrepancias
  )
  values (
    p_guia_nro, v_origen.id, v_destino.id,
    case when jsonb_array_length(v_discrep) = 0 then 'OK' else 'DISCREPANCIA' end,
    v_total_origen, v_total_destino_lido,
    (select array_agg(eid order by eid) from sesion_lecturas where sesion_id = v_origen.id),
    (select array_agg(eid order by eid) from sesion_lecturas where sesion_id = v_destino.id),
    v_discrep
  )
  on conflict (guia_nro) do update
    set sesion_origen_id  = excluded.sesion_origen_id,
        sesion_destino_id = excluded.sesion_destino_id,
        estado            = excluded.estado,
        total_origen      = excluded.total_origen,
        total_destino     = excluded.total_destino,
        eids_origen       = excluded.eids_origen,
        eids_destino      = excluded.eids_destino,
        discrepancias     = excluded.discrepancias,
        updated_at        = now()
  returning * into v_conf;

  return v_conf;
end $$;

-- ============================================================
-- Trigger
-- ============================================================
create or replace function trigger_conciliar()
returns trigger language plpgsql as $$
begin
  perform conciliar(new.guia_nro);
  return new;
end $$;

create trigger sesiones_after_insert_update
after insert or update on sesiones
for each row execute function trigger_conciliar();

create or replace function trigger_conciliar_por_lectura()
returns trigger language plpgsql as $$
declare v_guia text;
begin
  select guia_nro into v_guia from sesiones where id = new.sesion_id;
  perform conciliar(v_guia);
  return new;
end $$;

create trigger sesion_lecturas_after_insert
after insert on sesion_lecturas
for each row execute function trigger_conciliar_por_lectura();

-- ============================================================
-- RLS
-- ============================================================
alter table establecimientos enable row level security;
alter table proprietarios enable row level security;
alter table establecimiento_proprietarios enable row level security;
alter table guias enable row level security;
alter table sesiones enable row level security;
alter table sesion_lecturas enable row level security;
alter table conferencias enable row level security;

create policy "auth_all" on establecimientos for all using (auth.role() = 'authenticated');
create policy "auth_all" on proprietarios for all using (auth.role() = 'authenticated');
create policy "auth_all" on establecimiento_proprietarios for all using (auth.role() = 'authenticated');
create policy "auth_all" on guias for all using (auth.role() = 'authenticated');
create policy "auth_all" on sesiones for all using (auth.role() = 'authenticated');
create policy "auth_all" on sesion_lecturas for all using (auth.role() = 'authenticated');
create policy "auth_all" on conferencias for all using (auth.role() = 'authenticated');
