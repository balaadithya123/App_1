-- SAMPLE DATA for Materials & Suppliers. Fictional suppliers with obviously
-- fake WhatsApp numbers so nobody real is contacted. Remove before launch:
--   delete from public.suppliers where description like 'Sample listing%';

with s as (
  insert into public.suppliers (name, category, description, area, city, delivery_radius_km, service_pincodes, is_verified)
  values
    ('Sample River Sand Traders', 'Sand', 'Sample listing: M-sand and river sand, tipper delivery.', 'Guindy', 'Chennai', 25, '{600032,600016,600042}', true),
    ('Sample Blue Metal Works', 'Stone & Aggregates', 'Sample listing: 20mm and 40mm blue metal, GSB.', 'Poonamallee', 'Chennai', 30, '{600056,600123,600077}', true),
    ('Sample Cement Depot', 'Cement', 'Sample listing: OPC and PPC bags, bulk discounts.', 'Tambaram', 'Chennai', 20, '{600045,600059,600073}', true),
    ('Sample Brick & Block Yard', 'Bricks & Blocks', 'Sample listing: red bricks, fly ash and AAC blocks.', 'Avadi', 'Chennai', 25, '{600054,600062,600072}', true),
    ('Sample TMT Steel Mart', 'Steel', 'Sample listing: TMT bars and binding wire.', 'Ambattur', 'Chennai', 30, '{600053,600098,600058}', true),
    ('Sample Equipment Rentals', 'Tools & Rental', 'Sample listing: mixers, vibrators, scaffolding on rent.', 'Villupuram Town', 'Villupuram', 40, '{605602,605601,605602}', true)
  returning id, category
),
c as (
  insert into public.supplier_contacts (supplier_id, person_name, role, whatsapp)
  select id, 'Sample Contact', 'Sales', '0000000001' from s returning id
)
insert into public.supplier_products (supplier_id, name, unit, indicative_price, price_updated_at)
select s.id, p.name, p.unit, p.price, current_date
from s
join (values
  ('Sand', 'M-sand', 'unit', 4200),
  ('Sand', 'River sand', 'unit', 5600),
  ('Stone & Aggregates', '20mm blue metal', 'unit', 3800),
  ('Stone & Aggregates', '40mm blue metal', 'unit', 3600),
  ('Cement', 'PPC cement 50kg', 'bag', 390),
  ('Cement', 'OPC cement 50kg', 'bag', 420),
  ('Bricks & Blocks', 'Red bricks', '1000 pcs', 9000),
  ('Bricks & Blocks', 'AAC block', 'piece', 62),
  ('Steel', 'TMT 12mm', 'kg', 68),
  ('Tools & Rental', 'Concrete mixer', 'day', 900)
) as p(category, name, unit, price) on p.category = s.category;
