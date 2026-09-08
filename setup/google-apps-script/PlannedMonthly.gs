/**
 * CREST — Monthly task generator from plan sheets.
 * ===========================================================================
 * Two new "plan" sheets hold the RECURRING RULES:
 *
 *   Task_Planned_CL  -> generates rows into  Checklist
 *   Task_Planned_DL  -> generates rows into  DELEGATION
 *
 * On the 1st of every month at ~00:00 (script time zone) a trigger builds the
 * WHOLE month's task instances for every active plan and appends them to the
 * matching working sheet as Status = Pending.
 *
 * A second trigger runs every day (~01:00): it moves completions dated BEFORE
 * today out of Checklist / DELEGATION into TASK HISTORY (so those sheets hold
 * only open work — completions stay visible on the app's Current tab for their
 * own day, then leave), drops past-due generated Pending rows as "Missed" after
 * a 2-day grace, and switches a One-Time plan to Active=No once its instance is
 * done. `runDailyMaintenanceNow` runs it on demand.
 *
 * Design decisions (so nothing else has to change):
 *
 *  - Generated rows are written with  Freq = "One-Time".  The Calendar's
 *    occurrence engine only expands recurring frequencies, so a One-Time row
 *    shows as exactly ONE chip on its own date. => the Calendar code and logic
 *    are untouched; it simply renders the concrete instances.
 *  - The generator is PURELY ADDITIVE. It never edits, resets, deletes or
 *    reorders any existing row. Pending tasks are left exactly as they are.
 *  - It is idempotent: an instance already present (matched by Task ID
 *    "<PlanID>#<yyyy-mm-dd>") is skipped, so re-running or a manual run never
 *    duplicates.
 *  - Completion is unchanged: completeTask_ in Code.gs still sets the row to
 *    Done and appends to TASK HISTORY / DELEGATION DONE.
 *
 * REQUIRES Code.gs in the same Apps Script project (helpers: getHeaders_,
 * findHeader_, appendMapped_, getOrCreateSheet_).
 *
 * ---------------------------------------------------------------------------
 * ONE-TIME SETUP
 *   1. Apps Script editor -> + (Files) -> Script -> name it `PlannedMonthly`.
 *      Paste this whole file. Save.
 *   2. Run once:  setupPlannedSheets     (creates Task_Planned_CL / _DL with
 *      the header row).
 *   3. Fill the plan sheets — one row per recurring task (see schema below).
 *   4. Migrate your existing recurring rows out of Checklist / DELEGATION:
 *      for each, add a matching plan row, then set that working-sheet row's
 *      Freq to "One-Time" (leave everything else on it alone) so the Calendar
 *      stops double-drawing it. Genuinely one-time tasks stay put.
 *   5. Run once:  installMonthlyGenerator   (authorize when asked).
 *   6. Seed now:  run  runMonthlyGeneratorNow  (this month) and, if you like,
 *      generateNextMonthNow  (next month, ready early).
 *
 * PLAN SHEET SCHEMA  (Task_Planned_CL / Task_Planned_DL) — row 1 headers:
 *   Plan ID | Task Description | Department | Given By | Name | Start Date |
 *   Time | Freq | End Date | Require Attachment | Enable Reminders | Remarks |
 *   Active
 *
 *   Plan ID  - optional; auto-filled as PCL-<row> / PDL-<row> if blank
 *   Name     - the doer's LOGIN username (must match the master sheet)
 *   Start Date - anchor date the recurrence counts from (yyyy-mm-dd or dd/mm/yyyy)
 *   Time     - HH:MM (24h)
 *   Freq     - One-Time | Daily | Fortnightly | Weekly | Monthly | Quarterly |
 *              Half-Yearly | Yearly
 *   End Date - optional; stop generating after this date
 *   Active   - Yes (default) | No   (No = skip this plan)
 * ---------------------------------------------------------------------------
 * TUNING: the constants directly below.
 */

var PLANNED_MAP = {                 // plan sheet -> working sheet
  'Task_Planned_CL': 'Checklist',
  'Task_Planned_DL': 'DELEGATION'
};

