/**
 * CREST — Recurring task roll-over.
 * ---------------------------------------------------------------------------
 * Code.gs treats every Checklist / DELEGATION row as ONE task. Frequency
 * (Daily, Weekly, Monthly, ...) only drives how the *Calendar* draws a row —
 * nothing re-opens a completed recurring task for its next cycle, and a row
 * dated in the past just sits there.
 *
 * This file adds the missing piece. A nightly time-driven trigger advances
 * every recurring row to its CURRENT cycle:
 *
 *   - bumps `Task Start Date` to the latest scheduled occurrence on/before
 *     today (Sundays + HOLIDAYS skipped — same rule as the Calendar);
 *   - resets `Status` -> `Pending` and clears the Actual* / Confirmed* cells,
 *     so the doer sees a fresh task for the new cycle;
 *   - for every cycle that rolled past WITHOUT being completed, appends a
 *     "Missed" row to `TASK HISTORY` (visible on the History page), so misses
 *     are recorded and can be monitored.
 *
 * Completed cycles are already in `TASK HISTORY` (written by completeTask_ in
 * Code.gs), so no history is lost.
 *
 * REQUIRES: Code.gs in the SAME Apps Script project — this file reuses its
 * helpers (getHeaders_, findHeader_, setByHeader_, appendMapped_,
 * getOrCreateSheet_).
 *
 * ---------------------------------------------------------------------------
 * ONE-TIME SETUP
 *   1. In the Apps Script editor: + (Files) -> Script -> name it `Recurring`.
 *      Paste this whole file in. Save.
 *   2. Project Settings (gear icon) -> confirm the Time zone is your office
 *      (e.g. "(GMT+05:30) India Standard Time").
 *   3. Run once:  installRecurringTrigger   (authorize when Google asks).
 *   4. Optional first catch-up:  run  runRecurringNow  manually and check the
 *      execution log / the toast.
 *
 * DAY TO DAY: nothing. The trigger runs every night (~01:00 script time).
 *
 * TUNING: the four constants directly below.
 * ---------------------------------------------------------------------------
 */

/* Which sheets to roll. DELEGATION is "One-Time" by design in the Assign form,
 * so leave it out unless you deliberately keep recurring delegations. */
var RECUR_SHEETS = ['Checklist'];

/* Append a "Missed" row to TASK HISTORY for each cycle that rolled over
 * uncompleted. Set to false to silently advance rows (useful for the very
 * first catch-up run if you don't want old misses recorded). */
var RECUR_LOG_MISSED = true;

/* Max "Missed" rows to write per task in one run — stops the first run from
 * dumping months of history. The row still advances straight to today. */
var RECUR_MAX_CATCHUP = 40;

/* Hour (0-23, script time zone) the nightly trigger fires. */
var RECUR_RUN_HOUR = 1;

/* ===== public entry points — pick these in the editor's Run menu ========== */

/** Roll every recurring task to its current cycle. Safe to run any time and
 *  repeatedly (a row already on the current cycle is skipped). */
function runRecurringNow() {
  _recurAssertDeps_();
  var s = _rollRecurringTasks_();
  Logger.log('CREST recurring roll: ' + JSON.stringify(s));
  try {
    SpreadsheetApp.getActiveSpreadsheet().toast(
      'Scanned ' + s.scanned + ' · advanced ' + s.advanced + ' · missed logged ' + s.missedLogged,
      'CREST recurring', 6);
  } catch (e) {}
  return s;
}

/** Install / re-install the nightly trigger. Run this once. */
function installRecurringTrigger() {
  uninstallRecurringTrigger();
  ScriptApp.newTrigger('runRecurringNow').timeBased().everyDays(1).atHour(RECUR_RUN_HOUR).create();
  var msg = 'Nightly recurring trigger installed — runs ~' + RECUR_RUN_HOUR + ':00 '
    + Session.getScriptTimeZone() + '.';
  Logger.log(msg);
  return msg;
}

