# Active Teams - Regression Test Plan

## 1. Introduction to Active Teams

Active Teams is the church-team operations application represented by this
frontend. It brings together a member profile, people management, events and
attendance, service check-in, daily tasks, statistics, and administrative user
and role management. The signed-in experience is organized around a shared
navigation sidebar and account menu; access and available actions depend on
the signed-in role and, for some users, their cell assignment.

This document is a repeatable manual regression plan. It describes what to
exercise after a release and how to verify visible controls, forms, dialogs,
role access, responsive behavior, and failure states. It is not a record that
the checks have already passed. Record actual outcomes, evidence, and issues
in the run record at the end of this document.

### In scope

- Public authentication and password-recovery pages.
- Every route currently registered by the frontend, including routes that
  are not linked from the sidebar.
- Role-specific views for admin, leader, leader-at-12, user, and registrant.
- Shared shell controls, forms, dialogs, tables, filters, and responsive
  layouts.
- The public event-payment/registration route.

### Important boundaries

- Use dedicated test accounts and non-production data. Do not test delete,
  role-change, password, or attendance mutations against real users or live
  records.
- This is a frontend test plan; successful API-backed checks require a
  reachable backend and the correct test configuration.
- No deployment-history screen or reliable deployed-by record was found in
  the frontend. Section 2 is a release record to be completed from the
  deployment system for each release. The Admin Activity Log is a separate
  application feature and must not be treated as deployment history.
- The event-payment page currently renders fixed demonstration details and a
  placeholder Yoco URL in the frontend. Validate its present rendering, but
  do not treat it as a production payment integration.
- The code defines the `leaderat12` role label in several equivalent formats;
  use a test account whose actual backend role is known, and include a
  normalized-format test when role data can be safely configured.

## 2. Release and deployment record

Complete this section for each release before starting the regression run.
The values below are intentionally blank: the frontend does not establish
when the latest deployment occurred or who initiated it.

| Field | Value |
|---|---|
| Release / version / build identifier | |
| Environment and site URL | |
| Deployed at (include timezone) | |
| Deployed by (person or automation identity) | |
| Approved / initiated by | |
| Change summary (user-visible changes) | |
| Related PRs, tickets, or commits | |
| Backend/API changes or dependencies | |
| Configuration or feature-flag changes | |
| Rollback reference / procedure | |
| Regression run owner | |

### Change-by-change verification

For every change listed above, add a row and link it to at least one check ID
in this plan. Include bug fixes, migrations or configuration dependencies,
and known exclusions.

| Change / ticket | Affected page or flow | Check IDs | Result | Evidence / issue |
|---|---|---|---|---|
| | | | | |

Do not infer a release date, change list, or deployer from the Admin Activity
Log. If a deployment record is unavailable, record that as a release-process
gap and continue with the site checks.

## 3. Test setup and execution rules

### Required test accounts

Prepare one active, independently usable account for each system role:

| Account alias | Expected role | Additional setup |
|---|---|---|
| `qa-admin` | admin | Regular admin, not supreme admin |
| `qa-leader` | leader | Assigned test organization and people |
| `qa-leader12` | leader-at-12 | Assigned hierarchy/leader data |
| `qa-user-cell` | user | Cell assignment present |
| `qa-user-no-cell` | user | No cell assignment |
| `qa-registrant` | registrant | Test registration/profile data |
| `qa-supreme` | admin with supreme-admin flag | Use only when validating supreme-admin actions |

If custom roles are enabled in the environment, add one custom role account and
record its exact backend role string and intended permissions. Do not use a
real person's account as a substitute for a test identity.

### Test data

Keep a small, documented test dataset that can be restored between runs:

- A test organization, cell, leaders, and multiple people in different stages.
- A test event type and events covering upcoming, past, recurring, ticketed,
  and attendance-recorded states where supported.
- At least one attendee, one new person, and one consolidated person.
- Daily tasks in more than one type, status, due-date range, and recipient
  state.
- Reporting data for at least one implemented report, multiple periods and
  campuses, a report with no results, and a dashboard with KPI, chart, and
  table data; include a disposable saved report and scheduled report.
- Synthetic user records for role filters and admin actions.
- Safe email inboxes or a mail-capture service for signup and password flows.

Record the fixture IDs and cleanup owner outside production. For destructive
tests, create a fresh disposable fixture for each run.

### For every check

1. Start from the stated role and route. Record the account alias, browser,
   viewport, environment, and release identifier.
2. Confirm the expected page title/content and wait for loading to finish.
   Check empty, populated, loading, and error states when available.
3. Exercise each control named by the check separately. For inputs, selectors,
   tabs, menus, and filters, test every listed value/option separately; also
   test blank, invalid, boundary, reset/clear, and cancelled states where
   applicable. Do not treat one selection as coverage of the other options.
4. Verify success feedback, refreshed displayed data, and persistence after
   navigating away and returning or reloading when appropriate.
5. Verify that cancelled dialogs do not save, destructive actions require
   confirmation, and a failed request is not presented as a success.
6. Capture an issue with exact reproduction steps and evidence; do not mark
   blocked or skipped checks as passed.
7. Check keyboard operation as well as mouse/touch operation for navigation,
   menus, dialogs, forms, tabs, and controls.

### Mandatory exhaustive control inventory

Apply this inventory to **every registered route in Section 4**, including
parameterized routes, legacy route variants, public routes, and each
role-specific rendering. Apply it again to every modal, drawer, menu, tab
panel, and conditional form opened from those pages. The section-specific
case tables identify expected behavior; this inventory makes sure no
individual visible control is skipped.

Before execution, inspect the rendered screen and record one ledger row for
each individual:

- Button, icon button, link, menu item, tab, carousel indicator, and row/card
  action (including refresh, close, back, next/previous, save, cancel,
  confirm, edit, delete, pause/resume, and download actions).
- Text input, date/time/month input, checkbox, radio, switch, autocomplete,
  search field, and other editable field.
- Filter or selector, with a separate result for **every option** and for
  clear/reset where present. Record options that are dynamic as the exact
  values displayed during the run.
- Repeated control on every relevant row/card or repeated component instance.
  A test of one row's Edit/Delete action does not cover the other rows'
  actions; use fixtures for the first, middle, and last visible rows and
  different states when applicable.
- Conditional control that appears only after a selection, role change,
  validation error, expansion, or responsive breakpoint.

For each ledger row, perform the control's primary action, verify its result
and persistence/URL/network effect as applicable, and exercise its disabled,
loading, validation, failure, and dismissal behavior when that state exists.
For every download/export action, test the resulting file's type, filename,
contents, active filter values, empty-data behavior, and failure behavior.
For every protected route, check signed-out and unauthorized behavior as well
as authorized behavior using the accounts in Section 3. For intentionally
public routes, verify they work signed out and check their behavior when
visited signed in. Do not mark a screen complete while any visible or
conditionally available control/value lacks a result. Do not compress
multiple controls/options into a single Pass result.

Use this ledger format for additional rows as needed; one row means one
control/value/state result, not a whole page or group:

| Check ID | Route / role | Exact control label and type | Exact value / state exercised | Expected result | Actual result / evidence | Status |
|---|---|---|---|---|---|---|
| CTRL-<route>-<number> | | | | | | Not Run |

If the rendered UI contains an option absent from the section-specific case
table, add it to this ledger and test it; update the plan after any UI change
so the inventory remains aligned with the release being tested.

### Result labels

- **Pass** - observed behavior matches the expected result.
- **Fail** - reproducible mismatch; create an issue and link it to the check.
- **Blocked** - required service, credentials, data, or environment unavailable.
- **Not run** - not attempted; never imply it passed.

## 4. Role and route coverage

The role matrix below is based on the routes and sidebar in the frontend.
Direct-route behavior must still be tested: hiding a menu item is not an
authorization test. The wrapper also applies role hierarchy and custom-role
logic, so verify actual access using the test accounts rather than relying on
the menu alone.

