# pg-react — Comprehensive End-to-End Codebase Handoff

> **Canonical Backend:** `pg-go` **CONTRACT Rev 7** (`pg-go/CONTRACT.md`) is the HTTP source of truth. `packages/types/index.ts` (`@pg/types`) is the TypeScript mirror of Go domain types — if they diverge, **fix types to match the backend**. This Progressive Web App implements client state, responsive UIs, and end-to-end workflows for Property Owners, Wardens / Property Managers, and Tenants.

---

## Table of Contents

1. [System Architecture & Tech Stack](#1-system-architecture--tech-stack)
2. [Project Directory & File Structure](#2-project-directory--file-structure)
3. [Authentication, Identity Lifecycle & Session Management](#3-authentication-identity-lifecycle--session-management)
4. [Localization (i18n) & Preference Synchronization](#4-localization-i18n--preference-synchronization)
5. [Role-Based Access Control & Route Hierarchy](#5-role-based-access-control--route-hierarchy)
6. [End-to-End Role Workflows & Portal Specifications](#6-end-to-end-role-workflows--portal-specifications)
   - [Workflow A: Property Owner Portal](#workflow-a-property-owner-portal)
   - [Workflow B: PG Tenant Portal](#workflow-b-pg-tenant-portal)
   - [Workflow C: Warden / Property Manager Portal](#workflow-c-warden--property-manager-portal)
7. [API Layer Reference & TanStack Query State](#7-api-layer-reference--tanstack-query-state)
8. [Design System, Semantic Tokens & ANTI_SLOP Rules](#8-design-system-semantic-tokens--anti_slop-rules)
9. [Core Financial & Operational Invariants](#9-core-financial--operational-invariants)
10. [Environment Setup, Configuration & Local Development](#10-environment-setup-configuration--local-development)
11. [Testing, Linting & Quality Gates](#11-testing-linting--quality-gates)
12. [Documentation Index & References](#12-documentation-index--references)

---

## 1. System Architecture & Tech Stack

`pg-react` is built as a high-performance, mobile-first Progressive Web App designed specifically for Indian Paying Guest (PG) hostels and co-living operations.

- **Runtime & Build Tools:** React 19 (`react` 19.2.8, `react-dom` 19.2.8), TypeScript ~6.0.2, Vite 8.2.0 (`@vitejs/plugin-react` 6.0.4).
- **Styling & Design Tokens:** Tailwind CSS v4 (`@tailwindcss/vite` 4.3.3) paired with an explicit semantic token system in `src/index.css`. Includes three distinct portal themes (`[data-portal="owner|tenant|manager"]`), seamless light/dark mode resolution, and strict design token linting via custom AST and regex scripts (`check-palette.mjs`, `check-typography.mjs`).
- **Typography:** IBM Plex Sans and IBM Plex Mono typography scale defined using semantic classes (`.t-display`, `.t-h1`, `.t-h2`, `.t-h3`, `.t-body`, `.t-body-sm`, `.t-caption`, `.t-amount`, `.t-amount-lg`, `.t-code`, `.t-display-num`).
- **Icons:** Lucide React (`lucide-react` 1.31.0).
- **Routing:** TanStack Router (`@tanstack/react-router` 1.170.27) featuring a typed route tree, centralized guard wrappers (`RequireOwner`, `RequireTenant`, `RequireManager`, `RequireJoin`, `AuthRedirect`), and automatic 404 handling (`NotFoundView`).
- **Server State & Caching:** TanStack Query v5 (`@tanstack/react-query` 5.101.4) with devtools (`@tanstack/react-query-devtools`), organized under a centralized key dictionary (`QUERY_KEYS` in `src/lib/queryKeys.ts`).
- **Authentication:** Firebase Client SDK v12 (`firebase` 12.17.1) for Phone OTP (reCAPTCHA) and Google Sign-In, exchanging Firebase ID tokens with `pg-go` via `POST /api/auth/firebase` for a 30-day app JWT.
- **Internationalization (i18n):** Multi-language localization powered by `react-intl` 12.1.2 supporting English (`en-IN`), Telugu (`te-IN`), Tamil (`ta-IN`), and Kannada (`kn-IN`), with background server preference synchronization (`/api/me/preferences`).
- **Payments:** Dual-mode payments:
  - **Manual UPI:** Dynamic QR code (`qrcode` 1.5.4), deep links (`upi://pay`), PG VPA, and 12-digit UTR payment slip submission with screenshot upload and OCR parsing (`upiScreenshotExtractor.ts`).
  - **Payment Gateway:** Cashfree Checkout SDK (`payment_session_id`) integration (`src/lib/cashfree.ts`).
- **Push & Notifications:** Universal In-App Notification Center (`<NotificationCenter />`) with badge polling, action filtering, read state mutation, and Web Push notifications via Service Worker and VAPID public key subscription (`src/push/subscribe.ts`).
- **Global Search:** Command palette / search in `TopBar` querying `GET /api/search` (mode: lexical or hybrid) with client-side navigation shortcuts (`src/lib/navIndex.ts`).
- **PWA & Offline:** `vite-plugin-pwa` 1.3.0 and `workbox-window` 7.4.1 configuring standalone web application manifest, auto-updating service worker, and selective `NetworkOnly` runtime caching for all data API calls.

### Shell → CONTRACT Mapping

| PWA Surface / Shell | Target Routes | CONTRACT.md Section | Primary Users |
| :--- | :--- | :--- | :--- |
| **Public / Auth** | `/landing`, `/`, `/login`, `/activation`, `/denied` | Auth, Join, Public | All unauthenticated / prospective tenants |
| **Tenant Onboarding** | `/join` (`RequireJoin`) | Join, Public | Tenants in `pending_allocation` |
| **Owner `AppShell`** | `/owner/*` (`RequireOwner`) | Owner, Pay, Payment reports, Search, Notifications | PG Owners & Admins |
| **Tenant `TenantShell`** | `/tenant/*` (`RequireTenant`) | Tenant, Pay, Gamification, Operations, Notifications | Active onboarded tenants |
| **Manager `ManagerShell`** | `/manager/*` (`RequireManager`) | Manager / Warden, Operations, Notifications | Wardens & Operational Staff |

---

## 2. Project Directory & File Structure

```
pg-react/
├── packages/
│   └── types/
│       └── index.ts                  # Canonical TypeScript definitions matching pg-go CONTRACT Rev 7
├── public/
│   ├── favicon.ico
│   ├── pwa-192x192.png
│   └── pwa-512x512.png
├── src/
│   ├── api/                          # Typed HTTP client modules interacting with pg-go (/api/*)
│   │   ├── auth.ts                   # Token exchange (POST /auth/firebase)
│   │   ├── client.ts                 # Fetch wrapper: JWT injection, Accept-Language, 401/403 event dispatchers
│   │   ├── contract.test.ts          # Contract tests validating endpoints against live/mock backend
│   │   ├── dues.ts                   # Dues querying, waiving, cash settlement, WhatsApp reminder tokens, QR
│   │   ├── events.ts                 # Audit ledger events (GET /owner/events)
│   │   ├── gamification.ts           # Points, rewards, inspections, headcount, sub-meters, hazards, violations, referrals
│   │   ├── join.ts                   # Invite lookup, KYC profile submission, join request activation & rejection
│   │   ├── notifications.ts          # In-app notifications listing, unread count & read mutations
│   │   ├── pay.ts                    # PayIntent generation (UPI details, Cashfree session, QR blob)
│   │   ├── payments.ts               # Verified payment ledger, monthly reconciliation & bank statement CSV import
│   │   ├── preferences.ts            # Supported locales & user language preference endpoints
│   │   ├── properties.ts             # Property portfolio listing
│   │   ├── reports.ts                # Tenant UTR payment slip review, confirmation & rejection
│   │   ├── search.ts                 # Federated global search (GET /search)
│   │   ├── tenant.ts                 # Tenant self-service profile, passbook dues/payments, Aadhaar KYC, UTR submission
│   │   └── tenants.ts                # Owner tenant roster, direct tenant creation, notices, vacating, deposits, ID photos
│   ├── auth/                         # Authentication subsystem
│   │   ├── context.tsx               # AuthProvider, useAuth hook, token parser & session lifecycle
│   │   ├── firebaseGoogle.ts         # Google Sign-In popup with phone credential verification
│   │   ├── firebasePhone.ts          # Phone OTP verification with invisible reCAPTCHA
│   │   └── storage.ts                # LocalStorage abstraction (pg_jwt, pg_user, pg_invite, pg_locale)
│   ├── components/
│   │   ├── common/                   # Shared UI primitives
│   │   │   ├── LanguageSelector.tsx  # Language toggle button & segmented picker
│   │   │   └── ThemeToggle.tsx       # Theme cycle button & segmented picker (System / Light / Dark)
│   │   ├── layout/                   # Role-specific shells, headers, sidebars & navigation
│   │   │   ├── AppLoadingScreen.tsx  # Fullscreen loading placeholder during auth checks
│   │   │   ├── AppShell.tsx          # Owner layout (Desktop Sidebar + Mobile BottomNav)
│   │   │   ├── AuthLayout.tsx        # Centered auth card container
│   │   │   ├── BottomNav.tsx         # Owner mobile bottom navigation (Home, Dues, UTRs, Tenants, More)
│   │   │   ├── ErrorBoundary.tsx     # React component error boundary
│   │   │   ├── ManagerShell.tsx      # Manager/warden shell (Desktop Sidebar + Mobile Drawer + Action Bar)
│   │   │   ├── Sidebar.tsx           # Owner desktop collapsible navigation sidebar
│   │   │   ├── TenantBottomNav.tsx   # Tenant mobile bottom navigation (Home, Dues, Passbook, Perks, Meals)
│   │   │   ├── TenantShell.tsx       # Tenant layout (Desktop TenantSidebar + TenantBottomNav)
│   │   │   ├── TenantSidebar.tsx     # Tenant desktop navigation sidebar
│   │   │   └── TopBar.tsx            # Universal header (Title, GlobalSearch, Language, Notifications, Theme, Push)
│   │   ├── notifications/
│   │   │   └── NotificationCenter.tsx# Notification popover with unread count badge, tabs, action links
│   │   ├── search/
│   │   │   └── GlobalSearch.tsx      # Cmd+K search dialog combining server results with client navigation
│   │   └── shared/                   # Domain UI components
│   │       ├── AmountBadge.tsx       # Currency badge formatted from paise
│   │       ├── ConfirmDialog.tsx     # Accessible confirmation dialog modal
│   │       ├── CopyButton.tsx        # One-click copy button with visual feedback
│   │       ├── DuePaymentTimeline.tsx# Visual payment progress stepper (Created -> Paid / Awaiting UTR Review)
│   │       ├── PageHeader.tsx        # Consistent section page header
│   │       ├── PayPanel.tsx          # Action sheet supporting manual UPI (QR/intent) and Cashfree Checkout
│   │       ├── QRModal.tsx           # Modal presenting dynamic UPI QR code
│   │       ├── QueryState.tsx        # TanStack Query wrapper: skeletons, errors, empty states & refetch bar
│   │       ├── StatusPill.tsx        # Color-coded money status badge (Paid, Pending, Partial, Overdue, Waived)
│   │       └── StreakFlame.tsx       # Visual gamification flame indicating on-time payment streak
│   ├── i18n/                         # Internationalization subsystem
│   │   ├── config.ts                 # Supported locales (en-IN, te-IN, ta-IN, kn-IN) & configuration
│   │   ├── index.ts                  # Public exports for LocaleProvider, LocaleSync, useLocale
│   │   ├── provider.tsx              # LocaleProvider, useLocale, and LocaleSync server reconciliation
│   │   └── messages/                 # Localized string dictionaries
│   │       ├── en-IN.ts              # Canonical English (India) translations
│   │       ├── kn-IN.ts              # Kannada translations
│   │       ├── ta-IN.ts              # Tamil translations
│   │       └── te-IN.ts              # Telugu translations
│   ├── lib/                          # Utilities and shared infrastructure
│   │   ├── aadhaarExtractor.ts       # Secure client-side Aadhaar QR code extraction & payload parsing
│   │   ├── cashfree.ts               # Cashfree Web SDK lazy loader and checkout initiator
│   │   ├── constants.ts              # Normalized API_BASE URL & CASHFREE_ENV
│   │   ├── exportLedgerCsv.ts        # Client-side dues ledger CSV exporter
│   │   ├── exportLedgerCsv.test.ts   # CSV exporter test suite
│   │   ├── firebase.ts               # Firebase client initialization
│   │   ├── navIndex.ts               # Role-based search navigation index & keywords
│   │   ├── queryClient.ts            # Configured TanStack QueryClient instance
│   │   ├── queryKeys.ts              # Centralized query key definitions
│   │   ├── session.ts                # Session eviction and cache cleanup on logout
│   │   ├── upiScreenshotExtractor.ts # Client OCR extraction of UTR and amount from UPI payment screenshots
│   │   └── utils.ts                  # Paise/Rupee conversions, date formatters, Indian phone normalizer
│   ├── push/
│   │   └── subscribe.ts              # Web Push service worker registration & VAPID key exchange
│   ├── routes/                       # Route components
│   │   ├── access-denied.tsx         # 403 Forbidden screen
│   │   ├── activation.tsx            # Celebration screen after tenant/owner activation
│   │   ├── invite.tsx                # Invite landing page with invite code resolver
│   │   ├── join.tsx                  # Tenant KYC registration form & allocation waiting room
│   │   ├── landing.tsx               # Public marketing landing page explaining the 3 vantage points
│   │   ├── login.tsx                 # Phone OTP & Google authentication view
│   │   ├── not-found.tsx             # 404 Route not found screen
│   │   ├── owner/                    # Owner portal routes
│   │   │   ├── dashboard.tsx         # Operational overview, metric cards & fast action links
│   │   │   ├── dues.tsx              # Dues creation, WhatsApp reminder tokens, cash settlement
│   │   │   ├── events.tsx            # System-wide audit event ledger
│   │   │   ├── facility.tsx          # Floors, rooms, manager/warden provisioning, gamification tariffs
│   │   │   ├── joins.tsx             # Pending join requests & Aadhaar KYC review
│   │   │   ├── more.tsx              # Property overview, walk-in tenant creation, statement import, settings
│   │   │   ├── payments.tsx          # Verified payment audit trail & filters
│   │   │   ├── reconciliation.tsx    # Monthly revenue by channel & held deposit balances
│   │   │   ├── reminders.tsx         # T-3 automated/manual rent reminder queue with WhatsApp intents
│   │   │   ├── reports.tsx           # Tenant UTR payment slip review & manual approval/rejection
│   │   │   └── tenants.tsx           # Active and vacated tenant rosters, notices, vacate & deposit settle
│   │   ├── tenant/                   # Tenant portal routes
│   │   │   ├── community.tsx         # Meals RSVP, menu polling, hazard reports, inspection disputes, leaderboard, referrals
│   │   │   ├── dashboard.tsx         # Passbook overview, active dues, streak flame & quick pay
│   │   │   ├── dues.tsx              # Active dues, PayPanel (UPI / Cashfree) & UTR submission
│   │   │   ├── payments.tsx          # Personal payment history & verified receipts
│   │   │   ├── profile.tsx           # Profile info, Aadhaar KYC, push reminders, language selector, logout
│   │   │   └── rewards.tsx           # Perks catalog, eligibility criteria & points redemption
│   │   └── manager/                  # Manager / Warden portal routes
│   │       ├── hazards.tsx           # Active safety hazard tickets triage & resolution
│   │       ├── inspection-detail.tsx # Inspection report detail & item dispute adjudication
│   │       ├── inspection-new.tsx    # Multi-step room/floor inspection audit with mandatory photo failure enforcement
│   │       ├── inspections.tsx       # Historical inspection audits list
│   │       ├── kitchen.tsx           # Daily meal headcount tallies (Breakfast / Lunch / Dinner)
│   │       ├── meters.tsx            # Sub-meter reading entry (Electricity/Water) with delta calculation
│   │       ├── profile.tsx           # Warden profile & logout
│   │       └── violations.tsx        # Tenant rule violation logging (safety vs lifestyle severity)
│   ├── test/
│   │   ├── i18n.test.ts              # Unit tests for localization, translations & preference fallback
│   │   └── setup.ts                  # Vitest test setup and polyfills
│   ├── theme/
│   │   └── context.tsx               # ThemeProvider, useTheme hook, system/light/dark resolution
│   ├── App.css
│   ├── App.tsx                       # Root provider hierarchy (QueryClient, Locale, Theme, Auth, Router)
│   ├── index.css                     # Design tokens, @import tailwindcss, portal modifiers, typography
│   ├── main.tsx                      # DOM root mount (<StrictMode><App /></StrictMode>)
│   ├── router.tsx                    # TanStack Router tree with route guards & redirection
│   └── vite-env.d.ts
├── scripts/
│   ├── check-palette.mjs             # ANTI_SLOP linter verifying zero forbidden Tailwind color classes
│   ├── check-typography.mjs          # ANTI_SLOP linter enforcing semantic .t-* typography classes
│   ├── gen-icons.mjs                 # Script generating PWA icon assets
│   └── restyle-tokens.mjs            # Token transformation helper
├── docs/
│   ├── BRAND_VOICE.md                # Communication guidelines, tone of voice & terminology
│   ├── CRAFT.md                      # Engineering principles: speed on scope, never on money/trust
│   ├── DESIGN_SYSTEM.md              # Token layers, typography scale, component recipes & heuristic QA
│   ├── MOBBIN_DECISIONS.md           # Mobile UX benchmarks and design decisions
│   ├── REMINDERS.md                  # Rent reminder specification & server automation contract
│   ├── UX_SESSIONS.md                # Usability testing scoreboard and journey evaluations
│   └── UX_VALIDATION.md              # UX evaluation protocols and AI critic guidelines
├── HANDOFF.md                        # This canonical handoff documentation
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## 3. Authentication, Identity Lifecycle & Session Management

```
[User Browser]                      [Firebase Auth]                 [pg-go Backend]
      │                                     │                               │
      │── 1. Enter Phone + 6-digit OTP ────▶│                               │
      │   (or Google Sign-In Popup)         │                               │
      │◀── 2. Firebase ID Token Returned ───│                               │
      │                                                                     │
      │── 3. POST /api/auth/firebase { id_token, invite_code } ────────────▶│
      │◀── 4. Return 30-Day App JWT + User Record ──────────────────────────│
      │                                                                     │
      │── 5. Store in localStorage (pg_jwt, pg_user)                        │
      │── 6. Decode JWT claims: sub, user_id, role, tenant_id, property_id  │
      │── 7. TanStack Router Guard routes to role home surface              │
```

### Identity State Machine

1. **Firebase Authentication Options:**
   - **Phone Auth:** User enters an Indian phone number (`+91...`). reCAPTCHA resolves invisibly, Firebase delivers a 6-digit OTP, and the client receives a Firebase ID token.
   - **Google Sign-In:** User authenticates via Google popup. The backend validates `email_verified: true`. If no phone number is linked to the Firebase account, the client prompts for phone linking.
2. **Backend Token Exchange:**
   - Client invokes `POST /api/auth/firebase` passing `{ id_token, invite_code? }`.
   - The Go backend verifies the cryptographic signature with Firebase Admin, provisions or updates the user record, associates invite codes if provided, and returns an application JWT.
3. **Session Persistence (`src/auth/storage.ts`):**
   - Application JWT is stored under `pg_jwt`.
   - Serialized `User` object is stored under `pg_user`.
   - Pending property invite code is cached under `pg_invite`.
   - Active language code is cached under `pg_locale`.
   - User theme preference (`system` | `light` | `dark`) is stored under `pg_theme`.
   - Reminders sent log is stored under `pg_reminder_sent`.
4. **Tenant Wait State (`isPendingJoin`):**
   - When a user has `role === "tenant"` but `tenant_id` is null or undefined, the user is in `pending_allocation`.
   - The user is strictly restricted to the `/join` screen by `RequireTenant` and `RequireJoin`.
   - Direct navigation to `/tenant/*` receives a `403 Forbidden` response (`"complete your profile to continue"`), triggering a `pg:waiting-join` event which automatically routes the user back to `/join`.
   - Once the owner reviews the KYC submission, assigns a room and specifies rent, the tenant clicks **"Continue"** on `/join`. The client forces a token refresh via `getIdToken(true)` and re-exchanges it with `POST /api/auth/firebase` to receive a fresh JWT containing the allocated `tenant_id`.
5. **Session Revocation & Centralized Interceptors (`src/api/client.ts`):**
   - **`401 Unauthorized`:** Token has expired or is invalid. Calls `clearToken()`, dispatches the `pg:unauthorized` window event, evicts React Query cache, and redirects to `/landing`.
   - **`403 Forbidden` (`access revoked`):** User's sessions were invalidated by `POST /api/auth/revoke-sessions`. Immediately clears session and redirects to `/landing`.
   - **`403 Forbidden` (`complete your profile to continue`):** Tenant has not been allocated. Dispatches `pg:waiting-join` window event to redirect to `/join`.
   - **`503 Service Unavailable` (`firebase auth not configured`):** Friendly error banner explaining missing backend service-account credentials.
   - **`404 Not Found` (`no account for phone`):** Instructs the user to obtain an invite code from the PG owner.

---

## 4. Localization (i18n) & Preference Synchronization

`pg-react` implements an enterprise-grade internationalization architecture with offline resilience, optimistic UI updates, and bi-directional server synchronization.

### Supported Locales

| Locale Code | Language | Native Name | Default |
| :--- | :--- | :--- | :--- |
| `en-IN` | English (India) | English | **Yes** |
| `te-IN` | Telugu | తెలుగు | No |
| `ta-IN` | Tamil | தமிழ் | No |
| `kn-IN` | Kannada | ಕನ್ನಡ | No |

### Architecture & Data Flow

```
                                  [LocaleProvider]
                                         │
                 ┌───────────────────────┴───────────────────────┐
                 ▼                                               ▼
         [IntlProvider]                                  [useLocale() Hook]
      (react-intl messages)                               (setLocale, t, locale)
                 │                                               │
                 ▼                                               ▼
          [LocaleSync]                                  [UI: TopBar / Profile]
  (Reconciles Server vs Client)                       (LanguageToggle / Segmented)
                 │
                 ├──▶ GET /api/me/preferences (Session hydration)
                 └──▶ PATCH /api/me/preferences (Persist user choice)
```

1. **Initial Hydration & Priority Rules:**
   - **Returning User:** If the authenticated `User` record has `has_saved_preference === true` and a valid `locale`, the server's database preference takes precedence over the anonymous local device cache.
   - **First-Time User:** If the user selected a language prior to authentication (`has_saved_preference === false`), the local selection is retained and immediately pushed to the server via `PATCH /api/me/preferences`.
2. **Race-Condition & Network Resilience:**
   - Sequential request versioning via `requestSeqRef` prevents out-of-order responses from overwriting newer locale selections.
   - `AbortController` cleanly cancels in-flight persist requests when the user rapidly switches languages.
   - Any failed or unpersisted language change is automatically retried when the browser fires `online` (network reconnect) or `focus` (tab refocus) events.
3. **HTTP Header Propagation:**
   - `src/api/client.ts` automatically extracts the active locale using `getStoredLocale()` and attaches an `Accept-Language: <locale>` header to every outbound HTTP request.
4. **Number and Currency Formatting:**
   - Currency formatting (`formatPaise(paise, locale)`) and date formatting (`formatDate(dateString, locale)`) in `src/lib/utils.ts` format numbers and dates according to the Indian localized conventions of the active locale.

---

## 5. Role-Based Access Control & Route Hierarchy

Navigation is strictly partitioned into three isolated role domains, plus public entry surfaces:

| Route Path | Shell / Guard Wrapper | Allowed Roles | Description |
| :--- | :--- | :--- | :--- |
| `/landing` | None | Public | Landing page showcasing the 3 vantage points |
| `/` | `AuthRedirect` | Public | Invite code entry / join property entry point |
| `/login` | `AuthRedirect` | Public | Phone OTP & Google Sign-In view |
| `/activation` | None | Authenticated | Post-join / post-creation celebratory splash screen |
| `/join` | `RequireJoin` | Tenant (`tenant_id == null`) | KYC submission form & room allocation waiting room |
| `/denied` | None | All | 403 Forbidden warning screen |
| `*` (Catch-all) | `notFoundComponent` | All | Custom 404 "Page isn't on the ledger" screen |
| **Owner Portal** | `RequireOwner` (`AppShell`) | `owner` | **Default landing: `/owner/dashboard`** |
| `/owner/dashboard` | `RequireOwner` (`AppShell`) | `owner` | Real-time metrics, collection aggregates & fast actions |
| `/owner/joins` | `RequireOwner` (`AppShell`) | `owner` | Pending join requests, Aadhaar KYC review & room assignment |
| `/owner/dues` | `RequireOwner` (`AppShell`) | `owner` | Dues creation, WhatsApp reminder tokens, cash settlement |
| `/owner/reports` | `RequireOwner` (`AppShell`) | `owner` | Tenant UTR payment slip review & manual approval/rejection |
| `/owner/payments` | `RequireOwner` (`AppShell`) | `owner` | Verified payment audit ledger & channel filters |
| `/owner/reconciliation`| `RequireOwner` (`AppShell`) | `owner` | Monthly revenue, deposit reserves & channel recon |
| `/owner/reminders` | `RequireOwner` (`AppShell`) | `owner` | T-3 rent reminder queue with WhatsApp intent links |
| `/owner/tenants` | `RequireOwner` (`AppShell`) | `owner` | Active & vacated tenant rosters, notice, vacate & deposits |
| `/owner/facility` | `RequireOwner` (`AppShell`) | `owner` | Floors, rooms, manager provisioning, gamification tariffs |
| `/owner/events` | `RequireOwner` (`AppShell`) | `owner` | System-wide audit event ledger |
| `/owner/more` | `RequireOwner` (`AppShell`) | `owner` | Walk-in tenant creation, statement import, settings |
| **Tenant Portal** | `RequireTenant` (`TenantShell`)| `tenant` (`tenant_id != null`) | **Default landing: `/tenant`** |
| `/tenant` | `RequireTenant` (`TenantShell`)| `tenant` (`tenant_id != null`) | Tenant dashboard, passbook overview & streak flame |
| `/tenant/dues` | `RequireTenant` (`TenantShell`)| `tenant` (`tenant_id != null`) | Active dues list, PayPanel (UPI / Cashfree) & UTR slips |
| `/tenant/payments` | `RequireTenant` (`TenantShell`)| `tenant` (`tenant_id != null`) | Personal payment history & verified receipts |
| `/tenant/rewards` | `RequireTenant` (`TenantShell`)| `tenant` (`tenant_id != null`) | Perks catalog & reward points redemption |
| `/tenant/community`| `RequireTenant` (`TenantShell`)| `tenant` (`tenant_id != null`) | Meals RSVP, menu poll, hazards, inspection disputes |
| `/tenant/profile` | `RequireTenant` (`TenantShell`)| `tenant` (`tenant_id != null`) | Profile info, Aadhaar KYC, push reminders, language |
| **Manager Portal** | `RequireManager` (`ManagerShell`)| `manager` / `owner` | **Default landing: `/manager/kitchen`** |
| `/manager` | `RequireManager` (`ManagerShell`)| `manager` / `owner` | Automatically redirects to `/manager/kitchen` |
| `/manager/kitchen` | `RequireManager` (`ManagerShell`)| `manager` / `owner` | Meal headcount forecast (Breakfast / Lunch / Dinner) |
| `/manager/inspections`| `RequireManager` (`ManagerShell`)| `manager` / `owner` | Historical inspection audits list |
| `/manager/inspections/new`| `RequireManager` (`ManagerShell`)| `manager` / `owner` | Multi-step room/floor audit with mandatory photo failure |
| `/manager/inspections/$id`| `RequireManager` (`ManagerShell`)| `manager` / `owner` | Audit detail view & tenant dispute resolution |
| `/manager/meters` | `RequireManager` (`ManagerShell`)| `manager` / `owner` | Sub-meter reading entry (Electricity/Water) & deltas |
| `/manager/hazards` | `RequireManager` (`ManagerShell`)| `manager` / `owner` | Safety hazard tickets triage & resolution |
| `/manager/violations`| `RequireManager` (`ManagerShell`)| `manager` / `owner` | House rule violation logging (safety vs lifestyle) |
| `/manager/profile` | `RequireManager` (`ManagerShell`)| `manager` / `owner` | Warden profile & logout |

### Automatic Routing Function (`homeForRole`)

```typescript
function homeForRole(role: string | null, pending: boolean): string {
  if (role === "owner") return "/owner/dashboard";
  if (role === "manager") return "/manager/kitchen";
  if (role === "tenant" && pending) return "/join";
  if (role === "tenant") return "/tenant";
  return "/landing";
}
```

---

## 6. End-to-End Role Workflows & Portal Specifications

### Workflow A: Property Owner Portal

1. **Property Setup & Staff Provisioning (`/owner/facility`, `/owner/more`):**
   - **Floors & Rooms:** Configure property floors and individual rooms with bed capacity and monthly electricity unit quotas (`included_units`).
   - **Warden Staff:** Add property managers/wardens by phone number (`POST /api/owner/managers`), immediately granting them access to `/manager/*`.
   - **Tariff & Gamification Engine:** Set point conversion values (e.g. 1 pt = 100 paise = ₹1), monthly earn caps, floor cleanliness bonus thresholds, and excess electricity rates per kWh (`PATCH /api/owner/gamification/settings`).
2. **Tenant Onboarding & Activation (`/owner/joins`, `/owner/more`):**
   - **Invite Flow:** Tenants discover the PG via property invite code (`GET /api/owner/invite`). Owners can rotate codes (`POST /api/owner/invite/rotate`) to revoke old invite links.
   - **Join Review:** Review incoming tenant KYC submissions with Aadhaar last 4 digits, permanent address, parent details, and uploaded ID photo (`GET /api/owner/tenants/:id/id-photo`).
   - **Activation:** Assign Floor, Room Number, Monthly Rent (converted to paise), Rent Due Day (1–28), Notice Period Days, and Security Deposit, then activate the tenant (`POST /api/owner/join-requests/:id/activate`).
   - **Walk-in Creation:** Alternatively, create offline walk-in tenants directly from `/owner/more`.
3. **Billing, Dues & Reminders (`/owner/dues`, `/owner/reminders`):**
   - Generate recurring or ad-hoc dues for rent, security deposits, water, or electricity.
   - **Rent Reminders (`/owner/reminders`):** System calculates T-3 due date reminders. Owners click **Send now** to invoke `POST /api/owner/dues/:id/token`, instantly generating a pre-filled WhatsApp intent link (`wa.me/?text=...`) containing the exact due amount and `PG-XXXXXX` due code.
   - **Cash Settlement:** If a tenant pays cash, record the settlement via `POST /api/owner/dues/:id/mark-cash-paid`. Cash payments are strictly all-or-nothing against the remaining balance.
4. **Payment Review & Reconciliation (`/owner/reports`, `/owner/reconciliation`, `/owner/payments`):**
   - **UTR Slip Queue (`/owner/reports`):** Review manual payment reports submitted by tenants. Confirming the UTR settles the due and credits reward points; rejecting marks the report invalid with an optional note.
   - **Statement Import (`/owner/more`):** Upload standard bank CSV statements (`POST /api/owner/statements/import`) to automatically match bank credits against dues by due code or amount/date windows.
   - **Reconciliation Summary (`/owner/reconciliation`):** Audit monthly rent collected, collections by channel (Cash, UPI, Gateway), outstanding overdue balances, and held security deposits.
5. **Tenant Lifecycle & Offboarding (`/owner/tenants`):**
   - Issue formal move-out notice (`POST /api/owner/tenants/:id/notice`).
   - Calculate prorated final rent based on vacate date (`POST /api/owner/tenants/:id/prorate`).
   - Settle and refund security deposits (`POST /api/owner/tenants/:id/deposit/settle`).
   - Mark tenant as vacated (`POST /api/owner/tenants/:id/vacate`), freeing up room capacity.

---

### Workflow B: PG Tenant Portal

1. **Onboarding & KYC (`/` ➔ `/login` ➔ `/join`):**
   - Tenant arrives via invite link (`/?invite=PG123`) or enters code manually on `/`.
   - Authenticates via Phone OTP or Google Sign-In.
   - Submits KYC profile (`POST /api/join`): Full name, permanent/current address, parent name, emergency contact, consent, and photo ID.
   - Remains on `/join` waiting room until the owner assigns a room. Once approved, tapping **Continue** refreshes the session token and navigates to `/tenant`.
2. **Passbook Dashboard & Streaks (`/tenant`):**
   - Displays current room allocation, rent due date, active balance, and overdue dues.
   - **Streak Flame:** Renders current on-time payment streak in months, available streak freezes, and reward points balance (`GET /api/tenant/points`).
3. **Paying Dues & Submitting UTR Slips (`/tenant/dues`):**
   - Tapping **Pay** on an open due opens the `PayPanel`.
   - **Manual Mode:** Displays PG UPI VPA, dynamic QR code, one-click `upi://pay` deep link, and copyable note (`PG-XXXXXX`).
   - **Cashfree Mode:** Initializes Cashfree Checkout SDK for instant credit/debit card, net banking, or gateway UPI transactions.
   - **UTR Submission:** After paying via external UPI apps (GPay, PhonePe, Paytm), tenant enters the 12-digit bank UTR and attaches an optional screenshot. The client extracts UTR via OCR (`upiScreenshotExtractor.ts`) and submits the slip (`POST /api/tenant/dues/:id/reports`).
4. **Perks & Rewards Redemption (`/tenant/rewards`):**
   - Browse catalog of perks (rent discounts, food vouchers, maintenance perks) (`GET /api/tenant/rewards`).
   - Enforces tenure requirements (e.g. minimum 3 on-time months).
   - Redeeming points (`POST /api/tenant/rewards/:id/redeem`) generates instant coupon codes or automatically deducts credit from active dues.
5. **Community & Daily Living Hub (`/tenant/community`):**
   - **Meal RSVP:** Toggle attendance (Going / Not Going) for Breakfast, Lunch, and Dinner (`POST /api/tenant/meal-rsvp`).
   - **Menu Polling:** Vote on upcoming hostel mess menus (`POST /api/tenant/menu-poll/vote`).
   - **Safety Hazards:** Report building hazards (water leaks, electrical faults) with camera photos (`POST /api/tenant/hazards`).
   - **Inspection Review & Disputes:** View warden audit scores and dispute failed items within the 48-hour window (`POST /api/tenant/inspections/items/:id/dispute`).
   - **Leaderboard & Referrals:** View hostel streak rankings and refer friends (`POST /api/tenant/referrals`) to earn referral points.
   - **House Rules & Violations:** View logged violation notices and severity levels.
6. **Profile & Settings (`/tenant/profile`):**
   - Review room and KYC details, submit Aadhaar verification, enable Web Push rent reminders, switch language, and log out.

---

### Workflow C: Warden / Property Manager Portal

Accessible at `/manager/*` for users with `role: "manager"` or `role: "owner"`.

1. **Kitchen Headcount Forecast (`/manager/kitchen`):**
   - Real-time headcount tallies for Breakfast, Lunch, and Dinner aggregated from tenant RSVPs (`GET /api/manager/kitchen/headcount`). Eliminates kitchen food waste and over-purchasing.
2. **Floor & Room Inspections (`/manager/inspections`, `/manager/inspections/new`, `/manager/inspections/$id`):**
   - Conduct structured audits across Bed & Linen hygiene, Electrical fixture safety, Bathroom cleanliness, and Trash disposal (`POST /api/manager/inspections`).
   - **Mandatory Photo Enforcement:** If any inspection checklist item is marked as failed, attaching a photo is strictly enforced before submission can proceed.
   - **Dispute Resolution:** Review tenant inspection disputes and adjudicate ("upheld" or "overturned") via `POST /api/manager/inspections/items/:id/resolve`.
3. **Sub-metering (Electricity & Water) (`/manager/meters`):**
   - Record monthly meter readings per room or floor (`POST /api/manager/meter-readings`).
   - Automatic delta calculation: Current reading minus previous reading = Delta units.
   - Compares delta units against room `included_units` quota and calculates excess billable paise using property tariff.
   - Supports anomaly confirmation and meter replacement flags.
4. **Safety Hazard Triage (`/manager/hazards`):**
   - Review incoming tenant hazard tickets with photos.
   - Update ticket status to "Resolved" or "Rejected" (`POST /api/manager/hazards/:id/resolve`). Resolving credits bonus reward points to the reporting tenant.
5. **Progressive Violations & Vendor Audits (`/manager/violations`):**
   - Log house rule violations (`POST /api/manager/violations`) categorized by severity (`safety` vs `lifestyle`) with a 3-step progressive discipline stepper (Warning ➔ Fine ➔ Eviction review) and photo evidence.
   - Log vendor quality audits and penalties (`POST /api/manager/vendor-inspections`).
6. **Warden Profile (`/manager/profile`):**
   - View staff details and trigger session logout.

---

## 7. API Layer Reference & TanStack Query State

All HTTP requests pass through `apiFetch` or `apiFetchBlob` in `src/api/client.ts`, which automatically injects `Authorization: Bearer <token>` and `Accept-Language: <locale>`, and handles 401/403 event dispatching.

### Complete API Module Directory

| Module | Canonical Functions | HTTP Route & Method |
| :--- | :--- | :--- |
| **`auth.ts`** | `exchangeFirebaseToken` | `POST /api/auth/firebase` |
| **`preferences.ts`** | `getSupportedLocales` | `GET /api/locales` |
| | `getMyPreferences` | `GET /api/me/preferences` |
| | `updateMyPreferences` | `PATCH /api/me/preferences` |
| **`join.ts`** | `lookupInvite` | `GET /api/join/invite/:code` |
| | `getJoinMe` | `GET /api/join/me` |
| | `submitJoinProfile` | `POST /api/join` (multipart form) |
| | `getOwnerInvite` | `GET /api/owner/invite` |
| | `rotateInvite` | `POST /api/owner/invite/rotate` |
| | `getJoinRequests` | `GET /api/owner/join-requests` |
| | `activateJoin` | `POST /api/owner/join-requests/:id/activate` |
| | `rejectJoin` | `POST /api/owner/join-requests/:id/reject` |
| **`dues.ts`** | `getDues` | `GET /api/owner/dues` |
| | `waiveDue` | `POST /api/owner/dues/:id/waive` |
| | `markCashPaid` | `POST /api/owner/dues/:id/mark-cash-paid` |
| | `matchDue` | `POST /api/owner/dues/:id/match` |
| | `createDueToken` | `POST /api/owner/dues/:id/token` |
| | `getDueQR` | `GET /api/owner/dues/:id/qr` |
| **`reports.ts`** | `getPaymentReports` | `GET /api/owner/payment-reports` |
| | `confirmPaymentReport`| `POST /api/owner/payment-reports/:id/confirm` |
| | `rejectPaymentReport` | `POST /api/owner/payment-reports/:id/reject` |
| **`payments.ts`** | `getPayments` | `GET /api/owner/payments` |
| | `getReconciliation` | `GET /api/owner/reconciliation?period=YYYY-MM` |
| | `importStatements` | `POST /api/owner/statements/import` (multipart CSV) |
| **`tenants.ts`** | `getTenants` | `GET /api/owner/tenants` |
| | `createTenant` | `POST /api/owner/tenants` |
| | `updateTenant` | `PATCH /api/owner/tenants/:id` |
| | `giveNotice` | `POST /api/owner/tenants/:id/notice` |
| | `vacateTenant` | `POST /api/owner/tenants/:id/vacate` |
| | `attachPhone` | `POST /api/owner/tenants/:id/attach-phone` |
| | `prorateTenant` | `POST /api/owner/tenants/:id/prorate` |
| | `settleDeposit` | `POST /api/owner/tenants/:id/deposit/settle` |
| | `getTenantIdPhotoBlob`| `GET /api/owner/tenants/:id/id-photo` |
| **`properties.ts`** | `getProperties` | `GET /api/owner/properties` |
| **`events.ts`** | `getEvents` | `GET /api/owner/events` |
| **`tenant.ts`** | `getMyProfile` | `GET /api/tenant/me` |
| | `getMyDues` | `GET /api/tenant/dues` |
| | `getMyPayments` | `GET /api/tenant/payments` |
| | `getMyDueQR` | `GET /api/tenant/dues/:id/qr` |
| | `submitUtrReport` | `POST /api/tenant/dues/:id/reports` |
| | `submitAadhaar` | `POST /api/tenant/aadhaar` |
| **`pay.ts`** | `getOwnerDuePay` | `GET /api/owner/dues/:id/pay` |
| | `getTenantDuePay` | `GET /api/tenant/dues/:id/pay` |
| | `getPayQrBlob` | `GET <qr_png_url>` |
| **`notifications.ts`**| `getNotifications` | `GET /api/notifications` |
| | `markNotificationRead`| `PATCH /api/notifications/:id/read` |
| | `markAllNotificationsRead`| `PATCH /api/notifications/read-all` |
| **`search.ts`** | `searchGlobal` | `GET /api/search?q=...&limit=...&mode=...` |
| **`gamification.ts`** | `getTenantPoints` | `GET /api/tenant/points` |
| | `getTenantRewards` | `GET /api/tenant/rewards` |
| | `redeemTenantReward` | `POST /api/tenant/rewards/:id/redeem` |
| | `getTenantInspections` | `GET /api/tenant/inspections` |
| | `disputeInspectionItem`| `POST /api/tenant/inspections/items/:id/dispute`|
| | `getTenantMealRSVP` | `GET /api/tenant/meal-rsvp` |
| | `submitTenantMealRSVP` | `POST /api/tenant/meal-rsvp` |
| | `getTenantMenuPoll` | `GET /api/tenant/menu-poll` |
| | `voteMenuPoll` | `POST /api/tenant/menu-poll/vote` |
| | `reportTenantHazard` | `POST /api/tenant/hazards` |
| | `getTenantViolations` | `GET /api/tenant/violations` |
| | `getTenantLeaderboard` | `GET /api/tenant/leaderboard` |
| | `getTenantReferrals` | `GET /api/tenant/referrals` |
| | `createTenantReferral` | `POST /api/tenant/referrals` |
| | `getManagerKitchenHeadcount` | `GET /api/manager/kitchen/headcount` |
| | `submitManagerInspection`| `POST /api/manager/inspections` |
| | `listManagerInspections` | `GET /api/manager/inspections` |
| | `resolveInspectionItem`| `POST /api/manager/inspections/items/:id/resolve` |
| | `recordManagerMeterReading` | `POST /api/manager/meter-readings` |
| | `listManagerHazards` | `GET /api/manager/hazards` |
| | `resolveManagerHazard` | `POST /api/manager/hazards/:id/resolve` |
| | `logManagerViolation` | `POST /api/manager/violations` |
| | `submitManagerVendorInspection` | `POST /api/manager/vendor-inspections` |
| | `getOwnerGamificationSettings` | `GET /api/owner/gamification/settings` |
| | `updateOwnerGamificationSettings` | `PATCH /api/owner/gamification/settings` |
| | `listOwnerFloors` | `GET /api/owner/floors` |
| | `createOwnerFloor` | `POST /api/owner/floors` |
| | `listOwnerRooms` | `GET /api/owner/rooms` |
| | `createOwnerRoom` | `POST /api/owner/rooms` |
| | `createOwnerManager` | `POST /api/owner/managers` |

### Centralized Query Keys (`src/lib/queryKeys.ts`)

All TanStack Query operations reference `QUERY_KEYS`:

```typescript
export const QUERY_KEYS = {
  tenants: ["tenants"] as const,
  tenant: (id: string) => ["tenants", id] as const,
  dues: (tenantId?: string) => (tenantId ? (["dues", tenantId] as const) : (["dues"] as const)),
  due: (id: string) => ["dues", "detail", id] as const,
  payments: (tenantId?: string) => tenantId ? (["payments", tenantId] as const) : (["payments"] as const),
  reconciliation: (period?: string) => period ? (["reconciliation", period] as const) : (["reconciliation"] as const),
  events: ["events"] as const,
  joinRequests: ["owner", "join-requests"] as const,
  ownerInvite: ["owner", "invite"] as const,
  paymentReports: ["owner", "payment-reports"] as const,
  properties: ["owner", "properties"] as const,
  tenantDues: ["tenant", "dues"] as const,
  tenantPayments: ["tenant", "payments"] as const,
  tenantProfile: ["tenant", "me"] as const,
  joinMe: ["join", "me"] as const,
  preferences: ["me", "preferences"] as const,
  locales: ["locales"] as const,
  tenantPoints: ["tenant", "points"] as const,
  tenantRewards: ["tenant", "rewards"] as const,
  tenantInspections: ["tenant", "inspections"] as const,
  tenantMealRSVP: ["tenant", "meal-rsvp"] as const,
  tenantMenuPoll: ["tenant", "menu-poll"] as const,
  tenantViolations: ["tenant", "violations"] as const,
  tenantLeaderboard: ["tenant", "leaderboard"] as const,
  tenantReferrals: ["tenant", "referrals"] as const,
  managerHeadcount: (propertyId: string, date?: string) => ["manager", "headcount", propertyId, date || "today"] as const,
  managerInspections: (propertyId: string) => ["manager", "inspections", propertyId] as const,
  managerHazards: (propertyId: string, status?: string) => ["manager", "hazards", propertyId, status || "all"] as const,
  ownerGamificationSettings: (propertyId: string) => ["owner", "gamification-settings", propertyId] as const,
  ownerFloors: (propertyId: string) => ["owner", "floors", propertyId] as const,
  ownerRooms: (propertyId: string) => ["owner", "rooms", propertyId] as const,
};
```

---

## 8. Design System, Semantic Tokens & ANTI_SLOP Rules

Visual standards and recipes follow [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md) and [`docs/CRAFT.md`](docs/CRAFT.md).

### Semantic Token Layers (`src/index.css`)

1. **Raw Palette (`--raw-*`):** Baseline color variables defined only inside `src/index.css`. Never referenced directly in components.
2. **Semantic Tokens:** Meaning-bearing variables resolved across light and dark modes:
   - Surface & Background: `--bg`, `--surface`, `--hairline`
   - Typography Ink: `--ink` (primary), `--ink-muted` (secondary), `--ink-faint` (tertiary/placeholders)
   - Operational Status: `--danger`, `--danger-tint`, `--success`, `--success-tint`
3. **Portal Modifiers:** Portal shells assign `[data-portal="owner|tenant|manager"]` to configure context-specific accent colors:
   - **Owner Portal:** Teal (`--raw-teal` `#0E5C4F` light / `#4FBBA0` dark)
   - **Tenant Portal:** Marigold (`--raw-marigold` `#E8A324` light / `#F2B94D` dark)
   - **Manager Portal:** Graphite (`--raw-graphite` `#3E4650` light / `#A7B0BC` dark)
4. **Financial Money Status:** Money status classes are strictly reserved for financial states (`paid`, `pending`, `partial`, `overdue`, `waived`) and are never used as general decoration.

### Typography Scale (`.t-*`)

| Class | Font Size / Line Height | Font Weight | Family | Primary Use Case |
| :--- | :--- | :--- | :--- | :--- |
| `.t-display` | 28px / 34px | 700 | IBM Plex Sans | Marketing landing & streak hero |
| `.t-h1` | 22px / 28px | 700 | IBM Plex Sans | Page titles and primary screen headings |
| `.t-h2` | 18px / 24px | 700 | IBM Plex Sans | Section headers & modal titles |
| `.t-h3` | 16px / 22px | 600 | IBM Plex Sans | Card headers & table group headers |
| `.t-body` | 14px / 20px | 400 | IBM Plex Sans | Standard interface text |
| `.t-body-sm` | 13px / 18px | 400 | IBM Plex Sans | Dense table rows & secondary metadata |
| `.t-caption` | 12px / 16px | 500 | IBM Plex Sans | Field labels, timestamps & helper text |
| `.t-amount` | 15px / 20px | 500 | IBM Plex Mono | Financial figures (tabular numerals) |
| `.t-amount-lg` | 26px / 30px | 500 | IBM Plex Mono | Hero financial totals & due amounts |
| `.t-code` | 14px / 20px | 400 | IBM Plex Mono | Due codes (`PG-XXXXXX`), UTRs, tokens |
| `.t-display-num` | 28px / 34px | 500 | IBM Plex Mono | 404 number, streak counter numbers |

### Component Design Recipes

- **Cards:** `rounded-[14px] border border-hairline bg-surface p-4` (or `p-5` on Owner desktop).
- **Controls & Form Inputs:** `rounded-[10px] border border-hairline bg-bg`, min-height 44px–48px (maintains ≥16px font size to prevent mobile browser zoom).
- **Primary CTA:** Exactly one primary button per screen view (`bg-accent text-white rounded-[10px] font-semibold`). Secondary buttons must be outline or plain text.
- **Loading States:** Layout skeletons with `.pg-shimmer` via `<QueryState />`.
- **Background Fetching:** Discreet 2px `.pg-fetching` top progress indicator when `isFetching === true`.

### ANTI_SLOP Linting Rules

Code commits must adhere to automated quality gate scripts:
- `npm run lint:palette` (`scripts/check-palette.mjs`): Disallows generic, uncontrolled color utilities (`slate-*`, `amber-*`, `cyan-*`, `text-primary`, or inline `#hex`).
- `npm run lint:type` (`scripts/check-typography.mjs`): Disallows raw arbitrary typography sizes (`text-xl`, `text-2xl`, `text-3xl`) in favor of semantic `.t-*` classes. Escape hatch for third-party or explicit exceptions: comment `/* lint-allow-palette */` or `/* lint-allow-type */`.

---

## 9. Core Financial & Operational Invariants

1. **Integer Paise Representation:**
   - Currency amounts across the database, backend endpoints, and TypeScript types (`@pg/types`) are integers in **paise** (`₹1 = 100 paise`).
   - Conversion to rupees happens solely at presentation boundaries via `formatPaise(paise)`. User inputs in rupees are immediately multiplied using `rupeesToPaise()`.
2. **Zero Optimistic Updates on Financial Mutations:**
   - Due settlement, UTR verification, cash recording, and credit deductions must never be optimistically applied to client cache. The UI must wait for backend confirmation before invalidating and refetching queries.
3. **Owner VPA Privacy:**
   - The owner's UPI VPA is never hardcoded or exposed in public routes. It is securely delivered via authenticated `GET /api/owner/dues/:id/pay` or `GET /api/tenant/dues/:id/pay`.
4. **All-or-Nothing Cash Settlement:**
   - Cash recording via `POST /api/owner/dues/:id/mark-cash-paid` strictly requires the full remaining due amount.
5. **Inspection Dispute SLA:**
   - Tenants have an immutable 48-hour dispute window starting from the inspection timestamp. After 48 hours, the dispute action locks permanently.
6. **Inspection Photo Enforcement:**
   - During room or floor inspections, any checklist item marked as failed strictly requires photo attachment before the manager can submit the audit.

---

## 10. Environment Setup, Configuration & Local Development

### Prerequisites

- Node.js 20+ and npm 10+
- Running `pg-go` backend on `http://localhost:8080` (or Docker equivalent)

### Environment Configuration (`.env.local`)

> [!IMPORTANT]
> Because `pg-go` namespaces data routes inside `/api`, `VITE_API_BASE_URL` must point to `http://localhost:8080/api` during local development. In production embeds, the client is served same-origin from the Go binary where `/api` is used.

```ini
# Backend API Base URL (must include /api)
VITE_API_BASE_URL=http://localhost:8080/api

# Firebase Client Configuration (Firebase Console > Project Settings > Web App)
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
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

> **Crucial Host Origin Requirement:** Always open the application via `http://127.0.0.1:5173` (NOT `localhost:5173`). This ensures full compatibility with Firebase Auth reCAPTCHA domain whitelisting and backend CORS origin permissions (`CORS_ALLOWED_ORIGINS`).

### Seed Testing Accounts

- **Property Owner:** `+91 80082 81429` (OTP: `123456`)
- **Tenant:** `+91 90000 00000` (OTP: `123456`)
- **Warden / Property Manager:** `+91 91111 11111` (OTP: `123456`)

---

## 11. Testing, Linting & Quality Gates

### Available NPM Scripts

```bash
# Start Vite development server
npm run dev

# Run TypeScript compilation and production Vite build
npm run build

# Run oxlint and custom ANTI_SLOP design system linters
npm run lint

# Check design palette conformance
npm run lint:palette

# Check typography scale conformance
npm run lint:type

# Run Vitest test suite
npm run test

# Preview production build locally
npm run preview
```

### Continuous Integration Checklist

Before submitting a pull request or deploying a build, verify:

1. `tsc -b`: Type check completes with 0 compiler errors.
2. `vitest run`: Unit, contract, and i18n test suites pass (`src/test/i18n.test.ts`, `src/lib/exportLedgerCsv.test.ts`, `src/api/contract.test.ts`).
3. `npm run lint`: Oxlint, palette AST checker, and typography checker pass cleanly.
4. Responsive verification: Test 390px (mobile viewport) and 1280px (desktop viewport) in both Light and Dark themes.

---

## 12. Documentation Index & References

- **[`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md):** Semantic tokens, typography definitions, component recipes, breakpoints, and heuristic QA checklist.
- **[`docs/CRAFT.md`](docs/CRAFT.md):** Core development principles — move fast on feature scope, never compromise on money, join, or verification lanes.
- **[`docs/BRAND_VOICE.md`](docs/BRAND_VOICE.md):** Terminology glossary (Ledger, Passbook, Due code, Warden, Flame), tone of voice, and banned words.
- **[`docs/REMINDERS.md`](docs/REMINDERS.md):** Specification for T-3 rent reminder cadence and backend scheduled worker contract.
- **[`docs/UX_VALIDATION.md`](docs/UX_VALIDATION.md):** Usability evaluation protocols, silent testing instructions, and AI design critic prompts.
- **[`docs/UX_SESSIONS.md`](docs/UX_SESSIONS.md):** User testing session logs, journey scoring, and historical UX observations.
- **[`docs/MOBBIN_DECISIONS.md`](docs/MOBBIN_DECISIONS.md):** Mobile interface design rationales benchmarked against consumer fintech apps.
