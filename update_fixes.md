# SYSTEM REFACTORING INSTRUCTIONS: BACKEND OPTIMIZATION (V2)

**Role:** Act as a Senior Backend Architect and PostgreSQL Expert.
**Context:** I am providing you with `schema.sql` and `api.ts` from a White-label SaaS application for Salons. The current architecture relies entirely on the frontend for business logic, lacks true security, has dangerous temporal/date bugs, and destroys historical data.

**Your Task:** Rewrite both files completely. Shift logic, calculations, and security to the Database level (RPCs, Triggers, Constraints, strict RLS) and update `api.ts` accordingly.

### 🚨 CRITICAL ISSUES TO FIX (ALL MUST BE ADDRESSED):

#### 1. Temporal & Date Bugs (The Timezone Trap)
* **UTC Date Shifting:** In `api.ts`, using `new Date().toISOString().split('T')[0]` causes dates to shift incorrectly around midnight (UTC vs Local Time). **Fix:** Use local timezone formatting (e.g., `toLocaleDateString('en-CA')` or standard `date-fns` logic) in `api.ts`, and ensure DB timestamps accurately reflect local bounds or use `CURRENT_DATE` in SQL.

#### 2. Data Destruction (Hard Deletes)
* **Ruining Historical Invoices:** Using `.delete()` on `products`, `services`, or `staff` sets related fields in transactions/appointments to `NULL` (due to `ON DELETE SET NULL`). **Fix:** Implement **Soft Deletes**. Add `is_deleted BOOLEAN DEFAULT false` to `products`, `services`, `staff`, and `clients`. Update `api.ts` to use `.update({ is_deleted: true })` instead of `.delete()`, and modify `schema.sql` constraints to preserve historical data integrity.

#### 3. Security & True RBAC (Role-Based Access Control)
* **The UI Illusion:** Frontend hides buttons for 'receptionists', but the API and DB do not block them. RLS is currently `Allow all access`. **Fix:** Implement strict RLS in `schema.sql`. Create a function to get the user's role from `profiles` and use it in policies (e.g., Only 'admin' or 'manager' can modify `staff` or `products`; 'receptionist' can only modify `appointments` and `clients`).
* **Frontend Pricing Override:** `api.ts` sends `totalAmount` and `price_at_booking`. **Fix:** DB MUST calculate transaction totals and appointment prices via RPCs using secure table joins.

#### 4. Concurrency & Race Conditions
* **WhatsApp Array Overwrite:** Concurrent messages will overwrite each other in `whatsapp_sessions.last_messages`. **Fix:** Create a Postgres RPC for atomic JSONB array appending.
* **Double Booking:** Overlapping appointments are possible. **Fix:** Add a Postgres `EXCLUDE` constraint on `appointments` (staff_id, date, start_time, end_time).
* **Inventory Desync:** Frontend loop for `updateStock`. **Fix:** Handle transaction creation and stock deduction atomically in a single RPC, enforcing `stock >= 0`.

#### 5. Data Integrity & Reporting
* **Orphaned Transactions:** Handle headers and items in one DB Transaction (`BEGIN...COMMIT`).
* **Decoupled Payments:** Add Triggers to auto-update `credit_balance` when `client_payments` are inserted.
* **Erased Staff History:** Calculate report revenue for ALL staff (including `is_deleted = true`), not just currently active ones.
* **Overfetching (Memory Leak):** `appointments.getUpcoming` fetches infinite records. **Fix:** Add date boundaries (e.g., limit to next 30 days) and limits.

---

### 📜 OUTPUT REQUIREMENTS:
1. **NO SNIPPETS:** Output the **ENTIRE, COMPLETE** `schema.sql` file (all tables, strict RLS, Soft Deletes, RPCs, Triggers).
2. **NO SNIPPETS:** Output the **ENTIRE, COMPLETE** `api.ts` file updated to safely call the DB.
3. No placeholder comments. Write the full, production-ready code.