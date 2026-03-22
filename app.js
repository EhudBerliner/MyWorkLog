/* ═══════════════════════════════════════════════════════
   MyWorkLog · App Core  v3.2.0
   ═══════════════════════════════════════════════════════ */

const VER = '4.1.0';

/* ── Storage keys ── */
const K = {
  ep:        'mwl_endpoint',
  reps:      'mwl_reports',
  q:         'mwl_queue',
  delQ:      'mwl_delete_queue',        // offline delete queue
  proj:      'mwl_projects',
  lang:      'mwl_lang',
  theme:     'mwl_theme',
  prefs:     'mwl_prefs',
  ver:       'mwl_version',
  sheetUrl:  'mwl_sheet_url',
  wstandard: 'mwl_wstandard',           // WorkStandard local cache
  profile:   'mwl_profile',             // {name, role}
  rounding:  'mwl_rounding',            // 0 | 5 | 10 | 15
  taskDefs:  'mwl_task_definitions',    // [{id,name,billable}]              — global task definitions       // last open settings tab
  crmSync:   'mwl_crm_sync',           // last task-defs sync timestamp
};

/* ── Runtime state ── */
const ST = {
  cat: 'entry', dur: 'duration',
  sumPer: 'day', sumOff: 0,
  swReg: null, install: null,
  swX: 0, swY: 0, pullY: 0, pulling: false, _reloading: false,
};

/* ── Utilities ── */
const $ = id => document.getElementById(id);
const pad = n => String(n).padStart(2, '0');
const isoD = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const timeS = (d = new Date()) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

function store(key, val) {
  if (val === undefined) {
    try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
  }
  localStorage.setItem(key, JSON.stringify(val));
}

const getP   = () => { const p = store(K.prefs) || {}; return { vibration:true, animations:true, pullRefresh:false, workDays:[0,1,2,3,4], ...p }; };
const buzz   = (p = [30]) => { if (getP().vibration && navigator.vibrate) navigator.vibrate(p); };
const fmtD   = d => { const [y,m,day] = d.split('-'); return `${day}/${m}/${y}`; };
const fmtT   = tt => {
  if (!tt) return '';
  if (tt.includes('-')) return tt;
  const [h,m] = tt.split(':');
  return `${pad(parseInt(h))}:${pad(parseInt(m||0))}`;
};
const catLbl = cat => t({ entry:'catEntry', exit:'catExit', task:'catTask' }[cat]) || cat;

/* toast() moved to index.html — bridges to NotificationSystem v3.8.0 */

/* ── BOOT ── */

