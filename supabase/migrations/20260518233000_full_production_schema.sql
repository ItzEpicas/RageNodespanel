-- RageNodes full production schema
-- This migration upgrades the current partial CMS/order schema into a full production-ready
-- Supabase/PostgreSQL data model for catalog, commerce, provisioning, support, content, auth,
-- roles, notifications, integrations, and analytics.

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

create or replace function public.slugify(value text)
returns text
language sql
immutable
set search_path = public
as $$
  select trim(both '-' from regexp_replace(lower(coalesce(value, '')), '[^a-z0-9]+', '-', 'g'));
$$;

create sequence if not exists public.order_number_seq start 1000;
create sequence if not exists public.invoice_number_seq start 1000;
create sequence if not exists public.payment_number_seq start 1000;
create sequence if not exists public.subscription_number_seq start 1000;
create sequence if not exists public.server_number_seq start 1000;
create sequence if not exists public.ticket_number_seq start 1000;

create or replace function public.generate_order_number()
returns text
language plpgsql
set search_path = public
as $$
begin
  return 'ORD-' || lpad(nextval('public.order_number_seq')::text, 6, '0');
end;
$$;

create or replace function public.generate_invoice_number()
returns text
language plpgsql
set search_path = public
as $$
begin
  return 'INV-' || lpad(nextval('public.invoice_number_seq')::text, 6, '0');
end;
$$;

create or replace function public.generate_payment_number()
returns text
language plpgsql
set search_path = public
as $$
begin
  return 'PAY-' || lpad(nextval('public.payment_number_seq')::text, 6, '0');
end;
$$;

create or replace function public.generate_subscription_number()
returns text
language plpgsql
set search_path = public
as $$
begin
  return 'SUB-' || lpad(nextval('public.subscription_number_seq')::text, 6, '0');
end;
$$;

create or replace function public.generate_server_code()
returns text
language plpgsql
set search_path = public
as $$
begin
  return 'SRV-' || lpad(nextval('public.server_number_seq')::text, 6, '0');
end;
$$;

create or replace function public.generate_ticket_number()
returns text
language plpgsql
set search_path = public
as $$
begin
  return 'TKT-' || lpad(nextval('public.ticket_number_seq')::text, 6, '0');
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  email text not null,
  full_name text,
  username text,
  company_name text,
  avatar_url text,
  phone text,
  billing_email text,
  discord_username text,
  timezone text not null default 'UTC',
  locale text not null default 'en',
  country_code text,
  currency_code text not null default 'USD',
  marketing_opt_in boolean not null default false,
  is_active boolean not null default true,
  last_seen_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  constraint profiles_currency_code_check check (char_length(currency_code) = 3)
);

create unique index if not exists profiles_username_unique_idx
  on public.profiles (lower(username))
  where username is not null;

create unique index if not exists profiles_email_unique_idx
  on public.profiles (lower(email));

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  role_key text not null unique,
  name text not null,
  description text,
  is_system boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  constraint roles_role_key_check check (role_key ~ '^[a-z0-9_]+$')
);

create table if not exists public.permissions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  permission_key text not null unique,
  name text not null,
  description text,
  resource_key text not null,
  action_key text not null,
  metadata jsonb not null default '{}'::jsonb,
  constraint permissions_permission_key_check check (permission_key ~ '^[a-z0-9_.]+$')
);

create table if not exists public.role_permissions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  unique (role_id, permission_id)
);

create table if not exists public.user_role_assignments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  scope_type text not null default 'global',
  scope_id uuid,
  assigned_by uuid references auth.users(id) on delete set null,
  expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  constraint user_role_assignments_scope_type_check
    check (scope_type in ('global', 'account', 'order', 'server', 'ticket'))
);

create unique index if not exists user_role_assignments_unique_idx
  on public.user_role_assignments (
    user_id,
    role_id,
    scope_type,
    coalesce(scope_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );

create table if not exists public.admin_user_preferences (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_id uuid not null references auth.users(id) on delete cascade,
  sidebar_collapsed boolean not null default false,
  dashboard_layout jsonb not null default '{}'::jsonb,
  saved_filters jsonb not null default '{}'::jsonb,
  ui_preferences jsonb not null default '{}'::jsonb,
  unique (user_id)
);

create or replace function public.current_user_has_role(role_key_to_check text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_role_assignments ura
    join public.roles r on r.id = ura.role_id
    where ura.user_id = auth.uid()
      and r.role_key = role_key_to_check
      and (ura.expires_at is null or ura.expires_at > now())
  );
$$;

create or replace function public.current_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_has_role('owner')
      or public.current_user_has_role('admin');
$$;

create or replace function public.current_user_has_permission(permission_key_to_check text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_role_assignments ura
    join public.roles r on r.id = ura.role_id
    join public.role_permissions rp on rp.role_id = r.id
    join public.permissions p on p.id = rp.permission_id
    where ura.user_id = auth.uid()
      and p.permission_key = permission_key_to_check
      and (ura.expires_at is null or ura.expires_at > now())
  );
$$;

revoke execute on function public.current_user_has_role(text) from public, anon;
revoke execute on function public.current_user_is_admin() from public, anon;
revoke execute on function public.current_user_has_permission(text) from public, anon;
grant execute on function public.current_user_has_role(text) to authenticated, service_role;
grant execute on function public.current_user_is_admin() to authenticated, service_role;
grant execute on function public.current_user_has_permission(text) to authenticated, service_role;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    email,
    full_name,
    username,
    avatar_url,
    billing_email,
    metadata,
    last_seen_at
  )
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''),
    nullif(new.raw_user_meta_data ->> 'username', ''),
    nullif(new.raw_user_meta_data ->> 'avatar_url', ''),
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data, '{}'::jsonb),
    now()
  )
  on conflict (id) do update
  set
    email = excluded.email,
    billing_email = excluded.billing_email,
    full_name = coalesce(nullif(excluded.full_name, ''), public.profiles.full_name),
    username = coalesce(excluded.username, public.profiles.username),
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
    metadata = public.profiles.metadata || excluded.metadata,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

insert into public.profiles (
  id,
  email,
  full_name,
  username,
  avatar_url,
  billing_email,
  metadata,
  last_seen_at
)
select
  u.id,
  coalesce(u.email, ''),
  coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name', ''),
  nullif(u.raw_user_meta_data ->> 'username', ''),
  nullif(u.raw_user_meta_data ->> 'avatar_url', ''),
  coalesce(u.email, ''),
  coalesce(u.raw_user_meta_data, '{}'::jsonb),
  now()
from auth.users u
on conflict (id) do nothing;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  product_key text not null unique,
  name text not null,
  slug text not null unique,
  product_type text not null,
  hosting_category text not null,
  short_description text,
  description text,
  is_active boolean not null default true,
  is_public boolean not null default true,
  is_featured boolean not null default false,
  supports_builder boolean not null default false,
  default_billing_cycle text not null default 'monthly',
  sort_order integer not null default 100,
  metadata jsonb not null default '{}'::jsonb,
  constraint products_product_type_check
    check (product_type in ('game_server', 'minecraft', 'vps', 'addon', 'service')),
  constraint products_hosting_category_check
    check (hosting_category in ('Minecraft', 'Game Server', 'VPS', 'Custom', 'Addon', 'Service')),
  constraint products_default_billing_cycle_check
    check (default_billing_cycle in ('monthly', 'quarterly', 'semiannual', 'annual', 'one_time'))
);

create table if not exists public.site_settings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  settings_key text not null default 'primary' unique,
  site_name text not null default 'RageNodes',
  company_name text not null default 'RageNodes',
  company_legal_name text,
  company_address text,
  primary_domain text,
  support_email text not null default 'support@ragenodes.cloud',
  sales_email text,
  billing_email text,
  discord_invite_url text not null default 'https://discord.gg/ragenodes',
  panel_url text not null default 'https://panel.ragenodes.cloud',
  billing_url text not null default 'https://billing.ragenodes.cloud',
  status_page_url text,
  logo_url text,
  favicon_url text,
  currency text not null default 'USD',
  default_locale text not null default 'en',
  default_timezone text not null default 'UTC',
  maintenance_mode boolean not null default false,
  social_links jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  constraint site_settings_currency_check check (char_length(currency) = 3)
);

