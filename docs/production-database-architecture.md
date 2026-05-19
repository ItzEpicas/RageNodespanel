# RageNodes Production Database Architecture

This document maps the full Supabase/PostgreSQL schema to the current codebase and explains what still has to be connected in the app layer.

## 1. Full migration SQL

Use [supabase/migrations/20260518233000_full_production_schema.sql](/c:/Users/epicas/Desktop/ragenodes-premium-host-main/supabase/migrations/20260518233000_full_production_schema.sql:1).

## 2. Seed SQL

Use [supabase/seed.sql](/c:/Users/epicas/Desktop/ragenodes-premium-host-main/supabase/seed.sql:1).

## 3. Table and view explanations

### Identity, auth, users, and admin access

- `auth.users`
  Supabase-managed canonical user account table. This is the real user identity source for email, OAuth, password auth, and session ownership.

- `public.profiles`
  Application profile table linked 1:1 to `auth.users`. Stores display/billing/contact fields, locale, timezone, currency preference, activity markers, and structured metadata for the customer account.

- `public.roles`
  System role catalog such as owner, admin, support agent, billing manager, content manager, and customer.

- `public.permissions`
  Permission catalog used for granular admin authorization. Permissions are action-based keys such as `orders.manage`, `billing.manage`, and `cms.manage`.

- `public.role_permissions`
  Join table that maps permissions to roles. This is the core authorization matrix for the admin panel.

- `public.user_role_assignments`
  Assigns one or more roles to a user, optionally scoped and expiring. This replaces the current localStorage admin password gate with a real production authorization model.

- `public.admin_user_preferences`
  Stores per-admin UI preferences such as saved filters, dashboard layout, and sidebar state.

### Catalog, pricing, CMS, and public website content

- `public.products`
  Top-level sellable product families: game server hosting, Minecraft hosting, VPS hosting, and custom builder service. This becomes the backbone for catalog management and provisioning templates.

- `public.site_settings`
  Global website/company settings: brand name, support/billing/sales contacts, panel links, status links, locale, currency, and maintenance mode.

- `public.homepage_content`
  Singleton homepage content table for hero copy, CTA copy, SEO text, and hero metrics.

- `public.pricing_settings`
  Central builder pricing configuration. This directly supports the custom server builder and stores the exact rates you gave: RAM, SSD, CPU, port, backup, IPv4, plus limits and payment method config.

- `public.games`
  Supported game catalog with categories, descriptions, sort order, optional supported versions, featured flag, and product linkage.

- `public.features`
  Public marketing/operations feature cards such as DDR5, NVMe, DDoS protection, panel access, and live support.

- `public.faqs`
  Public FAQ entries with categories and sort order.

- `public.plans`
  Production hosting plans for game hosting, Minecraft, and VPS. Stores SKU, slug, billing interval, public visibility, provisioning template, and plan resources.

- `public.cms_pages`
  Admin-editable markdown pages such as privacy, terms, status, and contact.

- `public.cms_content_blocks`
  Structured reusable content blocks for admin-managed page sections such as hero metrics, support cards, or status notices.

- `public.cms_navigation_links`
  Admin-managed navigation definitions for header, mobile, footer, and side action rails.

- `public.api_integration_settings`
  Secure provider registry for payment, provisioning, communication, identity, and analytics integrations. It stores secret references and health state, not raw secrets.

- `public.coupons`
  Coupon master table for percentage/fixed/setup-fee promotions, usage windows, and scope rules.

### Orders, payments, invoices, subscriptions, and commerce

- `public.orders`
  Master customer order record. Keeps compatibility with the current order form while adding production fields for user linkage, coupon linkage, billing totals, pricing snapshot, source, notes, and fulfillment state.

- `public.order_items`
  Normalized line items for an order. Required for real invoices, per-item taxation/discounting, builder configurations, add-ons, and recurring subscription generation.

- `public.invoices`
  Billing invoice header table. Tracks draft/open/paid/void/refund state, due date, amount paid, provider invoice references, and billing details.

- `public.invoice_items`
  Normalized invoice lines. Mirrors billable components from order items or manual billing adjustments.

