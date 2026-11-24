# Active Teams — Old System vs Current Frontend

**Old system:** the Apps Script / Google Sheets SPA documented in `ACTIVE_TEAMS_SITE_REPORT.md`.  
**Current frontend:** `main` at `1519f557` (working tree reviewed on 27 October 2026).  
**Question answered:** what could the old system do that the current frontend cannot do, or now does worse?

**Verdict labels used below**

| Label | Meaning |
|---|---|
| **Improved** | The capability still exists and is materially better. |
| **Present** | The capability still exists with no important loss. |
| **Changed** | The capability is covered, but the workflow or output is different, with a trade-off. |
| **Regressed** | An equivalent exists, but it is worse for the same job. |
| **Missing** | No equivalent exists. |
| **N/A** | The old item was a demo, placeholder, or non-functioning UI. |

---

## 1. Bottom line

The current app is largely a superset of the old one. It preserves the core event workflow and fixes most of the old system's worst problems: client-side authentication, broken event deletion, broken event-group deletion, no recurrence, no real people directory, no password recovery, no attendance export, fixed service-check-in days, and CSV-only reporting.

The genuine losses are concentrated in the **reporting and daily-triage layer**, not in event capture:

1. **Aggregate converts reporting is gone.** The old Events-page **View Converts** drawer grouped consolidation tasks by event and date and showed total, re-commitment, and first-time commitment counts. The current app only has a per-event consolidated list inside Service Check-In history; it has no cross-event grouping and no first-time/re-commitment totals. This is the most significant old capability that is missing.
2. **Ministry Tasks / discipleship oversight is gone.** The old **Ministry Tasks** screen showed a user's own completed tasks plus completed counts for their disciples and sub-disciples. Current **Stats** has a good all-tasks-by-person view, but it is not a disciple roll-up, and `/stats` is guarded to `admin` and `leaderat12` — not `leader` — even though the sidebar advertises Stats to leaders.
3. **Open-only Follow Ups and open-only My Tasks are gone.** Current **Daily Tasks** is broader and more capable, but it mixes open, awaiting, and completed tasks with no status filter. There is no dedicated screen that answers “show me only my open follow-ups” or “show me only my open tasks”.
4. **The checked-in-only attendance tab is gone.** Checked-in state is now shown inline in **Capture Attendees**, and Service Check-In has a present-attendees modal, but event attendance no longer has the old read-only **Checked In People** tab or an equivalent checked-in-only filter.

Smaller regressions: no weekday event filter, no logout confirmation, and the old autoplay Home carousel has become a static image stack.

The old system also had limitations that the current app still has not fixed, notably **no custom date range anywhere**, no persistent audit trail, and no backdating/correction flow for previous service attendance. Those are not new regressions; they are carried-over gaps.

---

## 2. Genuine losses, prioritised

### P1 — Aggregate converts and commitment reporting

**What the old system could do**

- From Events, an Admin or Registrant could open **View Converts**.
- It loaded all `Church - Consolidation` tasks and grouped them by **event + task date**.
- Each group showed:
  - Total converts
  - Re-commitments
  - First-time commitments
  - A recipient drill-down with name, assigned person, task stage, and decision.
- From Service Check-In history, **People that gave their lives** showed three summary cards: recommitments, first-time commitments, and total, plus the recipient list.

**What the current app does**

- Service Check-In history still has a per-event **Consolidated** drill-down (`EventHistoryModal`).
- It shows the consolidated people, decision chips, search, and an XLSX export.
- It shows only a **total** count. It does not split first-time commitments from re-commitments, and it does not group converts across events.
- The Events page has no converts entry point.
- Stats has no converts or commitment metrics at all.

**Assessment: Missing (partially replaced).**

The underlying conversion records are still visible and exportable per event, so the data is not lost. The old aggregate view — the thing that let a leader see the conversion mix at a glance — has no equivalent. A user must now open events one at a time, or export and count manually.

The old feature was not perfect: it had no date range or export, and the Admin-side task modal showed zeroed commitment totals because the decision counts were not passed. The Service Check-In path and the Events drawer were real capabilities nonetheless.

---

### P1/P2 — Ministry Tasks and discipleship oversight

**What the old system could do**

- **Ministry Tasks** let a user select a period and see:
  - Their own completed-task count
  - Counts for their disciples
  - Counts for sub-disciples under those disciples
