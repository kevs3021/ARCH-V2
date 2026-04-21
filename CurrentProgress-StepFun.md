# ARCH V2 - Current Progress Report

**Project:** ARCH (The Financial Atelier) — Financial Request Management System  
**Tech Stack:** Next.js 16.2.1, React 19, TypeScript 5, Supabase (PostgreSQL), Tailwind CSS 4, jose (JWT)  
**Document Date:** 2026-04-17  
**Status:** Core CRUD & Workflow MVP Complete — AI/Advanced Features Pending

---

## Executive Summary

ARCH V2 is a comprehensive financial request management platform designed to handle the full lifecycle of expense requests — from creation through approval, liquidation, and validation. The system is intended to support 12+ specialized request types, AI-powered automation, and complex business workflows.

**Current Implementation State:** 40-50% Complete

✅ **Fully Functional:** Authentication, basic request workflow, multi-approver breakdowns, liquidation with file upload, role-based UI  
⚠️ **Partially Built:** Chat UI (static only), OCR UI (mock only)  
❌ **Not Yet Implemented:** AI services, specialized request types, ERP integration, advanced business rules, custodian workflows, Lark bot messaging

---
  
## 1. What's Been Built (Functional Features)

### 1.1 Authentication & Authorization

**Implemented:**
- JWT session management (7-day expiry, httpOnly cookies)
- Lark (Feishu) OAuth 2.0 integration:
  - OAuth initiation & callback flow
  - Automatic user creation/linking via Lark open_id/union_id/email
  - Pending registration workflow
- Role-based permissions via `user_permissions` table:
  - `requestor`, `approver`, `accounting`, `admin` roles
  - Multi-role support per user
  - Branch-scoped permissions (`legal`, `repo`, `petty`, `advances`)
- RBAC-protected routes and UI visibility
- Session verification (`/api/auth/me`)

**Location:** `frontend/app/api/auth/*`, `frontend/lib/auth.ts`, `frontend/backend/lib/auth.ts`

---

### 1.2 Request Management (Core Workflow)

**CRUD Operations:**
- Create request (`POST /api/requests`)
- List all requests (`GET /api/requests`)
- Update request status (`PATCH /api/requests/[id]/status`)
- Get request documents (`GET /api/requests/[id]/documents`)
- Post message to request trail (`POST /api/requests/[id]/messages`)

**Request Data Model:**
```sql
other_requests:
- request_id (PK, prefixed: "A{X}-{counter}")
- requestor_id (FK → user_accounts)
- request_title, amount, request_type, company, branch, campaign
- date_needed, remarks, payment_first (boolean)
- status (11 states: open → for_approval → approved → for_crediting → credited → for_liquidation → liquidated → validated → closed)
- document_status (Pending/Received/Incomplete/On Hold)
- message_trail (jsonb array)
- history (jsonb array of actions)
- created_at, updated_at
```

**Status Flow Supported:** Open → For Approval → Approved → For Liquidation → Liquidated → Validated → Closed  
(Additional intermediate states exist but not all transitions enforced yet)

**Location:** `frontend/app/api/requests/route.ts`, `frontend/app/others/advances-requests/`

---

### 1.3 Breakdown Items & Approval

**Features:**
- Create breakdown line items linked to a request (`POST /api/breakdowns`)
- Multi-approver support per breakdown (breakdown_approvers table)
- Approve/Reject actions (`PATCH /api/breakdowns/[id]/approve`, `/reject`)
- Auto-status transition logic:
  - All breakdowns approved → request status → APPROVED
  - Any breakdown rejected → request status → REJECTED
- Toggle "recorded" flag for accounting (`PATCH /api/breakdowns/[id]/recorded`)

**Breakdown Model:**
```sql
breakdowns:
- breakdown_id (PK)
- request_id (FK)
- requestor_id (creator)
- particulars, amount, purpose, store
- status (Pending/Approved/Rejected/Recorded)
- recorded (boolean)
- submitted_at, created_at
```

