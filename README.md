# 🎰 Spin the Wheel - Promotional Web Application

A complete, production-grade **Spin the Wheel** promotional application written entirely in **Strict TypeScript** (strict mode enabled with `"noUncheckedIndexedAccess": true`, zero `any` types).

The application features a **Node.js (Express) + SQLite** backend with cryptographically secure server-side probability logic, and a **Vite-bundled Vanilla TypeScript** frontend with an interactive HTML5 Canvas wheel, synthesized Web Audio sound effects, confetti animations, rate limiting, anti-cheat tokens, and an authenticated administrator portal.

---

## 📋 Table of Contents
1. [Tech Stack & Architecture](#tech-stack--architecture)
2. [Folder Structure](#folder-structure)
3. [Quick Start & Setup Instructions](#quick-start--setup-instructions)
4. [Available Scripts](#available-scripts)
5. [Probability & RNG Engine](#probability--rng-engine)
6. [Monte Carlo Simulation](#monte-carlo-simulation)
7. [Security & Anti-Cheat Flow](#security--anti-cheat-flow)
8. [Admin Dashboard](#admin-dashboard)
9. [Automated Test Suite](#automated-test-suite)
10. [Environment Variables](#environment-variables)

---

## 🛠 Tech Stack & Architecture

### Language & Typings
- **TypeScript 5.7+** configured in strict mode:
  - `"strict": true`
  - `"noUncheckedIndexedAccess": true`
  - Zero `any` types throughout shared, server, and client source code.

### Backend (`/server`)
- **Runtime:** Node.js 20+ (Active LTS)
- **Framework:** Express 4.x
- **Database:** MongoDB Atlas with official `mongodb` driver (multi-document ACID transactions via replica set sessions, connection pooling, automated indexes)
- **Validation:** Zod schemas shared across client and server
- **Security:** Helmet (custom Content Security Policy), CORS origin allowlist, Express-Rate-Limit, Cookie-Parser, HMAC SHA-256 token signatures
- **Dev Runner:** `tsx` watch mode

### Frontend (`/client`)
- **Bundler:** Vite 6.x
- **UI Framework:** Vanilla TypeScript (zero bloated frontend frameworks)
- **Wheel Graphics:** HTML5 2D Canvas with sub-pixel DPR scaling and metallic ring styling
- **Animations:** High-performance quintic deceleration easing (`easeOutQuint`, ~5.4s duration)
- **Audio Engine:** Web Audio API sound synthesizer (mechanical ticking, fanfare, chimes; no external audio assets required)
- **Confetti:** Custom lightweight canvas particle physics engine

### Shared (`/shared`)
- **Shared Types:** Fully typed contracts (`Prize`, `SlotConfig`, `SpinRequest`, `SpinResponse`, `SpinRecord`, `UserInfo`, `AdminStats`, etc.)
- **Shared Schemas:** Single source of truth for input validation (`UserInfoSchema`, `StartSpinSchema`, `SpinRequestSchema`, `AdminLoginSchema`, etc.)

---

## 📁 Folder Structure

```
spin-the-wheel/
├── client/                     # Frontend Vite + Vanilla TypeScript project
│   ├── dist/                   # Production build output
│   ├── src/
│   │   ├── admin.ts            # Admin dashboard logic, charts, table & filters
│   │   ├── api.ts              # Typed API client & device UUID management
│   │   ├── audio.ts            # Web Audio API procedural sound synthesizer
│   │   ├── confetti.ts         # Canvas confetti burst animation engine
│   │   ├── main.ts             # Application bootstrapping & state management
│   │   ├── style.css           # Modern dark-mode glassmorphic design system
│   │   └── wheel.ts            # Canvas Wheel class, pin hit-testing, easing math
│   ├── index.html              # Semantic HTML5 entry page with modals
│   ├── tsconfig.json           # Client TypeScript configuration (DOM + Bundler)
│   └── vite.config.ts          # Vite bundler configuration & API proxy
│
├── server/                     # Backend Node.js + Express + SQLite project
│   ├── dist/                   # Compiled server JavaScript output
│   ├── src/
│   │   ├── db/
│   │   │   ├── index.ts        # SQLite initialization, pragmas & schema setup
│   │   │   └── queries.ts      # Strongly typed SQL query helpers
│   │   ├── middleware/
│   │   │   ├── auth.ts         # HMAC-signed session cookie validator
│   │   │   ├── errorHandler.ts # Centralized typed AppError & Zod error handler
│   │   │   └── rateLimit.ts    # Endpoint rate limiters (spin start, spin, admin)
│   │   ├── routes/
│   │   │   ├── admin.ts        # Admin login, stats, audit log & CSV export
│   │   │   ├── config.ts       # Public wheel config endpoint (weights stripped)
│   │   │   └── spin.ts         # User registration & spin execution routes
│   │   ├── services/
│   │   │   ├── rng.ts          # Hardware CSPRNG weighted selection (crypto.randomInt)
│   │   │   ├── spinService.ts  # Transactional spin orchestrator & claim generator
│   │   │   └── token.ts        # One-time signed spin token lifecycle (60s expiry)
│   │   ├── config.ts           # Typed environment & 10-slot layout configuration
│   │   ├── errors.ts           # Custom error class hierarchy (ValidationError, etc.)
│   │   ├── index.ts            # Express application entrypoint
│   │   └── simulate.ts         # 100,000 spin Monte Carlo probability audit script
│   ├── test/                   # Vitest unit test suite
│   │   ├── rng.test.ts         # CSPRNG statistical distribution tests
│   │   ├── spinLimit.test.ts   # 3-spin quota enforcement & race-condition test
│   │   ├── token.test.ts       # Token single-use & signature tampering tests
│   │   └── weights.test.ts     # 10-slot count & 100% weight sum assertion tests
│   └── tsconfig.json           # Server TypeScript configuration (NodeNext)
│
├── shared/                     # Shared models and validation schemas
│   ├── dist/                   # Shared compiled declaration files
│   ├── schemas.ts              # Zod validation schemas
│   ├── tsconfig.json           # Shared TypeScript configuration
│   └── types.ts                # TypeScript data interfaces (zero any)
│
├── scripts/
│   └── run.js                  # Cross-platform runner prioritizing Node 22 on Windows
├── .env.example                # Template of required environment variables
├── .env                        # Local environment configuration
├── .gitignore                  # Git ignore rules
├── .prettierrc                 # Prettier configuration
├── eslint.config.mjs           # ESLint flat configuration
├── package.json                # Root monorepo scripts & dependencies
├── tsconfig.json               # Root TypeScript configuration
├── vitest.config.ts            # Vitest unit testing configuration
└── wheel.db                    # SQLite promotional database (WAL mode)
```

---

## 🚀 Quick Start & Setup Instructions

### Prerequisites
- **Node.js 20+** (Node.js 22 LTS recommended)
- **npm 9+**

### 1. Clone & Install Dependencies
```bash
git clone <repo-url>
cd "spin the wheel"
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
*(On Windows PowerShell, use `Copy-Item .env.example .env`)*

Default development settings in `.env`:
- `PORT=3000`
- `ADMIN_PASSWORD=AdminSecurePass2026!`
- `SPIN_LIMIT=3`
- `SESSION_SECRET=super_secret_session_key_at_least_32_bytes_long_spin_wheel`
- `IP_SALT=salt_for_hashing_ip_addresses_change_in_production_12345`

### 3. Run Development Servers
Launch both the Express backend and the Vite frontend simultaneously:
```bash
npm run dev
```
- Frontend application: **http://localhost:5173**
- Backend server: **http://localhost:3000**
- Admin portal shortcut: **http://localhost:5173#admin**

---

## 📜 Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Runs backend (`tsx watch`) and frontend (`vite`) concurrently. |
| `npm run build` | Compiles TypeScript for `/shared`, `/server`, and builds production Vite bundle for `/client`. |
| `npm start` | Runs the compiled production Node.js server (`server/dist/server/src/index.js`). |
| `npm run simulate` | Runs a 100,000 spin Monte Carlo simulation to verify exact probability distribution. |
| `npm run typecheck` | Executes strict TypeScript checks across shared, server, and client with `--noEmit`. |
| `npm test` | Runs the automated Vitest unit test suite (11 unit tests across 4 suites). |

---

## 🎯 Probability & RNG Engine

### Required Slot Distribution
The wheel consists of **exactly 10 slots**:
1. **Try Again Later (4 slots):** 15% each = **60.0% total**
   - Slot #1: 15%
   - Slot #3: 15%
   - Slot #6: 15%
   - Slot #9: 15%
2. **GRAND PRIZE (1 slot):** **2.5% total**
   - Slot #0: 2.5% (Radiant Metallic Gold, highlighted)
3. **Normal Prizes (5 slots):** 7.5% each = **37.5% total**
   - Slot #2: $50 Gift Card (7.5%)
   - Slot #4: Wireless Earbuds (7.5%)
   - Slot #5: 20% Off Coupon (7.5%)
   - Slot #7: Free Coffee Mug (7.5%)
   - Slot #8: $10 Voucher (7.5%)

**Total Sum:** `60.0% + 2.5% + 37.5% = 100.0%`

### Hardware-Backed CSPRNG
- Outcome selection uses `crypto.randomInt` from Node.js's hardware-backed OS CSPRNG (never `Math.random`).
- Weights are scaled to **10,000 integer basis points** (1% = 100 bps) to eliminate floating-point representation drift.
- Startup validator `validateWeights(SLOTS)` executes upon module load in `server/src/config.ts` and throws immediately if weights do not sum to 100 or if slot count is not 10.
- Weights and RNG algorithms are **server-side only**. The public endpoint `GET /api/wheel-config` returns only visual properties and labels; probabilities are never transmitted to the browser.

---

## 🎰 Monte Carlo Simulation

Verify the mathematical fairness of the RNG engine by running 100,000 automated spins:

```bash
npm run simulate
```

### Example Simulation Output:
```
======================================================================
🎰 RUNNING MONTE CARLO SPIN SIMULATION (100,000 iterations)
   Engine: Cryptographically Secure Hardware CSPRNG (crypto.randomInt)
======================================================================

┌───────┬──────────────────────┬──────────────┬──────────────┬──────────────┬───────────┐
│ Slot  │ Prize Label          │ Expected %   │ Actual Count │ Actual %     │ Variance  │
├───────┼──────────────────────┼──────────────┼──────────────┼──────────────┼───────────┤
│ #0    │ GRAND PRIZE          │        2.50% │        2,514 │        2.51% │    +0.01% │
│ #1    │ Try Again Later      │       15.00% │       15,021 │       15.02% │    +0.02% │
│ #2    │ $50 Gift Card        │        7.50% │        7,489 │        7.49% │    -0.01% │
│ #3    │ Try Again Later      │       15.00% │       14,982 │       14.98% │    -0.02% │
│ #4    │ Wireless Earbuds     │        7.50% │        7,511 │        7.51% │    +0.01% │
│ #5    │ 20% Off Coupon       │        7.50% │        7,540 │        7.54% │    +0.04% │
│ #6    │ Try Again Later      │       15.00% │       14,965 │       14.97% │    -0.03% │
│ #7    │ Free Coffee Mug      │        7.50% │        7,492 │        7.49% │    -0.01% │
│ #8    │ $10 Voucher          │        7.50% │        7,513 │        7.51% │    +0.01% │
│ #9    │ Try Again Later      │       15.00% │       14,973 │       14.97% │    -0.03% │
└───────┴──────────────────────┴──────────────┴──────────────┴──────────────┴───────────┘

📊 VERIFICATION OF REQUIRED PROBABILITY GROUPS:
──────────────────────────────────────────────────────────────────────
1. Try Again Later (4 slots): Expected: 60.00% | Actual: 59.94% (59,941 spins) | Variance: -0.06%
2. GRAND PRIZE (1 slot):      Expected:  2.50% | Actual:  2.51% (2,514 spins)  | Variance: 0.01%
3. Normal Prizes (5 slots):   Expected: 37.50% | Actual: 37.55% (37,545 spins) | Variance: 0.05%
──────────────────────────────────────────────────────────────────────
⏱️ Completed in 26ms (3,846,154 spins/sec)

✅ ALL PROBABILITY TARGETS VERIFIED AND ACCURATE WITHIN STATISTICAL TOLERANCE.
```

---

## 🔒 Security & Anti-Cheat Flow

1. **Two-Step Spin Execution:**
   - **Step 1 (`POST /api/spin/start`):** Participant submits validated name, email/phone, and consent. Server checks remaining spin quota (limit default: 3). If allowed, server issues a cryptographic **signed spin token** valid for **60 seconds**.
   - **Step 2 (`POST /api/spin`):** Client submits the token. Server verifies the HMAC signature using `timingSafeEqual`, ensures it is within 60s of generation, and asserts it has not already been used.
2. **Single-Use Enforced in Atomic Transaction:**
   - The token verification, quota re-validation, outcome selection, and record insertion are executed inside an atomic SQLite `immediate` transaction (`db.transaction(...).immediate()`), eliminating race conditions, double-spin replay attacks, and concurrency bypasses.
3. **Multi-Factor Participant Identity:**
   - Identified by normalized email/phone.
   - Tied to a persistent `deviceId` (UUID) stored in `localStorage` and synchronized via an `httpOnly` secure cookie (`wheel_device_id`).
   - Every spin records the SHA-256 HMAC hashed IP address using a secret `IP_SALT` to ensure participant privacy while enabling fraud audits.
4. **Network Hardening:**
   - Rate limiting via `express-rate-limit` on spin requests (max 15/min) and admin login attempts (max 10/15min).
   - Strict CORS origin allowlist.
   - Comprehensive Helmet HTTP response headers with Content Security Policy.

---

## 🛡️ Admin Dashboard

Navigate to **http://localhost:5173#admin** or click **"Admin Portal"** in the top navigation.

- **Default Administrator Password:** `AdminSecurePass2026!` *(configured via `ADMIN_PASSWORD` in `.env`)*
- **Authentication:** Upon successful login, the server sets a 24-hour signed `httpOnly` cookie (`wheel_admin_session`).

### Features:
1. **Live Analytics & KPI Cards:** Total spins recorded, unique verified participants, grand prize winners, and total prize winners.
2. **Distribution Audit Chart:** Visual comparison showing each slot's expected theoretical percentage versus actual empirical percentage with live variance tracking.
3. **Dynamic Prize Name Editor:** Change the display names of prizes (Slot #0 Grand Prize and Slots #2, #4, #5, #7, #8 normal prizes) directly from the browser; changes persist immediately to the SQLite database without altering backend probabilities.
4. **Searchable Audit Table:** Search by participant name, email, phone number, or prize label; filter by result type (Grand Prize, Wins, Losses); paginate through all entries.
5. **CSV Export:** Download a complete, RFC-compliant CSV audit log with timestamps, participant information, user spin numbers, prize details, claim codes, and hashed IPs.

---

## 🧪 Automated Test Suite

Run all unit tests via Vitest:
```bash
npm test
```

The test suite covers:
- **`weights.test.ts`:**
  - Asserts exactly 10 slots are defined.
  - Verifies slot weights sum to exactly 100%.
  - Verifies 4 Try Again slots sum to 60% (15% each) with `isWin: false`.
  - Verifies 1 Grand Prize slot with 2.5% weight and `isGrandPrize: true`.
  - Verifies 5 Normal Prize slots sum to 37.5% (7.5% each).
  - Verifies that invalid weight configurations throw an error during validation.
- **`rng.test.ts`:**
  - Runs 20,000 iterations to verify that empirical selection frequencies conform to theoretical distributions within statistical tolerance.
- **`spinLimit.test.ts`:**
  - Simulates a user executing up to the promotional limit (3 spins) and asserts that further spin attempts throw `SpinLimitError`.
- **`token.test.ts`:**
  - Verifies that single-use tokens are created with valid HMAC signatures.
  - Verifies that attempting to replay a token throws `TOKEN_ALREADY_USED`.
  - Verifies that tampered signatures are rejected with `TOKEN_SIGNATURE_MISMATCH`.

---

## ⚙️ Environment Variables

Defined in `.env`:

| Variable | Default Value | Description |
|---|---|---|
| `PORT` | `3000` | Port for Express backend server |
| `NODE_ENV` | `development` | Runtime environment (`development`, `production`, `test`) |
| `MONGODB_URI` | `mongodb+srv://...` | MongoDB Atlas cluster connection URI |
| `DATABASE_NAME` | `spin_the_wheel` | Database name on MongoDB Atlas cluster |
| `ADMIN_PASSWORD` | `AdminSecurePass2026!` | Password required to unlock admin dashboard |
| `SESSION_SECRET` | `super_secret_session_key_...` | HMAC secret key used to sign tokens and admin sessions |
| `IP_SALT` | `salt_for_hashing_ip_...` | Salt used to hash IP addresses in database |
| `SPIN_LIMIT` | `3` | Maximum allowed promotional spins per participant |
| `CORS_ORIGIN` | `http://localhost:5173,...` | Allowed CORS origins for browser requests |
