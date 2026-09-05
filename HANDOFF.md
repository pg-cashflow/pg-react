# pg-react — Comprehensive End-to-End Codebase Handoff

> **Canonical Backend:** `pg-go` (CONTRACT Rev 6+). All backend endpoints, state machines, and data schemas are canonical. This Progressive Web App (PWA) client implements the user interfaces, state management, and real-time workflows for Owners, Wardens/Managers, and Tenants.

---

## Table of Contents
1. [System Architecture & Tech Stack](#1-system-architecture--tech-stack)
2. [Project Structure & Monorepo Layout](#2-project-structure--monorepo-layout)
3. [Authentication & Identity Lifecycle](#3-authentication--identity-lifecycle)
4. [Role-Based Access Control & Navigation Tree](#4-role-based-access-control--navigation-tree)
5. [End-to-End Role Workflows](#5-end-to-end-role-workflows)
   - [Workflow A: Property Owner](#workflow-a-property-owner)
   - [Workflow B: PG Tenant](#workflow-b-pg-tenant)
   - [Workflow C: Warden / Property Manager](#workflow-c-warden--property-manager)
6. [API Layer & State Architecture](#6-api-layer--state-architecture)
7. [Core Financial & Operational Invariants](#7-core-financial--operational-invariants)
8. [Environment Setup & Local Development](#8-environment-setup--local-development)
9. [Testing, Building & Quality Gates](#9-testing-building--quality-gates)

---

## 1. System Architecture & Tech Stack

`pg-react` is built as a responsive, mobile-first Progressive Web App designed specifically for Indian Paying Guest (PG) and co-living operations.

- **Runtime & Framework:** React 19, TypeScript ~6.0, Vite 8.
- **Styling:** Tailwind CSS v4 + Lucide React icon library.
- **Routing:** TanStack Router (`@tanstack/react-router`) with a fully typed, code-defined route hierarchy and contextual route guards.
- **Server State & Caching:** TanStack Query v5 (`@tanstack/react-query`) managing server synchronization, background refetching, and cache invalidation.
- **Authentication:** Firebase Client SDK (Phone OTP + Google Auth) paired with custom JWT token exchange on the Go backend (`POST /auth/firebase`).
- **Payments:** Dual-mode payment gateway supporting manual UPI intents (dynamic QR, deep links, VPA, UTR reporting) and Cashfree Checkout SDK (`payment_session_id`).

---

## 2. Project Structure & Monorepo Layout

```
pg-react/
├── packages/
│   └── types/               # Canonical shared contracts & models
│       └── index.ts         # User, Tenant, Due, Inspection, MeterReading, Gamification types
├── src/
│   ├── api/                 # Typed API client layer
│   │   ├── client.ts        # Axios/Fetch wrapper with JWT injection & 401/403 interceptors
│   │   ├── auth.ts          # Token exchange endpoints
│   │   ├── dues.ts          # Due creation, listing, payment tokens, WhatsApp intent
│   │   ├── gamification.ts  # Gamification, Headcount, Inspections, Sub-meters, Hazards APIs
│   │   ├── join.ts          # Public invite lookup & join request submission
│   │   ├── pay.ts           # Payment intent generation (UPI / Cashfree)
│   │   ├── payments.ts      # Payment history & cash collection
│   │   ├── reports.ts       # UTR payment slip reviews & manual approvals
│   │   └── tenants.ts       # Tenant profile, KYC verification, room assignment
│   ├── auth/                # Authentication subsystem
│   │   ├── context.tsx      # Global AuthProvider, session initialization, token parser
│   │   ├── firebaseGoogle.ts# Google Sign-in handler
│   │   ├── firebasePhone.ts # reCAPTCHA & Phone OTP confirmation handler
│   │   └── storage.ts       # LocalStorage abstraction (`pg_jwt`, `pg_user`, `pg_invite`)
│   ├── components/layout/   # Shells and Navigation bars
│   │   ├── AppShell.tsx     # Owner layout (Desktop Sidebar + Mobile BottomNav)
│   │   ├── TenantShell.tsx  # Tenant layout (Desktop TenantSidebar + TenantBottomNav)
│   │   ├── ManagerShell.tsx # Manager layout (Desktop Manager Sidebar + Drawer)
│   │   └── TopBar.tsx       # Universal header with role badge & logout
│   ├── routes/              # Route views
│   │   ├── invite.tsx       # Landing page with invite code resolver
│   │   ├── login.tsx        # Phone OTP / Google login screen
│   │   ├── join.tsx         # Tenant KYC submission & allocation waiting room
│   │   ├── access-denied.tsx# 403 Forbidden screen
│   │   ├── owner/           # Owner views (Joins, Dues, Facility, Recon, Reports, etc.)
│   │   ├── tenant/          # Tenant views (Dashboard, Dues, Rewards, Community)
│   │   └── manager/         # Manager dashboard (Headcount, Inspections, Meters, Hazards)
│   ├── lib/                 # Utility libraries
│   │   ├── firebase.ts      # Firebase app initialization
│   │   ├── queryClient.ts   # TanStack Query client configuration
│   │   ├── utils.ts         # Paise-to-Rupee formatters, date & phone helpers
│   │   └── session.ts       # PWA cache eviction on logout
│   ├── router.tsx           # Complete TanStack Router tree with guard wrappers
│   └── main.tsx             # Application bootstrap
├── HANDOFF.md               # This handoff documentation
└── vite.config.ts           # Vite configuration with PWA plugins
```

---

## 3. Authentication & Identity Lifecycle

```
[User Browser]                 [Firebase Auth]               [pg-go Backend]
      │                                │                             │
      │── 1. Enter Phone + OTP ───────▶│                             │
      │◀── 2. Verified (ID Token) ─────│                             │
      │                                                              │
      │── 3. POST /auth/firebase (id_token, invite_code) ───────────▶│
      │◀── 4. 30-Day App JWT + User Record ──────────────────────────│
      │                                                              │
      │── 5. Store in localStorage (`pg_jwt`, `pg_user`)             │
      │── 6. Decode JWT payload (role, tenant_id, property_id)       │
      │── 7. TanStack Router Guard redirects to role surface         │
```

### Identity Resolution Rules
1. **Firebase Authentication:**
   - **Phone Auth:** User enters phone (`+91...`). reCAPTCHA executes invisibly; user inputs 6-digit OTP to receive Firebase ID Token.
   - **Google Auth:** User signs in with Google. If no phone is attached, a phone linking step is required.
2. **Backend Token Exchange:**
   - Client sends `POST /auth/firebase` with `{ id_token, invite_code }`.
   - Backend verifies Firebase token signature, creates or updates the user profile, maps invite codes, and returns an application JWT.
3. **Session Persistence:**
   - The JWT is stored in `localStorage` as `pg_jwt`.
   - User profile metadata is stored in `localStorage` as `pg_user`.
4. **Tenant Wait State (`isPendingJoin`):**
   - If `role === "tenant"` but `tenant_id` is missing or null, the tenant is in `pending_allocation`.
   - The user is strictly restricted to the `/join` screen.
   - Any attempt to access `/tenant/*` receives a `403 Forbidden` (`"waiting for owner to assign room and rent"`).
   - Once the owner approves the join request and assigns a room, the tenant taps **"Continue"** on `/join`. This executes `getIdToken(true)` and re-exchanges the token to receive a fresh JWT populated with `tenant_id`.
5. **Session Revocation & Logout:**
   - If an API returns `401 Unauthorized`, an event (`pg:unauthorized`) triggers global logout:
     - Clear React Query cache.
     - Clear Service Worker caches.
     - Reset Firebase auth.
     - Clear `localStorage` and redirect to `/`.

---

## 4. Role-Based Access Control & Navigation Tree

The router is strictly partitioned into three isolated surfaces plus public entry points:

| Route Path | Shell / Guard | Allowed Roles | Description |
| :--- | :--- | :--- | :--- |
| `/` | `AuthRedirect` | Public | Invite code entry / landing |
| `/login` | `AuthRedirect` | Public | Phone OTP & Google sign-in |
| `/join` | `RequireJoin` | Tenant (`tenant_id == null`) | KYC submission & waiting room |
| `/denied` | None | All | Unauthorized access warning |
| `/owner/*` | `RequireOwner` (`AppShell`) | `owner` | Complete owner management portal |
| `/tenant/*` | `RequireTenant` (`TenantShell`) | `tenant` (`tenant_id != null`) | Tenant dashboard, dues & perks |
| `/manager/*`| `RequireManager` (`ManagerShell`)| `manager` | Warden operational audits & meters |

### Automatic Routing (`homeForRole`):
- `owner` ➔ `/owner/joins` (Owner default landing)
- `manager` ➔ `/manager` (Warden operational board)
- `tenant` (with `tenant_id`) ➔ `/tenant` (Tenant dashboard)
- `tenant` (without `tenant_id`) ➔ `/join` (Waiting room)

---

## 5. End-to-End Role Workflows

### Workflow A: Property Owner

1. **Property & Facility Setup (`/owner/facility`):**
   - **Floors & Rooms:** Define physical floors and rooms with maximum bed capacity and monthly electricity unit allowances (`included_units`).
   - **Warden Staff:** Provision property managers/wardens by phone number to grant access to the `/manager` portal.
   - **Gamification & Tariff Engine:** Configure point conversion value (e.g. 1 pt = 100 paise / ₹1), monthly tenant budget caps, and sub-meter electricity tariffs (e.g. ₹10/unit).
2. **Tenant Onboarding (`/owner/joins`):**
   - View pending join requests submitted via the property invite code.
   - Review Aadhaar KYC data and preview photos.
   - Assign Floor, Room, Rent Amount (converted to paise), Due Day of the month (1–28), and activate the tenant.
3. **Billing & Dues Management (`/owner/dues`):**
   - Create recurring or ad-hoc dues (`rent`, `deposit`, `electricity`, `water`).
   - Copy WhatsApp payment reminders with deep links (`GET /owner/dues/:id/token`).
   - Record cash payments (strictly all-or-nothing against remaining due balance).
4. **Payment Reconciliation & Review (`/owner/reports`, `/owner/reconciliation`):**
   - Review manual payment reports submitted by tenants with bank UTR and screenshot proofs.
   - Confirm or reject UTR reports to mark dues as settled.
   - Review monthly collection aggregates, channel breakdowns (Cash vs UPI vs Gateway), and held deposits.

---

### Workflow B: PG Tenant

1. **Onboarding & KYC (`/` ➔ `/login` ➔ `/join`):**
   - Tenant arrives via invite URL (`/?invite=PG123`) or enters code manually.
   - Authenticates via Phone OTP.
   - Submits KYC profile: Name, Permanent/Current Address, Emergency Contact, and Aadhaar verification.
   - Waits on `/join` until the owner allocates a room.
2. **Dashboard & Streaks (`/tenant`):**
   - Displays current room allocation, rent status, and overdue amounts.
   - **Streak & Points Card:** Displays consecutive on-time payment streak (e.g., 3 months on-time), total reward points balance, and available streak freezes.
3. **Paying Dues (`/tenant/dues`):**
   - Tapping **Pay** triggers `GET /tenant/dues/:id/pay`.
   - **Manual Mode:** Presents PG UPI VPA, QR code, dynamic UPI intent link (`upi://pay?...`), and copyable note (`PG-XXXXXX`).
   - **Cashfree Mode:** Automatically initializes Cashfree Checkout using `payment_session_id`.
   - After paying via UPI app, tenant submits the 12-digit UTR and optional screenshot slip for immediate owner verification.
4. **Perks & Rewards Catalog (`/tenant/rewards`):**
   - Browse active catalog items (e.g. ₹200 off next rent, free weekend guest pass, late-night AC token).
   - Verifies tenure prerequisites (e.g. minimum 3 months on-time).
   - Redeems points: Generates instant coupon codes or direct rent credit deductions against active dues.
5. **Community & Daily Living (`/tenant/community`):**
   - **Daily Meal RSVP:** Toggle attendance (Going / Not Going) for Breakfast, Lunch, and Dinner. Auto-locks at daily cut-off times.
   - **Mess Menu Polling:** Vote on upcoming monthly food menus.
   - **Safety Hazard Reporting:** Submit anonymous hazard reports (electrical, plumbing, hygiene). Earns +25 points upon resolution.
   - **Room Inspection Review:** View warden audit scores. File a dispute within 48 hours if an unfair cleanliness penalty is issued.

---

### Workflow C: Warden / Property Manager

Accessible at `/manager` for users assigned `role: "manager"`.

1. **Kitchen Headcount Forecast:**
   - Real-time headcount tallies for breakfast, lunch, and dinner calculated from tenant RSVPs. Eliminates kitchen food waste.
2. **Floor & Room Inspections:**
   - Conduct structured audits across:
     - Bed & Linen hygiene
     - Electrical fixture safety
     - Bathroom cleanliness
     - Trash disposal
   - **Photo Enforced:** If any item fails, photo attachment is mandatory before audit submission.
   - Displays real-time compliance score (e.g. 75%).
3. **Sub-metering (Electricity & Water):**
   - Record monthly meter readings by selecting floor and room.
   - Automatic calculation: Current reading minus previous reading = Delta units.
   - Automatically compares consumption against the room's `included_units` quota.
   - Calculates billable excess using property electricity tariff.
4. **Safety Hazard Triage:**
   - Review incoming tenant hazard tickets.
   - Mark tickets as "In Progress" or "Resolved".
   - Resolving a valid ticket automatically credits the reporting tenant with bonus reward points.

---

## 6. API Layer & State Architecture

### Canonical Endpoints Reference
- **Auth:** `POST /auth/firebase`
- **Facility (Owner):**
  - `GET /owner/floors`, `POST /owner/floors`
  - `GET /owner/rooms`, `POST /owner/rooms`
  - `GET /owner/gamification/settings`, `PUT /owner/gamification/settings`
  - `GET /owner/gamification/rules`
  - `POST /owner/wardens`
- **Operations & Gamification (Tenant & Manager):**
  - `GET /tenant/points/summary` (Balance, streak, freezes, ledger)
  - `GET /tenant/rewards/catalog`, `POST /tenant/rewards/redeem`
  - `GET /tenant/meals/rsvp?date=YYYY-MM-DD`, `POST /tenant/meals/rsvp`
  - `GET /tenant/polls/active`, `POST /tenant/polls/:id/vote`
  - `GET /tenant/inspections/my`, `POST /tenant/inspections/:id/dispute`
  - `POST /tenant/hazards`
  - `GET /manager/headcount?date=YYYY-MM-DD`
  - `POST /manager/inspections`
  - `POST /manager/meters/readings`
  - `GET /manager/hazards`, `POST /manager/hazards/:id/resolve`

### TanStack Query Invalidation Patterns
- Query keys are hierarchical: `["tenant", "points"]`, `["manager", "headcount", date]`, `["owner", "dues"]`.
- Financial and operational mutations explicitly invalidate related queries upon success (e.g. submitting an inspection invalidates `["tenant", "inspections"]` and `["manager", "inspections"]`).

---

## 7. Core Financial & Operational Invariants

1. **Integer Paise Representation:**
   - All currency values in the database, API payloads, and TypeScript types are integers in **paise** (`₹1 = 100 paise`).
   - Conversion to rupees happens only at the presentation layer using `formatPaise()`.
   - User inputs in ₹ are converted to paise immediately on submission using `rupeesToPaise()`.
2. **Zero Optimistic Updates on Financial Mutations:**
   - Never optimistically mark a due as "paid" or increment credit balances in the client cache. Always wait for backend verification.
3. **VPA Privacy:**
   - The owner's UPI VPA is never hardcoded or exposed client-side. It is returned exclusively through `GET /owner/dues/:id/pay` or `GET /tenant/dues/:id/pay`.
4. **Cash Settlement Rule:**
   - Cash payments are all-or-nothing against the remaining due balance.
5. **Inspection Dispute SLA:**
   - Tenants have an immutable 48-hour window from the inspection timestamp to dispute a failed item.

---

## 8. Environment Setup & Local Development

### Prerequisites
- Node.js 20+ and npm 10+
- Running `pg-go` backend server on `http://localhost:8080`

### Environment Configuration (`.env.local`)
```ini
# Backend API Base URL
VITE_API_BASE_URL=http://localhost:8080

# Firebase Client Configuration
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=your-app.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-app
VITE_FIREBASE_STORAGE_BUCKET=your-app.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=1234567890
VITE_FIREBASE_APP_ID=1:1234567890:web:abcdef

# Cashfree Gateway Environment (sandbox | production)
VITE_CASHFREE_ENV=sandbox
```

### Running Locally
```bash
# Install dependencies
npm install

# Start Vite dev server on 127.0.0.1:5173
npm run dev
```

> **Crucial Host Origin Note:** Always access the application via `http://127.0.0.1:5173` (not `localhost:5173`) to match Firebase Auth reCAPTCHA whitelisting and `pg-go` CORS origin configurations.

### Firebase Test Phone Numbers for Rapid Local Testing
- `+91 80082 81429` (OTP: `123456`) — Default Owner
- `+91 90000 00000` (OTP: `123456`) — Seed Tenant
- `+91 91111 11111` (OTP: `123456`) — Seed Manager / Warden

---

## 9. Testing, Building & Quality Gates

### Quality Commands
```bash
# Type-check and production build
npm run build

# Run unit and contract tests
npm run test -- --run

# Lint codebase (oxlint)
npm run lint
```

### Continuous Verification
Every pull request or deployment build must pass:
1. `tsc -b` — Complete TypeScript type check without errors.
2. `vitest run` — Contract tests validating request/response schemas against `pg-go`.
3. `oxlint` — Zero lint violations.
