# Saraswati Sec School Library - Supabase Setup Guide

## Prerequisites
- Node.js 18+ installed
- A Supabase account (free tier works)

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click **New Project**
3. Choose a project name (e.g., `saraswati-library`)
4. Set a strong database password (save it)
5. Choose a region close to your users
6. Click **Create new project** and wait ~2 minutes

## Step 2: Get Your Credentials

1. In your project dashboard, go to **Settings** > **API**
2. Copy these two values:
   - **Project URL** (looks like `https://xxxx.supabase.co`)
   - **anon public key** (long string starting with `eyJ...`)
3. Also copy the **service_role key** (for the seed script only, keep it secret)

## Step 3: Run the Database Schema

1. In your Supabase dashboard, go to the **SQL Editor** tab
2. Click **New query**
3. Open the file `supabase/schema.sql` from this project
4. Copy the entire contents and paste into the SQL Editor
5. Click **Run** (or press Ctrl+Enter)
6. Wait for the "Success" message

## Step 4: Configure the Frontend

1. Open `index.html` in the project root
2. Find these two lines near the top of the scripts section:
   ```js
   window.SUPABASE_URL = '';
   window.SUPABASE_ANON_KEY = '';
   ```
3. Replace with your actual values:
   ```js
   window.SUPABASE_URL = 'https://your-project.supabase.co';
   window.SUPABASE_ANON_KEY = 'your-anon-key';
   ```

## Step 5: Seed the Database (Optional)

1. Install Node.js dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file in the project root:
   ```
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_KEY=your-service-role-key
   ```

3. Run the seeder:
   ```bash
   npm run seed
   ```

   This creates:
   - 10 users (1 admin, 8 students, 1 librarian)
   - 14 sample books
   - 10 categories
   - 3 announcements
   - 3 events
   - 5 library settings
   - 3 sample borrow requests

## Step 6: Start the Server

```bash
npm start
```

Open `http://localhost:3000` in your browser.

## Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@saraswatischool.edu.np | admin123 |
| Student | anita.s@saraswatischool.edu.np | student123 |
| Librarian | laxmi@saraswatischool.edu.np | librarian123 |

## How It Works

### Architecture
- **Frontend**: Vanilla JS SPA (same as before)
- **Backend**: Supabase (PostgreSQL + Auth + Row Level Security)
- **Express**: Serves static files only, no API needed
- **Auth**: Supabase Auth handles login/signup/JWT tokens

### Data Flow
1. On page load, the app checks for an existing Supabase session
2. If logged in, it fetches all data from Supabase into memory
3. Reads happen from memory (fast)
4. Writes update memory immediately + persist to Supabase in the background
5. If Supabase is unavailable, the app falls back to demo mode with localStorage

### Row Level Security (RLS)
All tables have RLS policies:
- **Students** can only see their own data (borrow requests, notifications, etc.)
- **Admins/Librarians** can see and manage all data
- **Public data** (books, announcements, events) is readable by everyone

### Without Supabase (Demo Mode)
The app works fully offline without Supabase:
- Uses `LIBRARY_DATA` from `data.js` for books
- Stores everything in localStorage
- Demo login buttons work without any backend
- Perfect for development and testing

## File Structure

```
library/
  .env                    # Your Supabase credentials (git ignore this)
  package.json            # Node.js dependencies
  server.js               # Express static file server
  index.html              # Entry point (Supabase CDN loaded here)
  js/
    supabase-client.js    # Supabase client initialization
    api.js                # Complete data access layer
    state.js              # App state (Supabase + localStorage hybrid)
    app.js                # App initialization (async)
    router.js             # Hash-based router (async rendering)
    ...
  supabase/
    schema.sql            # Full database schema with RLS
    seed.js               # Database seeder
    README.md             # This file
```

## Troubleshooting

**"Failed to fetch" error on login**
- Check that your Supabase URL and anon key are correct in `index.html`
- Make sure the schema.sql was run successfully (check for errors in SQL Editor)

**"new row violates row-level security" error**
- The RLS policies require authentication for write operations
- Make sure you're logged in before trying to create/edit data

**App loads but shows demo mode**
- Supabase credentials might be empty or wrong
- Check the browser console for Supabase init errors
- The app automatically falls back to demo mode if Supabase is unavailable

**Seed script fails**
- Make sure you're using the `service_role` key (not the anon key) in `.env`
- The service_role key bypasses RLS, which is needed for admin operations
