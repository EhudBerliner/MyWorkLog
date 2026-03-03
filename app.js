/* ═══════════════════════════════════════════════════════
   MyWorkLog · app.js  v1.4.0
   Main application logic
   Depends on: config.js (loaded first)
   ═══════════════════════════════════════════════════════ */

'use strict';

/* ── i18n helpers ────────────────────────────────────── */
function t(key, ...args) {
  const lang  = window._lang || 'he';
  const entry = I18N[key];
  if (!entry) return key;
  const raw = entry[lang] ?? entry.en ?? key;
  return typeof raw === 'function' ? raw(...args) : raw;
}
function applyLang(lang) {
  window._lang = lang;
  const rtl = lang === 'he';
  document.documentElement.lang = lang;
  document.documentElement.dir  = rtl ? 'rtl' : 'ltr';
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key  = el.dataset.i18n;
    const attr = el.dataset.i18nAttr || 'textContent';
    const val  = t(key);
    if      (attr === 'textContent') el.textContent = val;
    else if (attr === 'placeholder') el.placeholder = val;
    else el.setAttribute(attr, val);
  });
  localStorage.setItem('mwl_lang', lang);
}

/* ── App State ───────────────────────────────────────── */
const ST = {
  cat: 'entry', dur: 'duration', sumPer: 'day', sumOff: 0,
  swReg: null, install: null, swX: 0, swY: 0, pullY: 0, pulling: false,
};

/* ── Utilities ───────────────────────────────────────── */
const $ = id => document.getElementById(id);
const pad  = n => String(n).padStart(2, '0');
const isoD = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const timeS = (d = new Date()) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

function store(key, val) {
  if (val === undefined) { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } }
  localStorage.setItem(key, JSON.stringify(val));
}

const getP   = () => store(K.prefs) || { vibration: true, animations: true, pullRefresh: false };
const buzz   = (p = [30]) => { if (getP().vibration && navigator.vibrate) navigator.vibrate(p); };
const fmtD   = d => { const [y, m, day] = d.split('-'); return `${day}/${m}/${y}`; };
const fmtT   = t => { if (!t) return ''; if (t.includes('-')) return t; const [h, m] = t.split(':'); return `${pad(parseInt(h))}:${pad(parseInt(m||0))}`; };
const catLbl = cat => t({ entry:'catEntry', exit:'catExit', task:'catTask' }[cat]) || cat;

/* ── Toast ───────────────────────────────────────────── */
function toast(msg, type = 'success', ms = 2800) {
  const el = $('toast');
  el.textContent = msg;
  el.className = `toast ${type}`;
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.add('hidden'), ms);
}

/* ═══════════════════════════════════════════════════════
   BOOT
   ═══════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  verCheck(); themeInit(); langInit(); prefsApply();
  splashInit(); dtInit(); tabsInit(); catInit(); durInit(); clockInit();
  submitInit(); settingsInit(); summaryInit();
  $('btn-now').addEventListener('click', () => {
    const n = new Date();
    $('report-date').value = isoD(n);
    $('report-time').value = timeS(n);
    toast(t('toastNowUpdated')); buzz([20]);
  });
  netInit(); netQInit(); projInit(); histRender();
  menuInit(); vBadgeInit(); swipeInit(); ptrInit(); swInit(); installInit(); scrollInit();
  helpInit();
  syncQueueIndicatorInit();
});

/* ── Splash ──────────────────────────────────────────── */
function splashInit() {
  setTimeout(() => {
    $('splash').classList.add('out');
    setTimeout(() => {
      $('splash').remove();
      $('app').classList.remove('hidden');
      applyLang(window._lang || 'he');
      summaryRender();
    }, 420);
  }, 900);
}