var PLANNED_HEADERS = ['Plan ID', 'Task Description', 'Department', 'Given By', 'Name',
  'Start Date', 'Time', 'Freq', 'End Date', 'Require Attachment', 'Enable Reminders',
  'Remarks', 'Active'];

var PLANNED_INSTANCE_FREQ = 'One-Time';   // written to generated rows — keeps the Calendar from re-expanding them
var PLANNED_SKIP_SUNDAY   = true;         // move a Sunday occurrence to the next working day
var PLANNED_SKIP_HOLIDAYS = true;         // same for dates listed in the HOLIDAYS sheet
var PLANNED_INCLUDE_PAST_DAYS = false;    // when run mid-month, don't create rows for dates already gone
var PLANNED_RUN_HOUR = 0;                 // hour on the 1st the monthly generator fires (0 = ~midnight)

// --- daily maintenance (archive / sweep) ---
var PLANNED_MAINT_HOUR = 1;               // hour the daily maintenance trigger fires
var PLANNED_SWEEP_MISSED = true;          // also remove past-due Pending *generated* rows (logged as "Missed")
var PLANNED_MISSED_GRACE_DAYS = 2;        // ...only once they are this many days overdue
var PLANNED_DEACTIVATE_DONE_ONE_TIME = true; // set a One-Time plan to Active=No once its instance is completed

/* ===== public entry points — pick these in the editor Run menu =========== */

/** Build this calendar month for every active plan. Safe + idempotent. */
function runMonthlyGeneratorNow() {
  var s = _pmGenerateForMonth_(new Date());
  Logger.log('CREST planned generate: ' + JSON.stringify(s));
  try {
    SpreadsheetApp.getActiveSpreadsheet().toast(
      s.month + ' — created ' + s.created + ', skipped ' + s.skipped + ', plans ' + s.plans,
      'CREST planner', 6);
  } catch (e) {}
  return s;
}

/** Build NEXT calendar month now (run it late in a month to prepare ahead). */
function generateNextMonthNow() {
  var d = new Date();
  var s = _pmGenerateForMonth_(new Date(d.getFullYear(), d.getMonth() + 1, 1));
  Logger.log('CREST planned generate (next month): ' + JSON.stringify(s));
  try {
    SpreadsheetApp.getActiveSpreadsheet().toast(s.month + ' — created ' + s.created, 'CREST planner', 6);
  } catch (e) {}
  return s;
}

/** Create the two plan sheets with their header row. */
function setupPlannedSheets() {
  _pmAssertDeps_();
  Object.keys(PLANNED_MAP).forEach(function (name) { getOrCreateSheet_(name, PLANNED_HEADERS); });
  return 'Ready: ' + Object.keys(PLANNED_MAP).join(', ');
}

/** Daily maintenance: archive completed instances (dated before today) out of
 *  Checklist / DELEGATION into TASK HISTORY; drop past-due generated Pending
 *  rows as "Missed". Safe + idempotent. */
function runDailyMaintenanceNow() {
  var s = _pmArchiveCompleted_();
  Logger.log('CREST daily maintenance: ' + JSON.stringify(s));
  try {
    SpreadsheetApp.getActiveSpreadsheet().toast(
      'Archived ' + s.archived + ', missed ' + s.missedLogged + ', plans off ' + s.plansDeactivated,
      'CREST maintenance', 6);
  } catch (e) {}
  return s;
}

/** Install / re-install both triggers: monthly generator (1st) + daily
 *  maintenance. Run once. */
function installMonthlyGenerator() {
  _pmAssertDeps_();
  setupPlannedSheets();
  uninstallMonthlyGenerator();
  ScriptApp.newTrigger('runMonthlyGeneratorNow').timeBased().onMonthDay(1).atHour(PLANNED_RUN_HOUR).create();
  ScriptApp.newTrigger('runDailyMaintenanceNow').timeBased().everyDays(1).atHour(PLANNED_MAINT_HOUR).create();
  var msg = 'Installed: monthly generator (1st ~' + PLANNED_RUN_HOUR + ':00) + daily maintenance (~'
    + PLANNED_MAINT_HOUR + ':00), ' + Session.getScriptTimeZone() + '.';
  Logger.log(msg);
  return msg;
}