- The screen was available to Leaders, Registrants, and Admins, not just Admins.
- It had no task list or drill-down, and its name-based team grouping was brittle, but it was the only view of a discipleship group’s task activity.

**What the current app does**

- **Stats → Tasks → All Tasks by Person** shows each person’s total, completed, and remaining task counts, with expandable task rows, period presets, and XLSX download.
- That is a better admin reporting surface than the old Admin task summary.
- It does **not** model disciple/sub-disciple relationships; it is a flat list of people.
- `/stats` is guarded to `admin` and `leaderat12` in `src/App.jsx`, so a normal `leader` cannot open it.
- The sidebar nevertheless lists Stats for `leader`, producing a link that ends in an access-denied page.
- Daily Tasks is personal-scope only.

**Assessment: Missing (partially replaced for admins).**

Admins gain a stronger task dashboard, but leaders and users lose the old “how is my discipleship group doing?” view. The sidebar/route mismatch makes the replacement look available to leaders when it is not.

---

### P2 — Dedicated Follow Ups and open-only My Tasks

**What the old system could do**

- **Follow Ups** showed only tasks whose type was `follow-up` and whose stage was `open`.
- **My Tasks** showed only open tasks assigned to the current user.
- Both could close a task and export CSV.
- The old screens were limited — no status filter, no date filter, unreliable refresh after creating a task — but they were focused daily worklists.

**What the current app does**

- **Daily Tasks** is the replacement. It supports:
  - Custom task types and task-type management
  - Call, visit, and consolidation quick actions
  - Open, Awaiting task, and Completed statuses
  - Overdue highlighting
  - Date presets: Today, This Week, This Month, Previous Week, Previous Month
  - XLSX download
  - Editing an existing task’s details
- It has **no status filter** and no open-only mode. Completed and awaiting tasks are mixed with open tasks in the same list.
- There is no dedicated Follow Ups view. Automatically created follow-up tasks appear under the general list and/or consolidation filter, not in an isolated open-follow-up queue.
- There is no equivalent of “My Tasks: only what is still open”.

**Assessment: Regressed for daily triage; Missing as a dedicated Follow Ups screen.**

The new task system is more capable overall, but it no longer provides the two clean worklists the old app had. A user looking for “what must I still do?” has to scan past completed work.

The old “Pastoral Call” and “Pastoral Visit” buttons were identical in behaviour; the current app at least gives call and visit distinct task types. That is an improvement, not a loss.

---

### P3 — Checked-in-only attendance tab

**What the old system could do**

- Event attendance had three tabs: **Capture**, **Associate Person**, and **Checked In People**.
- The third tab was a read-only list of people derived as checked in for the event.

**What the current app does**

- Event attendance has two tabs: **Capture Attendees** and **Associate Person**.
- Checked-in state is shown inline in the capture list.
- **Download Attendance** exports only the checked-in people; **Download Everyone** includes paid no-shows and registrants.
- Service Check-In has a separate present-attendees modal for its own flow.

**Assessment: Changed (minor regression).**

The information is still available inline and in the checked-in export, but the event modal no longer has a focused checked-in-only view. This is a convenience loss, not a data loss.

---

### P3 — Smaller old-to-new deltas

| Old capability | Current state | Verdict |
|---|---|---|
| **Weekday event filter** | Events can be filtered by event type, status, personal/all, and search, but there is no visible day-of-week filter. Recurring days are displayed on event rows. | Missing (minor) |
| **Logout confirmation** | Logout now runs immediately from the profile menu. | Changed (minor) |
| **Autoplay five-image Home carousel with footer** | Home renders four static full-height image sections; no autoplay, arrows, indicators, or footer. | Changed (minor / design choice) |
| **Events-page converts entry point** | Converts are now reached through Service Check-In → Event History → Consolidated. Admin and Registrant still have access, but the aggregate Events view is gone. | Covered by the P1 loss |

---

## 3. Capability matrix

### Authentication, account, and global shell