| Page / route | admin | leader | leader-at-12 | user with cell | user without cell | registrant |
|---|---:|---:|---:|---:|---:|---:|
| Home `/` | Allow | Allow | Allow | Allow | Allow | Allow |
| Profile `/profile` | Allow | Allow | Allow | Allow | Allow | Allow |
| People `/people` | Allow | Allow | Allow | Deny | Deny | Deny |
| Events `/events` | Allow | Allow | Allow | Allow, cell required | Deny / redirect | Allow |
| Stats `/stats` | Allow | Deny by route gate** | Allow | Deny | Deny | Deny |
| Reports `/reports`, `/reports/:reportType` | Allow | Allow | Allow | Deny | Deny | Deny |
| Reporting Dashboard `/reporting/dashboard` and detail routes | Allow | Allow | Allow | Deny | Deny | Deny |
| Report History `/reporting/history` | Allow | Allow | Allow | Deny | Deny | Deny |
| Scheduled Reports `/reporting/scheduled` | Allow | Allow* | Allow* | Deny | Deny | Deny |
| Admin `/admin` | Allow | Deny | Deny | Deny | Deny | Deny |
| Service Check-in `/service-check-in` | Allow | Allow by hierarchy | Allow | Deny | Deny | Allow |
| Daily Tasks `/daily-tasks` | Allow | Allow | Allow | Allow | Allow | Allow |
| Create/Edit Event `/create-events`, `/edit-event/:id` | Allow | Allow | Allow | Deny | Deny | Deny |
| Attendance `/attendance` | Allow | Allow | Allow | Deny | Deny | Deny |
| Event Details `/event-details` | Allow | Allow | Allow | Allow | Allow | Allow |
| Event registration `/event-payment/:eventId` | Route is not role-wrapped | Route is not role-wrapped | Route is not role-wrapped | Route is not role-wrapped | Route is not role-wrapped | Route is not role-wrapped |

`*` The sidebar includes Scheduled Reports for `admin` only, while its route
also allows `leader` and `leaderat12`. Verify this navigation-versus-route
discrepancy and report the observed behavior.

`**` The sidebar includes Stats for `leader`, while the route allows
`admin`/`leaderat12`; the hierarchy check does not grant a `leader` access.
Treat this as a known navigation-versus-route discrepancy to verify and report,
not as an expected successful leader page load.

Supreme admins can access reporting routes; verify separately from regular
admin behavior. The legacy reporting dashboard detail routes
(`/reporting/dashboard/:section` and its leader/cell detail variants) use the
same reporting role gate.

Other role and navigation cases:

- Verify an unauthenticated visit to each protected route redirects to Login
  and preserves an appropriate return destination where implemented.
- Verify `leader at 12`, `leader@12`, and equivalent normalized role strings
  behave consistently if the QA environment supports them.
- Verify a custom role with the expected low-privilege, leader-like, and
  admin-like names against both navigation and direct routes. Record exact
  behavior; custom role access is not identical to the five system roles.
- Verify supreme-admin-only UI separately from regular admin behavior.
- Verify user-with-cell access both through the Events menu and by direct URL;
  repeat without a cell and confirm Events is hidden and direct access returns
  to Home.

## 5. Shared shell and cross-site checks

Run these checks for every system role that can sign in.

### Startup, navigation, and account

| Test Case | Test Scenario | Preconditions | Expected Results | Actual Results / Evidence | Status (Pass/Fail) |
|---|---|---|---|---|---|
| SHELL-01 | Load the site with a signed-out session. | Use the role, route, and test data specified in the section and test setup. | Splash screen finishes, Login is usable, and no protected page content briefly appears. | | Not Run |
| SHELL-02 | Load as a signed-in account. | Use the role, route, and test data specified in the section and test setup. | Splash/auth loading completes once and lands on the expected route without a redirect loop. | | Not Run |
| SHELL-03 | Use every visible sidebar link. | Use the role, route, and test data specified in the section and test setup. | Confirm route, active state, and that mobile navigation closes after selection. | | Not Run |
| SHELL-04 | Open/close the mobile drawer with its menu button, backdrop, and Escape key. | Use the role, route, and test data specified in the section and test setup. | Check focus and that the page remains usable. | | Not Run |
| SHELL-05 | Click the account avatar to reach Profile. | Use the role, route, and test data specified in the section and test setup. | Open the overflow menu, dismiss it by outside click and Escape, and select Logout. | | Not Run |
| SHELL-06 | After logout, confirm protected routes cannot be revisited through browser Back, a saved URL, or refresh. | Use the role, route, and test data specified in the section and test setup. | Verify the stated behavior, record the observed result, and confirm no unintended data or state change occurred. | | Not Run |
| SHELL-07 | Toggle light/dark mode; check menu state, page colors, dialogs, tables, and form states. | Use the role, route, and test data specified in the section and test setup. | Reload and confirm the selected theme persists. Repeat at desktop and mobile widths. | | Not Run |
| SHELL-08 | Open Help & Support and verify it opens the expected external help site safely in a separate tab. | Use the role, route, and test data specified in the section and test setup. | Verify the stated behavior, record the observed result, and confirm no unintended data or state change occurred. | | Not Run |
| SHELL-09 | Use browser Back/Forward and refresh on each route; confirm the correct view is restored and no stale modal or data is shown. | Use the role, route, and test data specified in the section and test setup. | Verify the stated behavior, record the observed result, and confirm no unintended data or state change occurred. | | Not Run |
| SHELL-10 | Exercise loading, empty, API error, and retry/refresh states on API-backed screens. | Use the role, route, and test data specified in the section and test setup. | Check there is no uncaught error screen or false success message. | | Not Run |


### Accessibility and responsive sweep

| Test Case | Test Scenario | Preconditions | Expected Results | Actual Results / Evidence | Status (Pass/Fail) |
|---|---|---|---|---|---|
| A11Y-01 | Navigate using Tab/Shift+Tab/Enter/Space. | Use the role, route, and test data specified in the section and test setup. | Focus is visible, follows a sensible order, and does not get trapped outside a modal. | | Not Run |
| A11Y-02 | Confirm dialog title/description, labels, validation errors, selected tabs, current navigation item, and icon-only actions have accessible names and state. | Use the role, route, and test data specified in the section and test setup. | Verify that the described behavior matches the expected product behavior and capture the observed result. | | Not Run |
| A11Y-03 | Confirm focus moves into an opened dialog, remains inside while modal, and returns to the trigger on close. | Use the role, route, and test data specified in the section and test setup. | Focus enters the dialog, remains within it while open, and returns to the trigger when closed. | | Not Run |
| RESP-01 | Repeat page checks at narrow mobile, tablet, and desktop widths. | Use the role, route, and test data specified in the section and test setup. | No content, primary actions, table operations, or close buttons are unreachable due to clipping or horizontal overflow. | | Not Run |
| RESP-02 | Check long names, long emails, large result sets, empty values, and loading indicators at each viewport. | Use the role, route, and test data specified in the section and test setup. | Long content and loading/empty states remain readable and usable at each viewport. | | Not Run |
| RESP-03 | Verify text contrast and all primary/secondary/destructive actions in both themes. | Use the role, route, and test data specified in the section and test setup. | Text and controls remain readable and distinguishable in light and dark themes. | | Not Run |

## 6. Public authentication pages

### Login `/login`

| Test Case | Test Scenario | Preconditions | Expected Results | Actual Results / Evidence | Status (Pass/Fail) |
|---|---|---|---|---|---|
| AUTH-01 | Submit with both fields empty, invalid email, and password empty. | Use the role, route, and test data specified in the section and test setup. | Errors are understandable and no request is falsely reported as successful. | | Not Run |
| AUTH-02 | Sign in with a valid test account for each role. | Use the role, route, and test data specified in the section and test setup. | Correct identity/role is loaded and protected navigation matches the matrix. | | Not Run |
| AUTH-03 | Submit an incorrect password and an unknown email; show a useful failure without exposing sensitive account details. | Use the role, route, and test data specified in the section and test setup. | Verify the stated behavior, record the observed result, and confirm no unintended data or state change occurred. | | Not Run |
| AUTH-04 | Toggle password visibility; confirm the value is unchanged and the control remains keyboard accessible. | Use the role, route, and test data specified in the section and test setup. | Verify the stated behavior, record the observed result, and confirm no unintended data or state change occurred. | | Not Run |
| AUTH-05 | Use Forgot Password and Sign Up links; verify the correct destination and browser history behavior. | Use the role, route, and test data specified in the section and test setup. | Verify the stated behavior, record the observed result, and confirm no unintended data or state change occurred. | | Not Run |
| AUTH-06 | While submitting, verify duplicate submits are prevented and controls recover after success or failure. | Use the role, route, and test data specified in the section and test setup. | Verify the stated behavior, record the observed result, and confirm no unintended data or state change occurred. | | Not Run |


