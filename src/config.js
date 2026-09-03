export const CONFIG = {
  // Demo mode is ON by default so the project runs immediately after npm install.
  // Set VITE_DEMO_MODE=false in .env when connecting to your real Google Sheets setup.
  DEMO_MODE: String(import.meta.env.VITE_DEMO_MODE ?? 'true').toLowerCase() === 'true',
  APPS_SCRIPT_URL: import.meta.env.VITE_APPS_SCRIPT_URL || '',
  SPREADSHEET_ID: import.meta.env.VITE_SPREADSHEET_ID || '',
  DRIVE_FOLDER_ID: import.meta.env.VITE_DRIVE_FOLDER_ID || '',
  SHEETS: {
    MASTER: 'master',
    CHECKLIST: 'Checklist',
    DELEGATION: 'DELEGATION',
    DELEGATION_DONE: 'DELEGATION DONE',
    HISTORY: 'TASK HISTORY',
    SUPPORT: 'HELP & SUPPORT',
    UNIQUE: 'UNIQUE',
    WORKING_DAYS: 'Working Day Calendar',
    HOLIDAYS: 'HOLIDAYS',
    MASTER_TASKS: 'MasterTasksList',
  },
}
