# CREST — Connect Google Sheets & Deploy

This is the complete, current procedure. It already includes the columns added in
the latest update (**Actual Time**) and the new access rows
(**Calendar Past / Calendar Future**).

- **Part 1** — build the Google Spreadsheet
- **Part 2** — install & deploy the Apps Script backend
- **Part 3** — point the app at your sheet (`.env`)
- **Part 4** — test locally
- **Part 5** — deploy to Vercel
- **Part 6** — go‑live checklist

---

## Part 1 — Build the Google Spreadsheet

Create **one** Google Spreadsheet. Add the tabs below. **Tab names are
case‑sensitive** and must match exactly.

| Tab | You create it | Purpose |
|---|---|---|
| `master` | **Yes** | Users + login credentials |
| `Checklist` | **Yes** | Routine / recurring tasks |
| `DELEGATION` | **Yes** | Delegated tasks |
| `ACCESS CONTROL` | Yes (or auto) | Per‑user page & feature permissions |
| `Working Day Calendar` | Yes (may be empty) | Optional list of allowed working dates |
| `UNIQUE` | Yes (may be empty) | Reserved for lookups |
| `HOLIDAYS` | Yes (or auto) | Festival / public holidays — `Date` + `Occasion` |
| `TASK HISTORY` | Auto‑created | Completion log (all completions) |
| `DELEGATION DONE` | Auto‑created | Completed delegations |
| `HELP & SUPPORT` | Auto‑created | Help/Support form submissions |

> "Auto‑created" tabs are made by the script the first time they are needed, with
> the correct headers. You can also pre‑create them using the headers listed in
> Part 1.6.

### 1.1 `master` — users & credentials

Row 1 is the header row. **Column order matters** (the app reads columns by
position); the header text must also contain these words (the script matches by
name).

| A | B | C | D | E |
|---|---|---|---|---|
| **Department** | **Name** | **Username** | **Password** | **Role** |
| Administration | Admin User | `admin` | `admin123` | `admin` |
| Operations | Rahul K | `rahul` | `Pass@123` | `user` |
| Sales | Amit S | `amit` | `Pass@123` | `user` |

- **Role**: `admin` or `main admin` = full access to everything. Anything else = normal user.
- A role containing the word `inactive` disables that login.
- If no `admin` row exists, the script auto‑adds `admin` / `admin123` on first read — change that password.

### 1.2 `Checklist` and `DELEGATION` — task sheets

Both tabs use the **same header row** (row 1):

```
Task ID | Task Description | Department | Given By | Name | Task Start Date | Task Start Time | Freq | Status | Require Attachment | Enable Reminders | Remarks | Actual Date | Actual Time | Completion Type | Responsibility Confirmed | Confirmed At
```

- Columns **A–L** you fill in (or the app fills when a task is assigned).
- Columns **M–Q** (`Actual Date` … `Confirmed At`) are written by the app when a
  task is completed. Create the headers now so the data lands in named columns.
- `Task Start Date`: `yyyy-mm-dd` or `dd/mm/yyyy`.
- `Task Start Time`: `HH:MM` (24‑hour).
- `Freq`: one of `One-Time`, `Daily`, `Fortnightly`, `Weekly`, `Monthly`,
  `Quarterly`, `Half-Yearly`, `Yearly`.
- `Status`: leave blank or `Pending`. The app sets `Done` / `Delay` on completion.
- `Actual Time` is the new field — it stores the clock time the task was submitted (e.g. `12:48`).

Example `Checklist` rows:

| Task ID | Task Description | Department | Given By | Name | Task Start Date | Task Start Time | Freq | Status |
|---|---|---|---|---|---|---|---|---|
| C-1001 | Submit Daily Report | Operations | rahul | rahul | 2026-09-08 | 09:00 | Daily | Pending |
| C-1002 | Safety Inspection | Operations | rahul | rahul | 2026-09-10 | 10:30 | Monthly | Pending |

