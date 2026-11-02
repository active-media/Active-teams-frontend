# Active Teams — Complete Screen-by-Screen Capability Report

**Application:** Active Teams  
**Report date:** 23 October 2026  
**App version:** 0.0.0 (private React/Vite single-page application)  
**Source reviewed:** `/home/blessing/Documents/Backup-Active Teams/active-teams/src`  
**Review type:** Full source walkthrough of every route, page, tab, modal, drawer, dialog, shared component, API helper, context and utility.

> **Purpose of this document:** To give a complete, implementation-level account of what a user can see and do on every screen in the Active Teams site, including every field, button, table column, filter, date range, permission rule, modal flow, notification, loading state and known limitation. It is written so it can be converted directly to PDF.

---

## Table of Contents

1. Executive Summary
2. How to Read This Report
3. Product Context and Technical Architecture
4. Roles, Authentication and Access Control
5. Global Shell Present on Every Screen
6. Complete Route and Screen Catalogue
7. Screen 1 — Registration / Sign Up / Log In
8. Screen 2 — Home
9. Screen 3 — Event Administration
10. Screen 4 — Follow Ups
11. Screen 5 — My Tasks
12. Screen 6 — Ministry Tasks
13. Screen 7 — Service Check-In
14. Screen 8 — People (URL-Only Screen)
15. Screen 9 — PID Assessments (Placeholder)
16. Screen 10 — 404 Page Not Found
17. Sub-Screen A — Create New Event Modal
18. Sub-Screen B — Create New Event Group Modal
19. Sub-Screen C — Edit Event Dialog
20. Sub-Screen D — Event Detail Modal
21. Sub-Screen E — Event Filter Dialog
22. Sub-Screen F — Event Converts Drawer and Dialog
23. Sub-Screen G — Task Completion Data Modal
24. Sub-Screen H — Create New Person Modal
25. Sub-Screen I — Ministry Task / Pastoral Task / Capture Covert Modal
26. Sub-Screen J — Edit Task Status Modal
27. Sub-Screen K — Payment Confirmation Modal
28. Sub-Screen L — Delete Confirmation and Password Dialog
29. Sub-Screen M — Attendance Details Modal
30. Sub-Screen N — Logout Confirmation Dialog
31. Master Filter, Search, Date-Range and Export Matrix
32. Master Notification and Feedback Matrix
33. Data Model and Field Reference
34. Permission Matrix
35. Known Limitations and Observed Behaviour
36. Legacy and Non-Routable Code (Not Visible on the Site)
37. Glossary
38. Final Capability Summary Checklist

---

## 1. Executive Summary

Active Teams is a private, login-gated ministry operations application. It is not a public church website and has no public content pages. Its main jobs are:

- Signing users up and logging them in against a Google Sheets–backed Apps Script service.
- Administering event groups and individual events, including attendance capture, payment capture for ticketed events, convert/consolidation capture and completion status.
- Creating, assigning, filtering, viewing and closing ministry tasks.
- Logging pastoral calls and pastoral visits.
- Giving leaders a Ministry Task overview showing their own completed tasks and their disciples' completed tasks.
- Checking people into weekend services and reviewing attendance history, new people and converts per service.
- Showing converts by event and date, with re-commitment and first-time-commitment counts.

The application has four practical user states:

1. **Unauthenticated** — can only fill in the Sign Up / Log In screen.
2. **Leader** — the role produced by self-registration; sees Events, Follow Ups, Ministry Tasks and My Tasks; Service Check-In is disabled for this role.
3. **Registrant** — a provisioned role that can use Service Check-In as well as the normal logged-in screens.
4. **Admin** — full Events access, including all events and event administration controls, plus the Tasks oversight tab.

The strongest capabilities are the event/attendance workflows and the multiple ways of drilling into people and tasks. The most important gaps are:

- There is **no custom date-range picker anywhere on a reachable screen**. Date filtering is limited to fixed periods or single-value dropdowns. The only MUI DatePicker in the codebase belongs to an unrouted legacy Cells screen.
- Event deletion cannot currently be completed through the visible UI; the Delete Event column is empty and event-group deletion is blocked by the confirmation logic.
- The two "Log Pastoral Call Task" and "Log Pastoral Visit Task" buttons open exactly the same task form and do not preselect different task types.
- The Follow Ups and My Tasks screens do not add the new task to the table immediately after submission; a reload is normally required.
- Several screens are placeholders or hard-coded demos (People, PID Assessments).
- There is no password reset, email verification, profile management, notification centre, dark mode or offline editing.

---

## 2. How to Read This Report

Each screen section follows the same structure:

| Field | Meaning |
|---|---|
| **Route / entry point** | The URL or control that opens the screen. |
| **Access** | Who can open it and what data scope they receive. |
| **Purpose** | The business job of the screen. |
| **What you can do** | A capability checklist in plain language. |
| **Layout and controls** | The visible controls, labels, options, defaults and validation. |
| **Tables** | Columns, row filtering, sorting, pagination, toolbar and export behaviour. |
| **Actions and effects** | What happens when a control is used, including backend writes and navigation. |
| **Feedback and loading** | Spinners, alerts, empty states and error handling. |
| **Role differences** | How the screen changes by role. |
| **Limits and notes** | Observed constraints, quirks and non-obvious behaviour. |

The phrase **"configured page size"** means the source sets a page-size value on the MUI DataGrid; it is a description of the screen configuration rather than a guarantee about every runtime version of the grid library.

The report separates **routed screens** (Part A) from **overlays and sub-screens** (Part B). Modals and drawers are treated as screens because they carry their own fields, tables and actions.

---

## 3. Product Context and Technical Architecture

### 3.1 Technology

| Layer | Technology |
|---|---|
| UI framework | React 18 |
| Build tool | Vite 6 |
| Component library | Material UI (MUI) 6 |
| Tables | MUI X DataGrid 7 (community and pro packages present) |
| Forms | Formik + Yup (authentication), controlled React state elsewhere |
| Routing | React Router 6 (`createBrowserRouter`) |
| Carousel | Swiper 11 (Autoplay module) |
| Date utilities | date-fns dependency present; most date handling uses native `Date` |
| Local persistence | `localStorage`, `sessionStorage`, IndexedDB via `idb` |
| HTTP | `fetch` and `axios` (axios imported but not central to the reviewed flows) |
| Backend | Google Apps Script endpoints connected to Google Sheets |

### 3.2 Backend model

All business data is read from and written to Google Apps Script web apps. There is no visible application server, relational database or authentication service in this repository. The environment file defines separate Apps Script URLs for:

- Login and sign-up
- Fetching tasks, all people, all people names, event groups, events and one specific event
- Creating, editing and deleting tasks, people, cells, events and event groups
- Adding a person to an event, saving event status and service check-in
- Fetching cells (legacy)

Writes are generally sent as `POST` requests with `Content-Type: text/plain` and a JSON body. Reads are generally `GET` requests with query parameters. Responses are JSON. Exact URLs and credentials are intentionally omitted from this report.

### 3.3 Data domains used by the UI

- **People** — identity, contact, address, birthday, member status, inviter and a three-level leader hierarchy, plus one column per dated service/event attendance value.
- **Tasks** — task type, recipient, assignee, assigner, due date, timestamp, stage, decision and associated event.
- **Event groups** — a group such as Cells, Training or another configured type; each group has its own sheet ID and flags such as Ticketed, Global and Person Steps.
- **Events** — an individual occurrence inside a group, with leader, day, time, address, date, cost, rates, status and captured date.
- **Event attendance** — attendee records inside an event sheet, including payment and capture state, plus dated check-in columns.
- **Service attendance** — date-and-service columns on the people sheet, used by Service Check-In and History.
- **Convert/consolidation tasks** — tasks of type `Church - Consolidation` with a decision of `re-commitment` or `first-time commitment`.

### 3.4 Local state and caching

| Store | Keys / database | Purpose |
|---|---|---|
| `localStorage` | `loggedIn` | String flag used by route guards. |
| `localStorage` | `authUser` | Serialized user object containing at least `name`, `surname`, `email` and `role`. |
| `localStorage` | Various legacy caches such as `cellEvents` and `allPeopleRows2` | Fast reload for legacy Cells code; not used by the main routed screens. |
| `sessionStorage` | `{EventType}-columns` | Optional cached event-grid column definitions. No UI writes this in the reviewed screens. |
| IndexedDB | Database `myAppCache`, store `people` | Caches the All People response under `all_people_cache`; loaded first, then refreshed from the backend. |

### 3.5 Session handling

- Login and sign-up both store `loggedIn = "true"` and an `authUser` JSON object.
- Successful authentication waits two seconds, navigates to `/`, then forces `window.location.reload()`.
- Logout removes `loggedIn`, calls `localStorage.clear()`, and navigates to `/register`.
- Roles are read once from `authUser` in several modules; the practical way to apply a role change is a page reload.
- The authentication guard is client-side only. There is no signed token, expiry, refresh flow or server-side route protection in this repository.

---

## 4. Roles, Authentication and Access Control

### 4.1 Known roles

| Role | How it is created | Practical scope |
|---|---|---|
| **Admin** | Provisioned outside this UI; not offered on the Sign Up form. | Full event visibility, event group creation, event creation/editing, task oversight tab, View Converts, plus Service Check-In. |
| **Leader** | Default role for every self-registration. | Standard logged-in access; Events data is limited to events they lead or are invited to; Service Check-In is disabled in the drawer. |
| **Registrant** | Provisioned outside this UI. | Standard logged-in access plus Service Check-In; can also see View Converts. |
| **Unauthenticated** | No valid `loggedIn` flag. | Only the Registration/Login screen is rendered for protected routes. |

### 4.2 Route access matrix

| Route | Unauthenticated | Leader | Registrant | Admin |
|---|---|---|---|---|
| `/` | Registration/Login screen | Home | Home | Home |
| `/register` | Registration/Login screen | Registration/Login screen (even while logged in) | Registration/Login screen | Registration/Login screen |
| `/events` | Registration/Login screen | Event Administration | Event Administration | Event Administration |
| `/followups` | Registration/Login screen | Follow Ups | Follow Ups | Follow Ups |
| `/ministrytask` | Registration/Login screen | Ministry Tasks | Ministry Tasks | Ministry Tasks |
| `/people` | Registration/Login screen | People demo | People demo | People demo |
| `/tasks` | Registration/Login screen | My Tasks | My Tasks | My Tasks |
| `/servicecheckin` | Registration/Login screen | Registration/Login screen | Service Check-In | Service Check-In |
| `/pidassessments` | Registration/Login screen | PID placeholder | PID placeholder | PID placeholder |
| Any unknown path | 404 text | 404 text | 404 text | 404 text |

### 4.3 Role-specific UI differences

**Navbar (top):** shows Service Check-In, Ministry Tasks, Follow Ups and Events to every visitor; the links are then intercepted by the route guard if not logged in. The avatar and logout menu appear only when logged in.

**Side drawer:** shows Home, Events, Follow Ups, Ministry Tasks, My Tasks and Service Checkin. For a Leader, the Service Checkin item is **disabled**, not hidden. There is no People or PID Assessments item.

**Event Administration:** the Tasks tab is disabled for non-Admins. Only Admins see the trash icon on event-group buttons, the Edit Event column and the floating create actions. View Converts is shown for Admins and Registrants. Non-Admins only see events where their email matches the event email or their full name matches the event's "Leader at 12" value.

**Service Check-In:** available to Admins and Registrants only. A Leader who types the URL is redirected to the Registration/Login screen.

---

## 5. Global Shell Present on Every Screen

### 5.1 Fixed top navbar

| Element | Detail |
|---|---|
| Position | Fixed at the top, full width, 9vh high, black at 90% opacity, z-index 1000. |
| Left | Hamburger menu icon; opens the 270px side drawer. Hover changes to grey. |
| Centre/right | Four large text buttons: **Service Check-In**, **Ministry Tasks**, **Follow Ups**, **Events**. Each fills an equal share of the available button width and navigates immediately. |
| Avatar | Visible only when `loggedIn` is true. Circular avatar with up to two initials, deterministic background colour generated from the user's initials. A three-dot icon sits beside it. |
| Avatar menu | Single item: **Log out**. Opens the logout confirmation dialog. |
| Logged-out state | The four text buttons and hamburger remain visible; avatar is absent. |
| Page padding | Non-home pages receive 100px top padding on `<body>` so content starts below the fixed navbar. The Home page receives zero top padding for a full-bleed carousel. |

The navbar is rendered by the root layout above every route and every auth screen; it is not removed on the login page.

### 5.2 Side drawer

| Element | Detail |
|---|---|
| Width | 270px. |
| Header | Active Teams logo (`/activeFav.png`), 100×50px, offset from the left; clicking it navigates to `/`. |
| Menu items | Home (`/`), Events (`/events`), Follow Ups (`/followups`), Ministry Tasks (`/ministrytask`), My Tasks (`/tasks`), Service Checkin (`/servicecheckin`). |
| Icons | Home, admin panel, follow-the-signs, assignment, task-alt, bank/account-balance icons respectively. |
| Role rule | For Leader role, the **Service Checkin** item is disabled. |
| Closing | Clicking the drawer background, backdrop or any item closes it. Item clicks also navigate. |
| Missing links | People and PID Assessments are not in the drawer. |

### 5.3 Global feedback and loading patterns

- **Global top alert (Event Administration):** fixed at the top centre, high z-index, optional title, MUI severity, close icon, auto-dismiss after five seconds.
- **Native browser alerts:** used heavily on Follow Ups, My Tasks, Service Check-In, Payment and Create Person flows.
- **Page loader:** centred circular spinner occupying 80vh on Follow Ups, My Tasks, Ministry Tasks and Service Check-In; the Events screen relies mostly on DataGrid loading overlays.
- **Button loaders:** circular spinners on auth and check-in buttons; MoonLoader spinners on event/task/person submit buttons and grid popups.
- **Empty/loading grids:** several grids show a centred spinner overlay while data is loading. Empty DataGrids display their default "No rows" area unless a custom overlay is supplied.

### 5.4 Global things the site cannot do

- No global search.
- No notification bell or message centre.
- No profile edit, password change or account deletion.
- No help centre, onboarding tour or keyboard shortcut guide.
- No dark/light theme toggle.
- No language switcher; all copy is English.
- No public pages or footer outside the Home carousel.

---

## 6. Complete Route and Screen Catalogue

| # | Screen | Route / entry | Access | Main job |
|---|---|---|---|---|
| 1 | Registration / Sign Up / Log In | `/` when logged out; `/register` | Everyone | Create an account or authenticate. |
| 2 | Home | `/` when logged in | Any authenticated role | View the five-image autoplay carousel and copyright footer. |
| 3 | Event Administration | `/events`; navbar Events; drawer Events | Authenticated; Admin gets full scope | Browse event groups, search/filter events, open attendance, create/edit events, view task oversight. |
| 4 | Follow Ups | `/followups`; navbar Follow Ups; drawer Follow Ups | Authenticated | Log pastoral call/visit tasks and close open follow-up tasks. |
| 5 | My Tasks | `/tasks`; drawer My Tasks | Authenticated | See all open tasks assigned to the current user and close them. |
| 6 | Ministry Tasks | `/ministrytask`; navbar/drawer Ministry Tasks | Authenticated | View own completed-task count and disciples' completed-task counts by fixed period. |
| 7 | Service Check-In | `/servicecheckin`; navbar Service Check-In; drawer Service Checkin | Admin or Registrant | Check people into a service, add new people, capture converts, review service history. |
| 8 | People | `/people` (no nav link) | Authenticated | View a hard-coded management hierarchy demo. |
| 9 | PID Assessments | `/pidassessments` (no nav link) | Authenticated | Placeholder page with the text "PIDAssessments". |
| 10 | 404 | Any unknown path | Everyone | Display the text "404 Page Not Found". |

The following are not screens on the live site: `/cells` (no route), `/leader` (no route) and the legacy Cells components. See Section 36.

## 7. Screen 1 — Registration / Sign Up / Log In

**Route:** `/register`, or any protected route while logged out (including `/`)  
**Menu entry:** None; reached automatically by the route guard or directly by URL  
**Access:** Everyone  
**Purpose:** Create a new account or authenticate an existing user.

### 7.1 What you can do

- Switch between **Sign Up** and **Log In** tabs without leaving the page.
- Create an account with first name, surname, email and password.
- Log in with email and password.
- See field-level validation messages for missing or invalid values.
- See success, informational and error alerts above the form.
- Be automatically signed in and redirected to Home after a successful sign-up or login.
- Log out later from the navbar avatar menu.

### 7.2 Layout

- A single white card, maximum width 500px, centred horizontally with a 130px top margin and a large shadow.
- Two full-width MUI tabs at the top: **Sign Up** and **Log In**.
- The form area has a fixed height of 56.5vh with vertical scrolling.
- The submit button is fixed near the bottom of the viewport (100px from the bottom) and spans the card width, up to 500px.
- The global navbar remains visible above the card.

### 7.3 Shared behaviour

- Switching tabs clears any displayed alert.
- The navbar's mode is unchanged: logged-out users see the nav buttons but protected routes send them back to this form.
- There is no logo or marketing copy inside the card.
- There is no "forgot password", "remember me", password visibility toggle or email-verification flow.
- A logged-in user can still open `/register` manually and see the form; the page does not redirect them away.

### 7.4 Sign Up tab

#### Fields

| Field | Control | Required | Validation / behaviour |
|---|---|---|---|
| Name | Text | Yes | "Name is required". Display is title-cased (first letter upper, rest lower) while typing. |
| Surname | Text | Yes | "Surname is required". Display is title-cased while typing. |
| Email | Text (email) | Yes | Must match email format; "Invalid email format" or "Email is required". |
| Password | Password | Yes | Minimum 6 characters; "Password must be at least 6 characters" or "Password is required". |
| Role | Hidden | — | Always submitted as `Leader`; the user cannot choose Admin or Registrant. |

#### Behaviour

- Validation uses Yup with `validateOnBlur = false` and `validateOnChange = false` for the sign-up form, so errors are principally surfaced on submission rather than while typing.
- The **Sign Up** button is disabled only while the request is in progress; it is not disabled for an invalid form.
- Submitting sends `{ type: "signUpUser", name, surname, email, password, role: "Leader" }` to the sign-up Apps Script endpoint.
- On a successful response:
  - `loggedIn` is set to `"true"`.
  - The returned user object is stored as `authUser`.
  - A green **"Sign-up successful!"** alert appears.
  - After two seconds, the app navigates to `/` and reloads the window.
- If the backend responds without success, the backend's message is shown as an informational alert.
- Network or parsing failures show the error message as an error alert.
- Errors are shown using MUI's `Alert` with the severity supplied by the flow.

### 7.5 Log In tab

#### Fields

| Field | Control | Required | Validation / behaviour |
|---|---|---|---|
| Email | Text (email) | Yes | Email-format and required validation. First field has a large 100px top margin. |
| Password | Password | Yes | Minimum 6 characters and required. |

#### Behaviour

- Validation is live here: `validateOnBlur = true` and `validateOnChange = true`.
- The **Log In** button is disabled until the form is valid and while the request is loading.
- The button shows a small circular progress spinner as a start icon during the request.
- Submitting sends `{ type: "loginUser", email, password }` to the login endpoint.
- On success:
  - Stores `loggedIn` and `authUser`.
  - Shows a green **"Login successful!"** alert.
  - After two seconds, navigates to `/` and reloads the window.
- On a backend rejection, shows the returned message as an informational alert.
- On a thrown error, shows the error text as an error alert.

### 7.6 Alerts and loading states

- Alert area sits at the top of the scrollable form body.
- Severities used: `success`, `info`, `error`.
- No timeout is applied inside the form; alerts remain until the tab is changed or the page re-renders.
- There is no full-page loader; only the submit button spinner.

### 7.7 Limits and notes

- No password complexity beyond six characters.
- No password confirmation field.
- No password-reset or account-recovery flow.
- No email verification.
- No account lockout or rate-limit feedback in the UI.
- No terms-and-conditions checkbox.
- Self-registration can only create Leaders.
- Login state is a client-side localStorage flag; the route guard does not validate the session with the backend on load.
- The form does not offer a way to resend or recover a failed sign-up.
- Because the navbar is always shown, a logged-out visitor can click Events, Follow Ups, etc.; each protected route resolves back to this Registration screen.

---

## 8. Screen 2 — Home

**Route:** `/`  
**Menu entries:** Navbar logo, drawer **Home**  
**Access:** Any authenticated role  
**Purpose:** Visual landing screen for logged-in users.

### 8.1 What you can do

- View a full-width, full-height autoplay carousel of five images.
- Navigate to any other screen using the navbar or drawer.
- See the current-year copyright notice.

There is no dashboard, no metrics, no event summary, no task summary, no announcements and no quick-action buttons on Home.

### 8.2 Carousel details

| Property | Value |
|---|---|
| Images | `/img1.jpeg` through `/img5.jpeg` (five images). |
| Height | 100vh. |
| Width | 100%. |
| Fit | `object-fit: cover`, so images fill the slide and crop as needed. |
| Autoplay | Enabled with a 5,000ms delay between slides. |
| Interaction | Autoplay continues after user interaction (`disableOnInteraction: false`). |
| Loop | Enabled, so the carousel wraps continuously. |
| Modules | Only Swiper's Autoplay module is registered. |
| Captions | None. |
| Navigation arrows | None. |
| Pagination dots | None. |
| Pause/play control | None. |
| Slideshow content | Images only; no buttons or text overlays. |

### 8.3 Footer

- A black footer strip across the bottom, 8vh high.
- Centred text: `© {current year} Active Teams. All Rights Reserved.`
- The year is generated at runtime.
- No links, social icons, contact information or legal pages.

### 8.4 Layout and states

- The Home page receives zero top padding, so the fixed navbar overlays the top of the carousel.
- Because the carousel is 100vh and the footer adds another 8vh, the page can extend beyond the viewport and require scrolling.
- There are no loading indicators because the images are static assets.
- No role-specific content is shown beyond the global navbar/drawer.

### 8.5 Limits and notes

- There are no clickable slides.
- Images cannot be managed from the admin UI.
- No analytics or call-to-action tracking is present.
- Home is not accessible to logged-out visitors; they receive the Registration screen.

---

## 9. Screen 3 — Event Administration

**Route:** `/events`  
**Menu entries:** Navbar **Events**; drawer **Events**  
**Access:** Any authenticated user; data and controls vary by role  
**Purpose:** The operational hub for event groups, individual events, attendance, converts and Admin task oversight.

### 9.1 What you can do

- Browse all event groups as a row of selectable buttons.
- See a dynamic heading for the currently selected event group.
- Search events by event name or event leader.
- Filter events by weekday and status.
- Switch between Incomplete, Complete and Did not meet status views for Cells and Training.
- Open an event to capture attendees, associate people, review checked-in people, capture converts, enter payments and complete or mark the event as Did Not Meet.
- As Admin: create a new event in the selected group, create a new event group, edit an event, and initiate event-group deletion.
- As Admin or Registrant: open the Event Converts View drawer.
- As Admin: switch to the Tasks tab to view per-person completed-task counts and drill into a person's task completion data.
- Use the floating speed dial for create actions (Admin only).

### 9.2 Data loading and scope

On mount, the page loads three data sets:

1. **All people** — reduced to the fields Name, Number, Email, Leader @12, Leader @144, Leader @1728 and InvitedBy; a separate list of member names is kept for autocomplete.
2. **All tasks** — fetched as an Admin-wide task list. A current-week copy is also retained for the Tasks overview.
3. **All event groups** — used to build the event-group buttons, their sheet IDs and the selected group's data.

When an event group is selected, its events are fetched from the corresponding sheet. For non-Admin users the returned rows are reduced to:

- Events whose `Email` equals the logged-in user's email.
- Plus events whose `Leader at 12` equals the user's full `name + surname`.

Admins receive all rows.

The grid itself further filters through `processData`:

- `Date Of Event`, `Date Captured` and `Date Created` must all be valid dates.
- The event date must be strictly before the current moment.
- Invalid-date and future events are removed from the displayed rows.
- Valid dates are reformatted as `dd - mm - yyyy`.

### 9.3 Page layout, top to bottom

1. Global top alert (hidden unless triggered).
2. Title: **Event Administration**.
3. Two centred tabs: **Events** and **Tasks** (Tasks disabled for non-Admins).
4. Event-group button row (Events tab only).
5. Action row:
   - Search field with label **Search by Event Name or Event Leader**.
   - **Filter** button.
   - **View Converts** icon button for Admin/Registrant.
   - Large centred heading showing the selected event group name.
