-- Up Migration
create type user_role as enum ('admin', 'editor', 'viewer');

create table users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password_hash text not null,
  role user_role not null default 'viewer',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table audit_log add column actor_user_id uuid references users(id) on delete set null;

-- Down Migration
alter table audit_log drop column if exists actor_user_id;
drop table if exists users;
drop type if exists user_role;