### Signup `/signup`

| Test Case | Test Scenario | Preconditions | Expected Results | Actual Results / Evidence | Status (Pass/Fail) |
|---|---|---|---|---|---|
| AUTH-07 | Verify required fields and the Name, Surname, Date of Birth, Email Address, Home Address, Phone Number, Gender, Organization/Church, Invited By, Password, and Confirm Password controls. | Use the role, route, and test data specified in the section and test setup. | Verify the stated behavior, record the observed result, and confirm no unintended data or state change occurred. | | Not Run |
| AUTH-08 | Test empty required values, malformed email/phone, invalid date, password requirements, and password mismatch. | Use the role, route, and test data specified in the section and test setup. | Errors identify the affected field and submission is blocked. | | Not Run |
| AUTH-09 | Exercise organization and invited-by autocomplete: type, wait for results, select, clear, and test no results/network failure. | Use the role, route, and test data specified in the section and test setup. | Verify the stated behavior, record the observed result, and confirm no unintended data or state change occurred. | | Not Run |
| AUTH-10 | Toggle each password visibility control independently. | Use the role, route, and test data specified in the section and test setup. | Verify the stated behavior, record the observed result, and confirm no unintended data or state change occurred. | | Not Run |
| AUTH-11 | Submit valid test signup data. | Use the role, route, and test data specified in the section and test setup. | Verify success feedback, expected account role/state, and next route; check duplicate email handling. | | Not Run |
| AUTH-12 | Use the Login link and verify entered data is not submitted accidentally. | Use the role, route, and test data specified in the section and test setup. | Verify the stated behavior, record the observed result, and confirm no unintended data or state change occurred. | | Not Run |


### Forgot Password `/forgot-password`

| Test Case | Test Scenario | Preconditions | Expected Results | Actual Results / Evidence | Status (Pass/Fail) |
|---|---|---|---|---|---|
| AUTH-13 | Submit empty/invalid email and verify validation. | Use the role, route, and test data specified in the section and test setup. | Verify the stated behavior, record the observed result, and confirm no unintended data or state change occurred. | | Not Run |
| AUTH-14 | Submit a known test email and an unknown email. | Use the role, route, and test data specified in the section and test setup. | Verify non-sensitive response messaging, request loading state, and no duplicate submission. | | Not Run |
| AUTH-15 | Verify the actual reset message/link using the test inbox or mail-capture service. | Use the role, route, and test data specified in the section and test setup. | Verify the stated behavior, record the observed result, and confirm no unintended data or state change occurred. | | Not Run |


### Reset Password `/reset-password`

| Test Case | Test Scenario | Preconditions | Expected Results | Actual Results / Evidence | Status (Pass/Fail) |
|---|---|---|---|---|---|
| AUTH-16 | Open with missing, malformed, expired, and valid reset tokens. | Use the role, route, and test data specified in the section and test setup. | Invalid links show an error and cannot change a password. | | Not Run |
| AUTH-17 | Test empty password, policy violations, mismatch, and valid password. | Use the role, route, and test data specified in the section and test setup. | Confirm the form only accepts matching valid values. | | Not Run |
| AUTH-18 | Toggle both password visibility buttons and submit once. | Use the role, route, and test data specified in the section and test setup. | Verify success and the documented return-to-login behavior. | | Not Run |
| AUTH-19 | Sign in with the new password; confirm the old password no longer works where the test setup permits. | Use the role, route, and test data specified in the section and test setup. | Verify the stated behavior, record the observed result, and confirm no unintended data or state change occurred. | | Not Run |


## 7. Home page `/`

The Home page is a highlights carousel with four slides, slide indicator
buttons, and pause-on-hover/focus behavior.

| Test Case | Test Scenario | Preconditions | Expected Results | Actual Results / Evidence | Status (Pass/Fail) |
|---|---|---|---|---|---|
| HOME-01 | Load Home for each role. | Use the role, route, and test data specified in the section and test setup. | Confirm all slides render without broken assets and the first active indicator matches the visible slide. | | Not Run |
| HOME-02 | Wait through the automatic slide interval and confirm advancement cycles and wraps to the first slide. | Use the role, route, and test data specified in the section and test setup. | Verify the stated behavior, record the observed result, and confirm no unintended data or state change occurred. | | Not Run |
| HOME-03 | Hover over the carousel and focus it; automatic advance pauses. | Use the role, route, and test data specified in the section and test setup. | Move pointer/focus away and confirm it resumes. | | Not Run |
| HOME-04 | Select each slide dot. | Use the role, route, and test data specified in the section and test setup. | Confirm the matching slide becomes active, its indicator state changes, and inactive slides are hidden from assistive technology. | | Not Run |
| HOME-05 | Check reduced-motion preference and verify there is no disruptive animation when reduced motion is requested. | Use the role, route, and test data specified in the section and test setup. | Verify the stated behavior, record the observed result, and confirm no unintended data or state change occurred. | | Not Run |
| HOME-06 | Check all images and controls on mobile, tablet, desktop, and both themes. | Use the role, route, and test data specified in the section and test setup. | Verify the stated behavior, record the observed result, and confirm no unintended data or state change occurred. | | Not Run |
| HOME-07 | Confirm no misleading or inaccessible dead control appears over the image carousel. | Use the role, route, and test data specified in the section and test setup. | Verify the stated behavior, record the observed result, and confirm no unintended data or state change occurred. | | Not Run |


## 8. Profile - User

Run as `qa-user-cell` and `qa-user-no-cell` separately. Profile is the same
route for both; the role-based profile permissions and editability are what
this section verifies.

| Test Case | Test Scenario | Preconditions | Expected Results | Actual Results / Evidence | Status (Pass/Fail) |
|---|---|---|---|---|---|
| PROF-U-01 | Load profile and verify account name, role badge, avatar, leadership line, organization, and populated personal/contact data match the signed-in user. | Use the role, route, and test data specified in the section and test setup. | Verify that the described behavior matches the expected product behavior and capture the observed result. | | Not Run |
| PROF-U-02 | Verify Name, Surname, Date of birth, Gender, Home address, Organization/Church, and Invited by are read-only for this role. | Use the role, route, and test data specified in the section and test setup. | Verify that the described behavior matches the expected product behavior and capture the observed result. | | Not Run |
| PROF-U-03 | Verify Email address and Phone number are editable. | Use the role, route, and test data specified in the section and test setup. | Change one at a time, save, reload, and confirm persistence and updated account data. | | Not Run |
| PROF-U-04 | Test invalid email and phone input. | Use the role, route, and test data specified in the section and test setup. | verify field-level errors and that invalid values are not saved. | | Not Run |
| PROF-U-05 | Open Change password. | Use the role, route, and test data specified in the section and test setup. | Test missing current password, mismatched confirmation, invalid new password, and successful update. Password values must not be exposed in the UI after submission. | | Not Run |
| PROF-U-06 | Use Cancel with unsaved contact/password changes and verify the form returns to the saved profile without persisting edits. | Use the role, route, and test data specified in the section and test setup. | Verify that the described behavior matches the expected product behavior and capture the observed result. | | Not Run |
| PROF-U-07 | Upload an allowed image, adjust crop/zoom/position, save, cancel crop, and reload. | Use the role, route, and test data specified in the section and test setup. | Confirm the correct avatar is retained and cancelling does not replace it. | | Not Run |
| PROF-U-08 | Test unsupported image type, corrupt image, oversized image if limits exist, upload failure, and missing/default avatar. | Use the role, route, and test data specified in the section and test setup. | Verify that the described behavior matches the expected product behavior and capture the observed result. | | Not Run |
| PROF-U-09 | Check unsaved-changes indicator and Save/Cancel enablement when fields are untouched, changed, reverted, and after save. | Use the role, route, and test data specified in the section and test setup. | Verify that the described behavior matches the expected product behavior and capture the observed result. | | Not Run |
| PROF-U-10 | Verify responsive layout, scroll behavior, password visibility controls, and keyboard operation. | Use the role, route, and test data specified in the section and test setup. | Verify that the described behavior matches the expected product behavior and capture the observed result. | | Not Run |

## 9. Profile - Registrant

Run separately as `qa-registrant`; do not assume User behavior proves
Registrant behavior.

