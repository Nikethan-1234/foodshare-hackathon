# FoodShare — Food Donation Platform (PWA)

A responsive Progressive Web Application (PWA) built for surplus food rescue, connecting commercial food donors (restaurants, bakeries, caterers, hotels) with recipient organizations (soup kitchens, shelters, food banks).

> [!WARNING]
> **Food Safety & Platform Disclaimer**  
> **Demonstration Environment Only.** This software is an architectural prototype and demonstration platform. It is **NOT** a food safety verification system, health department inspection service, or certified cold-chain monitoring system. All accounts and listings are fictitious. In real-world deployment, food donors and recipient organizations remain solely responsible for local food code compliance, allergens, and safe temperature handling.

---

## 1. System Architecture

### High-Level Component Diagram

```mermaid
flowchart TD
    subgraph Client["Frontend Client (PWA)"]
        UI["React 19 SPA + React Router v7"]
        PWA["Service Worker (sw.js) + Web Manifest"]
        Tailwind["Tailwind Design System (Inter + Deep Green)"]
        Axios["Axios API Client (JWT Interceptor)"]
    end

    subgraph Server["Flask REST API Backend"]
        Auth["JWT Auth Guard + RBAC Decorator"]
        ListingCtrl["Listing Controller (/api/listings)"]
        RequestCtrl["Request Controller (/api/requests)"]
        AdminCtrl["Admin & Moderation (/api/admin)"]
        ExpiryJob["Expiry Service (check_and_expire_listings)"]
        AISvc["AI Service (Vision, Allergen NLP, Matchmaking, ESG)"]
    end

    subgraph DataStore["Persistence & Storage"]
        SQLite[(SQLite DB: food_donation.db)]
        StatusAudit[(Status History Audit Trail)]
    end

    UI --> Axios
    PWA -. Offline Cache .-> UI
    Axios -- "HTTP /api (Bearer JWT)" --> Auth
    Auth --> ListingCtrl
    Auth --> RequestCtrl
    Auth --> AdminCtrl
    Auth --> AISvc
    ListingCtrl --> AISvc
    ExpiryJob --> ListingCtrl
    ListingCtrl --> SQLite
    RequestCtrl --> SQLite
    AdminCtrl --> SQLite
    RequestCtrl -. Transactional Log .-> StatusAudit
    ListingCtrl -. Transactional Log .-> StatusAudit
```

---

### Entity Lifecycles & State Transitions

#### Listing Lifecycle
```mermaid
stateDiagram-v2
    [*] --> AVAILABLE: Donor creates listing
    AVAILABLE --> RESERVED: All portions claimed (quantity_left = 0)
    RESERVED --> AVAILABLE: Accepted request cancelled (quantity returned)
    AVAILABLE --> EXPIRED: pickup_end passes (Auto-expiry job)
    RESERVED --> EXPIRED: pickup_end passes (Auto-expiry job)
    RESERVED --> COMPLETED: All portions picked up & verified
    AVAILABLE --> REMOVED: Donor cancels / Admin takedown
    RESERVED --> REMOVED: Admin takedown
    EXPIRED --> [*]
    COMPLETED --> [*]
    REMOVED --> [*]
```

#### Request Lifecycle
```mermaid
stateDiagram-v2
    [*] --> PENDING: Recipient requests portions
    PENDING --> ACCEPTED: Donor accepts (re-checks quantity_left atomically)
    PENDING --> REJECTED: Donor rejects with reason
    PENDING --> CANCELLED: Recipient cancels OR listing expires
    ACCEPTED --> COMPLETED: Donor or recipient confirms pickup
    ACCEPTED --> CANCELLED: Recipient cancels (quantity returned to listing)
    REJECTED --> [*]
    CANCELLED --> [*]
    COMPLETED --> [*]
```

---

## 2. Core Business Rules Implemented