/* ── Version ─────────────────────────────────────────── */
function verCheck() {
  const s = store(K.ver);
  if (s && s !== VER && 'caches' in window) caches.keys().then(ks => ks.forEach(k => caches.delete(k)));
  store(K.ver, VER);
  document.querySelectorAll('.vbadge').forEach(el => el.textContent = t('versionLabel', VER));
}
function vBadgeInit() {
  [$('version-badge'), $('menu-vbadge')].forEach(el => {
    if (!el) return;
    el.addEventListener('click', () => { buzz([20, 30, 20]); openM('modal-reset'); });
  });
  $('btn-close-reset').addEventListener('click',  () => closeM('modal-reset'));
  $('btn-reset-cancel').addEventListener('click', () => closeM('modal-reset'));
  $('btn-reset-confirm').addEventListener('click', hardReset);
}
async function hardReset() {
  const kR = $('reset-keep-reports').checked;
  const kS = $('reset-keep-settings').checked;
  const kQ = $('reset-keep-queue').checked;
  const sR = kR ? store(K.reps) : null;
  const sE = kS ? store(K.ep)   : null;
  const sP = kS ? store(K.proj) : null;
  const sQ = kQ ? store(K.q)    : null;
  localStorage.clear(); sessionStorage.clear();
  document.cookie.split(';').forEach(c =>
    document.cookie = c.replace(/^ +/, '').replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/')
  );
  if ('serviceWorker' in navigator)
    (await navigator.serviceWorker.getRegistrations()).forEach(r => r.unregister());
  if ('caches' in window)
    await Promise.all((await caches.keys()).map(k => caches.delete(k)));
  if ('indexedDB' in window) {
    const dbs = await (indexedDB.databases?.() ?? Promise.resolve([]));
    dbs.forEach(db => indexedDB.deleteDatabase(db.name));
  }
  if (sR) store(K.reps, sR);
  if (sE) store(K.ep,   sE);
  if (sP) store(K.proj, sP);
  if (sQ) store(K.q,    sQ);
  buzz([100, 50, 100]);
  window.location.reload(true);
}

/* ── Theme ───────────────────────────────────────────── */
function themeInit() {
  const s = store(K.theme), dark = s !== null ? s === 'dark' : window.matchMedia('(prefers-color-scheme:dark)').matches;
  applyTheme(dark ? 'dark' : 'light');
}
function applyTheme(th) {
  const dark = th === 'dark';
  document.body.classList.toggle('light', !dark);
  document.querySelector('meta[name="theme-color"]').content = dark ? '#0a0a0f' : '#f0f0f6';
  store(K.theme, th);
  // sync menu button label
  const btn = $('menu-theme-btn');
  if (btn) { btn.textContent = (dark ? '☀️' : '🌙') + ' ' + (dark ? 'מצב בהיר' : 'מצב כהה'); btn.classList.toggle('theme-active', dark); }
}

/* ── Language ────────────────────────────────────────── */
function langInit() { window._lang = store(K.lang) || 'he'; applyLang(window._lang); }

/* ── Preferences ─────────────────────────────────────── */
function prefsApply() { if (!getP().animations) document.body.classList.add('no-anim'); }
function prefsLoadUI() {
  const p = getP();
  $('pref-vibration').checked   = p.vibration  !== false;
  $('pref-animations').checked  = p.animations !== false;
  $('pref-pull-refresh').checked = p.pullRefresh === true;
}
function prefsSave() {
  const p = {
    vibration:   $('pref-vibration').checked,
    animations:  $('pref-animations').checked,
    pullRefresh: $('pref-pull-refresh').checked,
  };
  store(K.prefs, p);
  document.body.classList.toggle('no-anim', !p.animations);
}

/* ── Date / Time ─────────────────────────────────────── */
function dtInit() {
  const n = new Date();
  $('report-date').value = isoD(n);
  $('report-time').value = timeS(n);
}

/* ── Tabs ────────────────────────────────────────────── */
function tabsInit() {
  document.querySelectorAll('.tab-btn').forEach(b =>
    b.addEventListener('click', () => switchTab(b.dataset.tab))
  );
}
function switchTab(name) {
  document.querySelectorAll('.tab-btn').forEach(b  => b.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelector(`.tab-btn[data-tab="${name}"]`)?.classList.add('active');
  $(`tab-${name}`)?.classList.add('active');
  if (name === 'history') histRender();
  if (name === 'summary') summaryRender();
  buzz([15]); menuClose();
}

/* ── Menu ────────────────────────────────────────────── */
function menuInit() {
  $('btn-hamburger').addEventListener('click', menuOpen);
  $('btn-close-menu').addEventListener('click', menuClose);
  $('menu-overlay').addEventListener('click', menuClose);
  $('menu-settings-btn').addEventListener('click', () => { menuClose(); openM('modal-settings'); });
  $('menu-help-btn').addEventListener('click',     () => { menuClose(); openM('modal-help'); });
  $('menu-gs-btn')?.addEventListener('click',      () => { menuClose(); downloadGS(); });
  $('menu-theme-btn').addEventListener('click',    () => { applyTheme(document.body.classList.contains('light') ? 'dark' : 'light'); buzz([20]); });
  document.querySelectorAll('.menu-item[data-tab]').forEach(el =>
    el.addEventListener('click', () => switchTab(el.dataset.tab))
  );
  updateMenuSheetLink();
}
function updateMenuSheetLink() {
  const su = store(K.sheetUrl);
  const el = $('menu-sheet-link');
  if (el) { el.style.display = su ? 'flex' : 'none'; if (su) el.href = su; }
}
function menuOpen()  {
  $('side-menu').classList.add('open');
  $('menu-overlay').classList.remove('hidden');
  $('side-menu').setAttribute('aria-hidden', 'false');
  buzz([20]);
}
function menuClose() {
  $('side-menu').classList.remove('open');
  $('menu-overlay').classList.add('hidden');
  $('side-menu').setAttribute('aria-hidden', 'true');
}

/* ── Category ────────────────────────────────────────── */
function catInit() {
  document.querySelectorAll('.cat-btn').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    ST.cat = btn.dataset.cat;
    $('task-fields').style.display = ST.cat === 'task' ? 'flex' : 'none';
    buzz([15]);
  }));
  $('task-fields').style.display = 'none';
}