| Old capability | Current capability | Verdict |
|---|---|---|
| Sign up with name, surname, email, password | Separate signup flow with richer fields and server-side auth | Improved |
| Log in with email/password | JWT login with access/refresh tokens | Improved |
| Client-side validation | Stronger form validation and server-side auth | Improved |
| Session persisted in localStorage | JWT access + refresh tokens persisted | Improved |
| Logout confirmation | Immediate logout | Changed |
| Forgot password | Forgot/reset password routes | Improved (new) |
| Change password | Profile → password change | Improved (new) |
| Profile management | Profile edit, avatar crop/upload | Improved (new) |
| Role/user administration | Admin users, roles, and organisations | Improved (new) |
| Styled 404 and error recovery | Styled 404 and error boundary | Improved |
| Dark mode | Theme toggle / dark mode | Improved (new) |
| Responsive navigation | Drawer/sidebar and responsive card layouts | Improved |
| Global search | Not present | Missing in both |
| Notification centre | Not present | Missing in both |
| Logout without confirmation | Immediate logout | Regressed (minor) |
| Autoplay Home carousel | Static image sections | Changed (minor) |

### Events and attendance

| Old capability | Current capability | Verdict |
|---|---|---|
| Event-group buttons | Event type cards/list with CRUD | Improved |
| Create event group | Create/edit event types, including ticketed/training/global flags | Improved |
| Delete event group | Event-type deletion works | Improved (old was broken) |
| Create event | Create Event with location autocomplete, leaders, recurrence, price tiers | Improved |
| Edit event | Edit Event, including status and deactivation | Improved |
| Delete event | Delete Event action works | Improved (old was broken) |
| Recurring event generation | Recurring days and series handling | Improved (old flag was unused) |
| Status tabs only for Cells/Training | Status badges across all event types | Improved |
| Search by event name/leader | Search by name/leader plus event type, personal/all, pagination, card/table views | Improved |
| Day + status filter dialog | Status/type/search filters; no weekday filter | Changed |
| Event detail with Capture / Associate / Checked In People | Capture Attendees / Associate Person tabs with inline checked state | Changed |
| Capture and uncapture attendees | Checkbox capture with save | Present/Improved |
| Associate existing people | Associate search and add | Present/Improved |
| Add new person from event | Add Person with duplicate detection, stage, leader chain | Improved |
| Capture a convert/consolidation | Consolidation flow | Present/Improved |
| Payment confirmation for ticketed events | Price tiers, payment method, paid/owing/change, headcount | Improved |
| Complete event | Save/complete flow | Present |
| Mark event Did Not Meet | Explicit action with destructive warning | Present/Improved |
| Admin Tasks oversight tab | Stats → All Tasks by Person, outside Events | Changed/Improved |
| View Converts drawer with totals and drill-down | Per-event consolidated list only; no aggregate or commitment split | Missing/partial |
| Attendance editing/removal | Capture toggles and removal before save | Improved |
| Attendance export | Download Attendance / Download Everyone (XLSX) | Improved (old had none) |
| Event-grid export | Per-event attendance downloads | Improved (old had none) |
| Custom date range | Still absent | Missing in both |
| Upcoming-event visibility | Current Events client no longer deliberately hides future events; it fetches from a start date with no end cutoff | Improved (client-side) |

### Tasks and follow-ups

| Old capability | Current capability | Verdict |
|---|---|---|
| Create task with type, recipient, assignee, due date, state | Create task with type, recipient, assignee, status, fixed due-date display | Improved |
| Create task from Follow Ups / My Tasks / Ministry Tasks | Create from Daily Tasks; no task creation from a ministry overview | Changed |
| Create covert/consolidation task from Events or Service Check-In | Consolidation flow creates tasks | Present/Improved |
| Close a task | Change status to Completed | Present |
| My Tasks = open tasks only | Daily Tasks mixes Open, Awaiting, and Completed; no status filter | Regressed |
| Follow Ups = open follow-up tasks only | No dedicated view; follow-ups mixed into Daily Tasks | Missing |
| Admin task summary by person and period | Stats → All Tasks by Person, period presets, expandable task rows, XLSX | Improved/Changed |
| Task Completion Data modal | Per-person tasks covered by Stats; commitment-summary modal has no equivalent | Missing/partial |
| Ministry Tasks: self + disciples + sub-disciples | No disciple hierarchy; Stats is a flat people list, guarded to admin/leaderat12 | Missing |
| Edit task fields other than stage | Edit recipient, assignee, type, and status | Improved |
| Reassign or reschedule a task | Assignee/recipient editable; due date still disabled | Partial |
| Delete a task | Not present | Missing in both |
| Task detail view | Edit modal provides task detail | Improved |
| Task reminders/notifications | Not present | Missing in both |
| Task comments | Old modal had a comments box, but it was never submitted in the task payload | N/A (not a real old capability) |
| Task CSV export | Daily Tasks XLSX download | Improved |
| Immediate list refresh after creation | Daily Tasks refreshes/inserts without a full reload | Improved |
| Custom date range | Still absent | Missing in both |

