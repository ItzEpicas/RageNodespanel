-- Secure admin-only access for RageNodes.
-- Run this after the base schema. It removes the temporary anon admin policies,
-- creates staff roles, and grants initial access to the approved emails.

create extension if not exists pgcrypto;

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

create or replace function public.current_user_can_access_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_has_permission('admin.access');
$$;

revoke execute on function public.current_user_has_role(text) from public, anon;
revoke execute on function public.current_user_has_permission(text) from public, anon;
revoke execute on function public.current_user_is_admin() from public, anon;
revoke execute on function public.current_user_can_access_admin() from public, anon;
grant execute on function public.current_user_has_role(text) to authenticated, service_role;
grant execute on function public.current_user_has_permission(text) to authenticated, service_role;
grant execute on function public.current_user_is_admin() to authenticated, service_role;
grant execute on function public.current_user_can_access_admin() to authenticated, service_role;

insert into public.roles (role_key, name, description, is_system, metadata)
values
  ('owner', 'Owner', 'Full system ownership, including role management.', true, '{"priority":1}'::jsonb),
  ('admin', 'Administrator', 'Full operational administration across the panel.', true, '{"priority":2}'::jsonb),
  ('manager', 'Manager', 'Manages catalog, CMS, orders, support, and servers.', true, '{"priority":3}'::jsonb),
  ('support', 'Support', 'Handles support, sponsorships, and order visibility.', true, '{"priority":4}'::jsonb),
  ('viewer', 'Viewer', 'Read-only operational access.', true, '{"priority":5}'::jsonb)
on conflict (role_key) do update set
  name = excluded.name,
  description = excluded.description,
  is_system = excluded.is_system,
  metadata = excluded.metadata;

insert into public.permissions (permission_key, name, description, resource_key, action_key)
values
  ('admin.access', 'Access Admin Panel', 'Open the protected admin panel.', 'admin', 'access'),
  ('users.read', 'Read Users', 'Read user profile and role data.', 'users', 'read'),
  ('roles.manage', 'Manage Roles', 'Assign and revoke staff roles.', 'roles', 'manage'),
  ('settings.manage', 'Manage Settings', 'Manage global website settings.', 'settings', 'manage'),
  ('cms.manage', 'Manage CMS', 'Manage homepage, FAQ, feature, and CMS content.', 'cms', 'manage'),
  ('catalog.manage', 'Manage Catalog', 'Manage games, plans, products, and pricing.', 'catalog', 'manage'),
  ('orders.read', 'Read Orders', 'Read order data.', 'orders', 'read'),
  ('orders.manage', 'Manage Orders', 'Update and delete order data.', 'orders', 'manage'),
  ('billing.manage', 'Manage Billing', 'Manage billing-related records.', 'billing', 'manage'),
  ('support.manage', 'Manage Support', 'Manage support and sponsorship workflows.', 'support', 'manage'),
  ('servers.manage', 'Manage Servers', 'Manage server provisioning records.', 'servers', 'manage'),
  ('notifications.manage', 'Manage Notifications', 'Manage notifications.', 'notifications', 'manage'),
  ('integrations.manage', 'Manage Integrations', 'Manage API integration settings.', 'integrations', 'manage'),
  ('audit.read', 'Read Audit Logs', 'Read audit logs.', 'audit', 'read'),
  ('analytics.read', 'Read Analytics', 'Read analytics summaries.', 'analytics', 'read')
on conflict (permission_key) do update set
  name = excluded.name,
  description = excluded.description,
  resource_key = excluded.resource_key,
  action_key = excluded.action_key;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.role_key in ('owner', 'admin')
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.permission_key in (
  'admin.access',
  'users.read',
  'settings.manage',
  'cms.manage',
  'catalog.manage',
  'orders.read',
  'orders.manage',
  'support.manage',
  'servers.manage',
  'notifications.manage',
  'analytics.read'
)
where r.role_key = 'manager'
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.permission_key in (
  'admin.access',
  'orders.read',
  'support.manage'
)
where r.role_key = 'support'
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.permission_key in (
  'admin.access',
  'users.read',
  'orders.read',
  'analytics.read'
)
where r.role_key = 'viewer'
on conflict do nothing;

create or replace function public.assign_initial_staff_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  next_role_key text;
  next_role_id uuid;
begin
  next_role_key := case lower(new.email)
    when 'itzepicas@gmail.com' then 'owner'
    when 'dachigamer222@gmail.com' then 'admin'
    else null
  end;

  if next_role_key is null then
    return new;
  end if;

  select id into next_role_id
  from public.roles
  where role_key = next_role_key;

  if next_role_id is not null then
    insert into public.user_role_assignments (user_id, role_id, scope_type, metadata)
    values (new.id, next_role_id, 'global', jsonb_build_object('source', 'approved_email_bootstrap'))
    on conflict do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_assign_initial_staff_role on auth.users;
