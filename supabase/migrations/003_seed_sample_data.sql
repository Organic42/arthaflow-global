-- ArthaFlow Global — Seed sample inquiries & shipments
-- Safe to run multiple times: only seeds if the user has no existing rows.
-- Run in Supabase SQL Editor AFTER 001 and 002.

DO $$
DECLARE
  uid UUID;
BEGIN
  FOR uid IN SELECT id FROM public.profiles WHERE role = 'manufacturer' LOOP

    -- ── Inquiries ────────────────────────────────────────────────────────────
    IF NOT EXISTS (SELECT 1 FROM public.inquiries WHERE user_id = uid) THEN

      INSERT INTO public.inquiries
        (user_id, buyer_country, buyer_flag, buyer_sector, buyer_active_since,
         product_name, hs_code, quantity, delivery_terms, timeline,
         certifications_required, budget_range, status, priority, created_at)
      VALUES
        (uid, 'Germany', '🇩🇪', 'Automotive sector', 'Active since 2019',
         'CNC Precision Components', '8466.93', '500 units/month', 'CIF Hamburg',
         'First shipment within 45 days', 'ISO 9001, CE Mark', '$15–22 per unit',
         'new', 'high', NOW() - INTERVAL '2 hours'),

        (uid, 'UAE', '🇦🇪', 'Oil & Gas equipment', 'Active since 2021',
         'Hydraulic Cylinders', '8412.21', '200 units', 'CIF Jebel Ali',
         'Within 30 days', 'ISO 9001', '$40–55 per unit',
         'new', 'medium', NOW() - INTERVAL '1 day'),

        (uid, 'USA', '🇺🇸', 'Industrial machinery', 'Active since 2017',
         'Gear Assemblies', '8483.40', '1,000 units/quarter', 'FOB Nhava Sheva',
         'Rolling quarterly', 'ISO 9001, AGMA', '$8–12 per unit',
         'responded', 'high', NOW() - INTERVAL '3 days'),

        (uid, 'UK', '🇬🇧', 'Aerospace components', 'Active since 2015',
         'CNC Precision Components', '8466.93', '300 units/month', 'CIF Felixstowe',
         'Ongoing', 'ISO 9001', '$16–20 per unit',
         'closed', 'low', NOW() - INTERVAL '5 days');

    END IF;

    -- ── Shipments ────────────────────────────────────────────────────────────
    IF NOT EXISTS (SELECT 1 FROM public.shipments WHERE user_id = uid) THEN

      INSERT INTO public.shipments
        (user_id, reference, product_name, route_description, status, status_color, eta, details, timeline, created_at)
      VALUES
        (uid,
         'SH-2024-001',
         'CNC Precision Components',
         'CNC Components → UAE',
         'Customs Cleared',
         'green',
         'May 30',
         '{
           "Shipment Reference": "SH-2024-001",
           "Product": "CNC Precision Components",
           "Quantity": "500 units",
           "Buyer": "Al-Rashid Auto Parts LLC",
           "Destination": "Jebel Ali, UAE",
           "Incoterm": "CIF Dubai",
           "Value": "$11,000 FOB",
           "Vessel": "MSC Gaia",
           "Container": "MSCU7234521"
         }'::jsonb,
         '[
           {"state":"done",    "title":"Order Confirmed",    "date":"May 15, 2026", "desc":"Buyer PO received and verified"},
           {"state":"done",    "title":"Documents Filed",     "date":"May 17, 2026", "desc":"Shipping bill, invoice, certificate of origin submitted"},
           {"state":"done",    "title":"Customs Clearance",   "date":"May 20, 2026", "desc":"Indian customs cleared, port release obtained"},
           {"state":"current", "title":"In Transit",          "date":"May 21, 2026", "desc":"Vessel: MSC Gaia, Container: MSCU7234521"},
           {"state":"future",  "title":"Delivered",           "date":"ETA: May 30, 2026", "desc":"Jebel Ali Port, Dubai"}
         ]'::jsonb,
         NOW() - INTERVAL '15 days'),

        (uid,
         'SH-2024-002',
         'Hydraulic Cylinders',
         'Hydraulic Cylinders → Germany',
         'In Transit',
         'blue',
         'Jun 5',
         '{
           "Shipment Reference": "SH-2024-002",
           "Product": "Hydraulic Cylinders",
           "Quantity": "200 units",
           "Buyer": "Bauer Industrietechnik GmbH",
           "Destination": "Hamburg, Germany",
           "Incoterm": "CIF Hamburg",
           "Value": "$9,400 FOB",
           "Vessel": "Maersk Sentosa",
           "Container": "MRKU8841290"
         }'::jsonb,
         '[
           {"state":"done",    "title":"Order Confirmed",    "date":"May 18, 2026", "desc":"Buyer PO received and verified"},
           {"state":"done",    "title":"Documents Filed",     "date":"May 20, 2026", "desc":"Shipping bill, invoice, certificate of origin submitted"},
           {"state":"current", "title":"Customs Clearance",   "date":"May 24, 2026", "desc":"Awaiting port release at Nhava Sheva"},
           {"state":"future",  "title":"In Transit",          "date":"ETA: May 27, 2026", "desc":"Vessel: Maersk Sentosa"},
           {"state":"future",  "title":"Delivered",           "date":"ETA: Jun 5, 2026",  "desc":"Port of Hamburg, Germany"}
         ]'::jsonb,
         NOW() - INTERVAL '12 days');

    END IF;

  END LOOP;
END;
$$;

-- Also add INSERT policy so ArthaFlow admins can seed inquiries/shipments
-- (Manufacturers can only view+update their own; this policy allows the platform to add them)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'inquiries' AND policyname = 'Admins can insert inquiries'
  ) THEN
    EXECUTE 'CREATE POLICY "Admins can insert inquiries" ON public.inquiries FOR INSERT WITH CHECK (public.is_admin())';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'shipments' AND policyname = 'Admins can insert shipments'
  ) THEN
    EXECUTE 'CREATE POLICY "Admins can insert shipments" ON public.shipments FOR INSERT WITH CHECK (public.is_admin())';
  END IF;
END;
$$;