| Test Case | Test Scenario | Preconditions | Expected Results | Actual Results / Evidence | Status (Pass/Fail) |
|---|---|---|---|---|---|
| PROF-R-01 | Confirm the registrant sees their own identity, role, contact details, organization, inviter, and leadership line without another account's cached profile data. | Use the role, route, and test data specified in the section and test setup. | Verify that the described behavior matches the expected product behavior and capture the observed result. | | Not Run |
| PROF-R-02 | Verify the same read-only fields as the user profile stay locked. | Use the role, route, and test data specified in the section and test setup. | Confirm only email and phone can be changed if the page grants those controls to this role. | | Not Run |
| PROF-R-03 | Repeat invalid and valid email/phone edits, save/reload, and cancellation. | Use the role, route, and test data specified in the section and test setup. | Confirm changes persist only after Save. | | Not Run |
| PROF-R-04 | Repeat password-collapse, current/new/confirm validation, visibility, success, and failure checks. | Use the role, route, and test data specified in the section and test setup. | Verify that the described behavior matches the expected product behavior and capture the observed result. | | Not Run |
| PROF-R-05 | Repeat avatar open/upload/crop/save/cancel/error checks. | Use the role, route, and test data specified in the section and test setup. | Verify that the described behavior matches the expected product behavior and capture the observed result. | | Not Run |
| PROF-R-06 | Compare allowed controls and role messaging against `qa-user-cell`; report an unexpected role-specific difference. | Use the role, route, and test data specified in the section and test setup. | Verify that the described behavior matches the expected product behavior and capture the observed result. | | Not Run |
| PROF-R-07 | Verify mobile, keyboard, focus, and dark-mode behavior. | Use the role, route, and test data specified in the section and test setup. | Verify that the described behavior matches the expected product behavior and capture the observed result. | | Not Run |

## 10. People `/people`

Run for admin, leader, and leader-at-12. Confirm direct-route denial for
user and registrant accounts.

| Test Case | Test Scenario | Preconditions | Expected Results | Actual Results / Evidence | Status (Pass/Fail) |
|---|---|---|---|---|---|
| PEOPLE-01 | Load the page and verify organization, people count, initial view, and loading/empty/error states. | Use the role, route, and test data specified in the section and test setup. | Verify the stated behavior, record the observed result, and confirm no unintended data or state change occurred. | | Not Run |
| PEOPLE-02 | Switch All/Mine filters and verify result ownership and headings. | Use the role, route, and test data specified in the section and test setup. | Confirm switching back restores the complete allowed dataset. | | Not Run |
| PEOPLE-03 | Switch Grid/List views. | Use the role, route, and test data specified in the section and test setup. | Confirm both views show the same filtered people and their row/card actions work. | | Not Run |
| PEOPLE-04 | Search by Name, Email, Phone, Location, and Leaders. | Use the role, route, and test data specified in the section and test setup. | Verify the minimum search length behavior, no-match state, clear behavior, loading state, and that changing the field changes the search semantics. | | Not Run |
| PEOPLE-05 | Use Refresh and confirm results update without losing the active filter/view unexpectedly. | Use the role, route, and test data specified in the section and test setup. | Simulate request failure if possible. | | Not Run |
| PEOPLE-06 | Change stage filters and confirm cards/counts represent the selected stage. | Use the role, route, and test data specified in the section and test setup. | Verify the stated behavior, record the observed result, and confirm no unintended data or state change occurred. | | Not Run |
| PEOPLE-07 | Change page, page size, first/last page, and grid pagination. | Use the role, route, and test data specified in the section and test setup. | Confirm filters/search are applied consistently across pages. | | Not Run |
| PEOPLE-08 | Open a person from each view and verify the correct person's detail/edit flow. | Use the role, route, and test data specified in the section and test setup. | Test double-click/repeated action behavior. | | Not Run |
| PEOPLE-09 | Drag a person between stages where supported. | Use the role, route, and test data specified in the section and test setup. | Confirm success, correct updated stage after refresh, and safe handling of failed update. | | Not Run |
| PEOPLE-10 | Open Add Person. Validate all required fields, optional fields, leader assignments, autocomplete/search, Save, Cancel, close icon, and backdrop/Escape behavior. | Use the role, route, and test data specified in the section and test setup. | Confirm cancel leaves no record. | | Not Run |
| PEOPLE-11 | Edit an existing test person. | Use the role, route, and test data specified in the section and test setup. | Save valid changes, reject invalid values, cancel edits, and verify persisted values after reload. | | Not Run |
| PEOPLE-12 | Delete a disposable person. | Use the role, route, and test data specified in the section and test setup. | Verify confirmation names the correct target, Cancel preserves it, Confirm removes it, and the list/count refreshes. | | Not Run |
| PEOPLE-13 | Try duplicate, blank, malformed, long, and Unicode values in safe test records; verify validation and display do not break the page. | Use the role, route, and test data specified in the section and test setup. | Verify the stated behavior, record the observed result, and confirm no unintended data or state change occurred. | | Not Run |
| PEOPLE-14 | Verify leader and organization scoping: no role sees records outside its authorized scope by search, paging, or direct record access. | Use the role, route, and test data specified in the section and test setup. | Verify the stated behavior, record the observed result, and confirm no unintended data or state change occurred. | | Not Run |
| PEOPLE-15 | Repeat key filters, list/grid and Add/Edit/Delete dialogs at mobile/tablet/desktop widths and both themes. | Use the role, route, and test data specified in the section and test setup. | Verify the stated behavior, record the observed result, and confirm no unintended data or state change occurred. | | Not Run |


## 11. Events `/events` and event details

Run for admin, leader, leader-at-12, registrant, and both user-cell variants.
User without a cell must be redirected/denied as specified in the role matrix.

| Test Case | Test Scenario | Preconditions | Expected Results | Actual Results / Evidence | Status (Pass/Fail) |
|---|---|---|---|---|---|
| EVENT-01 | Verify the initial event listing, active view/date range, loading, empty, and error states. | Use the role, route, and test data specified in the section and test setup. | Verify the stated behavior, record the observed result, and confirm no unintended data or state change occurred. | | Not Run |
| EVENT-02 | Exercise each event view/filter, including current week, previous week, and any date/type/status filters shown. | Use the role, route, and test data specified in the section and test setup. | Confirm results and counts update, reset, and survive pagination as intended. | | Not Run |
| EVENT-03 | Search/filter events, clear the query, and verify no-result behavior. | Use the role, route, and test data specified in the section and test setup. | Try boundary dates and events with missing optional data. | | Not Run |
| EVENT-04 | Change page and page size (10/25/50/100 where presented); verify next/previous and row/card actions target the correct event. | Use the role, route, and test data specified in the section and test setup. | Verify the stated behavior, record the observed result, and confirm no unintended data or state change occurred. | | Not Run |
| EVENT-05 | Open event details. | Use the role, route, and test data specified in the section and test setup. | Verify event name/type/date/status and attendee list match the latest event history; test empty attendees. | | Not Run |
| EVENT-06 | Open details without navigation state (direct URL/refresh). | Use the role, route, and test data specified in the section and test setup. | Confirm the no-event message and Go Back action behave safely. | | Not Run |
| EVENT-07 | For permitted roles, open Create Event and test required event type/name/email/date/time/location/leader fields, description, recurring toggle/days, leader assignments, and every visible submit, cancel, and close action. | Use the role, route, and test data specified in the section and test setup. | Verify the stated behavior, record the observed result, and confirm no unintended data or state change occurred. | | Not Run |
| EVENT-08 | Test event location autocomplete after fewer than three characters, a valid query, result selection, no result, permission denied for geolocation, missing key, and API failure. | Use the role, route, and test data specified in the section and test setup. | Manual entry must behave as the UI indicates. | | Not Run |
| EVENT-09 | Create one disposable non-recurring event and one recurring event where supported. | Use the role, route, and test data specified in the section and test setup. | Verify validation, success/error feedback, duplicate submit prevention, list refresh, and edit-page persistence. | | Not Run |
| EVENT-10 | Open Edit Event for a disposable event. | Use the role, route, and test data specified in the section and test setup. | Verify existing values populate, each field saves, disabled/read-only states are correct, and cancel does not mutate data. | | Not Run |
| EVENT-11 | Exercise deactivate/reactivate or close/reopen behavior where shown. | Use the role, route, and test data specified in the section and test setup. | Confirm confirmation, resulting status, and access to the record after refresh. | | Not Run |
| EVENT-12 | Open event-type selection/create/edit/delete dialogs. | Use the role, route, and test data specified in the section and test setup. | Verify list loading, search, required fields, cancel, duplicate names, delete confirmation, and that events using the type remain consistent. | | Not Run |
| EVENT-13 | Test Create Event Data and any custom-data/type-management controls. | Use the role, route, and test data specified in the section and test setup. | Verify validation and that cancelled dialogs leave no partial data. | | Not Run |
| EVENT-14 | Open Delete Event / Delete Event Type confirmation. | Use the role, route, and test data specified in the section and test setup. | Verify the correct target is named; cancel preserves it and confirm deletes only the intended disposable record. | | Not Run |
| EVENT-15 | Verify ticketed/global/person-step event configuration, price tiers, and recurring details where those options are offered. | Use the role, route, and test data specified in the section and test setup. | Check data shown after reopening. | | Not Run |
| EVENT-16 | Check role-sensitive action visibility and direct navigation for every role; a hidden action must not remain executable by direct URL. | Use the role, route, and test data specified in the section and test setup. | Verify the stated behavior, record the observed result, and confirm no unintended data or state change occurred. | | Not Run |
| EVENT-17 | Repeat core list, create/edit, details, and dialog flows at mobile/tablet/desktop widths and both themes. | Use the role, route, and test data specified in the section and test setup. | Verify the stated behavior, record the observed result, and confirm no unintended data or state change occurred. | | Not Run |