**Location:** `frontend/app/api/breakdowns/`, `frontend/components/BreakdownsList.tsx`

---

### 1.4 Liquidations & Document Upload

**File Upload Pipeline (`POST /api/liquidations/create`):**
- Multi-file upload (PDF, images PNG/JPG/WebP/Word)
- On-the-fly conversion:
  - Images → PDF using Sharp + pdf-lib
  - Word (.doc/.docx) → PDF using mammoth
  - PDFs merged into single document using pdf-lib
- Upload to Supabase Storage bucket `liquidations`
- Return public URL stored in `others_liquidations.attachment_url`

**Liquidation Model:**
```sql
others_liquidations:
- liquidation_id (PK)
- request_id (FK)
- submitted_by (user_id)
- particulars, amount, vendor, or_number, or_date, remarks
- attachment_url (Supabase storage URL)
- created_at
```

**Location:** `frontend/app/api/liquidations/create/route.ts`, `frontend/components/FileUpload.tsx`, `frontend/components/LiquidationsList.tsx`

---

### 1.5 User & Permission Management

**Admin Utilities:**
- `GET /api/utilities/accounts` — list all users with permissions
- `GET /api/utilities/accounts/[userId]` — view user's permission details
- `GET /api/utilities/assignment` — batch role/permission assignment interface
- `GET/POST /api/users` — user listing and basic CRUD

**Permission Model:**
```sql
user_permissions:
- id (bigserial)
- user_id (FK → user_accounts)
- request_branch (e.g., 'advances', 'legal', 'repo', 'petty')
- request_role (e.g., 'requestor', 'approver', 'accounting')
```

**Location:** `frontend/app/utilities/accounts/page.tsx`, `frontend/app/utilities/assignment/page.tsx`

---

### 1.6 UI/UX Implementation

**Design System:** "The Financial Atelier" — Quiet luxury aesthetic with glassmorphism, tonal layering, and asymmetrical layouts

**Key Pages:**
- **Login/Register** (`/login`, `/register`) — Email/password + Lark OAuth button
- **Home Dashboard** (`/home`) — Role-based statistics, AI mockups, recent activity
- **Advances Requests** (`/others/advances-requests`) — Request list with filters, summary stats
- **Request Detail** (`/others/advances-requests/[id]`) — Full breakdown/liquidation/message/history/docs tabs
- **Chat** (`/chat`) — AI chat interface (mock responses)
- **Utilities** (Ledger, Accounts, Assignment) — Admin tools
- **Settings** (`/settings`) — User profile & theme

**Components (ShadCN/Tailwind + Framer Motion):**
- AppShell, Navigation, Sidebar
- RequestRow, BreakdownsList, LiquidationsList
- NewRequestModal, NewBreakdownModal, NewLiquidationModal
- MessageTrail, HistoryLog, DocumentsTab
- StatusPanel (role-aware transitions)
- RoleSimulatorButton (dev tool)
- NotificationStack (toasts)

**Location:** `frontend/app/`, `frontend/components/`

---

### 1.7 Database & Infrastructure

**Supabase Setup:**
- PostgreSQL hosted on Supabase
- Row-Level Security (RLS) policies on all tables
- Storage bucket `liquidations` for file attachments
- Migrations tracked in `frontend/supabase/migrations/`

**Tables Created:**
- `user_accounts` (auth + profiles)
- `user_permissions` (RBAC)
- `other_requests` (core requests)
- `breakdowns` (line items)
- `breakdown_approvers` (approval routing)
- `others_liquidations` (expense reconciliation)
- `request_documents` (supporting docs)
- `branches` (organizational units)
- `campaigns` (categorization)

**Security:**
- RLS policies restrict SELECT/INSERT/UPDATE/DELETE to owners/requestors
- JWT auth.uid() checks in policies
- Service role key used for admin operations

**Location:** `frontend/supabase/migrations/`

---

### 1.8 Middleware & Security

