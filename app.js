/* ═══════════════════════════════════════════════════════
   MyWorkLog · App Core  v4.4.4
   ═══════════════════════════════════════════════════════ */

// גרסה מערכתית לסינכרון מול ה-UI וה-Service Worker
const VER = '4.4.4';

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

/* ── CONFLICT RESOLUTION (Offline vs Sheet) ── */
function mergeSheetAndOfflineData(sheetData) {
  // שליפת תור הדיווחים המקומיים הממתינים לשליחה
  const offlineQueue = store(K.q) || [];
  
  // אם תור האופליין ריק, אין התנגשויות - נחזיר את נתוני הגיליון כפי שהם
  if (offlineQueue.length === 0) {
    return sheetData;
  }

  // יצירת סט מזהים של כל דיווחי האופליין הממתינים
  const offlineIds = new Set(offlineQueue.map(item => String(item.id)));

  // סינון נתוני הגיליון המרוחק: כל דיווח שקיים לו עדכון באופליין מוסר (כדי לתת עדיפות למקומי)
  const filteredSheetData = sheetData.filter(report => report.id && !offlineIds.has(String(report.id)));

  // חיבור הנתונים: דיווחי האופליין גוברים ומתווספים לנתונים הנקיים מהגיליון
  const finalMergedData = [...filteredSheetData, ...offlineQueue];

  // מיון כרונולוגי יורד (מהחדש לישן) לפי תאריך ושעה
  return finalMergedData.sort((a, b) => {
    const keyA = (a.report_date || '') + 'T' + (a.report_time && !a.report_time.includes('-') ? a.report_time : '00:00');
    const keyB = (b.report_date || '') + 'T' + (b.report_time && !b.report_time.includes('-') ? b.report_time : '00:00');
    return keyB.localeCompare(keyA);
  });
}

/* ── BOOT ── */

/**
 * פונקציית האתחול המרכזית של נתוני האפליקציה.
 * מציגה מיד נתונים מקומיים ומעדכנת את באנר הסשן ללא תלות ברשת.
 */
async function initApp() {
  // 1. שליפה ורינדור מיידי של הנתונים המקומיים למניעת מסך ריק באופליין
  if (typeof histRender === 'function') histRender();
  if (typeof summaryRender === 'function') summaryRender();
  
  // 🛡️ עדכון מיידי של באנר הסשן (שעת הכניסה) מתוך ה-LocalStorage
  if (typeof updateSessionBanner === 'function') updateSessionBanner(); 

  // 2. אם אין חיבור לרשת - עוצרים כאן ומתבססים על המידע המקומי בלבד
  if (!navigator.onLine) return;

  // 3. במידה ויש תקשורת ויש Endpoint מוגדר, מריצים סנכרון רקע מבוקר דלתא
  const ep = store(K.ep);
  if (!ep) return;

  try {
    // הגנת הצפה: דילוג אם בוצע סנכרון מלא או חלקי ב-3 הדקות האחרונות
    const lastFull = store('mwl_last_full_sync');
    if (lastFull && (Date.now() - Number(lastFull)) < 3 * 60 * 1000) return;

    // משיכת תאריך חלון 60 יום
    if (typeof getDeltaStartDate !== 'function') return;
    const deltaDate = getDeltaStartDate();

    // משיכת דיווחים ותקן שעות מהשרת בחלון הזמן הממוקד
    if (typeof syncFromSheet === 'function') {
      await syncFromSheet(deltaDate);
    }
    if (typeof syncWStandardDelta === 'function') {
      await syncWStandardDelta(deltaDate);
    }

    // סימון חותמת זמן לסנכרון מוצלח
    store('mwl_last_full_sync', String(Date.now()));
  } catch (error) {
    console.warn('[initApp Delta Sync Failure]', error);
  }
}