6. Floating speed dial at bottom-right (Admin only, Events tab).
7. Status filter buttons for Cells and Training only.
8. Event DataGrid.
9. Shared modals mounted at page level (event detail, edit, delete, task completion, filter, create event, covert task).

### 9.4 Event-group button row

- One black contained button per event group returned by the backend.
- The label is the event-group name, e.g. **Cells**, **Training** or any custom group.
- Clicking a button selects that group and reloads its event data.
- The default selected group on first load is **Cells**.
- Changing groups resets the status filter to **Incomplete**.
- For Admins, each button contains a white trash icon at its right edge. Clicking the trash icon stops propagation so it does not select the group; it opens the delete confirmation for that group.
- The group row is hidden on the Tasks tab.
- There is no "All groups" view and no event-group editing control.

### 9.5 Search

| Attribute | Detail |
|---|---|
| Label | **Search by Event Name or Event Leader** |
| Trigger | Live, on every keystroke. |
| Matching | Case-insensitive substring match against `Event Name` or `Leader`. |
| Scope | Client-side, current group's event data only. |
| Does not search | Attendees, email, address, date, day, status or notes. |
| Combined with | The selected status tab is re-applied via the filter routine. |
| On Tasks tab | The same field remains, but the filtering logic targets a task's `Assigned` value. The visible summary grid is not directly refreshed by this search, so the effect is not reliably visible. |
| Clear | Clearing the text restores the event-leader/event-name filter result (subject to status tab). |

### 9.6 Filter dialog

See Section 21 for the full filter-dialog specification. On the Events tab it provides:

- **Day** — Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday.
- **Status** — Complete or Incomplete.
- **Clear Filters** — resets the dialog's local fields and closes; it does not re-query or visibly clear the grid.
- **Cancel** — closes without applying.
- **Apply Filters** — applies the chosen day and/or status, then closes.

The dialog is titled **Filter Cells** on the Events tab regardless of the selected event group (legacy naming). It has no date picker, no custom range, no multi-select and no "Did Not Meet" option.

### 9.7 Status tabs (Cells and Training only)

Three status buttons are rendered only when the selected event group is exactly **Cells** or **Training**:

| Button | Colour treatment | Filter value |
|---|---|---|
| **Incomplete** | Orange when selected; outlined otherwise. | `Incomplete` |
| **Complete** | Green when selected; outlined otherwise. | `Complete` |
| **Did not meet** | Red when selected; outlined otherwise. | `Did Not Meet` |

- Default selection: **Incomplete**.
- Selection filters the current group's events by exact status.
- The status buttons are not shown for other groups; those groups show all statuses.
- Clicking a status button also re-applies the current search query.
- The buttons do not show counts.

### 9.8 Event DataGrid

**Configured page size:** 5 rows, with options for 5, 10 and 20.  
**Loading:** a centred circular progress overlay.  
**Selection:** selection is disabled; rows are not checkbox-selectable.  
**Sorting/filtering:** MUI column sorting and the default column menu are available; there is no grid toolbar and no export button.

Columns are dynamic, based on the first returned event row, but the known visible set is:

| Column | Applies to | Notes |
|---|---|---|
| **Event Name** | All groups | From the event record. |
| **Leader** | All groups | Event leader. |
| **Email** | Non-Cells (and effectively all due to the include rule) | The event owner's email. |
| **Day** | Cells | Weekday of the event. |
| **Leader at 12** | Cells | Secondary leader value. |
| **Date Of Event** | Cells | Display label for the `Date Captured` field, formatted `dd - mm - yyyy`. |
| **Open Event** | All roles | Icon button with an event-available icon; opens the Event Detail modal. |
| **Edit Event** | Admin only | Pencil icon; opens the Edit Event dialog for that row. |
| **Delete Event** | Admin only | Column and header exist, but the cell is intentionally empty in the current code, so no delete action is available from the row. |

For non-Cells groups, the dynamic column rule generally yields Event Name, Leader and Email plus Open Event. The grid does not show address, time, cost, rates, status or recurring flag as separate columns.

**Row identity:** the event `ID`.  
**No rows state:** default DataGrid empty area.

### 9.9 Row actions

**Open Event**

- Available to every role that can see the row.
- Sets the selected event and opens the Event Detail modal (Section 20).
- The modal fetches that specific event's attendee sheet using the event name and the selected group's sheet ID.
- The grid row remains unchanged while the modal is open.

**Edit Event (Admin)**

- Opens the Edit Event dialog (Section 19) pre-filled from the row.
- Saving updates the backend and the local event list.
- No success toast is shown for a successful edit; failures produce a native alert and console error.

**Delete Event (Admin)**

- The column is present but has no control. Event deletion is not available from the grid in the current UI.

### 9.10 Create actions (Admin only)

A floating MUI SpeedDial sits at the bottom-right of the Events tab. Its main icon switches between plus and minus when open.

Two actions:

| Action | Icon | Tooltip | Effect |
|---|---|---|---|
| Create event | Cell-tower icon | **Create New {selected group}** | Opens the Create New Event modal with the selected group preset (Section 17). |
| Create event group | Calendar/event icon | **Create New EventGroup** | Opens the Create New Event Group modal (Section 18). |

The speed dial is not rendered for non-Admins and is not rendered on the Tasks tab.

### 9.11 View Converts (Admin and Registrant)

- Icon button in the action row, inside the Events tab.
- Opens the full-screen Event Converts View drawer (Section 22).
- Loads all tasks of type `Church - Consolidation` from the Admin-wide task endpoint.
- The button is not shown for Leaders.

### 9.12 Tasks tab (Admin only)

The second tab is disabled for every non-Admin. When enabled it shows a completed-task oversight summary rather than the event grid.

**Search:** the event search field remains visible. Its task branch filters tasks by `Assigned`, but the displayed grid uses the separately computed `summary` state, so the search does not reliably change the visible summary.

**Filter:** the same Filter button opens a task-specific dialog titled **Filter People Tasks** with a **Status** dropdown containing fixed periods:

- This Week
- Last Week
- This Month
- Last Month

Despite the label "Status", the values are durations. Selecting one and applying:

- Uses the task's `Timestamp` (not Due Date) to select tasks inside the period.
- Computes a summary of **closed** tasks only, grouped by assignee.
- Displays one row per assignee with a count of closed tasks in that period.
- Falls back to the full task list if the period contains no tasks.
- Does not update the tab's search results.

**Summary grid columns:**

| Column | Detail |
|---|---|
| **Person** | Task assignee (`Assigned`). |
| **TaskCount** | Number of closed tasks in the chosen period. |
| **View Tasks** (`View All Tasks` field) | Blue **View** button that opens the Task Completion Data modal for that person. |

**Configured pagination:** 10 rows per page only, 400px-high grid.  
**Loading:** uses the event-loading state.  
**No create/edit/delete task controls** exist on this tab; it is read-only oversight.

### 9.13 Feedback and loading

- The page's own alert component is used for create/delete/capture messages with severity, optional title, close button and five-second auto-dismiss.
- Task fetch failures and event fetch failures produce error alerts.
- Event creation success: **"New event created successfully."**
- Event-group creation success: **"New event group created successfully."**
- Event/group creation failures: error alerts with the returned error appended.
- Data-grid loading uses a spinner overlay.
- There is no explicit empty-state illustration or onboarding prompt when a group has no events.

### 9.14 Role differences summary

| Capability | Leader | Registrant | Admin |
|---|---|---|---|
| View Events tab | Yes | Yes | Yes |
| Event data scope | Own/led only | Own/led only | All |
| Search/filter events | Yes | Yes | Yes |
| Open event details | Yes | Yes | Yes |
| Edit event | No | No | Yes |
| Create event/group | No | No | Yes |
| Delete group control | No | No | Yes (but blocked by confirmation logic) |
| View Converts | No | Yes | Yes |
| Tasks tab | Disabled | Disabled | Enabled |
| Capture attendees/converts inside event | Yes, if row visible | Yes | Yes |

### 9.15 Limits and notes

- No custom date range filter for events; only day-of-week and status.
- Future events are hidden by design in `processData`.
- Events with missing/invalid Date Of Event, Date Captured or Date Created are omitted entirely.
- Status tabs exist only for Cells and Training.
- The Filter dialog's "Clear Filters" does not restore the unfiltered list; it only clears the dialog state.
- Event deletion is non-functional from the visible UI (empty row action and a group-delete guard that rejects group deletion).
- The event grid has no export, no quick filter and no bulk actions.
- Search is not a backend search and only covers the current group's loaded rows.
- The Tasks tab is oversight only; tasks cannot be created there.
- The selected group defaults to Cells even if no Cells group exists; in that case the event fetch has no valid sheet ID and the screen can remain empty or error in the console.
- The page's `loading` state is effectively not used for a full-page loader; event loading is shown inside the grid.

---

## 10. Screen 4 — Follow Ups

**Route:** `/followups`  
**Menu entries:** Navbar **Follow Ups**; drawer **Follow Ups**  
**Access:** Any authenticated user  
**Purpose:** Log pastoral call/visit tasks and work through open follow-up tasks.

### 10.1 What you can do

- Load the current user's task list and church-member directory.
- Open a task logging modal from two prominent buttons.
- View open follow-up tasks in a table.
- Sort, filter, hide/show columns, change row density and export the grid via its toolbar.
- Open any follow-up task and change its status from Open to Closed.
- Remove a closed task from the local list immediately after a successful update.

### 10.2 Data loaded

On mount:

1. Fetches tasks for the current user's full name (`name + surname`).
2. Fetches all people names and the user's leader hierarchy.
3. Derives the user's "my leader" value from Leader @144, Leader @12 or Leader @1728 in that priority.
4. Stores all church member names for autocomplete in the task modal.
5. Stores tasks both in the shared task context and a local copy.

Errors during either fetch produce native browser alerts; no retry button is offered.

### 10.3 Layout

- Page title **Follow Ups** on the left.
- Two buttons on the right:
  - **Log Pastoral Call Task** — primary (blue).
  - **Log Pastoral Visit Task** — secondary (purple).
- Below: a full-width DataGrid in a 400px-high container.
- A page loader replaces the content while the initial fetch is in progress.

### 10.4 Task logging buttons

Both buttons open the exact same **Ministry Task** modal (Section 25). There is no hidden preset difference:

- Neither button preselects the task type "pastoral call" or "pastoral visit".
- The default task type is `awaiting-call` on this route.
- The user must manually choose the desired task type.

### 10.5 Follow Up table

**Rows shown:** tasks from the fetched list where `TaskType === "follow-up"` **and** `TaskStage === "open"`.

This means:

- Other task types (proper connect, wrong number, no answer, awaiting call, Church Consolidation) do not appear here.
- Closed follow-ups disappear.
- Follow-ups assigned to disciples can still appear if they were returned by the user-scoped task fetch; the table does not additionally filter by assignee.
- The list is not automatically refreshed after adding a new task; the new task generally requires a page reload to appear.

**Columns:**

| Column | Field | Detail |
|---|---|---|
| **TaskID** | `id` | Numeric task identifier. |
| **Recipient** | `Recipient` | Person the task is about. |
| **Task Type** | `TaskType` | Raw task type value, e.g. `follow-up`. |
| **Assigned To** | `Assigned` | Person responsible. |
| **Due Date** | `DueDate` | Stored date string. |
| **Assigned By** | `AssignedBy` | Person who created/assigned the task. |
| **Task Stage** | `TaskStage` | Red text when the value is exactly `Overdue`; green for every other value. |
| **Edit Task** | — | Blue text **Edit** button. |

**Configured pagination:** 5 rows; options 5, 10 and 15.  
**Toolbar:** standard MUI `GridToolbar` — column selector, filter panel, density selector and export.  
**Selection:** disabled.  
**Sorting:** all columns support header sorting.  
**Filtering:** the toolbar filter builder and each column menu can filter the currently loaded rows. There is no dedicated free-text search field and no date-range control. A due-date column filter operates on the string values rather than a calendar date picker.  
**Export:** the toolbar export menu can export the current grid data (CSV/print options provided by MUI), subject to the current filters.  
**Empty state:** default DataGrid "No rows" presentation.

### 10.6 Editing/closing a task

Clicking **Edit** opens the Edit Task Status modal (Section 26).

- The modal defaults to **Open**.
- The only options are Open and Closed.
- Clicking Save while Open shows a native alert telling the user to select Closed to close the task.
- Choosing Closed calls the edit-task endpoint with the task ID.
- On success:
  - The task is removed from the local Follow Ups list.
  - A native alert says **"Task Successfully updated"**.
  - The modal closes.
- On failure, a native alert is shown.
- The backend call sends only the task ID; the selected status is used as a UI gate, not as a separate status payload.

### 10.7 Feedback and loading

- Initial page: centred page loader.
- Add-task success: native alert **"Successfully Added a Task."**
- Add-task failure: native alert **"Failed to Add a Task: …"**
- Status update success: native alert **"Task Successfully updated"**.
- Fetch errors: native alerts; some errors only log to the console.
- No inline validation messages.
- No global toast system on this screen.

### 10.8 Hidden/unused controls on this screen

- A Create Person modal is mounted but never opened: the state starts false and no visible control sets it true on this screen.
- The task modal accepts an `eventGroupNames`/`eventGroups` path for converts, but Follow Ups uses the ordinary task configuration.
- Commented-out date inputs remain in the source above the buttons; they are not rendered.

### 10.9 Role differences

There are no role-specific controls on this screen. Any logged-in user can open the task modal and close tasks returned for them.

### 10.10 Limits and notes

- No direct "pastoral call" vs "pastoral visit" presets despite two buttons.
- Due Date & Time in the task modal is disabled and not user-editable.
- No date picker or custom date filter on the screen.
- No client-side form validation is enforced by the modal.
- No refresh after adding a task.
- The table only contains open follow-ups, so it cannot be used to review completed follow-up history.
- The toolbar filter can review no closed tasks because closed rows are excluded before the grid receives them.
- No bulk close, bulk reassignment or task deletion.
- No comments visible in the table, even though the modal can capture comments.

---

## 11. Screen 5 — My Tasks

**Route:** `/tasks`  
**Menu entry:** Drawer **My Tasks** (not present in the top navbar)  
**Access:** Any authenticated user  
**Purpose:** See all open tasks assigned to the current user and close them.

### 11.1 What you can do

- Load tasks scoped to the current user.
- Log a pastoral call or visit task using the same task modal.
- See all open tasks assigned specifically to the current user.
- Sort, filter, hide/show columns, change density and export.
- Close a task through the Edit Task Status modal.
- View task ID, recipient, type, due date, assigner and stage.

### 11.2 Data loaded

The screen fetches:

- Tasks for the current user's full name.
- All people names and the user's leader hierarchy (for modal autocomplete and task leader assignment).
- Stores member names, tasks, local task copy and "my leader".

Initial fetch failures show native alerts.

### 11.3 Layout

- Page heading **All Open Tasks**.
- The same two buttons as Follow Ups: **Log Pastoral Call Task** and **Log Pastoral Visit Task**.
- Full-width DataGrid occupying 80vh.
- Page loader during initial fetch.

### 11.4 Table

**Rows shown:** tasks where `TaskStage !== "closed"` **and** `Assigned === current user's full name`.

This includes every open task type assigned to the user, not only follow-ups.

**Columns:**

| Column | Field | Detail |
|---|---|---|
| **TaskID** | `id` | Task identifier. |
| **Recipient** | `Recipient` | Subject of the task. |
| **Task Type** | `TaskType` | Raw task type. |
| **Due Date** | `DueDate` | Stored date string. |
| **Assigned By** | `AssignedBy` | Creator/assigner. |
| **Task Stage** | `TaskStage` | Red if exactly `Overdue`, green otherwise. |
| **Edit Task** | — | Blue **Edit** button. |

**Configured pagination:** page size 10, only 10 per page; controlled pagination model.  
**Row count:** computed from the same open-and-assigned filter.  
**Toolbar:** standard GridToolbar (columns, filters, density, export).  
**Selection:** disabled.  
**Sorting/filtering:** header sorting and the standard filter builder work client-side. No dedicated date picker.  
**Export:** available via the toolbar.

### 11.5 Task actions

- **Log Pastoral Call Task** / **Log Pastoral Visit Task** both open the same Ministry Task modal; neither preselects a pastoral-call or pastoral-visit type.
- On this route the task modal allows a Task Stage of Open or Closed, includes a Comments box, and does not show the convert decision field.
- **Edit** opens the Edit Task Status modal; closing a task removes it from this grid.
- There is no delete action and no task detail drawer.

### 11.6 Feedback and loading

- Page loader while fetching.
- Native alerts for add-task success/failure and status update success/failure.
- No success toast after a task is added; the grid also does not update immediately.
- Console errors for some fetch failures.

### 11.7 Limits and notes

- Only open tasks assigned to the current user; team tasks assigned to others are not shown here (they can appear on Follow Ups depending on the fetch).
- No filters dedicated to task type, date range or status beyond the DataGrid column controls.
- No direct link to the recipient's person record.
- No refresh after adding a task.
- No visible comments/history in the table.
- No task creation for someone else except through the modal's Assigned To field.

---

## 12. Screen 6 — Ministry Tasks

**Route:** `/ministrytask`  
**Menu entries:** Navbar **Ministry Tasks**; drawer **Ministry Tasks**  
**Access:** Any authenticated user  
**Purpose:** Show a period-based summary of the user's completed tasks and their disciples' completed tasks.

### 12.1 What you can do

- Switch the reporting period among four fixed options.
- See a card with the number of your completed tasks in the selected period.
- See a **Disciples Tasks** section when there is team activity.
- Expand a disciple accordion to see completed-task counts for that disciple and their own disciples.
- Read the summary without any table, editing or export controls.

### 12.2 Data loaded

On mount the screen fetches tasks for the current user's full name and stores them in shared and local task state. It computes team summaries from those tasks.

There is no separate people fetch on this screen; it relies on the task records' `Assigned`, `Leader` and `TaskStage` fields.

### 12.3 Layout

- Light grey page background (`#f5f5f5`), minimum height 100vh, 4-unit padding.
- Heading: **Ministry Task Overview**.
- Filter row: text **Filter tasks by:** and a small outlined select on the right.
- A white elevated card: **Your Completed Tasks** with a large numeric count.
- A **Disciples Tasks** heading and accordion list, shown only if there are team tasks.

### 12.4 Period filter

| Option | Value | Range logic |
|---|---|---|
| **This Week** | `this-week` (default) | Monday 00:00 through Sunday 23:59:59.999 of the current week. |
| **This Month** | `this-month` | First day of the current month through its last day. |
| **Last Week** | `last-week` | Previous Monday through previous Sunday. |
| **Last Month** | `last-month` | First day of last month through last day of last month. |

- Filtering compares each task's **Timestamp** (not Due Date) with the range.
- Changing the select recomputes the summary immediately.
- There is no custom range, no date picker, no "This Year", no "All time" and no per-day option.
- The filter applies only to the summary; there is no task list to inspect.

### 12.5 "Your Completed Tasks" card

- Shows the count of tasks in the selected period where:
  - `Assigned` equals the current user's full name, and
  - `TaskStage === "closed"`.
- The number is displayed as a large heading.
- Open or overdue tasks are not counted.
- Tasks assigned to the user but outside the period are excluded.

### 12.6 Disciples Tasks section

The team calculation:

1. Looks through tasks in the selected period.
2. Identifies tasks whose `Leader` equals the current user.
3. Groups by the task's `Assigned` person, avoiding duplicate names.
4. For each such person:
   - Counts their closed tasks in the period.
   - Finds tasks whose `Leader` equals that person to identify their own disciples.
   - Adds one direct disciple entry and counts that disciple's closed tasks in the period.
5. Builds an accordion per direct disciple.

**Accordion summary shows:**

- Disciple name.
- **Completed Tasks: N**.

**Accordion details show:**

- Subheading **Disciples**.
- A divider.
- One card per sub-disciple with the person's name and **Completed Tasks: N**.
- If there are no sub-disciples, the details still render with an empty list.

The section is omitted entirely when there are no qualifying team tasks.

### 12.7 Feedback and loading

- Full-page centred loader while fetching.
- Fetch errors are logged to the console; there is no user-facing error message or retry.
- Empty counts show 0.
- No skeleton placeholders.

### 12.8 Role differences

There are none; every logged-in role sees the same calculation for themselves.

### 12.9 Limits and notes

- Only closed tasks are counted; there is no view of open, overdue or in-progress tasks.
- Only fixed periods; no custom date range.
- No search, export, drill-down, task list or click-through to a task.
- The heading is wired to a click handler that calls an undefined `mini()` function; clicking the heading can throw a runtime error and produces no visible feature.
- The team algorithm uses one direct-disciple record per assignee and may not represent the full hierarchy if names repeat or if task leadership data is incomplete.
- No distinction between task types in the summary.
- No pagination because the content is accordion-based.

---

## 13. Screen 7 — Service Check-In

**Route:** `/servicecheckin`  
**Menu entries:** Navbar **Service Check-In**; drawer **Service Checkin**  
**Access:** Admin or Registrant only  
**Purpose:** Check church members into a weekend service, add new people, capture converts/consolidations and review service attendance history.

### 13.1 What you can do

- See a directory of all people with their contact and leader information.
- Check a person into a service on an eligible service day.
- Choose between Active Kids Service and Active Service for the check-in.
- Search the check-in table by person.
- Export the check-in table.
- Add a brand-new person and create their follow-up task.
- Capture a convert/consolidation with a first-time or re-commitment decision.
- Switch to History to see attendance counts by date/service.
- Drill into who attended a given service.
- Drill into people who were both new and attended that service.
- Drill into converts/consolidations for that service, with commitment totals.
- Open the same converts view from the main tab controls.

### 13.2 Access behaviour

- The route allows a logged-in Admin, or a user whose stored role is Registrant.
- A logged-in Leader is redirected to the Registration/Login screen.
- The drawer disables the Service Checkin item for Leader, but the top navbar still shows Service Check-In. Clicking it as a Leader lands on the Registration screen.

### 13.3 Data loaded

On mount the screen:

1. Fetches all tasks for Admin and flattens them.
2. Keeps only tasks with `TaskType === "Church - Consolidation"`.
3. Fetches all people.
4. Scans the keys of the first person record with the regex `/^\d{1,2} \w+ \d{4}/` to find date-like attendance columns.
5. For each such key, counts how many people have a value of `true`.
6. Builds the History rows as `{ date: key, numoftime: count }`.
7. Renders a page loader during the initial load.

The attendee identity table uses the people list directly. Each check-in writes a date-and-service property to the person's record.

### 13.4 Layout

- Page heading **Service Check-In**, 24px bold.
- Centred tabs across 95% width:
  - **Check in** with a home-plus icon.
  - **History** with a schedule icon.
- Next to the tabs: an icon-only **Add Person** button (person-add icon).
- Next to that: an orange/orange-red **Capture Coverts** button (diversity icon), with tooltip.
- Tab panels below.
- A top-centred success alert appears over the content for three seconds after a check-in.

### 13.5 Check in tab

#### Table

| Column | Field | Width | Behaviour |
|---|---|---|---|
| **Check-In** | Generated | 90px | Contained button with a hospital/plus icon. Opens the Member Check-In modal. Disabled when no service options exist or the person is already checked in for today. |
| **Full name** | `Name` | 195px | Plain text. |
| **Email** | `Email` | 250px | Plain text. |
| **Number** | `Number` | 180px | Plain text. |
| **Leader 12** | `Leader @144` | 150px | Despite the header, this column reads the `Leader @144` field. |
| **Leader 144** | `Leader @ 1728` | 150px | Despite the header, this column reads the `Leader @ 1728` field. |

**Row identity:** `ID`.  
**Configured page size:** 10, only 10 per page.  
**Height:** 500px.  
**Quick filter:** custom toolbar labelled **Search Person:** with MUI quick filter. It filters across the visible columns.  
**Export:** toolbar export button.  
**Column selector / density:** imported but commented out; not available.  
**Selection:** disabled.  
**Sorting:** header sorting available.  
**No toolbar filter builder** beyond the quick filter; no column menu customization is exposed by a toolbar, but the default column menu remains available.

#### Check-in eligibility by day

Service options are generated based on the current weekday:

| Day | Options | Time in option label |
|---|---|---|
| Friday | Active Kids Service, Active Service | 18:30 |
| Sunday | Active Kids Service, Active Service | 09:00 |
| Monday | Active Kids Service, Active Service | 09:00 |
| Tuesday–Thursday, Saturday | None | No check-in possible |

- The default selected service is the **Active Kids Service** option.
- On ineligible days the dropdown is empty, the service select is disabled, and every Check-In button is disabled.
- The check-in button is also disabled if the person is already detected as checked in for today. Detection checks several generated property keys for both Active Kids and Active Service at the current day/time.
- There is no manual date override, so historical check-ins cannot be entered from this screen.

