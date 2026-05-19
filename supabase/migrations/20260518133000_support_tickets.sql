create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  short_id text not null unique,
  access_token_hash text not null,
  name text not null,
  email text not null,
  discord_username text,
  subject text not null,
  category text not null default 'General',
  priority text not null default 'Normal',
  status text not null default 'open',
  discord_message_id text,
  discord_thread_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint support_tickets_status_check check (status in ('open', 'closed')),
  constraint support_tickets_priority_check check (priority in ('Low', 'Normal', 'High', 'Urgent'))
);

create table if not exists public.support_ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  author_type text not null,
  author_name text not null,
  message text not null,
  discord_message_id text,
  created_at timestamptz not null default now(),
  constraint support_ticket_messages_author_type_check check (
    author_type in ('customer', 'staff', 'system')
  )
);

alter table public.support_tickets enable row level security;
alter table public.support_ticket_messages enable row level security;

drop trigger if exists support_tickets_set_updated_at on public.support_tickets;
create trigger support_tickets_set_updated_at
  before update on public.support_tickets
  for each row execute function public.set_updated_at();

create index if not exists support_tickets_short_id_idx on public.support_tickets(short_id);
create index if not exists support_tickets_status_idx on public.support_tickets(status);
create index if not exists support_ticket_messages_ticket_created_idx
  on public.support_ticket_messages(ticket_id, created_at);

-- Support tickets are accessed through trusted server API only.
drop policy if exists "No direct anon support ticket access" on public.support_tickets;
drop policy if exists "No direct anon support message access" on public.support_ticket_messages;