/* ── Duration mode ───────────────────────────────────── */
function durInit() {
  document.querySelectorAll('.seg-btn[data-mode]').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('.seg-btn[data-mode]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    ST.dur = btn.dataset.mode;
    $('duration-mode').style.display = ST.dur === 'duration' ? 'flex' : 'none';
    $('range-mode').style.display    = ST.dur === 'range'    ? 'flex' : 'none';
  }));
}

/* ── Clock UI ────────────────────────────────────────── */
let _ch = 0, _cm = 0;
function clockUpdate() {
  $('dur-h-val').textContent = pad(_ch);
  $('dur-m-val').textContent = pad(_cm);
  $('dur-hours').value   = _ch;
  $('dur-minutes').value = _cm;
}
function clockInit() {
  $('dur-h-up').addEventListener('click', () => { _ch = (_ch + 1)  % 25; clockUpdate(); buzz([10]); });
  $('dur-h-dn').addEventListener('click', () => { _ch = (_ch - 1 + 25) % 25; clockUpdate(); buzz([10]); });
  $('dur-m-up').addEventListener('click', () => { _cm = (_cm + 15) % 60; clockUpdate(); buzz([10]); });
  $('dur-m-dn').addEventListener('click', () => { _cm = (_cm - 15 + 60) % 60; clockUpdate(); buzz([10]); });
  document.querySelectorAll('.clock-preset').forEach(btn => btn.addEventListener('click', () => {
    const [h, m] = btn.dataset.dur.split(':').map(Number);
    _ch = h; _cm = m; clockUpdate(); buzz([15]);
  }));
}

/* ── Form Reset ──────────────────────────────────────── */
function resetForm() {
  document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
  document.querySelector('.cat-btn[data-cat="entry"]').classList.add('active');
  ST.cat = 'entry';
  $('task-fields').style.display = 'none';
  $('task-project').value = '';
  $('task-desc').value    = '';
  _ch = 0; _cm = 0; clockUpdate();
  document.querySelectorAll('.seg-btn[data-mode]').forEach(b => b.classList.remove('active'));
  document.querySelector('.seg-btn[data-mode="duration"]').classList.add('active');
  ST.dur = 'duration';
  $('duration-mode').style.display = 'flex';
  $('range-mode').style.display    = 'none';
  const rs = $('range-start'), re = $('range-end');
  if (rs) rs.value = ''; if (re) re.value = '';
  const n = new Date();
  $('report-date').value = isoD(n);
  $('report-time').value = timeS(n);
}

/* ═══════════════════════════════════════════════════════
   SUBMIT / NETWORK
   ═══════════════════════════════════════════════════════ */
function submitInit() {
  $('btn-submit').addEventListener('click', async () => {
    const date = $('report-date').value, time = $('report-time').value;
    if (!date || !time) { toast(t('toastNoTime'), 'warn'); buzz([80]); return; }
    const rep = buildRep(date, time);
    if (!rep) return;
    saveLocal(rep); histRender(); resetForm();
    const ep = store(K.ep);
    if (!ep)              { toast(t('toastNoEndpoint'), 'warn'); addQ(rep); pendUI(); return; }
    if (!navigator.onLine){ toast(t('toastSavedOffline'), 'warn'); addQ(rep); pendUI(); registerBgSync(); return; }
    await send(rep, ep);
  });
  $('btn-sync')?.addEventListener('click', syncQ);
}

