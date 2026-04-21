-- ============================================================
-- SIGAM Trazabilidad — Migration P2
-- Auth: username + PIN, tabla operadores, RLS role-based
-- ============================================================

-- NOTA DE DISEÑO: en esta fase, todas las policies son "autenticado vs no
-- autenticado". La segregación por role y establecimientos_asignados se
-- implementará en una migration futura (P3 u otra) cuando el sistema tenga
-- múltiples capataces operando. Las funciones helper current_user_role(),
-- current_user_establecimientos() y user_can_see_guia() quedan disponibles
-- para uso futuro.

-- Función genérica para updated_at
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

-- Tabla operadores
create table operadores (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null check (username ~ '^[a-z0-9_.-]{3,32}$'),
  nombre_completo text not null,
  role text not null check (role in ('admin','trazabilidad','capataz')),
  establecimientos_asignados text[],
  activo boolean default true,
  pin_debe_cambiar boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create trigger operadores_updated_at
before update on operadores
for each row execute function set_updated_at();

create index on operadores (username);
create index on operadores (role);
create index on operadores (activo);

-- Helper: role del user actual (usado por frontend; reservado para RLS futura)
create or replace function current_user_role()
returns text language sql security definer stable as $$
  select role from operadores where id = auth.uid() and activo = true;
$$;

-- Helper: establecimientos permitidos del user actual (reservado para RLS futura)
create or replace function current_user_establecimientos()
returns text[] language sql security definer stable as $$
  select case
    when role in ('admin','trazabilidad') then null
    else establecimientos_asignados
  end
  from operadores where id = auth.uid() and activo = true;
$$;

-- Helper: ¿user puede ver esta guía? (reservado para RLS futura)
create or replace function user_can_see_guia(p_guia_nro text)
returns boolean language plpgsql security definer stable as $$
declare v_estabs text[];
declare v_guia guias;
begin
  v_estabs := current_user_establecimientos();
  if v_estabs is null then return true; end if;

  select * into v_guia from guias where guia_nro = p_guia_nro;
  if v_guia is null then return false; end if;

  return v_guia.establecimiento_origen_codigo = any(v_estabs)
      or v_guia.establecimiento_destino_codigo = any(v_estabs);
end;
$$;

-- RLS en operadores (únicas policies role-based activas en esta fase)
alter table operadores enable row level security;

create policy "operadores_admin_all" on operadores
  for all using (current_user_role() = 'admin');

create policy "operadores_self_read" on operadores
  for select using (id = auth.uid());

-- Reemplazar policies auth_all por policies "autenticado" (for all cubre SELECT).
-- Ver NOTA DE DISEÑO arriba.
drop policy if exists "auth_all" on establecimientos;
create policy "establecimientos_write" on establecimientos
  for all using (auth.uid() is not null);

drop policy if exists "auth_all" on proprietarios;
create policy "proprietarios_auth" on proprietarios
  for all using (auth.uid() is not null);

drop policy if exists "auth_all" on establecimiento_proprietarios;
create policy "estab_prop_auth" on establecimiento_proprietarios
  for all using (auth.uid() is not null);

drop policy if exists "auth_all" on guias;
create policy "guias_write" on guias
  for all using (auth.uid() is not null);

drop policy if exists "auth_all" on sesiones;
create policy "sesiones_write" on sesiones
  for all using (auth.uid() is not null);

drop policy if exists "auth_all" on sesion_lecturas;
create policy "sesion_lecturas_write" on sesion_lecturas
  for all using (auth.uid() is not null);

drop policy if exists "auth_all" on conferencias;
create policy "conferencias_write" on conferencias
  for all using (auth.uid() is not null);