### 1.3 `ACCESS CONTROL` — permissions

Header row: `Username | Page | Access`

One row **per user, per permission**. This tab is normally managed from the app's
**Admin Access** page, but you can seed it here.

**Page permissions** — `Access` = `None` | `Viewer` | `Editor` | `Full Access`

Valid `Page` values:
`Dashboard`, `Checklist`, `Delegation`, `Calendar`, `Holidays`, `Reports & Score`,
`Assign Task`, `Settings`, `History`, `Help & Support`, `Live Score`,
`Admin Access`, `Master TasksList`

> On **`Checklist`** and **`Delegation`**, `Viewer` is enough to tick task
> checkboxes and submit completions (not just view). `Editor` / `Full Access`
> additionally allow assigning and other bulk actions.

> `Admin Access` and `Master TasksList` are admin‑only regardless of the row —
> they render only for accounts whose `master` Role is `admin` / `main admin`.

> The page previously called **`Tasks List`** is now **`Checklist`**. Old
> `Tasks List` rows are still honoured, but new rows should use `Checklist`.

**Feature permissions** — special `Page` values with their own `Access` values:

| Page | Access values | Meaning |
|---|---|---|
| `Task Visibility` | `Own Tasks` / `All Tasks` | Can this user see other people's tasks? |
| `Calendar Past` | `Allowed` / `Denied` | Can this user tick **"Show Past Tasks"** in the Calendar? |
| `Calendar Future` | `Allowed` / `Denied` | Can this user tick **"Show Future Tasks"** in the Calendar? |

> `Calendar Past` / `Calendar Future` default to **Allowed** if the row is absent.
> Set them to `Denied` to restrict a user to today's tasks only.
> Admins are always allowed.

Example:

| Username | Page | Access |
|---|---|---|
| rahul | Dashboard | Viewer |
| rahul | Checklist | Editor |
| rahul | Delegation | Editor |
| rahul | Calendar | Viewer |
| rahul | Reports & Score | Viewer |
| rahul | History | Viewer |
| rahul | Live Score | Viewer |
| rahul | Settings | Viewer |
| rahul | Help & Support | Viewer |
| rahul | Assign Task | None |
| rahul | Admin Access | None |
| rahul | Task Visibility | Own Tasks |
| rahul | Calendar Past | Allowed |
| rahul | Calendar Future | Denied |

You do **not** need `ACCESS CONTROL` rows for the `admin` user — admins get
everything automatically.

### 1.4 `Working Day Calendar` (optional)

Put working dates (any format Google recognises) anywhere on this tab. If it has
**any** dates, the Calendar only shows task occurrences that fall on those dates
(Sundays are always excluded). Leave it **empty** to allow every non‑Sunday.

### 1.5 `HOLIDAYS` — festival / public holidays

Header row: `Date | Occasion`

| Date | Occasion |
|---|---|
| 2026-10-20 | Diwali |
| 2027-03-14 | Holi |

- The **Calendar** highlights these dates in purple with the occasion name, shows
  no task chips on them, and **moves any task from a holiday to the next working
  day** (Sundays are skipped in the same pass). Only the dates in this tab are
  skipped/highlighted.
- The **Holidays** page (its own sidebar entry, between Calendar and Reports)
  lists all holidays and — for admins and users with `Editor` / `Full Access` on
  `Holidays` — lets you add and remove them. It writes to this tab. Everyone with
  `Viewer` on `Holidays` sees the list read‑only.
- The script auto‑creates this tab on first read if it doesn't exist.

### 1.6 `UNIQUE`

Create it empty. Reserved.

### 1.7 Auto‑created tab headers (for reference)

If you prefer to pre‑create them:

- **`TASK HISTORY`**: `Task ID | Task Description | Task Type | Doer | Given By | Department | Planned Date | Planned Time | Actual Date | Actual Time | Status | Completion Type | Remarks | Submitted Date`
- **`DELEGATION DONE`**: `Timestamp | Task ID | Status | Completion Type | Next Target Date | Remarks | Attachment | Submitted Date | Actual Date | Actual Time | Responsibility Confirmed | Doer | Task | Given By | Department`
- **`HELP & SUPPORT`**: `Timestamp | Doer Name | Username | Department | Request Type | Priority | Subject | Details`