function buildRep(date, time) {
  const cat = ST.cat; let rTime = time, desc = '', proj = '';
  if (cat === 'task') {
    desc = $('task-desc').value.trim();
    proj = $('task-project').value.trim();
    if (!proj) { toast('⚠️ יש לבחור פרויקט', 'warn'); buzz([80]); return null; }
    // auto-save new project
    const ps = store(K.proj) || [];
    if (!ps.includes(proj)) { ps.push(proj); store(K.proj, ps); projLoad(); projChipsRender(); }
    if (ST.dur === 'duration') {
      const h = parseInt($('dur-hours').value)   || 0;
      const m = parseInt($('dur-minutes').value) || 0;
      if (!h && !m) { toast(t('toastNoDuration'), 'warn'); buzz([80]); return null; }
      rTime = `${pad(h)}:${pad(m)}`;
    } else {
      const s = $('range-start').value, e = $('range-end').value;
      if (!s || !e) { toast(t('toastNoRange'), 'warn'); buzz([80]); return null; }
      rTime = `${s}-${e}`;
    }
  }
  return {
    id:          Date.now() + Math.random().toString(36).slice(2),
    timestamp:   new Date().toISOString(),
    report_date: date,
    report_time: rTime,
    category:    cat,
    description: desc,
    project:     proj,
  };
}

async function send(rep, ep) {
  const btn = $('btn-submit');
  btn.classList.add('loading');
  btn.querySelector('.btn-text').textContent = t('btnSubmitting');
  try {
    await fetch(ep, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rep),
      mode: 'no-cors',
    });
    toast(t('toastSent'), 'success');
    markSent(rep.id);
    buzz([30, 20, 60]);
  } catch {
    toast(t('toastSendError'), 'error');
    addQ(rep); pendUI(); registerBgSync();
    buzz([100]);
  } finally {
    btn.classList.remove('loading');
    btn.querySelector('.btn-text').textContent = t('btnSubmit');
  }
}

/* ── Storage helpers ─────────────────────────────────── */
function saveLocal(r)    { const rs = store(K.reps) || []; rs.unshift(r); store(K.reps, rs.slice(0, 300)); }
function markSent(id)    { const rs = store(K.reps) || []; const r = rs.find(x => x.id === id); if (r) r.sent = true; store(K.reps, rs); }
function addQ(r)         { const q = store(K.q) || []; if (!q.find(x => x.id === r.id)) q.push(r); store(K.q, q); syncQueueIndicatorUpdate(); }
function pendUI()        { const q = store(K.q) || []; $('pending-section').classList.toggle('hidden', !q.length); $('pending-count').textContent = q.length; }

async function syncQ() {
  const ep = store(K.ep);
  if (!ep)              { toast(t('toastNoEndpointSync'), 'warn'); return; }
  if (!navigator.onLine){ toast(t('toastSavedOffline'), 'warn'); return; }
  const q = store(K.q) || [];
  if (!q.length)        { toast(t('toastNoQueuePending'), 'success'); return; }
  let ok = 0; const fail = [];
  for (const r of q) {
    try {
      await fetch(ep, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(r), mode: 'no-cors' });
      markSent(r.id); ok++;
    } catch { fail.push(r); }
  }
  store(K.q, fail);
  pendUI();
  syncQueueIndicatorUpdate();
  toast(t('toastSynced', ok), 'success');
}

/* ── Network ─────────────────────────────────────────── */
function netInit() {
  const upd = () => {
    $('offline-banner').classList.toggle('hidden', navigator.onLine);
    if (navigator.onLine) { toast(t('toastOnlineBack'), 'success'); syncQ(); }
  };
  window.addEventListener('online',  upd);
  window.addEventListener('offline', upd);
  $('offline-banner').classList.toggle('hidden', navigator.onLine);
  pendUI();
}
function netQInit() {
  const c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (!c) return;
  const chk = () => { if (c.saveData || ['2g', 'slow-2g'].includes(c.effectiveType)) toast(t('toastSlowData'), 'warn', 5000); };
  c.addEventListener('change', chk); chk();
}