### Attendance route and attendance dialogs

| Test Case | Test Scenario | Preconditions | Expected Results | Actual Results / Evidence | Status (Pass/Fail) |
|---|---|---|---|---|---|
| ATT-01 | Open `/attendance` as admin, leader, and leader-at-12. | Use the role, route, and test data specified in the section and test setup. | Confirm a valid event context loads; direct access without context fails safely. | | Not Run |
| ATT-02 | Verify attendance tabs, attendee rows, search/filter, sorting, pagination, and any event/date controls. | Use the role, route, and test data specified in the section and test setup. | Verify the stated behavior, record the observed result, and confirm no unintended data or state change occurred. | | Not Run |
| ATT-03 | Exercise add/associate person, leader selection, attendee removal, and headcount controls using disposable test data. | Use the role, route, and test data specified in the section and test setup. | Verify the stated behavior, record the observed result, and confirm no unintended data or state change occurred. | | Not Run |
| ATT-04 | Test attendance status/present controls, save, refresh, and failure handling. | Use the role, route, and test data specified in the section and test setup. | Confirm a failed save does not appear persisted. | | Not Run |
| ATT-05 | Open/close every nested leader/person/confirmation dialog. | Use the role, route, and test data specified in the section and test setup. | Verify selection, validation, Cancel, close icon, backdrop/Escape, and return focus. | | Not Run |
| ATT-06 | Use Download attendance data. | Use the role, route, and test data specified in the section and test setup. | Confirm the downloaded file opens, contains the expected event and attendee data, and respects active filters. | | Not Run |
| ATT-07 | Save and close an event; verify re-open/reopen-event controls and event history remain consistent. | Use the role, route, and test data specified in the section and test setup. | Verify the stated behavior, record the observed result, and confirm no unintended data or state change occurred. | | Not Run |
| ATT-08 | Test empty roster, duplicate person, missing contact data, and concurrent refresh/update conditions. | Use the role, route, and test data specified in the section and test setup. | Verify the stated behavior, record the observed result, and confirm no unintended data or state change occurred. | | Not Run |


## 12. Profile and event-adjacent registration route

### Event Registration `/event-payment/:eventId`

| Test Case | Test Scenario | Preconditions | Expected Results | Actual Results / Evidence | Status (Pass/Fail) |
|---|---|---|---|---|---|
| REG-01 | Open with a valid-looking and malformed event ID. | Use the role, route, and test data specified in the section and test setup. | Confirm the ID is displayed and the page does not crash. | | Not Run |
| REG-02 | Verify the Event Details controls: fixed event name and rate, Adult/Child selection, Guide/Leader selection, and displayed total. | Use the role, route, and test data specified in the section and test setup. | Record that the current rate/event values are static frontend data. | | Not Run |
| REG-03 | Fill Full Name, Email Address, and Home Address. | Use the role, route, and test data specified in the section and test setup. | Check native input behavior and mobile layout; record that the current UI has no frontend submit/save action. | | Not Run |
| REG-04 | Inspect Pay Now destination without completing a payment. | Use the role, route, and test data specified in the section and test setup. | Confirm it is the configured safe test/placeholder link; do not send real payment or personal data. | | Not Run |
| REG-05 | Repeat signed out and signed in, across every role. | Use the role, route, and test data specified in the section and test setup. | This route is not wrapped in a role-auth check; record the actual intended product policy and report if public access is not intended. | | Not Run |


## 13. Service Check-in `/service-check-in`

Run for admin, leader, leader-at-12, and registrant. Verify denial for user.

| Test Case | Test Scenario | Preconditions | Expected Results | Actual Results / Evidence | Status (Pass/Fail) |
|---|---|---|---|---|---|
| CHECKIN-01 | Verify page load, selected event/service, search, and attendee table. | Use the role, route, and test data specified in the section and test setup. | Check empty and unavailable-service states. | | Not Run |
| CHECKIN-02 | Switch All attendees/Event history tabs and verify each tab's data and loading/empty behavior. | Use the role, route, and test data specified in the section and test setup. | Verify the stated behavior, record the observed result, and confirm no unintended data or state change occurred. | | Not Run |
| CHECKIN-03 | Check in and remove check-in for a disposable attendee. | Use the role, route, and test data specified in the section and test setup. | Confirm button accessible name/state changes, result persists after refresh, and repeated clicks do not create duplicate mutations. | | Not Run |
| CHECKIN-04 | Edit and delete a disposable attendee using row actions. | Use the role, route, and test data specified in the section and test setup. | Confirm confirmation, Cancel, and successful update behavior. | | Not Run |
| CHECKIN-05 | Use attendee search, filters, sort, and pagination. | Use the role, route, and test data specified in the section and test setup. | Confirm operations apply to the correct service and do not change another event's attendance. | | Not Run |
| CHECKIN-06 | Exercise Present, New people, and Consolidated summary controls. | Use the role, route, and test data specified in the section and test setup. | Confirm the corresponding attendee/history details open and close correctly. | | Not Run |
| CHECKIN-07 | Open every service dialog from the page. | Use the role, route, and test data specified in the section and test setup. | Verify title, close, Cancel, Save/Confirm, backdrop/Escape, loading, validation, and refresh behavior. | | Not Run |
| CHECKIN-08 | Test add/associate attendee and consolidation workflows. | Use the role, route, and test data specified in the section and test setup. | Verify search, select, finish, cancel, duplicate handling, and removal of consolidation using disposable records. | | Not Run |
| CHECKIN-09 | Validate event-history view and any reopen/unsave action. | Use the role, route, and test data specified in the section and test setup. | Confirm only eligible saved/closed events can be reopened. | | Not Run |
| CHECKIN-10 | Check screen reader names for check-in, edit, delete, and remove-consolidation row buttons. | Use the role, route, and test data specified in the section and test setup. | Verify the stated behavior, record the observed result, and confirm no unintended data or state change occurred. | | Not Run |
| CHECKIN-11 | Repeat at mobile/tablet/desktop, both themes, with long names and larger attendance lists. | Use the role, route, and test data specified in the section and test setup. | Verify the stated behavior, record the observed result, and confirm no unintended data or state change occurred. | | Not Run |


## 14. Daily Tasks `/daily-tasks`

All five system roles are allowed by the route. Run at least the critical
read/create/edit/export flow under each role and check any role-dependent
controls.

