-- RageNodes production seed data.
-- Apply after supabase/migrations/20260518233000_full_production_schema.sql.
-- The seed is idempotent and upgrades the old starter content into production defaults.

begin;

insert into public.roles (role_key, name, description, is_system, metadata)
values
  ('owner', 'Owner', 'Full platform control across billing, catalog, support, and integrations.', true, '{"priority":1}'::jsonb),
  ('admin', 'Administrator', 'Operational administration across the full website.', true, '{"priority":2}'::jsonb),
  ('support_agent', 'Support Agent', 'Ticket handling, order review, and customer communications.', true, '{"priority":3}'::jsonb),
  ('billing_manager', 'Billing Manager', 'Invoices, payments, subscriptions, and coupon administration.', true, '{"priority":4}'::jsonb),
  ('content_manager', 'Content Manager', 'Homepage, catalog, CMS, and public website editing.', true, '{"priority":5}'::jsonb),
  ('customer', 'Customer', 'Standard authenticated customer account.', true, '{"priority":100}'::jsonb)
on conflict (role_key) do update
set
  name = excluded.name,
  description = excluded.description,
  is_system = excluded.is_system,
  metadata = excluded.metadata,
  updated_at = now();

insert into public.permissions (
  permission_key,
  name,
  description,
  resource_key,
  action_key,
  metadata
)
values
  ('users.read', 'Read Users', 'Read customer and profile records.', 'users', 'read', '{}'::jsonb),
  ('users.manage', 'Manage Users', 'Manage customer profiles and account state.', 'users', 'manage', '{}'::jsonb),
  ('roles.manage', 'Manage Roles', 'Manage roles, permissions, and user assignments.', 'roles', 'manage', '{}'::jsonb),
  ('settings.manage', 'Manage Settings', 'Edit global site and pricing settings.', 'settings', 'manage', '{}'::jsonb),
  ('cms.manage', 'Manage CMS', 'Edit homepage content, pages, FAQ, features, and navigation.', 'cms', 'manage', '{}'::jsonb),
  ('catalog.manage', 'Manage Catalog', 'Edit products, plans, and supported games.', 'catalog', 'manage', '{}'::jsonb),
  ('orders.read', 'Read Orders', 'Read customer orders and order items.', 'orders', 'read', '{}'::jsonb),
  ('orders.manage', 'Manage Orders', 'Update order status, notes, and fulfillment details.', 'orders', 'manage', '{}'::jsonb),
  ('billing.manage', 'Manage Billing', 'Manage invoices, payments, subscriptions, and coupons.', 'billing', 'manage', '{}'::jsonb),
  ('support.manage', 'Manage Support', 'Manage support tickets and replies.', 'support', 'manage', '{}'::jsonb),
  ('servers.manage', 'Manage Servers', 'Manage provisioning records and runtime state.', 'servers', 'manage', '{}'::jsonb),
  ('notifications.manage', 'Manage Notifications', 'Send and manage user notifications.', 'notifications', 'manage', '{}'::jsonb),
  ('integrations.manage', 'Manage Integrations', 'Manage provider credentials and integration health.', 'integrations', 'manage', '{}'::jsonb),
  ('audit.read', 'Read Audit Logs', 'Read audit trail data.', 'audit', 'read', '{}'::jsonb),
  ('analytics.read', 'Read Analytics', 'Read dashboard statistics and activity logs.', 'analytics', 'read', '{}'::jsonb)
on conflict (permission_key) do update
set
  name = excluded.name,
  description = excluded.description,
  resource_key = excluded.resource_key,
  action_key = excluded.action_key,
  metadata = excluded.metadata,
  updated_at = now();

with role_permission_map(role_key, permission_key) as (
  values
    ('owner', 'users.read'),
    ('owner', 'users.manage'),
    ('owner', 'roles.manage'),
    ('owner', 'settings.manage'),
    ('owner', 'cms.manage'),
    ('owner', 'catalog.manage'),
    ('owner', 'orders.read'),
    ('owner', 'orders.manage'),
    ('owner', 'billing.manage'),
    ('owner', 'support.manage'),
    ('owner', 'servers.manage'),
    ('owner', 'notifications.manage'),
    ('owner', 'integrations.manage'),
    ('owner', 'audit.read'),
    ('owner', 'analytics.read'),
    ('admin', 'users.read'),
    ('admin', 'users.manage'),
    ('admin', 'roles.manage'),
    ('admin', 'settings.manage'),
    ('admin', 'cms.manage'),
    ('admin', 'catalog.manage'),
    ('admin', 'orders.read'),
    ('admin', 'orders.manage'),
    ('admin', 'billing.manage'),
    ('admin', 'support.manage'),
    ('admin', 'servers.manage'),
    ('admin', 'notifications.manage'),
    ('admin', 'integrations.manage'),
    ('admin', 'audit.read'),
    ('admin', 'analytics.read'),
    ('support_agent', 'orders.read'),
    ('support_agent', 'support.manage'),
    ('support_agent', 'servers.manage'),
    ('support_agent', 'notifications.manage'),
    ('support_agent', 'analytics.read'),
    ('billing_manager', 'orders.read'),
    ('billing_manager', 'orders.manage'),
    ('billing_manager', 'billing.manage'),
    ('billing_manager', 'audit.read'),
    ('billing_manager', 'analytics.read'),
    ('content_manager', 'settings.manage'),
    ('content_manager', 'cms.manage'),
    ('content_manager', 'catalog.manage'),
    ('content_manager', 'analytics.read')
)
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from role_permission_map rpm
join public.roles r on r.role_key = rpm.role_key
join public.permissions p on p.permission_key = rpm.permission_key
on conflict (role_id, permission_id) do nothing;

insert into public.products (
  product_key,
  name,
  slug,
  product_type,
  hosting_category,
  short_description,
  description,
  is_active,
  is_public,
  is_featured,
  supports_builder,
  default_billing_cycle,
  sort_order,
  metadata
)
values
  (
    'game_server_hosting',
    'Game Server Hosting',
    'game-server-hosting',
    'game_server',
    'Game Server',
    'General purpose multiplayer game hosting.',
    'High-performance game server hosting built for competitive FPS, survival, sandbox, and automation communities with DDR5 memory, NVMe storage, and clear pricing.',
    true,
    true,
    true,
    true,
    'monthly',
    10,
    '{"accent":"red","icon":"Gamepad2"}'::jsonb
  ),
  (
    'minecraft_hosting',
    'Minecraft Hosting',
    'minecraft-hosting',
    'minecraft',
    'Minecraft',
    'Paper, Purpur, Vanilla, Forge, and Fabric-ready Minecraft hosting.',
    'Minecraft-focused hosting tuned for SMPs, modpacks, plugin-heavy communities, and creator worlds with configurable RAM, storage, CPU allocation, backups, and software presets.',
    true,
    true,
    true,
    true,
    'monthly',
    20,
    '{"accent":"red","icon":"Blocks"}'::jsonb
  ),
  (
    'vps_hosting',
    'VPS Hosting',
    'vps-hosting',
    'vps',
    'VPS',
    'Root-access VPS hosting for apps, bots, panels, and custom services.',
    'Ryzen-powered virtual private servers with root access, predictable monthly billing, IPv4 support, and a clean path to provisioning, suspension, and lifecycle management.',
    true,
    true,
    true,
    true,
    'monthly',
    30,
    '{"accent":"red","icon":"Server"}'::jsonb
  ),
  (
    'custom_builder',
    'Custom Server Builder',
    'custom-server-builder',
    'service',
    'Custom',
    'Custom resource builder for bespoke game servers and VPS deployments.',
    'Builder-first product used when a customer configures custom RAM, CPU, storage, backups, ports, software, OS, and extra provisioning requests outside fixed public plans.',
    true,
    true,
    false,
    true,
    'monthly',
    40,
    '{"accent":"red","icon":"SlidersHorizontal"}'::jsonb
  )
