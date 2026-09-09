import { useEffect, useMemo, useState } from 'react'

import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  X,
  CheckSquare,
  Users,
  Clock,
  CalendarCheck,
  Lock,
  PartyPopper
} from 'lucide-react'

import PageHeader from '../components/PageHeader'

import {
  fetchChecklist,
  fetchDelegation,
  fetchTaskHistory,
  visibleToUser
} from '../services/tasks'

import {
  localISO,
  displayDateTime,
  normalize,
  isoDate
} from '../services/sheets'

import {
  occurrences,
  getHolidays,
  holidayMap
} from '../services/calendar'


/* =========================================================
   STORAGE
   ========================================================= */

const VIEW_KEY = 'crest_calendar_view_v1'

function readView() {
  try {
    return {
      past: true,
      future: true,
      ...JSON.parse(
        localStorage.getItem(VIEW_KEY) || '{}'
      )
    }
  } catch {
    return {
      past: true,
      future: true
    }
  }
}

function writeView(v) {
  try {
    localStorage.setItem(
      VIEW_KEY,
      JSON.stringify(v)
    )
  } catch {}
}


/* =========================================================
   CALENDAR SESSION CACHE
   ========================================================= */

const CACHE_KEY = 'crest_calendar_cache_v1'

function readCache(user) {
  try {
    const c = JSON.parse(
      sessionStorage.getItem(CACHE_KEY) || 'null'
    )

    return c && c.user === user
      ? c
      : null
  } catch {
    return null
  }
}

function writeCache(user, tasks, holidays) {
  try {
    sessionStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        user,
        tasks,
        holidays,
        ts: Date.now()
      })
    )
  } catch {}
}


/* =========================================================
   DATE HELPERS
   ========================================================= */

/*
 * Always return YYYY-MM-DD.
 */
function dateKey(value) {
  if (!value) return ''

  const s = String(value).trim()

  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    return s.slice(0, 10)
  }

  try {
    const d = new Date(value)

    if (!isNaN(d.getTime())) {
      return `${d.getFullYear()}-${String(
        d.getMonth() + 1
      ).padStart(2, '0')}-${String(
        d.getDate()
      ).padStart(2, '0')}`
    }
  } catch {}

  return ''
}


/* =========================================================
   TASK / PLAN HELPERS
   ========================================================= */

function getPlanId(item) {
  return String(
    item?.planId ??
    item?.['Plan ID'] ??
    item?.planID ??
    item?.planid ??
    ''
  ).trim()
}


function getTaskId(item) {
  return String(
    item?.id ??
    item?.taskId ??
    item?.['Task ID'] ??
    item?.taskID ??
    ''
  ).trim()
}


/*
 * Get occurrence/planned date from any supported shape.
 */
function getOccurrenceDate(item) {
  return dateKey(
    item?.occurrenceDate ??
    item?.plannedISO ??
    item?.plannedDate ??
    item?.['Planned Date'] ??
    item?.taskStartDate ??
    item?.['Task Start Date'] ??
    item?.date
  )
}


/*
 * Recurring instance identity:
 *
 * Plan ID + Occurrence Date
 *
 * Example:
 *
 * P1001|2026-09-09
 * P1001|2026-09-10
 */
function getInstanceKey(item, date) {
  const planId = getPlanId(item)

  const occurrenceDate =
    dateKey(date) ||
    getOccurrenceDate(item)

  if (!planId || !occurrenceDate) {
    return ''
  }

  return `${planId}|${occurrenceDate}`
}


/*
 * Task type.
 *
 * This is intentionally included in the duplicate key
 * so Checklist and Delegation can have the same task
 * name/date without one hiding the other.
 */
function getTaskType(item) {
  const type = normalize(
    item?.type ??
    item?.taskType ??
    item?.['Task Type'] ??
    ''
  )

  if (
    type === 'delegation' ||
    type === 'delegate' ||
    type === 'delegated'
  ) {
    return 'delegation'
  }

  return 'checklist'
}


/*
 * Strong duplicate identity.
 *
 * Same:
 *
 *     Task Type
 *     Plan ID
 *     Occurrence Date
 *
 * = same calendar occurrence.
 *
 * This prevents duplicate Daily entries.
 */
function getCalendarInstanceKey(item) {
  const instanceKey = getInstanceKey(
    item,
    item?.occurrenceDate ||
      item?.date
  )

  const type = getTaskType(item)

  if (instanceKey) {
    return `${type}|${instanceKey}`
  }

  /*
   * Fallback for records without Plan ID.
   */
  const taskId = getTaskId(item)
  const date = getOccurrenceDate(item)

  if (taskId && date) {
    return `${type}|TASK|${taskId}|${date}`
  }

  return ''
}


