// ============================================================
//  MyWorkLog – App Logic v2
//  Features: Version management, Hard Reset, PWA Install,
//  Offline queue, Dark/Light mode, Hamburger menu,
//  Pull-to-Refresh, Swipe gestures, Haptic feedback,
//  Network monitoring, i18n, Preferences
// ============================================================

const APP_VERSION = '1.0.0';

const DB_KEY = {
  endpoint:  'mwl_endpoint',
  reports:   'mwl_reports',
  queue:     'mwl_queue',
  projects:  'mwl_projects',
  lang:      'mwl_lang',
  theme:     'mwl_theme',
  prefs:     'mwl_prefs',
  version:   'mwl_version',
  installDismissed: 'mwl_install_dismissed',
};

// ---- STATE ----
const state = {
  currentCat:    'entry',
  durationMode:  'duration',
  summaryPeriod: 'day',
  summaryOffset: 0,
  swReg:         null,
  deferredInstall: null,
  swipeStartX:   0,
  swipeStartY:   0,
  pullStartY:    0,
  isPulling:     false,
  scrollLocked:  false,
};

// ---- HELPERS ----
function $(id) { return document.getElementById(id); }
function pad(n) { return String(n).padStart(2, '0'); }
function localISODate(d = new Date()) { return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
function localTimeStr(d = new Date()) { return `${pad(d.getHours())}:${pad(d.getMinutes())}`; }
function storage(key, val) {
  if (val === undefined) { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } }
  localStorage.setItem(key, JSON.stringify(val));
}
function prefs() { return storage(DB_KEY.prefs) || { vibration: true, animations: true, pullRefresh: false }; }
function vibrate(pattern = [30]) {
  if (prefs().vibration && navigator.vibrate) navigator.vibrate(pattern);
}
function formatDateHe(d) { const [y,m,day]=d.split('-'); return `${day}/${m}/${y}`; }
function catLabel(cat) { return t({ entry:'catEntry', exit:'catExit', task:'catTask' }[cat]) || cat; }

// ---- TOAST ----
function showToast(msg, type = 'success', duration = 2800) {
  const el = $('toast');
  el.textContent = msg;
  el.className = `toast ${type}`;
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.add('hidden'), duration);
}

// ---- INIT ----
document.addEventListener('DOMContentLoaded', () => {
  checkVersionAndClean();
  initTheme();
  initLang();
  initPrefs();
  initSplash();
  initDateTimeDefaults();
  initTabs();
  initCategoryBtns();
  initTaskFields();
  initDurationToggle();
  initSubmit();
  initSettings();
  initSummary();
  initNowBtn();
  initOnlineStatus();
  initNetworkQuality();
  loadProjects();
  renderHistory();
  initHamburgerMenu();
  initVersionBadge();
  initSwipeGestures();
  initPullToRefresh();
  initServiceWorker();
  initInstallPrompt();
  initScrollRestore();
  lazyLoadImages();
});

// ---- SPLASH ----
function initSplash() {
  setTimeout(() => {
    $('splash').classList.add('fade-out');
    setTimeout(() => {
      $('splash').remove();
      $('app').classList.remove('hidden');
      applyLanguage(window._lang || 'he');
      renderSummary();
    }, 500);
  }, 900);
}

// ---- VERSION MANAGEMENT ----
function checkVersionAndClean() {
  const stored = storage(DB_KEY.version);
  if (stored && stored !== APP_VERSION) {
    // Version changed: clear caches via SW
    if ('caches' in window) {
      caches.keys().then(keys => keys.forEach(k => caches.delete(k)));
    }
  }
  storage(DB_KEY.version, APP_VERSION);
  // Update badges
  document.querySelectorAll('.version-badge').forEach(el => {
    el.textContent = t('versionLabel', APP_VERSION);
  });
}

function initVersionBadge() {
  // Both version badges trigger reset modal on click
  [$('version-badge'), $('menu-version-badge')].forEach(el => {
    if (!el) return;
    el.addEventListener('click', () => {
      vibrate([20,30,20]);
      openModal('modal-reset');
    });
  });

  $('btn-close-reset').addEventListener('click', () => closeModal('modal-reset'));
  $('btn-reset-cancel').addEventListener('click', () => closeModal('modal-reset'));
  $('btn-reset-confirm').addEventListener('click', hardReset);
}