function uninstallMonthlyGenerator() {
  var n = 0;
  ScriptApp.getProjectTriggers().forEach(function (t) {
    var f = t.getHandlerFunction();
    if (f === 'runMonthlyGeneratorNow' || f === 'runDailyMaintenanceNow') { ScriptApp.deleteTrigger(t); n++; }
  });
  Logger.log('Removed ' + n + ' trigger(s).');
  return n;
}

/* ===== core ============================================================== */

function _pmGenerateForMonth_(anchor) {
  _pmAssertDeps_();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var tz = Session.getScriptTimeZone();
  var monthStart = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  var monthEnd   = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
  var now = new Date();
  var todayKey = _pmKey_(new Date(now.getFullYear(), now.getMonth(), now.getDate()), tz);
  var holidays = PLANNED_SKIP_HOLIDAYS ? _pmHolidaySet_(tz) : {};

  var lock = LockService.getScriptLock();
  try { lock.waitLock(30000); } catch (e) { return { error: 'another run is in progress' }; }

  var summary = { month: _pmKey_(monthStart, tz).slice(0, 7), plans: 0, created: 0, skipped: 0 };
  try {
    Object.keys(PLANNED_MAP).forEach(function (planSheetName) {
      var planSheet = getOrCreateSheet_(planSheetName, PLANNED_HEADERS);
      var target = ss.getSheetByName(PLANNED_MAP[planSheetName]);
      if (!target) return;

      var ph = getHeaders_(planSheet);
      var th = getHeaders_(target);
      var col = function (a) { return findHeader_(ph, a); };
      var cPlanId  = col(['plan id', 'planid', 'id']);
      var cDesc    = col(['task description', 'task', 'description']);
      var cDept    = col(['department', 'firm']);
      var cGiven   = col(['given by']);
      var cName    = col(['name', 'doer', 'assigned to']);
      var cStart   = col(['start date', 'task start date', 'planned date', 'date']);
      var cTime    = col(['time', 'task start time', 'planned time', 'set time']);
      var cFreq    = col(['freq', 'frequency']);
      var cEnd     = col(['end date', 'until']);
      var cReqAtt  = col(['require attachment']);
      var cRemind  = col(['enable reminders', 'reminders']);
      var cRemarks = col(['remarks']);
      var cActive  = col(['active', 'enabled']);
      if (cDesc < 0 || cName < 0 || cStart < 0 || cFreq < 0) return;

      // existing Task IDs already in the target sheet -> idempotency set
      var existing = {};
      var tIdCol = findHeader_(th, ['task id', 'taskid']);
      if (tIdCol >= 0) {
        var tvals = target.getDataRange().getValues();
        for (var r = 1; r < tvals.length; r++) existing[String(tvals[r][tIdCol]).trim()] = 1;
      }

      var pvals = planSheet.getDataRange().getValues();
      for (var pr = 1; pr < pvals.length; pr++) {
        var row = pvals[pr];
        if (cActive >= 0) {
          var act = String(row[cActive] || '').trim().toLowerCase();
          if (act && ['no', 'n', 'false', '0', 'inactive', 'off'].indexOf(act) !== -1) continue;
        }
        var start = _pmParse_(row[cStart]);
        if (!start) continue;
        var plan = { start: start, end: (cEnd >= 0 ? _pmParse_(row[cEnd]) : null), freq: _pmFreq_(row[cFreq]) };
        summary.plans++;

        var planId = (cPlanId >= 0 && row[cPlanId])
          ? String(row[cPlanId]).trim()
          : ((planSheetName === 'Task_Planned_DL' ? 'PDL-' : 'PCL-') + pr);

        var occ = _pmOccurrencesInMonth_(plan, monthStart, monthEnd, holidays, tz);
        for (var i = 0; i < occ.length; i++) {
          var dk = occ[i];
          if (!PLANNED_INCLUDE_PAST_DAYS && dk < todayKey) continue;
          var instanceId = planId + '#' + dk;
          if (existing[instanceId]) { summary.skipped++; continue; }
          existing[instanceId] = 1;
          appendMapped_(target, th, {
            'task id': instanceId,
            'task description': cDesc >= 0 ? row[cDesc] : '',
            'task': cDesc >= 0 ? row[cDesc] : '',
            'department': cDept >= 0 ? row[cDept] : '',
            'firm': cDept >= 0 ? row[cDept] : '',
            'given by': cGiven >= 0 ? row[cGiven] : '',
            'name': cName >= 0 ? row[cName] : '',
            'doer': cName >= 0 ? row[cName] : '',
            'assigned to': cName >= 0 ? row[cName] : '',
            'task start date': dk,
            'planned date': dk,
            'task start time': cTime >= 0 ? row[cTime] : '',
            'planned time': cTime >= 0 ? row[cTime] : '',
            'set time': cTime >= 0 ? row[cTime] : '',
            'freq': PLANNED_INSTANCE_FREQ,
            'frequency': PLANNED_INSTANCE_FREQ,
            'status': 'Pending',
            'require attachment': cReqAtt >= 0 ? row[cReqAtt] : 'No',
            'enable reminders': cRemind >= 0 ? row[cRemind] : 'No',
            'remarks': cRemarks >= 0 ? row[cRemarks] : '',
            'timestamp': new Date()
          });
          summary.created++;
        }
      }
    });
  } finally {
    lock.releaseLock();
  }
  return summary;
}

