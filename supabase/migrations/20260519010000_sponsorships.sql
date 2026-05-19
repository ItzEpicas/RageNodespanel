create table if not exists public.sponsorship_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  discord_id text not null,
  discord_username text,
  server_name text not null,
  discord_invite text not null,
  minecraft_ip text,
  server_version text,
  server_type text not null default 'Other',
  average_players integer not null default 0,
  discord_members integer not null default 0,
  server_description text,
  sponsorship_reason text,
  spawn_promotion_plan text,
  can_create_dedicated_channel boolean not null default false,
  can_create_admin_roles boolean not null default false,
  can_add_spawn_promotion boolean not null default false,
  can_add_ragenodes_to_tab boolean not null default false,
  proof_links text,
  extra_notes text,
  package_ram_gb integer not null default 4,
  package_cpu_percent integer not null default 100,
  package_ssd_gb integer not null default 30,
  status text not null default 'pending',
  admin_notes text,
  archived_at timestamptz,
  archived_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sponsorship_applications_status_check
    check (status in (
      'pending',
      'ticket_opened',
      'under_review',
      'approved',
      'rejected',
      'changes_required',
      'activated',
      'cancelled'
    )),
  constraint sponsorship_applications_server_type_check
    check (server_type in (
      'Survival',
      'Lifesteal',
      'BoxPvP',
      'Practice',
      'SkyBlock',
      'SMP',
      'Other'
    )),
  constraint sponsorship_applications_average_players_check check (average_players >= 0),
  constraint sponsorship_applications_discord_members_check check (discord_members >= 0),
  constraint sponsorship_applications_package_ram_check check (package_ram_gb > 0),
  constraint sponsorship_applications_package_cpu_check check (package_cpu_percent > 0),
  constraint sponsorship_applications_package_ssd_check check (package_ssd_gb > 0)
);

create table if not exists public.sponsorship_tickets (
  id uuid primary key default gen_random_uuid(),
  sponsorship_application_id uuid not null references public.sponsorship_applications(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  discord_id text not null,
  guild_id text,
  channel_id text,
  status text not null default 'open',
  opened_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sponsorship_tickets_status_check check (status in ('open', 'closed'))
);

create table if not exists public.sponsorship_status_logs (
  id uuid primary key default gen_random_uuid(),
  sponsorship_application_id uuid not null references public.sponsorship_applications(id) on delete cascade,
  admin_user_id uuid references public.profiles(id) on delete set null,
  old_status text,
  new_status text not null,
  note text,
  created_at timestamptz not null default now(),
  constraint sponsorship_status_logs_old_status_check
    check (
      old_status is null
      or old_status in (
        'pending',
        'ticket_opened',
        'under_review',
        'approved',
        'rejected',
        'changes_required',
        'activated',
        'cancelled'
      )
    ),
  constraint sponsorship_status_logs_new_status_check
    check (new_status in (
      'pending',
      'ticket_opened',
      'under_review',
      'approved',
      'rejected',
      'changes_required',
      'activated',
      'cancelled'
    ))
);

alter table public.sponsorship_applications enable row level security;
alter table public.sponsorship_tickets enable row level security;
alter table public.sponsorship_status_logs enable row level security;

drop trigger if exists sponsorship_applications_set_updated_at on public.sponsorship_applications;
create trigger sponsorship_applications_set_updated_at
  before update on public.sponsorship_applications
  for each row execute function public.set_updated_at();

drop trigger if exists sponsorship_tickets_set_updated_at on public.sponsorship_tickets;
create trigger sponsorship_tickets_set_updated_at
  before update on public.sponsorship_tickets
  for each row execute function public.set_updated_at();

create index if not exists sponsorship_applications_discord_id_idx
  on public.sponsorship_applications(discord_id);
create index if not exists sponsorship_applications_user_id_idx
  on public.sponsorship_applications(user_id);
create index if not exists sponsorship_applications_status_idx
  on public.sponsorship_applications(status);
create index if not exists sponsorship_applications_server_name_idx
  on public.sponsorship_applications(lower(server_name));
create index if not exists sponsorship_applications_created_at_idx
  on public.sponsorship_applications(created_at desc);
create index if not exists sponsorship_applications_server_type_idx
  on public.sponsorship_applications(server_type);
create index if not exists sponsorship_tickets_application_idx
  on public.sponsorship_tickets(sponsorship_application_id, created_at desc);
create index if not exists sponsorship_tickets_channel_idx
  on public.sponsorship_tickets(channel_id);
create index if not exists sponsorship_tickets_discord_id_idx
  on public.sponsorship_tickets(discord_id);
create index if not exists sponsorship_status_logs_application_idx
  on public.sponsorship_status_logs(sponsorship_application_id, created_at desc);

create unique index if not exists sponsorship_tickets_open_application_unique_idx
  on public.sponsorship_tickets(sponsorship_application_id)
  where status = 'open';

create unique index if not exists sponsorship_applications_one_active_per_user_idx
  on public.sponsorship_applications(user_id)
  where archived_at is null
    and status in ('pending', 'ticket_opened', 'under_review', 'approved', 'changes_required', 'activated');

drop policy if exists sponsorship_applications_self_insert on public.sponsorship_applications;
create policy sponsorship_applications_self_insert
  on public.sponsorship_applications for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists sponsorship_applications_self_read on public.sponsorship_applications;
create policy sponsorship_applications_self_read
  on public.sponsorship_applications for select
  to authenticated
  using (user_id = auth.uid() or public.current_user_has_permission('support.manage'));

drop policy if exists sponsorship_applications_admin_update on public.sponsorship_applications;
create policy sponsorship_applications_admin_update
  on public.sponsorship_applications for update
  to authenticated
  using (public.current_user_has_permission('support.manage'))
  with check (public.current_user_has_permission('support.manage'));

drop policy if exists sponsorship_applications_admin_delete on public.sponsorship_applications;
create policy sponsorship_applications_admin_delete
  on public.sponsorship_applications for delete
  to authenticated
  using (public.current_user_has_permission('support.manage'));

drop policy if exists sponsorship_tickets_user_read on public.sponsorship_tickets;
create policy sponsorship_tickets_user_read
  on public.sponsorship_tickets for select
  to authenticated
  using (user_id = auth.uid() or public.current_user_has_permission('support.manage'));

drop policy if exists sponsorship_tickets_admin_manage on public.sponsorship_tickets;
create policy sponsorship_tickets_admin_manage
  on public.sponsorship_tickets for all
  to authenticated
  using (public.current_user_has_permission('support.manage'))
  with check (public.current_user_has_permission('support.manage'));

drop policy if exists sponsorship_status_logs_user_read on public.sponsorship_status_logs;
create policy sponsorship_status_logs_user_read
  on public.sponsorship_status_logs for select
  to authenticated
  using (
    public.current_user_has_permission('support.manage')
    or exists (
      select 1
      from public.sponsorship_applications sa
      where sa.id = sponsorship_status_logs.sponsorship_application_id
        and sa.user_id = auth.uid()
    )
  );

drop policy if exists sponsorship_status_logs_admin_insert on public.sponsorship_status_logs;
create policy sponsorship_status_logs_admin_insert
  on public.sponsorship_status_logs for insert
  to authenticated
  with check (public.current_user_has_permission('support.manage'));

drop policy if exists sponsorship_status_logs_admin_manage on public.sponsorship_status_logs;
create policy sponsorship_status_logs_admin_manage
  on public.sponsorship_status_logs for update
  to authenticated
  using (public.current_user_has_permission('support.manage'))
  with check (public.current_user_has_permission('support.manage'));