/* =========================================================
   FREQUENCY
   ========================================================= */

function taskFrequency(task) {
  return normalize(
    task?.frequency ??
    task?.freq ??
    task?.Freq ??
    task?.['Frequency'] ??
    ''
  )
}


function isRecurring(task) {
  const f = taskFrequency(task)

  return (
    f.startsWith('d') ||
    f.startsWith('w') ||
    f.startsWith('fort') ||
    f.startsWith('m') ||
    f.startsWith('q') ||
    f.startsWith('half') ||
    f.includes('halfyear') ||
    f.startsWith('y')
  )
}


function isOneTime(task) {
  return !isRecurring(task)
}


/* =========================================================
   STATUS
   ========================================================= */

function normalizeStatus(status) {
  const s = normalize(status)

  if (
    s === 'done' ||
    s === 'completed' ||
    s === 'complete'
  ) {
    return 'done'
  }

  if (
    s === 'delay' ||
    s === 'delayed'
  ) {
    return 'delay'
  }

  if (
    s === 'pending' ||
    s === ''
  ) {
    return 'pending'
  }

  return s
}


/* =========================================================
   REMOVE DUPLICATE CALENDAR OCCURRENCES
   ========================================================= */

function deduplicateEvents(events = []) {
  const map = new Map()

  events.forEach(event => {

    const key =
      getCalendarInstanceKey(event)

    /*
     * If we cannot construct a safe instance key,
     * keep the event rather than accidentally deleting it.
     */
    if (!key) {
      const fallback =
        `${getTaskId(event)}|${
          getOccurrenceDate(event)
        }|${Math.random()}`

      map.set(fallback, event)
      return
    }

    /*
     * First occurrence wins.
     *
     * This is important when the same Daily instance
     * was returned more than once by the source.
     */
    if (!map.has(key)) {
      map.set(key, event)
    }
  })

  return [...map.values()]
}


/* =========================================================
   COMPONENT
   ========================================================= */