---

## Part 2 — Install & deploy the Apps Script backend

### 2.1 Add the code
1. In the spreadsheet: **Extensions → Apps Script**.
2. Delete any code in the default `Code.gs`.
3. Open [`setup/google-apps-script/Code.gs`](setup/google-apps-script/Code.gs)
   from this project, copy **all** of it, paste into the Apps Script editor.
4. Click **Save** (💾).

### 2.2 Deploy as a Web App
1. **Deploy → New deployment**.
2. Gear icon → **Web app**.
3. **Description:** `CREST backend v1`
4. **Execute as:** *Me* (your Google account).
5. **Who has access:** *Anyone*.
6. **Deploy** → **Authorize access** → pick your account → *Allow*.
7. Copy the **Web app URL**. It ends in `/exec`, e.g.
   `https://script.google.com/macros/s/AKfy…/exec`

### 2.3 Verify it
Paste this in a browser (your URL + `?action=health`):
```
https://script.google.com/macros/s/AKfy…/exec?action=health
```
Expected:
```json
{"success":true,"message":"CREST backend is running","time":"…"}
```

> **Every time you edit `Code.gs` later**, you must publish a new version:
> **Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy**.
> The `/exec` URL stays the same.

### 2.4 Actions the script handles

| Method | `action` | Used by |
|---|---|---|
| GET | `health`, `fetch&sheet=<name>` | app startup, every page load |
| POST | `insert` | Assign Task, Master TasksList → Add Task |
| POST | `complete` | task completion popup |
| POST | `updateTask` / `deleteTask` | **Master TasksList** → edit / delete a task row |
| POST | `saveHoliday` / `deleteHoliday` | **Holidays** page → add / remove a holiday |
| POST | `saveAccess` | Admin Access → Save Access |
| POST | `createUser` / `updateUser` / `deleteUser` | **Admin Access** → Add / Edit / Delete User |
| POST | `support` | Help & Support form |

`updateUser` with a changed username also rewrites that user's rows in
`ACCESS CONTROL` and their `Name` / `Given By` cells in `Checklist` and
`DELEGATION`. `deleteUser` removes the `master` row and all their `ACCESS CONTROL`
rows. The `admin` account is protected from rename and delete.

---

## Part 3 — Point the app at your sheet

In the project root, copy the example env file and edit it:

```bash
cp .env.example .env
```

`.env`:
```
VITE_DEMO_MODE=false
VITE_APPS_SCRIPT_URL=https://script.google.com/macros/s/AKfy…/exec
VITE_SPREADSHEET_ID=1AbCdEf…the long id from the sheet URL…
VITE_DRIVE_FOLDER_ID=
```

- `VITE_DEMO_MODE=false` switches the app from localStorage to your sheet.
- `VITE_SPREADSHEET_ID` is the id in the sheet URL:
  `https://docs.google.com/spreadsheets/d/`**`THIS-PART`**`/edit`
- `VITE_DRIVE_FOLDER_ID` is only needed for file attachments — leave blank otherwise.

> `.env` is git‑ignored. Note that `VITE_*` values are embedded into the built
> JavaScript, so the Apps Script URL and Spreadsheet ID become visible to anyone
> who loads the site. That is expected for this architecture — do not put
> anything secret in these values.

---

## Part 4 — Test locally against the sheet

```bash
npm install      # first time only
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`) and run through:

1. **Login** with a `master`‑sheet account (e.g. `admin` / `admin123`).
2. **Assign Task** → create a Delegation task for a real user → check it appears
   as a new row in the `DELEGATION` tab.
3. Assign one on a **Sunday** → confirm the message says it moved to Monday and
   the row's date is the Monday.
