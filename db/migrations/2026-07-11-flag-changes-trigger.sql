-- Up Migration
create or replace function notify_flag_change() returns trigger as $$
begin
  perform pg_notify('flag_changes', json_build_object(
    'key', new.key,
    'environment', new.environment
  )::text);
  return new;
end;
$$ language plpgsql;

create trigger flags_notify_change
  after insert or update on flags
  for each row execute function notify_flag_change();

-- Down Migration
drop trigger if exists flags_notify_change on flags;
drop function if exists notify_flag_change();
