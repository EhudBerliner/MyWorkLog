/* ═══════════════════════════════════════════════════════
   MyWorkLog · App Core  v4.4.9
   ═══════════════════════════════════════════════════════ */

/* ── CONSTANTS & STATE ── */
const VER = '4.4.9';
const K = {
  ep: 'mwl_endpoint',
  sheetUrl: 'mwl_sheet_url',
  reps: 'mwl_reports',
  q: 'mwl_queue',
  delQ: 'mwl_delete_queue',
  proj: 'mwl_projects',
  theme: 'mwl_theme',
  lang: 'mwl_lang',
  prefs: 'mwl_prefs',
  wstandard: 'mwl_wstandard',
  ver: 'mwl_version',
  profile: 'mwl_profile',
  rounding: 'mwl_rounding'
};

const ST = {
  cat: 'entry',
  dur: 'duration',
  sumPer: 'day',
  sumOff: 0,
  swX: 0,
  swY: 0,
  pullY: 0,
  pulling: false,
  swReg: null
};

/* ── LOGGING SYSTEM ── */
const LOG_KEY = 'mwl_boot_logs';
const MAX_LOGS = 50;

const Logger = {
  log(level, message, details = null) {
    const timestamp = new Date().toISOString();
    const entry = { timestamp, level, message, details: details ? String(details) : null };
    const consoleMethod = level === 'ERROR' ? 'error' : (level === 'WARN' ? 'warn' : 'log');
    console[consoleMethod](`[${level}] ${message}`, details || '');

    try {
      const logs = JSON.parse(localStorage.getItem(LOG_KEY) || '[]');
      logs.push(entry);
      if (logs.length > MAX_LOGS) logs.shift();
      localStorage.setItem(LOG_KEY, JSON.stringify(logs));
    } catch (e) {
      console.warn('Failed to write log to localStorage:', e);
    }
  },
  info(msg, details) { this.log('INFO', msg, details); },
  warn(msg, details) { this.log('WARN', msg, details); },
  error(msg, details) { this.log('ERROR', msg, details); },
  getLogs() { try { return JSON.parse(localStorage.getItem(LOG_KEY) || '[]'); } catch { return []; } },
  clear() { localStorage.removeItem(LOG_KEY); }
};

window.addEventListener('error', (e) => Logger.error('Uncaught Exception', `${e.message} at ${e.filename}:${e.lineno}`));
window.addEventListener('unhandledrejection', (e) => Logger.error('Unhandled Promise Rejection', e.reason));

