-- Schema for Uptime Monitoring Application

-- Table for storing domains to monitor
CREATE TABLE domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain_name TEXT NOT NULL UNIQUE,
    display_name TEXT,
    uptime_url TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    notify_on_expiry BOOLEAN DEFAULT TRUE,
    notify_on_downtime BOOLEAN DEFAULT TRUE
);

-- Table for storing uptime check logs
CREATE TABLE uptime_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), 
    domain_id UUID REFERENCES domains(id) ON DELETE CASCADE,
    status BOOLEAN NOT NULL, -- true = up, false = down
    response_time INTEGER, -- in milliseconds
    checked_at TIMESTAMPTZ DEFAULT NOW(),
    error_message TEXT
);

-- Index on domain_id and checked_at for faster queries
CREATE INDEX idx_uptime_logs_domain_id_checked_at ON uptime_logs(domain_id, checked_at);

-- Table for storing SSL certificate information
CREATE TABLE ssl_info (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain_id UUID REFERENCES domains(id) ON DELETE CASCADE,
    expiry_date TIMESTAMPTZ NOT NULL,
    days_remaining INTEGER,
    issuer TEXT,
    checked_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index on domain_id for faster queries
CREATE INDEX idx_ssl_info_domain_id ON ssl_info(domain_id);

-- Table for storing domain expiry information
CREATE TABLE domain_expiry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain_id UUID REFERENCES domains(id) ON DELETE CASCADE,
    expiry_date TIMESTAMPTZ NOT NULL,
    days_remaining INTEGER,
    registrar TEXT,
    checked_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index on domain_id for faster queries
CREATE INDEX idx_domain_expiry_domain_id ON domain_expiry(domain_id);

-- Table for storing email alert settings
CREATE TABLE alert_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain_id UUID REFERENCES domains(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    ssl_threshold_days INTEGER DEFAULT 30,
    domain_threshold_days INTEGER DEFAULT 30,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table for storing sent alerts
CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL,
    domain TEXT NOT NULL,
    message TEXT NOT NULL,
    sent_to TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table for storing IP records
CREATE TABLE ip_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain_id UUID REFERENCES domains(id) ON DELETE CASCADE,
    primary_ip TEXT,
    all_ips JSONB, -- Array of IP addresses
    mx_records JSONB, -- Array of mail server records
    nameservers JSONB, -- Array of nameserver records
    checked_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index on domain_id for faster queries
CREATE INDEX idx_ip_records_domain_id ON ip_records(domain_id);

-- Create admin users view - can configure based on your auth setup
CREATE OR REPLACE VIEW admin_users AS 
SELECT email FROM auth.users 
WHERE email = 'your-admin-email@example.com'; -- Replace with your admin email

-- Enable Row Level Security (RLS)
ALTER TABLE domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE uptime_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ssl_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE domain_expiry ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for domains table
-- Only admin can insert/update/delete
CREATE POLICY domains_admin_all ON domains 
    FOR ALL 
    TO authenticated 
    USING (auth.jwt() ->> 'email' IN (SELECT email FROM admin_users));

-- Anyone can read
CREATE POLICY domains_public_read ON domains
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- Create an admin_check function for server-side authorization
CREATE OR REPLACE FUNCTION is_admin() 
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (SELECT EXISTS (
        SELECT 1 FROM admin_users 
        WHERE email = auth.jwt() ->> 'email'
    ));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 