/* ── Background Sync ─────────────────────────────────── */
function registerBgSync() {
  if ('serviceWorker' in navigator && ST.swReg) {
    ST.swReg.sync?.register('sync-logs').catch(() => {});
  }
}
function syncQueueIndicatorInit() {
  syncQueueIndicatorUpdate();
  // listen for SW message that BG sync completed
  navigator.serviceWorker?.addEventListener('message', e => {
    if (e.data?.type === 'SYNC_COMPLETE') {
      store(K.q, []);
      pendUI();
      syncQueueIndicatorUpdate();
      histRender();
      toast(t('toastSynced', e.data.count || 0), 'success');
    }
  });
}
function syncQueueIndicatorUpdate() {
  const q   = store(K.q) || [];
  const ind = $('sync-indicator');
  if (ind) ind.classList.toggle('hidden', q.length === 0);
}

/* ═══════════════════════════════════════════════════════
   HISTORY
   ═══════════════════════════════════════════════════════ */
function histRender() {
  const now    = new Date();
  const cutoff = new Date(now); cutoff.setDate(cutoff.getDate() - 30);
  const rs = (store(K.reps) || [])
    .filter(r => { const d = new Date(r.timestamp || r.report_date); return d >= cutoff; })
    .slice(0, 200);
  $('history-list').innerHTML = rs.length
    ? rs.map(r => hItem(r, true)).join('')
    : `<p class="empty">${t('historyEmpty')}</p>`;
}

function delReport(id) {
  if (!confirm(t('confirmDeleteReport'))) return;
  store(K.reps, (store(K.reps) || []).filter(r => r.id !== id));
  store(K.q,    (store(K.q)    || []).filter(r => r.id !== id));
  // Send delete to Sheet via GET (works with no-cors)
  const ep = store(K.ep);
  if (ep && navigator.onLine) {
    fetch(`${ep}?action=delete&id=${encodeURIComponent(id)}`, { method: 'GET', mode: 'no-cors' }).catch(() => {});
  }
  histRender(); summaryRender();
  syncQueueIndicatorUpdate();
  toast(t('toastReportDeleted'), 'success');
}

function hItem(r, showDel = false) {
  const delBtn = showDel
    ? `<button class="btn-d sm hitem-del" data-id="${r.id}" onclick="delReport('${r.id}')" style="padding:4px 8px;font-size:.7rem;flex-shrink:0">🗑</button>`
    : '';
  return `<div class="hitem" data-id="${r.id}">
    <div class="hdot ${r.category}"></div>
    <div class="hmeta">
      <div class="htitle">${r.description || catLbl(r.category)}</div>
      <div class="hsub">${fmtD(r.report_date)} · ${fmtT(r.report_time)}${r.project ? ' · ' + r.project : ''}${r.workDuration ? ' · ⏱' + r.workDuration : ''}</div>
    </div>
    <span class="hbadge ${r.category}">${catLbl(r.category)}</span>
    ${delBtn}
  </div>`;
}

/* ═══════════════════════════════════════════════════════
   SUMMARY
   ═══════════════════════════════════════════════════════ */
function summaryInit() {
  document.querySelectorAll('.sum-tab').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('.sum-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    ST.sumPer = btn.dataset.period; ST.sumOff = 0; summaryRender();
  }));
  $('sum-prev').addEventListener('click', () => { ST.sumOff--; summaryRender(); buzz([15]); });
  $('sum-next').addEventListener('click', () => { ST.sumOff++; summaryRender(); buzz([15]); });
}

