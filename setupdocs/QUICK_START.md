# 🚀 Quick Start - Terminal Commands

## Your Supabase Setup (Copy & Paste These Commands)

### Step 1: Login to Supabase
```bash
supabase login
```
→ Browser will open, login with your account

---

### Step 2: Link Your Project
```bash
supabase link --project-ref pyufvauhjqfffezptuxl
```
→ You'll be asked for your database password (the one you set when creating the project)

---

### Step 3: Create Database Schema

**Option A: Via Supabase Dashboard (Easiest)**
1. Go to: https://supabase.com/dashboard/project/pyufvauhjqfffezptuxl/sql/new
2. Copy everything from `schema.sql` file
3. Paste into SQL Editor
4. Click "Run"

**Option B: Via Terminal**
```bash
# If you have the schema.sql file:
psql "postgresql://postgres:[YOUR_PASSWORD]@db.pyufvauhjqfffezptuxl.supabase.co:5432/postgres" < schema.sql
```

---

### Step 4: Install Python Dependencies
```bash
pip install supabase python-dotenv
```

Or if you use pip3:
```bash
pip3 install supabase python-dotenv
```

---

### Step 5: Create .env File

Create a file called `.env` with:
```bash
SUPABASE_URL=https://pyufvauhjqfffezptuxl.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key_here
```

**Get your service_role key:**
1. Go to: https://supabase.com/dashboard/project/pyufvauhjqfffezptuxl/settings/api
2. Find "service_role" key
3. Click "Reveal" and copy it
4. Paste into .env file

---

### Step 6: Run Migration
```bash
python migrate_data.py
```

Or:
```bash
python3 migrate_data.py
```

---

## 📁 Files You Need in Same Folder

```
your-folder/
├── migrate_data.py
├── .env
├── Businesses (1).csv
├── Location_Area (1).csv
├── LoyaltyPoints.csv
├── Notifications.csv
├── Offers (2).csv
├── Tags (2).csv
└── Users (1).csv
```

---

## ✅ Verify Everything Worked

```bash
# Check your tables exist
supabase db remote commit
```

Or go to: https://supabase.com/dashboard/project/pyufvauhjqfffezptuxl/editor

You should see:
- ✅ users (53 rows)
- ✅ businesses (220 rows)
- ✅ offers (43 rows)
- ✅ tags (62 rows)
- ✅ location_areas (34 rows)
- ✅ loyalty_points (67 rows)
- ✅ notifications (427 rows)

---

## 🆘 Having Issues?

### "supabase: command not found"
```bash
npm install -g supabase
```

### "No module named 'supabase'"
```bash
pip install supabase python-dotenv
# or
pip3 install supabase python-dotenv
```

### "relation 'users' does not exist"
→ You need to run the schema.sql first (Step 3)

### "Invalid API key"
→ Check your .env file, make sure you're using service_role key

---

## 🎯 What's in Each File?

1. **SETUP_GUIDE.md** - Detailed step-by-step instructions
2. **SUMMARY.md** - Overview of all documentation
3. **schema.sql** - Database structure (run this first!)
4. **migrate_data.py** - Python script to import CSVs
5. **ping_local_updated_prompt.md** - For Claude Code (the main prompt)
6. **adalo_supabase_integration_guide.md** - Connect Adalo to Supabase
7. **ping_local_tech_analysis.md** - Technical approach & timeline
8. **ping_local_claude_code_prompt.md** - Original prompt (use updated version)

---

## 📞 Important Links

**Your Supabase Project**: https://supabase.com/dashboard/project/pyufvauhjqfffezptuxl

- **SQL Editor**: .../sql/new
- **Table Editor**: .../editor
- **API Settings**: .../settings/api
- **Storage**: .../storage/buckets

---

## ⏭️ After Supabase Setup

1. ✅ Verify data imported correctly
2. Set up Storage buckets for images
3. Give Claude Code the updated prompt
4. Start building your native app!

---

## 🔐 Security Note

**NEVER commit your .env file to git!**

Add this to your `.gitignore`:
```
.env
*.env
```