/* ── HELPER UTILITIES ── */
function $(id) { return document.getElementById(id); }
function store(k, v) {
  if (v === undefined) {
    try { return JSON.parse(localStorage.getItem(k)); } catch { return localStorage.getItem(k); }
  }
  if (v === null) { localStorage.removeItem(k); return; }
  localStorage.setItem(k, typeof v === 'object' ? JSON.stringify(v) : v);
}
function pad(n) { return String(n).padStart(2, '0'); }
function isoD(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function timeS(d) { return `${pad(d.getHours())}:${pad(d.getMinutes())}`; }
function fmtD(ds) { if (!ds) return ''; const [y, m, d] = ds.split('-'); return `${d}/${m}/${y}`; }
function fmtT(t) { return t || ''; }
function catLbl(c) { return { entry: '🟢 כניסה', exit: '🔴 יציאה', task: '📋 משימה' }[c] || c; }
function getP() { return store(K.prefs) || { vibration: true, animations: true, pullRefresh: false, workDays: [0, 1, 2, 3, 4] }; }
function buzz(pattern = [20]) { if (getP().vibration && navigator.vibrate) navigator.vibrate(pattern); }

/* ── BOOT SAFEGUARDS ── */
function safeSplashExit(timerId) {
  if (timerId) clearTimeout(timerId);
  setTimeout(() => {
    forceAppShow();
    if (typeof applyLang === 'function') applyLang(window._lang || 'he');
    if (typeof summaryRender === 'function') summaryRender();
    if (typeof updateMenuSheetLink === 'function') updateMenuSheetLink();
  }, 300);
}

function forceAppShow() {
  const app = $('app');
  if (app) app.classList.remove('hidden');
  const splash = $('splash');
  if (splash) {
    splash.classList.add('out');
    setTimeout(() => { if (splash.parentNode) splash.remove(); }, 400);
  }
}

function fixStoredDates() {
  const normDate = s => {
    if (!s) return '';
    const t = String(s).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
    const slash = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (slash) return `${slash[3]}-${slash[2].padStart(2, '0')}-${slash[1].padStart(2, '0')}`;
    const d = new Date(s);
    if (!isNaN(d.getTime())) return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    return t;
  };
  const reps = store(K.reps) || [];
  let changed = false;
  reps.forEach(r => {
    const fd = normDate(r.report_date);
    if (fd !== r.report_date) { r.report_date = fd; changed = true; }
    if (r.category === 'entry' || r.category === 'exit') {
      const ft = normTimeStr(r.report_time);
      if (ft !== r.report_time) { r.report_time = ft; changed = true; }
    }
  });
  if (changed) { store(K.reps, reps); Logger.info('fixStoredDates normalised stored records'); }
}

function normTimeStr(v) {
  if (!v) return '';
  if (typeof v === 'object' && v instanceof Date) return `${pad(v.getHours())}:${pad(v.getMinutes())}`;
  const s = String(v).trim();
  if (!s) return '';
  if (/^\d{1,2}:\d{2}-\d{1,2}:\d{2}/.test(s)) return s;
  const hms = s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (hms) return `${pad(hms[1])}:${hms[2]}`;
  const n = parseFloat(s);
  if (!isNaN(n) && n >= 0 && n < 1) {
    const tot = Math.round(n * 1440);
    return `${pad(Math.floor(tot / 60))}:${pad(tot % 60)}`;
  }
  const dm = s.match(/(\d{1,2}):(\d{2})(?::\d{2})?/);
  if (dm) return `${pad(dm[1])}:${dm[2]}`;
  return s;
}

function verCheck() {
  const prev = store(K.ver);
  if (prev && prev !== VER) {
    if ('caches' in window) caches.keys().then(ks => ks.forEach(k => caches.delete(k)));
    migrateData(prev);
    Logger.info(`App upgraded from ${prev} to ${VER}`);
  }
  store(K.ver, VER);
  document.querySelectorAll('.vbadge').forEach(el => el.textContent = typeof t === 'function' ? t('versionLabel', VER) : `v${VER}`);
}

function migrateData(prevVer) {
  if (!store(K.wstandard)) store(K.wstandard, []);
  if (!store('mwl_wstandard_queue')) store('mwl_wstandard_queue', []);
  if (!store(K.profile)) store(K.profile, { name: '', role: '' });
  if (store(K.rounding) === null) store(K.rounding, 0);
}

/* ── UI & THEME INITIALIZATION ── */
function themeInit() {
  const s = store(K.theme);
  const dark = s !== null ? s === 'dark' : window.matchMedia('(prefers-color-scheme:dark)').matches;
  applyTheme(dark ? 'dark' : 'light');
}

function applyTheme(th) {
  const dark = th === 'dark';
  document.body.classList.toggle('light', !dark);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = dark ? '#0a0a0f' : '#f0f0f6';
  store(K.theme, th);
  const btn = $('menu-theme-btn');
  if (btn && typeof t === 'function') {
    btn.textContent = dark ? t('menuThemeLight') : t('menuThemeDark');
    btn.classList.toggle('theme-active', dark);
  }
  themeSettingsSync();
}

function themeSettingsSync() {
  const isDark = !document.body.classList.contains('light');
  const lbl = $('theme-label-settings');
  if (lbl) lbl.textContent = isDark ? '🌙 מצב כהה' : '☀️ מצב בהיר';
}

function prefsApply() { if (!getP().animations) document.body.classList.add('no-anim'); }

function prefsLoadUI() {
  const p = getP();
  if ($('pref-vibration')) $('pref-vibration').checked = p.vibration !== false;
  if ($('pref-animations')) $('pref-animations').checked = p.animations !== false;
  if ($('pref-pull-refresh')) $('pref-pull-refresh').checked = p.pullRefresh === true;
  const wd = p.workDays || [0, 1, 2, 3, 4];
  document.querySelectorAll('.pref-workday-cb').forEach(cb => { cb.checked = wd.includes(Number(cb.dataset.day)); });
}

function prefsSave() {
  const workDays = [];
  document.querySelectorAll('.pref-workday-cb:checked').forEach(cb => workDays.push(Number(cb.dataset.day)));
  const p = {
    vibration: $('pref-vibration').checked,
    animations: $('pref-animations').checked,
    pullRefresh: $('pref-pull-refresh').checked,
    workDays: workDays.length ? workDays : [0, 1, 2, 3, 4]
  };
  store(K.prefs, p);
  document.body.classList.toggle('no-anim', !p.animations);
}

function dtInit() {
  const n = new Date();
  if ($('report-date')) $('report-date').value = isoD(n);
  if ($('report-time')) $('report-time').value = applyRounding(timeS(n));
}

function tabsInit() {
  document.querySelectorAll('.tab-btn').forEach(b => b.addEventListener('click', () => switchTab(b.dataset.tab)));
}

function switchTab(name) {
  menuClose();
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelector(`.tab-btn[data-tab="${name}"]`)?.classList.add('active');
  $(`tab-${name}`)?.classList.add('active');
  try {
    if (name === 'history') histRender();
    if (name === 'summary') summaryRender();
  } catch (e) { Logger.error('switchTab render error', e); }
  buzz([15]);
  if (window.history && window.history.pushState) {
    history.pushState({ ui: 'tab', name }, '');
  }
}

function menuInit() {
  $('btn-hamburger')?.addEventListener('click', menuOpen);
  $('btn-close-menu')?.addEventListener('click', menuClose);
  $('menu-overlay')?.addEventListener('click', menuClose);
  $('menu-settings-btn')?.addEventListener('click', () => { menuClose(); openM('modal-settings'); });
  $('menu-help-btn')?.addEventListener('click', () => { menuClose(); openM('modal-help'); });
  $('menu-gs-btn')?.addEventListener('click', () => { menuClose(); downloadGS(); });
  $('menu-import-btn')?.addEventListener('click', () => { menuClose(); openImportModal(); });
  $('menu-theme-btn')?.addEventListener('click', () => {
    applyTheme(document.body.classList.contains('light') ? 'dark' : 'light');
    buzz([20]);
  });
  document.querySelectorAll('.menu-item[data-tab]').forEach(el => el.addEventListener('click', () => switchTab(el.dataset.tab)));
  updateMenuSheetLink();
  $('menu-wstandard-btn')?.addEventListener('click', () => { menuClose(); openWorkcalSettings(); });
}

function updateMenuSheetLink() {
  const su = store(K.sheetUrl);
  const el = $('menu-sheet-link');
  if (el) { el.style.display = su ? 'flex' : 'none'; if (su) el.href = su; }
}

function menuOpen() {
  $('side-menu')?.classList.add('open');
  $('menu-overlay')?.classList.remove('hidden');
  $('side-menu')?.setAttribute('aria-hidden', 'false');
  if (window.history && window.history.pushState) history.pushState({ ui: 'menu' }, '');
  buzz([20]);
}

function menuClose() {
  $('side-menu')?.classList.remove('open');
  $('menu-overlay')?.classList.add('hidden');
  $('side-menu')?.setAttribute('aria-hidden', 'true');
}

/* ── REPORT & SESSION FORM ── */
function getOpenSession(reports) {
  const today = isoD(new Date());
  const todayReps = reports.filter(r => r.report_date === today);
  const entries = todayReps.filter(r => r.category === 'entry').sort((a, b) => a.report_time > b.report_time ? -1 : 1);
  const exits = todayReps.filter(r => r.category === 'exit').map(r => r.report_time).sort();
  for (const en of entries) {
    const paired = exits.find(exT => exT >= en.report_time);
    if (!paired) return en;
  }
  return null;
}

function validateEntry(date, reports) {
  const today = isoD(new Date());
  if (date !== today) return null;
  const open = getOpenSession(reports);
  if (open) return (typeof t === 'function' ? t('sessionBlockEntry') : 'הנך כבר רשום כנמצא') + ` (כניסה ${open.report_time})`;
  return null;
}

function validateExit(date, reports) {
  const today = isoD(new Date());
  if (date !== today) return null;
  const open = getOpenSession(reports);
  if (!open) return typeof t === 'function' ? t('sessionBlockExit') : 'לא נמצאה כניסה פעילה להיום';
  return null;
}

function updateSessionBanner() {
  const banner = $('session-banner');
  const txt = $('session-banner-text');
  if (!banner || !txt) return;
  const reports = store(K.reps) || [];
  const open = getOpenSession(reports);
  const today = isoD(new Date());
  const { mins: accMins } = calcDayWorkMins(today, reports);
  const accStr = accMins > 0 ? ` · בפועל: ${minsToHHMM(accMins)}` : '';

  if (open) {
    banner.className = 'session-banner open';
    banner.querySelector('.session-dot')?.classList.add('pulse');
    txt.textContent = (typeof t === 'function' ? t('sessionOpen') : 'בפנים מ-') + open.report_time + accStr;
  } else {
    banner.className = 'session-banner closed';
    banner.querySelector('.session-dot')?.classList.remove('pulse');
    txt.textContent = accMins > 0 
      ? (typeof t === 'function' ? t('sessionClosedWithHours') : 'לא נמצאת') + accStr 
      : (typeof t === 'function' ? t('sessionClosed') : 'לא דווחה כניסה להיום');
  }
}

function catInit() {
  document.querySelectorAll('.cat-btn').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    ST.cat = btn.dataset.cat;
    if ($('task-fields')) $('task-fields').style.display = ST.cat === 'task' ? 'flex' : 'none';
    updateSessionBanner();
    buzz([15]);
  }));
  if ($('task-fields')) $('task-fields').style.display = 'none';
  updateSessionBanner();
}