function summaryRender() {
  const rs = store(K.reps) || [], now = new Date();
  let fil = [], lbl = '';

  if (ST.sumPer === 'day') {
    const tgt = new Date(now); tgt.setDate(tgt.getDate() + ST.sumOff);
    const ds = isoD(tgt); fil = rs.filter(r => r.report_date === ds); lbl = fmtD(ds);
    const entries = fil.filter(r => r.category === 'entry').map(r => r.report_time).sort();
    const exits   = fil.filter(r => r.category === 'exit').map(r  => r.report_time).sort();
    let wdStr = '-';
    if (entries.length && exits.length) {
      const [eh, em] = entries[0].split(':').map(Number);
      const [xh, xm] = exits[exits.length-1].split(':').map(Number);
      const diffM = (xh*60+xm) - (eh*60+em);
      if (diffM > 0) { const dh = Math.floor(diffM/60), dm = diffM%60; wdStr = `${pad(dh)}:${pad(dm)}`; }
    }
    $('stat-workday').textContent   = wdStr;
    $('stat-workday-lbl').textContent = 'משך יום עבודה';
    $('stat-workday-card').style.display = '';
    $('stat-days-card').style.display    = 'none';
  } else {
    const tgt = new Date(now.getFullYear(), now.getMonth() + ST.sumOff, 1);
    const y = tgt.getFullYear(), m = pad(tgt.getMonth()+1);
    fil = rs.filter(r => r.report_date.startsWith(`${y}-${m}`)); lbl = `${m}/${y}`;
    const dayMap = {};
    fil.filter(r => r.category === 'entry' || r.category === 'exit').forEach(r => {
      if (!dayMap[r.report_date]) dayMap[r.report_date] = { entries: [], exits: [] };
      if (r.category === 'entry') dayMap[r.report_date].entries.push(r.report_time);
      else dayMap[r.report_date].exits.push(r.report_time);
    });
    let totalMins = 0;
    const reportedDays = new Set(fil.map(r => r.report_date)).size;
    Object.values(dayMap).forEach(({ entries, exits }) => {
      if (!entries.length || !exits.length) return;
      entries.sort(); exits.sort();
      const [eh, em] = entries[0].split(':').map(Number);
      const [xh, xm] = exits[exits.length-1].split(':').map(Number);
      const d = (xh*60+xm) - (eh*60+em); if (d > 0) totalMins += d;
    });
    const th = Math.floor(totalMins/60), tm = totalMins%60;
    $('stat-workday').textContent     = totalMins > 0 ? `${pad(th)}:${pad(tm)}` : '-';
    $('stat-workday-lbl').textContent  = 'סך משך עבודה';
    $('stat-workday-card').style.display = '';
    $('stat-days-card').style.display   = '';
    $('stat-days').textContent          = reportedDays;
  }

  $('sum-period-label').textContent    = lbl;
  $('stat-entries').textContent = fil.filter(r => r.category === 'entry').length;
  $('stat-exits').textContent   = fil.filter(r => r.category === 'exit').length;
  $('stat-tasks').textContent   = fil.filter(r => r.category === 'task').length;

  let mins = 0;
  fil.filter(r => r.category === 'task').forEach(r => {
    if (r.report_time.includes('-')) {
      const [s, e] = r.report_time.split('-');
      const [sh, sm] = s.split(':').map(Number), [eh, em] = e.split(':').map(Number);
      mins += (eh*60+em) - (sh*60+sm);
    } else if (r.report_time.includes(':')) {
      const [h, m] = r.report_time.split(':').map(Number); mins += h*60 + m;
    }
  });
  const h = Math.floor(mins/60), m = mins%60;
  $('stat-hours').textContent = m > 0 ? `${h}:${pad(m)}` : `${h}`;
  $('summary-list').innerHTML = fil.length
    ? fil.map(r => hItem(r, false)).join('')
    : `<p class="empty">${t('summaryEmpty')}</p>`;
}

/* ═══════════════════════════════════════════════════════
   SETTINGS
   ═══════════════════════════════════════════════════════ */
function settingsInit() {
  $('btn-close-settings').addEventListener('click', () => closeM('modal-settings'));
  $('btn-close-help').addEventListener('click',     () => closeM('modal-help'));
  $('modal-help').addEventListener('click', e => { if (e.target === $('modal-help')) closeM('modal-help'); });
  $('btn-save-settings').addEventListener('click', settingsSave);
  $('btn-clear-data').addEventListener('click', () => {
    if (confirm(t('confirmClearData'))) {
      Object.values(K).forEach(k => localStorage.removeItem(k));
      toast(t('toastDataCleared'), 'success');
      closeM('modal-settings'); histRender(); pendUI();
    }
  });
  $('btn-add-project').addEventListener('click', projAdd);
  $('new-project').addEventListener('keydown', e => { if (e.key === 'Enter') projAdd(); });
  $('modal-settings').addEventListener('click', e => { if (e.target === $('modal-settings')) closeM('modal-settings'); });
  $('modal-reset').addEventListener('click',    e => { if (e.target === $('modal-reset'))    closeM('modal-reset'); });
  document.querySelectorAll('.seg-btn[data-lang]').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('.seg-btn[data-lang]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active'); applyLang(btn.dataset.lang); buzz([20]);
  }));
}

function openM(id) {
  $(id).classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  if (id === 'modal-settings') {
    $('settings-endpoint').value  = store(K.ep)       || '';
    $('settings-sheet-url').value = store(K.sheetUrl) || '';
    const sheetUrl = store(K.sheetUrl);
    $('sheet-link-section').style.display = sheetUrl ? '' : 'none';
    if (sheetUrl) $('sheet-link').href = sheetUrl;
    prefsLoadUI(); projChipsRender(); projMgmtRender();
    const lang = window._lang || 'he';
    document.querySelectorAll('.seg-btn[data-lang]').forEach(b =>
      b.classList.toggle('active', b.dataset.lang === lang)
    );
  }
}
function closeM(id) { $(id).classList.add('hidden'); document.body.style.overflow = ''; }