on conflict (product_key) do update
set
  name = excluded.name,
  slug = excluded.slug,
  product_type = excluded.product_type,
  hosting_category = excluded.hosting_category,
  short_description = excluded.short_description,
  description = excluded.description,
  is_active = excluded.is_active,
  is_public = excluded.is_public,
  is_featured = excluded.is_featured,
  supports_builder = excluded.supports_builder,
  default_billing_cycle = excluded.default_billing_cycle,
  sort_order = excluded.sort_order,
  metadata = excluded.metadata,
  updated_at = now();

insert into public.site_settings (
  settings_key,
  site_name,
  company_name,
  company_legal_name,
  support_email,
  sales_email,
  billing_email,
  discord_invite_url,
  panel_url,
  billing_url,
  status_page_url,
  currency,
  default_locale,
  default_timezone,
  maintenance_mode,
  social_links,
  metadata
)
values (
  'primary',
  'RageNodes',
  'RageNodes',
  'RageNodes LLC',
  'support@ragenodes.cloud',
  'sales@ragenodes.cloud',
  'billing@ragenodes.cloud',
  'https://discord.gg/ragenodes',
  'https://panel.ragenodes.cloud',
  'https://billing.ragenodes.cloud',
  '/status',
  'USD',
  'en',
  'Asia/Tbilisi',
  false,
  '{"discord":"https://discord.gg/ragenodes","panel":"https://panel.ragenodes.cloud","billing":"https://billing.ragenodes.cloud","email":"support@ragenodes.cloud"}'::jsonb,
  '{"theme":"red"}'::jsonb
)
on conflict (settings_key) do update
set
  site_name = excluded.site_name,
  company_name = excluded.company_name,
  company_legal_name = excluded.company_legal_name,
  support_email = excluded.support_email,
  sales_email = excluded.sales_email,
  billing_email = excluded.billing_email,
  discord_invite_url = excluded.discord_invite_url,
  panel_url = excluded.panel_url,
  billing_url = excluded.billing_url,
  status_page_url = excluded.status_page_url,
  currency = excluded.currency,
  default_locale = excluded.default_locale,
  default_timezone = excluded.default_timezone,
  maintenance_mode = excluded.maintenance_mode,
  social_links = excluded.social_links,
  metadata = excluded.metadata,
  updated_at = now();

insert into public.homepage_content (
  page_key,
  hero_badge,
  hero_title,
  hero_subtitle,
  primary_button_text,
  primary_button_url,
  secondary_button_text,
  secondary_button_url,
  cta_title,
  cta_subtitle,
  cta_button_text,
  cta_button_url,
  hero_stats,
  seo_title,
  seo_description,
  metadata
)
values (
  'homepage',
  'Premium Game Server & VPS Hosting',
  'Fast, clear, and powerful hosting built for real communities',
  'Deploy Minecraft, game servers, and VPS instances on DDR5 memory, NVMe storage, fast Ryzen compute, and a support workflow that actually keeps up with growth.',
  'Start Building',
  '/builder',
  'View Pricing',
  '/pricing',
  'Ready to launch your next server?',
  'Pick a public plan or build a custom machine with clean billing, clear provisioning status, and live support.',
  'Order Now',
  '/order',
  '[{"label":"Setup Time","value":"Minutes"},{"label":"Support","value":"Live Tickets"},{"label":"Storage","value":"NVMe SSD"},{"label":"Memory","value":"DDR5"}]'::jsonb,
  'RageNodes - Premium Game Server and VPS Hosting',
  'Premium red-themed hosting for Minecraft, game servers, and VPS instances with live support, custom builder pricing, and admin-managed content.',
  '{"hero_theme":"red-grid","comparison_enabled":true}'::jsonb
)
on conflict (page_key) do update
set
  hero_badge = excluded.hero_badge,
  hero_title = excluded.hero_title,
  hero_subtitle = excluded.hero_subtitle,
  primary_button_text = excluded.primary_button_text,
  primary_button_url = excluded.primary_button_url,
  secondary_button_text = excluded.secondary_button_text,
  secondary_button_url = excluded.secondary_button_url,
  cta_title = excluded.cta_title,
  cta_subtitle = excluded.cta_subtitle,
  cta_button_text = excluded.cta_button_text,
  cta_button_url = excluded.cta_button_url,
  hero_stats = excluded.hero_stats,
  seo_title = excluded.seo_title,
  seo_description = excluded.seo_description,
  metadata = excluded.metadata,
  updated_at = now();

insert into public.pricing_settings (
  settings_key,
  currency_code,
  ram_price_per_gb,
  storage_price_per_50gb,
  cpu_price_per_100_percent,
  vcpu_price_per_core,
  additional_port_price,
  backup_price,
  ipv4_price,
  setup_fee_amount,
  tax_percent,
  invoice_due_days,
  allowed_payment_methods,
  builder_limits,
  metadata
)
values (
  'primary',
  'USD',
  1.40,
  4.10,
  1.50,
  1.50,
  0.50,
  4.00,
  0.50,
  0,
  0,
  7,
  '["BOG","TBC","Crypto","PayPal","Manual"]'::jsonb,
  '{
    "game_server":{"ram":{"min":1,"max":64},"cpu":{"min":100,"max":400},"storage":{"min":20,"max":500},"backups":{"min":0,"max":10},"ports":{"min":0,"max":12}},
    "minecraft":{"ram":{"min":1,"max":64},"cpu":{"min":100,"max":400},"storage":{"min":20,"max":500},"backups":{"min":0,"max":10},"ports":{"min":0,"max":12}},
    "vps":{"vcpu":{"min":1,"max":16},"ram":{"min":1,"max":128},"storage":{"min":20,"max":2000},"ipv4":{"min":1,"max":8}}
  }'::jsonb,
  '{"pricing_source":"manual_admin"}'::jsonb
)
on conflict (settings_key) do update
set
  currency_code = excluded.currency_code,
  ram_price_per_gb = excluded.ram_price_per_gb,
  storage_price_per_50gb = excluded.storage_price_per_50gb,
  cpu_price_per_100_percent = excluded.cpu_price_per_100_percent,
  vcpu_price_per_core = excluded.vcpu_price_per_core,
  additional_port_price = excluded.additional_port_price,
  backup_price = excluded.backup_price,
  ipv4_price = excluded.ipv4_price,
  setup_fee_amount = excluded.setup_fee_amount,
  tax_percent = excluded.tax_percent,
  invoice_due_days = excluded.invoice_due_days,
  allowed_payment_methods = excluded.allowed_payment_methods,
  builder_limits = excluded.builder_limits,
  metadata = excluded.metadata,
  updated_at = now();

update public.features
set
  feature_key = 'ryzen_cpus',
  title = 'Ryzen CPUs',
  description = 'High-performance processors built for game servers and VPS workloads.',
  icon = 'Cpu',
  is_active = true,
  sort_order = 1,
  metadata = '{"group":"performance"}'::jsonb,
  updated_at = now()
where lower(title) = lower('Ryzen CPUs');

update public.features
set
  feature_key = 'ddr5_memory',
  title = 'DDR5 Memory',
  description = 'Fast memory for smoother gameplay and better server performance.',
  icon = 'MemoryStick',
  is_active = true,
  sort_order = 2,
  metadata = '{"group":"performance"}'::jsonb,
  updated_at = now()
where lower(title) = lower('DDR5 Memory');

update public.features
set
  feature_key = 'nvme_ssd',
  title = 'NVMe SSD',
  description = 'Fast storage for quick loading, backups, and world saves.',
  icon = 'HardDrive',
  is_active = true,
  sort_order = 3,
  metadata = '{"group":"performance"}'::jsonb,
  updated_at = now()
where lower(title) = lower('NVMe SSD');

update public.features
set
  feature_key = 'ddos_protection',
  title = 'DDoS Protection',
  description = 'Protection to help keep your services online.',
  icon = 'Shield',
  is_active = true,
  sort_order = 4,
  metadata = '{"group":"network"}'::jsonb,
  updated_at = now()