create trigger on_auth_user_assign_initial_staff_role
  after insert on auth.users
  for each row execute function public.assign_initial_staff_role();

insert into public.user_role_assignments (user_id, role_id, scope_type, metadata)
select u.id, r.id, 'global', jsonb_build_object('source', 'approved_email_backfill')
from auth.users u
join public.roles r on r.role_key = case lower(u.email)
  when 'itzepicas@gmail.com' then 'owner'
  when 'dachigamer222@gmail.com' then 'admin'
end
where lower(u.email) in ('itzepicas@gmail.com', 'dachigamer222@gmail.com')
on conflict do nothing;

create or replace function public.list_admin_role_assignments()
returns table (
  assignment_id uuid,
  user_id uuid,
  email text,
  role_key text,
  role_name text,
  assigned_at timestamptz,
  expires_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.current_user_has_permission('roles.manage') then
    raise exception 'Only role managers can view role assignments.';
  end if;

  return query
    select
      ura.id,
      u.id,
      u.email::text,
      r.role_key,
      r.name,
      ura.created_at,
      ura.expires_at
    from public.user_role_assignments ura
    join public.roles r on r.id = ura.role_id
    join auth.users u on u.id = ura.user_id
    order by ura.created_at desc;
end;
$$;

create or replace function public.assign_role_by_email(target_email text, target_role_key text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_user_id uuid;
  target_role_id uuid;
begin
  if not public.current_user_has_permission('roles.manage') then
    raise exception 'Only role managers can assign roles.';
  end if;

  select id into target_user_id
  from auth.users
  where lower(email) = lower(trim(target_email))
  limit 1;

  if target_user_id is null then
    raise exception 'No Supabase auth user exists for email %. Register that user first.', target_email;
  end if;

  select id into target_role_id
  from public.roles
  where role_key = target_role_key;

  if target_role_id is null then
    raise exception 'Unknown role %.', target_role_key;
  end if;

  insert into public.user_role_assignments (user_id, role_id, scope_type, assigned_by, metadata)
  values (target_user_id, target_role_id, 'global', auth.uid(), jsonb_build_object('source', 'admin_panel'))
  on conflict do nothing;
end;
$$;

create or replace function public.revoke_role_by_email(target_email text, target_role_key text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_user_id uuid;
  target_role_id uuid;
begin
  if not public.current_user_has_permission('roles.manage') then
    raise exception 'Only role managers can revoke roles.';
  end if;

  select id into target_user_id
  from auth.users
  where lower(email) = lower(trim(target_email))
  limit 1;

  select id into target_role_id
  from public.roles
  where role_key = target_role_key;

  if target_user_id is null or target_role_id is null then
    return;
  end if;

  if lower(trim(target_email)) = 'itzepicas@gmail.com' and target_role_key = 'owner' then
    raise exception 'The bootstrap owner role cannot be revoked from the admin panel.';
  end if;

  delete from public.user_role_assignments
  where user_id = target_user_id
    and role_id = target_role_id
    and scope_type = 'global';
end;
$$;

revoke execute on function public.list_admin_role_assignments() from public, anon;
revoke execute on function public.assign_role_by_email(text, text) from public, anon;
revoke execute on function public.revoke_role_by_email(text, text) from public, anon;
grant execute on function public.list_admin_role_assignments() to authenticated, service_role;
grant execute on function public.assign_role_by_email(text, text) to authenticated, service_role;
grant execute on function public.revoke_role_by_email(text, text) to authenticated, service_role;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'roles',
    'permissions',
    'role_permissions',
    'user_role_assignments',
    'site_settings',
    'homepage_content',
    'plans',
    'games',
    'features',
    'faqs',
    'orders'
  ]
  loop
    if to_regclass(format('public.%I', table_name)) is not null then
      execute format('alter table public.%I enable row level security', table_name);

      execute format('drop policy if exists "Temporary anon select" on public.%I', table_name);
      execute format('drop policy if exists "Temporary anon insert" on public.%I', table_name);
      execute format('drop policy if exists "Temporary anon update" on public.%I', table_name);
      execute format('drop policy if exists "Temporary anon delete" on public.%I', table_name);
    end if;
  end loop;
end $$;

drop policy if exists site_settings_public_read on public.site_settings;
drop policy if exists homepage_content_public_read on public.homepage_content;
drop policy if exists games_public_read on public.games;
drop policy if exists features_public_read on public.features;
drop policy if exists faqs_public_read on public.faqs;
drop policy if exists plans_public_read on public.plans;
drop policy if exists orders_public_insert on public.orders;
drop policy if exists "Anyone can submit orders" on public.orders;
drop policy if exists "Admins can view all orders" on public.orders;
drop policy if exists "Admins can update orders" on public.orders;
drop policy if exists "Admins can delete orders" on public.orders;
drop policy if exists "Allow public order inserts" on public.orders;
drop policy if exists "Allow public read orders temporary" on public.orders;
drop policy if exists "Allow public update orders temporary" on public.orders;
drop policy if exists "Allow public delete orders temporary" on public.orders;

drop policy if exists roles_owner_manage on public.roles;
create policy roles_owner_manage
  on public.roles for all
  to authenticated
  using (public.current_user_has_permission('roles.manage'))
  with check (public.current_user_has_permission('roles.manage'));

drop policy if exists permissions_owner_read on public.permissions;
create policy permissions_owner_read
  on public.permissions for select
  to authenticated
  using (public.current_user_has_permission('roles.manage'));

drop policy if exists role_permissions_owner_manage on public.role_permissions;
create policy role_permissions_owner_manage
  on public.role_permissions for all
  to authenticated
  using (public.current_user_has_permission('roles.manage'))
  with check (public.current_user_has_permission('roles.manage'));

drop policy if exists user_role_assignments_self_read on public.user_role_assignments;
create policy user_role_assignments_self_read
  on public.user_role_assignments for select
  to authenticated
  using (user_id = auth.uid() or public.current_user_has_permission('roles.manage'));

drop policy if exists user_role_assignments_owner_insert on public.user_role_assignments;
create policy user_role_assignments_owner_insert
  on public.user_role_assignments for insert
  to authenticated
  with check (public.current_user_has_permission('roles.manage'));

drop policy if exists user_role_assignments_owner_update on public.user_role_assignments;
create policy user_role_assignments_owner_update
  on public.user_role_assignments for update
  to authenticated
  using (public.current_user_has_permission('roles.manage'))
  with check (public.current_user_has_permission('roles.manage'));

drop policy if exists user_role_assignments_owner_delete on public.user_role_assignments;
create policy user_role_assignments_owner_delete
  on public.user_role_assignments for delete
  to authenticated
  using (public.current_user_has_permission('roles.manage'));

drop policy if exists site_settings_staff_manage on public.site_settings;
drop policy if exists site_settings_staff_read on public.site_settings;
create policy site_settings_staff_read
  on public.site_settings for select
  to authenticated
  using (public.current_user_can_access_admin());

create policy site_settings_staff_manage
  on public.site_settings for all
  to authenticated
  using (public.current_user_has_permission('settings.manage'))
  with check (public.current_user_has_permission('settings.manage'));

drop policy if exists homepage_content_staff_manage on public.homepage_content;
drop policy if exists homepage_content_staff_read on public.homepage_content;
create policy homepage_content_staff_read
  on public.homepage_content for select
  to authenticated
  using (public.current_user_can_access_admin());

create policy homepage_content_staff_manage
  on public.homepage_content for all
  to authenticated
  using (public.current_user_has_permission('cms.manage'))
  with check (public.current_user_has_permission('cms.manage'));

drop policy if exists plans_staff_manage on public.plans;
drop policy if exists plans_staff_read on public.plans;
create policy plans_staff_read
  on public.plans for select
  to authenticated
  using (public.current_user_can_access_admin());

create policy plans_staff_manage
  on public.plans for all
  to authenticated
  using (public.current_user_has_permission('catalog.manage'))
  with check (public.current_user_has_permission('catalog.manage'));

drop policy if exists games_staff_manage on public.games;
drop policy if exists games_staff_read on public.games;
create policy games_staff_read
  on public.games for select
  to authenticated
  using (public.current_user_can_access_admin());

create policy games_staff_manage
  on public.games for all
  to authenticated
  using (public.current_user_has_permission('catalog.manage'))
  with check (public.current_user_has_permission('catalog.manage'));

drop policy if exists features_staff_manage on public.features;
drop policy if exists features_staff_read on public.features;
create policy features_staff_read
  on public.features for select
  to authenticated
  using (public.current_user_can_access_admin());

create policy features_staff_manage
  on public.features for all
  to authenticated
  using (public.current_user_has_permission('cms.manage'))
  with check (public.current_user_has_permission('cms.manage'));

drop policy if exists faqs_staff_manage on public.faqs;
drop policy if exists faqs_staff_read on public.faqs;
create policy faqs_staff_read
  on public.faqs for select
  to authenticated
  using (public.current_user_can_access_admin());

create policy faqs_staff_manage
  on public.faqs for all
  to authenticated
  using (public.current_user_has_permission('cms.manage'))
  with check (public.current_user_has_permission('cms.manage'));

drop policy if exists orders_staff_read on public.orders;
create policy orders_staff_read
  on public.orders for select
  to authenticated
  using (public.current_user_has_permission('orders.read'));

drop policy if exists orders_staff_manage on public.orders;
create policy orders_staff_manage
  on public.orders for update
  to authenticated
  using (public.current_user_has_permission('orders.manage'))
  with check (public.current_user_has_permission('orders.manage'));

drop policy if exists orders_staff_delete on public.orders;
create policy orders_staff_delete
  on public.orders for delete
  to authenticated
  using (public.current_user_has_permission('orders.manage'));