/** All occurrence date-keys for a plan that fall inside [monthStart, monthEnd]. */
function _pmOccurrencesInMonth_(plan, monthStart, monthEnd, holidays, tz) {
  var seen = {}, out = [];
  var push = function (d) {
    if (d.getTime() < monthStart.getTime() || d.getTime() > monthEnd.getTime()) return;
    if (plan.end && d.getTime() > plan.end.getTime()) return;
    var k = _pmKey_(d, tz);
    if (!seen[k]) { seen[k] = 1; out.push(k); }
  };

  var d0 = _pmWorkingDay_(new Date(plan.start.getTime()), holidays, tz);
  if (plan.freq === 'one-time') { push(d0); return out; }

  var occ = d0, guard = 0;
  while (occ.getTime() <= monthEnd.getTime() && guard++ < 15000) {
    push(occ);
    var next = _pmStep_(occ, plan.freq);
    if (!next) break;
    occ = _pmWorkingDay_(next, holidays, tz);
  }
  return out;
}

/* ===== helpers ========================================================== */

function _pmAssertDeps_() {
  if (typeof getHeaders_ !== 'function' || typeof findHeader_ !== 'function' ||
      typeof appendMapped_ !== 'function' || typeof getOrCreateSheet_ !== 'function' ||
      typeof setByHeader_ !== 'function') {
    throw new Error('PlannedMonthly.gs needs Code.gs in the same Apps Script project (it reuses its helpers).');
  }
}

/* ===== plan CRUD — called from Code.gs doPost (planAdd / planUpdate /
 *       planDelete / planGenerate) ====================================== */

function _pmPlanSheetName_(scope) {
  return String(scope || '').toUpperCase() === 'DL' ? 'Task_Planned_DL' : 'Task_Planned_CL';
}

function _pmNextPlanId_(sheet, scope) {
  var prefix = String(scope || '').toUpperCase() === 'DL' ? 'PDL-' : 'PCL-';
  var h = getHeaders_(sheet), idCol = findHeader_(h, ['plan id', 'planid', 'id']);
  var max = 0;
  if (idCol >= 0 && sheet.getLastRow() > 1) {
    sheet.getRange(2, idCol + 1, sheet.getLastRow() - 1, 1).getDisplayValues().forEach(function (r) {
      var m = String(r[0]).match(/^P(?:CL|DL)-(\d+)$/i);
      if (m) max = Math.max(max, Number(m[1]));
    });
  }
  return prefix + (max + 1);
}

function _pmYesNo_(v) {
  return (v === true || ['yes', 'true', '1', 'y'].indexOf(String(v).trim().toLowerCase()) !== -1) ? 'Yes' : 'No';
}
function _pmActiveVal_(v) {
  if (v === undefined || v === null || v === '') return 'Yes';
  return (v === false || ['no', 'n', 'false', '0', 'inactive', 'off'].indexOf(String(v).trim().toLowerCase()) !== -1) ? 'No' : 'Yes';
}