alter table public.site_settings
  add column if not exists settings_key text not null default 'primary',
  add column if not exists company_name text not null default 'RageNodes',
  add column if not exists company_legal_name text,
  add column if not exists company_address text,
  add column if not exists primary_domain text,
  add column if not exists sales_email text,
  add column if not exists billing_email text,
  add column if not exists status_page_url text,
  add column if not exists logo_url text,
  add column if not exists favicon_url text,
  add column if not exists default_locale text not null default 'en',
  add column if not exists default_timezone text not null default 'UTC',
  add column if not exists social_links jsonb not null default '{}'::jsonb,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create unique index if not exists site_settings_settings_key_idx
  on public.site_settings (settings_key);

create table if not exists public.homepage_content (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  page_key text not null default 'homepage' unique,
  hero_badge text,
  hero_title text not null,
  hero_subtitle text not null,
  primary_button_text text not null,
  primary_button_url text not null,
  secondary_button_text text not null,
  secondary_button_url text not null,
  cta_title text not null,
  cta_subtitle text not null,
  cta_button_text text not null,
  cta_button_url text not null,
  hero_stats jsonb not null default '[]'::jsonb,
  seo_title text,
  seo_description text,
  metadata jsonb not null default '{}'::jsonb
);

alter table public.homepage_content
  add column if not exists page_key text not null default 'homepage',
  add column if not exists hero_badge text,
  add column if not exists hero_stats jsonb not null default '[]'::jsonb,
  add column if not exists seo_title text,
  add column if not exists seo_description text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create unique index if not exists homepage_content_page_key_idx
  on public.homepage_content (page_key);

create table if not exists public.pricing_settings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  settings_key text not null default 'primary' unique,
  currency_code text not null default 'USD',
  ram_price_per_gb numeric(12,2) not null default 1.40,
  storage_price_per_50gb numeric(12,2) not null default 4.10,
  cpu_price_per_100_percent numeric(12,2) not null default 1.50,
  vcpu_price_per_core numeric(12,2) not null default 1.50,
  additional_port_price numeric(12,2) not null default 0.50,
  backup_price numeric(12,2) not null default 4.00,
  ipv4_price numeric(12,2) not null default 0.50,
  setup_fee_amount numeric(12,2) not null default 0,
  tax_percent numeric(5,2) not null default 0,
  invoice_due_days integer not null default 7,
  allowed_payment_methods jsonb not null default '["BOG","TBC","Crypto","PayPal","Manual"]'::jsonb,
  builder_limits jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  constraint pricing_settings_currency_code_check check (char_length(currency_code) = 3)
);

create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  product_id uuid references public.products(id) on delete set null,
  name text not null,
  slug text not null unique,
  category text not null default 'Other',
  game_code text,
  description text not null default '',
  starting_price text not null default '$9.94/month',
  image_url text,
  icon_name text,
  supported_versions jsonb not null default '[]'::jsonb,
  panel_egg_id text,
  is_featured boolean not null default false,
  is_active boolean not null default true,
  sort_order integer not null default 100,
  metadata jsonb not null default '{}'::jsonb,
  constraint games_category_check check (
    category in ('Sandbox', 'Survival', 'FPS', 'Simulation', 'RP', 'Strategy', 'Other')
  )
);

alter table public.games
  add column if not exists product_id uuid references public.products(id) on delete set null,
  add column if not exists game_code text,
  add column if not exists icon_name text,
  add column if not exists supported_versions jsonb not null default '[]'::jsonb,
  add column if not exists panel_egg_id text,
  add column if not exists is_featured boolean not null default false,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create table if not exists public.features (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  feature_key text,
  title text not null,
  description text not null default '',
  icon text not null default 'Zap',
  is_active boolean not null default true,
  sort_order integer not null default 100,
  metadata jsonb not null default '{}'::jsonb
);

alter table public.features
  add column if not exists feature_key text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create unique index if not exists features_feature_key_idx
  on public.features (feature_key)
  where feature_key is not null;

create table if not exists public.faqs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  faq_key text,
  question text not null,
  answer text not null,
  category text not null default 'General',
  is_active boolean not null default true,
  sort_order integer not null default 100,
  metadata jsonb not null default '{}'::jsonb
);

alter table public.faqs
  add column if not exists faq_key text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create unique index if not exists faqs_faq_key_idx
  on public.faqs (faq_key)
  where faq_key is not null;

create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  product_id uuid references public.products(id) on delete set null,
  slug text,
  sku text,
  name text not null,
  category text not null,
  plan_kind text not null default 'standard',
  price numeric(12,2) not null default 0,
  setup_fee_amount numeric(12,2) not null default 0,
  currency_code text not null default 'USD',
  billing_cycle text not null default 'monthly',
  billing_interval_count integer not null default 1,
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
  is_public boolean not null default true,
  is_active boolean not null default true,
  stock_policy text not null default 'unlimited',
  sort_order integer not null default 100,
  provisioning_template text,
  metadata jsonb not null default '{}'::jsonb,
  constraint plans_category_check
    check (category in ('Minecraft', 'Game Server', 'VPS', 'Custom')),
  constraint plans_plan_kind_check
    check (plan_kind in ('standard', 'builder', 'addon', 'enterprise')),
  constraint plans_stock_policy_check
    check (stock_policy in ('unlimited', 'manual_review', 'capacity_limited')),
  constraint plans_billing_cycle_check
    check (billing_cycle in ('monthly', 'quarterly', 'semiannual', 'annual', 'one_time')),
  constraint plans_currency_code_check check (char_length(currency_code) = 3)
);

alter table public.plans
  add column if not exists product_id uuid references public.products(id) on delete set null,
  add column if not exists slug text,
  add column if not exists sku text,
  add column if not exists plan_kind text not null default 'standard',
  add column if not exists setup_fee_amount numeric(12,2) not null default 0,
  add column if not exists currency_code text not null default 'USD',
  add column if not exists billing_interval_count integer not null default 1,
  add column if not exists is_public boolean not null default true,
  add column if not exists stock_policy text not null default 'unlimited',
  add column if not exists provisioning_template text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.plans
  drop constraint if exists plans_plan_kind_check;
alter table public.plans
  add constraint plans_plan_kind_check
    check (plan_kind in ('standard', 'builder', 'addon', 'enterprise'));

alter table public.plans
  drop constraint if exists plans_stock_policy_check;
alter table public.plans
  add constraint plans_stock_policy_check
    check (stock_policy in ('unlimited', 'manual_review', 'capacity_limited'));

alter table public.plans
  drop constraint if exists plans_billing_cycle_check;
alter table public.plans
  add constraint plans_billing_cycle_check
    check (billing_cycle in ('monthly', 'quarterly', 'semiannual', 'annual', 'one_time'));

create unique index if not exists plans_slug_unique_idx
  on public.plans (lower(slug))
  where slug is not null;

create unique index if not exists plans_sku_unique_idx
  on public.plans (lower(sku))
  where sku is not null;

create table if not exists public.cms_pages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  page_key text not null unique,
  slug text not null unique,
  title text not null,
  summary text,
  body_markdown text not null default '',
  seo_title text,
  seo_description text,
  is_published boolean not null default true,
  sort_order integer not null default 100,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.cms_content_blocks (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  page_key text not null,
  block_key text not null,
  block_type text not null,
  title text,
  subtitle text,
  content_json jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  sort_order integer not null default 100,
  metadata jsonb not null default '{}'::jsonb,
  unique (page_key, block_key)
);

create table if not exists public.cms_navigation_links (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  location_key text not null,
  label text not null,
  href text not null,
  icon_name text,
  is_external boolean not null default false,
  is_active boolean not null default true,
  sort_order integer not null default 100,
  metadata jsonb not null default '{}'::jsonb,
  constraint cms_navigation_links_location_key_check
    check (location_key in ('header', 'footer', 'mobile', 'side_left', 'side_right', 'legal'))
);

