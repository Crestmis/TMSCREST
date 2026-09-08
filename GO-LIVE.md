# CREST — Ship these changes to your live Google Sheet setup

You already have a live Spreadsheet + Apps Script Web App + Vercel deployment.
This is the exact procedure to push the changes from this session into that
running system, fix the config issues behind the "every doer sees every task"
report, and verify it.

Do the parts **in order**. Parts 1–2 are the code. Part 3 is the Google Sheet
data. Part 4 verifies. Part 5 is rollback.

---

## 0. What changed in this session

| File | What changed | Affects |
|---|---|---|
| [`setup/google-apps-script/Code.gs`](setup/google-apps-script/Code.gs) | `completeTask_` now rejects a completion dated **before** the planned date for **every** frequency (was Daily‑only). | **Backend** (Apps Script) |
| [`src/services/tasks.js`](src/services/tasks.js) | New `isFuturePlanned()` helper. Doer‑column detection widened — `Name`, `Doer`, `Doer Name`, `Assignee`, `Assigned To`, `Employee`, `Employee Name`, `Staff`, `Staff Name`, `Emp Name`, `Person`, `Username`. | Frontend |
| [`src/pages/Tasks.jsx`](src/pages/Tasks.jsx) | Checklist "Current": future‑dated rows hidden; **completions stay on Current (ticked) for the rest of the day, move to History next day**; doer filter case‑insensitive + de‑duplicated; "N task hidden" note removed. | Frontend |
| [`src/pages/Delegation.jsx`](src/pages/Delegation.jsx) | Same changes for Delegation. | Frontend |
| [`src/components/TaskRow.jsx`](src/components/TaskRow.jsx) | A `Delay` (late) completion renders as done — check icon, not a checkbox. | Frontend |
| [`src/components/CompletionDrawer.jsx`](src/components/CompletionDrawer.jsx) | Early completion blocked for all frequencies ("Not due until DD/MM/YYYY"). | Frontend |
| [`src/data/demoStore.js`](src/data/demoStore.js) | Same early‑completion guard for demo mode. | Demo only — no effect live, ship it to keep the repo consistent |
| [`HOW-IT-WORKS.md`](HOW-IT-WORKS.md) | New reference doc. | Docs only |

**Do NOT ship:** `.claude/`, `node_modules/`, `dist/`, `.env`.

---

## 1. Back up (2 minutes — do not skip)

1. **Google Sheet:** `File → Make a copy` → name it `CREST backup <today>`.
2. **Apps Script:** `Deploy → Manage deployments` → note the current **Version
   number** (e.g. "Version 7"). That is your backend rollback point.
3. **Vercel:** your current **Production** deployment is the frontend rollback
   point — nothing to do now, just know it is there.

---

## 2. Update the Apps Script backend

Only `Code.gs` changed. Apps Script is edited by pasting the whole file.

1. Open your Spreadsheet → **Extensions → Apps Script**.
2. In `Code.gs`, select all (**Ctrl+A**) and delete.
3. Open [`setup/google-apps-script/Code.gs`](setup/google-apps-script/Code.gs)
   from this folder, copy **everything**, paste it in.
4. **Ctrl+S** to save.
5. Confirm the change is in — search (Ctrl+F) for `cannot be completed before its
   planned date`. It should read:
   ```js
   if(planned&&!isNaN(planned.getTime())&&actualKey<Utilities.formatDate(planned,Session.getScriptTimeZone(),'yyyy-MM-dd'))throw new Error('This task cannot be completed before its planned date ('+…+').');
   ```
   (no `freq==='daily'&&` in front of it).
6. **Publish a new version** — the `/exec` URL only serves the last *published*
   version, not your unsaved editor code:
   **Deploy → Manage deployments → ✏️ (edit) → Version: `New version` →
   Deploy**.
   The `/exec` URL does **not** change.
7. Verify: open `<your /exec URL>?action=health` in a browser →
   `{"success":true,"message":"CREST backend is running",...}`.

---

## 3. Ship the frontend

Pick the row that matches how your Vercel project is set up.

### 3A. Vercel deploys from a GitHub/GitLab repo  *(most common)*

1. In your **repo working copy** (the folder Vercel builds from), overwrite these
   files with the versions from **this** folder:
   ```
   src/services/tasks.js
   src/pages/Tasks.jsx
   src/pages/Delegation.jsx
   src/components/TaskRow.jsx
   src/components/CompletionDrawer.jsx
   src/data/demoStore.js
   setup/google-apps-script/Code.gs
   HOW-IT-WORKS.md          (optional)
   GO-LIVE.md               (optional)
   ```
   Do not copy `.env`, `.claude/`, `node_modules/`, `dist/`.