where lower(title) = lower('DDoS Protection');

update public.features
set
  feature_key = 'panel_access',
  title = 'Panel Access',
  description = 'Simple and powerful control panel for managing game servers.',
  icon = 'Gauge',
  is_active = true,
  sort_order = 5,
  metadata = '{"group":"management"}'::jsonb,
  updated_at = now()
where lower(title) in (lower('Pterodactyl Panel'), lower('Panel Access'));

update public.features
set
  feature_key = 'live_support',
  title = 'Live Support',
  description = 'Get help quickly through Discord and support tickets.',
  icon = 'Headphones',
  is_active = true,
  sort_order = 6,
  metadata = '{"group":"support"}'::jsonb,
  updated_at = now()
where lower(title) = lower('Fast Support');

insert into public.features (feature_key, title, description, icon, is_active, sort_order, metadata)
select 'ryzen_cpus', 'Ryzen CPUs', 'High-performance processors built for game servers and VPS workloads.', 'Cpu', true, 1, '{"group":"performance"}'::jsonb
where not exists (select 1 from public.features where feature_key = 'ryzen_cpus');

insert into public.features (feature_key, title, description, icon, is_active, sort_order, metadata)
select 'ddr5_memory', 'DDR5 Memory', 'Fast memory for smoother gameplay and better server performance.', 'MemoryStick', true, 2, '{"group":"performance"}'::jsonb
where not exists (select 1 from public.features where feature_key = 'ddr5_memory');

insert into public.features (feature_key, title, description, icon, is_active, sort_order, metadata)
select 'nvme_ssd', 'NVMe SSD', 'Fast storage for quick loading, backups, and world saves.', 'HardDrive', true, 3, '{"group":"performance"}'::jsonb
where not exists (select 1 from public.features where feature_key = 'nvme_ssd');

insert into public.features (feature_key, title, description, icon, is_active, sort_order, metadata)
select 'ddos_protection', 'DDoS Protection', 'Protection to help keep your services online.', 'Shield', true, 4, '{"group":"network"}'::jsonb
where not exists (select 1 from public.features where feature_key = 'ddos_protection');

insert into public.features (feature_key, title, description, icon, is_active, sort_order, metadata)
select 'panel_access', 'Panel Access', 'Simple and powerful control panel for managing game servers.', 'Gauge', true, 5, '{"group":"management"}'::jsonb
where not exists (select 1 from public.features where feature_key = 'panel_access');

insert into public.features (feature_key, title, description, icon, is_active, sort_order, metadata)
select 'live_support', 'Live Support', 'Get help quickly through Discord and support tickets.', 'Headphones', true, 6, '{"group":"support"}'::jsonb
where not exists (select 1 from public.features where feature_key = 'live_support');

update public.faqs
set
  faq_key = 'setup_time',
  answer = 'After payment is confirmed, most standard deployments can be provisioned within minutes. Manual review orders are queued with a visible provisioning status.',
  category = 'General',
  is_active = true,
  sort_order = 1,
  metadata = '{}'::jsonb,
  updated_at = now()
where lower(question) = lower('How fast is setup?');

update public.faqs
set
  faq_key = 'panel',
  answer = 'Yes. Game servers are managed through a clean panel workflow and VPS services keep full root access for custom control.',
  category = 'Panel',
  is_active = true,
  sort_order = 2,
  metadata = '{}'::jsonb,
  updated_at = now()
where lower(question) = lower('Do you use Pterodactyl?');

update public.faqs
set
  faq_key = 'upgrades',
  answer = 'Yes. Upgrades can be handled through order adjustments, subscription changes, or a support ticket depending on the service type.',
  category = 'Billing',
  is_active = true,
  sort_order = 3,
  metadata = '{}'::jsonb,
  updated_at = now()
where lower(question) = lower('Can I upgrade later?');

update public.faqs
set
  faq_key = 'ddos',
  answer = 'Yes. RageNodes includes network protection to help keep services online during common attack scenarios.',
  category = 'Network',
  is_active = true,
  sort_order = 4,
  metadata = '{}'::jsonb,
  updated_at = now()
where lower(question) = lower('Do you offer DDoS protection?');

update public.faqs
set
  faq_key = 'payments',
  answer = 'Payment methods, invoices, and subscription records are tracked directly in the billing system and visible to staff through the admin panel.',
  category = 'Billing',
  is_active = true,
  sort_order = 5,
  metadata = '{}'::jsonb,
  updated_at = now()
where lower(question) = lower('How do payments work?');

insert into public.faqs (faq_key, question, answer, category, is_active, sort_order, metadata)
select 'setup_time', 'How fast is setup?', 'After payment is confirmed, most standard deployments can be provisioned within minutes. Manual review orders are queued with a visible provisioning status.', 'General', true, 1, '{}'::jsonb
where not exists (select 1 from public.faqs where faq_key = 'setup_time');

insert into public.faqs (faq_key, question, answer, category, is_active, sort_order, metadata)
select 'panel', 'Do you use Pterodactyl?', 'Yes. Game servers are managed through a clean panel workflow and VPS services keep full root access for custom control.', 'Panel', true, 2, '{}'::jsonb
where not exists (select 1 from public.faqs where faq_key = 'panel');

insert into public.faqs (faq_key, question, answer, category, is_active, sort_order, metadata)
select 'upgrades', 'Can I upgrade later?', 'Yes. Upgrades can be handled through order adjustments, subscription changes, or a support ticket depending on the service type.', 'Billing', true, 3, '{}'::jsonb
where not exists (select 1 from public.faqs where faq_key = 'upgrades');

insert into public.faqs (faq_key, question, answer, category, is_active, sort_order, metadata)
select 'ddos', 'Do you offer DDoS protection?', 'Yes. RageNodes includes network protection to help keep services online during common attack scenarios.', 'Network', true, 4, '{}'::jsonb
where not exists (select 1 from public.faqs where faq_key = 'ddos');

insert into public.faqs (faq_key, question, answer, category, is_active, sort_order, metadata)
select 'payments', 'How do payments work?', 'Payment methods, invoices, and subscription records are tracked directly in the billing system and visible to staff through the admin panel.', 'Billing', true, 5, '{}'::jsonb
where not exists (select 1 from public.faqs where faq_key = 'payments');

