# Security Specification for Fortuna

## 1. Data Invariants

- **Ownership Invariant**: A user's financial transactions, budgets, and investments are strictly private and bound to their unique authenticated `uid`. No other user (even authenticated) may read, create, update, or delete another user's data.
- **ID Integrity**: The nested URL variables `{userId}` must mathematically match the bearer's authenticated token UID (`request.auth.uid`) for all CRUD operations.
- **Type and Size Safeguards**: All numeric qualities (transaction value, budget limit, investment value) must be valid numbers. Description fields must be constrained to safe string sizes (e.g., text length <= 500) to prevent denial-of-wallet database storage attacks.

---

## 2. The "Dirty Dozen" Malicious Payloads

The following payloads attempt to breach security bounds and must be blocked by Firestore rules:

1. **Attempted Identity Spoofing (Create Transaction as Another User)**
   - Payload asks to write to `/users/alice/transactions/t1` with `userId: 'bob'`.
2. **Attempted Shadow Field Insertion (Ghost Keys)**
   - Payload contains `adminEnabled: true` or `isVerified: true` in `/users/alice`.
3. **Attempted Path Variable Poisoning**
   - Attempting to pass a 1MB string or high-charset string as a `{transactionId}` document ID.
4. **Attempted Value Poisoning (Nan / Negative Values / Strange Types)**
   - Writing `value: "one million"` (string) to `/users/alice/transactions/t1`.
5. **Attempted State Shortcutting**
   - Forcing transaction status to an unapproved custom string (e.g. `status: 'refunded-by-admin'`).
6. **Attempted Blanket Data Read Query**
   - Attempting to list all transactions across all users without passing a specific `userId` check in the rules.
7. **Attempted PII Leakage**
   - Reading user private email index if not authenticated or without owning the `userId`.
8. **Attempted Budget Overwrite (Exhausting resources)**
   - Creating a budget limit that is a negative number or extremely unsafe float.
9. **Attempted Database Tampering**
   - Writing `id` inside payload which does not match the document key `{transactionId}`.
10. **Attempted Cross-User Budget Manipulation**
   - Setting a budget document under alice's namespace but with `userId: 'bob'`.
11. **Spoofed Email / Email Verification Bypass**
   - Bypassing email verification requirement (if enforced) or reading admin variables.
12. **Tampering with Immortal Fields**
    - Modifying `createdAt` or `userId` in an existing transaction document.

---

## 3. The Rules Schema

These rules are enforced in `firestore.rules` below.