| Test Case | Test Scenario | Preconditions | Expected Results | Actual Results / Evidence | Status (Pass/Fail) |
|---|---|---|---|---|---|
| TASK-01 | Load the task board and verify Call/Visit task entry points, task counts, initial filters, loading, no-task, and API-error states. | Use the role, route, and test data specified in the section and test setup. | Verify the stated behavior, record the observed result, and confirm no unintended data or state change occurred. | | Not Run |
| TASK-02 | Switch each task-type filter and confirm only matching tasks appear. | Use the role, route, and test data specified in the section and test setup. | Clear filters and verify the complete allowed task list returns. | | Not Run |
| TASK-03 | Add a task. | Use the role, route, and test data specified in the section and test setup. | Validate recipient search/selection, task type, due date, notes/description, and other required fields shown in the form. | | Not Run |
| TASK-04 | Test empty, invalid, duplicate-recipient, no-search-result, and valid inputs. | Use the role, route, and test data specified in the section and test setup. | Save, verify success and persistence, then cancel and verify no record was created. | | Not Run |
| TASK-05 | Edit a task and verify current values, validation, save, cancel, and persistence after reload. | Use the role, route, and test data specified in the section and test setup. | Verify the stated behavior, record the observed result, and confirm no unintended data or state change occurred. | | Not Run |
| TASK-06 | Exercise task completion/status actions and verify state, count, and status chips update. | Use the role, route, and test data specified in the section and test setup. | Test rapid repeated changes and failure recovery. | | Not Run |
| TASK-07 | Exercise task paging, sorting, date/status/type filters, and search where available. | Use the role, route, and test data specified in the section and test setup. | Verify the stated behavior, record the observed result, and confirm no unintended data or state change occurred. | | Not Run |
| TASK-08 | Download filtered tasks. | Use the role, route, and test data specified in the section and test setup. | Verify file contents match current filters and include the expected headers/records. | | Not Run |
| TASK-09 | Open Add Task Type and Edit Task Type. | Use the role, route, and test data specified in the section and test setup. | Test required name, invalid/duplicate name, Save/Create, Cancel, close, and persistence. | | Not Run |
| TASK-10 | Verify task-type edit/delete controls identify the correct type and handle tasks already assigned to it without data loss. | Use the role, route, and test data specified in the section and test setup. | Verify the stated behavior, record the observed result, and confirm no unintended data or state change occurred. | | Not Run |
| TASK-11 | Open and close task add/edit/type dialogs via every available close action; test Escape/backdrop where supported. | Use the role, route, and test data specified in the section and test setup. | Verify the stated behavior, record the observed result, and confirm no unintended data or state change occurred. | | Not Run |
| TASK-12 | Confirm role scoping: assigned users see only their allowed tasks and cannot edit another user's records through an exposed action or direct route. | Use the role, route, and test data specified in the section and test setup. | Verify the stated behavior, record the observed result, and confirm no unintended data or state change occurred. | | Not Run |
| TASK-13 | Repeat key flows at mobile/tablet/desktop widths and both themes. | Use the role, route, and test data specified in the section and test setup. | Verify the stated behavior, record the observed result, and confirm no unintended data or state change occurred. | | Not Run |


## 15. Stats `/stats`

Run for admin and leader-at-12. Attempt direct access as leader, user, and
registrant and confirm the current route-gate result; compare to sidebar.

| Test Case | Test Scenario | Preconditions | Expected Results | Actual Results / Evidence | Status (Pass/Fail) |
|---|---|---|---|---|---|
| STATS-01 | Load the dashboard and verify default period, displayed date range, Overdue Cells and Tasks Due cards, loading, empty, and error states. | Use the role, route, and test data specified in the section and test setup. | Verify the stated behavior, record the observed result, and confirm no unintended data or state change occurred. | | Not Run |
| STATS-02 | Select each Period option individually: Today, This Week, This Month, Previous Week, and Previous Month. | Use admin and leader-at-12 with data present in each period. | After each selection, verify Overdue Cells, Tasks Due, tab counts, and the active tab data correspond to that exact period; record one result per option. | | Not Run |
| STATS-03 | Refresh and confirm both stats and overdue-cell datasets reload; test while already loading and after a failed request. | Use the role, route, and test data specified in the section and test setup. | Verify the stated behavior, record the observed result, and confirm no unintended data or state change occurred. | | Not Run |
| STATS-04 | Switch Overdue Cells, Tasks, and Calendar tabs. | Use the role, route, and test data specified in the section and test setup. | Confirm counts, content, and empty states match each selected tab. | | Not Run |
| STATS-05 | Open all row/detail/overdue/task view-more dialogs. | Use the role, route, and test data specified in the section and test setup. | Verify displayed person/task/event, close, and return-to-tab state. | | Not Run |
| STATS-06 | Exercise overdue-cell view and associated attendee data. | Use the role, route, and test data specified in the section and test setup. | Confirm the correct cell and period are shown. | | Not Run |
| STATS-07 | Click the stats Download button separately with Overdue Cells, Tasks, and Calendar tabs selected for each of the five Period options (15 tab/period combinations). | Use admin and leader-at-12 with exportable data in each combination. | Each downloaded workbook has the expected file type/name and contains only the selected tab's data for the selected period. Verify each resulting file and record each combination separately; verify empty-data feedback for each tab. | | Not Run |
| STATS-08 | Use calendar navigation and event/date selection. | Use the role, route, and test data specified in the section and test setup. | Confirm previous/next month, displayed events, date boundaries, and selected-event details. | | Not Run |
| STATS-09 | Select Calendar and click its separate Download button. | Use calendar fixtures with events and with no events; repeat for each of the five Period options. | Verify downloaded workbook type/name, event/date contents, and selected-period consistency. Verify the button is disabled when appropriate, no-data feedback, loading/duplicate-click behavior, and export failure feedback. Record every period separately. | | Not Run |
| STATS-10 | Test large result sets, empty results, malformed optional dates, and API failure without stale data being presented as current. | Use the role, route, and test data specified in the section and test setup. | Verify the stated behavior, record the observed result, and confirm no unintended data or state change occurred. | | Not Run |
| STATS-11 | Verify all tabs, modal close actions, keyboard behavior, and mobile/tablet/desktop layout in both themes. | Use the role, route, and test data specified in the section and test setup. | Verify the stated behavior, record the observed result, and confirm no unintended data or state change occurred. | | Not Run |


## 16. Admin `/admin`

Run first with regular admin, then repeat supreme-only actions as
`qa-supreme`. Confirm all non-admin roles are denied on direct route access.

### Users tab

| Test Case | Test Scenario | Preconditions | Expected Results | Actual Results / Evidence | Status (Pass/Fail) |
|---|---|---|---|---|---|
| ADMIN-01 | Verify dashboard totals and user list match test data. | Use the role, route, and test data specified in the section and test setup. | Check loading, empty, error, and Refresh behavior. | | Not Run |
| ADMIN-02 | Filter by every role, clear the filter, and confirm user counts/list rows update. | Use the role, route, and test data specified in the section and test setup. | Verify the stated behavior, record the observed result, and confirm no unintended data or state change occurred. | | Not Run |
| ADMIN-03 | Verify user name, role, phone, created date, organization where shown, and each row's actions. | Use the role, route, and test data specified in the section and test setup. | Verify the stated behavior, record the observed result, and confirm no unintended data or state change occurred. | | Not Run |
| ADMIN-04 | Open New User. Validate required fields, role selection, organization/phone/email fields, Save, Cancel, and close behavior. | Use the role, route, and test data specified in the section and test setup. | Verify new test user appears once and can authenticate if activation is supported. | | Not Run |
| ADMIN-05 | Change a disposable user's role. | Use the role, route, and test data specified in the section and test setup. | Verify current role, available roles, role preview, confirmation/save, Cancel, and resulting navigation after re-authentication. | | Not Run |
| ADMIN-06 | Delete a disposable user. | Use the role, route, and test data specified in the section and test setup. | Confirm the correct name/role, cancel safely, confirm deletion, and verify list/totals refresh. | | Not Run |
| ADMIN-07 | Attempt deleting an admin as regular admin and verify the UI blocks it; repeat only with a disposable admin fixture under the supreme-admin test account if allowed. | Use the role, route, and test data specified in the section and test setup. | Verify the stated behavior, record the observed result, and confirm no unintended data or state change occurred. | | Not Run |


### Roles & Permissions tab

