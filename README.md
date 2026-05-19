# EventPay

A cashless credit system for events. Attendees get 300 credits on registration, spend them at stalls using QR codes, and stall owners redeem their earned credits for cash from the organizer at the end.

---

## Project Structure

```
eventpay/
├── backend/          # Node.js + Express API
│   ├── db/           # PostgreSQL connection & schema
│   ├── middleware/   # JWT auth
│   ├── routes/       # attendees, stalls, admin
│   ├── server.js
│   └── .env.example
└── frontend/         # React + Vite
    ├── src/
    │   ├── components/
    │   ├── context/
    │   ├── pages/
    │   └── utils/
    └── .env.example
```

---

## Prerequisites

- **Node.js** v18 or higher — https://nodejs.org
- **PostgreSQL** v14 or higher — https://www.postgresql.org/download/

---

## 1. Set Up PostgreSQL

1. Install PostgreSQL and start the service.
2. Open `psql` and create a database:
   ```sql
   CREATE DATABASE eventpay;
   ```
3. Note your username, password, host (usually `localhost`), and port (usually `5432`).

---

## 2. Backend Setup

```bash
cd eventpay/backend
npm install
cp .env.example .env
```

Edit `.env`:
```
DATABASE_URL=postgresql://YOUR_USER:YOUR_PASSWORD@localhost:5432/eventpay
JWT_SECRET=any_long_random_string_here
ADMIN_PIN=1234
PORT=4000
STARTING_CREDITS=300
CREDIT_TO_CASH=1
FRONTEND_URL=http://localhost:5173
```

Start the backend:
```bash
npm run dev       # development (auto-restarts on changes)
npm start         # production
```

The API runs at http://localhost:4000. Tables are created automatically on first start.

---

## 3. Frontend Setup

```bash
cd eventpay/frontend
npm install
cp .env.example .env
```

The default `.env` works as-is for local development (Vite proxies `/api` to port 4000).

Start the frontend:
```bash
npm run dev       # development
npm run build     # build for production
```

The app runs at http://localhost:5173.

---

## How It Works

### Attendee
1. Register with name + email → get 300 credits + QR code
2. Show QR at any stall → stall owner scans and enters amount → credits deducted

### Stall Owner
1. Register stall with just a name
2. Scan attendee QR (or paste ID manually) → enter amount → confirm
3. Credits accumulate; show admin your total at end of event

### Admin (PIN: 1234 by default)
- Live stats: attendees, stalls, total credits spent, total cash payout
- Per-stall payout breakdown in ₹ (configurable via `CREDIT_TO_CASH`)
- Full attendee list with remaining credits

---

## VS Code Extensions (Recommended)

- **ESLint** — code quality
- **Prettier** — code formatting
- **Thunder Client** — test API endpoints without Postman
- **PostgreSQL** (by Chris Kolkman) — browse your DB inside VS Code

---

## Deployment Notes

For production deployment (e.g. Railway, Render, or a VPS):

1. Set `NODE_ENV=production` in backend env
2. Set `DATABASE_URL` to your hosted PostgreSQL URL (Railway/Supabase/Neon all provide one)
3. Build the frontend: `npm run build` — serve the `dist/` folder via Nginx or a static host (Vercel, Netlify)
4. Update `FRONTEND_URL` in backend env to your actual frontend domain
5. Update `VITE_API_URL` in frontend `.env` to your backend's public URL

---

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/attendees/register | — | Register attendee |
| POST | /api/attendees/login | — | Login with email |
| GET | /api/attendees/me | attendee | Get my profile |
| GET | /api/attendees/me/transactions | attendee | My transaction history |
| POST | /api/stalls/register | — | Register stall |
| POST | /api/stalls/login | — | Login with stall name |
| GET | /api/stalls/me | stall | Get stall info |
| GET | /api/stalls/attendee/:id | stall | Look up attendee before charging |
| POST | /api/stalls/charge | stall | Deduct credits from attendee |
| GET | /api/stalls/me/transactions | stall | Stall transaction history |
| POST | /api/admin/login | — | Login with PIN |
| GET | /api/admin/overview | admin | Event stats |
| GET | /api/admin/stalls | admin | All stalls + payouts |
| GET | /api/admin/attendees | admin | All attendees |
| DELETE | /api/admin/reset | admin | Wipe all data |
