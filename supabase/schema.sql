-- RageNodes CMS + orders schema.
-- BIG WARNING:
-- These RLS policies are temporary for development only.
-- They allow anon select/insert/update/delete so the temporary admin panel can work.
-- Before production, replace them with Supabase Auth and admin-only policies.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.site_settings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  site_name text not null default 'RageNodes',
  discord_invite_url text not null default 'https://discord.gg/ragenodes',
  panel_url text not null default 'https://panel.ragenodes.cloud',
  billing_url text not null default 'https://billing.ragenodes.cloud',
  support_email text not null default 'support@ragenodes.cloud',
  currency text not null default 'USD',
  maintenance_mode boolean not null default false
);

create table if not exists public.homepage_content (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  hero_title text not null,
  hero_subtitle text not null,
  primary_button_text text not null,
  primary_button_url text not null,
  secondary_button_text text not null,
  secondary_button_url text not null,
  cta_title text not null,
  cta_subtitle text not null,
  cta_button_text text not null,
  cta_button_url text not null
);

create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  category text not null,
  price numeric(10,2) not null default 0,
  billing_cycle text not null default 'monthly',
  ram integer,
  cpu integer,
  vcpu integer,
  storage integer,
  backups integer,
  databases integer,
  ipv4_count integer,
  description text,
  features jsonb not null default '[]'::jsonb,
  is_popular boolean not null default false,
  is_active boolean not null default true,
  sort_order integer not null default 100,
  constraint plans_category_check check (category in ('Minecraft', 'Game Server', 'VPS', 'Custom'))
);

create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  slug text not null unique,
  category text not null default 'Other',
  description text not null default '',
  starting_price text not null default '$9.94/month',
  image_url text,
  is_active boolean not null default true,
  sort_order integer not null default 100,
  constraint games_category_check check (
    category in ('Sandbox', 'Survival', 'FPS', 'Simulation', 'RP', 'Strategy', 'Other')
  )
);

create table if not exists public.features (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  title text not null,
  description text not null default '',
  icon text not null default 'Zap',
  is_active boolean not null default true,
  sort_order integer not null default 100
);

create table if not exists public.faqs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  question text not null,
  answer text not null,
  category text not null default 'General',
  is_active boolean not null default true,
  sort_order integer not null default 100
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  full_name text not null,
  email text not null
);

alter table public.orders add column if not exists discord_username text;
alter table public.orders add column if not exists updated_at timestamptz not null default now();
alter table public.orders add column if not exists hosting_type text;
alter table public.orders add column if not exists selected_game text;
alter table public.orders add column if not exists selected_plan text;
alter table public.orders add column if not exists server_name text;
alter table public.orders add column if not exists ram integer;
alter table public.orders add column if not exists cpu integer;
alter table public.orders add column if not exists vcpu integer;
alter table public.orders add column if not exists storage integer;
alter table public.orders add column if not exists backups integer;
alter table public.orders add column if not exists extra_ports integer;
alter table public.orders add column if not exists minecraft_version text;
alter table public.orders add column if not exists server_software text;
alter table public.orders add column if not exists operating_system text;
alter table public.orders add column if not exists ipv4_count integer;
alter table public.orders add column if not exists payment_method text;
alter table public.orders add column if not exists estimated_price numeric(10,2);
alter table public.orders add column if not exists notes text;
alter table public.orders add column if not exists status text default 'Pending';

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'orders'
      and column_name = 'status'
      and udt_name = 'order_status'
  ) then
    alter table public.orders
      alter column status drop default,
      alter column status type text using status::text,
      alter column status set default 'Pending';
  end if;
end $$;

do $$
declare
  legacy_column text;
begin
  foreach legacy_column in array array[
    'discord_username',
    'server_name',
    'plan',
    'ram_gb',
    'ssd_gb',
    'cpu_percent',
    'minecraft_version',
    'server_software',
    'payment_method',
    'total_price'
  ]
  loop
    if exists (
      select 1 from information_schema.columns c
      where c.table_schema = 'public'
        and c.table_name = 'orders'
        and c.column_name = legacy_column
    ) then
      execute format('alter table public.orders alter column %I drop not null', legacy_column);
    end if;
  end loop;
