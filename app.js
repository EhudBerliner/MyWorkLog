/* ═══════════════════════════════════════════════════════
   MyWorkLog · App Core  v4.4.9
   ═══════════════════════════════════════════════════════ */

/* ── LOGGING SYSTEM (v1.0) ── */
const LOG_KEY = 'mwl_boot_logs';
const MAX_LOGS = 50;

const Logger = {
  log(level, message, details = null) {
    const timestamp = new Date().toISOString();
    const entry = { timestamp, level, message, details: details ? String(details) : null };
    
    // הדפסה לקונסול
    const consoleMethod = level === 'ERROR' ? 'error' : (level === 'WARN' ? 'warn' : 'log');
    console[consoleMethod](`[${level}] ${message}`, details || '');

    // שמירה מקומית ב-localStorage
    try {
      const logs = JSON.parse(localStorage.getItem(LOG_KEY) || '[]');
      logs.push(entry);
      if (logs.length > MAX_LOGS) logs.shift(); // שומר רק את הלוגים האחרונים
      localStorage.setItem(LOG_KEY, JSON.stringify(logs));
    } catch (e) {
      console.warn('Failed to write log to localStorage:', e);
    }
  },

  info(msg, details) { this.log('INFO', msg, details); },
  warn(msg, details) { this.log('WARN', msg, details); },
  error(msg, details) { this.log('ERROR', msg, details); },

  getLogs() {
    try { return JSON.parse(localStorage.getItem(LOG_KEY) || '[]'); } catch { return []; }
  },

  clear() {
    localStorage.removeItem(LOG_KEY);
  }
};

// לכידת שגיאות גלובליות ברמת הדפדפן
window.addEventListener('error', (event) => {
  Logger.error('Uncaught Exception', `${event.message} at ${event.filename}:${event.lineno}`);
});

window.addEventListener('unhandledrejection', (event) => {
  Logger.error('Unhandled Promise Rejection', event.reason);
});


/* ── BOOT ── */

/**
 * פונקציה מוגנת להסרת מסך הפתיחה בלבד (בלי תלות בנתונים)
 */
function safeSplashExit() {
  try {
    const splash = (typeof $ === 'function' ? ($('splash') \vert{}\vert{}$('splashScreen')) : null) 
      || document.getElementById('splash') 
      || document.getElementById('splashScreen') 
      || document.querySelector('.splash-screen');

    if (splash) {
      splash.classList.add('splash-hidden');
      Logger.info('Splash screen hidden successfully');
      
      // הסרה מלאה מה-DOM לאחר סיום האנימציה
      setTimeout(() => {
        if (splash.parentNode) splash.parentNode.removeChild(splash);
      }, 500);
    }
  } catch (e) {
    Logger.warn('Failed to smoothly remove splash element', e);
  }
}

/**
 * תהליך האתחול הראשי והבטוח של האפליקציה
 */
async function boot() {
  const currentVersion = typeof VER !== 'undefined' ? VER : '4.4.9';
  Logger.info(`Starting MyWorkLog v${currentVersion}...`);

  // 1. הגדרת טיימר גיבוי מוחלט למסך הפתיחה (Max 3.5 שניות)
  const failsafeTimer = setTimeout(() => {
    Logger.warn('Failsafe triggered: Force removing splash screen');
    safeSplashExit();
  }, 3500);

  try {
    // 2. בדיקה ותקנון פורמטים של נתונים שמורים
    if (typeof fixStoredDates === 'function') {
      try { 
        fixStoredDates(); 
        Logger.info('fixStoredDates completed');
      } catch (e) { 
        Logger.error('fixStoredDates error', e); 
      }
    }

    // 3. טעינת העדפות, שפה ותצורות בסיסיות לממשק
    if (typeof initUI === 'function') {
      await initUI();
      Logger.info('initUI completed');
    }
    if (typeof applyTheme === 'function') {
      applyTheme();
      Logger.info('applyTheme completed');
    }

  } catch (bootErr) {
    Logger.error('Critical error during structural boot', bootErr);
  } finally {
    // 4. יציאה קריטית ומובטחת ממסך הפתיחה - ללא תלות בהצלחת הרינדור הכבד!
    clearTimeout(failsafeTimer);
    safeSplashExit();
  }

  // 5. הרצת חישובים ורינדור נתונים כבד בצורה אסינכרונית ובטוחה (Non-blocking)
  requestAnimationFrame(() => {
    setTimeout(() => {
      runHeavyRenderTasks();
    }, 50);
  });
}

/**
 * הרצת משימות רינדור כבדות תחת הגנת try-catch נפרדת
 */
function runHeavyRenderTasks() {
  // רינדור סיכומים
  if (typeof summaryRender === 'function') {
    try {
      summaryRender();
      Logger.info('summaryRender completed');
    } catch (e) {
      Logger.error('summaryRender failed', e);
    }
  }

  // רינדור היסטוריה
  if (typeof histRender === 'function') {
    try {
      histRender();
      Logger.info('histRender completed');
    } catch (e) {
      Logger.error('histRender failed', e);
    }
  }

  // סנכרון תור אופליין
  if (typeof syncQueue === 'function') {
    try {
      syncQueue();
      Logger.info('syncQueue initiated');
    } catch (e) {
      Logger.warn('Background sync failed', e);
    }
  }
}

// הפעלת האתחול ברגע שה-DOM מוכן
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