#### Member Check-In modal

| Element | Detail |
|---|---|
| Title | **Member Check-In** |
| Subtitle | **Checking in {person's full name}** |
| Service selector | MUI select labelled **Choose**; options are the two service strings above. Disabled if no options. |
| Close | Closes the modal and clears the selected service. |
| Save | Disabled if no service is selected or while saving; shows a circular progress spinner while posting. |

On Save:

- Builds a request with `id`, `dateAndService: "dd Month yyyy - {service}"`, `checkedIn: true` and `type: "ServiceCheckIn"`.
- Posts it to the check-in Apps Script endpoint.
- On success:
  - Shows the success alert: **"{Full Name} Checked In for {service}"**.
  - Updates the local row's checked-in state and the shared people list.
  - Closes the modal.
- On error:
  - Logs the error.
  - Closes the modal.
  - Does not show a failure alert.
- The success alert auto-hides after three seconds.

#### Add Person

- Icon-only button with title **Add Person** on the tab strip.
- Opens the two-tab Create New Person modal (Section 24).
- The modal collects the person's details and leader info, creates a unique six-digit ID, posts the person, creates a follow-up task for the inviter's leader, shows **"Successfully created New Person."**, and closes.
- No success toast is added to the History counts until data is reloaded.

#### Capture Coverts

- Orange button with tooltip **Capture Coverts**.
- Opens the Ministry Task modal in covert mode (Section 25).
- On this route:
  - Task type is preselected to **Church - Consolidation**.
  - Event Type and Event fields are hidden.
  - Recipient and Assigned To are free-solo member fields.
  - Due Date & Time is disabled and shows the current timestamp.
  - A decision select offers **First-time commitment** and **Re-commitment**.
  - Task Stage is locked to Open.
  - Comments are hidden.
- Finish creates a task and shows the native alert **"Successfully captured covert"** (or a failure alert).

### 13.6 History tab

#### History table

| Column | Field | Behaviour |
|---|---|---|
| **Date** | `date` | The full date-and-service column key, e.g. a service date followed by the service name and time. |
| **Attendance Count** | `numoftime` | Number of people marked `true` for that date/service key. |
| **Coverts Count** | `coverts` | Column exists, but the history row builder never sets this field, so it renders empty. |
| **View Details** | Action | Magnifier icon button; opens the Attendance Details modal filtered to that date key. |
| **View New People** | Action | People icon button; opens the Attendance Details modal restricted to people whose `Date Created` includes that date. |
| **View Converts/Consolidations** | Action | Transform icon button; opens the Task Completion Data modal for converts on that service date, with commitment counts. |

- The table is a DataGrid with no explicit page-size configuration, no toolbar, no export and no dedicated date filter.
- Rows are in the order produced by scanning the person record's date-like keys.
- The "Date" column includes the service name/time if the key includes it, which is how different services on the same day remain separate rows.
- Clicking a row itself does nothing; only the action buttons respond.
- History has no date picker and no custom range. The only way to inspect a period is to scan the generated rows.

#### Attendance Details modal

Used by both **View Details** and **View New People**:

| Element | Detail |
|---|---|
| Size | 90% width, 95% height, full-screen-like modal. |
| Title | **Attendance for {service part of the date key}**. |
| Subtitle | **Date: {date portion}**. |
| Search | Text field labelled **Search by Name or Leader @12**; filters by person name or `Leader @144` (displayed as the Leader 12 level). |
| Table columns | Full Name; Email; **Leader @1** (reads `Leader @12`); **Leader @12** (reads `Leader @144`); **Leader @144** (reads `Leader @ 1728`). |
| Page size | 5 rows; options 5, 10 and 20. |
| Close | Button at the bottom; also closes on modal close. |
| New People mode | Same modal, but the attendee list is first restricted to people whose formatted `Date Created` includes the selected date. |

The search clears when the modal closes. If a person lacks the field used by the search (for example a newly created person without a `Leader @144` value), the search logic can error rather than simply showing no results.

#### Convert counts and Task Completion modal

When **View Converts/Consolidations** is used, the screen:

1. Formats every Church Consolidation task's `DueDate` as `dd Month yyyy` in lower case.
2. Formats the selected service date the same way.
3. Keeps tasks whose formatted due date matches.
4. Counts `re-commitment` and `first-time commitment` decisions.
5. Opens the Task Completion Data modal with those counts.

The modal (Section 23) shows:

- Title **People that gave their lives**.
- Summary cards: **Recommitments**, **First-time Commitments**, **Total**.
- A free-text filter by Recipient.
- A grid of Assigned To, Recipient, AssignedBy, Task Type, Task Stage and Decision.
- A Close button.

### 13.7 Feedback and loading

- Full-page spinner while the initial task/people/history fetch is running.
- Check-in success: green MUI alert at the top for three seconds.
- Check-in failure: console only.
- Add-person success: native alert; errors: native alert with message.
- Capture-covert success: native alert; failure: native alert.
- The check-in DataGrid shows a loading spinner when the data array is empty during load.
- No empty-state guidance beyond "No rows".

### 13.8 Role differences

| Capability | Leader | Registrant | Admin |
|---|---|---|---|
| Open screen | No (route guard) | Yes | Yes |
| View people/check-in grid | No | Yes | Yes |
| Check in | No | Yes | Yes |
| Add person | No | Yes | Yes |
| Capture converts | No | Yes | Yes |
| View history details/converts | No | Yes | Yes |
| Drawer item | Disabled | Enabled | Enabled |

### 13.9 Limits and notes

- Check-in only works on Friday, Sunday and Monday, with only two fixed service options.
- No custom date or service entry; no back-dated check-in.
- No way to undo a check-in from this screen.
- Success detection relies on generated date/time property keys and can mismatch if the sheet's column naming differs.
- Attendance counts are computed from date-like keys on the first person's row; they depend on consistent sheet headers.
- The **Coverts Count** column is blank because no count is attached to history rows.
- The history table has no date range, status filter, search, sort presets, export or pagination controls.
- The attendance modal's leader column labels are shifted by one level relative to the underlying fields.
- The new-person filter compares a formatted `Date Created` string, so exact formatting matters.
- The Add Person modal's task creation uses first-name/last-name fields that are not present in the reviewed form data, which can produce an incomplete recipient value in the generated follow-up task.
- Data is not automatically refreshed after adding a person or task; a reload is the reliable way to see new history counts.

---

## 14. Screen 8 — People (URL-Only Screen)

**Route:** `/people`  
**Menu entry:** None  
**Access:** Any authenticated user who knows or types the URL  
**Purpose:** Display a hard-coded management hierarchy demonstration.

### 14.1 What you can do

- View a page titled **Management System**.
- See one card for a manager named **John Doe**.
- See the label **Des:** (short for disciples/designates).
- See two second-level people: **Alice Smith** and **Bob Johnson**.
- Expand or collapse each second-level person with a chevron icon.
- When expanded, see the people they manage:
  - Alice Smith → Jake Brown, Emily White.
  - Bob Johnson → Sophia Green, Michael Black.

### 14.2 Layout and interaction

- Page padding of 4 units; content can scroll horizontally if needed.
- Main content sits inside a raised paper container with a maximum height of 80vh and vertical scrolling.
- Each manager is rendered in a card; John Doe has a divider and the **Des:** heading.
- Each person row is a list item.
- Rows with children show an expand/collapse icon (expand-more or expand-less).
- Children are indented 4 units and rendered recursively.
- Grandchildren have no further expansion icon.

### 14.3 Data and actions

- All names and relationships are hard-coded in the component.
- No backend request.
- No add, edit, delete, search, filter, sort, export or navigation.
- No link to a person's tasks, events or attendance.
- No loading or error states.

### 14.4 Role differences

None. Every logged-in user sees exactly the same demo, regardless of role.

### 14.5 Limits and notes

- This is not a real people directory, despite the route name.
- It is not linked from the navbar or drawer.
- The real people data is used inside Event Administration, Service Check-In and the Create Person/task modals, but People does not expose it.
- The page provides no way to view member status, contact details, leaders or attendance history.

---

## 15. Screen 9 — PID Assessments (Placeholder)

**Route:** `/pidassessments`  
**Menu entry:** None  
**Access:** Any authenticated user  
**Purpose:** Placeholder only.

### 15.1 What you can do

- See the literal text **PIDAssessments** centered at the top of an otherwise empty page.

### 15.2 What is absent

- No assessment list.
- No form.
- No scoring, history, filters or reports.
- No navigation link.
- No data loading.
- No role-specific content.

This route currently provides no business capability.

---

## 16. Screen 10 — 404 Page Not Found

**Route:** Any unmatched path  
**Access:** Everyone  
**Purpose:** Indicate that the requested URL does not exist.

### 16.1 What you can do

- See the plain text **404 Page Not Found**.
- Use the global navbar or drawer to return to a known screen.

### 16.2 Limits

- No styled 404 illustration.
- No search.
- No suggested links or "back to home" button.
- No automatic redirect.

---

## 17. Sub-Screen A — Create New Event Modal

**Entry:** Admin Events tab → floating speed-dial → **Create New {selected group}**  
**Used on:** Event Administration  
**Access:** Admin only

### 17.1 Purpose

Create one individual event inside the currently selected event group.

### 17.2 Modal layout

- A UTF-8 MUI Modal with a white panel.
- Responsive width: 90% on small screens, 80% on small-to-medium, 60% on medium, 50% on large.
- Maximum height 90vh with internal vertical scrolling.
- Centered title: **Create New {selected event group}**.
- Cancel and Submit buttons side by side at the bottom; they stack on very small screens.

### 17.3 Fields

| Field | Control | Details |
|---|---|---|
| **Event Name** | Text | Free text. No uniqueness or length validation. |
| **Event Type** | Select | Disabled. Shows only the currently selected group. |
| **Price** | Number | Prefix **R**; minimum 0 and step 0.01 in the input metadata; right-aligned text. The price block is rendered for every event because the display condition is always true for individual events, regardless of the group's ticketed flag. |
| **Rate Name** | Text | Used with Rate Value to add a named rate. |
| **Rate Value (e.g. R200)** | Text | Free text; not forced numeric. |
| **Add Rate** | Button | Adds `{name, value}` to a visible rate list. Does nothing when either field is blank. |
| **Rate list** | List | Each added rate shows its name, secondary text **Value: …**, and a red delete icon. There is no limit and no editing of an existing row. |
| **Time** | Time input | Native time control. |
| **Date of Event** | Date input | Native date control. Changing it calculates the weekday and fills the Day field. |
| **Day** | Select | Disabled. Values are Monday through Sunday, derived automatically from the selected date. |
| **Reoccurring** | Select | True / False. Initial value false. |
| **Event Leader** | Autocomplete (free solo) | Options are all member names; filters case-insensitively and limits suggestions to 10. Marked required visually; no blocking validation. |
| **Leader at 12** | Text | Only rendered when the current event type is exactly `Cells` (or under a specific empty-string branch). Not shown for other groups. |
| **Address** | Text | Free text. |
| **Cancel** | Outlined button | Closes without saving and resets the loading flag. |
| **Submit** | Contained button | Shows a MoonLoader while submitting; otherwise says **Submit**. |

### 17.4 Submission behaviour

1. Sets loading true.
2. Removes the internal `isTicketed` flag from the payload.
3. Builds an event record containing:
   - Event Name, Leader, Leader at 12, Day, Time, Address
   - Date Created (initially blank in the form state)
   - Date Of Event
   - Event Type (selected group)
   - Cost, Rate array
   - Status `Incomplete`
   - Email of the logged-in user
   - ID = current timestamp in milliseconds
   - Date Captured (blank in the form state)
   - SheetID of the selected event group
   - Reoccurring
4. Calls the create-event endpoint.
5. On success:
   - Adds the new event to the local event and filtered-event lists.
   - Shows the global success alert **"New event created successfully."**
   - Closes the modal.
6. On failure:
   - Shows an error alert with the returned error.
   - Closes the modal after the loading state resets.

### 17.5 Validation and defaults

- No required-field enforcement.
- No date-in-the-past restriction.
- No minimum/maximum event-name length.
- No duplicate-event check.
- Event Type cannot be changed from the modal; change the group first.
- Reoccurring is sent as a boolean but the select starts unset/false visually.
- Rates are stored as an array of objects but are not editable after being added; delete and re-add is the only correction.
- The Date Created and Date Captured values are not populated by this form; downstream date validation can therefore hide newly created events until the backend fills those fields.

### 17.6 Loading and dismissing

- Clicking Cancel or the modal backdrop closes it.
- There is no explicit X button.
- Submit shows a loader until the request resolves, then closes.
- No confirmation is shown before discarding typed data.

### 17.7 Limits

- No recurrence pattern builder; "Reoccurring" is only a True/False flag.
- No capacity, room, organizer email, description, visibility or ticket-type fields.
- No validation errors next to fields.
- The rate UI is a simple name/value list, not a price-tier system.
- Cost and rates can be entered even when the group is not ticketed.

---

## 18. Sub-Screen B — Create New Event Group Modal

**Entry:** Admin Events tab → floating speed-dial → **Create New EventGroup**  
**Used on:** Event Administration  
**Access:** Admin only

### 18.1 Purpose

Create a new group (sheet/category) that will then appear as an event-group button and can contain individual events.

### 18.2 Fields

| Field | Control | Details |
|---|---|---|
| **Event Group Name** | Text | The visible name of the new group. No validation or duplicate check. |
| **Ticketed** | Checkbox | Marks the group as ticketed. |
| **Global Event** | Checkbox | A group-level flag. |
| **Person Steps** | Checkbox | A group-level flag. |
| **Event Description** | Multiline text | Four visible rows; outlined; placeholder **"Enter a detailed description of the event..."**. |
| **Cancel** | Outlined button | Closes without saving. |
| **Submit** | Contained button | Shows MoonLoader while creating. |

### 18.3 Behaviour

- Submits `{ "Event Group", Ticketed, Global, Description, PersonSteps }` to the create-group endpoint.
- On success:
  - Builds a local group object with EventType, Ticketed, Global, Discription, PersonSteps, Date Created and SheetID.
  - Appends the group to the local group list.
  - Rebuilds the event-type buttons.
  - Shows **"New event group created successfully."**
- On failure: shows an error alert.
- The form resets after submission.
- No editing or deleting individual group flags exists after creation.

### 18.4 Limits

- No validation that the group name is unique.
- No configuration of columns, check-in rules, service days, owner or permissions.
- No confirmation that the backing sheet was created correctly beyond the displayed success message.
- The new group is added locally, but a page reload is the reliable way to re-fetch the authoritative list.

---

## 19. Sub-Screen C — Edit Event Dialog

**Entry:** Event Administration → row **Edit Event** pencil icon  
**Access:** Admin only  
**Purpose:** Modify selected fields of an existing event.

### 19.1 Dialog layout

- MUI Dialog titled **Edit Event**.
- Fields are generated dynamically from the keys of the selected event row.
- Scrolls when the field list exceeds the viewport.
- Dialog actions: **Cancel** and **Save**; Save shows a MoonLoader while saving.

### 19.2 Fields shown

The dialog deliberately excludes these fields:

- ID
- Event Type
- Email
- Rate
- Date Created
- Date Captured
- Leader at 12
- Time
- Cost when the group is not ticketed

Everything else that exists on the event row is rendered:

| Field type | Rendering |
|---|---|
| **Cost** | Number input with a leading **R**, only for ticketed groups. |
| **Status** | Select with **Complete** and **Incomplete** only. `Did Not Meet` is not available here. |
| **Reoccurring** | Select with True/False. |
| **Date Of Event** | Native date input. Changing it also recalculates the Day field. |
| **Leader** | Free-solo autocomplete with all member names, max 10 suggestions. |
| **Day** | Disabled select (Monday–Sunday), so it cannot be manually overridden; it follows the date field. |
| **Other fields** | Free-text input. |

### 19.3 Save behaviour

1. Adds the group's SheetID to the form data.
2. Calls the edit-event endpoint.
3. On failure: logs and shows a native alert **"Failed to Update Event. Please try again later."**
4. On success:
   - Replaces the matching event in the local event list with the edited form values.
   - Closes the dialog.
   - Shows no success message.
5. The date-derived Day is included in the save payload.
6. The backend is the source of truth, but the local list is updated optimistically from the form state.

### 19.4 Validation and limits

- No field-level validation in the dialog.
- No way to edit Event Type, Time, Rate, Leader at 12, Date Created or Date Captured.
- Status cannot be set to Did Not Meet.
- No confirmation for unsaved changes.
- No audit note or reason-for-change field.
- The dialog's dynamic field list depends on the row's keys; missing keys mean missing controls.

---

## 20. Sub-Screen D — Event Detail Modal

**Entry:** Event Administration → **Open Event** icon on a row; also used by the Admin event flow  
**Access:** Any role that can see the row  
**Purpose:** Capture attendance, associate existing people, review checked-in people, capture converts, record payments and complete the event.

### 20.1 Opening and data loading

- Clicking **Open Event** sets the selected row and opens the modal.
- The parent fetches the event's attendee records using:
  - the event name (`Event Name` from the row), and
  - the selected event group's `SheetID`.
- While fetching, the capture table shows a loading overlay.
- The modal is large: 80% width, maximum 900px, white panel, rounded corners, 3-unit padding, top margin 3%.

### 20.2 Header and top actions

- Centered title: **Current Event Information**.
- The selected event's name is not shown as a heading in the modal.
- Top-left action row:
  - **Add Person** — icon-only person-add button with title "Add Person".
  - **Capture Coverts** — orange icon button with tooltip "Capture Coverts".
- Both controls are available regardless of active tab.
- Add Person opens the Create New Person modal (Section 24).
- Capture Coverts opens the covert/consolidation task modal (Section 25).

### 20.3 Tabs

Three centered tabs:

1. **Capture Attendees**
2. **Associate Person**
3. **Checked In People**

Switching tabs resets the search term and switches the search population to the relevant list.

### 20.4 Tab 1 — Capture Attendees

**Purpose:** Work with the event's existing attendee/attendance records and mark each person as captured.

**Search**

- Label: **Search Person By Name**.
- Search icon at the end of the field.
- Filters the current event data across all values (case-insensitive substring).
- Clearing the field restores the last snapshot of current event data.

**Table**

- Rows: the event's attendee records, with a generated row index for identity.
- Configured page size: 5 rows.
- Loading overlay: centered circular progress while the parent fetches.
- The column set is dynamic from the first attendee record, but identity fields are deliberately hidden:
  - `Attendees ID` is hidden.
  - `Attendees Leader At 12` and `Attendees Leader At 144` are hidden.
  - `Attendees Payment` is shown for ticketed groups; for non-ticketed groups it may be hidden.
  - Date-like attendance columns are removed.
- A final **Capture Person** column is always present.

**Capture Person column**

- Icon-only button with a person-add icon.
- Blue icon: not captured.
- Green icon: captured.
- MoonLoader spinner while the capture action runs.
- Clicking it behaves differently by group and tab:
  - **Ticketed group:** opens the Payment Confirmation modal for that attendee; payment and capture are handled there.
  - **Non-ticketed group, Capture Attendees tab:** toggles the attendee's captured state against the event sheet and updates the local row.
  - **Checked In People tab:** adds the selected checked-in person to the event as an attendee.
- There is no bulk capture, no select-all and no undo beyond clicking the same icon again where toggling is supported.

### 20.5 Tab 2 — Associate Person

**Purpose:** Find an existing person from the full people directory and add them to the event.

**Search**

- Label: **Search Person By Name**.
- Filters the full people list across all values.
- Clearing restores the full list.

**Table**

- Rows: all people from the shared people context.
- Columns are generated from the keys of the first person object, plus an **Add Person** action column. This means the visible fields depend on the people sheet's columns (typically name, contact and leader fields).
- Configured page size: 5; options 5, 10 and 20.
- Selection disabled.
- Action column: blue person-add icon.
- Clicking Add Person sends the person to the event as an attendee and appends them to the local attendee list with `isCaptured: false`.
- A global success alert names the person and says they were added to the event.
- There is no removal action on this tab.

### 20.6 Tab 3 — Checked In People

**Purpose:** Review people derived as checked in for this event date.

**How the list is derived**

1. The event's `Date Captured` is parsed into `dd Month yyyy`.
2. Every attendee record is scanned for date-like keys whose value is `true`.
3. Those dates are normalized and grouped.
4. The group matching the event date becomes the checked-in population.
5. Each attendee record is annotated with `isCaptured` by matching attendee emails between the event data and that population.

**Search**

- Label: **Search Person By Name**.
- Filters the checked-in population across all values.
- Clearing restores the checked-in list.

**Table**

- Rows: the derived checked-in people.
- Columns are generated dynamically from the first checked-in record, excluding `undefined`, `Attendees ID` and `isCaptured`; date-like columns are excluded.
- Configured page size: 5; options 5, 10 and 20.
- Selection disabled.
- No action column. The table is read-only apart from search.

### 20.7 Add Person flow from this modal

- Opens the two-tab Create New Person form.
- The modal receives the full people list (and optionally all member names), plus the invitee setter.
- On submission the person is created, a follow-up task is generated for the inviter's leader, the new person is added to the event, and a success alert is shown.
- The create-person form is described in Section 24.
- Errors appear through the parent showAlert callback.

### 20.8 Capture Coverts flow from this modal

- Opens the Ministry Task modal in event mode.
- Because the route is `/events`, the modal shows **Event Type** and an event-name autocomplete in addition to the normal task fields.
- The task type can be set to **Church - Consolidation**.
- The user selects a first-time or re-commitment decision.
- Finish posts the task and shows an alert from the covert button flow.
- This is the same covert task used by Service Check-In; the event mode additionally ties the task to an event name.

### 20.9 Payment Confirmation for ticketed events

When a capture action is taken on a ticketed group, the Payment Confirmation modal opens (Section 27).

- **Amount Due** comes from the event's `Cost`.
- **Amount already paid** comes from the attendee's `Attendees Payment`.
- The user enters an **Amount Paid**.
- **Amount Remaining** updates as `amountDue - (alreadyPaid + amountPaid)`.
- Blank input is rejected with **"Amount is required to continue"**.
- An amount greater than the amount due is rejected with **"Amount paid cannot exceed amount due"**.
- Underpayment triggers a native alert **"User did not pay the full price."** and marks the person red before still submitting the capture.
- Full payment marks the person green.
- Confirm submits the updated payment and closes.
- There is no payment method, reference, receipt, refund or partial-payment history screen.

### 20.10 Footer actions

| Action | Style | Behaviour |
|---|---|---|
| **Close** | Outlined secondary | Clears the selected event, resets search and the active tab, and closes. Disabled while saving or marking Did Not Meet; shows a small spinner in that state. |
| **Did Not Meet** | Contained error/red | Calls the save-event endpoint with action `Did Not Meet` for the selected event ID and group sheet. On success shows **"Marked as Did Not Meet"** and closes. On failure shows an error alert. |
| **Save** | Contained success/green | Calls the save-event endpoint with action `Complete`. On success shows **"Event data saved successfully"** and closes. On failure shows an error alert. |

- Both status actions act on the selected event row's ID.
- Buttons are disabled while either operation is in progress.
- Closing without saving does not roll back attendance captures already made; those write immediately.

### 20.11 Feedback and states

- Parent-level top alert for success/error messages.
- Capture/associate actions show the person's name in the success message.
- Event saving shows dedicated success messages.
- Payment underpayment uses a native alert.
- Loading overlays on the capture grid.
- No empty-state instructions when there are no attendees.

### 20.12 Limits and notes

- No event name/date summary at the top of the modal.
- No bulk attendance capture.
- No remove-attendee action separate from toggling capture on the first tab.
- Payment flow is single-amount only and allows underpayment with a warning, not a hard stop.
- Negative payment values are not explicitly blocked by a minimum.
- The checked-in population depends on dated boolean columns being present and named consistently.
- The event status is updated on the backend, but the parent event grid is not obviously reconciled from the modal after save.
- The attendee tables have no export, filter builder, column selector or density selector.
- Search is local only and can be lost when switching tabs.
- The dynamic column logic can produce different columns depending on the first record's shape.

---

## 21. Sub-Screen E — Event Filter Dialog

**Entry:** Event Administration → **Filter** button  
**Tabs affected:** Events and Tasks (Admin only)  
**Purpose:** Narrow event rows by day/status or narrow the Admin task summary by a fixed reporting period.

### 21.1 Dialog layout

- MUI Dialog, full width with a small max width.
- Title changes by tab:
  - Events tab: **Filter Cells**.
  - Tasks tab: **Filter People Tasks**.
- Subtitle: **Select filters to narrow down your results.**
- Fields stack vertically with spacing.
- Actions: **Clear Filters** (secondary), **Cancel** (secondary), **Apply Filters** (primary contained).

### 21.2 Events tab configuration

**Day**

- Select labelled **Day**.
- Options: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday.
- Helper text: **"Select a day to filter by schedule."**
- Empty by default.

**Status**

- Select labelled **Status**.
- Options: Complete, Incomplete.
- Helper text: **"Select a status to filter by completion."**
- Empty by default.
- Did Not Meet is not offered here, even though the status tab row above the grid includes it.

**Apply Filters**

- Applies day and status filters to the loaded event data.
- Either filter can be used alone; both are optional.
- Matching is case-insensitive against the event's `Day` and `Status`.
- Closes after applying.
- The apply button is always enabled on this tab.

**Clear Filters**

- Resets the dialog's own `day` and `status` fields to empty.
- Closes the dialog.
- Does not call the apply handler, so the grid is not restored to an unfiltered state.
- Reopening the dialog shows the cleared fields.

**Cancel**

- Closes without applying.
- Does not reset the local fields, so a previously chosen value remains when reopened.

### 21.3 Tasks tab configuration

**Day field**

- Hidden on this tab.

**Status field**

- Label remains **Status**, but the options are durations:
  - This Week
  - Last Week
  - This Month
  - Last Month
- Helper text: **"Select a Duration to filter By"**.

**Apply Filters**

- Reads the selected duration.
- Computes a date range:
  - This Week: Monday 00:00 to Sunday 23:59:59.999 of the current week.
  - Last Week: previous Monday to previous Sunday.
  - This Month: first to last day of the current month.
  - Last Month: first to last day of the previous month.
- Filters tasks by `Timestamp`, not due date.
- Builds a summary of tasks with `TaskStage === "closed"` grouped by `Assigned`.
- Sets the summary rows and closes.
- If no duration is selected, the date range resolves to null and the handler returns without changing anything.
- If there are no tasks in the selected period, the task data falls back to the full task list.
- The apply button is not disabled for an empty duration (the only disabled branch refers to a tab index that is never used).
- No custom range, no start/end date inputs and no date picker.

### 21.4 Shared behaviour and state persistence

- The dialog component remains mounted between openings; its local field values persist until Clear Filters is used or the page reloads.
- There is no validation, no count preview and no "active filters" chip on the main screen.
- Search and filter can be combined, but clearing the filter does not automatically re-run the search.
- The dialog is not responsive beyond MUI's standard full-width dialog.
- Closing by backdrop or Escape behaves like Cancel.

### 21.5 Limits

- Cannot filter by date range, event name, leader, attendee count or payment status.
- Cannot select multiple days or statuses.
- No "Did Not Meet" in the Events filter.
- No way to remove an individual active filter other than reopening and clearing everything.
- "Clear Filters" does not actually reset the result grid.

---

## 22. Sub-Screen F — Event Converts Drawer and Dialog

**Entry points:**

- Event Administration header → **View Converts** icon button (Admin/Registrant).
- Event Detail modal → orange **Capture Coverts** button (opens the capture task form, not the view).
- The View Converts button itself opens the converts view.

**Access:** Admin and Registrant for the header button; the event-detail capture button is available to all roles that can open the event.

### 22.1 Purpose

Review convert/consolidation activity by event and date, with commitment counts and a per-event recipient drill-down.

### 22.2 Data loaded

When the View Converts button mounts, it fetches all tasks from the Admin task endpoint and keeps only tasks whose `TaskType` is exactly `Church - Consolidation`.

Each retained task must also have a non-empty `Event` value to appear in the drawer.

### 22.3 Drawer layout

- Opens from the left.
- Width: 100vw; height: 100vh.
- 5-unit padding.
- Centered heading: **Event Converts View**.
- Full-width search field with a leading search icon and placeholder **"Search for event"**.
- Data table area, centered; a circular spinner replaces the table while data is loading.
- Bottom-right **Close** button.
- The drawer overlays the entire application; no background interaction.

### 22.4 Grouping logic

Tasks are grouped by the combination of **Event** and **formatted task date**:

- Event name from the task's `Event` field.
- Date from the task's `Timestamp`, formatted with `toLocaleDateString("en-US")`.
- Group row carries:
  - Event Name
  - Date
  - Total Count
  - Re-Commitments count
  - First-time Commitments count
  - Recipients list
- Decision counting is case-insensitive:
  - `re-commitment` increments Re-Commitments.
  - `first-time commitment` increments First-time Commitments.
- Each recipient carries ID, name, assigned person, task stage and decision.

### 22.5 Main table

| Column | Detail |
|---|---|
| **Event Name** | The event associated with the tasks. |
| **Date** | Task date in US locale format. |
| **Total Count** | All converts in that event/date group. |
| **Re-Commitments** | Count of `re-commitment` decisions. |
| **First-time Commitments** | Count of `first-time commitment` decisions. |
| **Action** | Blue **View Converts** button. |

- Configured page size: 5.
- Auto height.
- Row identity: the combined `event - date` key.
- The search field filters groups by event name only (case-insensitive substring).
- No date filter, sort preset, export, column selector or quick filter.
- Sorting is available through header clicks.

### 22.6 Recipient drill-down dialog

Clicking **View Converts** opens a Dialog:

- Title: **Captured Converts for {event} on {date}**.
- Max width large, full width, minimum height styling.
- Search field with leading search icon and placeholder **"Search recipient"**.
- Filters recipients by name, case-insensitive.
- Table columns:
  - **Recipient Name**
  - **Assigned To**
  - **Task Stage**
  - **Decision**
- Configured page size: 10; auto height.
- If no recipients match, the dialog shows **"No recipients found."**
- Dialog actions: **Close**.

### 22.7 Empty, loading and error states

- Loading: centered circular spinner in place of the table.
- No converts: table shows its default empty state; no explanatory copy.
- Fetch failure: native alert with the error; the spinner stops.
- No retry control.

### 22.8 Role differences

| Role | Header View Converts | Capture Coverts in event detail |
|---|---|---|
| Leader | Hidden | Available if they can open the event |
| Registrant | Visible | Available |
| Admin | Visible | Available |

### 22.9 Limits and notes

- Viewing converts is separate from capturing converts.
- The drawer does not have a date-range filter or service filter.
- Task stage is shown but there is no action to change it here.
- The grouping date is the task timestamp, not necessarily the event date.
- Recipient search only matches names, not assignee or decision.
- No export from either the drawer or the dialog.
- The button loads all consolidation tasks a second time independently of the task context.

## 23. Sub-Screen G — Task Completion Data Modal

**Entry points:**

- Event Administration → Tasks tab → **View** button in the summary grid.
- Service Check-In → History → **View Converts/Consolidations** button.

**Purpose:** Show task completion data for a person, or show converts with commitment totals for a service date.

### 23.1 Titles

| Entry context | Title |
|---|---|
| Admin Tasks tab | **Task Completion Data** |
| Service Check-In history | **People that gave their lives** |

### 23.2 Layout

- Large modal with a white box at 95% width, 3-unit padding, auto horizontal margins, 4% top margin.
- Minimum height 85%, maximum height 50vh with internal vertical scrolling.
- A plain HTML text input for filtering.
- A light-grey summary panel with three centered statistics.
- A DataGrid and a **Close** button.

### 23.3 Summary panel

Always rendered with three cards:

1. **Recommitments:** `{decisionCounts.recommitment || 0}`
2. **First-time Commitments:** `{decisionCounts.firstTimeCommitment || 0}`
3. **Total:** the sum of the two.

- On the Service Check-In path, these counts are computed from Church Consolidation tasks whose due date matches the selected service date.
- On the Admin Tasks path, no decision counts are passed, so all three figures normally show 0 (or the default empty object values).
- The summary is informational only; there is no click-through.

### 23.4 Search

- Plain text input, full width.
- Placeholder: **"Filter by Recipient Name"**.
- Case-insensitive substring match on `Recipient`.
- Updates as the user types.
- There is no clear button; deleting the text restores the full list.
- Search is local to the data passed into the modal.

### 23.5 DataGrid

| Column | Field |
|---|---|
| **Assigned To** | `Assigned` |
| **Recipient** | `Recipient` |
| **AssignedBy** | `AssignedBy` |
| **Task Type** | `TaskType` |
| **Task Stage** | `TaskStage` |
| **Decision** | `Decision` |

- Configured page size: 6 (single `pageSize` prop).
- No toolbar, export, column selector or density control.
- Selection is not disabled explicitly.
- Default sorting and column menu available.
- The logic intended to exclude open tasks for the Admin task view, but a misspelled length check (`lenght`) means the rendered rows are effectively always the searched recipients, including open tasks when present.
- On the Service Check-In path, the row set is the converts for the selected date and the filter is applied to recipient names.

### 23.6 Close

- Bottom-left button labelled **Close**.
- Closes the modal and leaves the underlying screen unchanged.

### 23.7 Role differences

- Admin task drill-down is only reachable when the Tasks tab is enabled (Admin).
- Service Check-In drill-down is available to Admin and Registrant.
- The modal itself has no role-specific controls.

### 23.8 Limits and notes

- No pagination controls, export or date filtering.
- Decision totals are only meaningful when opened from Service Check-In.
- The Admin task view does not show task IDs, due dates or comments.
- Empty data yields a blank summary and an empty grid.
- The modal is read-only; no task can be closed, reassigned or edited from here.
- The typo in the row-selection logic means the intended exclusion of open tasks is unreliable.

---

## 24. Sub-Screen H — Create New Person Modal

**Entry points:**

- Service Check-In → **Add Person** icon.
- Event Detail modal → **Add Person** icon.

**Access:** Admin or Registrant (Service Check-In) and any role that can open the event detail.

> A second, simpler CreatePersonModal exists in `src/common/` and is mounted on Follow Ups, but it is never opened and has no submit handler wired into a screen. The capability described here is the active two-tab modal in `src/components/CreatePersonModal/`.

### 24.1 Purpose

Create a new person record, derive their leadership hierarchy from the person who invited them, optionally add them to an event, and generate a follow-up task for their leader.

### 24.2 Modal layout

- White paper panel, 500px wide, 3-unit padding, centered.
- Title: **Create New Person**.
- Two tabs: **New Person Info** and **Leader Info**.
- Footer: **Cancel** on the left; **Next** on the first tab and **Save** on the second.
- Save shows a MoonLoader while submitting.
- The panel does not scroll explicitly; field volume can exceed the viewport on small screens.

### 24.3 Tab 1 — New Person Info

| Field | Control | Required marker | Details |
|---|---|---|---|
| **Invited By** | Autocomplete (free solo) | Yes | Options are unique trimmed names from the people list; filters case-insensitively and limits to 10 suggestions. Drives the leader hierarchy on the next tab. |
| **Name** | Text | Yes | Given name. |
| **Surname** | Text | Yes | Family name. |
| **Gender** | Radio group | Yes | Male / Female. No other options. |
| **Email Address** | Email | Yes | Native email input. |
| **Mobile Number** | Telephone | Yes | Native telephone input. |
| **Date Of Birth** | Date | Yes | Native date input with a shrunken label. |
| **Home Address** | Text | Yes | Free text. |

- The **Next** button moves to the Leader Info tab without validating the fields.
- Required markers are visual; because fields are unmounted when the second tab is shown, native submit validation on Save may not prevent an incomplete record.

### 24.4 Tab 2 — Leader Info

Three read-only fields are shown:

| Displayed label | Stored field | Meaning |
|---|---|---|
| **Leader @1** | `Leader @12` | Immediate/12-level leader |
| **Leader @12** | `Leader @144` | 144-level leader |
| **Leader @144** | `Leader @1728` | 1728-level leader |

The labels are shifted one level relative to the field names.

### 24.5 Automatic leader derivation

When **Invited By** changes, the modal finds the inviter in the people list and applies:

1. If the inviter's `Leader @12` equals the inviter's own name, treat them as a 12-level leader:
   - `Leader @12` = inviter.
   - `Leader @144` = blank.
   - `Leader @1728` = blank.
2. Else if the inviter's `Leader @144` is blank:
   - `Leader @12` = inviter's `Leader @12`.
   - `Leader @144` = inviter.
   - `Leader @1728` = blank.
3. Otherwise:
   - `Leader @12` = inviter's `Leader @12`.
   - `Leader @144` = inviter's `Leader @144`.
   - `Leader @1728` = inviter's `Leader @1728`, falling back to the inviter's name if blank.

- All three leader fields are read-only; the user cannot override them.
- If the inviter is not found, the fields remain as they were.
- Changing the inviter after entering other data refreshes the leader fields but does not clear the rest of the form.

### 24.6 Submission

On **Save**:

1. Generates a unique six-digit ID by random selection, retrying while the ID exists in the known people list.
2. Builds the person record:
   - `ID`
   - `Name` = Name + Surname
   - All form fields
   - `invitedBy` (lowercase property) = Invited By
   - Leader fields from the current form data
3. Posts the person to the create-person endpoint.
4. On success:
   - Determines the new person's task leader from the inviter's hierarchy.
   - Creates a follow-up task assigned to that leader, with the new person as recipient, due today, stage open and the current timestamp.
   - If used from Event Detail, also adds the new person to the current event.
   - Shows **"Successfully created New Person."**
   - Closes the modal.
5. On failure: logs the error and shows a native alert with the error message.
6. The loading flag is cleared in all cases.

### 24.7 Feedback and states

- Save button spinner during the request.
- Native success and error alerts.
- No inline field errors.
- No confirmation before closing and losing entered data.

### 24.8 Limits and notes

- No ID collision with the backend beyond the local check.
- No duplicate-email or duplicate-phone detection.
- No member-status control; the backend or defaults determine status.
- No ability to correct leader hierarchy manually.
- No middle name, preferred name, notes, tags or custom fields.
- No event-specific registration fields.
- No phone-number or email validation beyond the native input type.
- The generated follow-up task may use field names (`firstName`/`lastName`) that the reviewed form does not supply, which can leave the recipient incomplete.
- The follow-up task is created even if the user only intended to add a person without follow-up.
- The active modal does not offer a cancel path after a failed task creation; the modal still closes in `finally`.

---

## 25. Sub-Screen I — Ministry Task / Pastoral Task / Capture Covert Modal

**Entry points:**

| Screen | Trigger | Mode |
|---|---|---|
| Follow Ups | **Log Pastoral Call Task** or **Log Pastoral Visit Task** | General task |
| My Tasks | **Log Pastoral Call Task** or **Log Pastoral Visit Task** | General task |
| Service Check-In | Orange **Capture Coverts** button | Covert/consolidation |
| Event Detail | Orange **Capture Coverts** button | Covert/consolidation tied to an event |

**Purpose:** Create a task record in one of several ministry workflows.

### 25.1 Modal layout

- White rounded panel, 90% width, max 800px, centered, 4-unit padding.
- Title: **Task Information** on the left section.
- Two-column body on wide screens:
  - Left: task fields.
  - Right: **Comments** (general mode only).
- A divider, then **Cancel** and **Finish** buttons at the bottom.
- Finish shows a MoonLoader while the add-task request runs.
- No explicit X button; backdrop/Escape closes.

### 25.2 Context-dependent fields

| Field | Follow Ups / My Tasks | Service Check-In | Event Detail (Capture Coverts) |
|---|---|---|---|
| Event Type autocomplete | Hidden | Hidden | **Shown** |
| Event name autocomplete | Hidden | Hidden | **Shown** (labelled "Event Type*") |
| Task Type select | Shown, with general task types | Shown, includes Church - Consolidation | Shown, includes Church - Consolidation |
| Recipient | Shown | Shown | Shown |
| Assigned To | Shown | Shown | Shown |
| Due Date & Time | Disabled | Disabled | Disabled |
| Decision select | Hidden | **Shown** | **Shown** |
| Task Stage select | Open and Closed | Open only | Open only |
| Comments | **Shown** | Hidden | Hidden |

### 25.3 Task Type options

The select always includes:

- **Proper connect - Cell request** (`proper-connect-Cell-request`)
- **Proper connect - Visit** (`proper-connect-visit`)
- **Proper call - Service Invitation** (` Proper-call-Service-Invitation`, with a leading space in the value)
- **Follow Up** (`follow-up`)
- **Wrong Number** (`wrong-number`)
- **Awaiting Call** (`awaiting-call`)
- **No Answer** (`No-Answer`)

Additionally, on Service Check-In and Event Detail:

- **Church - Consolidation**

The default value is:

- `Church - Consolidation` on `/servicecheckin` and `/events`.
- `awaiting-call` on all other routes.

### 25.4 Field details

| Field | Control | Details |
|---|---|---|
| **Event Type** (event mode) | Autocomplete, free solo | Options are event-group names loaded by the covert button; value is the selected event type; filtering limits to 10 suggestions. |
| **Event Type** (second event field) | Autocomplete, free solo | Actually selects an individual event name. Options are fetched from the selected event group when the group changes. Label is mistakenly also "Event Type*". |
| **Task Type** | Select | Options above. |
| **Recipient *** | Autocomplete, free solo | Options are all church member names; filters to 10. Marked required. |
| **Assigned To *** | Autocomplete, free solo | Options are all church member names; defaults to the logged-in user's full name. Marked required. |
| **Due Date & Time** | Datetime-local | Disabled. Displays the current timestamp at minute precision. Not editable. |
| **Decision** | Select | Only in covert/event mode; **First-time commitment** or **Re-commitment**. Defaults to re-commitment. |
| **Task Stage** | Select | General mode: Open (default) and Closed. Covert mode: Open only. |
| **Comments** | Multiline text | General mode only; 8 rows; placeholder **"Add comments here..."**. |

### 25.5 Submission

- **Finish** builds a new task array and calls the parent's add-task handler.
- The task includes:
  - Current timestamp in milliseconds as ID
  - Current user as leader/assigner context
  - Selected task type
  - The user's own leader
  - Current user email
  - Assigned To
  - Due date (today's date, `YYYY-MM-DD`)
  - Recipient
  - Current timestamp
  - Task stage
  - Decision (where applicable)
  - Selected event (where applicable)
- On success from the parent flow:
  - Event/covert: native alert **"Successfully captured covert"**.
  - General task: native alert **"Successfully Added a Task."** (Follow Ups) or **"Successfully Added a Task"** (My Tasks).
- On failure: native alert with the returned error.
- The modal closes and resets its fields after Finish or Cancel.
- New tasks are written to the backend but not inserted into the visible lists immediately.

### 25.6 Validation and defaults

- No blocking validation despite the required asterisks.
- A task can be submitted with an empty recipient.
- Due date is not user-selectable.
- Task Stage defaults to Open.
- Decision defaults to re-commitment in covert mode.
- Comments are not submitted in the task array.
- Event name is not required by validation.

### 25.7 Context-specific notes

**Follow Ups / My Tasks**

- Both pastoral buttons open this same form; they do not choose different task types.
- The user must choose a type such as Follow Up, Awaiting Call, No Answer, etc.
- Comments are available but are not visible anywhere else in the reviewed screens.
- Closed stage is available, allowing a task to be created already closed.

**Service Check-In**

- The form is the covert capture flow.
- It cannot select an event; the conversion is tied to the service-date logic used by history.
- Only first-time and re-commitment decisions are available.

**Event Detail**

- The event type and event name fields make the conversion event-specific.
- The second autocomplete's label is a copy/paste error and should be read as "Event".
- Event options load from the selected event group; changing the group triggers a fetch.
- If no event group is selected, the event list may remain empty.

### 25.8 Limits

- No due-date editing.
- No priority, reminders, attachments or recurrence.
- No assignee workload or availability display.
- No validation of recipient or assignee against real people (free text allowed).
- Comments are captured visually but not included in the submitted task payload.
- No task template or saved task type.
- Two different "pastoral" buttons provide no differentiation.
- Event mode's duplicate "Event Type" label is confusing.

---

## 26. Sub-Screen J — Edit Task Status Modal

**Entry:** Follow Ups or My Tasks → **Edit** in a row  
**Purpose:** Close an open task.

### 26.1 Layout

- Small centered white modal, 400px wide, 4-unit padding, black border.
- Title: **Edit Task Status**.
- One select showing **Open** or **Closed**, defaulting to Open.
- **Save** button beside the select.
- Save shows a MoonLoader while the update runs.

### 26.2 Behaviour

- Selecting Open and pressing Save triggers a native alert:
  - **"The task status is currently set to \"Open\". Please select \"Closed\" if you wish to close the task."**
- Selecting Closed and pressing Save:
  - Calls the edit-task endpoint with the task ID.
  - On response success:
    - Removes the task from the local list.
    - Shows **"Task Successfully updated"**.
    - Closes the modal.
  - On failure: shows a native alert and closes after the loading state.
- Closing the modal clears the selected task.
- The selected status is not included in the request payload; the backend action is driven by the task ID.

### 26.3 Limits

- Cannot reopen a closed task from this modal.
- Cannot change assignee, recipient, due date, type, comments or decision.
- Cannot set a task to Overdue or Did Not Meet.
- No confirmation before closing.
- No audit history.
- Closing is irreversible from the UI.

---

## 27. Sub-Screen K — Payment Confirmation Modal

**Entry:** Event Detail → capture action on a ticketed event group  
**Purpose:** Record the amount paid before capturing a ticketed attendee.

### 27.1 Layout

- White modal panel, 400px wide, centered, black border, 4-unit padding.
- Title: **Payment Confirmation**.
- Explanatory text: **"Please confirm if the user has paid and enter the amount paid."**
- **Amount Due:** R {event Cost}.
- **Amount Paid** number input.
- **Amount Remaining:** R {computed, two decimals}.
- Footer: **Cancel** and **Confirm**; Confirm shows a MoonLoader while submitting.

### 27.2 Calculations

- `amountAlreadyPaid` = attendee's `Attendees Payment` or 0.
- `amountRemaining = amountDue - (amountAlreadyPaid + amountPaid)`.
- The remaining amount updates live as the user types.
- The amount due is passed from the selected event's `Cost` or `"0"`.

### 27.3 Validation and behaviour

| Condition | Result |
|---|---|
| Amount field blank | Inline error **"Amount is required to continue"**; no submit. |
| Amount paid > amount due | Inline error **"Amount paid cannot exceed amount due"**; no submit. |
| Total paid < amount due | Native alert **"User did not pay the full price."**; person marked red; capture still submitted. |
| Total paid >= amount due | Person marked green; capture submitted. |
| Cancel | Closes without capture. |
| Confirm | Submits updated payment and closes. |

- Amount Already Paid is read from the attendee record; there is no separate edit field.
- A single payment amount is added to any previous amount.
- Underpayment is allowed after a warning and still proceeds with a capture attempt.
- There is no minimum check, so negative values are not explicitly blocked.
- No payment method, card/cash selection, reference number, receipt, refund or partial-payment ledger.

### 27.4 Limits

- Only one amount field.
- No currency selection; rand (R) is hard-coded.
- No reconciliation view.
- No attendance capture if the user cancels.
- No indication of what "amount due" includes (ticket tiers/rates are not used here; only the event Cost).

---

## 28. Sub-Screen L — Delete Confirmation and Password Dialog

**Entry:**

- Event Administration → white trash icon inside an event-group button (Admin only).
- The Event DataGrid has a Delete Event column, but it contains no active control.

**Purpose:** Confirm deletion of an event group or event, then require a password.

### 28.1 Confirmation dialog

- Title: **Confirm Deletion**.
- Message: **"Are you sure you want to delete the Event/EventGroup {name}?"**
- The object's key count decides whether the label says Event or EventGroup.
- Buttons: **Cancel** (primary style) and **Yes** (secondary style).
- Yes shows a MoonLoader while processing.

### 28.2 Observed deletion logic

For the visible group-delete path, the trash icon passes an object shaped like `{ eventType: groupName }`.

- The confirmation handler checks for an `"Event Type"` property.
- Because that property is absent for a group deletion, the handler shows the warning:
  - **"You can only delete individual events, not entire event groups."**
- It then closes the dialog without asking for a password or deleting anything.
- No other visible control passes an event object into this dialog for deletion.
- Therefore, event-group deletion cannot be completed from the current UI, and individual event deletion cannot be initiated because the row action is empty.

### 28.3 Password dialog

If the flow were reached:

- Title: **"Enter  the password to Confirm"** (two spaces).
- Explanatory text: **"Please enter your password to confirm this deletion."**
- Password text field with autofocus, inline error support.
- Buttons: **Cancel** and **Confirm**; Confirm shows a MoonLoader.
- The password is compared with a hard-coded value in front-end source. The value is deliberately not reproduced in this report.
- A wrong password shows **"Incorrect password."**
- The delete branches in this dialog are also inverted relative to the confirmation guard: one branch calls the event-group delete when an event-type field is present, and the other calls the event delete when it is not.

### 28.4 Success and error messages

The dialog is wired to local alert messages such as:

- **"Successfully deleted Event Group"**
- **"Successfully deleted Event"**
- **"Deleting error: …"**

Because of the guard inversion described above, these paths are not reachable through the visible deletion controls in the reviewed build.

### 28.5 Security and UX notes

- The delete password is embedded in the client bundle; it is not verified by the backend from this UI.
- No confirmation shows what will be deleted beyond a name.
- No reason/audit field.
- No recovery or undo.
- Deletion of associated attendance, tasks or history is not previewed.

---

## 29. Sub-Screen M — Attendance Details Modal

**Entry:** Service Check-In → History → **View Details** or **View New People**  
**Purpose:** Show who attended a selected service or which new people attended.

### 29.1 Layout

- Full-screen-like modal: 90% width, 95% height, 4-unit padding, black border.
- Title: **Attendance for {service portion}**.
- Subtitle: **Date: {date portion}**.
- Search field across the top.
- Data grid occupying roughly 70% height.
- Bottom-left **Close** button.

### 29.2 Data sources

- **View Details:** all people where the selected date/service property is exactly `true`.
- **View New People:** the same attendee set, then reduced to people whose formatted `Date Created` contains the date portion of the selected service key.

### 29.3 Search

- Label: **Search by Name or Leader @12**.
- Matches:
  - `Name` (case-insensitive substring).
  - `Leader @144` (the level displayed as Leader 12).
- Search updates the grid immediately.
- Closing the modal clears the search and the attendee copy.

### 29.4 Table

| Column | Field | Displayed level |
|---|---|---|
| **Full Name** | `Name` | Person's full name |
| **Email** | `Email` | Email |
| **Leader @1** | `Leader @12` | Direct/12 leader |
| **Leader @12** | `Leader @144` | 144 leader |
| **Leader @144** | `Leader @ 1728` | 1728 leader |

- Configured page size: 5; options 5, 10 and 20.
- Row identity: person `ID`.
- Pagination enabled.
- No toolbar, export, column selector or density control.
- Sorting available by column header.

### 29.5 Limits and notes

- Column labels are shifted one hierarchy level compared with the underlying data.
- Search can error if a person is missing the `Leader @144` field.
- No attendance status per person beyond appearing in the list.
- No bulk action, export or contact action.
- New People mode depends on exact date-string matching in `Date Created`.
- No service filter inside the modal.

---

## 30. Sub-Screen N — Logout Confirmation Dialog

**Entry:** Navbar avatar → three-dot menu → **Log out**  
**Access:** Any logged-in user

### 30.1 Layout

- MUI Dialog titled **Confirm Logout**.
- Text: **"Are you sure you want to log out?"**
- Actions: **Cancel** and **Yes** (error-coloured).

### 30.2 Behaviour

- Cancel closes the dialog and leaves the session intact.
- Yes:
  - Removes `loggedIn`.
  - Calls `localStorage.clear()`.
  - Closes the dialog.
  - Navigates to `/register`.
- The navigation is explicit, so it does not rely on the route guard re-evaluating.
- After logout, the avatar disappears and the navbar remains visible with its four links.

### 30.3 Limits

- No "remember this device" concept.
- No warning about unsaved form data.
- No server-side session invalidation is evident.
- The dialog cannot be reached while logged out because the avatar is hidden.

## 31. Master Filter, Search, Date-Range and Export Matrix

This section consolidates every filtering, searching, date-selection and export capability in the reachable application. It is the reference to use when comparing screens or when scoping future work.

### 31.1 Filtering principles used across the app

| Principle | Observed implementation |
|---|---|
| **Where filtering happens** | Entirely in the browser after data is fetched. No screen sends filter, search or date criteria to the backend. |
| **Search matching** | Case-insensitive substring matching unless a MUI DataGrid toolbar is used, in which case the grid's own filter/quick-filter semantics apply. |
| **Search trigger** | Usually on every keystroke. A few dialogs filter only the locally held copy after each change. |
| **Filter persistence** | None. Filters live in component state and are lost on route change, modal close, page reload or logout. |
| **URL state** | None. No filter, search, tab, selected event or date is written to the URL, so a filtered view cannot be bookmarked or shared. |
| **Saved filters** | None. There are no saved views, named filters, pinned filters or user preferences. |
| **Combined filters** | Where more than one control exists, filters are applied cumulatively (for example search plus status tab, or search plus day/status dialog). |
| **Empty results** | Usually shown as an empty grid. There is no "no matches" illustration, suggestion or reset prompt. |
| **Server-side search** | None. All rows for the current scope must be fetched before any search or filter can operate. |
| **Date filtering** | Limited to fixed presets or implicit date exclusion. There is no custom start/end date control on any reachable screen. |

### 31.2 Screen-by-screen filter and search matrix

| # | Screen / surface | Control | What it filters | Match rule | Date basis | Default | Reset behaviour | Export |
|---|---|---|---|---|---|---|---|---|
| 1 | **Event Administration — Events** | Event-group buttons | Selects the event sheet to display | Exact event-group name from the loaded list | None | **Cells** on first load | Selecting another group reloads that group and resets status to Incomplete | No |
| 2 | Event Administration — Events | **Search by Event Name or Event Leader** | Current group's loaded event rows | Case-insensitive substring against `Event Name` or `Leader` | None | Empty | Clearing text re-applies the unfiltered event/status logic | No |
| 3 | Event Administration — Events | **Filter** dialog → **Day** | Current event rows | Exact weekday name, case-insensitive | Day-of-week only; no calendar date | Empty (all days) | Dialog local state resets on Clear; grid is not restored by Clear | No |
| 4 | Event Administration — Events | **Filter** dialog → **Status** | Current event rows | Exact `Complete` or `Incomplete` | None | Empty (all statuses) | Same caveat as Day | No |
| 5 | Event Administration — Events | Status buttons (Cells/Training only) | Current event rows | Exact status: Incomplete, Complete, Did Not Meet | None | **Incomplete** | Selecting a group or changing tabs resets to Incomplete | No |
| 6 | Event Administration — Events | Implicit row eligibility | Removes unusable/future events | `Date Of Event`, `Date Captured` and `Date Created` must parse; event date must be before now | Three date fields | Always on | Not user-controllable | No |
| 7 | Event Administration — Tasks | **Search by Event Name or Event Leader** (label is not adapted) | Task records in the Tasks tab, matching `Assigned` | Case-insensitive substring | None | Empty | Clearing text re-runs search | No |
| 8 | Event Administration — Tasks | **Filter** dialog → **Status** (labelled status but acts as period) | Tasks in the summary calculation | Fixed preset | Task `Timestamp` | Empty; empty selection makes Apply a no-op | Clear resets only dialog fields | No |
| 9 | Event Administration — Tasks | Initial summary scope | Per-person closed-task counts | Preset current week | Task `Timestamp` | **This Week** | Reload required to restore | No |
| 10 | Task Completion Data modal | **Filter by Recipient Name** | Rows in the modal | Case-insensitive substring on `Recipient` | None | Empty | Clearing restores the eligible rows | No |
| 11 | **Follow Ups** | Built-in DataGrid toolbar | Columns, filter panel, density and export | MUI DataGrid rules | None | Fixed row scope: `TaskType == "follow-up"` and `TaskStage == "open"` | Toolbar reset clears grid-level filters | CSV via toolbar |
| 12 | Follow Ups | No dedicated search field | — | — | — | — | — | — |
| 13 | **My Tasks** | Built-in DataGrid toolbar | Columns, filter panel, density and export | MUI DataGrid rules | None | Fixed row scope: `TaskStage != "closed"` and `Assigned == current user's name` | Toolbar reset clears grid-level filters | CSV via toolbar |
| 14 | My Tasks | No dedicated search, status or date filter | — | — | — | — | — | — |
| 15 | **Ministry Tasks** | Period select | Tasks used to build the overview | Fixed preset | Task `Timestamp` | **This Week** | Choosing another period recalculates immediately | No |
| 16 | Ministry Tasks | No search field | — | — | — | — | — | — |
| 17 | **Service Check-In — Check In** | **Search Person** quick filter | Current people list | MUI quick-filter semantics across visible row values | None | Empty | Clearing restores all rows | CSV via toolbar |
| 18 | Service Check-In — Check In | Day eligibility (implicit) | Disables every Check-In button outside Friday/Sunday/Monday or when already checked in | Exact weekday and existing date-key value | Current day | Always on | Not user-controllable | — |
| 19 | **Service Check-In — History** | No search or date filter | — | — | — | All service dates returned by history keys | — | No |
| 20 | Attendance Details modal | **Search by Name or Leader @12** | Attendee list | Case-insensitive substring on `Name` and `Leader @144` | None | Empty | Closing clears the search | No |
| 21 | **Event Converts drawer** | **Search for event** | Grouped event/date rows | Case-insensitive substring on event name only | Date is displayed but not filterable | Empty | Closing/reopening resets | No |
| 22 | Event Converts recipient dialog | **Search recipient** | Recipient rows for the selected event/date | Case-insensitive substring on recipient name | None | Empty | Closing clears | No |
| 23 | **Event Detail — Capture Attendees** | Search field | People available to capture | Concatenated values of each person record, case-insensitive substring | None | Empty | Switching tab resets the search | No |
| 24 | Event Detail — Associate Person | Search field | People available to associate | Same concatenated-record search | None | Empty | Switching tab resets the search | No |
| 25 | Event Detail — Checked In People | Search field | Checked-in attendees | Concatenated values, case-insensitive substring | None | Empty | Switching tab resets the search | No |
| 26 | **Registration / Sign Up / Log In** | No search or filter | — | — | — | — | — | — |
| 27 | **Home** | None | — | — | — | — | — | — |
| 28 | **People (URL-only demo)** | No filter | — | — | — | — | — | — |
| 29 | **PID Assessments** | None | — | — | — | — | — | — |

### 31.3 The custom date-range question — explicit finding

> **No reachable screen in Active Teams offers a custom date-range picker, a "from/to" calendar pair, or an arbitrary start-and-end date filter.**

The complete inventory of date-selection controls is:

| Control type | Where it appears | Is it a filter? |
|---|---|---|
| Fixed period dropdown/dialog — **This Week / Last Week / This Month / Last Month** | Event Administration → Tasks filter; Ministry Tasks period select | Yes, but only four presets |
| Weekday dropdown — Monday to Sunday | Event Administration → Events filter dialog | Yes, but weekday only, not a date range |
| Status/period buttons | Event Administration → Cells/Training status views | Yes, status only |
| Native date input — **Date of Event** | Create New Event modal; Edit Event dialog | No — data entry only |
| Native date input — **Date Of Birth** | Create New Person modal; legacy simple Create Person modal | No — data entry only |
| MUI `DatePicker` | `NewCellModal` in unrouted legacy Cells code | No — unreachable data-entry field |
| Native date input — **Due Date & Time** | Ministry Task modal | No — disabled display of the generated timestamp |
| Service date keys | Service Check-In History | No — fixed rows derived from attendance columns |

There is also **no** date-range selection on Follow Ups, My Tasks, Service Check-In, Event Converts, Attendance Details, People or PID Assessments. There is no "Today", "Yesterday", "Last 7 days", "Last 30 days", "Year to date" or financial-year preset beyond the four task periods.

### 31.4 Exact date-range boundaries

Two different implementations of the four presets exist, and they do not behave identically.

#### A. Event Administration → Tasks filter (`Admin.jsx`)

| Preset | Start | End | Notes |
|---|---|---|---|
| **This Week** | Monday of the current week at 00:00 | The current moment | Future days of the current week are excluded. A Sunday "this week" request includes only up to the current time. |
| **Last Week** | Previous Monday at 00:00 | Previous Sunday at 23:59:59.999 | Full seven-day window. |
| **This Month** | First day of the current month at 00:00 | The current moment | Remaining days of the month are excluded. |
| **Last Month** | First day of the previous month at 00:00 | Last day of the previous month at 23:59:59.999 | Full calendar month. |

#### B. Ministry Tasks period select (`Utils.getDateRange`)

| Preset | Start | End | Notes |
|---|---|---|---|
| **This Week** | Monday at 00:00 | Sunday at 23:59:59.999 | The full calendar week, including future days. |
| **Last Week** | Previous Monday at 00:00 | Previous Sunday at 23:59:59.999 | Full calendar week. |
| **This Month** | First day of the month at 00:00 | Last day of the month at 23:59:59.999 | Full calendar month. |
| **Last Month** | First day of the previous month at 00:00 | Last day of the previous month at 23:59:59.999 | Full calendar month. |

**Consequence:** the same visible label, "This Week", means "Monday to now" in the Event Administration task filter but "Monday to Sunday" in Ministry Tasks. The initial Event Administration task summary uses yet another helper (`isInCurrentWeek`) that also treats the week as Monday through Sunday. A user comparing the two screens can therefore see different counts for the same period.

#### C. Week convention

- Weeks run **Monday to Sunday**.
- The code explicitly adjusts Sunday so that it belongs to the week that began on the preceding Monday.
- There is no locale setting, first-day-of-week preference or timezone selector.
- Boundaries are evaluated with JavaScript `Date` in the browser's local timezone.
- Month boundaries are calendar-month boundaries, not "last 30 days".
- There is no "include today" toggle.

### 31.5 Search behaviour in detail

| Search surface | Fields searched | Fields not searched | Behaviour notes |
|---|---|---|---|
| Event Administration — Events | `Event Name`, `Leader` | Email, address, day, status, dates, attendees | Live per keystroke. Search is re-applied when the status tab changes. |
| Event Administration — Tasks | `Assigned` | Recipient, type, stage, decision, event | Field label still says "Event Name or Event Leader". Visible summary may not refresh reliably. |
| Task Completion Data modal | `Recipient` | All other columns | Leading/trailing spaces are trimmed. |
| Event Converts drawer | Event name | Date, counts, recipients | Date shown in the table but not searchable. |
| Event Converts recipient dialog | Recipient name | Assigned, stage, decision | Empty selection shows all recipients for the group. |
| Event Detail — all three tabs | Every value in each person object, concatenated | Nothing within the object | This can match on email, phone, leader names or any hidden field. |
| Attendance Details modal | `Name`, `Leader @144` | Email, phone, other leader levels | Will throw if `Leader @144` is missing on a record. |
| Service Check-In — Check In | MUI quick filter over displayed values | Hidden columns | Uses the grid's own quick-filter algorithm. |
| People demo | None | — | Static cards only. |

### 31.6 Export and print matrix

| Screen | Export mechanism | Formats | Scope | Notes |
|---|---|---|---|---|
| My Tasks | `GridToolbar` | CSV (via MUI export menu) | Current filtered grid | Toolbar also offers column selection and filter panel. |
| Follow Ups | `GridToolbar` | CSV (via MUI export menu) | Current filtered grid | Toolbar also offers column selection and filter panel. |
| Service Check-In — Check In | Custom toolbar with `GridToolbarExport` | CSV (via MUI export menu) | Current filtered people list | Search field occupies the left side of the toolbar. |
| Event Administration — Events | None | — | — | No toolbar, no CSV, no print. |
| Event Administration — Tasks summary | None | — | — | No toolbar. |
| Ministry Tasks | None | — | — | Card/accordion layout, no export. |
| Service Check-In — History | None | — | — | No toolbar. |
| Event Detail modal | None | — | — | No export from any tab. |
| Attendance Details modal | None | — | — | No export. |
| Event Converts drawer/dialog | None | — | — | No export. |
| Task Completion Data modal | None | — | — | No export. |
| People / PID Assessments | None | — | — | No data tables. |

**No screen provides PDF export, Excel export, server-generated reports, scheduled reports, email export or a print-optimised layout.** The MUI export menu may include a browser-print option depending on the installed DataGrid version, but the application does not implement a dedicated print view.

### 31.7 Sorting, pagination and column controls

| Grid | Configured page size | Page-size options | Sorting | Column menu / visibility | Density |
|---|---|---|---|---|---|
| Event Administration — Events | 5 | 5, 10, 20 | Yes, per column | Default DataGrid menu | Default |
| Event Administration — Tasks summary | 10 | 10 only | Yes | Default menu | Default |
| Follow Ups | 5 | 5, 10, 15 | Yes | Toolbar column selector | Toolbar density |
| My Tasks | 10 | 10 only | Yes | Toolbar column selector | Toolbar density |
| Service Check-In — Check In | 10 | 10 only | Yes | No column button (commented out) | Density labels localised but selector also commented out |
| Service Check-In — History | MUI default | MUI default | Yes | No | No |
| Attendance Details modal | 5 | 5, 10, 20 | Yes | No | No |
| Event Detail tabs | MUI default | MUI default | Yes | No | No |
| Task Completion Data modal | 6 | MUI default | Yes | No | No |
| Event Converts drawer | 5 | MUI default | Yes | No | No |

The Event Administration grid's page-size setting is a configured initial value, not a hard cap; the MUI footer still lets the user change pages and, where options exist, page size.

### 31.8 Filter interaction and reset quirks

1. **Clear Filters in the Filter dialog does not clear the grid.** It calls `setFilters({ day: "", status: "" })` and closes the dialog. It does not call `onApply`, does not re-query and does not restore rows that were previously filtered out.
2. **Cancel and Clear look similar but differ only in whether the dialog fields are reset.** Neither affects the grid.
3. **Applying an empty Filters form on the Events tab** sets the filtered data to the full event data, which effectively clears day/status constraints.
4. **Applying an empty Status on the Tasks tab does nothing.** The code calls `getDateRange(undefined)`, receives `null`, and returns without changing the grid.
5. **Status tab and search interact.** Changing status re-applies the current search query; typing search re-applies the selected status.
6. **Switching event groups resets the status filter to Incomplete** but leaves the search text in place, so the new group can appear empty if the query does not match.
7. **Switching from Events to Tasks** keeps the search text but changes its meaning from event name/leader to assignee.
8. **Closing the Event Detail modal** resets its active tab and search term but does not refresh the underlying event grid or event status.
9. **Reloading the page** resets every filter, grouping, tab and selected event.
10. **There is no global search.** The navbar has no search box and there is no cross-entity search.

### 31.9 What would be needed for a true custom range

The current codebase has no state, UI control or API parameter for a custom range. Adding one would require:

- Two date inputs or a range picker (the MUI X date pickers are already a dependency, but only used in legacy code).
- A decision about inclusive/exclusive end dates and timezone.
- A defined date field per module: `Timestamp` for tasks, `Date Of Event` for events, service-date keys for attendance, `DueDate` for follow-up grouping.
- An "Apply" action and an explicit "Clear" action that actually refreshes the grid.
- Backend support only if server-side pagination is introduced; the current data volumes are filtered client-side.
- Empty-state and validation handling for start date after end date.

---

## 32. Master Notification and Feedback Matrix

Active Teams uses several unrelated feedback mechanisms. There is no single notification system, no toast queue and no notification centre. The mechanism used depends on which developer wrote the screen.

### 32.1 Feedback mechanisms in use

| Mechanism | Where used | Visual behaviour | Dismissal | Limitations |
|---|---|---|---|---|
| **Native browser `alert()`** | Most task screens, payment modal, covert capture, service check-in person creation, some fetch failures | Browser-modal dialog with an OK button; blocks the page | User clicks OK | Cannot style, cannot queue, cannot auto-dismiss, cannot be translated; on some browsers it freezes animation and timers. |
| **MUI `AlertPopup`** | Event Administration and everything it passes `showAlert` to | Fixed at top centre, above all content (`z-index` very high), coloured by severity, optional bold title, close icon | Close icon or automatic 5-second timeout | Only one message can exist at a time; a new message replaces the old one; no queue. |
| **Inline MUI `Alert`** | Registration/Sign Up/Log In; Service Check-In check-in success | Embedded in the page or positioned absolutely near the top of the check-in panel | Registration: replaced on next action or tab change. Check-in: 3-second timeout or close. | Registration alert can remain while the user edits fields. |
| **Confirmation dialog** | Delete event/group, logout, payment, edit status | Modal dialog with Cancel and a confirming action | Button click or backdrop/Escape where enabled | Not a notification; it interrupts and requires a decision. |
| **Spinner / loader** | Page loads, modal submissions, DataGrid loading overlays | `PageLoader`, `MoonLoader`, `CircularProgress`, DataGrid overlay | Automatically when request finishes | No progress percentage, no cancel, no timeout message. |
| **Silent console logging** | Numerous fetch failures and non-critical errors | Nothing visible to the user | — | Users can believe an action succeeded when it did not. |

### 32.2 Global feedback surfaces

| Surface | Scope | Placement | Lifetime |
|---|---|---|---|
| Event Administration `AlertPopup` | Event Administration page and its child modals (event detail, delete, create person inside event detail) | Fixed, top 20px, horizontally centred, maximum width 90% | 5 seconds or manual close |
| Registration inline alert | Registration card only | Below the tabs, above the form | Until replaced, tab change or navigation |
| Service Check-In success alert | Check-In tab | Absolute, top 20px, centred within the panel | 3 seconds or manual close |
| Native alerts | Any screen that calls `alert()` | Browser-controlled, usually top centre | Until OK |

### 32.3 Authentication and session notifications

| Trigger | Surface | Message | Severity | Resulting state |
|---|---|---|---|---|
| Successful login | Inline alert | **Login successful!** | Success | Waits 2 seconds, navigates to `/`, reloads the window |
| Login rejected by backend | Inline alert | Backend `result.message` (variable) | Info | Stays on the form; password remains as entered unless the user changes it |
| Login request throws | Inline alert | Browser error message | Error | Stays on the form |
| Successful sign-up | Inline alert | **Sign-up successful!** | Success | Waits 2 seconds, navigates to `/`, reloads |
| Sign-up rejected by backend | Inline alert | Backend `result.message` | Info | Stays on the form |
| Sign-up request throws | Inline alert | Browser error message | Error | Stays on the form |
| Validation failure | Field-level text under the field | E.g. **Name is required**, **Invalid email format**, **Password must be at least 6 characters** | Error styling | Submission blocked |
| Tab switch | Inline alert | Cleared immediately | — | No message remains |
| Logout confirmed | None | — | — | Navigates to `/register` with no success message |
| Unauthenticated visit to a guarded route | None | — | — | The Registration/Log-in form is rendered in place of the page; no explanation is shown |

### 32.4 Event Administration and event-detail notifications

| Trigger | Surface | Message | Severity | Notes |
|---|---|---|---|---|
| Task fetch fails on page load | Global alert | **Fetch error (tasks):** + error | Error | Event data may still load |
| Event-group fetch fails | Global alert | **Fetch error (events):** + error | Error | Event buttons may be missing |
| Unexpected page-load error | Global alert | **Unexpected fetch error:** + error | Error | Catch-all |
| Selected group's events fail to load | Global alert | **Fetch error (getEventData):** + error | Error | Grid may remain empty |
| Create event group succeeds | Global alert | **New event group created successfully.** | Success | New button appears immediately |
| Create event group returns error | Global alert | **Failed to create a new event group. Please try again.** + error | Error | Dialog closes regardless because the modal's `finally` closes it |
| Create event group throws | Global alert | **An unexpected error occurred. Please try again later.** + error | Error | — |
| Create event succeeds | Global alert | **New event created successfully.** | Success | Row is appended locally; future-dated events are then hidden by the grid eligibility rule |
| Create event returns error | Global alert | **Error creating new event:** + error | Error | Dialog closes |
| Create event throws | Global alert | **An unexpected error occurred. Please try again later.** + error | Error | — |
| Edit event succeeds | None | — | — | Dialog closes; local row is replaced; no confirmation |
| Edit event fails | Native alert + console | **Failed to Update Event. Please try again later.** | Error | The second argument is not interpolated correctly and may display as an object |
| Add person to event succeeds | Global alert | **Successfully added {name} to Event** | Success | Name falls back to "Unknown" |
| Uncapture/remove person from event succeeds | Global alert | **Successfully unCaptured {name} to Event** | Success | Wording is grammatically inconsistent |
| Add/remove person fails | Global alert | **Error adding {name} to Event {error}** | Error | — |
| Create person from Event Detail succeeds | Global alert | **Successfully created new person** | Success | Also attempts to add the person to the event |
| Create person from Event Detail fails | Global alert | **Error creating person: {message}** | Error | — |
| Create person throws unexpectedly | Global alert | **Unexpected error: {message}** | Error | — |
| Mark event **Did Not Meet** succeeds | Global alert | **Marked as Did Not Meet** | Info | Modal closes |
| Mark **Did Not Meet** fails | Global alert | **Error saving event data: {error}** or **Error: {message}** | Error | Modal stays open |
| Complete event succeeds | Global alert | **Event data saved successfully** | Success | Modal closes; status change is not reflected in the grid until reload |
| Complete event fails | Global alert | **Error saving event data: {error}** or **Error: {message}** | Error | Modal stays open |
| Capture covert succeeds | Native alert | **Successfully captured covert** | Browser default | Uses the shared Ministry Task modal; modal closes |
| Capture covert fails | Native alert | **Failed to captured covert: {error}** | Browser default | Wording typo preserved |
| Event-group delete attempted | Global alert | **You can only delete individual events, not entire event groups.** | Warning | Confirmation closes; this is the only outcome currently reachable from a group trash icon |
| Event-group deletion branch (unreachable) | Global alert | **Successfully deleted Event Group** | Success | The branch that would run for a group actually calls the event-delete helper; the flow is blocked earlier by the confirmation guard |
| Individual-event deletion branch (unreachable) | Global alert | **Successfully deleted Event** | Success | The branch that would run for an event actually calls the event-group delete helper; no row control can start it |
| Delete error | Global alert | **Deleting error: {error}** | Error | — |
| Payment less than full amount | Native alert | **User did not pay the full price.** | Browser default | The person is still captured; icon turns red |
| Payment validation — empty amount | Inline helper text | **Amount is required to continue** | Error | Modal stays open |
| Payment validation — overpayment | Inline helper text | **Amount paid cannot exceed amount due** | Error | Modal stays open |
| Task completion modal has no eligible rows | None | — | — | Empty grid |
| Filter applied | None | — | — | No count or confirmation |
| Search returns nothing | None | — | — | Empty grid |

### 32.5 My Tasks and Follow Ups notifications

| Trigger | Surface | Message | Severity | Notes |
|---|---|---|---|---|
| Task fetch fails | Native alert | Backend error object/message | Browser default | Loading ends |
| People-name fetch fails | Native alert | **Could not fetch data. Please ensure correct parameters are being used.** | Browser default | Tasks may already be loaded |
| Unexpected fetch error | Native alert | **Fetch error: {message}** | Browser default | — |
| Add task succeeds (My Tasks) | Native alert | **Successfully Added a Task** | Browser default | New task is not appended to the visible list |
| Add task fails (My Tasks) | Native alert | **Failed to Add a Task: {error}** | Browser default | Modal closes |
| Add task succeeds (Follow Ups) | Native alert | **Successfully Added a Task.** | Browser default | Note the trailing full stop differs from My Tasks |
| Add task fails (Follow Ups) | Native alert | **Failed to Add a Task: {error}** | Browser default | — |
| Close task succeeds | Native alert | **Task Successfully updated** | Browser default | Row is removed from the local list |
| Close task fails | Native alert | **Err:** followed by the error | Browser default | The second argument is dropped by `alert` |
| Save with status still Open | Native alert | **The task status is currently set to "Open". Please select "Closed" if you wish to close the task.** | Browser default | Modal stays open |
| Task type changed in modal | None | — | — | No help text or explanation of task types |
| Follow Ups has no rows | None | — | — | Empty grid |

### 32.6 Ministry Tasks notifications

| Trigger | Surface | Message | Severity |
|---|---|---|---|
| Initial task fetch fails | Console only | Logged error | None |
| Unexpected fetch error | Console only | Logged error | None |
| Period changed | None | — | — |
| No completed tasks | Card still renders **0** | — | — |
| No disciples | Section is omitted | — | — |

### 32.7 Service Check-In notifications

| Trigger | Surface | Message | Severity | Notes |
|---|---|---|---|---|
| Task fetch fails | Native alert | Error | Browser default | Page may remain in loading state until `finally` runs |
| Create person succeeds | Native alert | **Successfully created New Person.** | Browser default | Modal closes |
| Create person returns error | Native alert | **Error: {message}** | Browser default | Modal closes in `finally` |
| Create person throws | Native alert | **Unexpected error: {message}** | Browser default | Modal closes |
| Check-in request accepted | Inline alert | **{Full Name} Checked In for {service}** | Success | Auto-hides after 3 seconds; check-in modal closes |
| Check-in request rejects | None | Console error only | — | Check-in modal closes and the row may still appear unchecked |
| Check-in button pressed outside eligible day | Disabled control | — | — | No explanatory tooltip or message |
| Already checked in today | Disabled control | — | — | No tooltip explaining why |
| History load fails | Console only | Logged error | — | Page may show empty history |
| View Details with no attendees | None | — | — | Empty modal |
| View New People with no matches | None | — | — | Empty modal |
| View Coverts | Opens task modal | — | — | No loading message in the modal |
| Covert count | Column present | Blank | — | **Coverts Count** is never populated |

### 32.8 Silent outcomes and missing feedback

The following actions provide no visible confirmation, or can fail without telling the user:

- Successful event edit.
- Successful login redirect itself (the inline success message exists for 2 seconds).
- Logout.
- Applying or clearing filters.
- Switching event group, status tab or event tab.
- Loading Event Converts.
- Loading Service History.
- Loading Task Completion Data.
- Any Ministry Tasks fetch failure.
- Closing the Event Detail modal.
- Searching with no results.
- Navigating to an empty grid.
- Service check-in request failure.
- `deleteTask` has no UI and is effectively unused, so no feedback exists for it.
- Group selection and search do not announce result counts.

### 32.9 Notification timing and stacking rules

| Behaviour | Detail |
|---|---|
| **Global alert auto-dismiss** | 5,000 ms after the message is set |
| **Global alert replacement** | A new message overwrites the current one; there is no queue or stack |
| **Global alert manual close** | Close icon always present when a message exists |
| **Registration alert auto-dismiss** | None |
| **Registration alert replacement** | Cleared at the start of each login/sign-up attempt and on tab change |
| **Service check-in alert** | 3,000 ms timer started immediately after the request resolves; the close icon also works |
| **Native alerts** | Persist until the user clicks OK; block JavaScript execution in most browsers |
| **Spinner minimum duration** | None; fast requests can flash the loader |
| **Spinner timeout** | None; a hung request leaves the loader indefinitely unless the promise rejects |
| **Error text formatting** | Several concatenations append an object or `undefined`, producing messages such as `... [object Object]` |

### 32.10 Consistency issues worth noting

1. **Two spellings of the same concept:** "captured covert" (task action) versus "convert/consolidation" (reporting).
2. **Success wording is not standardised:** "Successfully Added a Task", "Successfully Added a Task.", "Task Successfully updated", "New event created successfully.", "Event data saved successfully".
3. **Success severity is inconsistent:** some event successes use the global green alert, while task successes use a native browser alert.
4. **Some failures are only logged.** Ministry Tasks and Service History are the clearest examples.
5. **Dialogs often close after failure.** The create-event modal and create-person modal close in `finally`, so the user loses their input even when the write failed.
6. **No retry action.** No notification offers "Retry", "Undo" or a link to the failed item.
7. **No persistent history.** Once an alert disappears, there is no way to review what happened.
8. **No accessible live region.** Native alerts are announced by the browser, but the custom MUI alert is a visually positioned `div` without an explicit `role="alert"` or `aria-live` attribute in the component.

---

## 33. Data Model and Field Reference

### 33.1 Modelling approach

Active Teams has no client-side database schema, no TypeScript types and no runtime validation layer. The shape of each record is whatever the Google Apps Script endpoint returns from the underlying spreadsheet headers. The React code reads fields by name and silently skips or blanks anything missing.

The practical consequences are:

- Field names are case-sensitive and inconsistent across paths (for example `Leader @1728` versus `Leader @ 1728`).
- Renaming a spreadsheet column breaks the matching screen without a build error.
- Empty cells arrive as empty strings, `null` or `undefined` depending on the endpoint.
- There are no foreign keys; relationships are represented by repeated name strings.
- Dates are stored in several different string formats.
- The same conceptual entity can have different field names depending on whether it was created from Service Check-In, Event Detail or the legacy Cells screen.

### 33.2 Entity relationship overview

```text
Event Group (1) ──── (many) Event
      │                         │
      │                         └── (many) Attendee rows
      │
      └── SheetID identifies the spreadsheet/tab holding its events

Person (1) ──── (many) Task           via Assigned / Recipient / AssignedBy names
Person (1) ──── (many) Attendance keys via "<date> - <service>" columns
Person (1) ──── (many) Event attendee rows via Attendees Email / Attendees ID

Task (many) ──── (1) Event            via Event name (consolidation tasks only)
Task (many) ──── (1) Person           via Recipient, Assigned and Leader names
```

All relationships are name-based. There is no stable person ID stored on tasks, and no stable task ID stored on people.

### 33.3 Authenticated user (`authUser`)

Stored in `localStorage.authUser` as JSON. The login/sign-up response is stored wholesale, so the record contains both session metadata and user profile fields.

| Field | Type | Source | Used for |
|---|---|---|---|
| `success` | Boolean | Login/sign-up response | Determines whether the session is stored |
| `message` | String | Response | Displayed as an info alert when login/sign-up fails |
| `role` | String — `Admin`, `Leader`, `Registrant` | Response | Route guards, sidebar disabling, tab visibility, action visibility |
| `name` | String | Sign-up form / response | Display name, greeting, `leaderName` construction |
| `surname` | String | Sign-up form / response | Display name, `leaderName` construction |
| `email` | String | Sign-up form / response | Event ownership scope, task `Email`, person matching |
| Additional fields | Unknown | Response | Preserved in storage but not read by reviewed code |

`leaderName` is always constructed as `` `${authUser.name} ${authUser.surname}` ``. Every comparison against `Assigned`, `Leader`, `Leader at 12` or event `Email` depends on that exact spacing and spelling.

`localStorage.loggedIn` is the string `"true"`; any other value is treated as logged out.

### 33.4 Person record

The person sheet is the master list used by events, tasks, service check-in and the converts logic.

| Field | Type / format | Written by | Read by | Notes |
|---|---|---|---|---|
| `ID` | String, six digits | Create Person modal | All grids, check-in, attendance | Generated client-side by random selection from 100000–999999, retrying while the ID exists in the local people list |
| `Name` | String | Create Person; derived | Tasks, events, attendance, autocomplete | Usually `Names + " " + Surname`, but some paths construct it from `firstName`/`lastName` which the active form does not supply |
| `Names` | String | Active Create Person modal | Create payload | Given name; not read by most list screens, which use `Name` |
| `Surname` | String | Active Create Person modal | Create payload | Family name |
| `Gender` | String — `Male`, `Female` | Active Create Person modal | Not used elsewhere | Legacy simple modal uses lowercase `male`/`female` |
| `Number` | String | Active Create Person modal | Person lists, event attendee creation | No format normalisation |
| `Email` | String | Active Create Person modal | Event ownership, matching, task email | Native email input, no uniqueness check |
| `Address` | String | Active Create Person modal | Not used elsewhere | Free text |
| `Birthday` | String, `YYYY-MM-DD` | Native date input | Not used elsewhere | No age calculation |
| `Date Created` | String, `d Month yyyy` | Create Person modal | Service Check-In "New People" matching | Exact date-string matching; not an ISO timestamp |
| `Leader @12` | String | Derived from inviter | Task leader derivation, person lists | Immediate leader |
| `Leader @144` | String | Derived from inviter | Attendance display, task leader derivation | Next level |
| `Leader @1728` | String | Active Create Person modal | Create payload | No space before 1728 |
| `Leader @ 1728` | String | Some legacy paths and responses | Attendance display, leader derivation | Space before 1728; can coexist with the previous field |
| `Member Status` | String — `Active User`, `Inactive User` | Default `Active User` | Filters out inactive people when deriving task leaders | No UI to change it |
| `Invited By` | String | Active form label | — | Display label; payload uses `InvitedBy` |
| `InvitedBy` | String | Active Create Person modal | Converts, task creation | Capital I |
| `invitedBy` | String | Event Detail and Service Check-In creation paths | Possibly server/legacy | Lowercase i; can duplicate the previous field |
| `<date> - <service>` | Boolean `true` when attended | Service Check-In endpoint | History counts, check-in status | Dynamic columns; see 33.9 |
| `checkedIn` | Boolean | Check-In UI only | Disables button temporarily | Not a durable field on the person sheet in the reviewed code |
| `Date Created` duplicates | — | — | — | Some event sheets use a different date format; Service Check-In reformats before comparison |

### 33.5 Task record

The front end consumes tasks as named objects after the Apps Script endpoint maps spreadsheet columns. Task creation, by contrast, posts a positional array.

#### Consumed fields

| Field | Type / values | Meaning | Used by |
|---|---|---|---|
| `id` | Number/string | Task identifier | Grid row ID, close-task call, converts grouping |
| `Assigned` | Full name | Person responsible for completing the task | My Tasks filter, Admin search and summary, Ministry overview |
| `Recipient` | Full name | Person the task is about | Follow Ups, Task Completion Data, Converts |
| `TaskType` | Enum string | Category of task | Follow Ups filter, Service Check-In consolidation filter, task modal |
| `DueDate` | `YYYY-MM-DD` | Due date | My Tasks and Follow Ups columns; convert date matching on Service Check-In |
| `AssignedBy` | Full name | Leader who created the task | My Tasks and Follow Ups columns |
| `TaskStage` | `open`, `closed`, possibly `Overdue` | Workflow state | Filters, colouring, completion counts |
| `Decision` | `first-time commitment`, `re-commitment` | Convert decision | Converts counts, Task Completion Data |
| `Timestamp` | `YYYY-MM-DDTHH:mm` local | Creation timestamp | All period filters, converts grouping |
| `Event` | Event name | Event associated with a consolidation task | Converts drawer grouping |
| `Leader` | Full name | Leader above the assignee | Ministry Tasks team grouping |
| `Email` | String | Creator/user email, where supplied | Not displayed in the reviewed grids |
| Additional columns | Unknown | Server-dependent | Ignored by UI |

#### Positional submission array

`MinistryTaskModal` builds the task as an array. The intended mapping, based on the field order used by the consuming screens, is:

| Index | Value written | Likely spreadsheet meaning |
|---|---|---|
| 0 | `Date.now()` | Task ID |
| 1 | `props.leader` (current user's full name) | Assigned By |
| 2 | `selectedTask` | Task Type |
| 3 | `props.myLeader` | Leader above the assignee |
| 4 | `props.userEmail` | Creator email |
| 5 | `assignedTo` | Assigned To |
| 6 | `dueDate` (`YYYY-MM-DD`) | Due Date |
| 7 | `recipient` | Recipient |
| 8 | `timestamp` (`YYYY-MM-DDTHH:mm`) | Timestamp |
| 9 | `selectedState` | Task Stage |
| 10 | `selectedDecision` | Decision |
| 11 | `selectedEvent` | Event |

The server, not the client, decides the final column names. The UI assumes the names in the consumed-fields table.

#### Task creation differences by entry point

| Entry point | Task type default | Stage options | Decision field | Event field | Recipient source |
|---|---|---|---|---|---|
| My Tasks → either pastoral button | `awaiting-call` | Open, Closed | Hidden but still submitted as `re-commitment` | Empty | Free-solo autocomplete |
| Follow Ups → either pastoral button | `awaiting-call` | Open, Closed | Hidden, submitted | Empty | Free-solo autocomplete |
| Ministry Tasks → task modal | `awaiting-call` | Open, Closed | Hidden, submitted | Empty | Free-solo autocomplete |
| Event Administration → capture covert | `Church - Consolidation` | Open only | Visible: First-time / Re-commitment | Selected event | Free-solo autocomplete |
| Service Check-In → capture covert | `Church - Consolidation` | Open only | Visible | Selected event/group | Free-solo autocomplete |
| Event Detail → create person (automatic) | `follow-up` | Open | None | None | New person's name |

### 33.6 Event group record

| Field | Type | Source | Notes |
|---|---|---|---|
| `EventType` | String | Server list; create response maps `Event Group` to this | Also used as `SheetName` when fetching events and as the button label |
| `Event Group` | String | Create-group form payload | Not the field read by the event buttons after load |
| `Ticketed` | Boolean | Create-group form | Controls payment fields and payment capture |
| `Global` | Boolean | Create-group form | Stored but not observed in reachable behaviour |
| `Description` | String | Create-group form | Multi-line description |
| `Discription` | String | Client mapping typo | Duplicate of Description in local state; not displayed |
| `PersonSteps` | Boolean | Create-group form | Stored but not observed in reachable behaviour |
| `Date Created` | ISO timestamp | Client on create | Not displayed |
| `SheetID` | String | Backend file ID | Used for all event and attendee calls for that group |

### 33.7 Event record

| Field | Type / format | Written by | Read by | Notes |
|---|---|---|---|---|
| `ID` | Number (milliseconds) | Create Event modal | Grid row identity, save completion, delete | Generated client-side as `new Date().getTime()` |
| `Event Name` | String | Create/Edit Event | Grid, event detail, attendee sheet lookup | Not required by the form's HTML validation |
| `Leader` | String | Create/Edit Event | Grid, event detail | Free-solo autocomplete from member names |
| `Leader at 12` | String | Create Event conditional field | Non-admin event scoping | Only rendered when the group is Cells or the event type is blank |
| `Day` | Weekday name | Derived from `Date Of Event` | Cells grid | Disabled select in create/edit |
| `Time` | `HH:mm` | Native time input | Event detail, attendee drawer | Stored as string |
| `Address` | String | Create/Edit Event | Event detail | Free text |
| `Date Created` | `YYYY-MM-DD` or timestamp | Create form leaves empty; backend expected to populate | Grid eligibility check | Must be a parseable date or the row is hidden |
| `Date Of Event` | `YYYY-MM-DD` | Native date input | Eligibility check, event detail | Must be in the past or the row is hidden |
| `Date Captured` | `d - m - yyyy` | Create form leaves empty; backend expected to populate on capture | Grid display as "Date Of Event"; attendee date matching; completion | For Cells, the grid header **Date Of Event** actually displays this field |
| `Event Type` | String | Preselected from group | Event detail, delete | Must equal the selected group for event scoping |
| `Cost` | Number/string | Create/Edit Event | Payment calculation | Rand amount; may be blank for non-ticketed groups |
| `Rate` | Array of `{ name, value }` | Create Event rate builder | Payment modal / event detail | Not a sheet primitive; serialised by the endpoint |
| `Status` | `Incomplete`, `Complete`, `Did Not Meet` | Create default; edit select; completion actions | Status filters, completion | Create default is `Incomplete` |
| `Email` | String | Logged-in user's email | Non-admin event scoping | Event ownership, not contact email |
| `SheetID` | String | Selected event group | Event detail/attendee calls | Duplicated on each event object |
| `Reoccurring` | Boolean/string | Create/Edit Event | Stored only | No recurrence generation is implemented |
| `isTicketed` | Boolean | Derived from group | Create form only | Removed before submission |

### 33.8 Rate sub-record

| Field | Type | Notes |
|---|---|---|
| `name` | String | Free text, e.g. "Single", "Couple" |
| `value` | String | Free text, e.g. "R200"; not normalised to a number |

Rates are built in local component state, displayed as a list, and can be deleted before submission. They are sent as part of the event payload. The reviewed payment screen uses the event's `Cost`, not the rate list, to determine the amount due.

### 33.9 Attendee record (event sheet)

| Field | Type | Notes |
|---|---|---|
| `Attendees ID` | String/number | Person ID or timestamp fallback |
| `Attendees Name` | String | Full name |
| `Attendees Email` | String | Used to match checked-in people and toggling capture |
| `Attendees Leader At 12` | String | Displayed as leader hierarchy |
| `Attendees Leader At 144` | String | Displayed as leader hierarchy |
| `Attendees Number` | String | Phone |
| `Attendees Payment` | Number | Amount paid; 0 for non-ticketed |
| `checkIn` | Boolean | Whether the attendee is checked in |
| `isCaptured` | Boolean | Client-only derived flag used by the capture button; not a sheet field |
| `<date key>` | Boolean | Possible attendance markers; the event detail modal treats any parseable date key with value `true` as a check-in |
| Dynamic other columns | Unknown | Any additional sheet column is rendered by the event detail grids unless filtered out |

### 33.10 Service attendance key

Service Check-In does not write a separate attendance table from the client. It posts:

```json
{
  "id": "<person ID>",
  "dateAndService": "<d Month yyyy> - <service name> - <weekday> <time>",
  "checkedIn": true,
  "type": "ServiceCheckIn"
}
```

The resulting person-sheet column name is the `dateAndService` string. Example shape:

```text
23 October 2026 - Active Service - Sunday 09:00
```

The value is `true` when the person attended. History derives its rows by scanning every person object for keys that start with a date pattern, then counting how many people have `true` for each key.

Consequences:

- The date and service are encoded in a column header, not in rows.
- Adding a new service time creates a new column.
- Renaming a service strands historical data under the old name.
- History can only show services that already have at least one column.
- The "Coverts Count" column is present but never calculated.

### 33.11 Derived view models

| View model | Shape | Derivation |
|---|---|---|
| Event grid row | `ID`, `Event Name`, `Leader`, `Email`, `Day`, `Leader at 12`, `Date Of Event` (from `Date Captured`), action fields | `processData`: validates three dates, drops future events, formats dates as `dd - mm - yyyy` |
| Admin task summary | `{ id, Person, TaskCount }` | Group closed tasks by `Assigned` for the selected period |
| Task Completion Data row | `Assigned`, `Recipient`, `AssignedBy`, `TaskType`, `TaskStage`, `Decision` | Filtered task list; non-service mode hides `open` tasks |
| Ministry overview | `{ yourTasks, teamTasks[] }`; each team task has `name`, `tasks`, `desciples[]` | `myMiniStryTasks`: own closed tasks plus per-disciple closed counts |
| Service history row | `{ date, numoftime, coverts }` | Count `true` values for each date/service key; `coverts` is never set |
| Converts group | `{ key, event, date, count, reCommitmentCount, firstTimeCommitmentCount, recipients[] }` | Group consolidation tasks by `Event - localized Timestamp date` |
| Converts recipient | `{ id, name, assigned, taskStage, decision }` | One row per consolidation task |
| Attendance modal row | Person fields (`Name`, `Email`, `Leader @12`, `Leader @144`, `Leader @ 1728`) | People where the selected service key is `true`; optionally filtered by `Date Created` |

### 33.12 Enumerations and controlled values

| Domain | Values | Notes |
|---|---|---|
| Roles | `Admin`, `Leader`, `Registrant` | Exact case; unknown roles get ordinary logged-in access but no Admin/Registrant capabilities |
| Member status | `Active User`, `Inactive User` | No UI to change |
| Event status | `Incomplete`, `Complete`, `Did Not Meet` | UI buttons use "Did not meet" as a label but `Did Not Meet` as a value |
| Task stage | `open`, `closed` | UI also colours `Overdue` red if it appears in data |
| Task type | `proper-connect-Cell-request`, `proper-connect-visit`, ` Proper-call-Service-Invitation` (leading space), `Church - Consolidation`, `follow-up`, `wrong-number`, `awaiting-call`, `No-Answer` | Values are inconsistent in casing, spaces and hyphens |
| Decision | `first-time commitment`, `re-commitment` | Exact strings used in count logic |
| Gender | `Male`, `Female` (active modal); `male`, `female` (legacy modal) | Inconsistent casing |
| Weekdays | Monday to Sunday | Full names; used by event `Day` and filters |
| Services | `Active Kids Service - <weekday> <time>`, `Active Service - <weekday> <time>` | Only offered on Friday, Sunday and Monday |
| Event groups | Any string | Cells and Training receive special status-tab treatment |
| Payment | Rand amounts, numeric | No currency field; `R` is hard-coded in labels |

### 33.13 Identity, dates and formatting

| Concern | Implementation |
|---|---|
| **Person identity** | Six-digit random string generated in the browser; not a UUID and not guaranteed unique across concurrent clients |
| **Event identity** | Millisecond timestamp generated when the create modal initialises, not when submitted |
| **Task identity** | Millisecond timestamp at submission |
| **Event-group identity** | Backend `SheetID` (spreadsheet/file identifier) plus `EventType` name |
| **Event display date** | `dd - mm - yyyy` (day, month, year with spaces around hyphens) |
| **Event input date** | Native `YYYY-MM-DD` |
| **Date Created (person)** | `d Month yyyy`, e.g. `23 October 2026` |
| **Task Timestamp** | `YYYY-MM-DDTHH:mm`, no seconds, no timezone suffix |
| **Task DueDate** | `YYYY-MM-DD` |
| **Converts date** | `toLocaleDateString("en-US")`, typically `M/D/YYYY` |
| **Service key date** | `d Month yyyy`, e.g. `3 November 2026` |
| **Week boundary** | Monday 00:00 to Sunday 23:59:59.999 in browser local time |
| **Month boundary** | Calendar month in browser local time |
| **Timezone** | No user selection, no UTC normalisation, no timezone stored with records |
| **Sorting of dates** | DataGrid receives strings for most date columns; lexical sorting can differ from chronological sorting |

### 33.14 Client persistence and shared state

| Store | Key / provider | Contents | Lifetime |
|---|---|---|---|
| `localStorage` | `loggedIn` | `"true"` when authenticated | Until logout or storage clear |
| `localStorage` | `authUser` | Full login/sign-up response | Until logout or storage clear |
| `localStorage` | `allPeopleRows2` | Cached formatted people rows for legacy Cells | Until logout or storage clear |
| `localStorage` | `cellEvents` | Cached legacy cell events | Until logout or storage clear |
| React context | `AllPeopleProvider` | All people and setter | App session |
| React context | `TaskContext` | Tasks and setter, shared between task screens | App session |
| React context | `EventContext` / `CellContext` | Legacy/shared event and cell state | App session |
| Component state | Each screen | Search text, filters, tabs, selected rows, copies of fetched data | Until unmount |
| IndexedDB | `myAppCache` / `people` | Cached people list used by `AllPeopleProvider` at app start | Persistent until browser storage is cleared |

Two important cache behaviours:

1. **People cache staleness.** Legacy Cells reads `allPeopleRows2` from `localStorage`; newly created people may not appear there until the cache is refreshed or cleared. Separately, `AllPeopleProvider` caches the people list in IndexedDB and displays the cached copy immediately at startup before refreshing from the backend, so event and check-in screens can briefly show stale people.
2. **Task copies diverge.** Tasks are fetched into both context and a local `tasksCopy`. Closing a task removes it from the local copy but not necessarily from the context or other screens. Adding a task updates neither list until a reload.

### 33.15 Backend operations

The front end calls Google Apps Script endpoints configured through Vite environment variables. URLs are intentionally omitted from this report.

| Operation | Method / parameter | Used by |
|---|---|---|
| Fetch tasks for a leader | GET `?leader=` | My Tasks, Follow Ups, Ministry Tasks |
| Fetch cells | GET `?leader=` | Legacy Cells |
| Delete task | GET `?id=` | Unused helper |
| Create cell | POST JSON | Legacy Cells |
| Create person | POST JSON | Create Person modal (event and service check-in paths) |
| Add task | POST JSON array | My Tasks, Follow Ups, covert capture, automatic follow-up creation |
| All people | GET `?name=AllPeople` | Service Check-In, event detail |
| People names and leader hierarchy | GET `?name=` | My Tasks, Follow Ups |
| All tasks (Admin) | GET `?leader=Admin` | Event Administration Tasks tab, Service Check-In |
| Edit task | POST `{ taskID }` | Close-task action |
| All event groups | GET | Event Administration, covert modal, legacy cells |
| Create event group | POST JSON | Create Event Group modal |
| Get event data | POST `{ SheetName, SheetID }` | Event Administration grid |
| Get specific event data | POST `{ SheetName, SheetID }` | Event Detail attendee sheet |
| Get event data by email | POST | Helper present; not used by reviewed screens |
| Create event | POST JSON | Create Event modal |
| Edit event | POST JSON | Edit Event dialog |
| Delete event | POST JSON | Password modal deletion branch (not reachable from current controls) |
| Delete event group | POST JSON | Password modal deletion branch (not reachable from current controls) |
| Add person to event | POST `{ sheetID, eventName, data }` | Event Detail capture/associate |
| Save event | POST `{ ids, action, sheetID, eventType }` | Complete / Did Not Meet |
| Get event names | POST `{ SheetName, SheetID }` | Covert modal event dropdown |

No endpoint is called with pagination, sorting, search or date parameters. The only query parameter used for scoping is `leader`, and it is a name string, not an authenticated identity token.

---

## 34. Permission Matrix

### 34.1 Permission model

Active Teams has a small, client-enforced role model:

| Role | Origin | Trust level in code |
|---|---|---|
| `Admin` | Provisioned outside the UI | Full event and task oversight |
| `Leader` | Automatically assigned by self-registration | Standard access, restricted event data |
| `Registrant` | Provisioned outside the UI | Standard access plus Service Check-In and View Converts |
| Unknown / missing role | Malformed or legacy account | Treated as a logged-in non-admin with no special capability |
| Unauthenticated | No `loggedIn` flag | Registration/Login screen only, except the 404 route |

Every rule below is implemented in React. There is no verified server-side authorisation layer in the reviewed client code, no token, no signed session and no per-request role check.

### 34.2 Capability matrix by role

Legend: **Yes** = control is rendered and usable; **No** = control is hidden or absent; **Blocked** = route guard or logic prevents the action; **Conditional** = depends on the record, selected group or data.

| Capability | Unauthenticated | Leader | Registrant | Admin | Unknown role |
|---|---|---|---|---|---|
| Open Registration/Login | Yes | Yes (`/register`) | Yes (`/register`) | Yes (`/register`) | Yes (`/register`) |
| Sign up | Yes | Yes | Yes | Yes | Yes |
| Log in | Yes | Yes | Yes | Yes | Yes |
| View Home carousel | No (guard) | Yes | Yes | Yes | Yes |
| View Event Administration | No (guard) | Yes | Yes | Yes | Yes |
| View Follow Ups | No (guard) | Yes | Yes | Yes | Yes |
| View Ministry Tasks | No (guard) | Yes | Yes | Yes | Yes |
| View My Tasks | No (guard) | Yes | Yes | Yes | Yes |
| View People demo | No (guard) | Yes | Yes | Yes | Yes |
| View PID Assessments placeholder | No (guard) | Yes | Yes | Yes | Yes |
| View 404 page | Yes | Yes | Yes | Yes | Yes |
| Open Service Check-In | No | Blocked | Yes | Yes | Blocked |
| Use drawer Service Checkin item | Hidden behind guard | Disabled | Enabled | Enabled | Enabled but route blocks |
| See all event groups | No | Yes (buttons) | Yes | Yes | Yes |
| See all events in a group | No | No — own/disciples only | No — own/disciples only | Yes | No — own/disciples only |
| Search events | No | Yes | Yes | Yes | Yes |
| Filter events by day/status | No | Yes | Yes | Yes | Yes |
| Use status tabs (Cells/Training) | No | Yes | Yes | Yes | Yes |
| Open Event Detail | No | Yes, for visible rows | Yes, for visible rows | Yes, for all rows | Yes, for visible rows |
| Capture/uncapture attendees | No | Yes, for visible events | Yes, for visible events | Yes | Yes, for visible events |
| Associate existing people | No | Yes, for visible events | Yes, for visible events | Yes | Yes, for visible events |
| Add a new person from Event Detail | No | Yes, for visible events | Yes, for visible events | Yes | Yes, for visible events |
| Capture a covert from Event Detail | No | Yes, for visible events | Yes, for visible events | Yes | Yes, for visible events |
| Capture payment for ticketed attendees | No | Yes, for visible events | Yes, for visible events | Yes | Yes, for visible events |
| Mark event Complete | No | Yes, for visible events | Yes, for visible events | Yes | Yes, for visible events |
| Mark event Did Not Meet | No | Yes, for visible events | Yes, for visible events | Yes | Yes, for visible events |
| Create event | No | No | No | Yes | No |
| Create event group | No | No | No | Yes | No |
| Edit event | No | No | No | Yes | No |
| Delete event row | No | No | No | No control (column empty) | No |
| Delete event group | No | No | No | Trash icon visible, action blocked | No |
| Open Event Converts from Events toolbar | No | No | Yes | Yes | No |
| Open Event Converts from Event Detail | No | Yes (via covert button) | Yes | Yes | Yes |
| View Tasks tab in Event Administration | No | No (disabled) | No (disabled) | Yes | No (disabled) |
| Open a person's Task Completion Data | No | No | No | Yes | No |
| Create a task | No | Yes | Yes | Yes | Yes |
| Close a task | No | Yes, for visible tasks | Yes, for visible tasks | Yes, for visible tasks | Yes, for visible tasks |
| See all follow-up tasks returned for the leader | No | Yes (server-scoped) | Yes (server-scoped) | Yes (server-scoped) | Yes (server-scoped) |
| See only own open tasks in My Tasks | No | Yes | Yes | Yes | Yes |
| See Ministry overview | No | Yes | Yes | Yes | Yes |
| Use Service Check-In Check-In tab | No | No | Yes | Yes | No |
| Add a person from Service Check-In | No | No | Yes | Yes | No |
| Check a person into a service | No | No | Yes (eligible day/record) | Yes (eligible day/record) | No |
| View Service History | No | No | Yes | Yes | No |
| View attendance details | No | No | Yes | Yes | No |
| View new people for a service | No | No | Yes | Yes | No |
| View converts for a service | No | No | Yes | Yes | No |
| Log out | No | Yes | Yes | Yes | Yes |

### 34.3 Data-scope matrix

| Data set | Scope rule | Applies to |
|---|---|---|
| Event groups | All groups returned by the backend | Every role that reaches Events |
| Events — Admin | All rows in the selected group's sheet | Admin |
| Events — non-Admin | `event.Email == authUser.email` **OR** `event["Leader at 12"] == "<name> <surname>"` | Leader, Registrant, unknown role |
| Events — future/invalid | Removed for every role | All |
| Tasks — My Tasks | `Assigned == "<name> <surname>"` and `TaskStage != "closed"` after fetching by leader | All logged-in roles |
| Tasks — Follow Ups | Everything returned by the leader-scoped endpoint, then `TaskType == "follow-up"` and `TaskStage == "open"` | All logged-in roles |
| Tasks — Ministry Tasks | Everything returned by the leader-scoped endpoint, filtered by `Timestamp` and grouped where `Leader == current user` | All logged-in roles |
| Tasks — Admin oversight | All tasks returned by `GetAllTasks("Admin")`, reduced to closed tasks per person for the selected period | Admin |
| People | Full people list, requested without a user scope | Event Detail, Service Check-In, legacy Cells |
| Service attendance | Full people list plus all date-key columns | Admin, Registrant on Service Check-In |
| Converts | Consolidation tasks returned by the task endpoint; no additional role filter inside the drawer | Admin, Registrant, or any role reaching the covert modal |
| Create Person | Existing people list for autocomplete and ID collision checks | Any role that can open the modal |

### 34.4 Route-guard implementation details

| Route | Guard expression | Practical effect |
|---|---|---|
| `/` | `isLoggedIn() ? <Home/> : <RegistrationForm/>` | Logged-out users see the auth form at the root URL |
| `/register` | None | Always renders the auth form, even for a logged-in user |
| `/events` | `isLoggedIn()` | Any logged-in role, including unknown roles |
| `/followups` | `isLoggedIn()` | Any logged-in role |
| `/ministrytask` | `isLoggedIn()` | Any logged-in role |
| `/people` | `isLoggedIn()` | Any logged-in role |
| `/tasks` | `isLoggedIn()` | Any logged-in role |
| `/pidassessments` | `isLoggedIn()` | Any logged-in role |
| `/servicecheckin` | `isLoggedIn() && role === "Admin"`, or `role === "Registrant"` | Admin must be logged in; Registrant is allowed by role alone |
| `*` | None | 404 text is visible to anyone, including logged-out visitors |

**Guard quirk:** every route guard is evaluated when `createBrowserRouter` builds the route tree at module load, not on each navigation. Login works around this by calling `window.location.reload()` after two seconds. Logout does not reload, so after logout a browser Back action or a direct link to a previously authorised route can still render the cached route element; the component then reads `authUser` from cleared storage and fails. The Registrant branch is especially permissive because it does not require `loggedIn` at all.

**Guard quirk:** the module-level `authUser` constant is not reactive. Any future login flow that navigates without reloading would keep the old role and the old route elements.

### 34.5 UI-level versus data-level enforcement

| Control | Enforced in UI | Enforced by backend |
|---|---|---|
| Service Check-In route | Yes — route guard and sidebar disable | Not verifiable from client |
| Event Tasks tab | Yes — tab disabled | No client-side check on the task endpoint |
| Event create/edit/delete | Yes — buttons hidden | Endpoint does not receive a role from the client |
| Event data scope | Yes — client filters rows after receiving all data | The client requests the whole group and filters locally, so the full data reaches the browser before filtering |
| View Converts button | Yes — role check | Endpoint does not receive a role |
| My Tasks scope | Yes — client filter | Server is called with the leader name; no token |
| Task close | Yes — only visible rows have Edit | Endpoint receives only a task ID |
| Person creation | Yes — modal visibility | Endpoint receives no role |
| Delete password | Yes — password dialog | Password is hard-coded in the client bundle |
| Logout | Yes — clears storage | No server session to invalidate |

The event data-scope point is the most significant: non-Admin users receive the entire event group payload and only then have rows filtered in the browser. Anyone able to inspect network traffic or the client state can see events the UI hides.

### 34.6 Permission-related limitations

- No role-management screen, invitation flow, approval queue or user administration.
- No way to promote a Leader to Registrant or Admin inside the UI.
- No team/group membership model; event and task scope is name-string matching.
- No record-level permission for individual events, people or tasks.
- No separation between "view" and "edit" for event operators: anyone who can open an event can complete it, mark it Did Not Meet, add people, capture payments and create converts.
- No audit log of who changed a status, captured a person or created a task.
- No server-verified identity on any endpoint; the app relies entirely on the spreadsheet/Apps Script deployment for any additional protection.
- No session timeout, refresh token, device management or "log out everywhere".
- No password reset, password change or email verification.
- No protection against a logged-in user calling an endpoint directly with crafted parameters.
- No distinction between "Registrant" and "Leader" on Follow Ups, Ministry Tasks or My Tasks; the difference is limited to Service Check-In, View Converts and event data scope.

---

## 35. Known Limitations and Observed Behaviour

> This section records behaviours visible in the source. Some depend on the live Google Sheets data or Apps Script deployment and may present differently if the backend supplies fields the client does not write.

### 35.1 Functional blockers and high-impact gaps

| # | Limitation | Impact | Evidence / behaviour |
|---|---|---|---|
| 1 | **No custom date-range filter anywhere** | Users cannot answer "show me 1–15 March" or compare arbitrary periods | Only four task presets and a weekday filter exist; no reachable start/end date pair |
| 2 | **Event deletion is not usable** | Events cannot be removed through the visible UI | The Delete Event column renders an empty cell; the delete action is commented out |
| 3 | **Event-group deletion is blocked** | Admins cannot delete a group despite the trash icon | The confirmation checks for an `Event Type` key that group objects do not have, shows "You can only delete individual events…", and closes |
| 4 | **New tasks are not added to the visible list** | Users think a task was lost and must reload | `addTask` succeeds and an alert appears, but `tasksCopy` is not updated |
| 5 | **Pastoral Call and Pastoral Visit are identical** | The two buttons do not implement different workflows | Both call the same `handleOpen`, default to `awaiting-call`, and show the same fields |
| 6 | **Newly created events can disappear immediately** | A successful create appears to fail | The grid hides future events and rows with invalid `Date Of Event`, `Date Captured` or `Date Created`; the create form initialises `Date Created` and `Date Captured` empty |
| 7 | **Service Check-In is unavailable to Leaders** | Leaders cannot check people in, although the navbar still offers the link | Route guard rejects Leader; sidebar item is disabled; navbar is not role-aware |
| 8 | **Coverts Count is always blank** | History cannot show converts per service | The column is defined but never assigned |
| 9 | **Some screens are demos or placeholders** | People and PID Assessments do not perform real work | People is hard-coded; PID is a heading-only placeholder |
| 10 | **No custom reporting** | No way to produce a date-bounded attendance, task or converts report | Only grid CSV export on three screens |

### 35.2 Authentication, session and security limitations

| Limitation | Detail |
|---|---|
| **Client-side authorisation only** | Roles are read from `localStorage`; endpoints do not receive a token or role from the client |
| **Full event payload reaches non-Admins** | The client fetches the entire group and filters rows in the browser, so hidden events are present in memory/network responses |
| **Hard-coded deletion password** | The delete confirmation password is embedded in the client bundle (value intentionally not reproduced here) |
| **No session expiry** | A session lasts until logout or storage clearing; there is no idle timeout |
| **No server-side logout** | Logout clears browser storage and navigates away; no server session is invalidated |
| **No password reset or change** | Users cannot recover or rotate credentials inside the app |
| **No email verification** | Sign-up accepts any email format that passes the client-side regex |
| **No account management** | No profile edit, account deletion, role request or user administration |
| **No rate limiting or lockout visible** | Login attempts are handled entirely by the backend; no client-side throttle exists |
| **Stale module-level role** | `Routes.jsx` reads `authUser` once at module load; role changes depend on a full reload |
| **Registrant guard precedence** | The Registrant branch of the Service Check-In guard does not require `loggedIn` |
| **Stored profile is unvalidated** | Any JSON placed in `localStorage.authUser` is trusted by the UI until an API call fails |
| **Sensitive data in client storage** | The full login response, including role and profile, is stored unencrypted in `localStorage` |
| **No CSRF/XSS hardening visible** | The app uses `text/plain` POST bodies and renders backend strings directly; no sanitisation layer was found |
| **No audit trail** | No record of who completed an event, captured a person, changed a task or deleted anything |

### 35.3 Data integrity and consistency limitations

| Limitation | Detail |
|---|---|
| **Name-based joins** | Tasks, events, leaders and attendance are linked by full-name strings; duplicate names or spacing differences break matching |
| **Inconsistent leader field names** | `Leader @1728` and `Leader @ 1728` coexist; `Leader at 12` differs from `Leader @12` |
| **Inconsistent person name fields** | `Name`, `Names`, `firstName` and `lastName` are mixed across creation paths |
| **Duplicate invitation fields** | `InvitedBy` and `invitedBy` can both be written |
| **Random six-digit person IDs** | Collision check is local and not atomic; concurrent creation can collide |
| **Timestamp event IDs** | Two events created in the same millisecond would collide; IDs are generated when the modal opens, not when submitted |
| **No uniqueness checks** | Duplicate emails, phone numbers and people are accepted |
| **No validation of required fields at submit** | Most forms use visual `required` markers but custom submit handlers bypass native validation |
| **No numeric validation on rates/payments** | Rate values are free text; payment parses floats and can produce `NaN` |
| **Multiple date formats** | `YYYY-MM-DD`, `d Month yyyy`, `dd - mm - yyyy`, `M/D/YYYY` and ISO-minute timestamps coexist |
| **No timezone metadata** | All dates are interpreted in the browser's local timezone |
| **Attendance stored as columns** | Each new service creates a column; renaming a service or time strands history |
| **No backdating** | Service Check-In always writes today's date and a fixed service time |
| **No undo** | Captures, status changes, check-ins and task closures cannot be reversed in the UI (except toggling an attendee capture) |
| **No soft delete** | Deletions, where reachable, are direct |
| **No transaction boundaries** | Creating a person then a follow-up task is two calls; failure of the second leaves a person without a task |
| **Optimistic local updates** | Event create/edit, attendee capture and task close update local state before or without a full refetch, so state can diverge from the sheet |
| **Cache staleness** | Legacy Cells caches people and events in `localStorage`; other screens fetch fresh data |
| **Task context divergence** | Local copies on My Tasks and Follow Ups do not stay in sync with the shared context |
| **`Date Created` exact matching** | "New People" depends on a formatted string containing the service date; a format change silently returns nobody |
| **Service Check-In task recipient bug** | The automatic follow-up uses `newPerson.firstName`/`lastName`, which the active form does not provide; the task recipient may be blank or "undefined undefined" |
| **Event `Leader at 12` conditional** | The field is only rendered for Cells or blank event types, so other groups cannot set the value used for non-admin event scoping |
| **`Date Created` not written by create-event form** | Visibility depends on the backend populating it |
| **No schema validation** | Missing or renamed columns fail silently as blanks |

### 35.4 User-experience limitations

| Limitation | Detail |
|---|---|
| **Native alerts dominate** | Blocking browser dialogs on most task and service actions; inconsistent with the styled event alerts |
| **Dialogs close after failure** | Create Event, Create Person and some task flows close in `finally`, losing input |
| **No error boundary** | A render-time exception can blank the page; no fallback UI was found |
| **No empty-state guidance** | Empty grids show the default "No rows" area without an explanation or reset action |
| **No loading skeletons** | Full-page spinners and blank grids; layout can jump |
| **No result counts** | Search and filters do not say how many matches were found |
| **No active-filter chips** | Users cannot see which filters are applied without reopening the dialog |
| **Clear Filters does not clear** | Dialog-local reset only; grid remains filtered |
| **Search label is wrong on Tasks** | Still says "Search by Event Name or Event Leader" while matching `Assigned` |
| **Filter dialog title is legacy** | "Filter Cells" appears for every event group and "Filter People Tasks" for the task tab |
| **Filters are lost on navigation** | No URL state, saved views or persistence |
| **No global search** | Users must know which screen holds the record |
| **No bulk operations** | Selection is disabled on every reviewed grid; no bulk close, capture, export or delete |
| **No duplicate detection UI** | Creating an existing person is silent |
| **No confirmation for most actions** | Capturing, completing and closing happen immediately |
| **Confirmation only for destructive/financial actions** | Delete, logout, payment and close-task status |
| **No tooltips on disabled controls** | Users cannot tell why Check-In or a tab is disabled |
| **Inconsistent terminology** | Covert/convert, Ministry Tasks/My Tasks, Leader @1/@12/@144 labels shifted |
| **Fixed-width modals** | Several modals use fixed pixel widths (400–500px) and can overflow small screens |
| **Wide grids on mobile** | Horizontal scrolling is required; no card layout or responsive column hiding |
| **No dark mode** | Single light theme |
| **No localisation** | English only; dates mix browser locale and hard-coded formats |
| **No keyboard shortcuts** | None documented or implemented |
| **No print layout** | Browser print will include navbar and clipped grids |
| **No onboarding** | New users receive no explanation of roles, cells, converts or task types |

### 35.5 Screen-specific limitations

#### Registration / Home

- `/register` remains available while logged in; a user can open a second login form without logging out.
- Successful auth waits two seconds before navigating and reloading; the delay is not configurable.
- No "show password", remember-me, forgot-password or terms acceptance.
- No password strength meter beyond the six-character minimum.
- Home is a five-image autoplay carousel with no links, content or role-specific dashboard.
- Carousel autoplay cannot be paused by the user; `disableOnInteraction: false` keeps it running after touch.
- No reduced-motion handling.

#### Event Administration

- No "All event groups" view.
- No event-group edit, rename, archive or reorder.
- Event group selection defaults to Cells; if that group is absent, the screen has no valid initial selection.
- Event heading can overlap the search/filter row on narrow layouts.
- Search does not search attendees, dates, status or address.
- Status tabs only appear for exactly `Cells` and `Training`.
- Status values and labels differ in case ("Did not meet" button, `Did Not Meet` data).
- The Tasks tab is a summary only; it cannot create, edit, reassign or inspect a task beyond a read-only modal.
- The Task Completion Data modal displays its recommitment/first-time commitment summary as zeros when opened from Admin because no `decisionCounts` prop is passed.
- The same modal intends to hide `open` tasks, but a typo in `serachedRows.lenght` means the filtered `filteredRows` variable is never used; open tasks can appear in the modal.
- Task summary initial scope is current week, but applying a period can change the scope without changing the visible label.
- The Tasks tab search is not reliably reflected in the summary grid.
- Event grid page size is small (5) with no toolbar, making large groups laborious.
- Future events are hidden, so upcoming-event planning is impossible in this grid.
- Event rows require all three dates to be valid; one bad cell removes the event.
- Event detail is dense and combines capture, associate, check-in, payment and completion in one modal.
- Event detail has no role gating beyond opening the row.
- Event detail footer always offers **Did Not Meet** and **Save**, even for an already-complete event.
- Completing an event does not visibly update the grid status until reload.
- The top **View Converts** button is hidden from Leaders, but the covert button inside Event Detail is available to them.
- Payment modal allows partial payment, warns, and captures anyway.
- Payment does not allocate against named rates.
- No refund, receipt, payment method or payment date field.

#### Follow Ups

- No dedicated search or date filter.
- Fixed scope: only `follow-up` tasks with stage exactly `open`.
- Tasks assigned to others are not visibly distinguished because there is an **Assigned To** column but no "mine only" filter.
- New tasks do not appear until reload.
- Closing a task removes it locally but the table height is fixed at 400px.
- Page size 5 by default, with 5/10/15 options.
- No count of open follow-ups.
- No overdue highlighting except the shared red text for a literal `Overdue` stage.
- No sorting by urgency beyond column sort.
- The two creation buttons are indistinguishable in behaviour.
- The unused Create Person modal is mounted but never opened.

#### My Tasks

- Only open tasks assigned to the current user; closed tasks disappear.
- No date filter, due-date range or overdue-only view.
- No priority, notes, description or task detail view.
- Editing is limited to changing stage to Closed.
- Cannot reassign, reschedule, edit type, edit recipient or delete.
- The status select starts at Open, so pressing Save without changing it produces a warning rather than a no-op.
- New tasks do not appear until reload.
- Page size fixed at 10.
- No task counts, grouping or summary.
- No link from a task to the related person or event.

#### Ministry Tasks

- Only four fixed periods; no custom range.
- The period effect depends only on `filter`, so changes to the task context do not automatically recalculate until the period changes or the page remounts.
- Counts include only `closed` tasks.
- Team grouping depends on `task.Leader` matching the current user's full name.
- The derivation can include a person only once and has complex fallback logic that may omit or misattribute disciples.
- No task list, task detail or drill-down from a count.
- Accordion sections show names and counts, not the underlying tasks.
- No search, export or date range.
- Fetch failures are silent in the UI.

#### Service Check-In

- Available only on Friday, Sunday and Monday; all other days show disabled Check-In buttons.
- Only two service options, with times fixed in code (Friday 18:30; other eligible days 09:00).
- No custom service, location, campus or session.
- No backdating or correcting a previous service.
- Check-in writes today's date only.
- The Check-In button is disabled once any matching date key is true; there is no undo in the UI.
- The check-in request does not surface failure; the modal closes and the local row may still update.
- The local row update sets a generic `checkedIn` flag that is not the same as the date-key property used by the button.
- History has no search, filter, pagination controls or export.
- History counts only people who have `true` for the derived key; duplicate keys or malformed dates are ignored.
- **Coverts Count** is blank.
- New People matching is an exact formatted-date substring check.
- Attendance modal search can throw when `Leader @144` is missing.
- Attendance modal labels the leader hierarchy one level lower than the stored values.
- Person creation writes a follow-up task with inconsistent name fields and can fail after the person is already created.
- No duplicate person detection.
- No ability to mark someone absent, remove a check-in or edit attendance.

#### People / PID Assessments / 404

- People is a hard-coded demo with no backend reads or writes.
- People is not linked from the navbar or drawer.
- PID Assessments is a heading-only placeholder.
- 404 is unstyled text with no navigation, search or return-home button.
- The 404 route is available to logged-out users, unlike every other non-auth route.

### 35.6 Reporting and export limitations

- CSV export exists only on My Tasks, Follow Ups and Service Check-In Check-In.
- No export on Event Administration, event detail, attendance, task summary, converts or history.
- No PDF, Excel, JSON or scheduled export.
- No report builder, column chooser for exports, date-bounded export or email delivery.
- No totals row, pivot, chart or trend.
- No historical snapshot; every report is a live read of the sheet.
- No data dictionary in the UI.
- No way to export a person's full attendance history.

### 35.7 Performance and scale limitations

- All event, task, person and attendee data is fetched without pagination.
- Search, filter and sort are client-side; large sheets increase initial load and memory use.
- Multiple screens fetch overlapping data independently.
- Event detail refetches the attendee sheet each time it opens.
- The event grid renders a dynamic column set from the first row; heterogeneous rows can hide fields.
- DataGrids with many dynamic attendee columns can become wide and slow.
- No request cancellation; navigating away during a fetch does not abort it.
- Limited caching: the people list is cached in IndexedDB and legacy Cells caches in `localStorage`; tasks, events, attendance and reports are fetched live on each screen.
- No virtualisation beyond what DataGrid provides.
- Alerts and reloads interrupt flow rather than updating in place.

### 35.8 Accessibility and inclusive-design limitations

- Several icon-only buttons use a generic `aria-label="edit"` even when the action is "open event" or "view".
- Colour alone communicates task status (red vs green) and selected status tabs.
- Native alerts are accessible to screen readers; the custom top alert lacks explicit `role="alert"`/`aria-live`.
- No skip link, focus outline customisation or keyboard navigation documentation.
- Fixed-width modals and 80–95% viewport layouts can overflow at 200% zoom.
- Tables rely on horizontal scrolling rather than responsive alternatives.
- Search fields generally lack explicit `aria-label`s beyond their visible labels.
- Disabled controls have no explanatory text for assistive technology.
- The carousel has no pause control and no reduced-motion alternative.
- Colour contrast of white text on the translucent black navbar is likely acceptable, but secondary grey text on white is not verified against WCAG AA.

### 35.9 Features that are visibly absent

- Password reset/change, email verification, MFA.
- Profile and account settings.
- User/role administration.
- Notification centre, email or SMS notifications.
- Global search.
- Saved filters or views.
- Custom date ranges.
- Bulk actions.
- Recurring event generation (the `Reoccurring` flag is stored but unused).
- Event registration/public RSVP.
- Attendance self-service.
- Payment gateway, receipts or refunds.
- Task reminders, escalation or recurrence.
- Comments, mentions or activity feeds.
- File attachments.
- Audit log or change history.
- Import.
- Offline mode.
- Dark mode or theming.
- Multi-language.
- Public website pages.
- Mobile app.

### 35.10 Behaviour that may look like a bug but is intentional in code

| Behaviour | Why it happens |
|---|---|
| Future events are invisible | `processData` deliberately keeps only events before the current moment |
| A created event disappears | Same future-event rule, often combined with empty date fields |
| Check-In is disabled on most days | The weekday whitelist is explicit |
| Only two services appear | The service list is generated from the weekday and hard-coded times |
| The Tasks filter has no "Did Not Meet" option | The filter dialog only offers Complete/Incomplete |
| Service Check-In is missing for Leaders | The route and sidebar explicitly exclude Leader |
| The event filter dialog says "Cells" for every group | The title is hard-coded |
| The covert modal asks for Event Type twice | Two autocompletes share the same label |
| No delete control on event rows | The cell renderer is intentionally empty in the current code |
| No People link | The page is unlisted and demo-only |

---

## 36. Legacy and Non-Routable Code (Not Visible on the Site)

The repository contains a second, older application surface that is not reachable through the router. It is documented here so that anyone reviewing the codebase does not mistake it for a live feature, and so that future work does not accidentally revive half-finished behaviour.

### 36.1 Unrouted pages

| Path | Status | What it contains | Why it is not visible |
|---|---|---|---|
| `src/pages/Cells/Cells.jsx` | **Not routed** | A full "Cells" page with Incomplete / Complete / Did not meet tabs and a shared `CellDataGrid` | Never imported by `Routes.jsx`; no `/cells` route |
| `src/pages/Leader/Leader.jsx` | **Not routed** | A component that renders only the word **Leader** | Never imported by `Routes.jsx`; no `/leader` route |
| `src/pages/People/People.jsx` | Routed but demo | Hard-coded people cards | Reachable only by typing `/people`; not linked in navigation |
| `src/pages/PIDAssessments/PIDAssessments.jsx` | Routed placeholder | Heading-only page | Reachable only by typing `/pidassessments`; no workflow |

There is no navigation item for Cells or Leader, no redirect to them, and no feature flag that enables them.

### 36.2 Legacy Cells component family

| Component | Used by | Live? | Description |
|---|---|---|---|
| `src/components/CellDataGrid/CellDataGrid.jsx` | `pages/Cells/Cells.jsx` | No | Large legacy grid covering cell events, attendance, check-in, new-person creation, covert capture and completion. Uses `localStorage` caches (`cellEvents`, `allPeopleRows2`) and legacy environment endpoints. |
| `src/components/NewCellModal/NewCellModal.jsx` | `CellDataGrid` | No | Cell creation modal. **Contains the only MUI `DatePicker` in the repository.** Also has time, leader, location and recurrence-style fields. |
| `src/components/EditCellModal/EditCellModal.jsx` | `CellDataGrid` | No | Cell editing modal; shows an "Invalid index" alert if the row cannot be matched. |
| `src/components/CellDataGrid/AttendanceDrawer.jsx` | `CellDataGrid` | No | Legacy attendance drawer with person search, check-in and a "Did not meet" action. References an undefined `STATUS_UPDATE_API` constant, so that action would fail if the drawer were reachable. |
| `src/ContextProvider/CellContext.jsx` | App root | Indirectly | Provides cell state used only by the legacy surface. |
| `src/contexts/CellContext/useCellContext.jsx` | `NewCellModal` | No | Wrapper hook around the legacy cell context. |

These files are the source of several misleading artefacts in the codebase:

- The only custom `DatePicker` control.
- The only `cellEvents` and `allPeopleRows2` localStorage caches.
- A second attendance drawer that is unrelated to the live Service Check-In attendance modal.
- Legacy service URLs and a second "Did not meet" implementation.

### 36.3 Duplicate and unused modals/components

| Component | Status | Notes |
|---|---|---|
| `src/common/CreatePersonModal/CreatePersonModal.jsx` | Mounted but never opened on Follow Ups | A simple "Add Person" form with Invited By, Leader, First/Last Name, Gender, Date of Birth, Email, Mobile Phone and Address. No state, no submit handler, no API call. The live Create Person flow is `src/components/CreatePersonModal/CreatePersonModal.jsx`. |
| `src/common/Alert.jsx` | Live | Global event alert; listed here only because it is one of two alert systems. |
| `src/common/ConfirmDeleteModal/ConfirmDeleteModal.jsx` | Live but unreachable outcome | Opens from Admin group trash; always blocks group deletion. |
| `src/common/PasswordModal/PasswordModal.jsx` | Live behind the broken delete flow | Contains a hard-coded password (not reproduced here) and inverted event/group branch labels. |
| `src/common/EditTaskModal/EditTaskModal.jsx` | Live | Only closes tasks; does not edit any other field. |
| `src/common/ViewTaskDataModal/ViewTaskDataModal.jsx` | Live | Read-only task list with a recipient filter and summary cards. |
| `src/components/CovertsButton/CovertsButton.jsx` | Live | Event Detail covert capture button; opens the shared task modal with event context. |
| `src/components/ViewConverts/ViewConvertsButton.jsx` | Live | Event Administration **View Converts** icon; opens the converts drawer. |
| `src/components/ViewConverts/ViewConvertsDrawer.jsx` | Live | Grouped converts table and recipient drill-down. |

### 36.4 Dead, legacy and easily-confused utilities

| Item | Status | Detail |
|---|---|---|
| `src/utils/constants.jsx` | Dead and invalid | Exports `eventGroupTemplate` and `eventTemplate`, but `eventTemplate` references `rates`, `authUser`, `timestamp` and `sheetID`, which are not defined in the module. Importing it would throw at module evaluation. Nothing imports it. |
| `deleteTask` in `src/Apis/Apis.jsx` | Unused | Defined and imported by My Tasks, but the call is commented out and there is no delete control. |
| `getSpecificEventDataByEmail` in `src/Apis/Apis.jsx` | Unused | Import is commented out in Admin. |
| `fetchCells` / `createCell` | Legacy only | Used by the unrouted Cells surface. |
| `STATUS_UPDATE_API` in `AttendanceDrawer` | Undefined | Referenced but never declared or imported. |
| `src/utils/IndexedDB.js` | Live | Used by `AllPeopleProvider`, not legacy; included here because it is easy to mistake for dead code. |
| `src/context/User-Context.jsx` | Active but hollow | Wraps the app but its effect only calls `console.log()`; it does not load or expose a real user. |

### 36.5 Commented-out or disabled controls in live code

These are not separate screens, but they explain missing capability:

| Location | Commented/disabled item | Effect |
|---|---|---|
| Event grid Delete Event column | Entire delete button renderer | No row-level deletion |
| My Tasks | Date-range `TextField`s | No date filter |
| Follow Ups | Date-range `TextField`s | No date filter |
| My Tasks | `deleteTask("37")` test block | No deletion |
| Admin | `getSpecificEventDataByEmail` import | Email-specific fetch unused |
| Service Check-In toolbar | `GridToolbarColumnsButton` and `GridToolbarDensitySelector` | No column or density controls |
| Admin event detail | Old alert calls around capture | Some capture feedback paths are dead |
| Admin group buttons | Delete icon is live, but the action is blocked | Misleading affordance |
| Routes | Duplicate `/pidassessments` block | One active placeholder, one commented duplicate |

### 36.6 Legacy data paths to avoid

If the old Cells surface were ever re-enabled, these behaviours would conflict with the live app:

- It reads and writes legacy `localStorage` caches that the live screens do not use.
- It uses different endpoint environment variables.
- It has its own check-in and attendance UI, separate from Service Check-In.
- It has a separate new-person flow, separate covert flow and separate completion flow.
- Its attendance drawer's status update references an undefined API constant.
- It uses the only date picker, which the live filters still do not use.
- It labels leader levels differently from the live Service Check-In modal.

### 36.7 What is genuinely live

For clarity, the live routed surface is:

```text
/                 Home (or Registration when logged out)
/register         Registration / Log In
/events           Event Administration
/followups        Follow Ups
/ministrytask     Ministry Tasks
/tasks            My Tasks
/people           Hard-coded People demo
/pidassessments   Placeholder
/servicecheckin   Service Check-In (Admin/Registrant only)
*                 404 text
```

Everything else in `src/pages`, `src/components/CellDataGrid`, `src/components/NewCellModal` and `src/components/EditCellModal` is either a supporting component for a live screen or legacy code that is not reachable through the router.

---

## 37. Glossary

| Term | Meaning in Active Teams |
|---|---|
| **Active Kids Service** | One of the two check-in service options; offered on Friday at 18:30 and on Sunday/Monday at 09:00. |
| **Active Service** | The adult/general service option, using the same day/time rules as Active Kids Service. |
| **Active Teams** | The name of the application and the ministry operations system it supports. |
| **Admin** | The highest role. Sees all events, can create event groups and events, edit events, access the Tasks oversight tab and reach Service Check-In. |
| **Apps Script** | Google's serverless scripting platform used as the backend between the React app and Google Sheets. |
| **Attendance key** | A dynamically named person-sheet column such as `23 October 2026 - Active Service - Sunday 09:00` whose value is `true` when the person attended. |
| **Cell / Cells** | A small group meeting, and the default event group on Event Administration. Also the name of the unrouted legacy Cells page. |
| **Check-in** | The act of marking a person as present at a service or event. Service Check-In writes a date/service key; event capture writes an attendee row. |
| **Consolidation** | The follow-up process for a new convert, represented by the task type `Church - Consolidation`. |
| **Convert** | A person who has made a commitment; the application usually spells this **Covert** in the UI. |
| **Covert / Covert capture** | The UI's spelling of "convert". Capturing a covert creates a `Church - Consolidation` task with a decision value. |
| **Covert count** | The number of converts for a service. The History column exists but is never populated. |
| **Disciple** | A person led or mentored by the current user; used in the Ministry Tasks overview. |
| **Event** | A dated occurrence inside an event group, such as a Sunday service, cell meeting or training session. |
| **Event group** | A category/sheet of events, e.g. Cells or Training. Each group has a `SheetID` and a ticketed flag. |
| **Follow Up** | A task category (`follow-up`) for contacting or caring for a person. Also the name of the Follow Ups screen. |
| **Global event** | An event-group flag stored on the group; its reachable behavioural effect is not evident. |
| **Leader** | The default self-registration role. Has standard access, restricted event visibility and no Service Check-In. Also used generically for a person who leads others. |
| **Leader @1 / @12 / @144 / @1728** | The leadership hierarchy levels. The UI labels are shifted one level relative to the stored field names: what is displayed as "Leader @1" is stored in `Leader @12`, and so on. |
| **MUI / Material UI** | The React component library used for the interface, including DataGrid, dialogs, tabs and alerts. |
| **Ministry Task** | A task record used for pastoral care, follow-up, consolidation or connection. The Ministry Tasks screen summarises completed tasks for the user and their disciples. |
| **My Tasks** | The screen listing open tasks assigned to the logged-in user. |
| **Pastoral Call** | A task intended to represent a phone call. In the current UI it opens the same form as a pastoral visit. |
| **Pastoral Visit** | A task intended to represent an in-person visit. In the current UI it opens the same form as a pastoral call. |
| **Person** | A record in the people sheet, identified by a six-digit ID and a full name. |
| **PID Assessment** | An intended assessment feature; currently a heading-only placeholder. |
| **Rate** | A named price option on a ticketed event, stored as `{ name, value }`; not used by the payment calculation in the reviewed code. |
| **Recipient** | The person a task is about (as opposed to the assignee, who must complete it). |
| **Registrant** | A provisioned role with standard access plus Service Check-In and View Converts. |
| **Service Check-In** | The screen for checking people into Friday/Sunday/Monday services and reviewing attendance history, new people and converts. |
| **SheetID** | The backend identifier for an event group's spreadsheet/tab; required for event and attendee API calls. |
| **Task stage** | The workflow state of a task: `open` or `closed` (with `Overdue` handled visually if present). |
| **Task type** | The category of a task, e.g. `follow-up`, `awaiting-call`, `Church - Consolidation`, `wrong-number`. |
| **Ticketed** | An event-group flag indicating that attendees have a cost and payment must be captured. |
| **Timestamp** | The task creation date/time, stored as `YYYY-MM-DDTHH:mm` and used for all task period filters. |
| **View Converts** | The drawer that groups consolidation tasks by event and date and lists recipients with their decisions. |

---

## 38. Final Capability Summary Checklist

### 38.1 End-to-end user journeys that work today

- [x] A new user can sign up, receive the Leader role automatically, and be logged in.
- [x] An existing user can log in and is redirected to Home after a short delay.
- [x] A logged-in user can navigate to Home, Events, Follow Ups, Ministry Tasks, My Tasks and (by URL) People/PID Assessments.
- [x] An Admin or Registrant can open Service Check-In; a Leader cannot.
- [x] An Admin can create an event group; it appears immediately as a new group button.
- [x] An Admin can create a future event in a group; the write succeeds, although the row is normally hidden until the event date and required date fields are valid.
- [x] An Admin can edit an existing event's core fields and status.
- [x] Any role that can see an event can open it and capture attendees, associate existing people, review checked-in people, add a new person, capture a covert, capture payment for a ticketed group, and mark the event Complete or Did Not Meet.
- [x] A user can create a task from My Tasks, Follow Ups or Ministry Tasks, and from the covert flow on Events/Service Check-In.
- [x] A user can close a task from My Tasks or Follow Ups.
- [x] A user can view their own completed-task count and their disciples' completed-task counts for a selected period on Ministry Tasks.
- [x] An Admin can view per-person closed-task counts for a period on the Event Administration Tasks tab and drill into a read-only task list.
- [x] A user can search events by name or leader, filter by weekday/status, and switch status tabs for Cells/Training.
- [x] A user can view all event converts grouped by event and date, then drill into recipients.
- [x] An Admin or Registrant can check a person into an eligible service, see a success alert, and review service history.
- [x] A user can view attendance details and new people for a service.
- [x] A user can log out through the avatar menu and is returned to the registration screen.
- [x] CSV export works from My Tasks, Follow Ups and Service Check-In Check-In.

### 38.2 Capability checklist by area

#### Authentication and session

- [x] Sign-up with name, surname, email and password.
- [x] Log-in with email and password.
- [x] Client-side validation for required fields, email format and password length.
- [x] Session persisted in localStorage.
- [x] Logout confirmation and storage clearing.
- [ ] Forgot password.
- [ ] Change password.
- [ ] Email verification.
- [ ] Multi-factor authentication.
- [ ] Session expiry.
- [ ] Profile management.
- [ ] Role management.

#### Global shell

- [x] Fixed top navbar with four primary links.
- [x] Slide-out drawer with six links.
- [x] Avatar initials, deterministic colour and logout menu.
- [x] Global top alert on Event Administration.
- [x] Page and button loaders.
- [ ] Global search.
- [ ] Notification centre.
- [ ] Dark mode.
- [ ] Language switcher.
- [ ] Help/onboarding.
- [ ] Responsive mobile navigation pattern beyond the drawer.

#### Events

- [x] Event-group buttons.
- [x] Status tabs for Cells/Training.
- [x] Event search.
- [x] Day/status filter dialog.
- [x] Event DataGrid with sorting and pagination.
- [x] Event Detail with three tabs.
- [x] Capture/uncapture attendees.
- [x] Associate existing people.
- [x] Add new person from Event Detail.
- [x] Capture covert from Event Detail.
- [x] Payment confirmation for ticketed groups.
- [x] Complete event.
- [x] Mark event Did Not Meet.
- [x] View Converts drawer for Admin/Registrant.
- [x] Admin Tasks oversight tab.
- [x] Admin event creation.
- [x] Admin event-group creation.
- [x] Admin event editing.
- [ ] Event deletion from the grid.
- [ ] Event-group deletion.
- [ ] Event duplication or recurrence generation.
- [ ] Attendance editing/removal.
- [ ] Export from the event grid.
- [ ] Custom date range.
- [ ] Upcoming-events view.

#### Tasks and follow-ups

- [x] Create task modal with type, recipient, assignee, due date and state.
- [x] Create task from My Tasks, Follow Ups and Ministry Tasks.
- [x] Create covert/consolidation task from Events and Service Check-In.
- [x] Close task.
- [x] My Tasks list of open tasks assigned to the current user.
- [x] Follow Ups list of open follow-up tasks.
- [x] Admin task summary by person and period.
- [x] Read-only Task Completion Data modal.
- [x] Ministry Tasks period select and completed counts.
- [ ] Edit task fields other than stage.
- [ ] Reassign or reschedule a task.
- [ ] Delete a task.
- [ ] Task detail view.
- [ ] Reminders or notifications.
- [ ] Custom date range.
- [ ] Search in My Tasks.
- [ ] Immediate list refresh after creation.

#### Service Check-In

- [x] Check-In tab with person search.
- [x] Friday/Sunday/Monday eligibility.
- [x] Two service options with fixed times.
- [x] Per-person check-in modal.
- [x] Success alert.
- [x] CSV export from the check-in list.
- [x] History tab with service-date rows.
- [x] Attendance count.
- [x] View Details.
- [x] View New People.
- [x] View Converts/Consolidations.
- [x] Add Person flow.
- [ ] Coverts Count.
- [ ] Backdating or correcting attendance.
- [ ] Undo check-in.
- [ ] Service/location configuration.
- [ ] Search or date filter in History.
- [ ] Export from History.

#### People and assessments

- [x] Add Person modal from Event Detail and Service Check-In.
- [x] Automatic leader hierarchy derivation.
- [x] Automatic follow-up task creation after adding a person.
- [x] People demo page by direct URL.
- [x] PID Assessments placeholder by direct URL.
- [ ] Real people directory.
- [ ] Edit person.
- [ ] Archive/delete person.
- [ ] Duplicate detection.
- [ ] PID assessment workflow.

#### Navigation and recovery

- [x] Home.
- [x] Drawer and navbar navigation.
- [x] Logout.
- [x] 404 text for unknown routes.
- [ ] Styled 404 with return link.
- [ ] Error boundary.
- [ ] Offline handling.
- [ ] Retry actions.

#### Data, export and reporting

- [x] Live reads from Google Sheets via Apps Script.
- [x] CSV export on three grids.
- [x] Converts grouping by event/date.
- [x] Attendance counts.
- [x] Task completion counts.
- [ ] Custom date range.
- [ ] PDF/Excel export.
- [ ] Scheduled reports.
- [ ] Event/attendance export.
- [ ] Audit trail.
- [ ] Data import.
- [ ] Bulk operations.

### 38.3 The report in one paragraph

Active Teams is a login-gated ministry operations SPA with a functional authentication shell, a rich event and attendance workflow, task creation and closing, follow-up and ministry overviews, and a working service check-in and history surface for Admins and Registrants. Its day-to-day strengths are event capture, convert tracking and task visibility. Its most important constraints are the absence of any custom date-range filter, broken event deletion, fixed-period-only reporting, client-side permissions, inconsistent data field names, and several flows that succeed without refreshing the visible list. Legacy Cells and Leader pages remain in the repository but are not part of the live site.

### 38.4 Verification notes and caveats

- This report is based on a full source review of `src`, not on browser automation or live API probing.
- Runtime behaviour may differ if the deployed Apps Script returns fields or formats not represented in the client code.
- Sensitive values — backend URLs and the hard-coded deletion password — are deliberately omitted.
- "Configured page size" describes the value in source; MUI DataGrid version behaviour can affect the final rendered footer.
- The report treats modals, drawers and dialogs as screens because they contain their own fields, tables and actions.
- All findings about unreachable or broken features reflect the reviewed source at the time of writing.

---

*End of report.*
