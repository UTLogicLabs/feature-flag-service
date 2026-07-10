-- Up Migration
create extension if not exists pgcrypto;

create table flags (
  id uuid primary key default gen_random_uuid(),
  key text not null,
  environment text not null,
  description text,
  enabled boolean not null default false,
  is_kill_switch boolean not null default false,
  default_variant jsonb not null default 'false',
  rollout_percentage smallint check (rollout_percentage between 0 and 100),
  targeting_rules jsonb not null default '[]',
  updated_at timestamptz not null default now(),
  unique (key, environment)
);

create table segments (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  rules jsonb not null default '[]'
);

create table audit_log (
  id uuid primary key default gen_random_uuid(),
  flag_key text not null,
  actor text not null,
  diff jsonb not null,
  created_at timestamptz not null default now()
);

-- Down Migration
drop table if exists audit_log;
drop table if exists segments;
drop table if exists flags;
