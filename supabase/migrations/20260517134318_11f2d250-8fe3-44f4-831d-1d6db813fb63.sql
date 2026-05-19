
CREATE OR REPLACE FUNCTION public.validate_order_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF length(NEW.full_name) < 1 OR length(NEW.full_name) > 100 THEN
    RAISE EXCEPTION 'Invalid full_name length';
  END IF;
  IF length(NEW.email) < 3 OR length(NEW.email) > 255 OR NEW.email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'Invalid email';
  END IF;
  IF length(NEW.discord_username) < 1 OR length(NEW.discord_username) > 64 THEN
    RAISE EXCEPTION 'Invalid discord_username';
  END IF;
  IF length(NEW.server_name) < 1 OR length(NEW.server_name) > 80 THEN
    RAISE EXCEPTION 'Invalid server_name';
  END IF;
  IF NEW.ram_gb < 1 OR NEW.ram_gb > 128 THEN RAISE EXCEPTION 'Invalid ram_gb'; END IF;
  IF NEW.ssd_gb < 5 OR NEW.ssd_gb > 2000 THEN RAISE EXCEPTION 'Invalid ssd_gb'; END IF;
  IF NEW.cpu_percent < 50 OR NEW.cpu_percent > 1600 THEN RAISE EXCEPTION 'Invalid cpu_percent'; END IF;
  IF NEW.backups < 0 OR NEW.backups > 20 THEN RAISE EXCEPTION 'Invalid backups'; END IF;
  IF NEW.extra_ports < 0 OR NEW.extra_ports > 20 THEN RAISE EXCEPTION 'Invalid extra_ports'; END IF;
  IF NEW.notes IS NOT NULL AND length(NEW.notes) > 2000 THEN RAISE EXCEPTION 'Notes too long'; END IF;
  -- Force safe defaults on public insert
  NEW.status := 'pending';
  RETURN NEW;
END;
$$;

CREATE TRIGGER orders_validate_insert
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_order_insert();