4. **Checklist** page → tick a task → **Submit Selected** → tick the
   responsibility box → **Submit**. Confirm:
   - the `Checklist` row gets `Status = Done`, `Actual Date`, **`Actual Time`**.
   - a row is added to `TASK HISTORY` (with `Actual Time`).
5. Complete a **Delegation** task → confirm a row also lands in `DELEGATION DONE`.
6. **History** and **Live Score** → the "Actual Date & Time" column shows date + time.
7. **Calendar** → confirm **Saturday shows tasks** and **Sunday is a blank holiday**;
   toggle **Show Past Tasks / Show Future Tasks**.
8. **Admin Access** → select a user → set **Calendar — Show Future Tasks** to the
   OFF (Denied) position → **Save Access** → check a new/updated row appears in
   `ACCESS CONTROL` (`Page = Calendar Future`, `Access = Denied`). Log in as that
   user → the "Show Future Tasks" checkbox is locked.

> After any change to `.env` you must **stop and restart** `npm run dev`.

### Production preview
```bash
npm run build
npm run preview
```
Open the preview URL and repeat the key checks.

---

## Part 5 — Deploy to Vercel

1. Push the project to a GitHub repository.
2. In Vercel: **Add New… → Project → Import** your repo.
3. Vercel auto‑detects Vite. Confirm:
   - **Framework Preset:** `Vite`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`
4. **Environment Variables** → add the same four keys as your `.env`:
   | Name | Value |
   |---|---|
   | `VITE_DEMO_MODE` | `false` |
   | `VITE_APPS_SCRIPT_URL` | your `/exec` URL |
   | `VITE_SPREADSHEET_ID` | your spreadsheet id |
   | `VITE_DRIVE_FOLDER_ID` | (blank or your folder id) |
5. **Deploy.**
6. Open the deployed URL and log in.

> Changing env vars later requires a **redeploy** (Vercel → Deployments → ⋯ →
> Redeploy) — they are baked in at build time.

Other static hosts (Netlify, Cloudflare Pages, GitHub Pages, or your own server)
work the same way: build with `npm run build`, serve the `dist/` folder, set the
`VITE_*` variables in the host's build settings.

---

## Part 6 — Go‑live checklist

- [ ] `admin` password changed from `admin123` in the `master` sheet.
- [ ] Real users added to `master` with strong passwords.
- [ ] `ACCESS CONTROL` rows created for every non‑admin user (or set from Admin Access).
- [ ] `?action=health` returns `success:true`.
- [ ] Task assign / complete round‑trips verified against the live sheet.
- [ ] Calendar Sat/Sun behaviour verified in the deployed build.
- [ ] Vercel env vars set and a fresh deploy done after setting them.
- [ ] (Recommended) Restrict who has the Apps Script URL, and review the
      "important production note" in `README.md` about moving authentication
      server‑side before a wide rollout.

---

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| Login always fails | `master` columns not in order **A=Department, C=Username, D=Password, E=Role**, or the header names don't contain those words |
| `VITE_APPS_SCRIPT_URL is not configured` | `.env` missing/blank, or dev server not restarted after editing `.env` |
| `Invalid Apps Script response …` | Web app not deployed as **Anyone**, or you used the editor URL instead of the `/exec` deployment URL |
| Edits to `Code.gs` have no effect | New version not published — **Manage deployments → Edit → New version** |
| `Sheet not found: X` | Tab name mismatch (case‑sensitive) — e.g. `Delegation` vs `DELEGATION` |
| `Actual Time` column stays empty | The `Checklist` / `DELEGATION` tab has no header cell named `Actual Time` — add it |
| Calendar still looks shifted by a day | You are running an old build — `npm run build` again / redeploy; hard‑refresh |
| "Show Past/Future Tasks" checkbox greyed out | That user has `Calendar Past` / `Calendar Future` = `Denied` in `ACCESS CONTROL` |
| Port 5173 in use | Vite picks the next free port — read the URL it prints |