function settingsSave() {
  const ep = $('settings-endpoint').value.trim();
  if (ep) store(K.ep, ep); else localStorage.removeItem(K.ep);
  const su = $('settings-sheet-url').value.trim();
  if (su) store(K.sheetUrl, su); else localStorage.removeItem(K.sheetUrl);
  prefsSave();
  toast(t('toastSettingsSaved'), 'success');
  buzz([20, 20, 40]);
  closeM('modal-settings');
  updateMenuSheetLink();
}

/* ═══════════════════════════════════════════════════════
   PROJECTS — Dynamic management (Task 2)
   ═══════════════════════════════════════════════════════ */

function projInit() {
  if (!store(K.proj)) store(K.proj, [...DEFAULT_PROJECTS]);
  projLoad(); projChipsRender();
}

/** Sync the projects datalist and chips */
function projLoad() {
  const ps = store(K.proj) || [];
  $('projects-list').innerHTML = ps.map(p => `<option value="${p}">`).join('');
}
function projSyncAllDataLists() { projLoad(); }

function projChipsRender() {
  const el = $('projects-chips');
  if (el) el.innerHTML = (store(K.proj) || []).map(p =>
    `<div class="chip"><span>${p}</span><button class="chip-x" onclick="projRemove('${p.replace(/'/g,"\\'")}')">✕</button></div>`
  ).join('');
}

function projAdd() {
  const inp = $('new-project'), name = inp.value.trim();
  if (!name) { toast(t('toastProjectEmpty'), 'warn'); return; }
  const ps = store(K.proj) || [];
  if (ps.includes(name)) { toast(t('toastProjectExists'), 'warn'); return; }
  ps.push(name); store(K.proj, ps);
  projLoad(); projChipsRender(); projMgmtRender();
  toast(t('toastProjectAdded'), 'success');
  inp.value = '';
}

function projRemove(name) {
  if (!confirm(t('confirmDeleteProject'))) return;
  store(K.proj, (store(K.proj) || []).filter(p => p !== name));
  projLoad(); projChipsRender(); projMgmtRender();
  toast(t('toastProjectDeleted'), 'success');
}

/** Render the project management list inside Settings */
function projMgmtRender() {
  const ps      = store(K.proj) || [];
  const listEl  = $('project-mgmt-list');
  if (!listEl) return;
  listEl.innerHTML = ps.length
    ? ps.map(p => `
        <div class="proj-mgmt-row">
          <span class="proj-mgmt-name">${p}</span>
          <button class="btn-d sm proj-del-btn" onclick="projRemove('${p.replace(/'/g,"\\'")}')">🗑️</button>
        </div>`).join('')
    : `<p class="empty" style="padding:10px">אין פרויקטים</p>`;
}

/* legacy alias still called from chips */
function projLoad() { projSyncAllDataLists(); }
function projChipsRender() { projMgmtRender(); }

/* ═══════════════════════════════════════════════════════
   SERVICE WORKER + BACKGROUND SYNC (Task 3)
   ═══════════════════════════════════════════════════════ */
function swInit() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('sw.js').then(reg => {
    ST.swReg = reg;
    if (reg.waiting) showUpd();
    reg.addEventListener('updatefound', () => {
      const sw = reg.installing;
      sw.addEventListener('statechange', () => {
        if (sw.state === 'installed' && navigator.serviceWorker.controller) showUpd();
      });
    });
  }).catch(() => {});
  navigator.serviceWorker.addEventListener('message', e => {
    if (e.data?.type === 'UPDATE_AVAILABLE') showUpd(e.data.version);
    if (e.data?.type === 'SW_REQUEST_SYNC')  { syncQ(); }  // BG sync triggered by SW
    if (e.data?.type === 'SYNC_COMPLETE') {
      store(K.q, []);
      pendUI(); syncQueueIndicatorUpdate(); histRender();
      toast(t('toastSynced', e.data.count || 0), 'success');
    }
  });
}
function showUpd() {
  $('update-prompt').classList.remove('hidden'); buzz([30, 30, 60]);
  $('btn-update-now').onclick = () => {
    if (ST.swReg?.waiting) {
      ST.swReg.waiting.postMessage({ type: 'SKIP_WAITING' });
      navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload());
    } else window.location.reload(true);
    $('update-prompt').classList.add('hidden');
  };
  $('btn-update-dismiss').onclick = () => $('update-prompt').classList.add('hidden');
}