function planAdd_(p) {
  _pmAssertDeps_();
  var s = getOrCreateSheet_(_pmPlanSheetName_(p.scope), PLANNED_HEADERS);
  var h = getHeaders_(s);
  var id = String(p.planId || '').trim() || _pmNextPlanId_(s, p.scope);
  appendMapped_(s, h, {
    'plan id': id,
    'task description': p.taskDescription || p.title || '',
    'department': p.department || '',
    'given by': p.givenBy || '',
    'name': p.name || p.assignee || '',
    'start date': p.startDate || '',
    'time': p.time || '',
    'freq': p.frequency || p.freq || 'Daily',
    'end date': p.endDate || '',
    'require attachment': _pmYesNo_(p.requireAttachment),
    'enable reminders': _pmYesNo_(p.reminders),
    'remarks': p.remarks || '',
    'active': _pmActiveVal_(p.active)
  });
  return { success: true, planId: id };
}

function planUpdate_(p) {
  _pmAssertDeps_();
  var s = getOrCreateSheet_(_pmPlanSheetName_(p.scope), PLANNED_HEADERS);
  var h = getHeaders_(s), idCol = findHeader_(h, ['plan id', 'planid', 'id']);
  if (idCol < 0) throw new Error('Plan ID column not found.');
  var vals = s.getDataRange().getDisplayValues(), rowIndex = -1;
  for (var r = 1; r < vals.length; r++) {
    if (String(vals[r][idCol]).trim() === String(p.planId).trim()) { rowIndex = r + 1; break; }
  }
  if (rowIndex < 0) throw new Error('Plan ' + p.planId + ' not found.');
  var set = function (aliases, v) { if (v !== undefined) setByHeader_(s, h, rowIndex, aliases, v); };
  set(['task description', 'task', 'description'], p.taskDescription !== undefined ? p.taskDescription : p.title);
  set(['department', 'firm'], p.department);
  set(['given by'], p.givenBy);
  set(['name', 'doer', 'assigned to'], p.name !== undefined ? p.name : p.assignee);
  set(['start date', 'task start date', 'planned date', 'date'], p.startDate);
  set(['time', 'task start time', 'planned time', 'set time'], p.time);
  set(['freq', 'frequency'], p.frequency !== undefined ? p.frequency : p.freq);
  set(['end date', 'until'], p.endDate);
  if (p.requireAttachment !== undefined) set(['require attachment'], _pmYesNo_(p.requireAttachment));
  if (p.reminders !== undefined) set(['enable reminders', 'reminders'], _pmYesNo_(p.reminders));
  set(['remarks'], p.remarks);
  if (p.active !== undefined) set(['active', 'enabled'], _pmActiveVal_(p.active));
  return { success: true, planId: p.planId };
}

function planDelete_(p) {
  _pmAssertDeps_();
  var s = getOrCreateSheet_(_pmPlanSheetName_(p.scope), PLANNED_HEADERS);
  var h = getHeaders_(s), idCol = findHeader_(h, ['plan id', 'planid', 'id']);
  if (idCol < 0) throw new Error('Plan ID column not found.');
  var vals = s.getDataRange().getDisplayValues();
  for (var r = vals.length - 1; r >= 1; r--) {
    if (String(vals[r][idCol]).trim() === String(p.planId).trim()) { s.deleteRow(r + 1); return { success: true }; }
  }
  throw new Error('Plan ' + p.planId + ' not found.');
}

function planGenerate_(p) {
  _pmAssertDeps_();
  var d = new Date();
  var anchor = String(p && p.target || 'current') === 'next'
    ? new Date(d.getFullYear(), d.getMonth() + 1, 1)
    : new Date();
  return _pmGenerateForMonth_(anchor);
}

function planSweep_(p) {
  _pmAssertDeps_();
  return _pmArchiveCompleted_();
}

/* ===== daily maintenance — archive completed, sweep missed ============== */