/** Remove the nightly trigger. */
function uninstallRecurringTrigger() {
  var n = 0;
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'runRecurringNow') { ScriptApp.deleteTrigger(t); n++; }
  });
  Logger.log('Removed ' + n + ' recurring trigger(s).');
  return n;
}

/* ===== core ============================================================== */

function _rollRecurringTasks_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var tz = Session.getScriptTimeZone();
  var today = _recurDay_(new Date());
  var holidays = _recurHolidaySet_(tz);
  var hist = getOrCreateSheet_('TASK HISTORY',
    ['Task ID', 'Task Description', 'Task Type', 'Doer', 'Given By', 'Department', 'Planned Date',
     'Planned Time', 'Actual Date', 'Actual Time', 'Status', 'Completion Type', 'Remarks', 'Submitted Date']);
  var histHeaders = getHeaders_(hist);
  var out = { scanned: 0, advanced: 0, missedLogged: 0 };

  RECUR_SHEETS.forEach(function (name) {
    var sheet = ss.getSheetByName(name);
    if (!sheet) return;
    var h = getHeaders_(sheet);
    var cDate = findHeader_(h, ['task start date', 'planned date', 'start date', 'date']);
    var cTime = findHeader_(h, ['task start time', 'planned time', 'set time', 'time']);
    var cFreq = findHeader_(h, ['freq', 'frequency']);
    var cStat = findHeader_(h, ['status', 'task status']);
    var cId   = findHeader_(h, ['task id', 'taskid']);
    if (cDate < 0 || cFreq < 0 || cStat < 0) return;

    var vals = sheet.getDataRange().getValues();
    var type = (name.toLowerCase() === 'checklist') ? 'Checklist' : 'Delegation';

    for (var r = 1; r < vals.length; r++) {
      var freq = _recurFreq_(vals[r][cFreq]);
      if (freq === 'one-time') continue;
      var start = _recurParse_(vals[r][cDate]);
      if (!start) continue;
      out.scanned++;

      // occurrence dates from `start` up to the last one on/before today
      var occs = [];
      var o = _recurWorkingDay_(new Date(start.getTime()), holidays, tz);
      var guard = 0;
      while (o.getTime() <= today.getTime() && guard++ < 12000) {
        occs.push(_recurKey_(o, tz));
        var next = _recurStep_(o, freq);
        if (!next) break;
        o = _recurWorkingDay_(next, holidays, tz);
      }
      if (occs.length < 2) continue;                 // still on the first / only cycle
      var curKey = occs[0];
      var dueKey = occs[occs.length - 1];
      if (dueKey === curKey) continue;

      var rowIndex = r + 1;
      var status = String(vals[r][cStat] || '').trim().toLowerCase();
      var completed = (status === 'done' || status === 'delay');

      if (RECUR_LOG_MISSED) {
        var idVal = cId >= 0 ? vals[r][cId] : '';
        var logged = 0;
        for (var k = 0; k < occs.length - 1 && logged < RECUR_MAX_CATCHUP; k++) {
          if (k === 0 && completed) continue;        // current cycle was done — already in history
          appendMapped_(hist, histHeaders, {
            'task id':         idVal ? (idVal + ' (missed)') : '',
            'task description': _recurVal_(h, vals[r], ['task description', 'task', 'description']),
            'task type':       type,
            'doer':            _recurVal_(h, vals[r], ['name', 'doer', 'assigned to']),
            'given by':        _recurVal_(h, vals[r], ['given by']),
            'department':      _recurVal_(h, vals[r], ['department', 'firm']),
            'planned date':    occs[k],
            'planned time':    cTime >= 0 ? vals[r][cTime] : '',
            'actual date':     '',
            'actual time':     '',
            'status':          'Missed',
            'completion type': 'MISSED',
            'remarks':         'Auto: cycle rolled over without completion',
            'submitted date':  new Date()
          });
          logged++;
          out.missedLogged++;
        }
      }

      // advance the row to the current cycle, fresh
      setByHeader_(sheet, h, rowIndex, ['task start date', 'planned date', 'start date', 'date'], dueKey);
      setByHeader_(sheet, h, rowIndex, ['status', 'task status'], 'Pending');
      ['actual date', 'actual', 'actual time', 'completion type', 'responsibility confirmed', 'confirmed at']
        .forEach(function (a) { setByHeader_(sheet, h, rowIndex, [a], ''); });
      out.advanced++;
    }
  });

  return out;
}

