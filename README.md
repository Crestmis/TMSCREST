# CREST — Final Functional UI

This build keeps the existing pages and logic structure, removes Training, License and Data Hub, and adds a real task-selection/submission workflow.

## Pages
- Login
- Dashboard
- My Tasks
- Delegation
- Calendar
- Reports & Score
- Assign Task
- Assign Task
- Settings

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
- Admin: `rahul` / `1234`
- User: `amit` / `1234`

Demo data is stored in browser localStorage. Use `RESET-DEMO.bat` if you want to reset it.

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

## Connect Google Sheets
Copy `.env.example` to `.env` and set:

```env
VITE_DEMO_MODE=false
VITE_APPS_SCRIPT_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
VITE_SPREADSHEET_ID=YOUR_SPREADSHEET_ID
VITE_DRIVE_FOLDER_ID=YOUR_DRIVE_FOLDER_ID
```

Then deploy `setup/google-apps-script/Code.gs` as an Apps Script Web App.

Required sheets in the spreadsheet:
- `master`
- `Checklist`
- `DELEGATION`
- `DELEGATION DONE`
- `UNIQUE`
- `Working Day Calendar`

Backend endpoints supported by the included script:
- `GET ?action=health`
- `GET ?action=fetch&sheet=Checklist`
- `POST action=insert`
- `POST action=complete`

After changing `.env`, restart Vite.

## Production deployment
1. Confirm demo mode works.
2. Confirm Google Sheets mode works locally.
3. Push the project to GitHub.
4. Import it into Vercel.
5. Build command: `npm run build`.
6. Output directory: `dist`.
7. Add the same `VITE_*` environment variables in Vercel.
8. Redeploy.

## Important production note
The included starter authentication reads the `master` sheet in the current architecture. Before exposing a real organization-wide deployment, move credential validation and authorization fully server-side and do not expose the user/password dataset to the browser.

## Completion confirmation behavior
- Selecting task checkboxes only selects tasks; it never asks for responsibility confirmation.
- Clicking **Submit Selected** opens a centered popup modal, not a right-side drawer.
- The popup shows Task Name, Planned Date, Actual Date and Status.
- The responsibility checkbox is required only inside that popup. Until it is checked, Submit stays disabled; no "responsibility confirmation is required" error is shown merely for selecting tasks.
- Multiple selected tasks use one confirmation popup.
- The UI is responsive for desktop, tablet and mobile.