**Next.js Middleware (`middleware.ts`):**
- JWT token validation via `jose`
- Public path whitelist (`/login`, `/api/auth/*`, `/auth/callback`)
- Protected route redirection to `/login`
- Prevent logged-in users from accessing login page
- Static asset caching headers (1 year immutable for `_next/static/`)

**Location:** `middleware.ts` (root)

---

## 2. What's Planned But NOT Implemented

### 2.1 Specialized Request Types

**Documented in TECHNICAL_WORKFLOW.md but not yet in code:**

| Request Type | Status | Special Fields |
|---|---|---|
| Advanced Request | Basic only | Additionals handling |
| For Reimbursement | Not differentiated | Receipt-first workflow |
| Direct Expense (SPMA/SPMC/SPM Dubai) | Not differentiated | Payment-first for urgent/JRS |
| Credit Card | Not differentiated | Check-based crediting |
| Repairs & Maintenance (R&M) | Not implemented | 50% payment-first option |
| Advanced Legal Request | Not implemented | bank_code, approver assignment |
| Advanced Credit Request | Not implemented | Similar to Legal |
| JEPS UBP | Not implemented | No crediting monitoring |
| Legal Petty Request | Not implemented | custodian_id, batch filing |
| Advanced Repo Request | Not implemented | caravan_location, ch_code, fieldman, deposit_to, area |
| Repo Petty Request | Not implemented | Custodian batching |
| General Petty Request | Not implemented | Batch filing workflow |

**Missing:** Request classification field, type-specific form fields, conditional logic

---

### 2.2 AI & Automation (Only UI Mockups Exist)

**OCR & Document Processing:**
- ❌ No actual OCR service integration (Tesseract, Google Vision, etc.)
- ❌ No data extraction from invoices/POs
- ❌ No auto-fill of form fields from documents
- ❌ Receipt scanning not functional

**AI Recommendation Engine:**
- ❌ No ML model for approval recommendations
- ❌ No business rule engine for auto-approval
- ❌ No validation logic for discrepancy detection

**Chatbot:**
- ❌ No LLM integration (OpenAI, Anthropic, etc.)
- ❌ No conversational request creation/liquidation flow

**Automated Validation:**
- ❌ No overnight batch jobs
- ❌ No AI cross-checking liquidation amounts vs. approved
- ❌ No plain-language discrepancy explanations

**Location of mockups:** `frontend/app/home/page.tsx` (hardcoded MOCK_AI_REQUESTS)

---

### 2.3 Advanced Business Rules

**Request Creation Constraints:**
- ❌ Not enforced: "User cannot create new request if 4+ requests in FOR LIQUIDATION status"
- ❌ No accountant override mechanism

**Petty Batch Processing:**
- ❌ No custodian batching workflow
- ❌ No auto-file triggers (Mon/Thu 3PM)
- ❌ No 3-batch pending limit enforcement
- ❌ No batch document status tracking

**Approval Workflows:**
- ❌ No cascade rejection logic documented in code
- ❌ Retry/resubmit flow not implemented

**Crediting & Payment:**
- ❌ No ERP (FACT) integration
- ❌ No bank API for automatic disbursement
- ❌ No check printing/processing
- ❌ No proof-of-transfer upload workflow beyond liquidation attachment

**Physical Document Tracking:**
- ❌ No "Document Status: RECEIVED" workflow beyond liquidation upload
- ❌ No hard-copy receipt confirmation

---

### 2.4 Lark Integration (Partial)

**Implemented:**
- OAuth login flow
- User profile retrieval

**Missing:**
- ❌ Lark bot messaging (no message posting to Lark chats)
- ❌ In-chat approval notifications
- ❌ Lark bot linking to request details
- ❌ Lark message trail sync

---

### 2.5 Advanced Request Features

**Document Management:**
- ❌ No AI auto-labeling of supporting documents
- ❌ No e-receipt flagging (to distinguish digital vs physical receipts)
- ❌ No voucher acceptance logic
- ❌ No batch PDF export with filtering