function _pmArchiveCompleted_() {
  _pmAssertDeps_();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var tz = Session.getScriptTimeZone();
  var now = new Date();
  var todayKey = _pmKey_(new Date(now.getFullYear(), now.getMonth(), now.getDate()), tz);

  var hist = getOrCreateSheet_('TASK HISTORY',
    ['Task ID', 'Task Description', 'Task Type', 'Doer', 'Given By', 'Department', 'Planned Date',
     'Planned Time', 'Actual Date', 'Actual Time', 'Status', 'Completion Type', 'Remarks', 'Submitted Date']);
  var hh = getHeaders_(hist);
  var hIdCol = findHeader_(hh, ['task id', 'taskid']);
  var hActCol = findHeader_(hh, ['actual date', 'actual']);
  var seen = {};
  var hv = hist.getDataRange().getValues();
  for (var r = 1; r < hv.length; r++) {
    var tid = String(hv[r][hIdCol]).trim();
    if (tid.slice(-9) === ' (missed)') seen[tid.slice(0, -9).trim() + '|missed'] = 1;
    else seen[tid] = 1;   // a generated instance id (PlanID#date) is unique to one occurrence
  }

  var lock = LockService.getScriptLock();
  try { lock.waitLock(30000); } catch (e) { return { error: 'busy' }; }

  var out = { archived: 0, missedLogged: 0, plansDeactivated: 0 };
  var planIdx = PLANNED_DEACTIVATE_DONE_ONE_TIME ? _pmPlanIndex_() : {};
  try {
    ['Checklist', 'DELEGATION'].forEach(function (name) {
      var sheet = ss.getSheetByName(name); if (!sheet) return;
      var h = getHeaders_(sheet);
      var c = function (a) { return findHeader_(h, a); };
      var cId = c(['task id', 'taskid']), cStat = c(['status', 'task status']);
      var cAct = c(['actual date', 'actual']), cActT = c(['actual time']);
      var cDesc = c(['task description', 'task', 'description']), cName = c(['name', 'doer', 'assigned to']);
      var cGiven = c(['given by']), cDept = c(['department', 'firm']);
      var cPlan = c(['task start date', 'planned date', 'date']), cPlanT = c(['task start time', 'planned time', 'set time']);
      var cCT = c(['completion type']), cRem = c(['remarks']);
      if (cStat < 0) return;
      var type = name.toLowerCase() === 'checklist' ? 'Checklist' : 'Delegation';
      var vals = sheet.getDataRange().getValues();

      for (var rr = vals.length - 1; rr >= 1; rr--) {
        var row = vals[rr];
        var st = String(row[cStat] || '').trim().toLowerCase();
        var id = cId >= 0 ? String(row[cId]).trim() : '';
        var plannedKey = cPlan >= 0 ? _pmKeyOrNull_(_pmParse_(row[cPlan]), tz) : null;

        if (st === 'done' || st === 'delay') {
          var actKey = cAct >= 0 ? _pmKeyOrNull_(_pmParse_(row[cAct]), tz) : null;
          if (!actKey || actKey >= todayKey) continue;          // keep today's completions until tomorrow
          if (!seen[id]) {                                       // not already in TASK HISTORY
            appendMapped_(hist, hh, {
              'task id': id, 'task description': cDesc >= 0 ? row[cDesc] : '', 'task type': type,
              'doer': cName >= 0 ? row[cName] : '', 'given by': cGiven >= 0 ? row[cGiven] : '',
              'department': cDept >= 0 ? row[cDept] : '',
              'planned date': plannedKey || '', 'planned time': cPlanT >= 0 ? row[cPlanT] : '',
              'actual date': actKey, 'actual time': cActT >= 0 ? row[cActT] : '',
              'status': st === 'delay' ? 'Delay' : 'Done', 'completion type': cCT >= 0 ? row[cCT] : '',
              'remarks': cRem >= 0 ? row[cRem] : '', 'submitted date': new Date()
            });
            seen[id] = 1;
          }
          sheet.deleteRow(rr + 1);
          out.archived++;
          if (PLANNED_DEACTIVATE_DONE_ONE_TIME) {
            var pid = id.indexOf('#') > 0 ? id.slice(0, id.indexOf('#')) : '';
            var pe = pid && planIdx[pid];
            if (pe && pe.freq === 'one-time') {
              var aCol = findHeader_(pe.headers, ['active', 'enabled']);
              if (aCol >= 0 && String(pe.sheet.getRange(pe.rowIndex, aCol + 1).getDisplayValue()).trim().toLowerCase() !== 'no') {
                pe.sheet.getRange(pe.rowIndex, aCol + 1).setValue('No');
                out.plansDeactivated++;
              }
            }
          }
        } else if (PLANNED_SWEEP_MISSED && id.indexOf('#') > 0 && plannedKey && plannedKey < todayKey
                   && _pmDaysBetween_(plannedKey, todayKey) >= PLANNED_MISSED_GRACE_DAYS) {
          if (!seen[id + '|missed|' + plannedKey]) {
            appendMapped_(hist, hh, {
              'task id': id + ' (missed)', 'task description': cDesc >= 0 ? row[cDesc] : '', 'task type': type,
              'doer': cName >= 0 ? row[cName] : '', 'given by': cGiven >= 0 ? row[cGiven] : '',
              'department': cDept >= 0 ? row[cDept] : '',
              'planned date': plannedKey, 'planned time': cPlanT >= 0 ? row[cPlanT] : '',
              'actual date': '', 'actual time': '',
              'status': 'Missed', 'completion type': 'MISSED',
              'remarks': 'Auto: not completed', 'submitted date': new Date()
            });
            seen[id + '|missed|' + plannedKey] = 1;
          }
          sheet.deleteRow(rr + 1);
          out.missedLogged++;
        }
      }
    });
  } finally {
    lock.releaseLock();
  }
  return out;
}