async function hardReset() {
  const keepReports  = $('reset-keep-reports').checked;
  const keepSettings = $('reset-keep-settings').checked;
  const keepQueue    = $('reset-keep-queue').checked;

  // Save what we want to keep
  const savedReports  = keepReports  ? storage(DB_KEY.reports)  : null;
  const savedEndpoint = keepSettings ? storage(DB_KEY.endpoint) : null;
  const savedProjects = keepSettings ? storage(DB_KEY.projects) : null;
  const savedQueue    = keepQueue    ? storage(DB_KEY.queue)    : null;

  // Nuke everything
  localStorage.clear();
  sessionStorage.clear();

  // Clear all cookies
  document.cookie.split(';').forEach(c => {
    document.cookie = c.replace(/^ +/, '').replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/');
  });

  // Unregister SW & clear caches
  if ('serviceWorker' in navigator) {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map(r => r.unregister()));
  }
  if ('caches' in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => caches.delete(k)));
  }

  // Clear IndexedDB
  if ('indexedDB' in window) {
    const dbs = await (indexedDB.databases?.() || Promise.resolve([]));
    dbs.forEach(db => indexedDB.deleteDatabase(db.name));
  }

  // Restore kept data
  if (savedReports)  storage(DB_KEY.reports,  savedReports);
  if (savedEndpoint) storage(DB_KEY.endpoint, savedEndpoint);
  if (savedProjects) storage(DB_KEY.projects, savedProjects);
  if (savedQueue)    storage(DB_KEY.queue,    savedQueue);

  vibrate([100, 50, 100]);
  window.location.reload(true);
}

// ---- THEME ----
function initTheme() {
  const saved = storage(DB_KEY.theme);
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = saved !== null ? saved === 'dark' : prefersDark;
  applyTheme(isDark ? 'dark' : 'light');

  $('btn-theme').addEventListener('click', () => {
    const next = document.body.classList.contains('light') ? 'dark' : 'light';
    applyTheme(next);
    vibrate([20]);
  });
}

function applyTheme(theme) {
  document.body.classList.toggle('light', theme === 'light');
  $('btn-theme').textContent = theme === 'light' ? '🌙' : '☀️';
  document.querySelector('meta[name="theme-color"]').content = theme === 'light' ? '#f4f5f7' : '#0f1117';
  storage(DB_KEY.theme, theme);
}

// ---- LANGUAGE ----
function initLang() {
  const saved = storage(DB_KEY.lang) || 'he';
  window._lang = saved;
  applyLanguage(saved);
}

// ---- PREFERENCES ----
function initPrefs() {
  const p = prefs();
  if (!p.animations) document.body.classList.add('no-animations');
}

function loadPrefsToUI() {
  const p = prefs();
  $('pref-vibration').checked   = p.vibration   !== false;
  $('pref-animations').checked  = p.animations  !== false;
  $('pref-pull-refresh').checked = p.pullRefresh === true;
}

function savePrefs() {
  const p = {
    vibration:   $('pref-vibration').checked,
    animations:  $('pref-animations').checked,
    pullRefresh: $('pref-pull-refresh').checked,
  };
  storage(DB_KEY.prefs, p);
  document.body.classList.toggle('no-animations', !p.animations);
}

// ---- DATE/TIME ----
function initDateTimeDefaults() {
  const now = new Date();
  $('report-date').value = localISODate(now);
  $('report-time').value = localTimeStr(now);
}
function initNowBtn() {
  $('btn-now').addEventListener('click', () => {
    const now = new Date();
    $('report-date').value = localISODate(now);
    $('report-time').value = localTimeStr(now);
    showToast(t('toastNowUpdated'), 'success');
    vibrate([20]);
  });
}

// ---- TABS ----
function initTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
}
function switchTab(tabName) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  const btn = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
  if (btn) btn.classList.add('active');
  $(`tab-${tabName}`)?.classList.add('active');
  if (tabName === 'history') renderHistory();
  if (tabName === 'summary') renderSummary();
  vibrate([15]);
  closeSideMenu();
}