**Additionals & Excess Handling:**
- ❌ No "Additionals" breakdown creation after initial credit
- ❌ No "Excess" liquidation marking (explicit flagging)
- ❌ No automatic excess suggestion by AI

**Audit & Compliance:**
- ❌ No comprehensive activity logging beyond simple history array
- ❌ No change attribution with user context
- ❌ No compliant data retention policies

---

### 2.6 Performance & DevOps

- ❌ No batch processing jobs (nightly validation, morning dashboard)
- ❌ No notification batching
- ❌ No cache layer beyond Next.js defaults
- ❌ No scheduled/cron jobs
- ❌ No monitoring or error tracking (Sentry, etc.)
- ❌ No performance optimizations for large datasets

---

## 3. Technical Architecture

### 3.1 Project Structure

```
ARCH_V2/
├── frontend/                    # Next.js app (App Router)
│   ├── app/
│   │   ├── api/                # API route handlers (route.ts)
│   │   │   ├── auth/           # 10+ auth endpoints
│   │   │   ├── requests/       # Request CRUD + status + messages + documents
│   │   │   ├── breakdowns/     # Breakdown CRUD + approve/reject/record
│   │   │   ├── liquidations/   # Liquidation create + file upload
│   │   │   ├── users/          # User management
│   │   │   └── utilities/      # Admin tools (branches, campaigns, ledger, accounts, assignment)
│   │   ├── home/               # Dashboard (role-based)
│   │   ├── login/              # Login page
│   │   ├── register/           # Registration
│   │   ├── auth/callback/      # Generic OAuth callback
│   │   ├── auth/lark/callback/ # Lark specific callback
│   │   ├── others/advances-requests/    # Request list & detail
│   │   ├── chat/               # AI chat (static)
│   │   ├── settings/           # User settings
│   │   ├── utilities/          # Admin utilities
│   │   ├── globals.css         # Tailwind + custom design tokens
│   │   └── layout.tsx          # Root layout + providers
│   ├── components/             # Reusable UI (~30 components)
│   │   ├── layout/             # AppShell, Navigation
│   │   ├── Request*.tsx        # Request-related components
│   │   ├── Breakdown*.tsx      # Breakdown components
│   │   ├── Liquidation*.tsx    # Liquidation components
│   │   └── Message*, History*, Documents*
│   ├── lib/                    # Client-side utilities
│   │   ├── auth.ts             # Client auth helpers
│   │   └── supabase.ts         # Browser Supabase client
│   ├── backend/lib/            # Server-only utilities
│   │   ├── auth.ts             # JWT signing/verification, cookie helpers
│   │   └── supabase/           # Server-side Supabase client
│   ├── config/                 # App-wide constants
│   │   ├── navigation.tsx      # Nav tree + RBAC permissions map
│   │   ├── status.ts           # Status configs + transitions
│   │   └── requestStatusVisuals.ts
│   ├── types/                  # TypeScript definitions
│   │   └── index.ts            # Core domain types (note: mismatched with actual usage)
│   ├── supabase/migrations/    # SQL schema migrations
│   └── public/                 # Static assets
│
├── .kilo/                      # Kilo CLI config (MCP, agents)
│   ├── kilo.json               # MCP server config (Supabase local)
│   └── package.json            # Kilo plugin dependencies
│
├── .github/agents/             # Agent instruction files
│   ├── Orchestrator.agent.md
│   ├── Backend.agent.md
│   ├── Frontend.agent.md
│   ├── Documentator.agent.md
│   └── Tasink.agent.md
│
├── .kiro/steering/             # Project steering docs
│   ├── structure.md            # Directory layout & conventions
│   ├── tech.md                 # Tech stack & env vars
│   └── product.md              # Product overview & roles
│
├── plans/                      # Architecture & planning
│   ├── plan.md                 # Backend architecture, API spec, DB schema
│   ├── design.md               # Design system (The Financial Atelier)
│   └── read.md                 # DB schema reference
│
├── middleware.ts               # Next.js middleware (JWT validation, route guarding)
├── TECHNICAL_WORKFLOW.md       # Comprehensive workflow documentation (11 request types, 6 phases)
├── test-users-endpoint.js      # Utility script for user testing
└── users.json                  # Sample user data
```