end $$;

drop trigger if exists orders_validate_insert on public.orders;
drop function if exists public.validate_order_insert();

do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'orders' and column_name = 'plan') then
    update public.orders set selected_plan = coalesce(selected_plan, plan);
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'orders' and column_name = 'ram_gb') then
    update public.orders set ram = coalesce(ram, ram_gb);
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'orders' and column_name = 'ssd_gb') then
    update public.orders set storage = coalesce(storage, ssd_gb);
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'orders' and column_name = 'cpu_percent') then
    update public.orders set cpu = coalesce(cpu, cpu_percent);
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'orders' and column_name = 'total_price') then
    update public.orders set estimated_price = coalesce(estimated_price, total_price);
  end if;
end $$;

update public.orders
set
  hosting_type = coalesce(hosting_type, 'Minecraft'),
  selected_game = coalesce(selected_game, 'Minecraft'),
  status = case status
    when 'pending' then 'Pending'
    when 'contacted' then 'Contacted'
    when 'paid' then 'Paid'
    when 'created' then 'Server Created'
    when 'cancelled' then 'Cancelled'
    else coalesce(status, 'Pending')
  end;

alter table public.orders alter column hosting_type set default 'Custom';
alter table public.orders alter column status set default 'Pending';

alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check check (
  status in ('Pending', 'Contacted', 'Waiting Payment', 'Paid', 'Server Created', 'Cancelled')
);

alter table public.orders drop constraint if exists orders_hosting_type_check;
alter table public.orders add constraint orders_hosting_type_check check (
  hosting_type in ('Minecraft', 'Game Server', 'VPS', 'Custom')
);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'site_settings',
    'homepage_content',
    'plans',
    'games',
    'features',
    'faqs',
    'orders'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);

    execute format('drop trigger if exists %I on public.%I', table_name || '_set_updated_at', table_name);
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.set_updated_at()',
      table_name || '_set_updated_at',
      table_name
    );
  end loop;
end $$;

-- Temporary development policies.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'site_settings',
    'homepage_content',
    'plans',
    'games',
    'features',
    'faqs',
    'orders'
  ]
  loop
    execute format('drop policy if exists "Temporary anon select" on public.%I', table_name);
    execute format('drop policy if exists "Temporary anon insert" on public.%I', table_name);
    execute format('drop policy if exists "Temporary anon update" on public.%I', table_name);
    execute format('drop policy if exists "Temporary anon delete" on public.%I', table_name);

    execute format('create policy "Temporary anon select" on public.%I for select to anon using (true)', table_name);
    execute format('create policy "Temporary anon insert" on public.%I for insert to anon with check (true)', table_name);
    execute format('create policy "Temporary anon update" on public.%I for update to anon using (true) with check (true)', table_name);
    execute format('create policy "Temporary anon delete" on public.%I for delete to anon using (true)', table_name);
  end loop;
end $$;

drop policy if exists "Anyone can submit orders" on public.orders;
drop policy if exists "Admins can view all orders" on public.orders;
drop policy if exists "Admins can update orders" on public.orders;
drop policy if exists "Admins can delete orders" on public.orders;
drop policy if exists "Allow public order inserts" on public.orders;
drop policy if exists "Allow public read orders temporary" on public.orders;
drop policy if exists "Allow public update orders temporary" on public.orders;
drop policy if exists "Allow public delete orders temporary" on public.orders;

insert into public.site_settings (
  site_name,
  discord_invite_url,
  panel_url,
  billing_url,
  support_email,
  currency,
  maintenance_mode
)
select
  'RageNodes',
  'https://discord.gg/ragenodes',
  'https://panel.ragenodes.cloud',
  'https://billing.ragenodes.cloud',
  'support@ragenodes.cloud',
  'USD',
  false