| Test Case | Test Scenario | Preconditions | Expected Results | Actual Results / Evidence | Status (Pass/Fail) |
|---|---|---|---|---|---|
| ADMIN-08 | Verify system and custom roles, role distribution, and permission/availability details. | Use the role, route, and test data specified in the section and test setup. | Verify the stated behavior, record the observed result, and confirm no unintended data or state change occurred. | | Not Run |
| ADMIN-09 | Open Create New Role; test blank name, whitespace, duplicate name, a valid name, preview, Create, Cancel, and persistence. | Use the role, route, and test data specified in the section and test setup. | Verify the stated behavior, record the observed result, and confirm no unintended data or state change occurred. | | Not Run |
| ADMIN-10 | Assign the custom role to a disposable test user. | Use the role, route, and test data specified in the section and test setup. | Sign in as that user and verify actual menu visibility and direct route access against the intended permission policy. Record any mismatch. | | Not Run |
| ADMIN-11 | Verify system roles cannot be accidentally renamed/deleted or otherwise altered by custom-role controls. | Use the role, route, and test data specified in the section and test setup. | Verify the stated behavior, record the observed result, and confirm no unintended data or state change occurred. | | Not Run |


### Activity Log tab

| Test Case | Test Scenario | Preconditions | Expected Results | Actual Results / Evidence | Status (Pass/Fail) |
|---|---|---|---|---|---|
| ADMIN-12 | Verify Recent Activity loading, empty state, ordering, and displayed actor/action/time details where present. | Use the role, route, and test data specified in the section and test setup. | Verify the stated behavior, record the observed result, and confirm no unintended data or state change occurred. | | Not Run |
| ADMIN-13 | Perform one safe test action that should create an activity entry. | Use the role, route, and test data specified in the section and test setup. | Refresh and verify the entry appears once with correct details. | | Not Run |
| ADMIN-14 | Confirm this is application activity, not a release or deployment log. | Use the role, route, and test data specified in the section and test setup. | Do not use it to populate Section 2. | | Not Run |


### Organization and supreme-admin dialogs

| Test Case | Test Scenario | Preconditions | Expected Results | Actual Results / Evidence | Status (Pass/Fail) |
|---|---|---|---|---|---|
| ADMIN-15 | Open Add New Organization. | Use the role, route, and test data specified in the section and test setup. | Validate required name/email, optional address/phone, invalid email, Save, Cancel, and duplicate organization behavior. | | Not Run |
| ADMIN-16 | Verify created organization appears where expected and assigned test users remain correctly scoped. | Use the role, route, and test data specified in the section and test setup. | Verify the stated behavior, record the observed result, and confirm no unintended data or state change occurred. | | Not Run |
| ADMIN-17 | As supreme admin only, open Add Supreme Admin. Test invalid email, unknown user, already-supreme user, valid disposable user, Cancel, and successful grant. | Use the role, route, and test data specified in the section and test setup. | Verify regular admin cannot access the action. | | Not Run |
| ADMIN-18 | Open and dismiss every admin dialog using Cancel, close, backdrop, and Escape where supported. | Use the role, route, and test data specified in the section and test setup. | Confirm no mutation occurs on dismissal and submit buttons prevent duplicate requests. | | Not Run |
| ADMIN-19 | Verify the admin table, tabs, dialogs, buttons, and errors at mobile/tablet/desktop sizes and both themes. | Use the role, route, and test data specified in the section and test setup. | Verify the stated behavior, record the observed result, and confirm no unintended data or state change occurred. | | Not Run |


## 17. Reports and reporting

Run the reports and dashboard checks as admin, leader, and leader-at-12. Check
direct-route access as user-with-cell, user-without-cell, and registrant.
Scheduled Reports appears only in the admin sidebar, although leaders and
leaders-at-12 are currently allowed by its direct route; verify and record
that discrepancy. Repeat access checks for a supreme admin.

### Reports `/reports` and `/reports/:reportType`

| Test Case | Test Scenario | Preconditions | Expected Results | Actual Results / Evidence | Status (Pass/Fail) |
|---|---|---|---|---|---|
| REPORT-01 | Open the report catalog and inspect each report card, description, implementation state, and Report history link. | Use an authorized reporting account and reporting catalog data. | Implemented reports can be opened; unimplemented entries are marked Coming soon and cannot be opened. Loading, empty, and catalog-error states are clear. | | Not Run |
| REPORT-02 | Open an implemented report and verify its title, default period, report data, and All reports navigation. | Use an implemented report with populated results. | Title, period label, KPIs, tables/charts where present, and displayed rows match the selected report and test data. | | Not Run |
| REPORT-03 | Select each Period option individually: Today, This week, This month, Previous 7 days, Previous week, Previous month, This quarter, This year, Choose month, and Custom range. For Choose month, test each fixture month; for Custom range, test valid dates, same-day dates, reversed dates, each missing endpoint, and boundary dates. | Use an implemented report with dated fixtures spanning all selections. | Verify report request/results and resolved period label for each choice; verify month/start/end values individually and no stale results are shown for incomplete or invalid ranges. Record one ledger result per option/value/state. | | Not Run |
| REPORT-04 | For each report that shows Campus, select All campuses and each campus option shown by the report, one at a time; clear/reselect the campus. | Use an implemented report whose response includes at least two campuses. | Record each exact campus option; verify the selected value and returned report data match it. Confirm All campuses restores the aggregate and that selections do not leak between report types. | | Not Run |
| REPORT-05 | Click each report export button separately: CSV and XLSX. Repeat each format for every period option, each Choose month fixture value, every valid Custom range, and All campuses plus each available Campus value where the report offers Campus. | Use populated implemented reports and preserve each downloaded file as run evidence. | Verify every resulting file's format, filename, contents, report type, period/date bounds, campus, empty-data handling, and error behavior. Record each button/filter combination separately; confirm a pending export disables both format buttons and duplicate clicks do not create duplicate downloads. | | Not Run |
| REPORT-06 | Generate and save a report, then follow the navigation to Report History. | Use an implemented report and, for a supreme admin, enter a valid organization. | Save succeeds only once, navigates to history, and records the selected report parameters. Empty organization for a supreme admin produces a clear validation error without saving. | | Not Run |
| REPORT-07 | Open an unimplemented report directly by route and simulate a report API failure. | Use the catalog's unimplemented entry and a test environment that can simulate request failure. | Coming-soon and error states are explicit; recovery by reloading or reopening the report does not falsely indicate success or leave stale output presented as current. | | Not Run |

### Reporting Dashboard `/reporting/dashboard`

| Test Case | Test Scenario | Preconditions | Expected Results | Actual Results / Evidence | Status (Pass/Fail) |
|---|---|---|---|---|---|
| REPORT-08 | Load the dashboard with populated data and inspect KPI cards, attendance trend, campus comparison, and Ministry Performance table. | Use a reporting account and dashboard fixture/API data with all sections populated. | Values, labels, trend/comparison points, and table columns/rows render from the returned data; long or empty values remain readable. | | Not Run |
| REPORT-09 | Select each Dashboard Period option individually (Today, This week, This month, Previous 7 days, Previous week, Previous month, This quarter, This year, Choose month, Custom range). Select All campuses and every campus option individually. Refresh, then use browser Back and Forward after changing each filter. | Use data covering each period and at least two campuses. For Choose month, test each fixture month; for Custom range, test valid, same-day, reversed, missing-start, and missing-end values. | Verify dashboard request/results and URL state for every individual option/value; verify period and campus combinations do not overwrite each other and refresh/back/forward restores the exact selection and data. Record one ledger result per option/value and applicable combination. | | Not Run |
| REPORT-10 | Exercise empty dashboard, empty charts/table, loading, API failure, and Retry after recovery. | Use test data/service controls for empty and failure states. | Each empty state is explicit; errors provide Retry; recovery shows current data and does not leave stale values as current. | | Not Run |
| REPORT-11 | Open the dashboard and its legacy section/leader/cell detail URL variants directly. | Use authorized and unauthorized test accounts and valid/invalid detail IDs as available. | Authorized roles reach the route or receive a clear safe state; user and registrant accounts are denied/redirected. Invalid detail context does not crash or expose data. | | Not Run |

### Report History `/reporting/history`

| Test Case | Test Scenario | Preconditions | Expected Results | Actual Results / Evidence | Status (Pass/Fail) |
|---|---|---|---|---|---|
| REPORT-12 | Load history with saved runs and inspect report title, creation time, and period. | Use an account with saved report snapshots. | Rows match saved data and titles resolve correctly; empty history shows a clear empty state. | | Not Run |
| REPORT-13 | Open a saved run and return to the history list; test an unavailable/deleted run. | Use one valid and one unavailable snapshot ID where the test environment permits. | Open displays the saved snapshot payload, not a newly generated report; failures are clear and do not show unrelated data. | | Not Run |
| REPORT-14 | As supreme admin, load history with a valid organization, blank organization, and an unknown organization. | Use `qa-supreme` and organization fixtures. | Load scopes results to the entered organization; blank input and no matching history show clear validation/empty states. | | Not Run |

