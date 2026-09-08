# CREST TMS — How the whole system works

A complete reference: every data structure, every screen, and an end‑to‑end trace
for each task frequency (One‑Time, Daily, **Fortnightly**, Weekly, Monthly,
Quarterly, Half‑Yearly, Yearly).

All examples assume **today = Tuesday 8 September 2026**.
Sundays that month: 6, 13, 20, 27.

---

## Contents

1. [The golden rule](#1-the-golden-rule)
2. [Two run modes](#2-two-run-modes)
3. [Google Sheet tabs — every column](#3-google-sheet-tabs--every-column)
4. [In‑memory structures](#4-in-memory-structures)
5. [Login — step by step](#5-login--step-by-step)
6. [Permissions and routing](#6-permissions-and-routing)
7. [Assigning a task](#7-assigning-a-task)
8. [Frequency reference — all eight types](#8-frequency-reference--all-eight-types)
9. [The Calendar occurrence engine](#9-the-calendar-occurrence-engine)
10. [Status lifecycle](#10-status-lifecycle)
11. [Completion flow](#11-completion-flow)
12. [Task visibility](#12-task-visibility)
13. [Page‑by‑page reference](#13-page-by-page-reference)
14. [Scoring](#14-scoring)
15. [Apps Script API reference](#15-apps-script-api-reference)
16. [Demo‑mode function map](#16-demo-mode-function-map)
17. [Deployment and environment](#17-deployment-and-environment)
18. [Known issues and caveats](#18-known-issues-and-caveats)
19. [Changes already applied](#19-changes-already-applied)

---

## 1. The golden rule

> **One row in a sheet = one task. Frequency only tells the *Calendar* how many
> chips to draw for that row. It never creates new rows and never re‑opens a
> completed task.**

Consequences:

- The **Checklist**, **Delegation**, **Reports**, **Live Score** and **History**
  pages all work off the raw sheet rows. A "Daily" task is **1 row**, not 30.
- Completing a task sets that one row's `Status = Done` permanently (until a
  human or a Sheet trigger resets it).
- The **Calendar** is the only screen where a recurring row is shown on many
  dates — and those extra chips are display only.

If you need a Daily task to genuinely reappear as fresh pending work every day,
add a Google Sheets **time‑driven trigger** that resets `Status`/`Task Start
Date`, or appends new rows each cycle. Nothing in this repo does that.

---

## 2. Two run modes

Chosen in [`src/config.js`](src/config.js):

```js
DEMO_MODE = (VITE_DEMO_MODE ?? 'true') === 'true'   // defaults to TRUE
```

| Mode | Data source | When |
|---|---|---|
| **Demo** (default) | Browser `localStorage`, key `crest_demo_store_v9`, seeded from [`src/data/demoStore.js`](src/data/demoStore.js) | `VITE_DEMO_MODE` unset or `true` |
| **Live** | Google Apps Script Web App → Google Sheets ([`setup/google-apps-script/Code.gs`](setup/google-apps-script/Code.gs)) | `VITE_DEMO_MODE=false` **and** `VITE_APPS_SCRIPT_URL` set, **and a rebuild/redeploy done** |

`VITE_*` variables are inlined **at build time**. Setting them on Vercel without
redeploying changes nothing.

The service layer ([`src/services/sheets.js`](src/services/sheets.js)) hides the
difference: `readSheet()` / `postAppsScript()` branch on `CONFIG.DEMO_MODE` and
either call the demo store or `fetch()` the Apps Script URL.

---

## 3. Google Sheet tabs — every column

Created by `setupSheets()` in [`Code.gs`](setup/google-apps-script/Code.gs).
Column matching in the backend is **name‑based and forgiving** (`normalize_()`
lowercases and strips non‑alphanumerics), so `Task Description`, `task
description` and `TaskDescription` are the same column. The **frontend login**
is the exception — see [§5](#5-login--step-by-step).

### `master` — logins

| Column | Meaning |
|---|---|
| `Department` | User's department (free text; also used as a task filter/dropdown) |
| `Name` | Display name (not used for matching) |
| `Username` | Login id. Compared **case‑insensitively**. |
| `Password` | **Plain text.** Compared after `trim()`. |
| `Role` | `user`, `admin`, `main admin`, or `inactive` (also `in active`, `inactiv`) |

- `Role = inactive` → the row is skipped, user cannot log in.
- `Role = main admin` **or** `Username = admin` → super‑admin (bypasses the
  whole permission matrix). `Role = admin` is treated like a normal user and
  still goes through `ACCESS CONTROL`.
- The `admin` / `admin123` row is auto‑created by `ensureDefaultAdmin_()` and
  cannot be renamed or deleted.

### `ACCESS CONTROL` — permissions

One row per (user, page). `saveAccess_` deletes and rewrites all rows for a user
on every save.

| Column | Meaning |
|---|---|
| `Username` | Matches `master.Username` (case‑insensitive) |
| `Page` | A page name **or** a special key (below) |
| `Access` | `None` \| `Viewer` \| `Editor` \| `Full Access` (for normal pages) |

**Page names** (must match exactly, case/space sensitive in the app):
`Dashboard`, `Checklist`, `Delegation`, `Calendar`, `Holidays`,
`Reports & Score`, `Assign Task`, `Settings`, `History`, `Help & Support`,
`Live Score`, `Admin Access`, `All TasksList`.
Legacy `Tasks List` is auto‑aliased to `Checklist`.

**Special keys** (different value sets):

| Page value | Access values | Effect |
|---|---|---|
| `Task Visibility` | `Own Tasks` (default) \| `All Tasks` | `All Tasks` lets the user see every doer's tasks |
| `Calendar Past` | `Allowed` (default) \| `Denied` | `Denied` locks the "Show Past Tasks" toggle |
| `Calendar Future` | `Allowed` (default) \| `Denied` | `Denied` locks the "Show Future Tasks" toggle |

Access‑level meaning (from the README changelog):

| Level | Can |
|---|---|
| `None` | Not see the page at all (redirected to Dashboard) |
| `Viewer` | Open the page **and** tick / submit task completions |
| `Editor` | The above **plus** assign tasks / bulk actions |
| `Full Access` | Complete control of that page |

Super‑admins get `Full Access` on every page implicitly.

### `Checklist` and `DELEGATION` — the task rows

Identical 17‑column layout (`TASK_HEADERS` in `Code.gs`):

| Column | Written at | Read as (`mapTask`) |
|---|---|---|
| `Task ID` | assign (`C-1042` / `D-1042`, auto‑increment from 1000) | `id` |
| `Task Description` | assign | `title` |
| `Department` | assign | `department` |
| `Given By` | assign (= the assigner's username) | `givenBy` |
| `Name` | assign (= the doer's username) | `assignee` |
| `Task Start Date` | assign (Sunday → Monday) | `plannedRaw` → `plannedISO` |
| `Task Start Time` | assign (`HH:MM`) | `plannedTime` |
| `Freq` | assign | `frequency` |
| `Status` | assign = `Pending`; completion = `Done` / `Delay` | `status` (raw) |
| `Require Attachment` | assign (`Yes`/`No`) | `requireAttachment` |
| `Enable Reminders` | assign (`Yes`/`No`) | `reminders` |
| `Remarks` | assign / completion | `remarks` |
| `Actual Date` | completion (`YYYY-MM-DD`) | `actualRaw` → `actualISO` |
| `Actual Time` | completion (`HH:MM`) | `actualTime` |
| `Completion Type` | completion (`ON_TIME` / `LATE` / `EARLY`) | `completionType` |
| `Responsibility Confirmed` | completion (`Yes`) | — |
| `Confirmed At` | completion (ISO timestamp) | — |

The two sheets are functionally the same; **Checklist = recurring work**,
**Delegation = one‑off work** (the Assign form forces Delegation to `One-Time`).

### `TASK HISTORY` — append‑only completion log (both types)

Written by `completeTask_` on every submit. Never updated or deleted.

`Task ID`, `Task Description`, `Task Type`, `Doer`, `Given By`, `Department`,
`Planned Date`, `Planned Time`, `Actual Date`, `Actual Time`, `Status`,
`Completion Type`, `Remarks`, `Submitted Date`.

### `DELEGATION DONE` — append‑only, delegations only

Extra columns for delegation‑specific fields:

`Timestamp`, `Task ID`, `Status`, `Completion Type`, `Next Target Date`,
`Remarks`, `Attachment`, `Submitted Date`, `Actual Date`, `Actual Time`,
`Responsibility Confirmed`, `Doer`, `Task`, `Given By`, `Department`.

> `Next Target Date` is **captured but never read back** — it does not
> reschedule anything.

### `HELP & SUPPORT` — form submissions

`Timestamp`, `Doer Name`, `Username`, `Department`, `Request Type`, `Priority`,
`Subject`, `Details`. Written by the Help & Support page; read by nobody in the
app (view it in the sheet).

### `HOLIDAYS` — festival / public holidays

| Column | Meaning |
|---|---|
| `Date` | `YYYY-MM-DD` (normalised on save) |
| `Occasion` | e.g. "Diwali"; defaults to "Holiday" |

Drives the Calendar's skip logic and the Holidays page. Also accepts alias
headers `Holiday Date`/`Day` and `Reason`/`Festival`/`Name`/`Notes`.

### `AllTasksList` — a standalone manual list

| Column | Meaning |
|---|---|
| `Name` | Doer |
| `Task Description` | Free text |
| `Freq` | One of the eight frequency words (label only — no scheduling) |
| `Remarks` | Free text |

**No `Task ID`.** Rows are addressed by **sheet row number**. The frontend sends
`expectName` / `expectTitle` so an edit is refused if the row moved. Nothing here
is linked to Checklist / Delegation, completion, the Calendar or scoring — it is
a shared notepad.

### `Working Day Calendar` — currently dormant

Column `Working Date`. `getWorkingDates()` can read it, but the Calendar page
passes an **empty** working‑dates array, so this tab has **no effect** in the
current build.

### `UNIQUE`

Column `Value`. Created by `setupSheets()`; not used by the app.

---

## 4. In‑memory structures

### The task object (`mapTask` in [`src/services/tasks.js`](src/services/tasks.js))

Every task page maps a raw sheet row to this shape:

| Field | Type | Source / meaning |
|---|---|---|
| `id` | string | `Task ID` (falls back to the sheet row number) |
| `title` | string | `Task Description` |
| `type` | `'Checklist'` \| `'Delegation'` | which sheet it came from |
| `department` | string | `Department` |
| `givenBy` | string | `Given By` |
| `assignee` | string | `Name` / `Doer` / `Doer Name` / `Assignee` / `Assigned To` / `Employee` / `Staff` / … |
| `plannedRaw` | string | the raw cell value of the start date |
| `planned` | string | `DD/MM/YYYY` display form |
| `plannedISO` | string | `YYYY-MM-DD`, **already shifted off Sunday** |
| `plannedTime` | string | `HH:MM` (blank allowed) |
| `frequency` | string | `Freq` cell verbatim |
| `status` | string | raw `Status` cell (`Pending` / `Done` / `Delay`) |
| `requireAttachment` | bool | `Require Attachment == "Yes"` |
| `reminders` | string | `Enable Reminders` cell |
| `remarks` | string | `Remarks` |
| `actualRaw` / `actualISO` | string | `Actual Date` raw / `YYYY-MM-DD` |
| `actualTime` | string | `Actual Time` |
| `actualDate` | string | `DD/MM/YYYY` |
| `actual` | string | `DD/MM/YYYY HH:MM` |
| `completionType` | string | `ON_TIME` / `LATE` / `EARLY` |
| `row` | number | sheet row number (for row‑addressed edits) |
| `raw` | object | the untouched `{header: value}` row |
| `liveStatus` | string | **computed** — `Pending` / `Overdue` / `Done` / `Delay` (see [§10](#10-status-lifecycle)) |

Helper added in this repo:
`isFuturePlanned(task)` → `true` when `plannedISO` is after today. Used to hide
not‑yet‑due tasks from the completion lists.

### The session object (`login` / `getSession` in [`src/services/auth.js`](src/services/auth.js))

| Field | Type | Meaning |
|---|---|---|
| `username` | string | normalised (lowercased) login id |
| `role` | string | `master.Role`, lowercased |
| `department` | string | `master.Department` (super‑admin gets `all` if none) |
| `isAdmin` | bool | super‑admin flag |
| `access` | object | `{ "Page name": "Level", ... }` including the three special keys |
| `taskVisibility` | string | `Own Tasks` \| `All Tasks` |
| `calendarPast` | bool | may reveal past occurrences |
| `calendarFuture` | bool | may reveal future occurrences |

**Stored in `sessionStorage`** (per browser tab — closing the tab logs out) as
individual keys: `username`, `role`, `department`, `isAdmin`, `access` (JSON),
`taskVisibility`, `calendarPast`, `calendarFuture`. `logout()` calls
`sessionStorage.clear()` and reloads. (`crest_session` is also written but never
read — dead.)

### `CONFIG` ([`src/config.js`](src/config.js))

```
DEMO_MODE, APPS_SCRIPT_URL, SPREADSHEET_ID, DRIVE_FOLDER_ID,
SHEETS: { MASTER:'master', CHECKLIST:'Checklist', DELEGATION:'DELEGATION',
          DELEGATION_DONE:'DELEGATION DONE', HISTORY:'TASK HISTORY',
          SUPPORT:'HELP & SUPPORT', UNIQUE:'UNIQUE',
          WORKING_DAYS:'Working Day Calendar', HOLIDAYS:'HOLIDAYS',
          ALL_TASKS:'AllTasksList' }
```

`ACCESS CONTROL` is **not** in `SHEETS` — it is hard‑coded in `fetchAccess()`.

### The demo store ([`src/data/demoStore.js`](src/data/demoStore.js))

`localStorage["crest_demo_store_v9"]` is a JSON object whose keys are the sheet
tab names, each holding an array of row objects — a faithful mirror of the live
sheet. Seeded on first load (`seed()`), and re‑seeded automatically when the key
version bumps. Seed logins: `admin/admin123`, `rahul/1234`, `amit/1234`.
Every demo write function (`insertDemoTask`, `completeDemoTask`, …) mutates this
object and saves it back.

---

## 5. Login — step by step

Code: [`src/services/auth.js`](src/services/auth.js), then
[`src/App.jsx`](src/App.jsx).

1. **`login(username, password)`** calls **`loadUsers()`**:
   - *Demo:* reads the seed `users` array.
   - *Live:* `readSheet('master')` then reads **by column position** —
     `row[0]=Department`, `row[2]=Username`, `row[3]=Password`, `row[4]=Role`.
     Rows with no username/password, or `Role` in the "inactive" set, are dropped.
     *(If someone inserts or reorders a column in `master`, every login breaks —
     see [§18](#18-known-issues-and-caveats).)*
2. Look up `users[normalize(username)]`; compare `user.password !==
   String(password).trim()` → `"Username or password is incorrect."`
3. **`isSuperAdmin(username, role)`** → `username === 'admin'` **or**
   `role === 'main admin'`.
4. **`fetchAccess(username)`** reads `ACCESS CONTROL`, normalises headers to
   `{Username, Page, Access}`, and keeps rows for this user.
5. **`buildAccess(rows, isAdmin)`**:
   - `access["<Page>"] = "<Access>"` for each row that has a page.
   - The `Task Visibility` row → `taskVisibility` (default `Own Tasks`).
   - **No rows and not admin** → a fallback set: `Dashboard/Calendar/
     Reports & Score/Settings = Viewer`, `Checklist/Delegation = Editor`,
     `Assign Task = Viewer`.
   - **Admin** → every page becomes `Full Access`.
   - `Tasks List` ⇄ `Checklist` aliasing.
6. `calendarPast` / `calendarFuture` derived from the `Calendar Past` /
   `Calendar Future` rows (admins always `true`).
7. **`persistSession()`** writes the session to `sessionStorage`.
8. On every app mount **`App.jsx` calls `refreshAccess()`** — re‑pulls
   `ACCESS CONTROL` and rewrites the session keys, so an admin's matrix edit
   reaches the user on their **next page reload** without re‑login.

### Worked example — user `ravi`

`master`: `Operations | Ravi Kumar | ravi | 1234 | user`

`ACCESS CONTROL`:

| Page | Access |
|---|---|
| Dashboard | Viewer |
| Checklist | Editor |
| Delegation | Viewer |
| Calendar | Viewer |
| Reports & Score | Viewer |
| Assign Task | None |
| Admin Access | None |
| Task Visibility | Own Tasks |
| Calendar Future | Denied |

After login `ravi`'s session is:

```json
{
  "username": "ravi", "role": "user", "department": "Operations",
  "isAdmin": false,
  "access": { "Dashboard":"Viewer","Checklist":"Editor","Delegation":"Viewer",
              "Calendar":"Viewer","Reports & Score":"Viewer",
              "Assign Task":"None","Admin Access":"None",
              "Task Visibility":"Own Tasks","Calendar Future":"Denied" },
  "taskVisibility": "Own Tasks",
  "calendarPast": true, "calendarFuture": false
}
```

---

## 6. Permissions and routing

Code: [`src/App.jsx`](src/App.jsx), [`src/components/Sidebar.jsx`](src/components/Sidebar.jsx).

- `pageAccess` maps a route id → an `ACCESS CONTROL` page name, e.g.
  `tasks → "Checklist"`, `all-tasklist → "All TasksList"`,
  `livescore → "Live Score"`.
- `canPage(id)` = `session.isAdmin || access[label] !== "None"`.
- `canAdmin` = super‑admin **or** `Admin Access ∈ {Editor, Full Access}`.
- The **sidebar** only renders items where `canPage` is true; the **Assign Task**
  and **Admin Access** entries have their own gates.
- Navigating to a page you lack rights for → you are bounced to **Dashboard**
  with an amber banner ("You don't have access to …").
- The **mobile bottom nav** shows Home always, Checklist/Calendar if permitted,
  and "More".

**For `ravi`:** sidebar shows Dashboard, Checklist, Delegation, Calendar,
Reports & Score, Live Score, History, Help & Support, Settings.
Hidden: Assign Task, Admin Access, All TasksList, Holidays (all `None`).
On Checklist he is `Editor` → can tick, submit, and use the in‑page "Assign Task"
button. On Delegation he is `Viewer` → can still tick and submit completions.
On Calendar the **Show Future Tasks** checkbox is disabled (`Calendar Future =
Denied`).

---

## 7. Assigning a task

Code: [`src/pages/AssignTask.jsx`](src/pages/AssignTask.jsx) →
`createTask()` → API `insert` → `insertTask_` in `Code.gs`.

Form fields: **Task Title**, **Task Type** (Checklist / Delegation),
**Assign To** (user dropdown), **Department** (auto‑filled from the doer),
**Planned Date**, **Set Time**, **Frequency**, **Enable reminders**,
**Require attachment**, **Remarks**.

Rules:

- **Type = Delegation** → Frequency is locked to `One-Time`.
- **Type = Checklist** → Frequency dropdown =
  `Daily, Fortnightly, Weekly, Monthly, Quarterly, Half-Yearly, Yearly`.
  Switching from Delegation to Checklist changes `One-Time` → `Daily`.
- **Planned Date on a Sunday** → `nextNonSunday()` moves it to Monday and the
  form says so ("Sunday is a holiday. Planned date moved to …").
- Requires Title + Assignee + Date.
- **Editor or Full Access on `Assign Task`** is needed to actually save
  (a Viewer sees the form read‑only).

`insertTask_` then:

1. Picks the sheet from `taskType` (`Checklist` or `DELEGATION`).
2. Generates `Task ID` via `nextId_`: scans existing IDs matching `^[CD]-(\d+)$`,
   takes the max (min base 1000), adds 1 → first Checklist task is `C-1001`.
3. Re‑applies the Sunday shift (`shiftSunday_`).
4. Appends **one row**, mapping values to whatever the sheet's headers are named,
   with `Status = Pending`.

---

## 8. Frequency reference — all eight types

### 8.1 How the `Freq` cell is interpreted

`freq()` in [`src/services/calendar.js`](src/services/calendar.js) lowercases the
cell and matches a **prefix**:

| Cell starts with… | Interpreted as | Calendar step |
|---|---|---|
| `d` (Daily, Day) | `daily` | +1 day |
| `fort` (Fortnightly, Fortnight) | `fortnightly` | +14 days |
| `w` (Weekly, Week) | `weekly` | +7 days |
| `q` (Quarterly, Quarter) | `quarterly` | +3 months |
| `half` / contains `halfyear` | `half-yearly` | +6 months |
| `m` (Monthly, Month) | `monthly` | +1 month |
| `y` (Yearly, Year) | `yearly` | +12 months |
| anything else (One‑Time, blank, "Bi‑weekly", …) | `one-time` | no repeat |

> Use the exact dropdown words. `Bi-weekly`, `Every 2 weeks`, `Annual` etc. fall
> through to **one‑time**.

### 8.2 What is identical for every frequency

- It is **one row** in `Checklist`.
- On the **Checklist → Current** tab it appears as a single task, `Pending`,
  once its `Task Start Date` has arrived (future‑dated rows are hidden until
  then, with a "*N future‑dated task(s) hidden*" note).
- It turns **Overdue** 24 h after its planned date + time if still open.
- It can be completed **once**: on/before the planned date → `Done` (`ON_TIME`);
  after → `Delay` (`LATE`). Before the planned date → **blocked** ("Not due
  until DD/MM/YYYY"), in the popup and on the backend.
- After completion the row is `Done`; it **stays on the Current tab (ticked,
  greyed, not selectable) until local midnight**, then the next page load moves
  it to the **History** tab. It counts as **1 completed task** in Reports / Live
  Score either way.
- On the **Calendar** the row is expanded into multiple chips by the step above,
  skipping Sundays and `HOLIDAYS` dates. **Those extra chips are display only and
  all read the single row's status** — so once the row is `Done`, next
  period's chip also shows "Done".
- **Nothing re‑opens the row** for the next period automatically.

### 8.3 Trace per type (assigned to `ravi`, today = Tue 8 Sep 2026)

#### One‑Time — "Submit signed lease scan", planned Fri 11 Sep 15:00
- Row `C-1101`, `Freq = One-Time`.
- Checklist Current: hidden until **11 Sep** (future), then `Pending`.
- Overdue after **12 Sep 15:00**.
- Calendar: a **single** chip on 11 Sep. No repeats.
- `ravi` completes on 11 Sep → `Done / ON_TIME`. Done for good.

#### Daily — "Daily production report", planned Tue 8 Sep 18:00
- Row `C-1102`, `Freq = Daily`.
- Checklist Current: **visible today** (planned = today). Dashboard "Today's
  Tasks": visible.
- Calendar (Sept): chips on 8, 9, 10, 11, 12, *(skip Sun 13)*, 14 … 30 — ~20
  chips, all from `C-1102`.
- `ravi` completes 8 Sep 17:45 → `Done / ON_TIME`. `C-1102.Status = Done`,
  `Actual = 2026-09-08 17:45`.
- **9 Sep:** nothing reopens; `C-1102` stays `Done`; the 9 Sep chip now shows
  "Done". A nightly Sheet trigger (not included) would reset it.

#### Fortnightly — "Payroll input reconciliation", planned Wed 9 Sep 16:00
- Row `C-1103`, `Freq = Fortnightly` → step **+14 days**.
- Checklist Current: hidden until **9 Sep**, then `Pending`.
- Overdue after **10 Sep 16:00**.
- Calendar chips: **9 Sep → 23 Sep → 7 Oct → 21 Oct → 4 Nov → …**
  (each +14 days; a Sunday/holiday hit is pushed to the next working day).
- `ravi` completes 9 Sep → `Done / ON_TIME`. The 23 Sep, 7 Oct … chips still
  render from `C-1103` and now show "Done". No new "next fortnight" row appears.
- If on 9 Sep `ravi` also tries to complete a fortnightly row dated 23 Sep →
  blocked: "Not due until 23/09/2026" (and it is not in the list anyway).

#### Weekly — "Weekly vendor reconciliation", planned Wed 9 Sep 16:00
- Row `C-1104`, `Freq = Weekly` → **+7 days**.
- Calendar chips: 9, 16, 23, 30 Sep, then 7 Oct … (Wednesdays; a Sunday hit
  shifts to Monday).
- Same completion behaviour as fortnightly.

#### Monthly — "Monthly compliance filing", planned Tue 15 Sep 12:00
- Row `C-1105`, `Freq = Monthly` → **+1 month** (`setMonth`).
- Calendar chips: 15 Sep → 15 Oct → 15 Nov (pushed to 16 Nov, a Sunday) → …
  *Note:* because the push feeds the next step, monthly+ occurrences can drift a
  day or two over time (see [§18](#18-known-issues-and-caveats)).
- Checklist Current: hidden until **15 Sep**; Overdue after **16 Sep 12:00**.
- Complete 15 Sep → `Done / ON_TIME`. October's chip then reads "Done". No
  October row is created.

#### Quarterly — "Quarterly board pack", planned Wed 30 Sep 10:00
- Row `C-1106`, `Freq = Quarterly` → **+3 months**.
- Calendar chips: 30 Sep 2026 → 30 Dec 2026 → 30 Mar 2027 → …
- Otherwise identical to monthly.

#### Half‑Yearly — "Half‑year fire‑safety drill", planned Wed 30 Sep 10:00
- Row `C-1107`, `Freq = Half-Yearly` → **+6 months**.
- Calendar chips: 30 Sep 2026 → 30 Mar 2027 → 30 Sep 2027 → …

#### Yearly — "Annual insurance renewal", planned Wed 30 Sep 10:00
- Row `C-1108`, `Freq = Yearly` → **+12 months**.
- Calendar chips: 30 Sep 2026 → 30 Sep 2027 → 30 Sep 2028.
- Checklist Current: hidden until **30 Sep**; Overdue after **1 Oct 10:00**.
- Complete → `Done`. Next year's chip is display only.

### 8.4 Delegation is always One‑Time

"Prepare Q3 board pack for Anita", planned Sat 12 Sep → shifted to **Mon 14 Sep**
at assign time. Row `D-1031` in `DELEGATION`, `Freq = One-Time`.
Delegation Current: hidden until 14 Sep. Calendar: one chip on 14 Sep.
Complete → `Status = Done` **+ a `TASK HISTORY` row + a `DELEGATION DONE` row** →
shows on Delegation → History.

---

## 9. The Calendar occurrence engine

`occurrences(tasks, from, to, workingDates, holidays)` in
[`src/services/calendar.js`](src/services/calendar.js).

For the visible month (`from` = 1st, `to` = last day), for each task:

1. `d = parseDate(task.plannedRaw)`; skip the task if unparseable.
2. `d = toWorkingDay(d, holidaySet)` — while `d` is a Sunday **or** a `HOLIDAYS`
   date, `d += 1 day` (guard 90).
3. Loop, stepping `d` by the frequency step, **while `d ≤ to` and `guard < 370`**:
   - If `d ≥ from` and `d` is not Sunday/holiday
     (and — if `Working Day Calendar` were populated — is a listed working day),
     push `{ ...task, date: d, occurrenceDate: "YYYY-MM-DD" }`.
   - `one-time` → `break` after the first pass.
   - Otherwise advance and `toWorkingDay()` again.
4. The Calendar page then filters those occurrences by the **Show Past / Show
   Future** toggles (today is always shown) and, for admins / Calendar
   editors, by the **Doer** dropdown.
5. Completed actuals are merged in from `TASK HISTORY` (`historyMap`) so a
   `Done`/`Delay` chip can show "Actual: DD/MM/YYYY HH:MM".

> **The 370 cap matters for Daily tasks only.** The loop walks from the task's
> original start date one step at a time. 370 daily steps ≈ 1 year, so a Daily
> row whose start date is more than ~1 year before the month you are viewing
> produces **no chips** that month. Weekly ≈ 7 years of headroom, Monthly ≈ 30
> years — not a practical problem for those.

---

## 10. Status lifecycle

`getTaskStatus(task, now)` in [`src/services/tasks.js`](src/services/tasks.js):

```
if raw Status == "done"  -> "Done"
if raw Status == "delay" -> "Delay"
due = <plannedISO, Sunday-shifted> at <plannedTime or 23:59>
diff = now - due
return diff > 24h ? "Overdue" : "Pending"
```

| State | When | Where stored |
|---|---|---|
| **Pending** | open, and ≤ 24 h past the planned date + time | computed (`liveStatus`); sheet `Status` = `Pending` |
| **Overdue** | open, and > 24 h past the planned date + time | **computed only** — the sheet still says `Pending` |
| **Done** | completed on/before the planned date | sheet `Status` = `Done` |
| **Delay** | completed after the planned date | sheet `Status` = `Delay` |

Example: planned 09 Sep 16:00 → Overdue only after **10 Sep 16:00**.

Most pages read `t.liveStatus || t.status`. Because **Overdue is never written to
the sheet**, any code that filters on the raw `status` field alone will always
see zero overdue — keep using `liveStatus`.

**Sunday shift happens twice, harmlessly:** at assign time (`shiftSunday_`) and
again in `mapTask` / `getTaskStatus` (`nextNonSunday`). It is idempotent.

---

## 11. Completion flow

Code: [`src/components/CompletionDrawer.jsx`](src/components/CompletionDrawer.jsx)
→ `completeTask()` → API `complete` → `completeTask_` in `Code.gs`.

1. On **Checklist / Delegation → Current**, tick one or more `Pending` rows
   (future‑dated rows are not shown). Click **Submit Selected (N)**.
2. The popup captures **one timestamp** on open (`stamp = { date, time }`) so the
   clock does not tick while you review.
3. `classify(task, today)` per task:

   | Condition | Result |
   |---|---|
   | no planned date | `Done`, eligible |
   | `today < planned` | **blocked**, reason "Not due until DD/MM/YYYY" |
   | `today == planned` | `Done`, eligible |
   | `today > planned` | `Delay`, eligible |

4. The table shows **Task Name · Planned Date · Actual Date & Time · Status ·
   Timing** (Today / Past / Future / No Date), plus banners:
   - *"N task(s) not scheduled for today"* — past/overdue items being closed now.
   - *"N task(s) cannot be submitted"* — the blocked (future) ones.
5. Tick **"I confirm … I am responsible"** (required) → **Submit**.
6. The drawer loops the eligible tasks, calling `completeTask()` for each with
   `completionType = status === 'Delay' ? 'LATE' : 'ON_TIME'`
   (`EARLY` is no longer reachable — early completion is blocked).
7. **`completeTask_`** on the backend:
   - rejects if `Responsibility Confirmed` ≠ `true`;
   - rejects if `Actual Date < Planned Date` (any frequency);
   - rejects if the row is already `Done`;
   - writes `Status`, `Actual Date`, `Actual Time`, `Completion Type`,
     `Responsibility Confirmed = Yes`, `Confirmed At`, `Remarks` on the row;
   - appends a **`TASK HISTORY`** row;
   - if Delegation, also appends a **`DELEGATION DONE`** row.
8. The drawer shows "Submitted Successfully" and the page reloads. The task
   **stays on the Current tab** with a `Done` badge (check icon, no checkbox,
   not selectable) **for the rest of the local day**; the **History** tab does
   *not* show it yet. At local midnight the comparison `actualISO === today`
   flips — the next page load drops it from Current and it appears on **History**.
   (The Dashboard's "Today's Tasks" list uses the same rule.)

Partial failure in a multi‑task submit is reported as
"*(K of N saved, M not saved)*".

### Current vs History — the exact rule

Both tabs are built in `load()` ([`src/pages/Tasks.jsx`](src/pages/Tasks.jsx),
[`src/pages/Delegation.jsx`](src/pages/Delegation.jsx)):

| Tab | Contains |
|---|---|
| **Current** | open rows that are **due** (`plannedISO ≤ today`, so future‑dated rows are hidden) **plus** rows finished **today** (`status ∈ {Done, Delay}` and `actualISO === today`) |
| **History** | every finished row **except** today's (`actualISO !== today`) |

So a completion is on exactly one tab at a time: **Current today, History from
tomorrow.** A late completion (`Delay`) is treated the same as `Done`
([`src/components/TaskRow.jsx`](src/components/TaskRow.jsx) shows the check icon
for both).

---

## 12. Task visibility

`visibleToUser(tasks, session)` in [`src/services/tasks.js`](src/services/tasks.js):

```
if no session OR session.isAdmin            -> return ALL tasks
visibility = taskVisibility || "Own Tasks"
if visibility in {all tasks, all, full}     -> return ALL tasks
otherwise -> keep tasks where normalize(assignee) === normalize(username)
```

Called by **Dashboard, Checklist, Delegation, Calendar, Reports, Live Score,
History**. So a normal doer sees a task only when the sheet's doer cell equals
their **login username** (case‑insensitive).

"Every doer sees every task" therefore means one of:

| Cause | Fix |
|---|---|
| Everyone shares the `admin` login | Give each doer their own `master` row, `Role = user` |
| A user's `Task Visibility` = `All Tasks` | Set it to `Own Tasks` / delete the row |
| A user's `Role` = `main admin` | Use `user` |
| The doer column is unrecognised → `assignee` blank | Name it `Name` (also `Doer`, `Employee`, … now match) |

The **doer filter dropdowns** on Checklist / Delegation are now
case‑insensitive and de‑duplicated (`Rahul` and `rahul` collapse to one entry).

---

## 13. Page‑by‑page reference

| Page (route) | Reads | Writes | Notes |
|---|---|---|---|
| **Login** (`—`) | `master` (via `loadUsers`), `ACCESS CONTROL` | `sessionStorage` | see [§5](#5-login--step-by-step) |
| **Dashboard** (`dashboard`) | `Checklist` + `DELEGATION` | — | stat cards (Total / Completed / Pending / Live Score %), "Today's Tasks" (`plannedISO == today` or no date, plus completed‑today), "Upcoming Work" (`plannedISO > today`, read‑only) |
| **Checklist** (`tasks`) | `Checklist`, `TASK HISTORY` | completions | Current / History tabs; search + Doer + Date + Status filters; Select‑All + Submit Selected; future rows hidden; **today's completions stay on Current, move to History next day**; summary strip |
| **Delegation** (`delegation`) | `DELEGATION`, `DELEGATION DONE` | completions | same UI and Current/History rule as Checklist; teal theme; History reads `DELEGATION DONE` |
| **Calendar** (`calendar`) | `Checklist` + `DELEGATION` + `TASK HISTORY` + `HOLIDAYS` | — | month grid of `occurrences()`; Show Past / Show Future toggles (permission‑gated); Doer filter for admins / Calendar editors; session cache `crest_calendar_cache_v1` |
| **Holidays** (`holidays`) | `HOLIDAYS` | `saveHoliday` / `deleteHoliday` | Upcoming / Past lists; Editor+ to add/remove; feeds Calendar skips |
| **Reports & Score** (`reports`) | `Checklist` + `DELEGATION` | — | overall / Checklist / Delegation % (`done ÷ total`), Completed / Pending / Overdue counts; filter by doer / type / date range |
| **Live Score** (`livescore`) | `Checklist` + `DELEGATION` + `TASK HISTORY` | — | per‑task scoresheet table; merges history actuals; Done / Delay / Overdue / Pending tallies; colour‑coded % |
| **All TasksList** (`all-tasklist`) | `AllTasksList` | `allAdd` / `allUpdate` / `allDelete` | standalone manual list (Name / Task Description / Freq / Remarks); doer side‑panel; not linked to anything |
| **History** (`history`) | `TASK HISTORY` + open Done/Delay rows | — | `fetchAllHistory()` merges & de‑dupes by `type|id|actualISO`; planned vs actual, final status; admins see all users |
| **Help & Support** (`help-support`) | — | `support` → `HELP & SUPPORT` | Google‑Forms‑style page; Doer / Department auto‑filled |
| **Settings** (`settings`) | `sessionStorage`, `localStorage` | `localStorage` (`crest_settings_v1`, `crest_calendar_view_v1`) | profile (read‑only), notification toggles, task options, Calendar Past/Future mirror (permission‑aware), session info |
| **Admin Access** (`admin-access`) | `master`, `ACCESS CONTROL` | `saveAccess`, `createUser`, `updateUser`, `deleteUser` | per‑user matrix (None/Viewer/Editor/Full Access) + Task Visibility + Calendar Past/Future; add / rename / delete users; `admin` locked to Full Access |
| **Assign Task** (`assign`) | `master` (for dropdowns) | `insert` → `Checklist` / `DELEGATION` | see [§7](#7-assigning-a-task) |

Unused in this build: `getScoreSnapshot()` ([`src/core/scoreSnapshot.js`](src/core/scoreSnapshot.js)),
`fetchAllTasks()`, `updateTask()` / `deleteTask()` — exported but no page imports
them (the "Master TasksList" console described in the README changelog is not in
this repo).

---

## 14. Scoring

- The score is computed **at the presentation layer**, not by a scoring engine.
- Formula everywhere: `pct = round(done / total * 1000) / 10` (one decimal).
- `done` = rows whose `liveStatus || status` is `done` (Live Score also counts
  `delay` separately).
- **`total` = number of matching sheet rows**, so a Daily row contributes 1, not
  30. Recurrence never inflates the denominator.
- **Dashboard** mini‑score = `done ÷ (visible checklist + delegation)`.
- **Reports** = the same, with Checklist / Delegation split and a doer / type /
  date‑range filter.
- **Live Score** = a per‑task table plus Done / Delay / Overdue / Pending
  tallies, merging `TASK HISTORY` actuals.
- Bands (Reports): ≥ 90 Excellent · 75–89.9 Good · 50–74.9 Needs focus ·
  < 50 Attention required.

---

## 15. Apps Script API reference

Base URL = `VITE_APPS_SCRIPT_URL` (…/exec). All responses are JSON
`{ success: true, ... }` or `{ success: false, error: "…" }`.
POST bodies are `application/x-www-form-urlencoded` (chosen deliberately so the
browser sends no CORS pre‑flight).

### GET

| `action` | Params | Returns |
|---|---|---|
| `health` (default) | — | `{ success, message, time }` |
| `fetch` | `sheet=<TabName>` | `{ success, headers:[…], values:[[…], …] }` |

`fetch` on `master` also runs `ensureDefaultAdmin_()`; on `HOLIDAYS` /
`AllTasksList` it auto‑creates the tab.

### POST

| `action` | Key params | Effect |
|---|---|---|
| `insert` | `taskType, taskTitle, department, givenBy, assignee, plannedDate, plannedTime, frequency, reminders, requireAttachment, remarks` | append a task row; returns `{ taskId }` |
| `complete` | `task` (JSON), `status, actualDate, actualTime, completionType, remarks, responsibilityConfirmed, nextTargetDate, attachmentUrl` | close a row + append `TASK HISTORY` (+ `DELEGATION DONE`) |
| `saveAccess` | `username, permissions` (JSON `{Page: Level}`) | rewrite that user's `ACCESS CONTROL` rows |
| `createUser` | `username, password, department, role` | append to `master` |
| `updateUser` | `username, newUsername, password, department, role` | edit `master`; if renamed, cascade to `ACCESS CONTROL` + `Name`/`Given By` in `Checklist`/`DELEGATION`; `admin` cannot be renamed |
| `deleteUser` | `username` | remove from `master` + all `ACCESS CONTROL` rows; `admin` protected |
| `updateTask` | `taskId, taskType, taskTitle, assignee, department, givenBy, plannedDate, plannedTime, frequency, status, remarks` | patch a task row *(no UI in this build)* |
| `deleteTask` | `taskId, taskType` | delete a task row *(no UI in this build)* |
| `saveHoliday` | `date, occasion` | upsert a `HOLIDAYS` row (keyed by date) |
| `deleteHoliday` | `date` | remove matching `HOLIDAYS` rows |
| `allAdd` | `name, taskDescription, freq, remarks` | append an `AllTasksList` row |
| `allUpdate` | `row, name, taskDescription, freq, remarks, expectName, expectTitle` | patch a row by number; refuses if `expect*` no longer match |
| `allDelete` | `row, expectName, expectTitle` | delete a row by number, same guard |
| `support` | `doerName, username, department, type, priority, subject, message` | append a `HELP & SUPPORT` row |

### Header‑matching helpers (`Code.gs`)

- `normalize_(s)` → lowercase, strip non‑alphanumerics.
- `findHeader_(headers, aliases)` → first column index whose normalised name is
  in `aliases`.
- `appendMapped_(sheet, headers, map)` → append a row, placing each `map` value
  under whichever header alias exists.
- `setByHeader_(sheet, headers, row, aliases, value)` → set one cell by alias.
- `getOrCreateSheet_(name, headers)` → create the tab with headers if missing.
- `setupSheets()` → one‑time bootstrap of all tabs + default admin
  (safe to re‑run; never overwrites existing rows).

---

## 16. Demo‑mode function map

[`src/services/sheets.js`](src/services/sheets.js) `postAppsScript()` routes each
`action` to a demo function in [`src/data/demoStore.js`](src/data/demoStore.js):

| API action | Demo function |
|---|---|
| `insert` | `insertDemoTask` |
| `complete` | `completeDemoTask` |
| `saveAccess` | `saveDemoAccess` |
| `createUser` / `updateUser` / `deleteUser` | `createDemoUser` / `updateDemoUser` / `deleteDemoUser` |
| `updateTask` / `deleteTask` | `updateDemoTask` / `deleteDemoTask` |
| `saveHoliday` / `deleteHoliday` | `saveDemoHoliday` / `deleteDemoHoliday` |
| `allAdd` / `allUpdate` / `allDelete` | `allListAddDemo` / `allListUpdateDemo` / `allListDeleteDemo` |
| `support` | `submitDemoSupport` |
| reads (`fetch`) | `getDemoSheet(name)` returns a deep clone of that tab's array |

Behaviour (guards, Sunday shift, "already done", "not due yet") is mirrored so
demo mode behaves like live mode. `RESET-DEMO.bat` / clearing
`crest_demo_store_v9` re‑seeds.

---

## 17. Deployment and environment

`.env` (copy from `.env.example`):

```env
VITE_DEMO_MODE=false
VITE_APPS_SCRIPT_URL=https://script.google.com/macros/s/XXXXXXXX/exec
VITE_SPREADSHEET_ID=…      # optional, not required by the frontend
VITE_DRIVE_FOLDER_ID=…     # optional
```

Local:

```bash
npm install
npm run dev      # http://localhost:5173
npm run build && npm run preview
```

Google side:

1. Open the spreadsheet → **Extensions → Apps Script**, paste
   [`setup/google-apps-script/Code.gs`](setup/google-apps-script/Code.gs).
2. Run `setupSheets()` once.
3. **Deploy → New deployment → Web app**, *Execute as: Me*,
   *Who has access: Anyone*. Copy the `/exec` URL into `VITE_APPS_SCRIPT_URL`.
4. After any `Code.gs` change: **Deploy → Manage deployments → Edit → New
   version**.

Vercel:

1. Project → **Settings → Environment Variables** → add `VITE_DEMO_MODE=false`
   and `VITE_APPS_SCRIPT_URL=…`.
2. **Redeploy** (the values are compiled in at build time — an existing
   deployment will not pick them up).
3. Verify: open the site, DevTools → Network → reload → you should see requests
   to `script.google.com`. If `admin` / `admin123` still logs in, you are still
   in demo mode.

---

## 18. Known issues and caveats

| # | Issue | Where |
|---|---|---|
| 1 | **Old Daily tasks vanish from the Calendar** — the occurrence loop is capped at 370 steps from the task's start date (~1 year for Daily). | [`src/services/calendar.js`](src/services/calendar.js) `occurrences()` |
| 2 | **No auto‑recurrence** — every frequency is one completable row; it never re‑opens for the next period. | by design |
| 3 | **A completed recurring row shows all its future Calendar chips as "Done"** — they read the one row's status. | Calendar rendering |
| 4 | **Monthly+ occurrences can drift** a day or two, because a Sunday/holiday push feeds the next `+N months` step. | `occurrences()` |
| 5 | **`master` is read by column position on the frontend** — insert/reorder a column and every login fails. (Backend uses header names.) | [`src/services/auth.js`](src/services/auth.js) `loadUsers()` |
| 6 | **Client‑side auth** — `fetch` of the `master` tab returns every username + plain‑text password to anyone with the Web App URL. | architecture / README |
| 7 | **`doPost` has no authorization** — any anonymous caller can `deleteUser`, `saveAccess`, `deleteTask`, … | [`Code.gs`](setup/google-apps-script/Code.gs) |
| 8 | **Date parsing is locale‑fragile** — `dd/mm/yyyy` is assumed; a US‑locale sheet (`M/D/YYYY`) mis‑reads days ≤ 12. | [`src/services/sheets.js`](src/services/sheets.js) `parseDate()` |
| 9 | **`Working Day Calendar` tab is dormant** — read function exists but the Calendar passes an empty list. | [`src/pages/Calendar.jsx`](src/pages/Calendar.jsx) |
| 10 | **StrictMode double‑fetch in dev** — every page's load runs twice locally (not in production). | [`src/main.jsx`](src/main.jsx) |

---

## 19. Changes already applied

From the fix pass in this session:

| File | Change |
|---|---|
| [`src/services/tasks.js`](src/services/tasks.js) | Added `isFuturePlanned()`. Widened doer‑column detection in `mapTask` / `mapHistoryRow` (`Doer`, `Doer Name`, `Assignee`, `Assigned To`, `Employee`, `Employee Name`, `Staff`, `Staff Name`, `Emp Name`, `Person`, `Username`, `Name`). |
| [`src/pages/Tasks.jsx`](src/pages/Tasks.jsx) | Checklist "Current" hides future‑dated rows; **keeps today's completions on Current (ticked) and moves them to History only from the next day**; doer filter case‑insensitive; doer dropdown de‑duplicated. |
| [`src/pages/Delegation.jsx`](src/pages/Delegation.jsx) | Same changes for Delegation. |
| [`src/components/TaskRow.jsx`](src/components/TaskRow.jsx) | A `Delay` (late) completion now renders as done (check icon, not a checkbox) like `Done`. |
| [`src/components/CompletionDrawer.jsx`](src/components/CompletionDrawer.jsx) | Early completion blocked for **all** frequencies ("Not due until DD/MM/YYYY"), not just Daily. |
| [`setup/google-apps-script/Code.gs`](setup/google-apps-script/Code.gs) | `completeTask_` rejects completion before the planned date for all frequencies. |
| [`src/data/demoStore.js`](src/data/demoStore.js) | Same guard in demo mode. |

Still your responsibility (config, not code): set the Vercel env vars and
redeploy; make sure doers have individual logins and `Task Visibility = Own
Tasks`; redeploy `Code.gs`.