1. **Transactional Quantity Locking & Concurrency Protection:**
   - Accepting a request locks the listing row (`with_for_update()`) and atomically verifies that `quantity_left >= request.quantity`.
   - If two charities submit requests for overlapping surplus portions, the first acceptance locks the inventory. The second acceptance attempt is rejected with **HTTP 409 Conflict** (`"Double booking prevented"`).
2. **Cancellation Restores Inventory:**
   - When a charity cancels an `ACCEPTED` pickup, its requested quantity is returned to `listing.quantity_left`.
   - If the listing was previously locked as `RESERVED`, it automatically transitions back to `AVAILABLE`.
3. **Automated Expiry & Request Cascade:**
   - Listings past `pickup_end` are automatically transitioned to `EXPIRED` by the expiry background service.
   - Any remaining `PENDING` requests for expired listings are automatically marked `CANCELLED`.
4. **Complete Audit Trail:**
   - Every state transition across listings and requests is permanently logged in `status_history` with actor ID, timestamp, prior state, new state, and narrative reason.
5. **Role-Based Route Protection (RBAC):**
   - Every route in the Flask API is strictly protected by `@role_required("donor")`, `@role_required("recipient")`, or `@role_required("admin")`.

---

## 3. Hackathon AI Innovations

1. **AI Food Vision & Smart Listing Drafter ("Snap & List"):**
   - Donors can upload a food photo or select instant kitchen presets (*"Warm Buffet Trays"*, *"Artisan Bakery"*, *"Catering Boxed Meals"*).
   - Automatically populates title, portions, units, safe storage advice, and regulatory pickup windows.
2. **Automated Allergen & Dietary Risk Screening ("AI SafeGuard"):**
   - Detects the 9 major allergens (Gluten, Dairy, Eggs, Nuts, Soy, Fish, Shellfish, Sesame) and dietary attributes (Vegan, Vegetarian, Halal).
   - Renders color-coded safety warnings on recipient browse cards and detail modals.
3. **Intelligent Charity Matchmaking & Priority Dispatch:**
   - Multi-factor algorithmic scoring matches listings to nearby charities based on capacity fit, transit distance, vehicle equipment (refrigerated van), and past pickup reliability.
   - Donors can inspect top matches with percentage fit and 1-click dispatch alerts.
4. **Green Impact Hub — EPA WARM ESG Carbon Ledger:**
   - Converts rescued food portions into verified environmental metrics: $CO_2e$ greenhouse gas emissions prevented, agricultural water conserved, and passenger car travel eliminated.
   - Includes printable CSR compliance certificates for corporate food donors.

---

## 4. Demo Credentials & Donor Types

All demo accounts share the password: `demo1234`

| Role | Donor Type | Account Email | Name / Organization | Focus / Notes |
|---|---|---|---|---|
| **Admin** | N/A | `admin@demo.local` | Platform Administration | Moderation, approve/reject individual listings, reports |
| **Donor** | `RESTAURANT` | `donor@demo.local` | Green Leaf Restaurant | Commercial restaurant surplus |
| **Donor** | `RESTAURANT` | `donor2@demo.local` | City Catering Co. | Corporate event surpluses |
| **Donor** | `RESTAURANT` | `donor3@demo.local` | Sunrise Bakery | End-of-day bread and pastry surplus |
| **Donor** | `INSTITUTION` | `inst1@demo.local` | St. Andrew's Church | Sunday community meal surplus |
| **Donor** | `INSTITUTION` | `inst2@demo.local` | Springfield College Canteen | Campus cafeteria lunch surplus |
| **Donor** | `INDIVIDUAL` | `indiv1@demo.local` | Ravi Patel | Home function leftovers (phone unverified for demo OTP testing) |
| **Donor** | `INDIVIDUAL` | `indiv2@demo.local` | Meena Krishnamurthy | Wedding function sweets/snacks (phone verified) |
| **Recipient** | N/A | `recipient@demo.local` | Hope Community Kitchen | Soup kitchen & hot meals |
| **Recipient** | N/A | `recipient2@demo.local` | Springfield Food Bank | High-capacity regional distribution |
| **Recipient** | N/A | `recipient3@demo.local` | Shelter First Network | Emergency housing shelter network |