**Conventions:**
- API routes: `app/api/[module]/route.ts` with named exports (GET, POST, PATCH, DELETE)
- Server-only code in `backend/lib/` (import as `@backend/lib/...`)
- Client components require `'use client'` directive
- Path aliases: `@/` → frontend root, `@backend/` → frontend/backend/
- Supabase: `createServerClient` (API routes), `createBrowserClient` (client components)
- Styling: Tailwind CSS 4 with design tokens in `globals.css`

---

### 3.2 Key Technologies

| Layer | Technology | Purpose |
|---|---|---|
| **Framework** | Next.js 16.2.1 (App Router) | SSR, API routes, routing |
| **Runtime** | React 19 (with React Compiler) | UI library |
| **Language** | TypeScript 5 (strict) | Type safety |
| **Database** | Supabase PostgreSQL | Data persistence |
| **Auth** | jose (HS256 JWT) + Lark OAuth | Session management |
| **Storage** | Supabase Storage (S3-compatible) | File uploads |
| **Styling** | Tailwind CSS 4 + globals.css tokens | Utility-first CSS |
| **Animations** | Framer Motion | UI transitions |
| **Icons** | lucide-react | Icon set |
| **File Processing** | sharp, pdf-lib, mammoth | PDF conversion & merging |
| **Linting** | ESLint + Next.js config | Code quality |
| **Testing** | Vitest + fast-check | Unit/e2e tests (config only) |

---

### 3.3 Authentication Flow

```
┌─────────┐    ┌──────────┐    ┌───────┐    ┌─────────┐
│  User   │───▶│ Frontend │───▶│ API   │───▶│Supabase │
└─────────┘    └──────────┘    └───────┘    └─────────┘
      │               │              │             │
      │  Enter creds  │ POST login   │             │
      │──────────────▶│─────────────▶│ query user  │
      │               │              │────────────▶│
      │               │              │◀────────────│ user record
      │               │              │             │
      │               │              │ verify SHA-256 hash
      │               │              │ check lockout
      │               │              │             │
      │               │              │ generate JWT │
      │               │              │ set cookie   │
      │               │◀─────────────│              │
      │  Redirect to  │              │             │
      │  /home        │              │             │
```

**Session:** JWT stored in httpOnly cookie, 7-day expiry. Middleware validates on every request.

---

### 3.4 Request Workflow (Current Implementation)

```
┌─────────┐
│Requestor│
└────┬────┘
     │ 1. Create request (POST /api/requests)
     │    status: OPEN
     ├─────────────────┐
     │                 │
     │ 2. Add breakdowns (POST /api/breakdowns)
     │    (line items with approvers)
     │                 │
     │                 ▼
     │         ┌─────────────┐
     │         │  Approver(s) │
     │         └──────┬──────┘
     │                │ 3. Approve/Reject (PATCH /api/breakdowns/[id]/{approve,reject})
     │                │    If all approved → status: APPROVED
     │                │    If any rejected → status: REJECTED
     │                ▼
     │         ┌─────────────┐
     │         │  Accounting │
     │         └──────┬──────┘
     │                │ 4. Toggle recorded (PATCH /api/breakdowns/[id]/recorded)
     │                │    (manual ERP entry, not automated)
     │                │
     │                │ 5. Create liquidation (POST /api/liquidations/create)
     │                │    Upload receipt → convert to PDF → store
     │                │    status: LIQUIDATED
     │                ▼
     │         ┌─────────────┐
     │         │  Accounting │
     │         └──────┬──────┘
     │                │ 6. Manual validation (UI only, no automated checks)
     │                │    status: VALIDATED
     │                │
     │                │ 7. Final close (manual or auto after validation)
     │                │    status: CLOSED
     │                ▼
```

