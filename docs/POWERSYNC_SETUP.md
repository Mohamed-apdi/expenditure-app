# PowerSync Setup Guide

Configure PowerSync for offline-first sync with Supabase.

## 1. Create PowerSync Account & Instance

1. Sign up at [PowerSync Cloud](https://accounts.journeyapps.com/portal/powersync-signup?s=docs)
2. Create a project in the [PowerSync Dashboard](https://dashboard.powersync.com/)
3. Add an instance (Development or Production) if needed
4. Click **Connect** in the dashboard top bar and copy your **Instance URL** (e.g. `https://xxx.powersync.journeyapps.com`)

## 2. Configure Supabase for PowerSync

Run these in your Supabase SQL Editor:

### Create PowerSync role (with replication)

```sql
CREATE ROLE powersync_role WITH REPLICATION BYPASSRLS LOGIN PASSWORD 'your-secure-password';
GRANT SELECT ON ALL TABLES IN SCHEMA public TO powersync_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO powersync_role;
```

### Create publication

```sql
CREATE PUBLICATION powersync FOR ALL TABLES;
```

## 3. Connect PowerSync to Supabase

1. In **PowerSync Dashboard** → **Database Connections**
2. From **Supabase Dashboard** → **Connect** → copy the Direct connection string
3. Replace the username/password with `powersync_role` and the password from step 2
4. Paste into PowerSync, click **Connect to Source Database**
5. Enable **Use Supabase Auth** in **Client Auth**
6. Click **Save and Deploy**

## 4. Configure Sync Rules

In PowerSync Dashboard → **Sync Rules**, define which data syncs per user. Example for user-scoped data:

```yaml
bucket_definitions:
  user_data:
    parameters: select id as user_id from auth.users
    data:
      - select * from accounts where user_id = bucket.user_id
      - select * from transactions where user_id = bucket.user_id
      - select * from expenses where user_id = bucket.user_id
      # Add other tables as needed
```

Click **Deploy** and **Validate**.

## 5. Add POWER_SYNC_URL to Your App

### Local development (.env)

Uncomment and set in `.env`:

```bash
POWER_SYNC_URL=https://your-instance.powersync.journeyapps.com
```

### EAS builds

Add the secret:

```bash
eas secret:create --name POWER_SYNC_URL --value "https://your-instance.powersync.journeyapps.com"
```

Or set it in EAS Dashboard → Project → Secrets.

## 6. Rebuild the App

PowerSync uses native modules. Rebuild after adding the URL:

```bash
npx expo prebuild --clean
npx expo run:android
# or
npx expo run:ios
```

**Note:** PowerSync does not work in Expo Go; use a development build.