function durInit() {
  document.querySelectorAll('.seg-btn[data-mode]').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('.seg-btn[data-mode]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    ST.dur = btn.dataset.mode;
    if ($('duration-mode')) $('duration-mode').style.display = ST.dur === 'duration' ? 'flex' : 'none';
    if ($('range-mode')) $('range-mode').style.display = ST.dur === 'range' ? 'flex' : 'none';
  }));
}

let _ch = 0, _cm = 0;
function clockUpdate() {
  if ($('dur-h-val')) $('dur-h-val').textContent = pad(_ch);
  if ($('dur-m-val')) $('dur-m-val').textContent = pad(_cm);
  if ($('dur-hours')) $('dur-hours').value = _ch;
  if ($('dur-minutes')) $('dur-minutes').value = _cm;
}

function clockInit() {
  $('dur-h-up')?.addEventListener('click', () => { _ch = (_ch + 1) % 25; clockUpdate(); buzz([10]); });
  $('dur-h-dn')?.addEventListener('click', () => { _ch = (_ch - 1 + 25) % 25; clockUpdate(); buzz([10]); });
  $('dur-m-up')?.addEventListener('click', () => { _cm = (_cm + 15) % 60; clockUpdate(); buzz([10]); });
  $('dur-m-dn')?.addEventListener('click', () => { _cm = (_cm - 15 + 60) % 60; clockUpdate(); buzz([10]); });
  document.querySelectorAll('.clock-preset').forEach(btn => btn.addEventListener('click', () => {
    const [h, m] = btn.dataset.dur.split(':').map(Number);
    _ch = h; _cm = m; clockUpdate(); buzz([15]);
  }));
}