insert into public.games (
  product_id,
  name,
  slug,
  category,
  description,
  starting_price,
  supported_versions,
  is_featured,
  is_active,
  sort_order,
  metadata
)
values
  ((select id from public.products where product_key = 'minecraft_hosting'), 'Minecraft', 'minecraft', 'Sandbox', 'Vanilla, Paper, Purpur, Fabric, Forge, and modpack-ready worlds.', '$9.94/month', '["1.21.4","1.21.1","1.20.6","1.20.4","1.20.1","1.19.4","1.18.2","1.16.5","1.12.2"]'::jsonb, true, true, 1, '{"panel_family":"minecraft"}'::jsonb),
  ((select id from public.products where product_key = 'game_server_hosting'), 'Counter-Strike 2', 'counter-strike-2', 'FPS', 'Low-latency competitive servers for private matches and communities.', '$9.94/month', '[]'::jsonb, true, true, 2, '{}'::jsonb),
  ((select id from public.products where product_key = 'game_server_hosting'), 'Rust', 'rust', 'Survival', 'Persistent survival servers with fast storage for wipes and saves.', '$9.94/month', '[]'::jsonb, true, true, 3, '{}'::jsonb),
  ((select id from public.products where product_key = 'game_server_hosting'), 'ARK: Survival Evolved', 'ark-survival-evolved', 'Survival', 'Dino survival hosting with room for mods, maps, and backups.', '$9.94/month', '[]'::jsonb, true, true, 4, '{}'::jsonb),
  ((select id from public.products where product_key = 'game_server_hosting'), 'ARK: Survival Ascended', 'ark-survival-ascended', 'Survival', 'Modern ARK hosting for heavier worlds and growing tribes.', '$9.94/month', '[]'::jsonb, true, true, 5, '{}'::jsonb),
  ((select id from public.products where product_key = 'game_server_hosting'), 'Palworld', 'palworld', 'Survival', 'Private Palworld servers with NVMe storage and DDoS protection.', '$9.94/month', '[]'::jsonb, true, true, 6, '{}'::jsonb),
  ((select id from public.products where product_key = 'game_server_hosting'), 'Valheim', 'valheim', 'Survival', 'Stable Viking survival worlds for friends and communities.', '$9.94/month', '[]'::jsonb, true, true, 7, '{}'::jsonb),
  ((select id from public.products where product_key = 'game_server_hosting'), '7 Days to Die', '7-days-to-die', 'Survival', 'Zombie survival hosting with scheduled backups and easy management.', '$9.94/month', '[]'::jsonb, false, true, 8, '{}'::jsonb),
  ((select id from public.products where product_key = 'game_server_hosting'), 'DayZ', 'dayz', 'Survival', 'Survival communities with persistent storage and reliable uptime.', '$9.94/month', '[]'::jsonb, false, true, 9, '{}'::jsonb),
  ((select id from public.products where product_key = 'game_server_hosting'), 'Garry''s Mod', 'garrys-mod', 'Sandbox', 'Sandbox, DarkRP, TTT, and custom community server hosting.', '$9.94/month', '[]'::jsonb, false, true, 10, '{}'::jsonb),
  ((select id from public.products where product_key = 'game_server_hosting'), 'Team Fortress 2', 'team-fortress-2', 'FPS', 'Classic community FPS hosting for pubs, events, and private games.', '$9.94/month', '[]'::jsonb, false, true, 11, '{}'::jsonb),
  ((select id from public.products where product_key = 'game_server_hosting'), 'Left 4 Dead 2', 'left-4-dead-2', 'FPS', 'Co-op and versus servers with quick setup and simple management.', '$9.94/month', '[]'::jsonb, false, true, 12, '{}'::jsonb),
  ((select id from public.products where product_key = 'game_server_hosting'), 'Killing Floor 2', 'killing-floor-2', 'FPS', 'Wave survival servers tuned for fast loading and stable sessions.', '$9.94/month', '[]'::jsonb, false, true, 13, '{}'::jsonb),
  ((select id from public.products where product_key = 'game_server_hosting'), 'Unturned', 'unturned', 'Survival', 'Lightweight survival servers for modded and vanilla communities.', '$9.94/month', '[]'::jsonb, false, true, 14, '{}'::jsonb),
  ((select id from public.products where product_key = 'game_server_hosting'), 'Terraria', 'terraria', 'Sandbox', 'Small, fast Terraria worlds with easy backups and restores.', '$9.94/month', '[]'::jsonb, false, true, 15, '{}'::jsonb),
  ((select id from public.products where product_key = 'game_server_hosting'), 'Factorio', 'factorio', 'Strategy', 'Automation servers built for long-running factories and saves.', '$9.94/month', '[]'::jsonb, false, true, 16, '{}'::jsonb),
  ((select id from public.products where product_key = 'game_server_hosting'), 'Satisfactory', 'satisfactory', 'Simulation', 'Factory-building servers with persistent worlds and reliable storage.', '$9.94/month', '[]'::jsonb, false, true, 17, '{}'::jsonb),
  ((select id from public.products where product_key = 'game_server_hosting'), 'Conan Exiles', 'conan-exiles', 'Survival', 'Survival RPG hosting for private clans and public communities.', '$9.94/month', '[]'::jsonb, false, true, 18, '{}'::jsonb),
  ((select id from public.products where product_key = 'game_server_hosting'), 'Squad', 'squad', 'FPS', 'Tactical FPS hosting for organized communities and events.', '$9.94/month', '[]'::jsonb, false, true, 19, '{}'::jsonb),
  ((select id from public.products where product_key = 'game_server_hosting'), 'Insurgency: Sandstorm', 'insurgency-sandstorm', 'FPS', 'Realistic FPS servers with dependable network protection.', '$9.94/month', '[]'::jsonb, false, true, 20, '{}'::jsonb),
  ((select id from public.products where product_key = 'game_server_hosting'), 'Hell Let Loose', 'hell-let-loose', 'FPS', 'Large-scale tactical servers for serious communities.', '$9.94/month', '[]'::jsonb, false, true, 21, '{}'::jsonb),
  ((select id from public.products where product_key = 'game_server_hosting'), 'Project Zomboid', 'project-zomboid', 'Survival', 'Persistent apocalypse worlds with backups and mod support.', '$9.94/month', '[]'::jsonb, false, true, 22, '{}'::jsonb),
  ((select id from public.products where product_key = 'game_server_hosting'), 'Space Engineers', 'space-engineers', 'Sandbox', 'Engineering sandbox servers for creative and survival builds.', '$9.94/month', '[]'::jsonb, false, true, 23, '{}'::jsonb),
  ((select id from public.products where product_key = 'game_server_hosting'), 'Eco', 'eco', 'Simulation', 'Long-running society simulation hosting for community projects.', '$9.94/month', '[]'::jsonb, false, true, 24, '{}'::jsonb),
  ((select id from public.products where product_key = 'game_server_hosting'), 'Vintage Story', 'vintage-story', 'Survival', 'Survival sandbox hosting with fast disk and memory options.', '$9.94/month', '[]'::jsonb, false, true, 25, '{}'::jsonb),
  ((select id from public.products where product_key = 'game_server_hosting'), 'FiveM / GTA V RP', 'fivem-gta-v-rp', 'RP', 'Roleplay server hosting for custom scripts and communities.', '$9.94/month', '[]'::jsonb, true, true, 26, '{}'::jsonb),
  ((select id from public.products where product_key = 'game_server_hosting'), 'RimWorld', 'rimworld', 'Strategy', 'Colony simulation hosting for multiplayer and community sessions.', '$9.94/month', '[]'::jsonb, false, true, 27, '{}'::jsonb),
  ((select id from public.products where product_key = 'game_server_hosting'), 'Don''t Starve Together', 'dont-starve-together', 'Survival', 'Co-op survival hosting for private groups and public worlds.', '$9.94/month', '[]'::jsonb, false, true, 28, '{}'::jsonb),
  ((select id from public.products where product_key = 'game_server_hosting'), 'OpenTTD', 'openttd', 'Simulation', 'Transport simulation servers for long-running multiplayer games.', '$9.94/month', '[]'::jsonb, false, true, 29, '{}'::jsonb),
  ((select id from public.products where product_key = 'game_server_hosting'), 'Assetto Corsa', 'assetto-corsa', 'Simulation', 'Racing server hosting for leagues, events, and practice sessions.', '$9.94/month', '[]'::jsonb, false, true, 30, '{}'::jsonb),
  ((select id from public.products where product_key = 'game_server_hosting'), 'American Truck Simulator', 'american-truck-simulator', 'Simulation', 'Convoy and community server hosting for trucking groups.', '$9.94/month', '[]'::jsonb, false, true, 31, '{}'::jsonb),
  ((select id from public.products where product_key = 'game_server_hosting'), 'Euro Truck Simulator 2', 'euro-truck-simulator-2', 'Simulation', 'European trucking community hosting with dependable uptime.', '$9.94/month', '[]'::jsonb, false, true, 32, '{}'::jsonb)
on conflict (slug) do update
set
  product_id = excluded.product_id,
  name = excluded.name,
  category = excluded.category,
  description = excluded.description,
  starting_price = excluded.starting_price,
  supported_versions = excluded.supported_versions,
  is_featured = excluded.is_featured,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order,
  metadata = excluded.metadata,
  updated_at = now();