/* ── Install prompt ──────────────────────────────────── */
function installInit() {
  if (store(K.inst)) return;
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault(); ST.install = e;
    setTimeout(() => $('install-banner').classList.remove('hidden'), 3000);
  });
  window.addEventListener('appinstalled', () => {
    $('install-banner').classList.add('hidden'); store(K.inst, true);
  });
  $('btn-install-confirm')?.addEventListener('click', async () => {
    if (!ST.install) return;
    ST.install.prompt();
    const { outcome } = await ST.install.userChoice;
    ST.install = null;
    $('install-banner').classList.add('hidden');
    if (outcome === 'dismissed') store(K.inst, true);
    buzz([30, 20, 60]);
  });
  $('btn-install-dismiss')?.addEventListener('click', () => {
    $('install-banner').classList.add('hidden'); store(K.inst, true);
  });
}

/* ── Swipe navigation ────────────────────────────────── */
function swipeInit() {
  const el = $('main-scroll');
  el.addEventListener('touchstart', e => { ST.swX = e.touches[0].clientX; ST.swY = e.touches[0].clientY; }, { passive: true });
  el.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - ST.swX;
    const dy = e.changedTouches[0].clientY - ST.swY;
    if (Math.abs(dx) < 40 || Math.abs(dy) > Math.abs(dx)) return;
    const tabs = ['report', 'history', 'summary'];
    const idx  = tabs.indexOf(document.querySelector('.tab-btn.active')?.dataset.tab);
    const rtl  = document.documentElement.dir === 'rtl';
    const next = (rtl ? dx < 0 : dx > 0) ? idx - 1 : idx + 1;
    if (next >= 0 && next < tabs.length) switchTab(tabs[next]);
  }, { passive: true });
}

/* ── Pull to refresh ─────────────────────────────────── */
function ptrInit() {
  const scroll = $('main-scroll'), ind = $('ptr');
  scroll.addEventListener('touchstart', e => {
    if (!getP().pullRefresh) return;
    ST.pullY = e.touches[0].clientY; ST.pulling = scroll.scrollTop === 0;
  }, { passive: true });
  scroll.addEventListener('touchmove', e => {
    if (!ST.pulling || !getP().pullRefresh) return;
    if (e.touches[0].clientY - ST.pullY > 60) {
      ind.classList.remove('hidden'); ind.classList.add('visible');
      ind.querySelector('.ptr-icon').classList.add('spin');
    }
  }, { passive: true });
  scroll.addEventListener('touchend', () => {
    if (!ST.pulling) return;
    if (!ind.classList.contains('hidden'))
      setTimeout(() => {
        ind.classList.remove('visible'); ind.classList.add('hidden');
        ind.querySelector('.ptr-icon').classList.remove('spin');
        window.location.reload();
      }, 600);
    ST.pulling = false;
  });
}

/* ── Help modal ──────────────────────────────────────── */
function helpInit() {
  $('btn-close-help').addEventListener('click',      () => closeM('modal-help'));
  $('btn-close-help-foot')?.addEventListener('click', () => closeM('modal-help'));
  $('modal-help').addEventListener('click', e => { if (e.target === $('modal-help')) closeM('modal-help'); });
}
function hTab(btn) {
  const id = btn.dataset.htab;
  document.querySelectorAll('.htab-btn').forEach(b => b.classList.toggle('active', b === btn));
  document.querySelectorAll('.htab-pnl').forEach(p => p.style.display = 'none');
  const panel = document.getElementById('htab-' + id);
  if (panel) panel.style.display = 'flex';
}

/* ── Download GS code ────────────────────────────────── */
function downloadGS() {
  const code = document.getElementById('gs-code-blob')?.textContent || '';
  if (!code) return;
  const b = new Blob([code], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(b);
  a.download = 'google-apps-script.gs';
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  toast('⬇️ מוריד קוד...', 'success');
}

/* ── Scroll position persistence ────────────────────── */
function scrollSave() { const s = $('main-scroll'); if (s) store(K.scroll, s.scrollTop); }
function scrollInit() {
  const s = $('main-scroll'), pos = store(K.scroll);
  if (pos && s) s.scrollTop = pos;
  s?.addEventListener('scroll', scrollSave, { passive: true });
}