**Note:** Crediting phase exists in status flow but not implemented as separate UI action. Currently goes Approved → For Liquidation directly.

---

## 4. Database Schema Summary

### Tables & Relationships

```
user_accounts (1) ─┬─→ (N) other_requests
                    ├─→ (N) breakdowns (as requestor_id)
                    ├─→ (N) others_liquidations (as submitted_by)
                    └─→ (N) request_documents (as uploaded_by_id)

other_requests (1) ─┬─→ (N) breakdowns
                    ├─→ (N) others_liquidations
                    └─→ (N) request_documents

breakdowns (N) ────→ (M) breakdown_approvers (through table)
                  └─→ (1) other_requests
```

### Key Columns & Types

**user_accounts:**
- `user_id` (text, PK)
- `email` (text, unique)
- `password_hash` (text, SHA-256)
- `role` (text: admin/manager/employee/viewer) — **deprecated?** replaced by `user_permissions`
- `branch`, `campaign` (text)
- `lark_user_id`, `lark_bot_linked` (boolean)
- `failed_login_attempts`, `account_locked`
- `status` (Active/Pending/Disabled)

**user_permissions:**
- `id` (bigserial)
- `user_id` (FK)
- `request_branch` — e.g., 'advances', 'legal', 'repo', 'petty'
- `request_role` — e.g., 'requestor', 'approver', 'accounting'

**other_requests:**
- `request_id` (text, PK, format: `A{X}-{number}` where X is branch_doc_class)
- `requestor_id` (FK)
- `request_title`, `amount`, `request_type`, `company`, `branch`, `campaign`
- `status` (text, 11 possible values)
- `date_needed`, `remarks`, `payment_first` (boolean)
- `message_trail`, `history` (jsonb arrays)
- `document_status` (Pending/Received/Incomplete/On Hold)

**breakdowns:**
- `breakdown_id` (text, PK, format: `BD-{timestamp}-{random}`)
- `request_id` (FK)
- `requestor_id` (creator FK)
- `particulars`, `amount`, `purpose`, `store`
- `status` (Pending/Approved/Rejected/Recorded)
- `recorded` (boolean, default false)

**breakdown_approvers:**
- Composite PK: (breakdown_id, requestor_id) — note: requestor_id is actually approver_id
- `status` (Pending/Approved/Rejected with timestamp)
- `approved_at` (timestamp)

**others_liquidations:**
- `liquidation_id` (text, PK, format: `LIQ-{timestamp}-{random}`)
- `request_id` (FK)
- `submitted_by` (user_id)
- `particulars`, `amount`, `vendor`, `or_number`, `or_date`, `remarks`
- `attachment_url` (pointing to Supabase storage)

**request_documents:**
- `document_id` (text, PK)
- `request_id` (FK)
- `name`, `filename`, `mime_type`, `file_size`
- `storage_path`, `file_url`
- `uploaded_by`, `uploaded_by_id` (FK to user_accounts)

**Reference Tables:**
- `branches` — id, branch, status, branch_doc_class (used for request_id prefix)
- `campaigns` — id, campaign_name, status

### RLS Policies

All tables have RLS enabled. General pattern:
```sql
SELECT: auth.uid() IS NOT NULL AND (
    uploaded_by_id = auth.uid()
    OR request_id IN (SELECT request_id FROM other_requests WHERE requestor_id = auth.uid())
)
INSERT: auth.uid() IS NOT NULL AND uploaded_by_id = auth.uid()
UPDATE/DELETE: same as INSERT (owner only)
```

---

## 5. API Contract Overview

### Authentication Endpoints