2. Commit and push:
   ```bash
   git add -A
   git commit -m "Task visibility + future-task gating + Current/History day rule"
   git push
   ```
3. Vercel auto‑builds the push. Watch **Vercel → your project → Deployments**
   until the new one is **Ready** and promoted to **Production**.

### 3B. You deploy with the Vercel CLI

```bash
npm install -g vercel
vercel login
# from the project root (the folder with package.json):
vercel --prod
```
Environment variables must be set in the Vercel dashboard (Part 3.1) — the CLI
build uses those.

### 3C. You upload a built folder / another static host

```bash
npm install
npm run build      # outputs dist/
```
Upload the contents of `dist/` to your host. `VITE_*` values are baked into that
build, so set them (Part 3.1) **before** running `npm run build`.

### 3.1. Environment variables — this is the "still in demo mode" fix

`VITE_*` values are compiled in **at build time**. Setting them without a rebuild
does nothing.

**Local `.env`** (project root — same folder as `package.json`; copy from
`.env.example`):
```
VITE_DEMO_MODE=false
VITE_APPS_SCRIPT_URL=https://script.google.com/macros/s/AKfy…/exec
VITE_SPREADSHEET_ID=1AbCdEf…            # the long id in the sheet URL
VITE_DRIVE_FOLDER_ID=                    # leave blank unless you use attachments
```
After editing `.env`, **stop and restart** `npm run dev`.

**Vercel:** project → **Settings → Environment Variables** → set the same four
(scope: Production, and Preview if you use it):

| Name | Value |
|---|---|
| `VITE_DEMO_MODE` | `false` |
| `VITE_APPS_SCRIPT_URL` | your `/exec` URL |
| `VITE_SPREADSHEET_ID` | your spreadsheet id |
| `VITE_DRIVE_FOLDER_ID` | blank (or your Drive folder id) |

Then **redeploy** (Deployments → ⋯ on the latest → **Redeploy**) so the values
are picked up. A push in Part 3A already rebuilds, so if the vars were already
set you are done; if you set them just now, redeploy once.

---

## 4. Fix the Google Sheet

This is where the "logging in as `rahul` shows **all** doers' tasks" problem
lives — the frontend filter is correct (verified), so the cause is data.

### 4.1 `master` tab — logins

- Column order **A `Department` · B `Name` · C `Username` · D `Password` ·
  E `Role`** (the frontend reads these by position).
- **One row per real person**, each with a **unique `Username`**.
- `Role` = `user` for every normal doer.
  `admin` or `main admin` **only** for people who should see and manage
  everything — a `main admin` bypasses the whole permission matrix.
- Nobody shares the `admin` login. Change `admin`'s password away from
  `admin123`.
- `Role` containing `inactive` disables that login.

### 4.2 `ACCESS CONTROL` tab — the visibility fix

Header: `Username | Page | Access`.

1. Filter/scan the tab for rows where **`Page` = `Task Visibility`**.
2. For every ordinary doer, that row's **`Access` must be `Own Tasks`** — or
   just **delete the row** (`Own Tasks` is the default when absent).
3. `Access = All Tasks` is what makes a user see everyone's tasks. Keep it
   **only** for a supervisor/manager who genuinely needs the org‑wide view.
4. Make sure the doer in question is **not** `Role = main admin` in `master`
   (4.1) and is **not** logging in through the `admin` account — both bypass this
   filter entirely.
5. While here: every non‑admin user should have page rows
   (`Dashboard`, `Checklist`, `Delegation`, `Calendar`, `Reports & Score`,
   `History`, `Live Score`, `Settings`, `Help & Support`, and `Assign Task` /
   `Holidays` / `Admin Access` as needed). Easiest to set these from the app's
   **Admin Access** page after go‑live.

### 4.3 `Checklist` and `DELEGATION` tabs — the doer column

- The **doer column header** must be `Name` (now also accepted:
  `Doer`, `Doer Name`, `Assignee`, `Assigned To`, `Employee`, `Employee Name`,
  `Staff`, `Staff Name`, `Emp Name`, `Person`). If it is anything else, the app
  reads the doer as blank for every row → ordinary users see **nothing**, and an
  admin sees **everything** (which can look like "all doers' tasks are showing").
- The **value** in that column must equal the person's **`Username`**, e.g.
  `rahul` — **not** `Rahul Kumar`. Case no longer matters, spelling does.
