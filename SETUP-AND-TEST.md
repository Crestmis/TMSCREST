# CREST — Updated Setup & Test Guide

## What changed
- Professional white + orange UI.
- `My Tasks` renamed to `Tasks List`.
- Doer and planned-date filters added.
- Status filter now uses Pending / Overdue / Done only; Planned filter removed.
- Frequencies: One-Time, Daily, Fortnightly, Weekly, Monthly, Quarterly, Half-Yearly, Yearly.
- Planned Time is captured with every newly assigned task.
- Sunday is treated as a holiday. A Sunday planned date is automatically moved to Monday.
- Calendar skips Sundays and supports all configured frequencies.
- Calendar displays Checklist + Delegation task names in animated card-stack style.
- Pending = task is not done and the planned due time has not passed by more than 24 hours.
- Overdue = task is not done and planned due time is more than 24 hours in the past.
- Done = completed.
- Existing early-completion confirmation workflow remains intact.
- Responsive layouts were improved for desktop, tablet and mobile.

## Local Windows CMD setup

Open **CMD**, not PowerShell:

```cmd
cd /d "C:\path\to\CREST-Production-Ready-main"
npm install
npm run dev
```

Open the local URL shown by Vite, normally `http://localhost:5173`.

## Production test

```cmd
npm run build
npm run preview
```

Then open the preview URL shown by Vite.

## Google Apps Script

1. Open `setup/google-apps-script/Code.gs`.
2. Copy it into the Apps Script project connected to your spreadsheet.
3. Deploy as a Web App.
4. Set the frontend environment variables:

```text
VITE_DEMO_MODE=false
VITE_APPS_SCRIPT_URL=YOUR_APPS_SCRIPT_WEB_APP_URL
```

For demo/local testing you can omit `.env` because demo mode defaults to true.

## Test cases

1. Assign a task for a Sunday. Confirm it moves to Monday.
2. Assign each frequency and verify it appears correctly.
3. Assign a task with a time and verify the time is visible.
4. Leave an unfinished task less than 24 hours past its planned time: it is Pending.
5. Leave an unfinished task more than 24 hours past its planned time: it is Overdue.
6. Filter by Doer.
7. Filter by Date.
8. Filter by Checklist / Delegation.
9. Select multiple tasks and submit.
10. Confirm the centered responsibility popup appears.
11. Confirm the popup table contains Task Name, Planned Date, Actual Date and Status.
12. Test the popup on mobile/tablet widths.
13. Open Calendar and confirm Sundays are holidays and task cards show Checklist/Delegation names.
14. Verify recurring frequencies across the calendar.

## Important recurring-task note

The Calendar occurrence engine now supports all requested frequencies and skips Sundays. The master-sheet completion/scoring architecture remains unchanged so existing score logic is not silently replaced. If recurring occurrences must become independent scoreable records every cycle, add a dedicated occurrence/completion-log layer before changing the scoring master.