// ---- HAMBURGER MENU ----
function initHamburgerMenu() {
  $('btn-hamburger').addEventListener('click', openSideMenu);
  $('btn-close-menu').addEventListener('click', closeSideMenu);
  $('menu-overlay').addEventListener('click', closeSideMenu);
  $('menu-settings-btn').addEventListener('click', () => { closeSideMenu(); openModal('modal-settings'); });
  document.querySelectorAll('.menu-item[data-tab]').forEach(el => {
    el.addEventListener('click', () => switchTab(el.dataset.tab));
  });
}
function openSideMenu() {
  $('side-menu').classList.add('open');
  $('menu-overlay').classList.remove('hidden');
  $('side-menu').setAttribute('aria-hidden', 'false');
  vibrate([20]);
}
function closeSideMenu() {
  $('side-menu').classList.remove('open');
  $('menu-overlay').classList.add('hidden');
  $('side-menu').setAttribute('aria-hidden', 'true');
}

// ---- CATEGORY ----
function initCategoryBtns() {
  document.querySelectorAll('.cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.currentCat = btn.dataset.cat;
      $('task-fields').style.display = state.currentCat === 'task' ? 'flex' : 'none';
      vibrate([15]);
    });
  });
}
function initTaskFields() { $('task-fields').style.display = 'none'; }

// ---- DURATION TOGGLE ----
function initDurationToggle() {
  document.querySelectorAll('.toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.durationMode = btn.dataset.mode;
      $('duration-mode').style.display = state.durationMode === 'duration' ? 'flex' : 'none';
      $('range-mode').style.display    = state.durationMode === 'range'    ? 'flex' : 'none';
    });
  });
}

// ---- SUBMIT ----
function initSubmit() {
  $('btn-submit').addEventListener('click', async () => {
    const date = $('report-date').value;
    const time = $('report-time').value;
    if (!date || !time) { showToast(t('toastNoTime'), 'warn'); vibrate([80]); return; }

    const report = buildReport(date, time);
    if (!report) return;

    saveReportLocally(report);
    renderHistory();
    saveScrollPos();

    const endpoint = storage(DB_KEY.endpoint);
    if (!endpoint) { showToast(t('toastNoEndpoint'), 'warn'); addToQueue(report); updatePendingUI(); return; }
    if (!navigator.onLine) { showToast(t('toastSavedOffline'), 'warn'); addToQueue(report); updatePendingUI(); return; }

    await sendReport(report, endpoint);
  });

  $('btn-sync')?.addEventListener('click', syncQueue);
}

function buildReport(date, time) {
  const cat = state.currentCat;
  let reportTime = time;
  let description = '', project = '';

  if (cat === 'task') {
    description = $('task-desc').value.trim();
    project = $('task-project').value.trim();
    if (!description) { showToast(t('toastNoDesc'), 'warn'); vibrate([80]); return null; }

    if (state.durationMode === 'duration') {
      const h = parseInt($('dur-hours').value) || 0;
      const m = parseInt($('dur-minutes').value) || 0;
      if (h === 0 && m === 0) { showToast(t('toastNoDuration'), 'warn'); vibrate([80]); return null; }
      reportTime = `${pad(h)}:${pad(m)}`;
    } else {
      const start = $('range-start').value, end = $('range-end').value;
      if (!start || !end) { showToast(t('toastNoRange'), 'warn'); vibrate([80]); return null; }
      reportTime = `${start}-${end}`;
    }
  }

  return {
    id: Date.now() + Math.random().toString(36).slice(2),
    timestamp: new Date().toISOString(),
    report_date: date, report_time: reportTime,
    category: cat, description, project,
  };
}

async function sendReport(report, endpoint) {
  const btn = $('btn-submit');
  btn.classList.add('loading');
  btn.querySelector('.btn-text').textContent = t('btnSubmitting');
  try {
    await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(report),
      mode: 'no-cors',
    });
    showToast(t('toastSent'), 'success');
    markSent(report.id);
    vibrate([30, 20, 60]);
  } catch {
    showToast(t('toastSendError'), 'error');
    addToQueue(report); updatePendingUI();
    vibrate([100]);
  } finally {
    btn.classList.remove('loading');
    btn.querySelector('.btn-text').textContent = t('btnSubmit');
  }
}

