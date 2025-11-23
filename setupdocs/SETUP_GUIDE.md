# Supabase Setup Guide - Quick Start

## Step-by-Step Instructions

### 1️⃣ Get Your Supabase Credentials

1. Go to your Supabase project: https://supabase.com/dashboard/project/pyufvauhjqfffezptuxl

2. Click **Settings** (gear icon in left sidebar)

3. Click **API** 

4. You'll see:
   - **Project URL**: `https://pyufvauhjqfffezptuxl.supabase.co`
   - **anon/public key**: `eyJ...` (long string starting with eyJ)
   - **service_role key**: `eyJ...` (another long string - click "Reveal" to see it)

5. **IMPORTANT**: Copy the **service_role** key (not the anon key) - you'll need it for data import

---

### 2️⃣ Create Your Database Schema

**Option A: Via Supabase Dashboard (Recommended)**

1. Go to **SQL Editor** in left sidebar: https://supabase.com/dashboard/project/pyufvauhjqfffezptuxl/sql/new

2. Open the file: `ping_local_updated_prompt.md`

3. Find the section: **"Database Schema (Matching Adalo Structure)"** (around line 30)

4. Copy everything from the first `CREATE TABLE users (` down to and including the triggers/functions at the bottom

5. Paste into Supabase SQL Editor

6. Click **Run** (bottom right) or press Cmd/Ctrl + Enter

7. You should see "Success. No rows returned" - that's good! ✅

**Option B: Extract Just the SQL**

I'll create a separate SQL file for you with just the schema...

---

### 3️⃣ Set Up Your Environment File

1. Create a file called `.env` in the same folder as your CSV files

2. Copy this template:

```bash
# Supabase Configuration
SUPABASE_URL=https://pyufvauhjqfffezptuxl.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key_here

# Replace 'your_service_role_key_here' with the actual service_role key from Supabase
# It's the long string that starts with: eyJ...
```

3. Replace `your_service_role_key_here` with your actual service_role key from Step 1

4. Save the file

**⚠️ SECURITY WARNING**: Never commit this .env file to GitHub! Add it to .gitignore!

---

### 4️⃣ Install Python Dependencies

```bash
# Install required packages
pip install supabase python-dotenv

# Or if you're using pip3:
pip3 install supabase python-dotenv
```

---

### 5️⃣ Run the Migration Script

1. Make sure you have:
   - ✅ Created the database schema (Step 2)
   - ✅ Created .env file with credentials (Step 3)
   - ✅ Installed dependencies (Step 4)
   - ✅ All 8 CSV files in same folder as migrate_data.py

2. Run the script:

```bash
python migrate_data.py

# Or if you're using python3:
python3 migrate_data.py
```

3. You should see:
```
🚀 Starting Ping Local Data Migration...

📍 Migrating Location Areas...
   ✅ Imported 34 location areas
🏷️  Migrating Tags...
   ✅ Imported 62 tags
👥 Migrating Users...
   ✅ Imported users 1-50
   ✅ Imported users 51-53
   ✅ Total: 53 users imported
🏢 Migrating Businesses...
   ✅ Imported businesses 1-50
   ✅ Imported businesses 51-100
   ...
   ✅ Total: 220 businesses imported
...etc
```

4. If you see any errors, check:
   - Is your SUPABASE_SERVICE_KEY correct in .env?
   - Did you run the schema SQL first?
   - Are all CSV files named correctly?

---

### 6️⃣ Verify Your Data

1. Go to **Table Editor** in Supabase: https://supabase.com/dashboard/project/pyufvauhjqfffezptuxl/editor

2. Click on each table:
   - `users` - Should have 53 rows
   - `businesses` - Should have 220 rows
   - `offers` - Should have 43 rows
   - `tags` - Should have 62 rows
   - `location_areas` - Should have 34 rows
   - `loyalty_points` - Should have 67 rows
   - `notifications` - Should have 427 rows

3. Check a few rows to make sure data looks correct

---

## Troubleshooting

### Error: "relation 'users' does not exist"
**Solution**: You haven't created the schema yet. Go back to Step 2.

### Error: "Invalid API key"
**Solution**: Check your .env file. Make sure you're using the **service_role** key, not the anon key.

### Error: "duplicate key value violates unique constraint"
**Solution**: You've already imported the data. Either:
- Delete all data from tables and try again, or
- Skip the migration step

### Error: "No module named 'supabase'"
**Solution**: Run `pip install supabase python-dotenv`

### Some data is missing after import
**Solution**: Check the terminal output for specific errors. The script continues even if some rows fail, so you might need to manually fix those rows.

---

## What's Next?

After migration is complete:

1. **Set up Storage Buckets** (for images):
   - Go to **Storage** in Supabase
   - Create buckets: `business_images`, `offer_images`, `user_avatars`
   - Make them public: Settings → Public bucket = ON

2. **Configure Row Level Security**:
   - Go to **Authentication** → **Policies**
   - Add policies for each table (or disable RLS for testing)

3. **Test Your Setup**:
   - Try querying data in SQL Editor
   - Make sure relationships work (e.g., offers → businesses)

4. **Start Building**:
   - Give Claude Code the updated prompt
   - Start building your native app!

---

## Quick Terminal Recap

```bash
# 1. Login to Supabase
supabase login

# 2. Link your project
supabase link --project-ref pyufvauhjqfffezptuxl

# 3. (Optional) Check connection
supabase db remote commit

# 4. Install Python dependencies
pip install supabase python-dotenv

# 5. Run migration
python migrate_data.py
```

---

## Files You Need

In the same folder, you should have:

```
📁 Your Working Directory
├── migrate_data.py          (the migration script)
├── .env                     (your credentials - DON'T COMMIT!)
├── Businesses (1).csv
├── Location_Area (1).csv
├── LoyaltyPoints.csv
├── Notifications.csv
├── Offers (2).csv
├── Tags (2).csv
└── Users (1).csv
```

---

## Need the Schema as a Separate SQL File?

Let me know and I'll extract just the CREATE TABLE statements into a standalone .sql file you can run directly!