create table if not exists public.api_integration_settings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  provider_key text not null unique,
  provider_kind text not null,
  display_name text not null,
  environment text not null default 'production',
  base_url text,
  is_enabled boolean not null default false,
  secret_reference text,
  oauth_client_id text,
  oauth_client_secret_reference text,
  webhook_secret_reference text,
  service_account_reference text,
  public_config jsonb not null default '{}'::jsonb,
  health_status text not null default 'unknown',
  last_validated_at timestamptz,
  last_error text,
  metadata jsonb not null default '{}'::jsonb,
  constraint api_integration_settings_provider_kind_check
    check (provider_kind in ('payment', 'provisioning', 'communication', 'identity', 'analytics')),
  constraint api_integration_settings_environment_check
    check (environment in ('production', 'staging', 'development')),
  constraint api_integration_settings_health_status_check
    check (health_status in ('unknown', 'healthy', 'degraded', 'failed'))
);

create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  code text not null,
  name text not null,
  description text,
  discount_type text not null,
  discount_value numeric(12,2) not null,
  currency_code text not null default 'USD',
  min_order_amount numeric(12,2) not null default 0,
  max_redemptions integer,
  per_user_limit integer,
  starts_at timestamptz,
  ends_at timestamptz,
  applies_to_all boolean not null default true,
  scope_rules jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  constraint coupons_discount_type_check
    check (discount_type in ('percentage', 'fixed_amount', 'free_setup')),
  constraint coupons_currency_code_check check (char_length(currency_code) = 3),
  constraint coupons_discount_value_check check (discount_value >= 0)
);

create unique index if not exists coupons_code_unique_idx
  on public.coupons (lower(code));

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null default public.generate_order_number(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_id uuid references auth.users(id) on delete set null,
  full_name text not null,
  email text not null,
  discord_username text,
  hosting_type text not null default 'Custom',
  selected_game text,
  selected_plan text,
  server_name text,
  ram integer,
  cpu integer,
  vcpu integer,
  storage integer,
  backups integer,
  extra_ports integer,
  location text,
  minecraft_version text,
  server_software text,
  operating_system text,
  ipv4_count integer,
  payment_method text,
  estimated_price numeric(12,2) not null default 0,
  currency_code text not null default 'USD',
  subtotal_amount numeric(12,2) not null default 0,
  discount_amount numeric(12,2) not null default 0,
  tax_amount numeric(12,2) not null default 0,
  total_amount numeric(12,2) not null default 0,
  coupon_id uuid references public.coupons(id) on delete set null,
  coupon_code_applied text,
  status text not null default 'Pending',
  source text not null default 'website',
  notes text,
  internal_notes text,
  status_reason text,
  pricing_snapshot jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  paid_at timestamptz,
  cancelled_at timestamptz,
  constraint orders_hosting_type_check
    check (hosting_type in ('Minecraft', 'Game Server', 'VPS', 'Custom')),
  constraint orders_status_check
    check (status in ('Pending', 'Contacted', 'Waiting Payment', 'Paid', 'Server Created', 'Cancelled')),
  constraint orders_source_check
    check (source in ('website', 'admin', 'api', 'discord', 'migration')),
  constraint orders_currency_code_check check (char_length(currency_code) = 3),
  constraint orders_payment_method_check
    check (payment_method is null or payment_method in ('BOG', 'TBC', 'Crypto', 'PayPal', 'Manual', 'Card', 'Bank Transfer'))
);

alter table public.orders
  add column if not exists order_number text,
  add column if not exists user_id uuid references auth.users(id) on delete set null,
  add column if not exists location text,
  add column if not exists currency_code text not null default 'USD',
  add column if not exists subtotal_amount numeric(12,2) not null default 0,
  add column if not exists discount_amount numeric(12,2) not null default 0,
  add column if not exists tax_amount numeric(12,2) not null default 0,
  add column if not exists total_amount numeric(12,2) not null default 0,
  add column if not exists coupon_id uuid references public.coupons(id) on delete set null,
  add column if not exists coupon_code_applied text,
  add column if not exists source text not null default 'website',
  add column if not exists internal_notes text,
  add column if not exists status_reason text,
  add column if not exists pricing_snapshot jsonb not null default '{}'::jsonb,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists paid_at timestamptz,
  add column if not exists cancelled_at timestamptz;

update public.orders
set
  order_number = coalesce(order_number, public.generate_order_number()),
  subtotal_amount = case
    when subtotal_amount = 0 and estimated_price is not null then estimated_price
    else subtotal_amount
  end,
  total_amount = case
    when total_amount = 0 and estimated_price is not null then estimated_price
    else total_amount
  end,
  currency_code = coalesce(currency_code, 'USD'),
  source = coalesce(source, 'website')
where order_number is null
   or subtotal_amount = 0
   or total_amount = 0
   or currency_code is null
   or source is null;

alter table public.orders
  alter column order_number set default public.generate_order_number();