/* ===== helpers ========================================================== */

function _recurAssertDeps_() {
  if (typeof getHeaders_ !== 'function' || typeof findHeader_ !== 'function' ||
      typeof setByHeader_ !== 'function' || typeof appendMapped_ !== 'function' ||
      typeof getOrCreateSheet_ !== 'function') {
    throw new Error('Recurring.gs needs Code.gs in the same Apps Script project (it reuses its helpers).');
  }
}

function _recurFreq_(raw) {
  var s = String(raw || '').trim().toLowerCase();
  if (s.indexOf('d') === 0) return 'daily';
  if (s.indexOf('fort') === 0) return 'fortnightly';
  if (s.indexOf('w') === 0) return 'weekly';
  if (s.indexOf('q') === 0) return 'quarterly';
  if (s.indexOf('half') === 0 || s.indexOf('halfyear') !== -1) return 'half-yearly';
  if (s.indexOf('m') === 0) return 'monthly';
  if (s.indexOf('y') === 0) return 'yearly';
  return 'one-time';
}

function _recurStep_(d, freq) {
  var x = new Date(d.getTime());
  if (freq === 'daily') x.setDate(x.getDate() + 1);
  else if (freq === 'fortnightly') x.setDate(x.getDate() + 14);
  else if (freq === 'weekly') x.setDate(x.getDate() + 7);
  else if (freq === 'monthly') x.setMonth(x.getMonth() + 1);
  else if (freq === 'quarterly') x.setMonth(x.getMonth() + 3);
  else if (freq === 'half-yearly') x.setMonth(x.getMonth() + 6);
  else if (freq === 'yearly') x.setFullYear(x.getFullYear() + 1);
  else return null;
  return x;
}

function _recurWorkingDay_(d, holidays, tz) {
  var g = 0;
  while (g++ < 90) {
    if (d.getDay() === 0) { d.setDate(d.getDate() + 1); continue; }     // Sunday
    if (holidays[_recurKey_(d, tz)]) { d.setDate(d.getDate() + 1); continue; }
    break;
  }
  return d;
}

function _recurKey_(d, tz) {
  return Utilities.formatDate(d, tz || Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function _recurDay_(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function _recurParse_(v) {
  if (v instanceof Date && !isNaN(v.getTime())) return _recurDay_(v);
  var s = String(v == null ? '' : v).trim();
  if (!s) return null;
  var dmy = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);       // dd/mm/yyyy
  if (dmy) return new Date(+dmy[3], +dmy[2] - 1, +dmy[1]);
  var ymd = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);                    // yyyy-mm-dd
  if (ymd) return new Date(+ymd[1], +ymd[2] - 1, +ymd[3]);
  var d = new Date(s);
  return isNaN(d.getTime()) ? null : _recurDay_(d);
}

function _recurHolidaySet_(tz) {
  var set = {};
  var s = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('HOLIDAYS');
  if (!s) return set;
  var vals = s.getDataRange().getValues();
  for (var r = 1; r < vals.length; r++) {
    var d = _recurParse_(vals[r][0]);
    if (d) set[_recurKey_(d, tz)] = true;
  }
  return set;
}

function _recurVal_(headers, rowVals, aliases) {
  var i = findHeader_(headers, aliases);
  return i >= 0 ? rowVals[i] : '';
}