- `public.subscriptions`
  Recurring billing contract for renewable services. Tracks billing cycles, next billing date, provider subscription IDs, status, cancellation behavior, and ownership.

- `public.subscription_items`
  Billable components attached to a subscription, including plan and quantity configuration.

- `public.payments`
  Payment transaction table for PayPal and other providers. Stores provider status, amount, fees, external IDs, approval URL, refund totals, and failure details.

- `public.payment_provider_records`
  Raw provider-side records/events associated with payments, orders, invoices, or subscriptions. This is where PayPal webhook bodies and provider reconciliation payloads belong.

- `public.coupon_redemptions`
  Tracks actual coupon usage per user/order/payment, including redeemed code and discount value.

### Provisioning, support, notifications, and operations

- `public.servers`
  Provisioned service record for Minecraft, game servers, and VPS instances. Stores order/subscription linkage, runtime/provisioning status, provider references, panel IDs, IPs, resource snapshot, and lifecycle timestamps.

- `public.server_provisioning_events`
  Step-by-step provisioning timeline for each server. Used for deployment audit, troubleshooting, and surfacing progress in the dashboard.

- `public.support_tickets`
  Support ticket header table for website and Discord-synced tickets. Stores short ID, hashed access token, customer identity, assignment, related order/server links, priority, source, and Discord thread references.

- `public.support_ticket_messages`
  Ticket conversation messages including customer replies, staff replies, system replies, internal notes, attachments, and Discord message linkage.

- `public.notifications`
  Outbound/in-app notification queue and delivery status table for order, invoice, ticket, and server updates.

- `public.notification_preferences`
  Per-user notification channel preferences such as in-app, email, Discord, webhook, or SMS.

### Audit, activity, and dashboard analytics

- `public.audit_logs`
  Immutable change log for key administrative and operational tables. Captures old/new payloads and changed fields for compliance and debugging.

- `public.activity_logs`
  Human-readable timeline of account-related events such as order creation, payment status changes, ticket replies, or provisioning state changes.

- `public.dashboard_statistics`
  Admin dashboard aggregate view for counts across orders, tickets, servers, subscriptions, plans, and profiles, plus gross/net processed payment totals.

- `public.dashboard_revenue_by_month`
  Monthly revenue analytics view derived from payment captures and refunds.

## 4. Backend and API changes still required in this project

These are the specific code-level integrations the current app still needs so the schema becomes fully used, not just present.

- Replace the fake admin password gate in [src/components/AdminLayout.tsx](/c:/Users/epicas/Desktop/ragenodes-premium-host-main/src/components/AdminLayout.tsx:1).
  It must use Supabase auth session plus `profiles`, `roles`, `permissions`, and `user_role_assignments`.

- Regenerate Supabase TS types in [src/integrations/supabase/types.ts](/c:/Users/epicas/Desktop/ragenodes-premium-host-main/src/integrations/supabase/types.ts:1).
  The file is still based on the old legacy schema and does not know about the new tables/columns.

- Move profile writes from auth metadata to `public.profiles`.
  [src/routes/profile.tsx](/c:/Users/epicas/Desktop/ragenodes-premium-host-main/src/routes/profile.tsx:1) currently updates only `auth.users.raw_user_meta_data`. It should read/write `profiles` for customer data and keep auth metadata minimal.

- Replace direct client inserts into `orders` with a trusted order creation endpoint.
  [src/components/OrderForm.tsx](/c:/Users/epicas/Desktop/ragenodes-premium-host-main/src/components/OrderForm.tsx:1) currently inserts only the order header. Production flow should create:
  `orders` + `order_items` + optional `coupon_redemptions` + initial `invoices` + optional `payments`.

- Connect the builder pricing UI to `pricing_settings`.
  [src/components/BuilderCalculator.tsx](/c:/Users/epicas/Desktop/ragenodes-premium-host-main/src/components/BuilderCalculator.tsx:1), [src/components/ServerBuilder.tsx](/c:/Users/epicas/Desktop/ragenodes-premium-host-main/src/components/ServerBuilder.tsx:1), and [src/lib/pricing.ts](/c:/Users/epicas/Desktop/ragenodes-premium-host-main/src/lib/pricing.ts:1) still use hardcoded constants and should fetch live settings from the database.