update public.plans
set
  product_id = (select id from public.products where product_key = 'game_server_hosting'),
  slug = 'budget-game',
  sku = 'GS-BUDGET',
  plan_kind = 'standard',
  price = 9.94,
  setup_fee_amount = 0,
  currency_code = 'USD',
  billing_cycle = 'monthly',
  billing_interval_count = 1,
  ram = 2,
  cpu = 100,
  vcpu = null,
  storage = 20,
  backups = 1,
  databases = 1,
  ipv4_count = null,
  description = 'For small communities and lightweight servers',
  features = '["2GB DDR5 RAM","20GB NVMe SSD","100% Ryzen CPU","1 backup","1 database","DDoS protection"]'::jsonb,
  is_popular = false,
  is_public = true,
  is_active = true,
  stock_policy = 'unlimited',
  sort_order = 10,
  provisioning_template = 'pterodactyl-game',
  metadata = '{"family":"game_server"}'::jsonb,
  updated_at = now()
where lower(name) = lower('Budget Game Server') and category = 'Game Server';

update public.plans
set
  product_id = (select id from public.products where product_key = 'game_server_hosting'),
  slug = 'standard-game',
  sku = 'GS-STANDARD',
  plan_kind = 'standard',
  price = 18.31,
  setup_fee_amount = 0,
  currency_code = 'USD',
  billing_cycle = 'monthly',
  billing_interval_count = 1,
  ram = 4,
  cpu = 150,
  vcpu = null,
  storage = 30,
  backups = 2,
  databases = 2,
  ipv4_count = null,
  description = 'Balanced resources for most game servers',
  features = '["4GB DDR5 RAM","30GB NVMe SSD","150% Ryzen CPU","2 backups","2 databases","DDoS protection"]'::jsonb,
  is_popular = true,
  is_public = true,
  is_active = true,
  stock_policy = 'unlimited',
  sort_order = 11,
  provisioning_template = 'pterodactyl-game',
  metadata = '{"family":"game_server"}'::jsonb,
  updated_at = now()
where lower(name) = lower('Standard Game Server') and category = 'Game Server';

update public.plans
set
  product_id = (select id from public.products where product_key = 'game_server_hosting'),
  slug = 'premium-game',
  sku = 'GS-PREMIUM',
  plan_kind = 'standard',
  price = 27.50,
  setup_fee_amount = 0,
  currency_code = 'USD',
  billing_cycle = 'monthly',
  billing_interval_count = 1,
  ram = 6,
  cpu = 200,
  vcpu = null,
  storage = 50,
  backups = 3,
  databases = 3,
  ipv4_count = null,
  description = 'Extra power for growing communities',
  features = '["6GB DDR5 RAM","50GB NVMe SSD","200% Ryzen CPU","3 backups","3 databases","DDoS protection"]'::jsonb,
  is_popular = false,
  is_public = true,
  is_active = true,
  stock_policy = 'unlimited',
  sort_order = 12,
  provisioning_template = 'pterodactyl-game',
  metadata = '{"family":"game_server"}'::jsonb,
  updated_at = now()
where lower(name) = lower('Premium Game Server') and category = 'Game Server';

update public.plans
set
  product_id = (select id from public.products where product_key = 'minecraft_hosting'),
  slug = 'budget-minecraft',
  sku = 'MC-BUDGET',
  plan_kind = 'standard',
  price = 9.94,
  setup_fee_amount = 0,
  currency_code = 'USD',
  billing_cycle = 'monthly',
  billing_interval_count = 1,
  ram = 2,
  cpu = 100,
  vcpu = null,
  storage = 20,
  backups = 1,
  databases = 1,
  ipv4_count = null,
  description = 'A clean start for small Minecraft servers',
  features = '["2GB DDR5 RAM","20GB NVMe SSD","100% Ryzen CPU","1 backup","1 database","DDoS protection"]'::jsonb,
  is_popular = false,
  is_public = true,
  is_active = true,
  stock_policy = 'unlimited',
  sort_order = 20,
  provisioning_template = 'pterodactyl-minecraft',
  metadata = '{"family":"minecraft"}'::jsonb,
  updated_at = now()
where lower(name) = lower('Budget Minecraft') and category = 'Minecraft';

update public.plans
set
  product_id = (select id from public.products where product_key = 'minecraft_hosting'),
  slug = 'standard-minecraft',
  sku = 'MC-STANDARD',
  plan_kind = 'standard',
  price = 18.31,
  setup_fee_amount = 0,
  currency_code = 'USD',
  billing_cycle = 'monthly',
  billing_interval_count = 1,
  ram = 4,
  cpu = 150,
  vcpu = null,
  storage = 30,
  backups = 2,
  databases = 2,
  ipv4_count = null,
  description = 'Most Popular for SMPs and friend groups',
  features = '["4GB DDR5 RAM","30GB NVMe SSD","150% Ryzen CPU","2 backups","2 databases","DDoS protection"]'::jsonb,
  is_popular = true,
  is_public = true,
  is_active = true,
  stock_policy = 'unlimited',
  sort_order = 21,
  provisioning_template = 'pterodactyl-minecraft',
  metadata = '{"family":"minecraft"}'::jsonb,
  updated_at = now()
where lower(name) = lower('Standard Minecraft') and category = 'Minecraft';

update public.plans
set
  product_id = (select id from public.products where product_key = 'minecraft_hosting'),
  slug = 'premium-minecraft',
  sku = 'MC-PREMIUM',
  plan_kind = 'standard',
  price = 27.50,
  setup_fee_amount = 0,
  currency_code = 'USD',
  billing_cycle = 'monthly',
  billing_interval_count = 1,
  ram = 6,
  cpu = 200,
  vcpu = null,
  storage = 50,
  backups = 3,
  databases = 3,
  ipv4_count = null,
  description = 'More headroom for plugins and modpacks',
  features = '["6GB DDR5 RAM","50GB NVMe SSD","200% Ryzen CPU","3 backups","3 databases","DDoS protection"]'::jsonb,
  is_popular = false,
  is_public = true,
  is_active = true,
  stock_policy = 'unlimited',
  sort_order = 22,
  provisioning_template = 'pterodactyl-minecraft',
  metadata = '{"family":"minecraft"}'::jsonb,
  updated_at = now()
where lower(name) = lower('Premium Minecraft') and category = 'Minecraft';

update public.plans
set
  product_id = (select id from public.products where product_key = 'vps_hosting'),
  slug = 'starter-vps',
  sku = 'VPS-STARTER',
  plan_kind = 'standard',
  price = 12.38,
  setup_fee_amount = 0,
  currency_code = 'USD',
  billing_cycle = 'monthly',
  billing_interval_count = 1,
  ram = 4,
  cpu = null,
  vcpu = 2,
  storage = 40,
  backups = null,
  databases = null,
  ipv4_count = 1,
  description = 'Dedicated resources for apps, bots, panels, and services.',
  features = '["2 vCPU","4GB RAM","40GB NVMe SSD","1 IPv4","Full root access"]'::jsonb,
  is_popular = false,
  is_public = true,
  is_active = true,
  stock_policy = 'unlimited',
  sort_order = 30,
  provisioning_template = 'proxmox-vps',
  metadata = '{"family":"vps"}'::jsonb,
  updated_at = now()
where lower(name) = lower('Starter VPS') and category = 'VPS';

update public.plans
set
  product_id = (select id from public.products where product_key = 'vps_hosting'),
  slug = 'performance-vps',
  sku = 'VPS-PERFORMANCE',
  plan_kind = 'standard',
  price = 24.26,
  setup_fee_amount = 0,
  currency_code = 'USD',
  billing_cycle = 'monthly',
  billing_interval_count = 1,
  ram = 8,
  cpu = null,
  vcpu = 4,
  storage = 80,
  backups = null,
  databases = null,
  ipv4_count = 1,
  description = 'Dedicated resources for apps, bots, panels, and services.',
  features = '["4 vCPU","8GB RAM","80GB NVMe SSD","1 IPv4","Full root access"]'::jsonb,
  is_popular = true,
  is_public = true,
  is_active = true,
  stock_policy = 'unlimited',
  sort_order = 31,
  provisioning_template = 'proxmox-vps',
  metadata = '{"family":"vps"}'::jsonb,
  updated_at = now()
