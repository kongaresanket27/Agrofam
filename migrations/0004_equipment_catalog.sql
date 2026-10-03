insert into equipment (
  user_id, equipment_name, category, brand, description,
  buy_price, rent_per_day, rent_per_hour, owner_name, owner_mobile,
  owner_address, district, taluka, village, image_url, availability, status
)
select
  'catalog',
  'John Deere W70 Harvester',
  'Harvester',
  'John Deere India',
  'Combine harvester for wheat, paddy and soybean. Advanced threshing with low grain loss.',
  1850000, 6500, 900, 'Rajesh Patil', '9876543210',
  'Haveli, Pune, Maharashtra', 'Pune', 'Haveli', 'Wagholi',
  null, true, 'approved'
where not exists (
  select 1 from equipment where equipment_name = 'John Deere W70 Harvester'
);

insert into equipment (
  user_id, equipment_name, category, brand, description,
  buy_price, rent_per_day, rent_per_hour, owner_name, owner_mobile,
  owner_address, district, taluka, village, image_url, availability, status
)
select
  'catalog',
  'Aspee HTP Battery Sprayer',
  'Sprayer',
  'Aspee Agro',
  'High-pressure battery sprayer with 20L tank, suitable for orchards and vegetables.',
  12500, 180, 40, 'AgroFam Community Pool', '9876543213',
  'Haveli, Pune, Maharashtra', 'Pune', 'Haveli', 'Wagholi',
  null, true, 'approved'
where not exists (
  select 1 from equipment where equipment_name = 'Aspee HTP Battery Sprayer'
);
