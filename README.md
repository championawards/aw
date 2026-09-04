# Inclusion Champions — Awards Voting Platform

Same stack as KEA/KAM: Express + Supabase backend, Paystack M-Pesa STK Push, plain HTML/CSS/JS frontend, JWT admin auth. Fully separate from KEA and KAM — own repo, own database, own Paystack config.

## What's included

- `backend/` — Express API (categories, nominees, votes, Paystack STK push + webhook, admin auth)
- `backend/schema.sql` — Supabase schema, pre-seeded with your 3 launch categories
- `frontend/` — public voting site (`index.html`) + admin dashboard (`admin.html`)

## Setup

1. **Supabase**: create a new project, open the SQL editor, run `backend/schema.sql`.
2. **Backend**:
   ```
   cd backend
   npm install
   cp .env.example .env   # fill in SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, PAYSTACK_SECRET_KEY, JWT_SECRET
   node create-admin.js youradminname yourpassword
   npm start
   ```
   Deploy to Render the same way KEA/KAM were deployed. Add the env vars from `.env` in the Render dashboard.
3. **Paystack**: create a subaccount for this project if you want a revenue split (like KAM's), or use your main account directly. Set the webhook URL in the Paystack dashboard to `https://your-backend.onrender.com/api/votes/webhook`.
4. **Frontend**: in `frontend/js/app.js` and `frontend/js/admin.js`, replace `API_BASE` with your live Render backend URL. Deploy `frontend/` to GitHub Pages, same as KEA/KAM.

## Still needed from you

- Nominees for each of the 3 categories (names + optional bio/photo) — add via the admin panel once it's live, or send them to me and I'll seed them directly.
- Confirm vote cost — currently defaulted to **KSh 20/vote** like KEA. Let me know if you want it different (KAM/KEA both used this).
- Any additional categories beyond the 3 you sent.
- Theme is a deep indigo/gold/teal/coral palette, distinct from KEA (black/gold/green) and KAM (violet/orange/magenta) — say if you want it changed.