function resetForm() {
  document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
  document.querySelector('.cat-btn[data-cat="entry"]')?.classList.add('active');
  ST.cat = 'entry';
  if ($('task-fields')) $('task-fields').style.display = 'none';
  if ($('task-project')) $('task-project').value = '';
  if ($('task-desc')) $('task-desc').value = '';
  _ch = 0; _cm = 0; clockUpdate();
  document.querySelectorAll('.seg-btn[data-mode]').forEach(b => b.classList.remove('active'));
  document.querySelector('.seg-btn[data-mode="duration"]')?.classList.add('active');
  ST.dur = 'duration';
  if ($('duration-mode')) $('duration-mode').style.display = 'flex';
  if ($('range-mode')) $('range-mode').style.display = 'none';
  if ($('range-start')) $('range-start').value = '';
  if ($('range-end')) $('range-end').value = '';

  const n = new Date();
  if ($('report-date')) $('report-date').value = isoD(n);
  if ($('report-time')) $('report-time').value = applyRounding(timeS(n));
}

function submitInit() {
  $('btn-submit')?.addEventListener('click', async () => {
    const date = $('report-date')?.value, time = $('report-time')?.value;
    if (!date || !time) { toast(typeof t === 'function' ? t('toastNoTime') : 'יש לבחור תאריך ושעה', 'warn'); buzz([80]); return; }

    const reports = store(K.reps) || [];
    if (ST.cat === 'entry') {
      const err = validateEntry(date, reports);
      if (err) { toast('⛔ ' + err, 'warn', 5000); buzz([80, 80]); return; }
    }
    if (ST.cat === 'exit') {
      const err = validateExit(date, reports);
      if (err) { toast('⛔ ' + err, 'warn', 5000); buzz([80, 80]); return; }
    }

    const rep = buildRep(date, time);
    if (!rep) return;

    await dispatchAction({ action: 'create', payload: rep }, $('btn-submit'));
    resetForm();
    buzz([30, 20, 60]);
  });

  $('btn-sync')?.addEventListener('click', async () => {
    const btn = $('btn-sync');
    if (!btn || btn.dataset.syncing === '1') return;
    btn.dataset.syncing = '1';
    btn.disabled = true;
    btn.textContent = '⏳';
    try { await syncQ(); } finally {
      btn.disabled = false;
      btn.textContent = btn.getAttribute('data-i18n-orig') || '↑ שלח';
      delete btn.dataset.syncing;
    }
  });
}

function buildRep(date, time) {
  const cat = ST.cat;
  let rTime = time, desc = '', proj = '', workDuration = '';
  if (cat === 'task') {
    desc = $('task-desc')?.value.trim() || '';
    proj = $('task-project')?.value.trim() || '';
    if (!proj) {
      const inp = $('task-project');
      if (inp) {
        inp.classList.remove('input-err');
        void inp.offsetWidth;
        inp.classList.add('input-err');
        inp.focus();
        setTimeout(() => inp.classList.remove('input-err'), 1500);
      }
      toast(typeof t === 'function' ? t('toastNoDesc') : 'יש להזין שם פרויקט', 'warn');
      buzz([80, 40, 80]);
      return null;
    }
    const ps = store(K.proj) || [];
    if (proj && !ps.includes(proj)) { ps.push(proj); store(K.proj, ps); projLoad(); }
    if (ST.dur === 'duration') {
      const h = parseInt($('dur-hours')?.value || '0'), m = parseInt($('dur-minutes')?.value || '0');
      if (!h && !m) { toast(typeof t === 'function' ? t('toastNoDuration') : 'יש להזין משך זמן', 'warn'); buzz([80]); return null; }
      rTime = `${pad(h)}:${pad(m)}`;
    } else {
      const s = $('range-start')?.value, e =$('range-end')?.value;
      if (!s || !e) { toast(typeof t === 'function' ? t('toastNoRange') : 'יש לבחור שעת התחלה וסיום', 'warn'); buzz([80]); return null; }
      rTime = `${s}-${e}`;
    }
  }

  if (cat === 'entry' || cat === 'exit') rTime = applyRounding(rTime);

  if (cat === 'exit') {
    const reports = store(K.reps) || [];
    const openSession = getOpenSession(reports);
    if (openSession && openSession.report_time) {
      const [eh, em] = openSession.report_time.split(':').map(Number);
      const [xh, xm] = rTime.split(':').map(Number);
      const diffMins = (xh * 60 + xm) - (eh * 60 + em);
      if (diffMins > 0) workDuration = minsToHHMM(diffMins);
    }
  }

  return {
    id: Date.now() + Math.random().toString(36).slice(2),
    timestamp: new Date().toISOString(),
    report_date: date,
    report_time: rTime,
    category: cat,
    description: desc,
    project: proj,
    workDuration: workDuration
  };
}

/* ── STORAGE & DATA PIPELINE ── */
function markSent(id) {
  const rs = store(K.reps) || [];
  const r = rs.find(x => x.id === id);
  if (r) r.sent = true;
  store(K.reps, rs);
}

function addQ(r) {
  const q = store(K.q) || [];
  if (!q.find(x => x.id === r.id)) q.push(r);
  store(K.q, q);
}

function pendUI() {
  const q = store(K.q) || [];
  if ($('pending-section'))$('pending-section').classList.toggle('hidden', !q.length);
  if ($('pending-count'))$('pending-count').textContent = q.length;
}

