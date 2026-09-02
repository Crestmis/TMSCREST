# CREST — Final Functional UI

This build keeps the existing pages and logic structure, removes Training, License and Data Hub, and adds a real task-selection/submission workflow.

## Latest update (see the changelog at the bottom)
- **Actual date + time** is now captured on every completion and shown in the completion popup, History, Live Score and the Calendar day view.
- **Calendar timezone fix** — recurring tasks now land on the correct day (Saturday shows tasks, Sunday is the blank holiday) for all timezones.
- **Calendar "Show Past Tasks" / "Show Future Tasks"** toggles, plus a per‑user *Allowed / Denied* permission for each, set from **Admin Access**.
- Dashboard "Today's Tasks" now shows a completed task only on the day it was completed (until local midnight).
- Fixed: Checklist tasks could not be completed in demo mode.
- Setup guides: **[CONNECT-SHEETS-AND-DEPLOY.md](CONNECT-SHEETS-AND-DEPLOY.md)** and **[UPDATE-LOGO.md](UPDATE-LOGO.md)**.

## Pages
- Login
- Dashboard
- Checklist (formerly "Tasks List")
- Delegation
- Calendar
- Reports & Score
- Live Score
- History
- Help & Support
- Assign Task
- Settings
- Admin Access (admin only)

## New/fixed behavior
### Task checkboxes
- Every pending task has a checkbox.
- **Select All** selects every visible pending task.
- Clicking one checkbox selects/unselects one task.
- Multiple tasks can be selected.
- **Submit Selected** opens a confirmation/completion drawer.
- A single selected task can also be submitted.
- Completed tasks are not selectable.
- Dashboard uses a read-only task indicator.

### Live score
- Dashboard shows a simple live percentage based on completed/visible tasks.
- Reports & Score gives the detailed breakdown: overall, Checklist, Delegation, completed, pending and overdue.
- The score calculation is isolated at the presentation layer so the exact production scoring engine can replace it without redesigning the UI.

### Settings
Settings is a real accessible page from the sidebar and mobile More menu.
Options currently include:
- Profile view
- Email notifications
- Task reminders
- Confirm before submit
- Compact task list
- Default task type
- Security/session information
- Save Changes (persisted in browser storage)

## Run locally — demo mode
Requirements: Node.js 20+ recommended.

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

Demo login:
- Admin: `admin` / `admin123`
- User: `rahul` / `1234` (Calendar: past allowed, future denied — demonstrates the new permission)
- User: `amit` / `1234`

Demo data is stored in browser localStorage (key `crest_demo_store_v4`). To reset, run `RESET-DEMO.bat` for the console command, or clear site data in the browser.

## Test checklist
1. Login as `rahul`.
2. Open **My Tasks**.
3. Click one checkbox.
4. Click another checkbox.
5. Confirm `Submit Selected (2)` appears.
6. Click it and press **Submit**.
7. Refresh: both tasks must be Done.
8. Click **Select All** and verify all pending visible tasks become selected.
9. Open **Delegation**, select one or multiple pending records and submit them.
10. Open **Delegation → History** and verify completed delegation records appear.
11. Open **Dashboard** and verify Live Score changes.
12. Open **Reports & Score** and verify detailed counts/percentages.
13. Open **Settings** from sidebar, change an option, click Save Changes, reload and verify it remains.
14. Test at mobile width; bottom navigation should remain available.

## Connect Google Sheets & deploy

**Full step‑by‑step:** [CONNECT-SHEETS-AND-DEPLOY.md](CONNECT-SHEETS-AND-DEPLOY.md)
— it covers the spreadsheet layout (including the new `Actual Time` column and the
`Calendar Past` / `Calendar Future` access rows), deploying the Apps Script Web
App, the `.env` values, local testing and the Vercel deploy.

Quick version — copy `.env.example` to `.env` and set:

```env
VITE_DEMO_MODE=false
VITE_APPS_SCRIPT_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
VITE_SPREADSHEET_ID=YOUR_SPREADSHEET_ID
VITE_DRIVE_FOLDER_ID=YOUR_DRIVE_FOLDER_ID
```

Then deploy `setup/google-apps-script/Code.gs` as an Apps Script Web App
(*Execute as: Me*, *Who has access: Anyone*) and restart Vite.

Spreadsheet tabs: `master`, `Checklist`, `DELEGATION`, `ACCESS CONTROL`,
`Working Day Calendar`, `UNIQUE` (plus `TASK HISTORY`, `DELEGATION DONE`,
`HELP & SUPPORT` which the script auto‑creates).

## Important production note
The included starter authentication reads the `master` sheet in the current architecture. Before exposing a real organization-wide deployment, move credential validation and authorization fully server-side and do not expose the user/password dataset to the browser.