create unique index if not exists orders_order_number_unique_idx
  on public.orders (order_number);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  plan_id uuid references public.plans(id) on delete set null,
  item_type text not null default 'plan',
  name text not null,
  sku text,
  description text,
  quantity integer not null default 1,
  unit_price_amount numeric(12,2) not null default 0,
  subtotal_amount numeric(12,2) not null default 0,
  discount_amount numeric(12,2) not null default 0,
  tax_amount numeric(12,2) not null default 0,
  total_amount numeric(12,2) not null default 0,
  billing_cycle text not null default 'monthly',
  configuration jsonb not null default '{}'::jsonb,
  sort_order integer not null default 100,
  metadata jsonb not null default '{}'::jsonb,
  constraint order_items_item_type_check
    check (item_type in ('product', 'plan', 'addon', 'discount', 'manual')),
  constraint order_items_billing_cycle_check
    check (billing_cycle in ('monthly', 'quarterly', 'semiannual', 'annual', 'one_time')),
  constraint order_items_quantity_check check (quantity > 0)
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null default public.generate_invoice_number(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_id uuid references auth.users(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  subscription_id uuid,
  status text not null default 'draft',
  currency_code text not null default 'USD',
  subtotal_amount numeric(12,2) not null default 0,
  discount_amount numeric(12,2) not null default 0,
  tax_amount numeric(12,2) not null default 0,
  total_amount numeric(12,2) not null default 0,
  amount_paid numeric(12,2) not null default 0,
  due_at timestamptz,
  paid_at timestamptz,
  provider_invoice_id text,
  billing_details jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  constraint invoices_status_check
    check (status in ('draft', 'open', 'paid', 'void', 'uncollectible', 'refunded')),
  constraint invoices_currency_code_check check (char_length(currency_code) = 3)
);

create unique index if not exists invoices_invoice_number_unique_idx
  on public.invoices (invoice_number);

create table if not exists public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  order_item_id uuid references public.order_items(id) on delete set null,
  line_type text not null default 'product',
  description text not null,
  quantity integer not null default 1,
  unit_amount numeric(12,2) not null default 0,
  subtotal_amount numeric(12,2) not null default 0,
  tax_amount numeric(12,2) not null default 0,
  total_amount numeric(12,2) not null default 0,
  sort_order integer not null default 100,
  metadata jsonb not null default '{}'::jsonb,
  constraint invoice_items_line_type_check
    check (line_type in ('product', 'service', 'discount', 'tax', 'manual')),
  constraint invoice_items_quantity_check check (quantity > 0)
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  subscription_number text not null default public.generate_subscription_number(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_id uuid references auth.users(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  product_id uuid references public.products(id) on delete set null,
  plan_id uuid references public.plans(id) on delete set null,
  status text not null default 'pending',
  billing_cycle text not null default 'monthly',
  currency_code text not null default 'USD',
  unit_price_amount numeric(12,2) not null default 0,
  quantity integer not null default 1,
  current_period_start timestamptz,
  current_period_end timestamptz,
  next_billing_at timestamptz,
  cancel_at_period_end boolean not null default false,
  cancelled_at timestamptz,
  provider_key text,
  provider_customer_id text,
  provider_subscription_id text,
  metadata jsonb not null default '{}'::jsonb,
  constraint subscriptions_status_check
    check (status in ('pending', 'trialing', 'active', 'past_due', 'paused', 'cancelled', 'expired')),
  constraint subscriptions_billing_cycle_check
    check (billing_cycle in ('monthly', 'quarterly', 'semiannual', 'annual')),
  constraint subscriptions_currency_code_check check (char_length(currency_code) = 3),
  constraint subscriptions_quantity_check check (quantity > 0)
);

create unique index if not exists subscriptions_subscription_number_unique_idx
  on public.subscriptions (subscription_number);

create table if not exists public.subscription_items (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  subscription_id uuid not null references public.subscriptions(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  plan_id uuid references public.plans(id) on delete set null,
  quantity integer not null default 1,
  unit_price_amount numeric(12,2) not null default 0,
  configuration jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  constraint subscription_items_quantity_check check (quantity > 0)
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  payment_number text not null default public.generate_payment_number(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_id uuid references auth.users(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  invoice_id uuid references public.invoices(id) on delete set null,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  provider_key text not null,
  payment_method text,
  status text not null default 'pending',
  amount numeric(12,2) not null default 0,
  currency_code text not null default 'USD',
  provider_fee_amount numeric(12,2) not null default 0,
  net_amount numeric(12,2) not null default 0,
  refunded_amount numeric(12,2) not null default 0,
  external_payment_id text,
  external_order_id text,
  external_payer_id text,
  approval_url text,
  captured_at timestamptz,
  failed_at timestamptz,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  constraint payments_provider_key_check
    check (provider_key in ('paypal', 'bog', 'tbc', 'crypto', 'manual', 'stripe', 'bank_transfer')),
  constraint payments_status_check
    check (status in ('pending', 'authorized', 'captured', 'failed', 'cancelled', 'refunded', 'partially_refunded')),
  constraint payments_currency_code_check check (char_length(currency_code) = 3)
);

create unique index if not exists payments_payment_number_unique_idx
  on public.payments (payment_number);

create index if not exists payments_external_payment_id_idx
  on public.payments (provider_key, external_payment_id);

create table if not exists public.payment_provider_records (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  payment_id uuid references public.payments(id) on delete cascade,
  order_id uuid references public.orders(id) on delete cascade,
  invoice_id uuid references public.invoices(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id) on delete cascade,
  provider_key text not null,
  record_type text not null,
  external_id text not null,
  event_name text,
  payload jsonb not null default '{}'::jsonb,
  recorded_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  unique (provider_key, record_type, external_id)
);

create table if not exists public.coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  coupon_id uuid not null references public.coupons(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  payment_id uuid references public.payments(id) on delete set null,
  redeemed_code text not null,
  discount_amount numeric(12,2) not null default 0,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.servers (
  id uuid primary key default gen_random_uuid(),
  server_code text not null default public.generate_server_code(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_id uuid references auth.users(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  order_item_id uuid references public.order_items(id) on delete set null,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  product_id uuid references public.products(id) on delete set null,
  plan_id uuid references public.plans(id) on delete set null,
  game_id uuid references public.games(id) on delete set null,
  hosting_type text not null,
  name text not null,
  hostname text,
  primary_ip text,
  primary_port integer,
  ip_addresses jsonb not null default '[]'::jsonb,
  location text,
  panel_url text,
  provider_key text,
  panel_server_id text,
  panel_node_id text,
  provisioning_status text not null default 'queued',
  runtime_status text not null default 'unknown',
  os_name text,
  software_name text,
  game_version text,
  resource_snapshot jsonb not null default '{}'::jsonb,
  last_provisioned_at timestamptz,
  suspended_at timestamptz,
  terminated_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  constraint servers_hosting_type_check
    check (hosting_type in ('Minecraft', 'Game Server', 'VPS', 'Custom')),
  constraint servers_provisioning_status_check
    check (provisioning_status in ('queued', 'requested', 'validating', 'provisioning', 'active', 'failed', 'suspended', 'terminated', 'cancelled')),
  constraint servers_runtime_status_check
    check (runtime_status in ('unknown', 'running', 'stopped', 'starting', 'stopping', 'restarting', 'suspended', 'terminated'))
);

create unique index if not exists servers_server_code_unique_idx
  on public.servers (server_code);

create table if not exists public.server_provisioning_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  server_id uuid not null references public.servers(id) on delete cascade,
  provider_key text,
  stage text not null,
  status text not null,
  message text,
  external_reference text,
  payload jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  constraint server_provisioning_events_status_check
    check (status in ('queued', 'requested', 'validating', 'provisioning', 'active', 'failed', 'suspended', 'terminated', 'cancelled'))
);

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_number text not null default public.generate_ticket_number(),
  short_id text not null unique,
  access_token_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_id uuid references auth.users(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  server_id uuid references public.servers(id) on delete set null,
  assigned_to uuid references auth.users(id) on delete set null,
  name text not null,
  email text not null,
  discord_username text,
  subject text not null,
  category text not null default 'General',
  priority text not null default 'Normal',
  status text not null default 'open',
  visibility text not null default 'customer',
  source text not null default 'website',
  last_reply_at timestamptz,
  resolved_at timestamptz,
  closed_at timestamptz,
  discord_message_id text,
  discord_thread_id text,
  metadata jsonb not null default '{}'::jsonb,
  constraint support_tickets_status_check
    check (status in ('open', 'pending', 'waiting_customer', 'waiting_staff', 'resolved', 'closed')),
  constraint support_tickets_priority_check
    check (priority in ('Low', 'Normal', 'High', 'Urgent')),
  constraint support_tickets_visibility_check
    check (visibility in ('customer', 'internal')),
  constraint support_tickets_source_check
    check (source in ('website', 'admin', 'discord', 'email', 'api'))
);

alter table public.support_tickets
  add column if not exists ticket_number text,
  add column if not exists user_id uuid references auth.users(id) on delete set null,
  add column if not exists order_id uuid references public.orders(id) on delete set null,
  add column if not exists server_id uuid references public.servers(id) on delete set null,
  add column if not exists assigned_to uuid references auth.users(id) on delete set null,
  add column if not exists visibility text not null default 'customer',
  add column if not exists source text not null default 'website',
  add column if not exists last_reply_at timestamptz,
  add column if not exists resolved_at timestamptz,
  add column if not exists closed_at timestamptz,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

update public.support_tickets
set ticket_number = coalesce(ticket_number, public.generate_ticket_number())
where ticket_number is null;

alter table public.support_tickets
  alter column ticket_number set default public.generate_ticket_number();

create unique index if not exists support_tickets_ticket_number_idx
  on public.support_tickets (ticket_number);

create table if not exists public.support_ticket_messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  author_type text not null,
  author_name text not null,
  message text not null,
  is_internal_note boolean not null default false,
  attachments jsonb not null default '[]'::jsonb,
  discord_message_id text,
  metadata jsonb not null default '{}'::jsonb,
  constraint support_ticket_messages_author_type_check
    check (author_type in ('customer', 'staff', 'system'))
);

alter table public.support_ticket_messages
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists user_id uuid references auth.users(id) on delete set null,
  add column if not exists is_internal_note boolean not null default false,
  add column if not exists attachments jsonb not null default '[]'::jsonb,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_id uuid references auth.users(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  server_id uuid references public.servers(id) on delete set null,
  ticket_id uuid references public.support_tickets(id) on delete set null,
  kind text not null,
  channel text not null default 'in_app',
  status text not null default 'queued',
  title text not null,
  body text not null,
  action_url text,
  payload jsonb not null default '{}'::jsonb,
  sent_at timestamptz,
  read_at timestamptz,
  failed_at timestamptz,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  constraint notifications_channel_check
    check (channel in ('in_app', 'email', 'discord', 'webhook', 'sms')),
  constraint notifications_status_check
    check (status in ('queued', 'sent', 'delivered', 'failed', 'read'))
);

create table if not exists public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_id uuid not null references auth.users(id) on delete cascade,
  channel text not null,
  is_enabled boolean not null default true,
  quiet_hours jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  constraint notification_preferences_channel_check
    check (channel in ('in_app', 'email', 'discord', 'webhook', 'sms')),
  unique (user_id, channel)
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  table_name text not null,
  record_id uuid,
  old_data jsonb,
  new_data jsonb,
  changed_fields jsonb not null default '[]'::jsonb,
  source text not null default 'database_trigger',
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  actor_user_id uuid references auth.users(id) on delete set null,
  subject_user_id uuid references auth.users(id) on delete set null,
  entity_type text not null,
  entity_id uuid,
  event_key text not null,
  summary text not null,
  metadata jsonb not null default '{}'::jsonb
);

create or replace function public.append_activity_log(
  p_actor_user_id uuid,
  p_subject_user_id uuid,
  p_entity_type text,
  p_entity_id uuid,
  p_event_key text,
  p_summary text,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.activity_logs (
    actor_user_id,
    subject_user_id,
    entity_type,
    entity_id,
    event_key,
    summary,
    metadata
  )
  values (
    p_actor_user_id,
    p_subject_user_id,
    p_entity_type,
    p_entity_id,
    p_event_key,
    p_summary,
    coalesce(p_metadata, '{}'::jsonb)
  );
end;
$$;

create or replace function public.capture_audit_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  current_row_id uuid;
  old_payload jsonb;
  new_payload jsonb;
begin
  old_payload := case when tg_op = 'INSERT' then null else to_jsonb(old) end;
  new_payload := case when tg_op = 'DELETE' then null else to_jsonb(new) end;
  current_row_id := coalesce(
    nullif((coalesce(new_payload, old_payload) ->> 'id'), '')::uuid,
    null
  );

  insert into public.audit_logs (
    actor_user_id,
    action,
    table_name,
    record_id,
    old_data,
    new_data,
    changed_fields,
    source
  )
  values (
    actor_id,
    tg_op,
    tg_table_name,
    current_row_id,
    old_payload,
    new_payload,
    case
      when tg_op = 'UPDATE' then (
        select coalesce(jsonb_agg(key), '[]'::jsonb)
        from (
          select key
          from jsonb_object_keys(coalesce(new_payload, '{}'::jsonb)) as key
          where coalesce(old_payload -> key, 'null'::jsonb) is distinct from coalesce(new_payload -> key, 'null'::jsonb)
        ) changed
      )
      else '[]'::jsonb
    end,
    'database_trigger'
  );

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

create or replace function public.log_order_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.append_activity_log(
      auth.uid(),
      new.user_id,
      'order',
      new.id,
      'order.created',
      format('Order %s created', coalesce(new.order_number, new.id::text)),
      jsonb_build_object('status', new.status, 'total_amount', new.total_amount)
    );
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status then
    perform public.append_activity_log(
      auth.uid(),
      new.user_id,
      'order',
      new.id,
      'order.status_changed',
      format('Order %s moved from %s to %s', coalesce(new.order_number, new.id::text), old.status, new.status),
      jsonb_build_object('old_status', old.status, 'new_status', new.status)
    );
  end if;

  return new;
end;
$$;

create or replace function public.log_payment_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.append_activity_log(
      auth.uid(),
      new.user_id,
      'payment',
      new.id,
      'payment.created',
      format('Payment %s created', coalesce(new.payment_number, new.id::text)),
      jsonb_build_object('status', new.status, 'amount', new.amount, 'provider_key', new.provider_key)
    );
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status then
    perform public.append_activity_log(
      auth.uid(),
      new.user_id,
      'payment',
      new.id,
      'payment.status_changed',
      format('Payment %s moved from %s to %s', coalesce(new.payment_number, new.id::text), old.status, new.status),
      jsonb_build_object('old_status', old.status, 'new_status', new.status)
    );
  end if;

  return new;
end;
$$;

create or replace function public.log_server_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.append_activity_log(
      auth.uid(),
      new.user_id,
      'server',
      new.id,
      'server.created',
      format('Server %s created', coalesce(new.server_code, new.id::text)),
      jsonb_build_object('provisioning_status', new.provisioning_status, 'runtime_status', new.runtime_status)
    );
  elsif tg_op = 'UPDATE' and (
    new.provisioning_status is distinct from old.provisioning_status
    or new.runtime_status is distinct from old.runtime_status
  ) then
    perform public.append_activity_log(
      auth.uid(),
      new.user_id,
      'server',
      new.id,
      'server.status_changed',
      format('Server %s status updated', coalesce(new.server_code, new.id::text)),
      jsonb_build_object(
        'old_provisioning_status', old.provisioning_status,
        'new_provisioning_status', new.provisioning_status,
        'old_runtime_status', old.runtime_status,
        'new_runtime_status', new.runtime_status
      )
    );
  end if;

  return new;
end;
$$;

create or replace function public.log_support_ticket_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.append_activity_log(
      auth.uid(),
      new.user_id,
      'support_ticket',
      new.id,
      'ticket.created',
      format('Ticket %s created', coalesce(new.ticket_number, new.short_id, new.id::text)),
      jsonb_build_object('status', new.status, 'priority', new.priority)
    );
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status then
    perform public.append_activity_log(
      auth.uid(),
      new.user_id,
      'support_ticket',
      new.id,
      'ticket.status_changed',
      format('Ticket %s moved from %s to %s', coalesce(new.ticket_number, new.short_id, new.id::text), old.status, new.status),
      jsonb_build_object('old_status', old.status, 'new_status', new.status)
    );
  end if;

  return new;
end;
$$;

create or replace function public.log_support_ticket_message_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  ticket_user_id uuid;
begin
  select user_id into ticket_user_id
  from public.support_tickets
  where id = new.ticket_id;

  perform public.append_activity_log(
    auth.uid(),
    ticket_user_id,
    'support_ticket_message',
    new.id,
    'ticket.reply_created',
    format('Reply added to ticket %s', new.ticket_id::text),
    jsonb_build_object('author_type', new.author_type, 'ticket_id', new.ticket_id)
  );

  update public.support_tickets
  set last_reply_at = new.created_at
  where id = new.ticket_id;

  return new;
end;
$$;

create or replace function public.handle_order_totals()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  affected_order_ids uuid[];
  affected_order_id uuid;
begin
  if tg_op = 'DELETE' then
    affected_order_ids := array[old.order_id];
  elsif tg_op = 'UPDATE' and old.order_id is distinct from new.order_id then
    affected_order_ids := array[old.order_id, new.order_id];
  else
    affected_order_ids := array[new.order_id];
  end if;

  foreach affected_order_id in array affected_order_ids
  loop
    continue when affected_order_id is null;

    update public.orders
    set
      subtotal_amount = coalesce((
        select sum(oi.subtotal_amount) from public.order_items oi where oi.order_id = affected_order_id
      ), 0),
      discount_amount = coalesce((
        select sum(oi.discount_amount) from public.order_items oi where oi.order_id = affected_order_id
      ), 0),
      tax_amount = coalesce((
        select sum(oi.tax_amount) from public.order_items oi where oi.order_id = affected_order_id
      ), 0),
      total_amount = coalesce((
        select sum(oi.total_amount) from public.order_items oi where oi.order_id = affected_order_id
      ), 0),
      estimated_price = coalesce((
        select sum(oi.total_amount) from public.order_items oi where oi.order_id = affected_order_id
      ), 0),
      updated_at = now()
    where id = affected_order_id;
  end loop;

  return coalesce(new, old);
end;
$$;

do $$
declare
  managed_table text;
begin
  foreach managed_table in array array[
    'profiles',
    'roles',
    'permissions',
    'user_role_assignments',
    'admin_user_preferences',
    'products',
    'site_settings',
    'homepage_content',
    'pricing_settings',
    'games',
    'features',
    'faqs',
    'plans',
    'cms_pages',
    'cms_content_blocks',
    'cms_navigation_links',
    'api_integration_settings',
    'coupons',
    'orders',
    'order_items',
    'invoices',
    'invoice_items',
    'subscriptions',
    'subscription_items',
    'payments',
    'servers',
    'support_tickets',
    'support_ticket_messages',
    'notifications',
    'notification_preferences'
  ]
  loop
    execute format('alter table public.%I enable row level security', managed_table);
    execute format('drop trigger if exists %I on public.%I', managed_table || '_set_updated_at', managed_table);
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.set_updated_at()',
      managed_table || '_set_updated_at',
      managed_table
    );
  end loop;
end $$;

do $$
declare
  rls_only_table text;
begin
  foreach rls_only_table in array array[
    'role_permissions',
    'payment_provider_records',
    'coupon_redemptions',
    'server_provisioning_events',
    'audit_logs',
    'activity_logs'
  ]
  loop
    execute format('alter table public.%I enable row level security', rls_only_table);
  end loop;
end $$;

drop trigger if exists order_items_recalculate_order_totals on public.order_items;
create trigger order_items_recalculate_order_totals
  after insert or update or delete on public.order_items
  for each row execute function public.handle_order_totals();

do $$
declare
  audit_table text;
begin
  foreach audit_table in array array[
    'site_settings',
    'homepage_content',
    'pricing_settings',
    'products',
    'plans',
    'games',
    'features',
    'faqs',
    'cms_pages',
    'cms_content_blocks',
    'cms_navigation_links',
    'coupons',
    'orders',
    'order_items',
    'payments',
    'invoices',
    'subscriptions',
    'servers',
    'support_tickets'
  ]
  loop
    execute format('drop trigger if exists %I on public.%I', audit_table || '_audit_log', audit_table);
    execute format(
      'create trigger %I after insert or update or delete on public.%I for each row execute function public.capture_audit_log()',
      audit_table || '_audit_log',
      audit_table
    );
  end loop;
end $$;

drop trigger if exists orders_activity_log on public.orders;
create trigger orders_activity_log
  after insert or update on public.orders
  for each row execute function public.log_order_activity();

drop trigger if exists payments_activity_log on public.payments;
create trigger payments_activity_log
  after insert or update on public.payments
  for each row execute function public.log_payment_activity();

drop trigger if exists servers_activity_log on public.servers;
create trigger servers_activity_log
  after insert or update on public.servers
  for each row execute function public.log_server_activity();

drop trigger if exists support_tickets_activity_log on public.support_tickets;
create trigger support_tickets_activity_log
  after insert or update on public.support_tickets
  for each row execute function public.log_support_ticket_activity();

drop trigger if exists support_ticket_messages_activity_log on public.support_ticket_messages;
create trigger support_ticket_messages_activity_log
  after insert on public.support_ticket_messages
  for each row execute function public.log_support_ticket_message_activity();

create index if not exists products_type_active_idx
  on public.products (product_type, hosting_category, is_active, is_public);
create index if not exists site_settings_primary_idx
  on public.site_settings (settings_key);
create index if not exists games_active_sort_idx
  on public.games (is_active, sort_order, name);
create index if not exists features_active_sort_idx
  on public.features (is_active, sort_order);
create index if not exists faqs_active_sort_idx
  on public.faqs (is_active, sort_order);
create index if not exists plans_public_idx
  on public.plans (category, is_active, is_public, sort_order);
create index if not exists cms_pages_published_idx
  on public.cms_pages (is_published, sort_order);
create index if not exists cms_content_blocks_page_idx
  on public.cms_content_blocks (page_key, is_active, sort_order);
create index if not exists cms_navigation_links_location_idx
  on public.cms_navigation_links (location_key, is_active, sort_order);
create index if not exists coupons_active_window_idx
  on public.coupons (is_active, starts_at, ends_at);
create index if not exists orders_user_status_created_idx
  on public.orders (user_id, status, created_at desc);
create index if not exists orders_email_idx
  on public.orders (lower(email));
create index if not exists order_items_order_idx
  on public.order_items (order_id, sort_order);
create index if not exists invoices_user_status_due_idx
  on public.invoices (user_id, status, due_at);
create index if not exists invoice_items_invoice_idx
  on public.invoice_items (invoice_id, sort_order);
create index if not exists subscriptions_user_status_idx
  on public.subscriptions (user_id, status, next_billing_at);
create index if not exists subscription_items_subscription_idx
  on public.subscription_items (subscription_id);
create index if not exists payments_status_created_idx
  on public.payments (status, created_at desc);
create index if not exists payments_user_idx
  on public.payments (user_id, order_id, invoice_id);
create index if not exists coupon_redemptions_coupon_idx
  on public.coupon_redemptions (coupon_id, user_id, order_id);
create index if not exists servers_user_status_idx
  on public.servers (user_id, provisioning_status, runtime_status);
create index if not exists servers_order_idx
  on public.servers (order_id, subscription_id);
create index if not exists server_provisioning_events_server_idx
  on public.server_provisioning_events (server_id, created_at desc);
create index if not exists support_tickets_user_status_idx
  on public.support_tickets (user_id, status, created_at desc);
create index if not exists support_tickets_assignment_idx
  on public.support_tickets (assigned_to, priority, status);
create index if not exists support_ticket_messages_ticket_idx
  on public.support_ticket_messages (ticket_id, created_at asc);
create index if not exists notifications_user_status_idx
  on public.notifications (user_id, status, created_at desc);
create index if not exists activity_logs_entity_idx
  on public.activity_logs (entity_type, entity_id, created_at desc);
create index if not exists activity_logs_subject_idx
  on public.activity_logs (subject_user_id, created_at desc);
create index if not exists audit_logs_table_record_idx
  on public.audit_logs (table_name, record_id, created_at desc);

drop policy if exists profiles_self_select on public.profiles;
create policy profiles_self_select
  on public.profiles for select
  to authenticated
  using (id = auth.uid() or public.current_user_has_permission('users.read'));

drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update
  on public.profiles for update
  to authenticated
  using (id = auth.uid() or public.current_user_has_permission('users.manage'))
  with check (id = auth.uid() or public.current_user_has_permission('users.manage'));

drop policy if exists profiles_self_insert on public.profiles;
create policy profiles_self_insert
  on public.profiles for insert
  to authenticated
  with check (id = auth.uid() or public.current_user_has_permission('users.manage'));

drop policy if exists roles_admin_manage on public.roles;
create policy roles_admin_manage
  on public.roles for all
  to authenticated
  using (public.current_user_has_permission('roles.manage'))
  with check (public.current_user_has_permission('roles.manage'));

drop policy if exists permissions_admin_read on public.permissions;
create policy permissions_admin_read
  on public.permissions for select
  to authenticated
  using (public.current_user_has_permission('roles.manage'));

drop policy if exists role_permissions_admin_manage on public.role_permissions;
create policy role_permissions_admin_manage
  on public.role_permissions for all
  to authenticated
  using (public.current_user_has_permission('roles.manage'))
  with check (public.current_user_has_permission('roles.manage'));

drop policy if exists user_role_assignments_admin_manage on public.user_role_assignments;
create policy user_role_assignments_admin_manage
  on public.user_role_assignments for all
  to authenticated
  using (public.current_user_has_permission('roles.manage'))
  with check (public.current_user_has_permission('roles.manage'));

drop policy if exists admin_user_preferences_owner on public.admin_user_preferences;
create policy admin_user_preferences_owner
  on public.admin_user_preferences for all
  to authenticated
  using (user_id = auth.uid() or public.current_user_is_admin())
  with check (user_id = auth.uid() or public.current_user_is_admin());

drop policy if exists site_settings_public_read on public.site_settings;
create policy site_settings_public_read
  on public.site_settings for select
  to anon, authenticated
  using (true);

drop policy if exists site_settings_admin_manage on public.site_settings;
create policy site_settings_admin_manage
  on public.site_settings for all
  to authenticated
  using (public.current_user_has_permission('settings.manage'))
  with check (public.current_user_has_permission('settings.manage'));

drop policy if exists homepage_content_public_read on public.homepage_content;
create policy homepage_content_public_read
  on public.homepage_content for select
  to anon, authenticated
  using (true);

drop policy if exists homepage_content_admin_manage on public.homepage_content;
create policy homepage_content_admin_manage
  on public.homepage_content for all
  to authenticated
  using (public.current_user_has_permission('cms.manage'))
  with check (public.current_user_has_permission('cms.manage'));

drop policy if exists pricing_settings_public_read on public.pricing_settings;
create policy pricing_settings_public_read
  on public.pricing_settings for select
  to anon, authenticated
  using (true);

drop policy if exists pricing_settings_admin_manage on public.pricing_settings;
create policy pricing_settings_admin_manage
  on public.pricing_settings for all
  to authenticated
  using (public.current_user_has_permission('settings.manage'))
  with check (public.current_user_has_permission('settings.manage'));

drop policy if exists products_public_read on public.products;
create policy products_public_read
  on public.products for select
  to anon, authenticated
  using (is_public = true and is_active = true);

drop policy if exists products_admin_manage on public.products;
create policy products_admin_manage
  on public.products for all
  to authenticated
  using (public.current_user_has_permission('catalog.manage'))
  with check (public.current_user_has_permission('catalog.manage'));

drop policy if exists games_public_read on public.games;
create policy games_public_read
  on public.games for select
  to anon, authenticated
  using (is_active = true);

drop policy if exists games_admin_manage on public.games;
create policy games_admin_manage
  on public.games for all
  to authenticated
  using (public.current_user_has_permission('catalog.manage'))
  with check (public.current_user_has_permission('catalog.manage'));

drop policy if exists features_public_read on public.features;
create policy features_public_read
  on public.features for select
  to anon, authenticated
  using (is_active = true);

drop policy if exists features_admin_manage on public.features;
create policy features_admin_manage
  on public.features for all
  to authenticated
  using (public.current_user_has_permission('cms.manage'))
  with check (public.current_user_has_permission('cms.manage'));

drop policy if exists faqs_public_read on public.faqs;
create policy faqs_public_read
  on public.faqs for select
  to anon, authenticated
  using (is_active = true);

drop policy if exists faqs_admin_manage on public.faqs;
create policy faqs_admin_manage
  on public.faqs for all
  to authenticated
  using (public.current_user_has_permission('cms.manage'))
  with check (public.current_user_has_permission('cms.manage'));

drop policy if exists plans_public_read on public.plans;
create policy plans_public_read
  on public.plans for select
  to anon, authenticated
  using (is_public = true and is_active = true);

drop policy if exists plans_admin_manage on public.plans;
create policy plans_admin_manage
  on public.plans for all
  to authenticated
  using (public.current_user_has_permission('catalog.manage'))
  with check (public.current_user_has_permission('catalog.manage'));

drop policy if exists cms_pages_public_read on public.cms_pages;
create policy cms_pages_public_read
  on public.cms_pages for select
  to anon, authenticated
  using (is_published = true);

drop policy if exists cms_pages_admin_manage on public.cms_pages;
create policy cms_pages_admin_manage
  on public.cms_pages for all
  to authenticated
  using (public.current_user_has_permission('cms.manage'))
  with check (public.current_user_has_permission('cms.manage'));

drop policy if exists cms_content_blocks_public_read on public.cms_content_blocks;
create policy cms_content_blocks_public_read
  on public.cms_content_blocks for select
  to anon, authenticated
  using (is_active = true);

drop policy if exists cms_content_blocks_admin_manage on public.cms_content_blocks;
create policy cms_content_blocks_admin_manage
  on public.cms_content_blocks for all
  to authenticated
  using (public.current_user_has_permission('cms.manage'))
  with check (public.current_user_has_permission('cms.manage'));

drop policy if exists cms_navigation_links_public_read on public.cms_navigation_links;
create policy cms_navigation_links_public_read
  on public.cms_navigation_links for select
  to anon, authenticated
  using (is_active = true);

drop policy if exists cms_navigation_links_admin_manage on public.cms_navigation_links;
create policy cms_navigation_links_admin_manage
  on public.cms_navigation_links for all
  to authenticated
  using (public.current_user_has_permission('cms.manage'))
  with check (public.current_user_has_permission('cms.manage'));

drop policy if exists integrations_admin_only on public.api_integration_settings;
create policy integrations_admin_only
  on public.api_integration_settings for all
  to authenticated
  using (public.current_user_has_permission('integrations.manage'))
  with check (public.current_user_has_permission('integrations.manage'));

drop policy if exists coupons_admin_read on public.coupons;
create policy coupons_admin_read
  on public.coupons for select
  to authenticated
  using (public.current_user_has_permission('orders.manage') or public.current_user_has_permission('billing.manage'));

drop policy if exists coupons_admin_manage on public.coupons;
create policy coupons_admin_manage
  on public.coupons for all
  to authenticated
  using (public.current_user_has_permission('billing.manage'))
  with check (public.current_user_has_permission('billing.manage'));

drop policy if exists orders_public_insert on public.orders;
create policy orders_public_insert
  on public.orders for insert
  to anon, authenticated
  with check (
    (
      auth.uid() is null
      and user_id is null
      and length(trim(full_name)) > 0
      and length(trim(email)) > 3
    )
    or (
      auth.uid() is not null
      and coalesce(user_id, auth.uid()) = auth.uid()
    )
  );

drop policy if exists orders_customer_read on public.orders;
create policy orders_customer_read
  on public.orders for select
  to authenticated
  using (user_id = auth.uid() or public.current_user_has_permission('orders.read'));

drop policy if exists orders_admin_manage on public.orders;
create policy orders_admin_manage
  on public.orders for update
  to authenticated
  using (public.current_user_has_permission('orders.manage'))
  with check (public.current_user_has_permission('orders.manage'));

drop policy if exists orders_admin_delete on public.orders;
create policy orders_admin_delete
  on public.orders for delete
  to authenticated
  using (public.current_user_has_permission('orders.manage'));

drop policy if exists order_items_customer_read on public.order_items;
create policy order_items_customer_read
  on public.order_items for select
  to authenticated
  using (
    exists (
      select 1
      from public.orders o
      where o.id = order_items.order_id
        and (o.user_id = auth.uid() or public.current_user_has_permission('orders.read'))
    )
  );

drop policy if exists order_items_admin_manage on public.order_items;
create policy order_items_admin_manage
  on public.order_items for all
  to authenticated
  using (public.current_user_has_permission('orders.manage'))
  with check (public.current_user_has_permission('orders.manage'));

drop policy if exists invoices_customer_read on public.invoices;
create policy invoices_customer_read
  on public.invoices for select
  to authenticated
  using (user_id = auth.uid() or public.current_user_has_permission('billing.manage'));

drop policy if exists invoices_admin_manage on public.invoices;
create policy invoices_admin_manage
  on public.invoices for all
  to authenticated
  using (public.current_user_has_permission('billing.manage'))
  with check (public.current_user_has_permission('billing.manage'));

drop policy if exists invoice_items_customer_read on public.invoice_items;
create policy invoice_items_customer_read
  on public.invoice_items for select
  to authenticated
  using (
    exists (
      select 1
      from public.invoices i
      where i.id = invoice_items.invoice_id
        and (i.user_id = auth.uid() or public.current_user_has_permission('billing.manage'))
    )
  );

drop policy if exists invoice_items_admin_manage on public.invoice_items;
create policy invoice_items_admin_manage
  on public.invoice_items for all
  to authenticated
  using (public.current_user_has_permission('billing.manage'))
  with check (public.current_user_has_permission('billing.manage'));

drop policy if exists subscriptions_customer_read on public.subscriptions;
create policy subscriptions_customer_read
  on public.subscriptions for select
  to authenticated
  using (user_id = auth.uid() or public.current_user_has_permission('billing.manage'));

drop policy if exists subscriptions_admin_manage on public.subscriptions;
create policy subscriptions_admin_manage
  on public.subscriptions for all
  to authenticated
  using (public.current_user_has_permission('billing.manage'))
  with check (public.current_user_has_permission('billing.manage'));

drop policy if exists subscription_items_customer_read on public.subscription_items;
create policy subscription_items_customer_read
  on public.subscription_items for select
  to authenticated
  using (
    exists (
      select 1
      from public.subscriptions s
      where s.id = subscription_items.subscription_id
        and (s.user_id = auth.uid() or public.current_user_has_permission('billing.manage'))
    )
  );

drop policy if exists subscription_items_admin_manage on public.subscription_items;
create policy subscription_items_admin_manage
  on public.subscription_items for all
  to authenticated
  using (public.current_user_has_permission('billing.manage'))
  with check (public.current_user_has_permission('billing.manage'));

drop policy if exists payments_customer_read on public.payments;
create policy payments_customer_read
  on public.payments for select
  to authenticated
  using (user_id = auth.uid() or public.current_user_has_permission('billing.manage'));

drop policy if exists payments_admin_manage on public.payments;
create policy payments_admin_manage
  on public.payments for all
  to authenticated
  using (public.current_user_has_permission('billing.manage'))
  with check (public.current_user_has_permission('billing.manage'));

drop policy if exists provider_records_admin_only on public.payment_provider_records;
create policy provider_records_admin_only
  on public.payment_provider_records for all
  to authenticated
  using (public.current_user_has_permission('billing.manage'))
  with check (public.current_user_has_permission('billing.manage'));

drop policy if exists coupon_redemptions_customer_read on public.coupon_redemptions;
create policy coupon_redemptions_customer_read
  on public.coupon_redemptions for select
  to authenticated
  using (user_id = auth.uid() or public.current_user_has_permission('billing.manage'));

drop policy if exists coupon_redemptions_admin_manage on public.coupon_redemptions;
create policy coupon_redemptions_admin_manage
  on public.coupon_redemptions for all
  to authenticated
  using (public.current_user_has_permission('billing.manage'))
  with check (public.current_user_has_permission('billing.manage'));

drop policy if exists servers_customer_read on public.servers;
create policy servers_customer_read
  on public.servers for select
  to authenticated
  using (user_id = auth.uid() or public.current_user_has_permission('servers.manage'));

drop policy if exists servers_admin_manage on public.servers;
create policy servers_admin_manage
  on public.servers for all
  to authenticated
  using (public.current_user_has_permission('servers.manage'))
  with check (public.current_user_has_permission('servers.manage'));

drop policy if exists server_events_customer_read on public.server_provisioning_events;
create policy server_events_customer_read
  on public.server_provisioning_events for select
  to authenticated
  using (
    exists (
      select 1
      from public.servers s
      where s.id = server_provisioning_events.server_id
        and (s.user_id = auth.uid() or public.current_user_has_permission('servers.manage'))
    )
  );

drop policy if exists server_events_admin_manage on public.server_provisioning_events;
create policy server_events_admin_manage
  on public.server_provisioning_events for all
  to authenticated
  using (public.current_user_has_permission('servers.manage'))
  with check (public.current_user_has_permission('servers.manage'));

drop policy if exists support_tickets_public_insert on public.support_tickets;
create policy support_tickets_public_insert
  on public.support_tickets for insert
  to anon, authenticated
  with check (
    (
      auth.uid() is null
      and user_id is null
      and length(trim(name)) > 0
      and length(trim(email)) > 3
    )
    or (
      auth.uid() is not null
      and coalesce(user_id, auth.uid()) = auth.uid()
    )
  );

drop policy if exists support_tickets_customer_read on public.support_tickets;
create policy support_tickets_customer_read
  on public.support_tickets for select
  to authenticated
  using (user_id = auth.uid() or public.current_user_has_permission('support.manage'));

drop policy if exists support_tickets_admin_manage on public.support_tickets;
create policy support_tickets_admin_manage
  on public.support_tickets for all
  to authenticated
  using (public.current_user_has_permission('support.manage'))
  with check (public.current_user_has_permission('support.manage'));

drop policy if exists support_messages_customer_read on public.support_ticket_messages;
create policy support_messages_customer_read
  on public.support_ticket_messages for select
  to authenticated
  using (
    exists (
      select 1
      from public.support_tickets t
      where t.id = support_ticket_messages.ticket_id
        and (
          t.user_id = auth.uid()
          or public.current_user_has_permission('support.manage')
        )
    )
    and (
      is_internal_note = false
      or public.current_user_has_permission('support.manage')
    )
  );

drop policy if exists support_messages_customer_insert on public.support_ticket_messages;
create policy support_messages_customer_insert
  on public.support_ticket_messages for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.support_tickets t
      where t.id = support_ticket_messages.ticket_id
        and t.user_id = auth.uid()
    )
    and is_internal_note = false
  );

drop policy if exists support_messages_admin_manage on public.support_ticket_messages;
create policy support_messages_admin_manage
  on public.support_ticket_messages for all
  to authenticated
  using (public.current_user_has_permission('support.manage'))
  with check (public.current_user_has_permission('support.manage'));

drop policy if exists notifications_owner_read on public.notifications;
create policy notifications_owner_read
  on public.notifications for select
  to authenticated
  using (user_id = auth.uid() or public.current_user_has_permission('notifications.manage'));

drop policy if exists notifications_owner_update on public.notifications;
create policy notifications_owner_update
  on public.notifications for update
  to authenticated
  using (user_id = auth.uid() or public.current_user_has_permission('notifications.manage'))
  with check (user_id = auth.uid() or public.current_user_has_permission('notifications.manage'));

drop policy if exists notifications_admin_insert on public.notifications;
create policy notifications_admin_insert
  on public.notifications for insert
  to authenticated
  with check (public.current_user_has_permission('notifications.manage'));

drop policy if exists notifications_admin_delete on public.notifications;
create policy notifications_admin_delete
  on public.notifications for delete
  to authenticated
  using (public.current_user_has_permission('notifications.manage'));

drop policy if exists notification_preferences_owner on public.notification_preferences;
create policy notification_preferences_owner
  on public.notification_preferences for all
  to authenticated
  using (user_id = auth.uid() or public.current_user_has_permission('notifications.manage'))
  with check (user_id = auth.uid() or public.current_user_has_permission('notifications.manage'));

drop policy if exists audit_logs_admin_read on public.audit_logs;
create policy audit_logs_admin_read
  on public.audit_logs for select
  to authenticated
  using (public.current_user_has_permission('audit.read'));

drop policy if exists activity_logs_owner_read on public.activity_logs;
create policy activity_logs_owner_read
  on public.activity_logs for select
  to authenticated
  using (
    subject_user_id = auth.uid()
    or actor_user_id = auth.uid()
    or public.current_user_has_permission('analytics.read')
  );

create or replace view public.dashboard_statistics as
select
  (select count(*) from public.orders) as total_orders,
  (select count(*) from public.orders where status = 'Pending') as pending_orders,
  (select count(*) from public.orders where status = 'Waiting Payment') as waiting_payment_orders,
  (select count(*) from public.orders where status = 'Paid') as paid_orders,
  (select count(*) from public.orders where status = 'Server Created') as created_orders,
  (select count(*) from public.support_tickets where status in ('open', 'pending', 'waiting_customer', 'waiting_staff')) as open_tickets,
  (select count(*) from public.servers where provisioning_status = 'active') as active_servers,
  (select count(*) from public.subscriptions where status = 'active') as active_subscriptions,
  (select count(*) from public.games where is_active = true) as active_games,
  (select count(*) from public.plans where is_active = true and is_public = true) as active_plans,
  (select count(*) from public.profiles where is_active = true) as active_profiles,
  (
    select coalesce(sum(amount), 0)
    from public.payments
    where status in ('captured', 'refunded', 'partially_refunded')
  ) as gross_processed_amount,
  (
    select coalesce(sum(net_amount), 0)
    from public.payments
    where status in ('captured', 'refunded', 'partially_refunded')
  ) as net_processed_amount;

create or replace view public.dashboard_revenue_by_month as
select
  date_trunc('month', coalesce(captured_at, created_at)) as revenue_month,
  count(*) filter (where status = 'captured') as captured_payment_count,
  coalesce(sum(amount) filter (where status = 'captured'), 0) as captured_amount,
  coalesce(sum(refunded_amount) filter (where status in ('refunded', 'partially_refunded')), 0) as refunded_amount
from public.payments
group by 1
order by 1 desc;