where lower(name) = lower('Performance VPS') and category = 'VPS';

update public.plans
set
  product_id = (select id from public.products where product_key = 'vps_hosting'),
  slug = 'pro-vps',
  sku = 'VPS-PRO',
  plan_kind = 'standard',
  price = 45.02,
  setup_fee_amount = 0,
  currency_code = 'USD',
  billing_cycle = 'monthly',
  billing_interval_count = 1,
  ram = 16,
  cpu = null,
  vcpu = 6,
  storage = 160,
  backups = null,
  databases = null,
  ipv4_count = 1,
  description = 'Dedicated resources for apps, bots, panels, and services.',
  features = '["6 vCPU","16GB RAM","160GB NVMe SSD","1 IPv4","Full root access"]'::jsonb,
  is_popular = false,
  is_public = true,
  is_active = true,
  stock_policy = 'unlimited',
  sort_order = 32,
  provisioning_template = 'proxmox-vps',
  metadata = '{"family":"vps"}'::jsonb,
  updated_at = now()
where lower(name) = lower('Pro VPS') and category = 'VPS';

insert into public.plans (
  product_id,
  slug,
  sku,
  name,
  category,
  plan_kind,
  price,
  setup_fee_amount,
  currency_code,
  billing_cycle,
  billing_interval_count,
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
  is_public,
  is_active,
  stock_policy,
  sort_order,
  provisioning_template,
  metadata
)
select
  (select id from public.products where product_key = 'game_server_hosting'),
  'budget-game',
  'GS-BUDGET',
  'Budget Game Server',
  'Game Server',
  'standard',
  9.94,
  0,
  'USD',
  'monthly',
  1,
  2,
  100,
  null,
  20,
  1,
  1,
  null,
  'For small communities and lightweight servers',
  '["2GB DDR5 RAM","20GB NVMe SSD","100% Ryzen CPU","1 backup","1 database","DDoS protection"]'::jsonb,
  false,
  true,
  true,
  'unlimited',
  10,
  'pterodactyl-game',
  '{"family":"game_server"}'::jsonb
where not exists (select 1 from public.plans where lower(slug) = lower('budget-game'));

insert into public.plans (
  product_id, slug, sku, name, category, plan_kind, price, setup_fee_amount, currency_code,
  billing_cycle, billing_interval_count, ram, cpu, vcpu, storage, backups, databases, ipv4_count,
  description, features, is_popular, is_public, is_active, stock_policy, sort_order,
  provisioning_template, metadata
)
select
  (select id from public.products where product_key = 'game_server_hosting'),
  'standard-game', 'GS-STANDARD', 'Standard Game Server', 'Game Server', 'standard', 18.31, 0, 'USD',
  'monthly', 1, 4, 150, null, 30, 2, 2, null,
  'Balanced resources for most game servers',
  '["4GB DDR5 RAM","30GB NVMe SSD","150% Ryzen CPU","2 backups","2 databases","DDoS protection"]'::jsonb,
  true, true, true, 'unlimited', 11, 'pterodactyl-game', '{"family":"game_server"}'::jsonb
where not exists (select 1 from public.plans where lower(slug) = lower('standard-game'));

insert into public.plans (
  product_id, slug, sku, name, category, plan_kind, price, setup_fee_amount, currency_code,
  billing_cycle, billing_interval_count, ram, cpu, vcpu, storage, backups, databases, ipv4_count,
  description, features, is_popular, is_public, is_active, stock_policy, sort_order,
  provisioning_template, metadata
)
select
  (select id from public.products where product_key = 'game_server_hosting'),
  'premium-game', 'GS-PREMIUM', 'Premium Game Server', 'Game Server', 'standard', 27.50, 0, 'USD',
  'monthly', 1, 6, 200, null, 50, 3, 3, null,
  'Extra power for growing communities',
  '["6GB DDR5 RAM","50GB NVMe SSD","200% Ryzen CPU","3 backups","3 databases","DDoS protection"]'::jsonb,
  false, true, true, 'unlimited', 12, 'pterodactyl-game', '{"family":"game_server"}'::jsonb
where not exists (select 1 from public.plans where lower(slug) = lower('premium-game'));

insert into public.plans (
  product_id, slug, sku, name, category, plan_kind, price, setup_fee_amount, currency_code,
  billing_cycle, billing_interval_count, ram, cpu, vcpu, storage, backups, databases, ipv4_count,
  description, features, is_popular, is_public, is_active, stock_policy, sort_order,
  provisioning_template, metadata
)
select
  (select id from public.products where product_key = 'minecraft_hosting'),
  'budget-minecraft', 'MC-BUDGET', 'Budget Minecraft', 'Minecraft', 'standard', 9.94, 0, 'USD',
  'monthly', 1, 2, 100, null, 20, 1, 1, null,
  'A clean start for small Minecraft servers',
  '["2GB DDR5 RAM","20GB NVMe SSD","100% Ryzen CPU","1 backup","1 database","DDoS protection"]'::jsonb,
  false, true, true, 'unlimited', 20, 'pterodactyl-minecraft', '{"family":"minecraft"}'::jsonb
where not exists (select 1 from public.plans where lower(slug) = lower('budget-minecraft'));

insert into public.plans (
  product_id, slug, sku, name, category, plan_kind, price, setup_fee_amount, currency_code,
  billing_cycle, billing_interval_count, ram, cpu, vcpu, storage, backups, databases, ipv4_count,
  description, features, is_popular, is_public, is_active, stock_policy, sort_order,
  provisioning_template, metadata
)
select
  (select id from public.products where product_key = 'minecraft_hosting'),
  'standard-minecraft', 'MC-STANDARD', 'Standard Minecraft', 'Minecraft', 'standard', 18.31, 0, 'USD',
  'monthly', 1, 4, 150, null, 30, 2, 2, null,
  'Most Popular for SMPs and friend groups',
  '["4GB DDR5 RAM","30GB NVMe SSD","150% Ryzen CPU","2 backups","2 databases","DDoS protection"]'::jsonb,
  true, true, true, 'unlimited', 21, 'pterodactyl-minecraft', '{"family":"minecraft"}'::jsonb
where not exists (select 1 from public.plans where lower(slug) = lower('standard-minecraft'));

insert into public.plans (
  product_id, slug, sku, name, category, plan_kind, price, setup_fee_amount, currency_code,
  billing_cycle, billing_interval_count, ram, cpu, vcpu, storage, backups, databases, ipv4_count,
  description, features, is_popular, is_public, is_active, stock_policy, sort_order,
  provisioning_template, metadata
)
select
  (select id from public.products where product_key = 'minecraft_hosting'),
  'premium-minecraft', 'MC-PREMIUM', 'Premium Minecraft', 'Minecraft', 'standard', 27.50, 0, 'USD',
  'monthly', 1, 6, 200, null, 50, 3, 3, null,
  'More headroom for plugins and modpacks',
  '["6GB DDR5 RAM","50GB NVMe SSD","200% Ryzen CPU","3 backups","3 databases","DDoS protection"]'::jsonb,
  false, true, true, 'unlimited', 22, 'pterodactyl-minecraft', '{"family":"minecraft"}'::jsonb
where not exists (select 1 from public.plans where lower(slug) = lower('premium-minecraft'));

insert into public.plans (
  product_id, slug, sku, name, category, plan_kind, price, setup_fee_amount, currency_code,
  billing_cycle, billing_interval_count, ram, cpu, vcpu, storage, backups, databases, ipv4_count,
  description, features, is_popular, is_public, is_active, stock_policy, sort_order,
  provisioning_template, metadata
)
select
  (select id from public.products where product_key = 'vps_hosting'),
  'starter-vps', 'VPS-STARTER', 'Starter VPS', 'VPS', 'standard', 12.38, 0, 'USD',
  'monthly', 1, 4, null, 2, 40, null, null, 1,
  'Dedicated resources for apps, bots, panels, and services.',
  '["2 vCPU","4GB RAM","40GB NVMe SSD","1 IPv4","Full root access"]'::jsonb,
  false, true, true, 'unlimited', 30, 'proxmox-vps', '{"family":"vps"}'::jsonb