| Endpoint | Method | Purpose | Auth |
|---|---|---|---|
| `/api/auth/login` | POST | Email/password login | No |
| `/api/auth/register` | POST | Create new account | No |
| `/api/auth/me` | GET | Get current user profile | Yes (cookie) |
| `/api/auth/me` | PATCH | Update profile | Yes |
| `/api/auth/logout` | POST | Destroy session | Yes |
| `/api/auth/lark` | GET | Start Lark OAuth | No |
| `/api/auth/lark/callback` | GET | OAuth callback handler | No |
| `/api/auth/lark/register` | GET | Lark user registration form | No |
| `/api/auth/lark/process` | POST | Process Lark user | No |
| `/api/auth/lark/pending` | GET | Show pending Lark users | Yes (admin) |

### Request Endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/requests` | GET | List all requests |
| `/api/requests` | POST | Create new request |
| `/api/requests/[id]/status` | PATCH | Change request status (role-checked) |
| `/api/requests/[id]/documents` | GET | List request documents |
| `/api/requests/[id]/messages` | POST | Add message to trail |

### Breakdown Endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/breakdowns` | POST | Create breakdown for request |
| `/api/breakdowns/[id]` | GET | Get breakdown details |
| `/api/breakdowns/[id]/approve` | PATCH | Approve breakdown (auto-advances request if all approved) |
| `/api/breakdowns/[id]/reject` | PATCH | Reject breakdown (auto-rejects request if any rejected) |
| `/api/breakdowns/[id]/recorded` | PATCH | Toggle recorded flag (accounting) |

### Liquidation Endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/liquidations/create` | POST | Create liquidation + upload files (PDF/Image/Word → merge → upload) |
| `/api/liquidations/upload` | GET/POST | Legacy upload endpoint |

### Utility Endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/branches` | GET | List active branches |
| `/api/campaigns` | GET | List active campaigns |
| `/api/utilities/assignment` | GET | Admin assignment interface |
| `/api/utilities/accounts` | GET | List all users with permissions |
| `/api/utilities/accounts/[userId]` | GET | Specific user permission details |
| `/api/utilities/ledger` | GET | Get ledger data (particulars) |
| `/api/users` | GET | List all users |

---

## 6. Frontend Type System Status

**Issue:** Type definitions in `frontend/types/index.ts` are generic and do not match the actual database schema or API usage. Real code uses inline types that match tables.

**Mismatches:**
- `Request` type defines `type: RequestType` with values like 'advance_request', 'reimbursement', etc.
  - Actual API uses `request_type` with values like 'Advanced Request', 'For Reimbursement', etc.
- `Request` has `status: RequestStatus` with 'draft/pending/approved/rejected/completed/cancelled'
  - Actual DB uses 11 distinct statuses: 'open', 'for_approval', 'approved', 'rejected', 'cancelled', 'for_crediting', 'credited', 'for_liquidation', 'liquidated', 'validated', 'closed'
- Breakdown type lacks fields like `requestor_id`, `submitted_at`, `created_at`
- No types for `message_trail` (array of messages), `history` (array of history entries), `request_documents`
- Liquidation type missing `or_number`, `or_date`, `vendor`, `store`

**Recommendation:** Replace generic types with SQL-derived interfaces matching actual schema, or generate types from Supabase.

---

## 7. Environment Variables Reference