where not exists (select 1 from public.site_settings);

insert into public.homepage_content (
  hero_title,
  hero_subtitle,
  primary_button_text,
  primary_button_url,
  secondary_button_text,
  secondary_button_url,
  cta_title,
  cta_subtitle,
  cta_button_text,
  cta_button_url
)
select
  'Powerful Game Server & VPS Hosting',
  'Deploy high-performance game servers and VPS instances on fast Ryzen hardware with DDR5 memory, NVMe SSDs, DDoS protection, and simple management.',
  'Start Building',
  '/builder',
  'View Games',
  '/games',
  'Ready to launch your server?',
  'Join RageNodes and deploy your next game server or VPS with powerful hardware and fast support.',
  'Order Now',
  '/order'
where not exists (select 1 from public.homepage_content);

insert into public.games (name, slug, category, description, starting_price, sort_order)
values
  ('Minecraft', 'minecraft', 'Sandbox', 'Vanilla, Paper, Purpur, Fabric, Forge, and modpack-ready worlds.', '$9.94/month', 1),
  ('Counter-Strike 2', 'counter-strike-2', 'FPS', 'Low-latency competitive servers for private matches and communities.', '$9.94/month', 2),
  ('Rust', 'rust', 'Survival', 'Persistent survival servers with fast storage for wipes and saves.', '$9.94/month', 3),
  ('ARK: Survival Evolved', 'ark-survival-evolved', 'Survival', 'Dino survival hosting with room for mods, maps, and backups.', '$9.94/month', 4),
  ('Palworld', 'palworld', 'Survival', 'Private Palworld servers with NVMe storage and DDoS protection.', '$9.94/month', 5),
  ('Valheim', 'valheim', 'Survival', 'Stable Viking survival worlds for friends and communities.', '$9.94/month', 6),
  ('DayZ', 'dayz', 'Survival', 'Survival communities with persistent storage and reliable uptime.', '$9.94/month', 7),
  ('Garry''s Mod', 'garrys-mod', 'Sandbox', 'Sandbox, DarkRP, TTT, and custom community server hosting.', '$9.94/month', 8),
  ('FiveM / GTA V RP', 'fivem-gta-v-rp', 'RP', 'Roleplay server hosting for custom scripts and communities.', '$9.94/month', 9),
  ('Terraria', 'terraria', 'Sandbox', 'Small, fast Terraria worlds with easy backups and restores.', '$9.94/month', 10)
on conflict (slug) do nothing;