## Completion confirmation behavior
- Selecting task checkboxes only selects tasks; it never asks for responsibility confirmation.
- Clicking **Submit Selected** opens a centered popup modal, not a right-side drawer.
- The popup shows Task Name, Planned Date (with time), **Actual Date & Time**, and Status.
- The responsibility checkbox is required only inside that popup. Until it is checked, Submit stays disabled; no "responsibility confirmation is required" error is shown merely for selecting tasks.
- Multiple selected tasks use one confirmation popup.
- Re‑opening the popup always starts fresh (no leftover state from a previous submission).
- The UI is responsive for desktop, tablet and mobile.

## Calendar
- Shows **every scheduled occurrence** for the month — recurring tasks are expanded by frequency; **Sundays and marked holidays are skipped and pushed to the next working day**.
- Occurrences are placed on the correct local day (previously shifted one day earlier east of UTC).
- **Present day** highlighted with an orange ring and a "Today" tag; **festival holidays** highlighted in purple with the occasion name (Diwali, Holi, …). Admins / Calendar editors add or remove holidays from the **Holidays** panel (see the changelog).
- **Show Past Tasks** / **Show Future Tasks** checkboxes filter occurrences relative to today; today is always shown. The choice is remembered in the browser.
- An administrator can allow or deny each toggle per user from **Admin Access → Calendar — Show Past/Future Tasks**. A denied toggle appears locked. Admins always have both.
- The day pop‑up shows the recorded **Actual: DD/MM/YYYY HH:MM** for completed tasks.

## Changelog — this update

| Area | Change |
|---|---|
| Completion | Records **Actual Time** alongside Actual Date. New `Actual Time` column in `Checklist`, `DELEGATION`, `TASK HISTORY`, `DELEGATION DONE`. |
| Completion popup | Shows Actual Date & Time and Planned time; consistent `DD/MM/YYYY` formatting; correct singular/plural wording; resets on every open. |
| Calendar | Fixed one‑day shift (Sat/Sun) caused by UTC date bucketing. Added Past/Future visibility toggles. |
| Permissions | New `Calendar Past` / `Calendar Future` rows in `ACCESS CONTROL` (`Allowed` / `Denied`), editable from Admin Access. Loaded into the session at login. |
| Settings | New **Calendar** section mirroring the Past/Future toggles (permission‑aware). |
| Dashboard | "Today's Tasks" shows a finished task only if it was completed today (drops off at local midnight). Uses local date, not UTC. |
| Tasks List → **Checklist** | Page renamed. Shows **Checklist tasks only** — delegated work lives on the Delegation page; the "Type" filter was removed. Added a summary strip (Visible / Pending / Overdue / Done). Old `Tasks List` access rows still work. |
| Admin Access | **Add User** is joined by **Edit User** (rename login, reset password, change role / department) and **Delete User**. Renaming cascades to the user's access rows and task assignments. The `admin` account is protected. |
| **Master TasksList** (new) | Admin‑only page below Admin Access. Two‑panel console (doers on the left, their tasks on the right) reading the `Checklist` + `DELEGATION` sheets. Admin sees every task; picking a doer opens that doer's panel. Add / edit / delete any task inline. Backed by new `updateTask` / `deleteTask` Apps Script actions. |
| **Holidays** (new page) | Its own sidebar entry (between Calendar and Reports), backed by a `HOLIDAYS` sheet (`Date` + `Occasion`). Only these dates are skipped/highlighted in the Calendar — festival days show purple with the occasion (Diwali, Holi, …), carry no tasks, and **each task moves to the next working day** (Sundays skipped in the same pass). The **present day** shows an orange ring + "Today" tag. Admins / `Holidays` editors add & remove entries on the page (`saveHoliday` / `deleteHoliday`); `Viewer` sees it read‑only. |
| Checklist & Delegation | **Viewer** access is now enough to tick task checkboxes and submit completions — previously only Editor / Full Access could. Applies to both pages. The **Checklist** page also gets an **Assign Task** button (matching Delegation); it pre-selects the correct task type on the Assign Task page. |
| Assign Task page | **Assign To** and **Department** are now dropdowns (users list / known departments). Picking a doer auto-fills their department. |
| Master TasksList | Added **Add User** (creates a login and selects it), and the **Add Task** form now carries **Name (dropdown), Task Description, Freq, Remarks** — Remarks also shows on each task row. Doer and Department are dropdowns. |
| Delegation | Filter toolbar now matches Checklist: search + **All Doers** + **Date** + **Status** + Clear, in addition to the Current / History tabs. |
| Calendar | Added a **Doer** filter dropdown, shown only to admins and users with Editor / Full Access on Calendar (hidden for Viewers). |
| Theme | **Delegation** now has its own colour (teal) — type pills, calendar chips, calendar legend, History / Live Score badges — so it reads distinctly from the orange Checklist. |
| Bug fix | Checklist tasks could not be completed in demo mode (`task.type` case mismatch). |
| Bug fix | Batch completion now reports how many of N tasks were saved if one fails. |
| Backend | `Code.gs` writes `Actual Time`; `createUser_` header matching cleaned up. |
| Demo data | Store key bumped to `crest_demo_store_v4` (auto‑reseeds); `RESET-DEMO.bat` corrected. |
