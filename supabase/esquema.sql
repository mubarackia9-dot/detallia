-- Esquema aplicado en Supabase (migración "esquema_inicial_detallia")
-- Tablas: negocios, materiales, clientes, fechas_especiales, pedidos, pedido_items, movimientos
-- Todas con Row Level Security: cada usuaria solo puede leer y modificar sus propios registros.

create table public.negocios (
  user_id uuid primary key references auth.users(id) on delete cascade default auth.uid(),
  nombre text not null default 'Mi negocio', telefono text,
  margen_defecto numeric(5,2) not null default 35,
  mano_obra_defecto numeric(12,2) not null default 10000,
  domicilio_defecto numeric(12,2) not null default 5000,
  created_at timestamptz not null default now());
create table public.materiales (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  nombre text not null, categoria text not null default 'Otros', unidad text not null default 'unidad',
  costo_unitario numeric(12,2) not null default 0 check (costo_unitario >= 0),
  stock numeric(12,2) not null default 0, created_at timestamptz not null default now());
create table public.clientes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  nombre text not null, telefono text, notas text, created_at timestamptz not null default now());
create table public.fechas_especiales (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  ocasion text not null, para_quien text,
  mes smallint not null check (mes between 1 and 12), dia smallint not null check (dia between 1 and 31),
  created_at timestamptz not null default now());
create table public.pedidos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  cliente_id uuid references public.clientes(id) on delete set null,
  titulo text not null, ocasion text, fecha_entrega date, hora_entrega text, direccion text, mensaje_tarjeta text,
  mano_obra numeric(12,2) not null default 0, domicilio numeric(12,2) not null default 0,
  margen numeric(5,2) not null default 35, costo_materiales numeric(12,2) not null default 0,
  precio_venta numeric(12,2) not null default 0,
  estado text not null default 'cotizado' check (estado in ('cotizado','confirmado','entregado','cancelado')),
  pagado boolean not null default false, medio_pago text, created_at timestamptz not null default now());
create table public.pedido_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  pedido_id uuid not null references public.pedidos(id) on delete cascade,
  material_id uuid references public.materiales(id) on delete set null,
  nombre text not null, cantidad numeric(12,2) not null default 1 check (cantidad > 0),
  costo_unitario numeric(12,2) not null default 0);
create table public.movimientos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  tipo text not null check (tipo in ('venta','compra','gasto')),
  monto numeric(12,2) not null check (monto >= 0), descripcion text, medio_pago text,
  fecha date not null default current_date,
  pedido_id uuid references public.pedidos(id) on delete set null,
  created_at timestamptz not null default now());

do $$
declare t text;
begin
  foreach t in array array['negocios','materiales','clientes','fechas_especiales','pedidos','pedido_items','movimientos'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "propios_select" on public.%I for select to authenticated using ((select auth.uid()) = user_id)', t);
    execute format('create policy "propios_insert" on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)', t);
    execute format('create policy "propios_update" on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
    execute format('create policy "propios_delete" on public.%I for delete to authenticated using ((select auth.uid()) = user_id)', t);
  end loop;
end $$;
