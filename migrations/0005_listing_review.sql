alter table equipment
  add column if not exists listing_type text not null default 'rent';