### Service Check-In

| Old capability | Current capability | Verdict |
|---|---|---|
| Check-In tab with person search | Event-driven check-in with event selection and search | Improved |
| Friday/Sunday/Monday only | Today’s eligible service events, not a weekday whitelist | Improved |
| Two fixed services with fixed times | Event-driven service list | Improved |
| Per-person check-in | Present | Present |
| Success alert | Toast/notification | Improved |
| CSV export from check-in list | XLSX download | Improved |
| History rows with attendance count | History with counts and drill-downs | Improved |
| View Details | Attendance detail modal | Improved |
| View New People | New-people detail modal with export | Improved |
| View Converts/Consolidations | Consolidated detail modal with decision chips and export | Improved, but no first-time/re-commitment totals |
| Coverts Count column | Consolidated count populated | Improved |
| Backdating or correcting a previous service | No visible backdating/correction flow; check-in is scoped to today’s open events | Missing in both |
| Undo a check-in | Toggle/uncheck a present person in Service Check-In or attendance | Improved |
| Service/location configuration | Configured through events and event types | Improved |
| History search/date filter | Event search, load-older pagination, and export; no custom date filter | Improved |
| History export | XLSX from detail modals; no history-grid export | Improved/partial |

### People and assessments

| Old capability | Current capability | Verdict |
|---|---|---|
| People demo page | Real People directory with stages, search, list/board views | Improved |
| Add person with leader hierarchy derivation | Add Person with leader levels and stage | Improved |
| Automatic follow-up task after adding a person | New-person follow-up task creation | Present/Improved |
| Edit person | Edit person | Improved |
| Archive/delete person | Delete person | Improved |
| Duplicate detection | Duplicate detection in Add Person and import | Improved |
| Data import | People import workflow | Improved (old had none) |
| PID Assessments placeholder | No equivalent | N/A (old was a placeholder) |

### Reporting, admin, and data

| Old capability | Current capability | Verdict |
|---|---|---|
| Converts grouped by event/date | No aggregate view; only per-event consolidated lists | Missing |
| Commitment totals (recommitment / first-time) | No summary; decision chips and total only | Missing |
| Task completion counts | Stats per-person counts and task rows | Improved/partial |
| Ministry discipleship counts | No equivalent | Missing |
| Attendance counts and event history | History counts and drill-downs | Improved |
| CSV export on three grids | XLSX across Events, Attendance, Daily Tasks, Stats, and history modals | Improved |
| Custom date range | Still absent | Missing in both |
| PDF/Excel/scheduled reports | XLSX added; no PDF, scheduler, or report builder | Partial |
| Audit trail | Admin Activity tab records in-session actions only; not a persistent audit log | Partial (new, session-only) |
| Data import | People import | Improved |
| Bulk operations | Still limited/absent | Missing in both |
| Global search | Still absent | Missing in both |

---

## 4. What the current app clearly does better

These are replacements, not losses:

- **Real authentication and account management.** Backend auth, refresh tokens, forgot/reset password, change password, profile and avatar management, and admin user/role/organisation management replace the old localStorage-role model.
- **Real People CRM.** The old People page was a hard-coded demo. The current page supports directory search, stages, add/edit/delete, duplicate detection, and import.
- **Event lifecycle.** Event/type deletion, deactivation, recurrence, price tiers, location autocomplete, ticket payments, headcount, and more exports now work. The old deletion paths were broken and recurrence was unused.
- **Event attendance.** Ticketing with price tiers and payment method, inline paid/owing/change, headcount, checked-in/everyone exports, and a destructive Did Not Meet guard are all stronger than the old modal.
- **Service Check-In.** It is now event-driven rather than limited to Friday/Sunday/Monday with two hard-coded services. History has search, drill-downs, and XLSX export.
- **Task management breadth.** Custom task types, three statuses, date presets, overdue highlighting, editing, XLSX, and automatic follow-up tasks are stronger than the old task screens.
- **Reporting dashboard.** Stats adds overdue cells, tasks by person, calendar, period presets, and XLSX — capabilities the old site did not have.
- **Exports.** The old site had CSV on three grids. The current app exports XLSX from Events, Attendance, Daily Tasks, Stats, and history/consolidation detail modals.
- **UI and resilience.** Dark mode, responsive layouts, skeleton loading, toasts, a styled 404, and an error boundary replace native alerts and the unstyled 404, and improve small-screen use.