- The `Given By` column is the assigner's username, same rule.
- Both tabs need the full 17‑column header row, including `Actual Date`,
  **`Actual Time`**, `Completion Type`, `Responsibility Confirmed`,
  `Confirmed At` — the app writes into those on completion. Header row:
  ```
  Task ID | Task Description | Department | Given By | Name | Task Start Date | Task Start Time | Freq | Status | Require Attachment | Enable Reminders | Remarks | Actual Date | Actual Time | Completion Type | Responsibility Confirmed | Confirmed At
  ```
- `Freq` values: `One-Time`, `Daily`, `Fortnightly`, `Weekly`, `Monthly`,
  `Quarterly`, `Half-Yearly`, `Yearly` (use these exact words —
  `Bi-weekly`, `Annual`, etc. fall back to one‑time).

### 4.4 `HOLIDAYS` tab

Header `Date | Occasion`. Add your festival / public holidays
(`2026-10-20 | Diwali`). The Calendar skips these dates and pushes their tasks to
the next working day. Auto‑created if missing.

### 4.5 Tab names (case‑sensitive)

`master`, `Checklist`, `DELEGATION`, `ACCESS CONTROL`, `HOLIDAYS`,
`Working Day Calendar`, `UNIQUE`. `TASK HISTORY`, `DELEGATION DONE`,
`HELP & SUPPORT` are auto‑created.

---

## 5. Verify on the live site

Run every check. Stop and fix if one fails.

**Backend / connection**
- [ ] `<your /exec URL>?action=health` → `success:true`.
- [ ] Open the deployed site → DevTools (F12) → **Network** → reload → you see
      requests to `script.google.com`. *(If not, or if `admin`/`admin123` still
      logs in, it is still in demo mode — recheck Part 3.1 and redeploy.)*

**Visibility (the reported bug)**
- [ ] Log in as a normal doer (e.g. `rahul`). Dashboard **"Total Tasks"** =
      only that person's count.
- [ ] Checklist → Current and Delegation → Current show **only their** tasks;
      another doer's tasks are absent.
- [ ] Log in as `admin` → sees **all** doers' tasks.

**Future‑task gating**
- [ ] A task whose `Task Start Date` is after today does **not** appear in
      Checklist / Delegation → Current and cannot be ticked.
- [ ] In the completion popup, a not‑yet‑due task shows **"Not due until
      DD/MM/YYYY"** and cannot be submitted. Try it with a Weekly/Monthly task,
      not just Daily.
- [ ] No "N task hidden" text anywhere.

**Current vs History day rule**
- [ ] Complete a task → it **stays on the Current tab** with a green **Done**
      badge and a check icon; it is not selectable; the **History tab does not
      list it yet**.
- [ ] The `Checklist` / `DELEGATION` row gets `Status = Done`, `Actual Date`,
      `Actual Time`; a row is appended to `TASK HISTORY` (and `DELEGATION DONE`
      for a delegation).
- [ ] The **next day** (or set a test row's `Actual Date` to yesterday): the
      task is gone from Current and now appears on **History**.

**Regression sweep**
- [ ] Assign a task dated on a **Sunday** → message says it moved to Monday and
      the row's date is the Monday.
- [ ] Calendar: recurring tasks expand by frequency, Sundays + `HOLIDAYS` dates
      are skipped/purple, "Today" is ringed.
- [ ] Admin Access → change a user's permission → **Save Access** → a matching
      row appears/updates in `ACCESS CONTROL`. Log in as that user → the change
      is in effect after a reload.
- [ ] Holidays page → add and remove a holiday → `HOLIDAYS` tab updates.

---

## 6. Rollback

| Layer | How |
|---|---|
| **Apps Script** | `Deploy → Manage deployments → ✏️ Edit → Version:` pick the number you noted in Part 1 → **Deploy**. |
| **Frontend (Vercel)** | `Deployments` → the previous **Production** deployment → **⋯ → Promote to Production** (or Redeploy). |
| **Google Sheet** | Restore from the `CREST backup <today>` copy made in Part 1. |

Each layer rolls back independently — the old frontend works with the new
`Code.gs` and vice versa (the only backend change is a stricter date check on
completion).

---

## 7. Unchanged limitations (know these before a wide rollout)

- **Client‑side auth:** anyone with the `/exec` URL can `GET
  ?action=fetch&sheet=master` and read every username + plain‑text password.
- **`doPost` has no authorization:** any anonymous caller can `deleteUser`,
  `saveAccess`, `deleteTask`, etc.
- **Daily tasks** whose start date is more than ~1 year before the month you are
  viewing drop off the Calendar (occurrence loop cap).
- **No auto‑recurrence:** every frequency is one completable row; it does not
  re‑open for the next period on its own.

See [`HOW-IT-WORKS.md`](HOW-IT-WORKS.md) §18 and the "important production note"
in [`README.md`](README.md).
