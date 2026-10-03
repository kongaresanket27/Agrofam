create table if not exists feature_usage (
  user_id text not null,
  feature text not null,
  count integer not null default 0,
  last_used_at timestamptz not null default now(),
  primary key (user_id, feature)
);
create index if not exists feature_usage_user_id_idx on feature_usage (user_id);
