# Uptime Monitoring App

A domain monitoring application that tracks uptime, SSL expiry dates, and domain expiry dates for your websites. Built with Next.js, Supabase, and Tailwind CSS.

## Features

- **Admin Panel** for managing monitored domains
- **Public Dashboard** displaying status of all domains
- **Status Badges** that can be embedded on your websites
- **Email Alerts** for downtime and expiring certificates/domains
- **Detailed Domain Pages** with uptime history

## Tech Stack

- **Frontend**: Next.js 14, React 19, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth)
- **APIs**: APILayer Whois API for domain expiry information
- **Monitoring**: Server-side background functions with cron jobs

## Prerequisites

- Node.js 18+ and npm
- Supabase account (free tier works)
- APILayer account for Whois API

## Setup Instructions

### 1. Clone the Repository

```bash
git clone <repository-url>
cd uptime-app
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set up Supabase

1. Create a new Supabase project
2. Run the SQL from `supabase_schema.sql` in the Supabase SQL Editor to create the necessary tables
3. Set up the Supabase Auth (Email provider)
4. Get your Supabase URL and anon key from the API settings

### 4. Set up Environment Variables

Create a `.env.local` file with the following variables:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# APILayer Whois API
NEXT_PUBLIC_API_LAYER_KEY=your-apilayer-key

# Admin Email(s) - comma separated list for multiple
ADMIN_EMAIL=admin@example.com

# For cron job security
CRON_SECRET=your-random-secret-string

# Optional Mailgun config for email alerts
# MAILGUN_API_KEY=your-mailgun-api-key
# MAILGUN_DOMAIN=your-mailgun-domain
```

### 5. Configure Admin Email

Update the admin email in two places:

1. In the `.env.local` file (ADMIN_EMAIL variable)
2. In the Supabase SQL editor, update the admin_users view:

```sql
-- Replace with your admin email
CREATE OR REPLACE VIEW admin_users AS 
SELECT email FROM auth.users 
WHERE email = 'your-admin-email@example.com';
```

### 6. Run the Development Server

```bash
npm run dev
```

### 7. Deploy to Production

Deploy to Vercel or any other Next.js hosting provider and set up the environment variables.

## Setting up Monitoring Cron Jobs

Set up a cron job to hit the monitoring endpoint regularly:

1. For Vercel, use Vercel Cron Jobs and set it to run daily:
   ```
   0 0 * * * curl -X GET "https://yourdomain.com/api/cron/monitor" -H "Authorization: Bearer ${CRON_SECRET}"
   ```

2. For other hosting providers, use their built-in cron job functionality or a service like cron-job.org.

## Usage

### Admin Panel

1. Create an account with the admin email you configured
2. Log in to access the admin panel at `/admin`
3. Add domains to monitor (domain name, display name, URL to check)

### Public Dashboard

The public dashboard is accessible at the root URL (`/`) and shows all monitored domains with their current status.

### Domain Detail Pages

Each domain has a detail page at `/domain/[domain-name]` with more information about its status, history, and embed codes.

### Status Badges

Each domain has a status badge that can be embedded on websites. The embed code is available on the domain detail page.

## License

MIT

## Support

For issues, questions, or contributions, please open an issue or pull request.