// ---- LOCAL STORAGE ----
function saveReportLocally(r) {
  const reports = storage(DB_KEY.reports) || [];
  reports.unshift(r);
  storage(DB_KEY.reports, reports.slice(0, 300));
}
function markSent(id) {
  const reports = storage(DB_KEY.reports) || [];
  const r = reports.find(r => r.id === id);
  if (r) r.sent = true;
  storage(DB_KEY.reports, reports);
}
function addToQueue(r) {
  const q = storage(DB_KEY.queue) || [];
  if (!q.find(x => x.id === r.id)) q.push(r);
  storage(DB_KEY.queue, q);
}
function updatePendingUI() {
  const q = storage(DB_KEY.queue) || [];
  $('pending-section').classList.toggle('hidden', q.length === 0);
  $('pending-count').textContent = q.length;
}
async function syncQueue() {
  const endpoint = storage(DB_KEY.endpoint);
  if (!endpoint) { showToast(t('toastNoEndpointSync'), 'warn'); return; }
  const q = storage(DB_KEY.queue) || [];
  if (!q.length) { showToast(t('toastNoQueuePending'), 'success'); return; }
  let ok = 0; const failed = [];
  for (const r of q) {
    try {
      await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(r), mode: 'no-cors' });
      markSent(r.id); ok++;
    } catch { failed.push(r); }
  }
  storage(DB_KEY.queue, failed);
  updatePendingUI();
  showToast(t('toastSynced', ok), 'success');
}

// ---- ONLINE STATUS ----
function initOnlineStatus() {
  const update = () => {
    $('offline-banner').classList.toggle('hidden', navigator.onLine);
    if (navigator.onLine) { showToast(t('toastOnlineBack'), 'success'); syncQueue(); }
  };
  window.addEventListener('online',  update);
  window.addEventListener('offline', update);
  $('offline-banner').classList.toggle('hidden', navigator.onLine);
  updatePendingUI();
}

// ---- NETWORK QUALITY ----
function initNetworkQuality() {
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (!conn) return;
  const check = () => {
    if (conn.saveData || conn.effectiveType === '2g' || conn.effectiveType === 'slow-2g') {
      showToast(t('toastSlowData'), 'warn', 5000);
    }
  };
  conn.addEventListener('change', check);
  check();
}

// ---- HISTORY ----
function renderHistory() {
  const reports = (storage(DB_KEY.reports) || []).slice(0, 5);
  const list = $('history-list');
  list.innerHTML = reports.length
    ? reports.map(historyItemHTML).join('')
    : `<p class="empty-state" data-i18n="historyEmpty">${t('historyEmpty')}</p>`;
}
function historyItemHTML(r) {
  return `
    <div class="history-item">
      <div class="history-dot ${r.category}"></div>
      <div class="history-meta">
        <div class="history-title">${r.description || catLabel(r.category)}</div>
        <div class="history-sub">${formatDateHe(r.report_date)} · ${r.report_time}${r.project ? ' · ' + r.project : ''}</div>
      </div>
      <span class="history-badge ${r.category}">${catLabel(r.category)}</span>
    </div>`;
}

// ---- SUMMARY ----
function initSummary() {
  document.querySelectorAll('.sum-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.sum-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.summaryPeriod = btn.dataset.period;
      state.summaryOffset = 0;
      renderSummary();
    });
  });
  $('sum-prev').addEventListener('click', () => { state.summaryOffset--; renderSummary(); vibrate([15]); });
  $('sum-next').addEventListener('click', () => { state.summaryOffset++; renderSummary(); vibrate([15]); });
}

function renderSummary() {
  const reports = storage(DB_KEY.reports) || [];
  const now = new Date();
  let filtered = [], label = '';

  if (state.summaryPeriod === 'day') {
    const target = new Date(now);
    target.setDate(target.getDate() + state.summaryOffset);
    const ds = localISODate(target);
    filtered = reports.filter(r => r.report_date === ds);
    label = formatDateHe(ds);
  } else {
    const target = new Date(now.getFullYear(), now.getMonth() + state.summaryOffset, 1);
    const y = target.getFullYear(), m = pad(target.getMonth() + 1);
    filtered = reports.filter(r => r.report_date.startsWith(`${y}-${m}`));
    label = `${m}/${y}`;
  }

  $('sum-period-label').textContent = label;
  $('stat-entries').textContent = filtered.filter(r => r.category === 'entry').length;
  $('stat-exits').textContent   = filtered.filter(r => r.category === 'exit').length;
  $('stat-tasks').textContent   = filtered.filter(r => r.category === 'task').length;

  let mins = 0;
  filtered.filter(r => r.category === 'task').forEach(r => {
    if (r.report_time.includes('-')) {
      const [s,e] = r.report_time.split('-');
      const [sh,sm]=[...s.split(':').map(Number)], [eh,em]=[...e.split(':').map(Number)];
      mins += (eh*60+em) - (sh*60+sm);
    } else if (r.report_time.includes(':')) {
      const [h,m] = r.report_time.split(':').map(Number);
      mins += h*60 + m;
    }
  });
  const h = Math.floor(mins/60), m = mins%60;
  $('stat-hours').textContent = m > 0 ? `${h}:${pad(m)}` : `${h}`;

  const sl = $('summary-list');
  sl.innerHTML = filtered.length
    ? filtered.map(historyItemHTML).join('')
    : `<p class="empty-state">${t('summaryEmpty')}</p>`;
}