---

## 5. Trust & Safety Rules for Individuals (Phase 2)

To ensure community safety while enabling households and function hosts to donate surplus food, the platform enforces:

1. **Simulated Phone OTP Verification:**
   - Individuals must verify their phone number via a demo OTP (`123456`) before posting listings.
   - Verified donor phones are kept private and shared only after a charity pickup request is accepted.
2. **Minimum Quantity Enforcement:**
   - Individual listings must offer at least **10 servings** (`INDIVIDUAL_MIN_QUANTITY = 10`) to guarantee bulk redistribution viability.
3. **4-Hour Cooked Food Freshness Window:**
   - Cooked food must be listed within **4 hours of preparation** (`MAX_COOKED_HOURS_BEFORE_LISTING = 4`). Older items are blocked with clear validation feedback.
4. **Mandatory 4-Point Food Handling Checklist:**
   - Every listing requires all 4 hygiene criteria to be confirmed:
     - Covered in food-grade containers / foil.
     - Kept at safe holding temperature (&gt;60°C hot or &lt;5°C refrigerated).
     - Not repeatedly reheated or cooled in cycles.
     - Packaged cleanly with clean utensils in a sanitary kitchen.
5. **Donor Trust Levels & Administrator Moderation:**
   - **New Individuals (< 3 completed donations):** Listings are placed in `PENDING_APPROVAL` and withheld from search results until reviewed by an administrator.
   - **Verified Individuals (3+ completed donations):** Listings are auto-approved directly to `AVAILABLE`.
   - Administrators can review, inspect full audit history, and **Approve** or **Reject** pending listings via the admin moderation panel.
6. **Recipient Request Rejections & Listing Reports:**
   - Recipients can cancel or reject their pickup requests with an optional reason.
   - Suspicious or unhygienic listings can be reported directly from the browse/detail view with categorized reasons appearing in `/admin/reports`.

---

## 6. Event Leftover Quick-Post (Phase 3)

For urgent surpluses resulting from functions, weddings, community meals, or sudden cancellations:
- **Prominent Quick-Post Button:** Located on the Donor Dashboard and Listings header with high-contrast amber styling (`Event Leftover`).
- **Streamlined Quick Form:** Asks only for key details: *What food*, *Estimated Servings*, *Cooked Time*, *Pickup Ends At*, and *Pickup Address*. Pre-fills safe defaults (cooked 1h ago, pickup starts in 15m, ends in 3h).
- **Safety & Quality Enforcement:** Enforces the same 4-point handling checklist, $\le 4$h cooked food validation, and individual $\ge 10$ servings rule.
- **Event Leftover Badge:** Tagged with an amber `Event Leftover` badge on recipient browse cards and donor management views.
- **Automatic Expiry:** Listings automatically transition to `EXPIRED` once the pickup window closes.

---

## 7. Recurring Listings for Institutions (Phase 4)

Predictable surplus from weekly operations (e.g. churches, canteens, hostels):
- **Institutional Commitment:** Institutions (`INSTITUTION` & `RESTAURANT`) can configure recurring schedules (*Day of week*, *Usual time*, *Expected servings*, *Pickup address*, *Window duration*).
- **Recipients "Upcoming" Section:** Non-profit charities can view planned upcoming recurring surplus directly on the Browse Food page to plan collection runs.
- **Auto-Generation & On-Demand Dispatch:** Live `AVAILABLE` listings are generated either automatically on schedule (`/api/jobs/generate-recurring`) or on-demand by the donor with full audit logging.
- **Series Control:** Donors can edit expected servings before an occurrence goes live, pause the schedule (e.g. during vacations), or cancel it.
- **Role Isolation:** Individual donors are prevented from creating recurring series (`HTTP 403`).

---

## 8. Listing Details, Photos & Category Tags (Phase 5)