---

## 5. Old limitations that are still limitations — not regressions

These existed in the old system and still exist in the current one:

- **No custom date range anywhere.** Current screens use presets only (`today`, `thisWeek`, `thisMonth`, `previousWeek`, `previousMonth`). The old report listed this as its number-one functional blocker.
- **No persistent audit trail.** Admin has an Activity tab, but it is populated from React state for the current session; it is not a durable record of who changed what.
- **No backdating/correction flow for service attendance.** Service Check-In is tied to the current event rather than a historical correction workflow.
- **No payment gateway, receipts, refunds, or dedicated payment history.** Payments remain manually captured amounts.
- **No notification centre, reminders, global search, saved filters, or meaningful bulk operations.**
- **No report builder, PDF export, or scheduled reporting.** XLSX covers more screens, but reporting is still preset-based.
- **No email verification or MFA.** The current auth is stronger, but these are still absent.

---

## 6. Things that should not be counted as losses

- **Old People demo page.** The old report describes it as hard-coded and unlisted. A real People directory now exists, so this is not a lost capability.
- **PID Assessments.** It was a heading-only placeholder. Its absence is not a feature loss.
- **Task comments.** The old task modal showed a Comments box, but the old report states the text was never included in the submitted task payload. The current task form has no Comments field, but the old field was not a working capability.
- **Pastoral Call vs Pastoral Visit.** They were identical in the old system. The current app gives call and visit distinct task types.
- **Broken old event deletion and event-group deletion.** Both now work; these are gains, not regressions.
- **Old admin Task Completion Data summary.** The old Admin-side summary commonly showed zeros because decision counts were not passed, and its open-task filter contained a typo. The loss of the Service Check-In commitment summary is still real, but the old Admin modal was not a reliable benchmark.

---

## 7. Recommended restoration order

If the goal is to recover the old capabilities that still matter:

1. **Restore aggregate converts reporting.** Add an Events/Stats view that groups consolidation tasks by event and date, shows total / re-commitments / first-time commitments, supports recipient drill-down, and exports XLSX. This is the clearest functional regression.
2. **Restore discipleship task visibility.** Either bring back a Ministry Tasks-style roll-up, or add disciple/sub-disciple hierarchy to Stats and allow `leader` to reach it. Fix the sidebar/route mismatch at the same time.
3. **Add open-only and follow-up-only views to Daily Tasks.** A status filter plus a dedicated “Open follow-ups” preset would recover the old Follow Ups and My Tasks workflows without abandoning the new task system.
4. **Add a checked-in-only filter or tab to event attendance.** The data is already present; this is a small UI convenience.
5. **Decide whether weekday filtering and logout confirmation are still required operationally.** Both are small losses with easy replacements.
6. **Treat the Home carousel as a design decision.** The static image sections are not a functional downgrade unless the autoplay presentation was specifically required.

---

## 8. Where this was checked in the current code

- `src/App.jsx` — route guards, including `/stats`, `/servicecheckin`, `/daily-tasks`, `/people`, `/admin`
- `src/components/Sidebar.jsx` — navigation visibility and the Stats/leader mismatch
- `src/Pages/Events.jsx` — event filters, status views, event actions, downloads, no View Converts
- `src/Pages/AttendanceModal.jsx` — Capture/Associate tabs, inline checked state, ticketing, headcount, Did Not Meet
- `src/Pages/ServiceCheckIn.jsx` — event-driven check-in, history, consolidation, present/new-people modals
- `src/components/EventHistoryModal.jsx` — consolidated list, decision chips, total count, XLSX
- `src/Pages/DailyTasks.jsx` — task types, statuses, date presets, no open-only or follow-up-only view
- `src/Pages/Stats.jsx` — all tasks by person, overdue cells, calendar, period presets, no converts
- `src/Pages/People.jsx` — real people directory, stages, search, import, duplicate handling
- `src/Pages/Admin.jsx` — users, roles, organisations, session-local Activity tab
- `src/Pages/Profile.jsx` — profile edit, avatar, password change
- `src/Pages/CreateEvents.jsx` — recurrence, location, leaders, price tiers
- `src/Pages/EditEventModal.jsx` — event editing, deactivation, status changes
- `src/components/Header.jsx` — static Home image sections
- `src/components/withAuthCheck.jsx` — role/hierarchy access checks
