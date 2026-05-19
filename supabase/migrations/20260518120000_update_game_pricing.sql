-- Update all displayed starter and preset pricing to match current resource unit prices:
-- RAM $1.40/GB, SSD $4.10/50GB, CPU/vCPU $1.50/100%, port/IP $0.50, backup $4.00 each.

alter table public.games
  alter column starting_price set default '$9.94/month';

update public.games
set starting_price = '$9.94/month'
where true;

update public.plans
set price = case
  when name in ('Budget Game Server', 'Budget Minecraft') then 9.94
  when name in ('Standard Game Server', 'Standard Minecraft') then 18.31
  when name in ('Premium Game Server', 'Premium Minecraft') then 27.50
  when name = 'Starter VPS' then 12.38
  when name = 'Performance VPS' then 24.26
  when name = 'Pro VPS' then 45.02
  else price
end
where category in ('Game Server', 'Minecraft', 'VPS')
  and name in (
    'Budget Game Server',
    'Standard Game Server',
    'Premium Game Server',
    'Budget Minecraft',
    'Standard Minecraft',
    'Premium Minecraft',
    'Starter VPS',
    'Performance VPS',
    'Pro VPS'
  );