Enriched listing quality and transparency for recipients:
- **Photo Uploads:** Donors can attach real food photos via multipart or base64 (enforces max 5MB size and format validation: JPEG, PNG, WEBP).
- **Dietary & State Categorization:** Listings feature explicit badges for `VEG` / `NON_VEG` and `COOKED` / `PACKAGED`.
- **Allergen Notes:** Free-form allergen note field for detailed ingredient warnings.
- **Browse Filters:** Recipients can filter browse results by dietary tags (All, Veg Only, Non-Veg) and preparation state (All, Cooked, Packaged).
- **Privacy Protection:** Donor phone number is strictly kept private and revealed **only after a request is accepted** (`status = ACCEPTED`).

---

## 9. Setup & Running Locally

### Prerequisites
- **Python 3.10+**
- **Node.js 18+ & npm**

### 1. Backend Setup
```bash
cd backend

# Create and activate virtual environment
# Windows:
python -m venv venv
.\venv\Scripts\activate
# Linux/macOS:
# python3 -m venv venv && source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Seed demonstration data (10 listings across 3 donors, 7 users, sample requests)
python seed.py

# Run development server (runs on http://localhost:5000)
python run.py
```

### 2. Frontend Setup
```bash
cd frontend

# Install npm packages
npm install

# Start Vite dev server (runs on http://localhost:5173 with proxy to port 5000)
npm run dev

# Or build production PWA bundle
npm run build
```

---

## 6. Environment Variables

### Backend (`backend/.env`)
| Variable | Default Value | Description |
|---|---|---|
| `SECRET_KEY` | `dev-secret-key-change-in-production` | Flask session secret |
| `DATABASE_URL` | `sqlite:///food_donation.db` | SQLAlchemy database URI |
| `JWT_SECRET_KEY` | `jwt-secret-key-change-in-production` | Secret used to sign access tokens |
| `CORS_ORIGINS` | `http://localhost:5173` | Allowed frontend origin for CORS |

### Frontend (`frontend/.env`)
| Variable | Default Value | Description |
|---|---|---|
| `VITE_API_URL` | `http://localhost:5000/api` | API backend base URL |

---

## 7. Running the Automated Test Suite

A comprehensive test suite verifies core business logic:
- Double-booking prevention with concurrent competing requests.
- Cancellation restoring inventory and reverting `RESERVED` $\rightarrow$ `AVAILABLE`.
- Donor cancellation auto-cancelling pending requests.
- Auto-expiry service expiring past listings and cancelling pending requests.
- Role-based access control blocking unauthorized actors with HTTP 401 and 403.

```bash
cd backend
python tests/run_all.py
```

---

## 8. Project Limitations & Non-Goals

1. **Food Safety Certification:** The platform does not inspect, test, or certify food safety or microbial quality.
2. **Payment Processing:** No money changes hands; all food is donated at zero cost.
3. **Cold-Chain Hardware:** Real-time IoT temperature sensors are simulated via manual timestamps.
4. **Offline Sync Queue:** PWA caches app shell and static resources; write actions require network connectivity.

---

## 9. Implementation Checklist

- [x] **Phase 1: Foundation & Design System** (DB models, JWT auth, RBAC, seed script, design components, PWA setup)
- [x] **Phase 2: Donor Workflows** (Profile, create/edit/cancel listing, my listings, dashboard)
- [x] **Phase 3: Recipient Workflows** (Browse, search, filter, listing detail, request/cancel)
- [x] **Phase 4: Request Lifecycle & Locking** (Atomic acceptance, quantity locking, cancellation quantity return, auto-expiry)
- [x] **Phase 5: Admin & Moderation** (Moderation table, report handling, listing removal)
- [x] **Phase 6: Verification & Automated Tests** (Concurrency locks, cancellation returns, expiry job, architecture diagrams)
- [x] **Phase 7: Final Polish** (Reactive pickup countdown tickers, semantic dot status badges, public live meals redistributed impact counter)
- [x] **Hackathon AI Suite** (AI Food Vision & Drafter, Allergen Screening, Smart Charity Matchmaker & Dispatch, EPA WARM ESG Carbon Ledger)
