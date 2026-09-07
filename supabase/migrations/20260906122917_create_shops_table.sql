/*
# Create shops table (custom store-name login, no Supabase auth)

1. New Tables
- `shops`
  - `id` (uuid, primary key)
  - `store_name` (text, unique, the shop's display name used as login identifier)
  - `password_hash` (text, SHA-256 hashed password)
  - `email` (text, for support and password recovery only)
  - `created_at` (timestamptz, when the shop account was created)

2. Security
- Enable RLS on `shops`.
- Allow anon + authenticated INSERT (shop owners sign up without logging in).
- Allow anon + authenticated SELECT (needed for login lookup by store name).
- No UPDATE or DELETE from the public client.
*/

CREATE TABLE IF NOT EXISTS shops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_name text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  email text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE shops ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_insert_shops" ON shops;
CREATE POLICY "anon_insert_shops" ON shops FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_select_shops" ON shops;
CREATE POLICY "anon_select_shops" ON shops FOR SELECT
  TO anon, authenticated USING (true);
