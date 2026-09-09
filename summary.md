# Session Summary — Active Teams (OrgSetup branch)

## Objective
- Build multi-church (multi-tenant) support: signup auto-creates org → org-setup wizard defines dynamic hierarchy (G12 is one example) → all screens work per-org, driven by org config, with no hardcoded `leader1/leader12/leader144/leader1728` keys.
- Milestones run in parallel on both repos (frontend here, backend `OrgSetUp`). Backend: M0–M4 contract done (21/21 exit checks green; its final §10 sweep in progress). Frontend: M0–M4 done. User constraint for M4: **don't break the site**.

## Important Details
- Frontend repo: Vite + React 18, MUI v7, `react-toastify`; backend via `VITE_BACKEND_URL`. Baseline lint 0 errors / ~43 pre-existing warnings; `npx vite build` passes.
- Canonical read: `getLeaderValue(person, key)` (src/utils/hierarchy.js) returns `person.leaders[key]` first, falls back to `person[key]` — keeps working for both people and events. `DEFAULT_HIERARCHY` keys ARE `leader1/12/144/1728` (Active Church G12 default).
- Milestone ordering rule: backend must be canonical on a surface BEFORE the frontend removes that surface's flat code. Backend exit-criteria checks (BACKEND-M4-REQUIREMENTS.md) define exactly when each removal is safe.
- Capabilities (spec §7, §3.2): `admin, manage_org, view_people, manage_people, reassign_people, create_events, close_events, view_stats, checkin`; `useCapabilities().can(cap)` grants on `admin` wildcard or exact cap.

## Work State
### Completed — M4 frontend sweep (all write-path flats removed, read/echo swept conservatively)
- **Write paths now canonical-only:**
  - `AddPersonDialog.jsx` `/people` POST/PATCH: flat keys `leader1/1Id/leader12/12Id/leader144/144Id` removed from payload (done earlier); canonical `hierarchy_leaders` + positional `leaders` array + `leaderId` retained (positional array is a supported backend write format — M2 maps it onto `leaders.{key}`).
  - `CreateEvents.jsx` POST `/events`: `leader1/leader12` (payload) and the `hasPersonSteps` `leader1/12/144` block removed; canonical `hierarchy_leaders` retained. Also removed the dead debug useEffect and flat defaults that depended on them. (Event-edit PUT still sends raw formState — pre-existing, untouched.)
  - `Admin.jsx` POST `/admin/users`: flat `leader12/144/1728` dropped; now sends only `leaders: userData.leaders || {}` (NewUserModal already builds the canonical dict). Admin user transform dropped `leader12/144/1728` echo, keeps `leaders`.
  - `NewUserModal.jsx`: flat fields removed from state/reset/populate; only canonical `leaders` dict is carried.
- **Read/echo sweep (subagent `ses_f786fd9b7ffeT217o53xls1aFM`, 0 errors):** CreateEvents fetchPeople mapper flattened; Events.jsx removed `"leader12"` from excludedFields + literal `event.leaderAt1||leader_at_1` mobile fallback; People.jsx removed the `savedPerson.leader1/["Leader @1"]…` legacy backfill block. AttendanceModal/ServiceCheckIn/ConsolidationModal/EventHistoryModal touched nothing — they only contain dynamic `` `Leader @${lv.level}` `` template reads preceded by `getLeaderValue` (generic, kept by rule).
- **Verification:** `npx eslint src` → 0 errors, 43 pre-existing warnings; `npx vite build` passes; `rg` field-literal sweep run.
- **Residual `rg` hits — all intentional, classified:**
  1. `hierarchy.js` DEFAULT_HIERARCHY (`leader1/12/144/1728` + "Leader @…" labels) + LEGACY_PATTERN — the canonical default definition; must stay.
  2. `AddPersonDialog.jsx` LEGACY_LEADER_KEYS + `initialFormState` + `mapPerson`/`getLeadersFromPerson`/`normalizeLeaderChain`/onSave-echo — these are (a) the controlled edit-form prefill (People.jsx passes its own `formData` into AddPersonDialog, so `leaderFormKey(lv)` keys ARE load-bearing) and (b) reads that protect stale localStorage people-cache entries that lack canonical `leaders`. Payload `leaders` positional array retained (backend-supported). Left in place deliberately.
  3. `People.jsx` formData `leader12/144/1728` init/reset + edit echo (lines ~729, ~1224-26, ~1356-58) — feed the controlled AddPersonDialog form; removing them blanks leader fields on edit. Kept.
  4. `eventhistory.js` `leader12`/`leader12_email` stored keys — legacy event-history localStorage util (deferred).
  5. `capabilities.js` LEGACY_ROLE_CAPS `leader12` role entry — legacy ROLE fallback (out of M4 flat-field scope).
  6. `EditEventModal.jsx` `'leader1'/'leader12'/'Leader at 12'` — legacy role permission strings (out of scope, deferred).

### Completed — Backend M4 contract (user-reported)
- §3.1 read backfill live (get_people aggregation fixed; all event reads expose `leaders`), §3.2 events canonical (POST + both PUT accept `leaders`/`hierarchy_leaders`, keyed dict + flat dual-write), §3.3 `/admin/users` persists + echoes `leaders` (UserListResponse field added), §3.4 org guards on `DELETE /events/{id}` + `PUT /events/person/…/day/…` (cross-org 403) + fixed NameError and 500-instead-of-403 wraps, §3.6 people positional lists normalise against org hierarchy. 21/21 exit-criteria checks pass; 145 routes; scratch cleaned; nothing committed.
- **Remaining (backend, in parallel):** exit criterion 8 — global sweep of ~333 hardcoded flat refs in main.py down to backfill/dual-write helpers only. Internal-only, no API change → parallel-safe.

## Next Move
- Backend finishes its §10 sweep (333 refs). Frontend is done; nothing blocking.
- Optional follow-ups (not required): switch `CreateEvents.jsx` event-EDIT PUT to send canonical `hierarchy_leaders` too (it currently PUTs raw formState — pre-existing, still OK because backend dual-writes from flats); after backend M4 lands and people cache re-fetches, the stale-cache read fallbacks in `AddPersonDialog.jsx`/`People.jsx` can be deleted.

## Relevant Files
- `BACKEND-M4-REQUIREMENTS.md` : backend M4 spec + 8 exit checks (moved to backend repo per user).
- `src/utils/hierarchy.js`, `src/utils/capabilities.js`, `src/contexts/OrgConfigContext.jsx` : choke points.
- M4-touched: `src/components/AddPersonDialog.jsx`, `src/components/NewUserModal.jsx`, `src/Pages/Admin.jsx`, `src/Pages/CreateEvents.jsx`, `src/Pages/People.jsx`, `src/Pages/Events.jsx`.
- M1–M3: `src/components/RolesManager.jsx`, `src/Pages/OrgSetup.jsx`, `src/Pages/AttendanceModal.jsx`, `src/Pages/ServiceCheckIn.jsx`, `src/components/ConsolidationModal.jsx`, `src/components/EventHistoryModal.jsx`, `src/components/Sidebar.jsx`.
- Deferred: `src/Pages/EditEventModal.jsx`, `src/Pages/Profile.jsx`, `src/utils/eventhistory.js`.