async function dispatchAction(actionEvent, uiButton = null) {
  const { action, payload } = actionEvent;
  const ep = store(K.ep);
  let origText = '';
  if (uiButton) {
    origText = uiButton.getAttribute('data-orig-text') || uiButton.innerHTML;
    if (!uiButton.getAttribute('data-orig-text')) uiButton.setAttribute('data-orig-text', origText);
    uiButton.disabled = true;
    uiButton.innerHTML = '⏳ ממתין לשרת...';
  }

  let reqBody;
  let successMsg = '';
  if (action === 'delete') {
    reqBody = { action: 'delete', id: payload.id, category: payload.category, report_date: payload.report_date };
    successMsg = '🗑️ דיווח נמחק';
  } else if (action === 'update') {
    reqBody = { action: 'editReport', ...payload };
    successMsg = '✅ דיווח עודכן';
  } else {
    reqBody = { ...payload };
    successMsg = payload.category === 'exit' && payload.workDuration 
      ? `🔴 יציאה נרשמה (סך הכל: ${payload.workDuration} שעות)` 
      : '✅ הדיווח נשמר בגיליון';
  }

  let isSuccess = false;
  let isOffline = !navigator.onLine;

  if (ep && !isOffline) {
    try {
      const fetchPromise = fetch(ep, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
        body: JSON.stringify(reqBody),
        mode: 'no-cors',
        keepalive: true,
        priority: 'high'
      });
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2500));
      await Promise.race([fetchPromise, timeoutPromise]);
      isSuccess = true;
    } catch (err) {
      isSuccess = navigator.onLine;
    }
  }

  try {
    let reps = store(K.reps) || [];
    if (action === 'create') {
      payload.sent = isSuccess;
      reps.unshift(payload);
      reps = reps.slice(0, 300);
      if (!isSuccess) addQ(payload);
    } else if (action === 'update') {
      payload.sent = isSuccess;
      const idx = reps.findIndex(r => r.id === payload.id);
      if (idx >= 0) {
        const localPayload = { ...payload };
        delete localPayload.old_date;
        reps[idx] = localPayload;
      }
      if (!isSuccess) addQ(payload);
    } else if (action === 'delete') {
      reps = reps.filter(r => r.id !== payload.id);
      store(K.q, (store(K.q) || []).filter(r => r.id !== payload.id));
      if (!isSuccess) {
        const dq = store(K.delQ) || [];
        dq.push(payload);
        store(K.delQ, dq);
      }
    }
    store(K.reps, reps);
    pendUI();
  } finally {
    if (uiButton) {
      uiButton.disabled = false;
      uiButton.innerHTML = uiButton.getAttribute('data-orig-text') || origText;
    }
  }

  if (isSuccess) toast(successMsg, 'success', 2500);
  else if (!ep) toast('⚠️ לא מוגדר חיבור - נשמר מקומית בלבד', 'warn', 3500);
  else toast('⚠️ נשמר מקומית - יישלח בסנכרון הבא', 'warn', 3500);

  histRender();
  summaryRender();
  updateSessionBanner();

  return isSuccess;
}

function netInit() {
  window.addEventListener('online', () => {
    localStorage.removeItem('mwl_last_full_sync');
    syncQ().then(() => bgSync());
  });
  pendUI();
}

function netQInit() {
  const c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (!c) return;
  const chk = () => { if (c.saveData || ['2g', 'slow-2g'].includes(c.effectiveType)) toast(typeof t === 'function' ? t('toastSlowData') : '⚠️ חיבור איטי', 'warn', 5000); };
  c.addEventListener('change', chk); chk();
}

/* ── HISTORY & SUMMARY RENDERING ── */
function histRender() {
  const now = new Date(), cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - 30);
  const rs = (store(K.reps) || [])
    .filter(r => { const d = new Date(r.timestamp || r.report_date); return d >= cutoff; })
    .sort((a, b) => {
      const keyA = (a.report_date || '') + 'T' + (a.report_time && !a.report_time.includes('-') ? a.report_time : '00:00');
      const keyB = (b.report_date || '') + 'T' + (b.report_time && !b.report_time.includes('-') ? b.report_time : '00:00');
      return keyB > keyA ? 1 : keyB < keyA ? -1 : 0;
    })
    .slice(0, 200);
  if ($('history-list')) {$('history-list').innerHTML = rs.length 
      ? rs.map(r => hItem(r, true)).join('') 
      : `<p class="empty">${typeof t === 'function' ? t('historyEmpty') : 'אין דיווחים עדיין'}</p>`;
  }
}

function hItem(r, showDel = false) {
  const actBtns = showDel ? `<div style="display:flex;gap:5px;flex-shrink:0"><button class="btn-g sm" onclick="openEditReport('${r.id}')" style="padding:4px 8px;font-size:.7rem" title="ערוך">✏️</button><button class="btn-d sm" onclick="delReport('${r.id}')" style="padding:4px 8px;font-size:.7rem" title="מחק">🗑</button></div>` : '';
  return `<div class="hitem" data-id="${r.id}"><div class="hdot ${r.category}"></div><div class="hmeta"><div class="htitle">${r.description || catLbl(r.category)}</div><div class="hsub">${fmtD(r.report_date)} · ${fmtT(r.report_time)}${r.project ? ' · ' + r.project : ''}${r.workDuration ? ' · ⏱' + r.workDuration : ''}</div></div><span class="hbadge ${r.category}">${catLbl(r.category)}</span>${actBtns}</div>`;
}