### Scheduled Reports `/reporting/scheduled`

| Test Case | Test Scenario | Preconditions | Expected Results | Actual Results / Evidence | Status (Pass/Fail) |
|---|---|---|---|---|---|
| REPORT-15 | Load the schedule list and inspect report, frequency/time, format, recipient count, status, and row actions. | Use an admin account and disposable schedule fixtures. | Existing schedule details and Active/Paused status match test data; empty and load-error states are clear. | | Not Run |
| REPORT-16 | In New schedule, choose every Report option shown in the loaded catalog, including Coming soon entries; choose each Frequency (Daily, Weekly, Monthly); for Weekly choose each weekday (Monday-Sunday); for Monthly test day-of-month 1 and 28 plus out-of-range values; choose every Format (PDF, CSV, XLSX). | Use safe recipient email addresses and disposable schedules; do not leave recurring deliveries enabled beyond the test. | Record every exact option. Confirm conditional weekday/day-of-month fields, valid-bound behavior, submit/save handling, and the schedule row's displayed values. Verify whether Coming soon reports can be selected/saved and record observed behavior. | | Not Run |
| REPORT-17 | Submit missing report/time/recipients and malformed or comma-separated recipient addresses. | Use the New schedule dialog. | Invalid values are rejected with an actionable inline error; valid comma-separated addresses are saved as separate recipients. | | Not Run |
| REPORT-18 | Edit a disposable schedule, cancel the dialog, pause/resume it, and delete it. | Use a disposable schedule that can safely be changed or removed. | Cancel makes no change; edit and status changes affect only the selected row; delete removes only that schedule and errors are visible. | | Not Run |
| REPORT-19 | Verify schedule dialog keyboard/close behavior and responsive table/actions. | Use admin account at mobile, tablet, and desktop widths in both themes. | Dialog controls remain accessible, close without unintended save, and rows/actions remain reachable without clipping. | | Not Run |


## 18. Other routes and recovery screens

### Create/Edit Event `/create-events` and `/edit-event/:id`

| Test Case | Test Scenario | Preconditions | Expected Results | Actual Results / Evidence | Status (Pass/Fail) |
|---|---|---|---|---|---|
| ROUTE-01 | Open the create route as each authorized role and verify create form behavior matches the event-create checks. | Use the role, route, and test data specified in the section and test setup. | Verify the stated behavior, record the observed result, and confirm no unintended data or state change occurred. | | Not Run |
| ROUTE-02 | Open edit with a valid event ID and verify prefill, validation, save, and cancel. | Use the role, route, and test data specified in the section and test setup. | Open invalid/nonexistent ID and verify safe error handling. | | Not Run |
| ROUTE-03 | Open without an event type/context where one is required. | Use the role, route, and test data specified in the section and test setup. | Verify the UI guides the user rather than silently saving incomplete data. | | Not Run |


### Not Found `*`

| Test Case | Test Scenario | Preconditions | Expected Results | Actual Results / Evidence | Status (Pass/Fail) |
|---|---|---|---|---|---|
| ROUTE-04 | Visit an unknown path signed out and signed in. | Use the role, route, and test data specified in the section and test setup. | Verify a clear not-found state, no protected data, and usable navigation back to a valid route. | | Not Run |


### Error recovery

| Test Case | Test Scenario | Preconditions | Expected Results | Actual Results / Evidence | Status (Pass/Fail) |
|---|---|---|---|---|---|
| ROUTE-05 | Trigger a recoverable component error in a safe test build if an Error Boundary is present. | Use the role, route, and test data specified in the section and test setup. | Verify Reload and Reset actions work and do not create a success-shaped blank page. | | Not Run |
| ROUTE-06 | Disable the backend or simulate API errors in a test environment. | Use the role, route, and test data specified in the section and test setup. | Verify Login, profile, People, Events, Admin, Check-in, Tasks, and Stats show explicit failure/retry behavior and recover after service restoration. | | Not Run |


## 19. Release smoke suite

Run this compact suite after every deployment; run all sections above for a
full regression or any broad/high-risk change.

| Test Case | Test Scenario | Preconditions | Expected Results | Actual Results / Evidence | Status (Pass/Fail) |
|---|---|---|---|---|---|
| SMOKE-01 | Sign in as admin; open Home, Profile, People, Events, Service Check-in, Daily Tasks, Stats, Reports, Reporting Dashboard, Report History, Scheduled Reports, and Admin. | Use the role, route, and test data specified in the section and test setup. | Verify the stated behavior, record the observed result, and confirm no unintended data or state change occurred. | | Not Run |
| SMOKE-02 | Sign in as one account for each other role; verify Home, Profile, role-appropriate navigation, and direct-route denial. | Use the role, route, and test data specified in the section and test setup. | Verify the stated behavior, record the observed result, and confirm no unintended data or state change occurred. | | Not Run |
| SMOKE-03 | Verify one profile edit, one event-list/details flow, one check-in read, one task read, and one admin read using safe fixtures. | Use the role, route, and test data specified in the section and test setup. | Verify the stated behavior, record the observed result, and confirm no unintended data or state change occurred. | | Not Run |
| SMOKE-04 | Verify Login failure, Forgot Password page, Logout, and protected-route behavior while signed out. | Use the role, route, and test data specified in the section and test setup. | Verify the stated behavior, record the observed result, and confirm no unintended data or state change occurred. | | Not Run |
| SMOKE-05 | Verify mobile drawer, account menu, and theme persistence. | Use the role, route, and test data specified in the section and test setup. | Verify the stated behavior, record the observed result, and confirm no unintended data or state change occurred. | | Not Run |
| SMOKE-06 | Check browser console and network for uncaught exceptions, failed required requests, or leaked tokens/credentials. | Use the role, route, and test data specified in the section and test setup. | Verify the stated behavior, record the observed result, and confirm no unintended data or state change occurred. | | Not Run |
| SMOKE-07 | Confirm release-specific changes in Section 2 have linked checks and a recorded outcome. | Use the role, route, and test data specified in the section and test setup. | Verify the stated behavior, record the observed result, and confirm no unintended data or state change occurred. | | Not Run |


## 20. Automated checks

Run from the frontend project directory:

```powershell
npm test
npm run build
```

The current npm test script targets `tests/attendanceLogic.test.js` and
`tests/serviceCheckinToggle.test.js`. These checks supplement, but do not
replace, role-by-role browser regression testing. Record command, environment,
result, and build identifier below. Run lint as required by the team's
release process:

```powershell
npm run lint
```

| Command | Result | Date / timezone | Runner | Notes |
|---|---|---|---|---|
| `npm test` | Not run | | | |
| `npm run build` | Not run | | | |
| `npm run lint` | Not run | | | |

## 21. Regression run record

| Field | Value |
|---|---|
| Run ID | |
| Release / environment | |
| Run start and finish (timezone) | |
| Tester(s) | |
| Browser(s) and viewport(s) | |
| Test data reset / cleanup owner | |
| Passed / failed / blocked / not-run totals | |
| Open issue links and severity | |
| Go / no-go decision and approver | |

| Check ID | Role/account | Result | Evidence / issue link | Tester / time |
|---|---|---|---|---|
| | | Not run | | |

### Issue report template

- **Check ID and release:**
- **Role/account alias and environment:**
- **Page/route and control:**
- **Preconditions/test data:**
- **Steps to reproduce:**
- **Expected result:**
- **Actual result:**
- **Frequency:**
- **Browser, viewport, and theme:**
- **Screenshot/video, console/network evidence, and related issue:**

## 22. Development, testing, and approval sign-off

Complete this table before the regression document is considered approved.
Enter names and dates; do not mark approvals complete until the named person
has reviewed and approved this release.

| Responsibility | Name | PR / contribution details | Signature or approval reference | Date (include timezone) |
|---|---|---|---|---|
| Developer who worked on the change | | | | |
| Developer / collaborator they worked with on the PR | | | | |
| Senior developer who tested the change | | | | |
| Project manager who approved the release | | | | |
| Product owner who approved the release | | | | |