- Replace static plan/game fallbacks with admin-managed data.
  [src/lib/cms.ts](/c:/Users/epicas/Desktop/ragenodes-premium-host-main/src/lib/cms.ts:1) should eventually prefer DB-first product/plan/game data and only use constants as a local dev fallback.

- Add a trusted billing API layer for PayPal/payment workflows.
  Needed endpoints:
  `POST /api/orders`
  `POST /api/payments/paypal/create`
  `POST /api/payments/paypal/capture`
  `POST /api/payments/webhooks/paypal`
  `POST /api/invoices/:id/pay`
  `POST /api/coupons/validate`

- Add server provisioning endpoints or job handlers.
  Needed operations:
  create server record from paid order,
  push provisioning request to panel/provider,
  append `server_provisioning_events`,
  sync runtime status,
  suspend/reactivate/terminate servers,
  link subscriptions to provisioned servers.

- Extend the support backend to attach authenticated users, orders, and servers.
  [src/lib/support-api.ts](/c:/Users/epicas/Desktop/ragenodes-premium-host-main/src/lib/support-api.ts:1) currently creates anonymous-compatible tickets well, but production support should also:
  auto-link `user_id`,
  optionally link `order_id`/`server_id`,
  support internal notes,
  emit `notifications`.

- Add dashboard/statistics queries against the new views.
  [src/routes/admin.tsx](/c:/Users/epicas/Desktop/ragenodes-premium-host-main/src/routes/admin.tsx:1) currently calculates stats entirely from raw `orders` and hardcoded counts. It should query `dashboard_statistics` and `dashboard_revenue_by_month`.

- Add notification service handlers.
  Events from orders, payments, invoices, subscriptions, ticket replies, and provisioning changes should create `notifications` rows and respect `notification_preferences`.

- Add a bootstrap admin assignment step after the first real auth user is created.
  Recommended SQL:

  ```sql
  insert into public.user_role_assignments (user_id, role_id, scope_type)
  select u.id, r.id, 'global'
  from auth.users u
  join public.roles r on r.role_key = 'owner'
  where lower(u.email) = lower('your-admin@email.com')
  on conflict do nothing;
  ```

## 5. Admin panel features that must connect to these tables

- **Dashboard**
  `dashboard_statistics`, `dashboard_revenue_by_month`, `activity_logs`, `audit_logs`

- **Users / Accounts**
  `profiles`, `user_role_assignments`, `roles`, `permissions`, `admin_user_preferences`

- **Orders**
  `orders`, `order_items`, `coupon_redemptions`, `activity_logs`

- **Payments**
  `payments`, `payment_provider_records`, `orders`, `invoices`

- **Invoices**
  `invoices`, `invoice_items`, `payments`

- **Subscriptions**
  `subscriptions`, `subscription_items`, `servers`

- **Servers / Provisioning**
  `servers`, `server_provisioning_events`, `orders`, `subscriptions`, `games`, `plans`

- **Tickets / Live Support**
  `support_tickets`, `support_ticket_messages`, `notifications`, `servers`, `orders`

- **Coupons / Promotions**
  `coupons`, `coupon_redemptions`

- **Catalog**
  `products`, `plans`, `games`, `pricing_settings`

- **Website Content**
  `site_settings`, `homepage_content`, `features`, `faqs`, `cms_pages`, `cms_content_blocks`, `cms_navigation_links`

- **Integrations**
  `api_integration_settings`

- **Notification Center**
  `notifications`, `notification_preferences`

- **Audit / Security**
  `audit_logs`, `activity_logs`, `roles`, `permissions`, `user_role_assignments`

## Notes on current codebase gaps found during scan

- The admin area is still protected by a hardcoded frontend password.
- The order form still writes only a legacy order header.
- The profile page still stores user data in auth metadata instead of `profiles`.
- The generated Supabase types are stale.
- Builder pricing is still hardcoded in frontend constants instead of reading from `pricing_settings`.
- Public pages like privacy/terms/status/contact are still mostly static and should be swapped to `cms_pages` over time.