where not exists (select 1 from public.plans where lower(slug) = lower('starter-vps'));

insert into public.plans (
  product_id, slug, sku, name, category, plan_kind, price, setup_fee_amount, currency_code,
  billing_cycle, billing_interval_count, ram, cpu, vcpu, storage, backups, databases, ipv4_count,
  description, features, is_popular, is_public, is_active, stock_policy, sort_order,
  provisioning_template, metadata
)
select
  (select id from public.products where product_key = 'vps_hosting'),
  'performance-vps', 'VPS-PERFORMANCE', 'Performance VPS', 'VPS', 'standard', 24.26, 0, 'USD',
  'monthly', 1, 8, null, 4, 80, null, null, 1,
  'Dedicated resources for apps, bots, panels, and services.',
  '["4 vCPU","8GB RAM","80GB NVMe SSD","1 IPv4","Full root access"]'::jsonb,
  true, true, true, 'unlimited', 31, 'proxmox-vps', '{"family":"vps"}'::jsonb
where not exists (select 1 from public.plans where lower(slug) = lower('performance-vps'));

insert into public.plans (
  product_id, slug, sku, name, category, plan_kind, price, setup_fee_amount, currency_code,
  billing_cycle, billing_interval_count, ram, cpu, vcpu, storage, backups, databases, ipv4_count,
  description, features, is_popular, is_public, is_active, stock_policy, sort_order,
  provisioning_template, metadata
)
select
  (select id from public.products where product_key = 'vps_hosting'),
  'pro-vps', 'VPS-PRO', 'Pro VPS', 'VPS', 'standard', 45.02, 0, 'USD',
  'monthly', 1, 16, null, 6, 160, null, null, 1,
  'Dedicated resources for apps, bots, panels, and services.',
  '["6 vCPU","16GB RAM","160GB NVMe SSD","1 IPv4","Full root access"]'::jsonb,
  false, true, true, 'unlimited', 32, 'proxmox-vps', '{"family":"vps"}'::jsonb
where not exists (select 1 from public.plans where lower(slug) = lower('pro-vps'));

insert into public.cms_pages (
  page_key,
  slug,
  title,
  summary,
  body_markdown,
  seo_title,
  seo_description,
  is_published,
  sort_order,
  metadata
)
values
  (
    'privacy',
    'privacy',
    'Privacy Policy',
    'How RageNodes stores and uses customer data.',
    $page$
# Privacy Policy

RageNodes stores account, order, billing, support, and provisioning data required to operate hosting services, respond to tickets, prevent abuse, and comply with payment obligations.

We keep audit and activity logs for administrative accountability. Payment provider payloads are retained only in secured operational records and are never exposed to public clients.

You can request corrections to profile or billing data by contacting support from the account email address.
$page$,
    'Privacy Policy - RageNodes',
    'Privacy policy for RageNodes hosting, billing, support, and operational data.',
    true,
    10,
    '{}'::jsonb
  ),
  (
    'terms',
    'terms',
    'Terms of Service',
    'Core service rules for hosting, billing, abuse, and suspensions.',
    $page$
# Terms of Service

By ordering a RageNodes service, customers agree to pay invoices on time, avoid illegal or abusive use, and cooperate with requests needed for fraud prevention or abuse investigations.

Services may be suspended for non-payment, abuse, network attacks, or platform risk. Configuration changes, upgrades, and migration requests may require billing adjustments or support confirmation.

Refund handling depends on payment state, provisioning state, and abuse history.
$page$,
    'Terms of Service - RageNodes',
    'Terms for RageNodes hosting orders, billing, suspensions, and abuse handling.',
    true,
    20,
    '{}'::jsonb
  ),
  (
    'status',
    'status',
    'Platform Status',
    'Live service health, provisioning state, and support notes.',
    $page$
# Platform Status

Use this page for network incidents, maintenance windows, and provisioning delays. For account-specific issues, open a support ticket so the server, order, or invoice can be linked directly.
$page$,
    'Status - RageNodes',
    'Status and maintenance communication page for RageNodes.',
    true,
    30,
    '{}'::jsonb
  ),
  (
    'contact',
    'contact',
    'Contact',
    'Support, sales, and billing contact details.',
    $page$
# Contact

- Support: support@ragenodes.cloud
- Sales: sales@ragenodes.cloud
- Billing: billing@ragenodes.cloud
- Discord: https://discord.gg/ragenodes

For urgent service issues, open a support ticket from the website so the conversation can sync into Discord staff workflows.
$page$,
    'Contact - RageNodes',
    'Support, billing, and sales contact channels for RageNodes.',
    true,
    40,
    '{}'::jsonb
  )
on conflict (page_key) do update
set
  slug = excluded.slug,
  title = excluded.title,
  summary = excluded.summary,
  body_markdown = excluded.body_markdown,
  seo_title = excluded.seo_title,
  seo_description = excluded.seo_description,
  is_published = excluded.is_published,
  sort_order = excluded.sort_order,
  metadata = excluded.metadata,
  updated_at = now();

insert into public.cms_content_blocks (
  page_key,
  block_key,
  block_type,
  title,
  subtitle,
  content_json,
  is_active,
  sort_order,
  metadata
)
values
  (
    'homepage',
    'hero_trust',
    'stats',
    'Operations at a glance',
    'Quick proof points for the hero section.',
    '[{"label":"Hardware","value":"Ryzen + DDR5"},{"label":"Storage","value":"NVMe"},{"label":"Billing","value":"Invoices + Orders"},{"label":"Support","value":"Website + Discord"}]'::jsonb,
    true,
    10,
    '{}'::jsonb
  ),
  (
    'homepage',
    'builder_notes',
    'content',
    'Builder pricing',
    'Live rates used by the custom server builder.',
    '{"ram":"$1.40 / GB","storage":"$4.10 / 50GB","cpu":"$1.50 / 100%","port":"$0.50 each","backup":"$4.00 each"}'::jsonb,
    true,
    20,
    '{}'::jsonb
  ),
  (
    'support',
    'support_channels',
    'cards',
    'Support channels',
    'Where customers can reach the team.',
    '[{"title":"Tickets","description":"Best for account-linked server issues."},{"title":"Discord","description":"Fast conversation and escalation."},{"title":"Billing","description":"Invoice and payment questions."}]'::jsonb,
    true,
    10,
    '{}'::jsonb
  ),
  (
    'status',
    'status_notices',
    'timeline',
    'Operational notices',
    'Maintenance and incident communication.',
    '[]'::jsonb,
    true,
    10,
    '{}'::jsonb
  )
on conflict (page_key, block_key) do update
set
  block_type = excluded.block_type,
  title = excluded.title,
  subtitle = excluded.subtitle,
  content_json = excluded.content_json,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order,
  metadata = excluded.metadata,
  updated_at = now();