/* ── WORKSTANDARD & CALCULATIONS ── */
function getWStandard() { return store(K.wstandard) || []; }
function saveWStandardLocal(arr) { store(K.wstandard, arr); }

function classifyNotes(notes) {
  if (!notes) return 'normal';
  const n = notes.trim().toLowerCase();
  if (/שבתון|sabbatical|לא זמין|חופשה ממושכת/.test(n)) return 'sabbatical';
  if (/חג|holiday/.test(n)) return 'holiday';
  if (/חופש|vacation|חופשה/.test(n)) return 'vacation';
  if (/מחלה|חלה|חולה|sick|ill/.test(n)) return 'sick';
  return 'normal';
}

function getDayStd(ds) {
  const row = getWStandard().find(r => r.date === ds);
  if (!row) {
    const dow = new Date(ds).getDay();
    const workDays = getP().workDays || [0, 1, 2, 3, 4];
    if (!workDays.includes(dow)) return { stdHours: 0, notes: '', description: '', isWorkDay: false, dayType: 'weekend' };
    return { stdHours: 0, notes: '', description: '', isWorkDay: false, dayType: 'normal' };
  }
  const h = parseFloat(row.stdHours) || 0;
  const notes = row.notes || '';
  const description = row.description || '';
  let dayType = classifyNotes(notes);
  if (dayType === 'normal' && h === 0) {
    const dow = new Date(ds).getDay();
    const workDays = getP().workDays || [0, 1, 2, 3, 4];
    if (!workDays.includes(dow)) dayType = 'weekend';
  }
  return { stdHours: h, notes, description, isWorkDay: h > 0, dayType };
}

function hebDow(ds) { const HEB_DOW = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']; return HEB_DOW[new Date(ds).getDay()]; }

function parseTaskMins(rt) {
  if (!rt) return 0;
  if (rt.includes('-')) {
    const [s, e] = rt.split('-');
    if (!s || !e) return 0;
    const [sh, sm] = s.split(':').map(Number);
    const [eh, em] = e.split(':').map(Number);
    const d = (eh * 60 + em) - (sh * 60 + sm);
    return d > 0 ? d : 0;
  }
  const [h, m] = rt.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function calcDayWorkMins(ds, reports) {
  const dr = reports.filter(r => r.report_date === ds);
  const entries = dr.filter(r => r.category === 'entry').map(r => r.report_time).filter(Boolean).sort();
  const exits = dr.filter(r => r.category === 'exit').map(r => r.report_time).filter(Boolean).sort();

  let totalMins = 0;
  const pairs = [];
  const usedExits = new Set();

  for (const enT of entries) {
    const matchExit = exits.find(exT => exT >= enT && !usedExits.has(exT));
    if (matchExit) {
      usedExits.add(matchExit);
      const [eh, em] = enT.split(':').map(Number);
      const [xh, xm] = matchExit.split(':').map(Number);
      const diff = (xh * 60 + xm) - (eh * 60 + em);
      if (diff > 0) { totalMins += diff; pairs.push({ entry: enT, exit: matchExit, mins: diff }); }
    }
  }

  const pairedEntries = new Set(pairs.map(p => p.entry));
  const hasOpen = entries.some(e => !pairedEntries.has(e));

  if (pairs.length > 0) return { mins: totalMins, fromTasks: false, pairs, hasOpen };

  const tasks = dr.filter(r => r.category === 'task');
  if (!tasks.length) return { mins: 0, fromTasks: false, pairs: [], hasOpen };
  const total = tasks.reduce((s, r) => s + parseTaskMins(r.report_time), 0);
  return { mins: total, fromTasks: true, pairs: [], hasOpen };
}

function getDayStatus(ds, reports) {
  const { stdHours, notes, description, isWorkDay, dayType } = getDayStd(ds);
  let { mins: actualMins, fromTasks, pairs, hasOpen } = calcDayWorkMins(ds, reports);
  const minMins = Math.round(stdHours * 60);
  const isPaidAbsence = ['vacation', 'sick', 'holiday', 'sabbatical'].includes(dayType);

  if (isPaidAbsence && minMins > 0) {
    if (actualMins < minMins) { actualMins = minMins; fromTasks = false; }
  }

  const wdStr = actualMins > 0 ? `${pad(Math.floor(actualMins / 60))}:${pad(actualMins % 60)}` : '-';

  if (!isWorkDay && !isPaidAbsence) {
    const st = dayType !== 'normal' && dayType !== 'weekend' ? dayType : (dayType === 'weekend' ? 'weekend' : 'nostandard');
    return { status: st, actualMins, minMins: 0, diffMins: actualMins, wdStr, notes, description, pct: null, fromTasks, dayType, pairs, hasOpen };
  }

  const diffMins = actualMins - minMins;
  const status = isPaidAbsence && diffMins === 0 ? dayType : (diffMins >= 0 ? 'ok' : 'deficit');
  const pct = minMins > 0 ? Math.min(999, Math.round(actualMins / minMins * 100)) : 100;

  return { status, actualMins, minMins, diffMins, wdStr, notes, description, pct, fromTasks, dayType, pairs, hasOpen };
}

function minsToHHMM(m) {
  if (!m && m !== 0) return '0:00';
  const sign = m < 0 ? '-' : ''; const abs = Math.abs(m);
  return `${sign}${Math.floor(abs / 60)}:${pad(abs % 60)}`;
}

function summaryInit() {
  document.querySelectorAll('.sum-tab').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('.sum-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active'); ST.sumPer = btn.dataset.period; ST.sumOff = 0; summaryRender();
  }));
  $('sum-prev')?.addEventListener('click', () => { ST.sumOff--; summaryRender(); buzz([15]); });$('sum-next')?.addEventListener('click', () => { ST.sumOff++; summaryRender(); buzz([15]); });
  $('btn-today')?.addEventListener('click', () => { goToday(); buzz([15]); });$('btn-range-go')?.addEventListener('click', () => summaryRender());
}