```bash
# Database
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET=...

# JWT
JWT_SECRET=...   # Used for signing/verifying session tokens

# Lark OAuth
LARK_APP_ID=cli_a92b905168381ed0
LARK_APP_SECRET=...
LARK_REDIRECT_URI=http://localhost:3000/api/auth/lark/callback
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

**File:** `.env.local` in frontend directory

---

## 8. Known Gaps & Technical Debt

### High Priority
1. **Type Safety:** Align TypeScript types with actual database schema
2. **Request Type Diversification:** Implement specialized types (Legal, Repo, Petty, R&M, etc.) with type-specific fields
3. **Status Transition Enforcement:** Ensure only valid state transitions allowed (business rules)
4. **AI/OCR Integration:** Replace mock data with real services
5. **Lark Bot Messaging:** Send notifications to users via Lark chat

### Medium Priority
6. **Crediting Workflow:** Implement explicit crediting phase before liquidation
7. **Document Auto-Labeling:** Auto-categorize uploaded documents
8. **Physical Receipt Tracking:** Mark received/hard copy status
9. **Request Constraint:** Enforce 4+ liquidation limit
10. **Audit Logging:** Comprehensive action log beyond simple history array

### Low Priority
11. **Batch Processing:** Scheduled jobs for validation, filing
12. **Voice Interface:** As described in workflow (future)
13. **Bank API Integration:** Direct disbursement (future)
14. **Performance Tuning:** Caching, query optimization, pagination
15. **Test Coverage:** Vitest config exists but tests minimal

---

## 9. Files of Interest (Quick Reference)

| File | Purpose | Lines |
|---|---|---|
| `TECHNICAL_WORKFLOW.md` | Complete business workflow spec (11 types, 6 phases) | 575 |
| `plans/plan.md` | Backend architecture & API spec | 567 |
| `plans/design.md` | "The Financial Atelier" design system | 85 |
| `frontend/app/api/requests/route.ts` | Request CRUD with ID generation | 107 |
| `frontend/app/api/breakdowns/[id]/approve/route.ts` | Approval logic | ~100 |
| `frontend/app/api/liquidations/create/route.ts` | File conversion & upload pipeline | 327 |
| `frontend/app/others/advances-requests/[id]/page.tsx` | Request detail view (main UI) | ~300 |
| `frontend/app/home/page.tsx` | Dashboard with AI mockups | ~1600 |
| `frontend/components/StatusPanel.tsx` | Role-aware status transition UI | ~200 |
| `frontend/types/index.ts` | Generic TypeScript types (needs replacement) | 268 |
| `frontend/config/status.ts` | Status config & transition rules | 315 |
| `middleware.ts` | JWT validation & route protection | 71 |

---

## 10. Next Steps Recommendation

Based on the gap analysis:

**Phase 1 — Type Safety & Foundation (1-2 weeks):**
- Replace `frontend/types/index.ts` with accurately-typed interfaces mirroring the actual DB schema
- Generate TypeScript types from Supabase schema using `supabase gen types`
- Fix all type mismatches across components

**Phase 2 — Workflow Expansion (3-4 weeks):**
- Add type-specific fields to `other_requests` (classification, bank_code, caravan_location, etc.)
- Update request creation form to support all 11 request types with conditional fields
- Implement proper status transition enforcement (prevent invalid transitions)
- Add crediting phase between approved and liquidation (explicit accounting action)

**Phase 3 — AI/Automation Integration (4-6 weeks):**
- Connect OCR service (Google Vision, Tesseract, or Azure Form Recognizer)
- Implement AI recommendation engine (via LLM API or rules engine)
- Add automated validation of liquidations vs. breakdown amounts
- Replace mock data with real predictions

**Phase 4 — Lark Bot & Notifications (2 weeks):**
- Use Lark SDK to post messages to users
- Implement approval notifications in Lark chat
- Add message trail → Lark sync

**Phase 5 — Custodian & Petty Workflows (2 weeks):**
- Build custodian batching UI
- Implement auto-file scheduling logic
- Add batch document status tracking
- Enforce 3-batch pending limit

**Phase 6 — Advanced Features (ongoing):**
- ERP integration (FACT)
- Bank API for disbursements
- Voice query interface
- Physical document receipt tracking
- Performance optimizations
- Comprehensive test suite

---

## Conclusion

ARCH V2 has a **solid foundation** with a working authentication system, basic request/breakdown/liquidation CRUD, and a comprehensive UI. The core platform is operational for simple advance requests. However, **the majority of planned advanced features remain unimplemented**, particularly the AI/automation components, specialized request types, and external integrations.

The codebase follows modern Next.js/React patterns with TypeScript, uses Supabase effectively with RLS, and adheres to a clear design system. Major effort required in:
1. Type system alignment
2. Business logic expansion for all 12 request types
3. Actual AI/OCR service implementation
4. Lark bot messaging
5. Advanced approval & liquidation workflows

**Current readiness:** Can handle basic request management now; advanced workflows require significant additional development.