// ---- SETTINGS ----
function initSettings() {
  $('btn-settings').addEventListener('click', () => openModal('modal-settings'));
  $('btn-close-settings').addEventListener('click', () => closeModal('modal-settings'));
  $('btn-save-settings').addEventListener('click', saveSettings);
  $('btn-clear-data').addEventListener('click', () => {
    if (confirm(t('confirmClearData'))) {
      Object.values(DB_KEY).forEach(k => localStorage.removeItem(k));
      showToast(t('toastDataCleared'), 'success');
      closeModal('modal-settings');
      renderHistory(); updatePendingUI();
    }
  });
  $('btn-add-project').addEventListener('click', addProject);
  $('new-project').addEventListener('keydown', e => { if (e.key === 'Enter') addProject(); });
  $('modal-settings').addEventListener('click', e => { if (e.target === $('modal-settings')) closeModal('modal-settings'); });
  $('modal-reset').addEventListener('click', e => { if (e.target === $('modal-reset')) closeModal('modal-reset'); });

  // Lang toggle
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      applyLanguage(btn.dataset.lang);
      vibrate([20]);
    });
  });
}

function openModal(id) {
  $(id).classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  if (id === 'modal-settings') {
    $('settings-endpoint').value = storage(DB_KEY.endpoint) || '';
    loadPrefsToUI();
    renderProjectChips();
    // Sync lang buttons
    const lang = window._lang || 'he';
    document.querySelectorAll('.lang-btn').forEach(b => b.classList.toggle('active', b.dataset.lang === lang));
  }
}
function closeModal(id) {
  $(id).classList.add('hidden');
  document.body.style.overflow = '';
}

function saveSettings() {
  const ep = $('settings-endpoint').value.trim();
  if (ep) storage(DB_KEY.endpoint, ep); else localStorage.removeItem(DB_KEY.endpoint);
  savePrefs();
  showToast(t('toastSettingsSaved'), 'success');
  vibrate([20, 20, 40]);
  closeModal('modal-settings');
}

// ---- PROJECTS ----
function loadProjects() {
  const projects = storage(DB_KEY.projects) || [];
  $('projects-list').innerHTML = projects.map(p => `<option value="${p}">`).join('');
}
function addProject() {
  const input = $('new-project');
  const name = input.value.trim();
  if (!name) return;
  const projects = storage(DB_KEY.projects) || [];
  if (!projects.includes(name)) {
    projects.push(name);
    storage(DB_KEY.projects, projects);
    loadProjects();
    showToast(t('toastProjectAdded'), 'success');
  }
  input.value = '';
  renderProjectChips();
}
function renderProjectChips() {
  const projects = storage(DB_KEY.projects) || [];
  $('projects-chips').innerHTML = projects.map(p =>
    `<div class="chip"><span>${p}</span><button class="chip-remove" onclick="removeProject('${p}')">✕</button></div>`
  ).join('');
}
function removeProject(name) {
  storage(DB_KEY.projects, (storage(DB_KEY.projects) || []).filter(p => p !== name));
  loadProjects(); renderProjectChips();
}

// ---- SERVICE WORKER + UPDATE ----
function initServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('sw.js').then(reg => {
    state.swReg = reg;

    // Check for waiting SW immediately
    if (reg.waiting) showUpdatePrompt();

    reg.addEventListener('updatefound', () => {
      const newSW = reg.installing;
      newSW.addEventListener('statechange', () => {
        if (newSW.state === 'installed' && navigator.serviceWorker.controller) showUpdatePrompt();
      });
    });
  }).catch(() => {});

  // Listen for SW messages
  navigator.serviceWorker.addEventListener('message', e => {
    if (e.data?.type === 'UPDATE_AVAILABLE') showUpdatePrompt(e.data.version);
  });
}