function goToday() { ST.sumOff = 0; summaryRender(); }

function summaryRender() {
  const rs = store(K.reps) || [], now = new Date(); let fil = [], lbl = '';
  const lblEl = $('sum-period-label') || $('sum-lbl');
  if (ST.sumPer === 'day') {
    const tgt = new Date(now); tgt.setDate(tgt.getDate() + ST.sumOff);
    const ds = isoD(tgt); fil = rs.filter(r => r.report_date === ds); lbl = fmtD(ds);
    const { mins: dayMins, hasOpen } = calcDayWorkMins(ds, rs);
    let wdStr = dayMins > 0 ? `${pad(Math.floor(dayMins / 60))}:${pad(dayMins % 60)}` : '-';
    if (hasOpen) wdStr += ' ⬤';
    if ($('stat-workday'))$('stat-workday').textContent = wdStr;
    if ($('stat-workday-card'))$('stat-workday-card').style.display = '';
    if ($('stat-days-card'))$('stat-days-card').style.display = 'none';
    if ($('monthly-wc-section'))$('monthly-wc-section').style.display = 'none';
    if ($('annual-section'))$('annual-section').style.display = 'none';
    if ($('range-period-inputs'))$('range-period-inputs').style.display = 'none';
    renderDayWCStatus(ds, rs);
    if ($('sum-prev'))$('sum-prev').disabled = false;
    if ($('sum-next'))$('sum-next').disabled = false;
  } else if (ST.sumPer === 'month') {
    const tgt = new Date(now.getFullYear(), now.getMonth() + ST.sumOff, 1);
    const y = tgt.getFullYear(), mo = tgt.getMonth();
    fil = rs.filter(r => { const d = new Date(r.report_date); return d.getFullYear() === y && d.getMonth() === mo; });
    lbl = `${tgt.toLocaleString('he-IL', { month: 'long' })} ${y}`;
    if ($('day-wc-section'))$('day-wc-section').style.display = 'none';
    if ($('annual-section'))$('annual-section').style.display = 'none';
    if ($('monthly-wc-section'))$('monthly-wc-section').style.display = '';
    if ($('range-period-inputs'))$('range-period-inputs').style.display = 'none';
    renderMonthlyWCStats(y, mo, rs);
    renderWCCalendar(y, mo, rs);
  }
  if (lblEl) lblEl.textContent = lbl;
  if ($('stat-entries'))$('stat-entries').textContent = fil.filter(r => r.category === 'entry').length;
  if ($('stat-exits'))$('stat-exits').textContent = fil.filter(r => r.category === 'exit').length;
}

function renderDayWCStatus(ds, reports) {
  const sec = $('day-wc-section'); if (!sec) return;
  const { status, actualMins, minMins, diffMins, wdStr, notes, description, pct, dayType } = getDayStatus(ds, reports);
  sec.style.display = '';
}

function renderMonthlyWCStats(year, month, reports) {
  const el = $('monthly-wc-stats'); if (!el) return;
  el.style.display = 'flex'; el.style.flexWrap = 'wrap';
}

function renderWCCalendar(year, month, reports) {
  const dowRow = $('wc-dow-row'), daysGrid =$('wc-days-grid');
  if (!dowRow || !daysGrid) return;
}

/* ── MODALS & PROJECT MANAGEMENT ── */
function projLoad() { const ps = store(K.proj) || []; if ($('projects-list'))$('projects-list').innerHTML = ps.map(p => `<option value="${p}">`).join(''); }
function projChipsRender() { if ($('projects-chips'))$('projects-chips').innerHTML = (store(K.proj) || []).map(p => `<div class="chip"><span>${p}</span><button class="chip-x" onclick="projRemove('${encodeURIComponent(p)}')">✕</button></div>`).join(''); }
function projRemove(encoded) { const name = decodeURIComponent(encoded); store(K.proj, (store(K.proj) || []).filter(p => p !== name)); projLoad(); projChipsRender(); }

function openM(id) {
  const el = $(id); if (el) el.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  if (id === 'modal-settings') {
    if ($('settings-endpoint'))$('settings-endpoint').value = store(K.ep) || '';
    if ($('settings-sheet-url'))$('settings-sheet-url').value = store(K.sheetUrl) || '';
    prefsLoadUI(); projChipsRender();
  }
}
function closeM(id) { const el = $(id); if (el) el.classList.add('hidden'); document.body.style.overflow = ''; }