with nav(location_key, label, href, icon_name, is_external, is_active, sort_order, metadata) as (
  values
    ('header', 'Game Servers', '/games', 'Gamepad2', false, true, 10, '{}'::jsonb),
    ('header', 'Minecraft', '/minecraft', 'Blocks', false, true, 20, '{}'::jsonb),
    ('header', 'VPS', '/vps', 'Server', false, true, 30, '{}'::jsonb),
    ('header', 'Builder', '/builder', 'SlidersHorizontal', false, true, 40, '{}'::jsonb),
    ('header', 'Pricing', '/pricing', 'BadgeDollarSign', false, true, 50, '{}'::jsonb),
    ('header', 'Support', '/support', 'LifeBuoy', false, true, 60, '{}'::jsonb),
    ('mobile', 'Game Servers', '/games', 'Gamepad2', false, true, 10, '{}'::jsonb),
    ('mobile', 'Minecraft', '/minecraft', 'Blocks', false, true, 20, '{}'::jsonb),
    ('mobile', 'VPS', '/vps', 'Server', false, true, 30, '{}'::jsonb),
    ('mobile', 'Builder', '/builder', 'SlidersHorizontal', false, true, 40, '{}'::jsonb),
    ('mobile', 'Pricing', '/pricing', 'BadgeDollarSign', false, true, 50, '{}'::jsonb),
    ('mobile', 'Support', '/support', 'LifeBuoy', false, true, 60, '{}'::jsonb),
    ('footer', 'Games', '/games', 'Gamepad2', false, true, 10, '{}'::jsonb),
    ('footer', 'Pricing', '/pricing', 'BadgeDollarSign', false, true, 20, '{}'::jsonb),
    ('footer', 'Panel', 'https://panel.ragenodes.cloud', 'LayoutDashboard', true, true, 30, '{}'::jsonb),
    ('footer', 'Billing', 'https://billing.ragenodes.cloud', 'ReceiptText', true, true, 40, '{}'::jsonb),
    ('footer', 'Status', '/status', 'Activity', false, true, 50, '{}'::jsonb),
    ('footer', 'Support', '/support', 'LifeBuoy', false, true, 60, '{}'::jsonb),
    ('side_left', 'Discord', 'https://discord.gg/ragenodes', 'MessagesSquare', true, true, 10, '{}'::jsonb),
    ('side_left', 'Email', 'mailto:support@ragenodes.cloud', 'Mail', true, true, 20, '{}'::jsonb),
    ('side_left', 'Status', '/status', 'Activity', false, true, 30, '{}'::jsonb),
    ('side_right', 'Panel', 'https://panel.ragenodes.cloud', 'LayoutDashboard', true, true, 10, '{}'::jsonb),
    ('side_right', 'Billing', 'https://billing.ragenodes.cloud', 'ReceiptText', true, true, 20, '{}'::jsonb),
    ('side_right', 'Support', '/support', 'LifeBuoy', false, true, 30, '{}'::jsonb),
    ('legal', 'Privacy', '/privacy', 'Shield', false, true, 10, '{}'::jsonb),
    ('legal', 'Terms', '/terms', 'FileText', false, true, 20, '{}'::jsonb)
)
insert into public.cms_navigation_links (
  location_key,
  label,
  href,
  icon_name,
  is_external,
  is_active,
  sort_order,
  metadata
)
select n.location_key, n.label, n.href, n.icon_name, n.is_external, n.is_active, n.sort_order, n.metadata
from nav n
where not exists (
  select 1
  from public.cms_navigation_links existing
  where existing.location_key = n.location_key
    and existing.label = n.label
    and existing.href = n.href
);

insert into public.api_integration_settings (
  provider_key,
  provider_kind,
  display_name,
  environment,
  base_url,
  is_enabled,
  secret_reference,
  oauth_client_id,
  oauth_client_secret_reference,
  webhook_secret_reference,
  service_account_reference,
  public_config,
  health_status,
  metadata
)
values
  ('paypal', 'payment', 'PayPal', 'production', 'https://api-m.paypal.com', false, 'vault/paypal/live-client-secret', null, null, 'vault/paypal/webhook-id', null, '{"checkout":"order_capture"}'::jsonb, 'unknown', '{}'::jsonb),
  ('bog', 'payment', 'Bank of Georgia', 'production', 'https://api.bog.ge', false, 'vault/bog/api-key', null, null, 'vault/bog/webhook-secret', null, '{"payment_type":"redirect"}'::jsonb, 'unknown', '{}'::jsonb),
  ('tbc', 'payment', 'TBC Bank', 'production', 'https://api.tbcbank.ge', false, 'vault/tbc/api-key', null, null, 'vault/tbc/webhook-secret', null, '{"payment_type":"redirect"}'::jsonb, 'unknown', '{}'::jsonb),
  ('discord_support', 'communication', 'Discord Support Bot', 'production', 'https://discord.com/api/v10', false, 'vault/discord/bot-token', null, null, 'vault/discord/interactions-public-key', null, '{"channel":"support"}'::jsonb, 'unknown', '{}'::jsonb),
  ('pterodactyl', 'provisioning', 'Pterodactyl Panel', 'production', 'https://panel.ragenodes.cloud/api', false, 'vault/pterodactyl/api-key', null, null, null, null, '{"resource":"servers"}'::jsonb, 'unknown', '{}'::jsonb),
  ('supabase_auth', 'identity', 'Supabase Auth', 'production', 'https://ounhrtcdlpcykmncocct.supabase.co', true, null, 'supabase-managed', null, null, null, '{"providers":["email","google","discord"]}'::jsonb, 'healthy', '{}'::jsonb)
on conflict (provider_key) do update
set
  provider_kind = excluded.provider_kind,
  display_name = excluded.display_name,
  environment = excluded.environment,
  base_url = excluded.base_url,
  is_enabled = excluded.is_enabled,
  secret_reference = excluded.secret_reference,
  oauth_client_id = excluded.oauth_client_id,
  oauth_client_secret_reference = excluded.oauth_client_secret_reference,
  webhook_secret_reference = excluded.webhook_secret_reference,
  service_account_reference = excluded.service_account_reference,
  public_config = excluded.public_config,
  health_status = excluded.health_status,
  metadata = excluded.metadata,
  updated_at = now();

update public.coupons
set
  name = 'Welcome 10%',
  description = '10% off the first order for new customers.',
  discount_type = 'percentage',
  discount_value = 10,
  currency_code = 'USD',
  min_order_amount = 0,
  max_redemptions = 500,
  per_user_limit = 1,
  starts_at = now(),
  ends_at = null,
  applies_to_all = true,
  scope_rules = '{}'::jsonb,
  is_active = true,
  metadata = '{"seeded":true}'::jsonb,
  updated_at = now()
where lower(code) = lower('WELCOME10');

insert into public.coupons (
  code,
  name,
  description,
  discount_type,
  discount_value,
  currency_code,
  min_order_amount,
  max_redemptions,
  per_user_limit,
  starts_at,
  ends_at,
  applies_to_all,
  scope_rules,
  is_active,
  metadata
)
select
  'WELCOME10',
  'Welcome 10%',
  '10% off the first order for new customers.',
  'percentage',
  10,
  'USD',
  0,
  500,
  1,
  now(),
  null,
  true,
  '{}'::jsonb,
  true,
  '{"seeded":true}'::jsonb
where not exists (select 1 from public.coupons where lower(code) = lower('WELCOME10'));

update public.coupons
set
  name = 'Free Setup',
  description = 'Waives any setup fee on eligible services.',
  discount_type = 'free_setup',
  discount_value = 0,
  currency_code = 'USD',
  min_order_amount = 0,
  max_redemptions = null,
  per_user_limit = 1,
  starts_at = now(),
  ends_at = null,
  applies_to_all = true,
  scope_rules = '{"applies_to":["plans","builder"]}'::jsonb,
  is_active = true,
  metadata = '{"seeded":true}'::jsonb,
  updated_at = now()
where lower(code) = lower('SETUPFREE');

insert into public.coupons (
  code,
  name,
  description,
  discount_type,
  discount_value,
  currency_code,
  min_order_amount,
  max_redemptions,
  per_user_limit,
  starts_at,
  ends_at,
  applies_to_all,
  scope_rules,
  is_active,
  metadata
)
select
  'SETUPFREE',
  'Free Setup',
  'Waives any setup fee on eligible services.',
  'free_setup',
  0,
  'USD',
  0,
  null,
  1,
  now(),
  null,
  true,
  '{"applies_to":["plans","builder"]}'::jsonb,
  true,
  '{"seeded":true}'::jsonb
where not exists (select 1 from public.coupons where lower(code) = lower('SETUPFREE'));

commit;