export default function Calendar({
  session,
  refresh
}) {

  const canPast =
    session?.isAdmin ||
    session?.calendarPast !== false

  const canFuture =
    session?.isAdmin ||
    session?.calendarFuture !== false

  const canFilterDoer =
    session?.isAdmin ||
    ['Editor', 'Full Access'].includes(
      session?.access?.['Calendar']
    )


  /* =======================================================
     CACHE
     ======================================================= */

  const cached = readCache(
    session?.username
  )


  const [tasks, setTasks] = useState(
    cached?.tasks || []
  )

  const [history, setHistory] =
    useState([])

  /*
   * Working day calendar is intentionally
   * left as existing behavior.
   */
  const [working] = useState([])

  const [holidays, setHolidays] =
    useState(
      cached?.holidays || []
    )

  const [month, setMonth] =
    useState(new Date())

  const [loading, setLoading] =
    useState(!cached)

  const [error, setError] =
    useState('')

  const [selected, setSelected] =
    useState(null)

  const [doer, setDoer] =
    useState('all')

  const [view, setView] =
    useState(() => {

      const v = readView()

      return {
        past: v.past && canPast,
        future: v.future && canFuture
      }
    })


  /* =======================================================
     VIEW SETTINGS
     ======================================================= */

  const setViewFlag = (k, val) => {

    setView(v => {

      const next = {
        ...v,
        [k]: val
      }

      writeView(next)

      return next
    })
  }


  /* =======================================================
     LOAD DATA
     ======================================================= */

  const load = async (silent = false) => {

    if (!silent) {
      setLoading(true)
    }

    setError('')

    try {

      const [
        c,
        d,
        h,
        hol
      ] = await Promise.all([

        fetchChecklist()
          .catch(() => []),

        fetchDelegation()
          .catch(() => []),

        fetchTaskHistory()
          .catch(() => []),

        getHolidays()
          .catch(() => [])
      ])


      const all =
        visibleToUser(
          [...c, ...d],
          session
        )


      setTasks(all)

      setHistory(h)

      setHolidays(hol)

      writeCache(
        session.username,
        all,
        hol
      )

    } catch (e) {

      setError(
        e.message ||
        'Unable to load the calendar.'
      )

    } finally {

      setLoading(false)
    }
  }


  useEffect(() => {

    load(
      !!readCache(
        session.username
      )
    )

  }, [
    refresh,
    session.username
  ])


  /* =======================================================
     MONTH RANGE
     ======================================================= */

  const range = useMemo(() => ({

    start: new Date(
      month.getFullYear(),
      month.getMonth(),
      1
    ),

    end: new Date(
      month.getFullYear(),
      month.getMonth() + 1,
      0
    )

  }), [month])


  const today = localISO()


  /* =======================================================
     HOLIDAY MAP
     ======================================================= */

  const holMap = useMemo(
    () => holidayMap(holidays),
    [holidays]
  )


  /* =======================================================
     GENERATE OCCURRENCES
     ======================================================= */

  const allEvents = useMemo(() => {

    const generated =
      occurrences(
        tasks,
        range.start,
        range.end,
        working,
        holidays
      )


    /*
     * Add exact occurrence information.
     */
    const normalized =
      generated.map(event => {

        const occurrenceDate =
          dateKey(
            event.occurrenceDate
          ) ||
          dateKey(event.date)


        const instanceKey =
          getInstanceKey(
            event,
            occurrenceDate
          )


        return {
          ...event,

          occurrenceDate,

          instanceKey,

          /*
           * Make sure type is always available
           * for CSS:
           *
           * checklist
           * delegation
           */
          type:
            event.type ||
            (
              getTaskType(event) ===
              'delegation'
                ? 'Delegation'
                : 'Checklist'
            )
        }
      })


    /*
     * CRITICAL FIX:
     *
     * Remove duplicate:
     *
     * Task Type + Plan ID + Occurrence Date
     *
     * This protects the calendar even if the backend
     * has already generated Daily rows AND occurrences()
     * expands them again.
     */
    return deduplicateEvents(
      normalized
    )

  }, [
    tasks,
    range,
    working,
    holidays
  ])


  /* =======================================================
     DOERS
     ======================================================= */

  const doers = useMemo(() => {

    return [
      ...new Set(
        tasks
          .map(t => t.assignee)
          .filter(Boolean)
      )
    ].sort(
      (a, b) =>
        a.localeCompare(b)
    )

  }, [tasks])


  /* =======================================================
     FILTER EVENTS
     ======================================================= */

  const events = useMemo(() => {

    return allEvents.filter(e => {

      if (
        canFilterDoer &&
        doer !== 'all' &&
        normalize(e.assignee) !==
          normalize(doer)
      ) {
        return false
      }


      const d =
        e.occurrenceDate


      if (d < today) {
        return view.past
      }


      if (d > today) {
        return view.future
      }


      return true
    })

  }, [
    allEvents,
    view.past,
    view.future,
    today,
    canFilterDoer,
    doer
  ])


  /* =======================================================
     EXACT INSTANCE HISTORY
     ======================================================= */

  const instanceHistoryMap =
    useMemo(() => {

      const map = {}


      ;(history || []).forEach(h => {

        const planId =
          getPlanId(h)

        const plannedDate =
          getOccurrenceDate(h)


        /*
         * History must contain:
         *
         * Plan ID + Planned Date
         */
        if (
          planId &&
          plannedDate
        ) {

          const key =
            `${planId}|${plannedDate}`


          map[key] = {
            ...h,

            status:
              h.status ??
              h.liveStatus ??
              ''
          }
        }

      })


      return map

    }, [history])


  /* =======================================================
     TASK ID HISTORY FALLBACK
     ======================================================= */

  const taskHistoryMap =
    useMemo(() => {

      const map = {}


      ;(history || []).forEach(h => {

        const id =
          getTaskId(h)

        if (!id) return


        map[id] = {
          ...h,

          status:
            h.status ??
            h.liveStatus ??
            ''
        }

      })


      return map

    }, [history])


  /* =======================================================
     GET STATUS FOR EXACT OCCURRENCE
     ======================================================= */

  const getOccurrenceStatus = event => {

    const occurrenceDate =
      getOccurrenceDate(event)


    const instanceKey =
      getInstanceKey(
        event,
        occurrenceDate
      )


    /* -----------------------------------------------------
       1. EXACT INSTANCE
       ----------------------------------------------------- */

    if (
      instanceKey &&
      instanceHistoryMap[instanceKey]
    ) {

      const h =
        instanceHistoryMap[
          instanceKey
        ]


      return normalizeStatus(
        h.status
      )
    }


    /* -----------------------------------------------------
       2. ONE-TIME TASK
       ----------------------------------------------------- */

    if (isOneTime(event)) {

      const taskId =
        getTaskId(event)


      if (
        taskId &&
        taskHistoryMap[taskId]
      ) {

        return normalizeStatus(
          taskHistoryMap[taskId].status
        )
      }


      return normalizeStatus(
        event.status ??
        event.liveStatus ??
        'pending'
      )
    }


    /* -----------------------------------------------------
       3. RECURRING SOURCE DATE
       ----------------------------------------------------- */

    const originalDate =
      getOccurrenceDate({
        ...event,

        occurrenceDate:
          event.plannedRaw ??
          event.plannedDate ??
          event['Planned Date'] ??
          event.taskStartDate ??
          event['Task Start Date']
      })


    /*
     * Only allow the task's own status to represent
     * its original planned date.
     */
    if (
      originalDate &&
      originalDate === occurrenceDate
    ) {

      return normalizeStatus(
        event.status ??
        event.liveStatus ??
        'pending'
      )
    }


    /*
     * Future recurring occurrence:
     * always Pending until its own history exists.
     */
    return 'pending'
  }


  /* =======================================================
     COUNTS
     ======================================================= */

  const counts = useMemo(() => {

    const m = {}


    events.forEach(e => {

      const k =
        e.occurrenceDate


      if (!m[k]) {
        m[k] = []
      }


      const status =
        getOccurrenceStatus(e)


      m[k].push({
        ...e,

        status,

        liveStatus: status
      })
    })


    return m

  }, [
    events,
    instanceHistoryMap,
    taskHistoryMap
  ])


  /* =======================================================
     CALENDAR GRID
     ======================================================= */

  const first =
    (
      range.start.getDay() +
      6
    ) % 7


  const days =
    Array.from(
      {
        length:
          first +
          range.end.getDate()
      },
      (_, i) =>
        i < first
          ? null
          : i - first + 1
    )


  const key = d =>
    `${month.getFullYear()}-${String(
      month.getMonth() + 1
    ).padStart(2, '0')}-${String(
      d
    ).padStart(2, '0')}`


  /* =======================================================
     ENRICH EVENT FOR MODAL
     ======================================================= */

  const enrichEvent = e => {

    const status =
      getOccurrenceStatus(e)


    const instanceKey =
      getInstanceKey(
        e,
        e.occurrenceDate
      )


    const h =
      instanceKey
        ? instanceHistoryMap[
            instanceKey
          ]
        : null


    return {
      ...e,

      status,

      liveStatus: status,

      actualDate:
        h?.actualDate ||
        (
          status === 'done' ||
          status === 'delay'
            ? e.actualDate || ''
            : ''
        ),

      actualTime:
        h?.actualTime ||
        (
          status === 'done' ||
          status === 'delay'
            ? e.actualTime || ''
            : ''
        ),

      actual:
        h?.actual ||
        (
          status === 'done' ||
          status === 'delay'
            ? e.actual || ''
            : ''
        )
    }
  }


  /* =======================================================
     RENDER
     ======================================================= */

  return <>

    <PageHeader
      title="Calendar"

      subtitle="Every scheduled task, with recurring frequencies. Sundays and marked holidays are skipped — those tasks move to the next working day."

      action={
        <div className="calendar-controls">

          {loading &&
            tasks.length > 0 && (
              <span className="cal-refreshing">

                <RefreshCw
                  size={12}
                  className="cal-spin-i"
                />

                refreshing…

              </span>
            )
          }


          <button
            onClick={() =>
              setMonth(
                new Date(
                  month.getFullYear(),
                  month.getMonth() - 1,
                  1
                )
              )
            }
          >
            <ChevronLeft size={16}/>
          </button>


          <b>
            {month.toLocaleString(
              'en-US',
              {
                month: 'long',
                year: 'numeric'
              }
            )}
          </b>


          <button
            onClick={() =>
              setMonth(
                new Date(
                  month.getFullYear(),
                  month.getMonth() + 1,
                  1
                )
              )
            }
          >
            <ChevronRight size={16}/>
          </button>


          <button
            className="secondary-btn calendar-refresh"
            onClick={() => load()}
          >
            <RefreshCw size={14}/>
          </button>

        </div>
      }
    />


    {error && (
      <div className="error-box page-error">
        {error}
      </div>
    )}


    {loading && !tasks.length ? (

      <div className="panel calendar-loading">

        <span
          className="cal-spinner"
          aria-hidden="true"
        />

        <b>
          Loading your calendar…
        </b>

        <small>
          Fetching scheduled tasks from the sheet
        </small>

      </div>

    ) : <>

      {/* =================================================
          FILTERS
          ================================================= */}

      <div className="calendar-view-toggles">

        <label
          className={`cal-toggle ${
            !canPast ? 'disabled' : ''
          }`}
          title={
            canPast
              ? ''
              : 'Not permitted for your account'
          }
        >

          <input
            type="checkbox"
            checked={view.past}
            disabled={!canPast}
            onChange={e =>
              setViewFlag(
                'past',
                e.target.checked
              )
            }
          />

          <span>
            Show Past Tasks

            {!canPast && (
              <Lock size={11}/>
            )}
          </span>

        </label>


        <label
          className={`cal-toggle ${
            !canFuture ? 'disabled' : ''
          }`}
          title={
            canFuture
              ? ''
              : 'Not permitted for your account'
          }
        >

          <input
            type="checkbox"
            checked={view.future}
            disabled={!canFuture}
            onChange={e =>
              setViewFlag(
                'future',
                e.target.checked
              )
            }
          />

          <span>
            Show Future Tasks

            {!canFuture && (
              <Lock size={11}/>
            )}
          </span>

        </label>


        {canFilterDoer && (

          <label className="filter-field cal-doer-filter">

            <Users size={14}/>

            <select
              value={doer}
              onChange={e =>
                setDoer(e.target.value)
              }
              title="Filter by doer"
            >

              <option value="all">
                All Doers
              </option>

              {doers.map(x => (
                <option key={x}>
                  {x}
                </option>
              ))}

            </select>

          </label>

        )}


        <small>
          {events.length} of {allEvents.length} occurrences shown
        </small>

      </div>


      {/* =================================================
          CALENDAR
          ================================================= */}

      <div className="panel calendar-panel">

        <div className="calendar-legend">

          <span>
            <i className="legend-check"/>
            Checklist
          </span>

          <span>
            <i className="legend-delegation"/>
            Delegation
          </span>

          <span>
            <i className="legend-today"/>
            Today
          </span>

          <span>
            <i className="legend-festival"/>
            Festival holiday
          </span>

          <span>
            <i className="legend-holiday"/>
            Sunday
          </span>

          <span>
            <i className="legend-done"/>
            Done
          </span>

          <span>
            <i className="legend-delay"/>
            Delay
          </span>

        </div>


        <div className="weekdays">

          {[
            'Mon',
            'Tue',
            'Wed',
            'Thu',
            'Fri',
            'Sat',
            'Sun'
          ].map(x => (

            <b key={x}>
              {x}
            </b>

          ))}

        </div>


        <div className="calendar-grid">

          {days.map((d, i) => {

            if (d === null) {

              return (
                <div
                  key={`blank-${i}`}
                  className="day-cell blank"
                />
              )
            }


            const dk =
              key(d)


            const isToday =
              dk === today


            const isSunday =
              new Date(
                range.start.getFullYear(),
                range.start.getMonth(),
                d
              ).getDay() === 0


            const occasion =
              holMap[dk]


            const items =
              counts[dk] || []


            return (

              <button
                key={d}

                className={`day-cell calendar-day ${
                  isToday
                    ? 'today'
                    : ''
                } ${
                  isSunday
                    ? 'holiday'
                    : ''
                } ${
                  occasion
                    ? 'festival'
                    : ''
                }`}

                onClick={() =>
                  setSelected({
                    date: dk,

                    items:
                      items.map(
                        enrichEvent
                      ),

                    occasion
                  })
                }
              >

                <span className="cal-daynum">

                  {d}

                  {isToday && (
                    <em className="cal-today-tag">
                      Today
                    </em>
                  )}

                </span>


                {occasion && (

                  <span
                    className="cal-festival-tag"
                    title={occasion}
                  >

                    <PartyPopper size={9}/>

                    {occasion}

                  </span>

                )}


                <div className="calendar-stack">

                  {items
                    .slice(0, 3)
                    .map((x, j) => {

                      const e =
                        enrichEvent(x)


                      const st =
                        normalizeStatus(
                          e.status ||
                          e.liveStatus ||
                          'pending'
                        )


                      /*
                       * Explicit task type.
                       *
                       * This guarantees:
                       *
                       * Checklist
                       * and
                       * Delegation
                       *
                       * receive different CSS classes.
                       */
                      const taskType =
                        getTaskType(e)


                      return (

                        <span
                          key={
                            e.instanceKey
                              ? `${taskType}|${e.instanceKey}`
                              : `${taskType}|${getTaskId(e)}|${e.occurrenceDate}|${j}`
                          }

                          className={`calendar-task-chip ${
                            taskType
                          } ${st}`}

                          title={x.title}
                        >

                          {x.title}

                        </span>

                      )
                    })
                  }


                  {items.length > 3 && (

                    <em>
                      +{items.length - 3} more
                    </em>

                  )}

                </div>

              </button>
            )
          })}

        </div>

      </div>


      {/* =================================================
          SUMMARY
          ================================================= */}

      <div className="panel calendar-summary">

        <div>

          <h2>
            {events.length} planned occurrences
          </h2>

          <p>
            Recurring tasks repeat by frequency
            and skip Sundays &amp; holidays.
          </p>

        </div>


        <button
          className="secondary-btn"
          onClick={() =>
            setSelected({
              date: today,

              items:
                (
                  counts[today] || []
                ).map(enrichEvent),

              occasion:
                holMap[today]
            })
          }
        >
          Today
        </button>

      </div>

    </>}


    {/* =====================================================
        MODAL
        ===================================================== */}

    {selected && (

      <div
        className="modal-backdrop"

        onClick={() =>
          setSelected(null)
        }
      >

        <section
          className="calendar-modal"

          onClick={e =>
            e.stopPropagation()
          }
        >

          <div className="modal-head">

            <div>

              <h2>

                {new Date(
                  selected.date +
                  'T00:00:00'
                ).toLocaleDateString(
                  'en-IN',
                  {
                    weekday: 'long',
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                  }
                )}

              </h2>

              <p>
                {selected.items.length}
                {' '}
                task(s)
              </p>

            </div>


            <button
              className="icon-btn"
              onClick={() =>
                setSelected(null)
              }
            >
              <X size={18}/>
            </button>

          </div>


          {/* =================================================
              HOLIDAY BANNER
              ================================================= */}

          {selected.occasion && (

            <div className="holiday-banner">

              <PartyPopper size={15}/>

              <b>
                {selected.occasion}
              </b>

              {' '}— holiday. Tasks scheduled
              for today are moved to the next
              working day.

            </div>

          )}


          {/* =================================================
              DETAIL CARDS
              ================================================= */}

          <div className="calendar-card-stack">

            {selected.items.length

              ? selected.items.map((x, i) => {

                  const st =
                    normalizeStatus(
                      x.status ||
                      x.liveStatus ||
                      'pending'
                    )


                  const taskType =
                    getTaskType(x)


                  const isDoneOrDelay =
                    st === 'done' ||
                    st === 'delay'


                  const actualText =
                    x.actual ||
                    displayDateTime(
                      x.actualDate,
                      x.actualTime
                    )


                  return (

                    <div
                      className={`calendar-detail-card ${
                        taskType
                      } ${st}`}

                      key={
                        x.instanceKey
                          ? `${taskType}|${x.instanceKey}`
                          : `${taskType}|${getTaskId(x)}-${x.occurrenceDate}-${i}`
                      }
                    >

                      <div className="calendar-card-icon">

                        {taskType === 'checklist'

                          ? <CheckSquare size={16}/>

                          : <Users size={16}/>

                        }

                      </div>


                      <div className="calendar-card-info">

                        <b>
                          {x.title}
                        </b>


                        <span>

                          {taskType ===
                            'delegation'
                            ? 'Delegation'
                            : 'Checklist'
                          }

                          {' · '}

                          {x.assignee ||
                            'Unassigned'
                          }

                          {' · '}

                          {x.frequency}

                        </span>


                        {isDoneOrDelay &&
                          actualText && (

                          <span className="calendar-actual-date">

                            <CalendarCheck size={13}/>

                            Actual:
                            {' '}
                            {actualText}

                          </span>

                        )}

                      </div>


                      <div className="calendar-card-right">

                        <strong
                          className={`cal-status-badge ${st}`}
                        >

                          {st === 'done'
                            ? 'Done'
                            : st === 'delay'
                              ? 'Delay'
                              : 'Pending'
                          }

                        </strong>


                        {x.plannedTime && (

                          <span className="cal-time">

                            <Clock size={11}/>

                            {x.plannedTime}

                          </span>

                        )}

                      </div>

                    </div>
                  )
                })

              : (

                <div className="empty-box">

                  {selected.occasion
                    ? 'Holiday — no tasks scheduled.'
                    : 'No tasks on this date.'
                  }

                </div>

              )
            }

          </div>

        </section>

      </div>

    )}

  </>
}
