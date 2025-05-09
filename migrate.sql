-- Migration script to update database schema for global notifications
-- Execute this in your Supabase SQL editor

-- Step 1: Create new tables for global notification settings
CREATE TABLE notification_emails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE notification_phones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: Migrate existing email recipients to the new table
INSERT INTO notification_emails (email, created_at)
SELECT DISTINCT email, MIN(created_at) 
FROM alert_settings 
GROUP BY email
ON CONFLICT (email) DO NOTHING;

-- Step 3: Migrate existing phone recipients to the new table
INSERT INTO notification_phones (phone_number, created_at) 
SELECT DISTINCT phone_number, MIN(created_at)
FROM phone_notifications
GROUP BY phone_number
ON CONFLICT (phone_number) DO NOTHING;

-- Step 4: Enable Row Level Security on new tables
ALTER TABLE notification_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_phones ENABLE ROW LEVEL SECURITY;

-- Step 5: Add RLS policies for the new tables
-- Only admin can insert/update/delete
CREATE POLICY notification_emails_admin_all ON notification_emails
    FOR ALL 
    TO authenticated 
    USING (auth.jwt() ->> 'email' IN (SELECT email FROM admin_users));

-- Anyone can read notification_emails
CREATE POLICY notification_emails_public_read ON notification_emails
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- Only admin can insert/update/delete
CREATE POLICY notification_phones_admin_all ON notification_phones
    FOR ALL 
    TO authenticated 
    USING (auth.jwt() ->> 'email' IN (SELECT email FROM admin_users));

-- Anyone can read notification_phones
CREATE POLICY notification_phones_public_read ON notification_phones
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- Step 6: Keep the old tables for now, but they will be deprecated
-- You can drop them later after verifying the migration was successful
-- DROP TABLE alert_settings;
-- DROP TABLE phone_notifications; 