function _pmKeyOrNull_(d, tz) { return d ? _pmKey_(d, tz) : null; }

function _pmDaysBetween_(aKey, bKey) {
  var a = _pmParse_(aKey), b = _pmParse_(bKey);
  if (!a || !b) return 0;
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

function _pmPlanIndex_() {
  var idx = {};
  Object.keys(PLANNED_MAP).forEach(function (planSheetName) {
    var s = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(planSheetName);
    if (!s) return;
    var h = getHeaders_(s);
    var cId = findHeader_(h, ['plan id', 'planid', 'id']);
    var cFreq = findHeader_(h, ['freq', 'frequency']);
    if (cId < 0) return;
    var vals = s.getDataRange().getDisplayValues();
    for (var r = 1; r < vals.length; r++) {
      var id = String(vals[r][cId]).trim();
      if (id) idx[id] = { sheet: s, headers: h, rowIndex: r + 1, freq: _pmFreq_(cFreq >= 0 ? vals[r][cFreq] : '') };
    }
  });
  return idx;
}

function _pmFreq_(raw) {
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

function _pmStep_(d, freq) {
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

function _pmWorkingDay_(d, holidays, tz) {
  var g = 0;
  while (g++ < 90) {
    if (PLANNED_SKIP_SUNDAY && d.getDay() === 0) { d.setDate(d.getDate() + 1); continue; }
    if (PLANNED_SKIP_HOLIDAYS && holidays[_pmKey_(d, tz)]) { d.setDate(d.getDate() + 1); continue; }
    break;
  }
  return d;
}

function _pmKey_(d, tz) {
  return Utilities.formatDate(d, tz || Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function _pmParse_(v) {
  if (v instanceof Date && !isNaN(v.getTime())) return new Date(v.getFullYear(), v.getMonth(), v.getDate());
  var s = String(v == null ? '' : v).trim();
  if (!s) return null;
  var dmy = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);   // dd/mm/yyyy
  if (dmy) return new Date(+dmy[3], +dmy[2] - 1, +dmy[1]);
  var ymd = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);                // yyyy-mm-dd
  if (ymd) return new Date(+ymd[1], +ymd[2] - 1, +ymd[3]);
  var d = new Date(s);
  return isNaN(d.getTime()) ? null : new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function _pmHolidaySet_(tz) {
  var set = {};
  var s = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('HOLIDAYS');
  if (!s) return set;
  var vals = s.getDataRange().getValues();
  for (var r = 1; r < vals.length; r++) {
    var d = _pmParse_(vals[r][0]);
    if (d) set[_pmKey_(d, tz)] = true;
  }
  return set;
}
