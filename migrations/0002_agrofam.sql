create table if not exists farmer_profiles (
  user_id text primary key,
  full_name text not null default '',
  mobile_number text,
  farmer_id text,
  date_of_birth text,
  gender text,
  village text,
  taluka text,
  district text,
  state text default 'Maharashtra',
  pincode text,
  land_area text,
  main_crop text,
  is_admin boolean not null default false,
  notify_weather boolean not null default true,
  notify_market boolean not null default true,
  notify_schemes boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists equipment (
  id serial primary key,
  user_id text not null,
  equipment_name text not null,
  category text not null,
  brand text,
  description text,
  buy_price numeric,
  rent_per_day numeric,
  rent_per_hour numeric,
  owner_name text,
  owner_mobile text,
  owner_address text,
  district text,
  taluka text,
  village text,
  image_url text,
  availability boolean not null default true,
  status text not null default 'approved',
  created_at timestamptz not null default now()
);
create index if not exists equipment_user_id_idx on equipment (user_id);
create index if not exists equipment_status_idx on equipment (status);

create table if not exists notifications (
  id serial primary key,
  user_id text not null,
  kind text not null,
  title text not null,
  message text not null,
  unread boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_id_idx on notifications (user_id);

insert into equipment (
  user_id, equipment_name, category, brand, description,
  buy_price, rent_per_day, rent_per_hour, owner_name, owner_mobile,
  owner_address, district, taluka, village, image_url, availability, status
) values
  (
    'catalog',
    'Mahindra 575 DI Tractor',
    'Tractor',
    'Mahindra',
    '45 HP tractor suited for ploughing, sowing and haulage. Well maintained, available with operator on request.',
    725000, 1800, 250, 'AgroFam Community Pool', '9876543210',
    'Haveli, Pune, Maharashtra', 'Pune', 'Haveli', 'Wagholi',
    null, true, 'approved'
  ),
  (
    'catalog',
    'Rotavator 7 ft',
    'Implement',
    'FieldKing',
    'Heavy-duty rotavator for seed-bed preparation. Fits 40–50 HP tractors.',
    85000, 900, 150, 'AgroFam Community Pool', '9876543211',
    'Niphad, Nashik, Maharashtra', 'Nashik', 'Niphad', 'Lasalgaon',
    null, true, 'approved'
  ),
  (
    'catalog',
    'Power Sprayer',
    'Sprayer',
    'Aspee',
    'Petrol power sprayer for orchards and row crops. Includes 15m hose.',
    18500, 250, 60, 'AgroFam Community Pool', '9876543212',
    'Baramati, Pune, Maharashtra', 'Pune', 'Baramati', 'Baramati',
    null, true, 'approved'
  );