function showUpdatePrompt(version) {
  $('update-prompt').classList.remove('hidden');
  vibrate([30, 30, 60]);

  $('btn-update-now').onclick = () => {
    if (state.swReg?.waiting) {
      state.swReg.waiting.postMessage({ type: 'SKIP_WAITING' });
      navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload());
    } else {
      window.location.reload(true);
    }
    $('update-prompt').classList.add('hidden');
  };
  $('btn-update-dismiss').onclick = () => $('update-prompt').classList.add('hidden');
}

// ---- PWA INSTALL PROMPT ----
function initInstallPrompt() {
  if (storage(DB_KEY.installDismissed)) return;

  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    state.deferredInstall = e;
    setTimeout(() => $('install-banner').classList.remove('hidden'), 3000);
  });

  window.addEventListener('appinstalled', () => {
    $('install-banner').classList.add('hidden');
    storage(DB_KEY.installDismissed, true);
  });

  $('btn-install-confirm')?.addEventListener('click', async () => {
    if (!state.deferredInstall) return;
    state.deferredInstall.prompt();
    const { outcome } = await state.deferredInstall.userChoice;
    state.deferredInstall = null;
    $('install-banner').classList.add('hidden');
    if (outcome === 'dismissed') storage(DB_KEY.installDismissed, true);
    vibrate([30, 20, 60]);
  });

  $('btn-install-dismiss')?.addEventListener('click', () => {
    $('install-banner').classList.add('hidden');
    storage(DB_KEY.installDismissed, true);
  });
}

// ---- SWIPE GESTURES ----
function initSwipeGestures() {
  const el = $('main-scroll');
  el.addEventListener('touchstart', e => {
    state.swipeStartX = e.touches[0].clientX;
    state.swipeStartY = e.touches[0].clientY;
  }, { passive: true });

  el.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - state.swipeStartX;
    const dy = e.changedTouches[0].clientY - state.swipeStartY;
    if (Math.abs(dx) < 40 || Math.abs(dy) > Math.abs(dx)) return;

    const tabs = ['report', 'history', 'summary'];
    const active = document.querySelector('.tab-btn.active')?.dataset.tab;
    const idx = tabs.indexOf(active);

    const isRTL = document.documentElement.dir === 'rtl';
    const goNext = isRTL ? dx < 0 : dx > 0;
    const nextIdx = goNext ? idx - 1 : idx + 1;

    if (nextIdx >= 0 && nextIdx < tabs.length) switchTab(tabs[nextIdx]);
  }, { passive: true });
}

// ---- PULL TO REFRESH ----
function initPullToRefresh() {
  const scroll = $('main-scroll');
  const indicator = $('ptr-indicator');

  scroll.addEventListener('touchstart', e => {
    if (!prefs().pullRefresh) return;
    state.pullStartY = e.touches[0].clientY;
    state.isPulling = scroll.scrollTop === 0;
  }, { passive: true });

  scroll.addEventListener('touchmove', e => {
    if (!state.isPulling || !prefs().pullRefresh) return;
    const dy = e.touches[0].clientY - state.pullStartY;
    if (dy > 60) {
      indicator.classList.remove('hidden');
      indicator.classList.add('visible');
      indicator.querySelector('.ptr-spinner').classList.add('spinning');
    }
  }, { passive: true });

  scroll.addEventListener('touchend', () => {
    if (!state.isPulling) return;
    if (!indicator.classList.contains('hidden')) {
      setTimeout(() => {
        indicator.classList.remove('visible');
        indicator.classList.add('hidden');
        indicator.querySelector('.ptr-spinner').classList.remove('spinning');
        window.location.reload();
      }, 600);
    }
    state.isPulling = false;
  });
}

// ---- SCROLL RESTORE ----
function saveScrollPos() {
  const scroll = $('main-scroll');
  if (scroll) storage('mwl_scroll', scroll.scrollTop);
}
function initScrollRestore() {
  const scroll = $('main-scroll');
  const pos = storage('mwl_scroll');
  if (pos && scroll) scroll.scrollTop = pos;
  scroll?.addEventListener('scroll', saveScrollPos, { passive: true });
}

// ---- LAZY LOADING ----
function lazyLoadImages() {
  if (!('IntersectionObserver' in window)) return;
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        const img = e.target;
        if (img.dataset.src) { img.src = img.dataset.src; obs.unobserve(img); }
      }
    });
  });
  document.querySelectorAll('img[data-src]').forEach(img => obs.observe(img));
}