function openImportModal() { openM('modal-import'); }
function openWorkcalSettings() { openM('modal-workcal'); }
function downloadGS() { Logger.info('GAS download requested'); }

/* ── DELTA & BACKGROUND SYNC ── */
function getDeltaStartDate() {
  const d = new Date();
  d.setDate(d.getDate() - 60);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

async function bgSync() {
  const ep = store(K.ep);
  if (!ep || !navigator.onLine) return;
  const reps = store(K.reps) || [];
  const q = store(K.q) || [];
  const qIds = new Set(q.map(r => r.id));
  const unsent = reps.filter(r => !r.sent && !qIds.has(r.id));
  if (unsent.length) { store(K.q, [...q, ...unsent]); pendUI(); }
  await syncQ_silent();
  const deltaDate = getDeltaStartDate();
  await syncFromSheet(deltaDate);
}

async function syncQ_silent() {
  const ep = store(K.ep); if (!ep || !navigator.onLine) return;
  const q = store(K.q) || []; if (!q.length) return;
  const fail = [];
  for (const r of q) {
    try {
      await fetch(ep, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=UTF-8' }, body: JSON.stringify(r), mode: 'no-cors', keepalive: true });
      markSent(r.id);
    } catch { fail.push(r); }
  }
  store(K.q, fail); pendUI();
}

async function syncQ() {
  const ep = store(K.ep); if (!ep || !navigator.onLine) return;
  const q = store(K.q) || []; if (!q.length) return;
  const snapshot = [...q]; store(K.q, []); pendUI();
  let ok = 0; const fail = [];
  for (const r of snapshot) {
    try {
      await fetch(ep, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=UTF-8' }, body: JSON.stringify(r), mode: 'no-cors', keepalive: true, priority: 'high' });
      markSent(r.id); ok++;
    } catch { fail.push(r); }
  }
  if (fail.length) {
    const current = store(K.q) || [];
    const ids = new Set(current.map(x => x.id));
    fail.forEach(r => { if (!ids.has(r.id)) current.push(r); });
    store(K.q, current);
  }
  pendUI();
  if (ok > 0 && typeof toast === 'function') toast(`✅ סונכרו ${ok} דיווחים`, 'success');
}

async function syncFromSheet(fromDate = '') {
  const ep = store(K.ep); if (!ep || !navigator.onLine) return 0;
  try {
    let url = ep + '?action=getReports';
    if (fromDate) url += `&fromDate=${fromDate}&t=${Date.now()}`;
    const res = await fetch(url, { cache: 'no-store' });
    const data = await res.json();
    if (!Array.isArray(data.reports)) return 0;
    
    let local = store(K.reps) || [];
    const serverReportIds = new Set(data.reports.map(r => String(r.id)));
    const localUnsent = local.filter(r => !r.sent && !serverReportIds.has(String(r.id)));
    
    const merged = [...data.reports, ...localUnsent];
    merged.sort((a, b) => (b.report_date + 'T' + (b.report_time || '00:00')).localeCompare(a.report_date + 'T' + (a.report_time || '00:00')));
    store(K.reps, merged.slice(0, 500));
    histRender(); updateSessionBanner();
    return data.reports.length;
  } catch (e) {
    Logger.warn('syncFromSheet Failure', e);
    return 0;
  }
}

/* ── SERVICE WORKER INITIALIZATION ── */
function swInit() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('./sw.js', { scope: './' }).then(reg => {
    ST.swReg = reg;
    if (reg.waiting && typeof showUpd === 'function') showUpd();
    reg.addEventListener('updatefound', () => {
      const sw = reg.installing;
      sw.addEventListener('statechange', () => {
        if (sw.state === 'installed' && navigator.serviceWorker.controller && typeof showUpd === 'function') showUpd();
      });
    });
  }).catch(e => Logger.warn('SW registration failed', e));
}

/* ── BOOT INITIALIZATION ── */
document.addEventListener('DOMContentLoaded', () => {
  // טיימר חילוץ של 2.5 שניות המבטיח שמסך הפתיחה ייעלם בכל מקרה
  const bootTimer = setTimeout(() => {
    safeSplashExit();
  }, 2500);

  try {
    if (typeof themeInit === 'function') themeInit();
    if (typeof fixStoredDates === 'function') fixStoredDates();
    if (typeof verCheck === 'function') verCheck();
    if (typeof dtInit === 'function') dtInit();
    if (typeof catInit === 'function') catInit();
    if (typeof durInit === 'function') durInit();
    if (typeof clockInit === 'function') clockInit();
    if (typeof submitInit === 'function') submitInit();
    if (typeof tabsInit === 'function') tabsInit();
    if (typeof menuInit === 'function') menuInit();
    if (typeof summaryInit === 'function') summaryInit();
    if (typeof projLoad === 'function') projLoad();
    if (typeof netInit === 'function') netInit();
    if (typeof netQInit === 'function') netQInit();
    if (typeof swInit === 'function') swInit();
    
    // סיווג וסנכרון ברקע
    if (typeof bgSync === 'function') bgSync();

    safeSplashExit(bootTimer);
  } catch (err) {
    if (typeof Logger !== 'undefined') Logger.error('Boot Execution Failed', err);
    safeSplashExit(bootTimer);
  }
});
