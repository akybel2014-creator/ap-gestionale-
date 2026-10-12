# Security Specification (`security_spec.md`)

## 1. Data Invariants

1. **Default-Deny Catch-All**: All paths in Firestore default to `allow read, write: if false;` unless explicitly matched and authorized.
2. **Verified Identity**: All write operations (`create`, `update`, `delete`) require an authenticated user (`request.auth != null`) with a verified email (`request.auth.token.email_verified == true`), or a verified administrator (`isAdmin()`).
3. **Path Variable Hardening (`isValidId`)**: Every single-document path variable (`{projectId}`, `{logId}`, `{adminId}`) must be a string between 1 and 128 characters matching `^[a-zA-Z0-9_\-]+$`.
4. **Ownership Binding (`ownerUid`)**: A `Project` or `ActivityLog` document can only be created if `incoming().ownerUid == request.auth.uid` and `incoming().id == documentId`.
5. **Relational Consistency (Master Gate)**: An `ActivityLog` document in `/activity_logs/{logId}` cannot be created unless the referenced parent project `/projects/$(incoming().projectId)` exists (`exists(...)`) and its `ownerUid` matches `request.auth.uid` (`get(...).data.ownerUid == request.auth.uid`).
6. **Immutable Fields**: `id`, `ownerUid`, `userId`, and `createdAt` on `Project` and `ActivityLog` (plus `projectId` and `timestamp` on `ActivityLog`) can never be modified after creation.
7. **Temporal Integrity**: `createdAt` and `updatedAt` must strictly equal `request.time` on creation, and `updatedAt` must strictly equal `request.time` on every update.
8. **Query Enforcer (`allow list`)**: No blanket reads are permitted. `allow list` on `/projects` and `/activity_logs` strictly enforces `resource.data.ownerUid == request.auth.uid || isAdmin()`.

---

## 2. The "Dirty Dozen" Payloads

1. **Identity Spoofing on Project Create**: Authenticated user `uid_attacker` attempts to create `/projects/proj_1` with `ownerUid: "uid_victim"`. -> `PERMISSION_DENIED`
2. **Shadow Field Injection on Project Create**: Authenticated user sends valid required fields for `/projects/proj_1` plus an undeclared field `"isAdmin": true`. -> `PERMISSION_DENIED`
3. **Unverified Email Write**: Authenticated user with `email_verified: false` attempts to create `/projects/proj_1`. -> `PERMISSION_DENIED`
4. **Orphaned Activity Log Creation**: Authenticated user attempts to create `/activity_logs/log_1` referencing a non-existent `projectId: "proj_ghost"`. -> `PERMISSION_DENIED`
5. **Cross-Tenant Activity Log Injection**: Authenticated user `uid_attacker` attempts to create `/activity_logs/log_1` referencing `projectId: "proj_victim"` owned by `uid_victim`. -> `PERMISSION_DENIED`
6. **Owner Hijack on Project Update**: Owner `uid_1` attempts to update `/projects/proj_1` changing `ownerUid` to `"uid_2"`. -> `PERMISSION_DENIED`
7. **Timestamp Forgery on Create**: Client supplies a past or future timestamp for `createdAt` instead of `request.time`. -> `PERMISSION_DENIED`
8. **Value Poisoning on Project Name**: Owner updates `name` on `/projects/proj_1` with a 5,000-character string (exceeding `maxLength: 60`) or a boolean value. -> `PERMISSION_DENIED`
9. **ID Poisoning on Path**: User attempts to create `/projects/invalid$id!with*spaces` or a 500-char ID. -> `PERMISSION_DENIED`
10. **Blanket List Scraping**: User `uid_attacker` executes an unfiltered `list` query on `/projects` or queries `where('ownerUid', '==', 'uid_victim')`. -> `PERMISSION_DENIED`
11. **Self-Assigned Admin Escalation**: Regular user `uid_attacker` attempts to create `/admins/uid_attacker` with `{ uid: "uid_attacker", role: "admin" }`. -> `PERMISSION_DENIED`
12. **Immortal `createdAt` Mutation on Update**: Owner attempts to update `status` while also mutating `createdAt` on `/projects/proj_1`. -> `PERMISSION_DENIED`

---

## 3. Security Rules Test Suite Reference (`firestore.rules.test.ts`)

All 12 payloads are verified against `firestore.rules` to ensure `PERMISSION_DENIED` is returned for every violation of identity, schema boundary, relational integrity, or temporal invariant.
