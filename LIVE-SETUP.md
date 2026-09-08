# CREST — Live Setup (authoritative)

This is the single, current runbook. It covers a fresh install and updating an
existing deployment, including the **Planned Tasks / monthly generator** feature.
Supersedes `GO-LIVE.md` for this build.

Repo: `https://github.com/Crestmis/TMSCREST` · branch `main` · latest verified
commit `a046661`.

---

## 0. What's in this build

Verified end-to-end in demo mode (login → every page → logout, as admin and as
two non-admin users):

| Area | State |
|---|---|
| Login / logout, wrong-password reject | OK |
| Dashboard (stats, Today's Tasks, Live Score, Upcoming) | OK |
| Checklist / Delegation | OK — future-dated rows hidden from the completion list; a task **completed today stays on the Current tab (ticked)** and moves to **History** the next local day; doer filter case-insensitive |
| Completion popup | OK — early completion blocked for **every** frequency ("Not due until …"); `Delay` renders as done |
| Calendar | OK — **untouched**; generated instances show as single chips |
| Holidays (add / delete) | OK |
| Reports & Score, Live Score | OK |
| All TasksList (add / edit / delete) | OK |
| **Planned Tasks** (new) | OK — plan CRUD, "Generate this month / next month", idempotent re-runs, Editor-gated |
| History, Help & Support, Settings (persist) | OK |
| Admin Access | OK — matrix **save now works in demo mode** (was a no-op — fixed), Add / Edit / Delete user |
| Assign Task | OK — Sunday → Monday shift, access-gated |
| Per-user task visibility (`Own Tasks` / `All Tasks`) | OK |
| Calendar Past / Future per-user locks | OK |

Apps Script files: **`Code.gs`** (backend + new `planAdd/planUpdate/planDelete/planGenerate` actions) and **`PlannedMonthly.gs`** (monthly generator + plan CRUD handlers). `Recurring.gs` is an alternative recurrence model — install **one** of the two, not both.

---

## 1. Back up first (2 min)

1. Spreadsheet → **File → Make a copy** → "CREST backup <today>".
2. Apps Script → **Deploy → Manage deployments** → note the current **Version** number.
3. Your current Vercel **Production** deployment is the frontend rollback point.

---

## 2. Google Sheet + Apps Script

### 2.1 Tabs (case-sensitive)

`master`, `Checklist`, `DELEGATION`, `ACCESS CONTROL`, `HOLIDAYS`,
`Working Day Calendar`, `UNIQUE` — you create these. `TASK HISTORY`,
`DELEGATION DONE`, `HELP & SUPPORT`, `AllTasksList`, `Task_Planned_CL`,
`Task_Planned_DL` — auto-created by the script.

`master` column order: **A Department · B Name · C Username · D Password · E Role**.

### 2.2 Paste the code

1. Spreadsheet → **Extensions → Apps Script**.
2. **`Code.gs`** → select all, delete, paste the full `Code.gs` from this repo
   (`setup/google-apps-script/Code.gs`). **Ctrl+S**.
3. **`+` (Files) → Script**, name it **`PlannedMonthly`** → paste the full
   `setup/google-apps-script/PlannedMonthly.gs`. **Ctrl+S**.
   *(If it already exists: open it, select all, delete, paste, save.)*
4. Confirm: **Ctrl+F** in `Code.gs` for `planAdd` — it must appear in the
   `doPost` line.

### 2.3 Publish a NEW version *(the `/exec` URL only serves the last published version)*

**Deploy → Manage deployments → ✏️ Edit** on the existing deployment →
**Version → New version** → **Deploy**. URL is unchanged.
*(Do not create a new deployment — that makes a new URL.)*

### 2.4 One-time setup functions (function dropdown → **Run**, authorize when asked)

1. `setupSheets` — creates the core tabs + a default admin login.
2. `setupPlannedSheets` — creates `Task_Planned_CL` and `Task_Planned_DL`.
3. `installMonthlyGenerator` — installs the trigger: **1st of each month, ~00:00**
   (script time zone).

### 2.5 Time zone

Apps Script → gear → **Project Settings → Time zone** = your office
(e.g. *(GMT+05:30) India Standard Time*). The generator uses it for "the 1st"
and "which dates are past".

### 2.6 Health check

Browser: `<your /exec URL>?action=health` → `{"success":true,"message":"CREST backend is running", ...}`

---

## 3. Frontend (Vercel)

### 3.1 Environment variables

Project → **Settings → Environment Variables** (Production, plus Preview if used):

| Name | Value |
|---|---|
| `VITE_DEMO_MODE` | `false` |
| `VITE_APPS_SCRIPT_URL` | your `…/exec` URL |
| `VITE_SPREADSHEET_ID` | the id between `/d/` and `/edit` in the sheet URL |
| `VITE_DRIVE_FOLDER_ID` | blank |

`VITE_` values are compiled in **at build time** — Vercel will show *"Redeploy to apply"*.
The `VITE_` prefix warning is expected; keep the names exactly, type = plaintext.

### 3.2 Deploy

- Git-connected project: push to `main` (already done for `a046661`) → Vercel builds it.
- Otherwise: **Deployments → ⋯ → Redeploy** (untick "Use existing Build Cache"), or `vercel --prod` from the project root.
- Wait for **Ready** + **Production**.

### 3.3 Confirm it's not in demo mode

Open the site → **F12 → Network → reload** → you must see requests to
`script.google.com`. If `admin` / `admin123` still logs in, `VITE_DEMO_MODE`
didn't take — recheck 3.1 and redeploy.

---

## 4. Data configuration

### 4.1 `master`

- One row per person, unique `Username`, `Role = user` for doers.
  `admin` / `main admin` only for real admins (they bypass the permission matrix).
- Change the `admin` password away from `admin123`. No shared logins.

### 4.2 `ACCESS CONTROL` — `Username | Page | Access`

- Every non-admin needs page rows. Valid pages:
  `Dashboard`, `Checklist`, `Delegation`, `Calendar`, `Holidays`,
  `Reports & Score`, `Assign Task`, `Settings`, `History`, `Help & Support`,
  `Live Score`, `Admin Access`, `All TasksList`, **`Planned Tasks`**.
  Access = `None` | `Viewer` | `Editor` | `Full Access`.
- Special rows: `Task Visibility` = `Own Tasks` (default) | `All Tasks`;
  `Calendar Past` / `Calendar Future` = `Allowed` (default) | `Denied`.
- **The "every doer sees every task" bug is here:** a normal doer must have
  `Task Visibility` = `Own Tasks` (or no row). Only give `All Tasks` to a
  supervisor.
- `Planned Tasks` = `Editor`/`Full Access` to add/edit/delete plans and run
  Generate; `Viewer` = read-only; omit the row to hide the page.
- Easiest to manage from the app's **Admin Access** page after go-live.

### 4.3 `Checklist` / `DELEGATION` doer column

- Header must be `Name` (also accepted: `Doer`, `Doer Name`, `Assignee`,
  `Assigned To`, `Employee`, `Staff`, `Staff Name`).
- Values must equal the person's **login username** — `rahul`, not `Rahul Kumar`.
- Full 17-column header row incl. `Actual Date`, `Actual Time`,
  `Completion Type`, `Responsibility Confirmed`, `Confirmed At`.

---

## 5. Recurring tasks — the monthly generator

### 5.1 Plan sheet schema (`Task_Planned_CL` / `Task_Planned_DL`)

`Plan ID | Task Description | Department | Given By | Name | Start Date | Time | Freq | End Date | Require Attachment | Enable Reminders | Remarks | Active`

- `Plan ID` — leave blank, auto-filled `PCL-n` / `PDL-n`.
- `Name` — login username. `Start Date` — the anchor the recurrence counts from
  (the 1st of a month is fine). `Freq` — `Daily | Fortnightly | Weekly | Monthly
  | Quarterly | Half-Yearly | Yearly | One-Time`. `Active` — `Yes` / `No`.

### 5.2 Migrate your existing recurring tasks

For each recurring row in `Checklist` / `DELEGATION`:

1. Add a matching **plan** (app → **Planned Tasks → Add Plan**, or type a row in
   the plan sheet).
2. On the **old** working-sheet row, change its **`Freq` to `One-Time`** — leave
   everything else on the row alone (so the Calendar draws it once). The doer
   finishes it normally; from next month the generator produces the plan's
   instances.
3. Genuinely one-off tasks: don't touch them.

### 5.3 How generation works

- On the **1st of each month at ~00:00** the trigger builds **every occurrence
  of every active plan for that whole month** into `Checklist` / `DELEGATION` as
  `Status = Pending`, `Freq = One-Time`, Task ID `PlanID#yyyy-mm-dd`.
- **Purely additive** — never edits/deletes/reorders an existing row; pending
  tasks untouched.
- **Idempotent** — an instance already present is skipped, so re-running is safe.
- Sundays and `HOLIDAYS` dates are skipped (pushed to the next working day).
- **Calendar is not affected** — `One-Time` rows are not re-expanded.
- Completion is unchanged: `Done` → `TASK HISTORY` (+ `DELEGATION DONE`).

### 5.4 Seed the first month

App → **Planned Tasks → Generate this month** (and optionally **Next month**).
After that it's automatic on the 1st.

---

## 6. Verification checklist (run on the live site)

**Connection**
- [ ] `?action=health` → `success:true`
- [ ] Network tab shows `script.google.com` calls; `admin/admin123` does **not** log in

**Visibility**
- [ ] Log in as a normal doer → Dashboard "Total Tasks" = only their count; Checklist/Delegation show only their tasks
- [ ] Log in as admin → sees everyone's

**Completion & Current/History**
- [ ] Complete a task → stays on **Current** with a Done badge, not selectable; **not** on the History tab yet; row gets `Status=Done` + `Actual Date/Time`; `TASK HISTORY` row appended (+ `DELEGATION DONE` for a delegation)
- [ ] Next day (or set a test row's `Actual Date` to yesterday) → leaves Current, appears on History
- [ ] A future-dated task is not in Current and the completion popup blocks it ("Not due until …")

**Planned Tasks**
- [ ] Add / edit / delete a plan
- [ ] **Generate this month** → rows appear (`PlanID#date`, `Freq = One-Time`, `Pending`)
- [ ] **Generate this month** again → "0 generated, N already existed"
- [ ] Calendar: one chip per instance on its date; Sundays/holidays skipped
- [ ] As a `Viewer` user: page is read-only, no Add/Generate buttons

**Admin & Assign**
- [ ] Admin Access → change a permission → **Save Access** → row updates in `ACCESS CONTROL`; the user sees it after a reload
- [ ] Add / rename / delete a user works; `admin` is protected
- [ ] Assign Task on a Sunday → date moves to Monday; a `Viewer` on "Assign Task" can't submit

**Other pages**
- [ ] Holidays add/remove; Reports & Live Score numbers; History filters; Help & Support submit; Settings save + reload persists

---

## 7. Rollback

| Layer | How |
|---|---|
| Apps Script | Deploy → Manage deployments → ✏️ Edit → Version → previous number → Deploy |
| Vercel | Deployments → previous Production → ⋯ → Promote to Production |
| Google Sheet | Restore the "CREST backup" copy, or File → Version history |
| Stop generation | run `uninstallMonthlyGenerator`; rows already generated remain as normal One-Time tasks |

Layers are independent — old frontend works with new `Code.gs` and vice versa.

---

## 8. Known limitations (unchanged)

- **Client-side auth:** `?action=fetch&sheet=master` returns every username +
  plain-text password to anyone with the `/exec` URL.
- **`doPost` has no authorization** — anonymous callers can `deleteUser`,
  `saveAccess`, `deleteTask`, `planDelete`, …
- **Daily** rows whose start date is > ~1 year before the viewed month drop off
  the Calendar (occurrence-loop cap). Not an issue for the monthly generator's
  `One-Time` instances.
- The base app has **no auto-recurrence** without `PlannedMonthly.gs` (or
  `Recurring.gs`).

See [`HOW-IT-WORKS.md`](HOW-IT-WORKS.md) for the full system reference.