do $$
begin
if not exists (select 1 from public.plans) then
insert into public.plans (
  name,
  category,
  price,
  billing_cycle,
  ram,
  cpu,
  vcpu,
  storage,
  backups,
  databases,
  ipv4_count,
  description,
  features,
  is_popular,
  sort_order
)
values
  ('Budget Game Server', 'Game Server', 9.94, 'monthly', 2, 100, null, 20, 1, 1, null, 'For small communities and lightweight servers', '["2GB DDR5 RAM","20GB NVMe SSD","100% Ryzen CPU","1 backup","1 database","DDoS protection"]'::jsonb, false, 1),
  ('Standard Game Server', 'Game Server', 18.31, 'monthly', 4, 150, null, 30, 2, 2, null, 'Balanced resources for most game servers', '["4GB DDR5 RAM","30GB NVMe SSD","150% Ryzen CPU","2 backups","2 databases","DDoS protection"]'::jsonb, true, 2),
  ('Premium Game Server', 'Game Server', 27.50, 'monthly', 6, 200, null, 50, 3, 3, null, 'Extra power for growing communities', '["6GB DDR5 RAM","50GB NVMe SSD","200% Ryzen CPU","3 backups","3 databases","DDoS protection"]'::jsonb, false, 3),
  ('Budget Minecraft', 'Minecraft', 9.94, 'monthly', 2, 100, null, 20, 1, 1, null, 'A clean start for small Minecraft servers', '["2GB DDR5 RAM","20GB NVMe SSD","100% Ryzen CPU","1 backup","1 database","DDoS protection"]'::jsonb, false, 20),
  ('Standard Minecraft', 'Minecraft', 18.31, 'monthly', 4, 150, null, 30, 2, 2, null, 'Most Popular for SMPs and friend groups', '["4GB DDR5 RAM","30GB NVMe SSD","150% Ryzen CPU","2 backups","2 databases","DDoS protection"]'::jsonb, true, 21),
  ('Premium Minecraft', 'Minecraft', 27.50, 'monthly', 6, 200, null, 50, 3, 3, null, 'More headroom for plugins and modpacks', '["6GB DDR5 RAM","50GB NVMe SSD","200% Ryzen CPU","3 backups","3 databases","DDoS protection"]'::jsonb, false, 22),
  ('Starter VPS', 'VPS', 12.38, 'monthly', 4, null, 2, 40, null, null, 1, 'Dedicated resources for apps, bots, panels, and services.', '["2 vCPU","4GB RAM","40GB NVMe SSD","1 IPv4","Full root access"]'::jsonb, false, 40),
  ('Performance VPS', 'VPS', 24.26, 'monthly', 8, null, 4, 80, null, null, 1, 'Dedicated resources for apps, bots, panels, and services.', '["4 vCPU","8GB RAM","80GB NVMe SSD","1 IPv4","Full root access"]'::jsonb, true, 41),
  ('Pro VPS', 'VPS', 45.02, 'monthly', 16, null, 6, 160, null, null, 1, 'Dedicated resources for apps, bots, panels, and services.', '["6 vCPU","16GB RAM","160GB NVMe SSD","1 IPv4","Full root access"]'::jsonb, false, 42);
end if;
end $$;

do $$
begin
if not exists (select 1 from public.features) then
insert into public.features (title, description, icon, sort_order)
values
  ('Ryzen CPUs', 'High-performance processors built for game servers and VPS workloads.', 'Cpu', 1),
  ('DDR5 Memory', 'Fast memory for smoother gameplay and better server performance.', 'MemoryStick', 2),
  ('NVMe SSD', 'Fast storage for quick loading, backups, and world saves.', 'HardDrive', 3),
  ('DDoS Protection', 'Protection to help keep your services online.', 'Shield', 4),
  ('Pterodactyl Panel', 'Simple and powerful control panel for managing game servers.', 'Gauge', 5),
  ('Fast Support', 'Get help quickly through Discord and support tickets.', 'Headphones', 6);
end if;
end $$;

do $$
begin
if not exists (select 1 from public.faqs) then
insert into public.faqs (question, answer, category, sort_order)
values
  ('How fast is setup?', 'After your order is confirmed, most services are prepared within minutes.', 'General', 1),
  ('Do you use Pterodactyl?', 'Yes. Game servers are managed through a clean Pterodactyl-powered panel.', 'Panel', 2),
  ('Can I upgrade later?', 'Yes. Open a ticket and we can adjust resources as your server grows.', 'Billing', 3),
  ('Do you offer DDoS protection?', 'Yes. RageNodes includes DDoS protection to help keep services online.', 'Network', 4),
  ('How do payments work?', 'Submit an order request and our team will contact you with payment instructions.', 'Billing', 5);
end if;
end $$;

create index if not exists orders_created_at_idx on public.orders(created_at desc);
create index if not exists orders_status_idx on public.orders(status);
create index if not exists orders_hosting_type_idx on public.orders(hosting_type);
create index if not exists orders_email_idx on public.orders(email);
create index if not exists plans_category_idx on public.plans(category);
create index if not exists plans_active_idx on public.plans(is_active);
create index if not exists games_active_idx on public.games(is_active);
create index if not exists features_active_idx on public.features(is_active);
create index if not exists faqs_active_idx on public.faqs(is_active);
