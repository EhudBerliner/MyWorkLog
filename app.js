/* ═══════════════════════════════════════════════════════
   MyWorkLog · App Core  v4.4.9
   ═══════════════════════════════════════════════════════ */

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
      // הסרה מלאה מה-DOM לאחר סיום האנימציה
      setTimeout(() => {
        if (splash.parentNode) splash.parentNode.removeChild(splash);
      }, 500);
    }
  } catch (e) {
    console.warn('[Boot] Failed to smoothly remove splash element:', e);
  }
}

/**
 * תהליך האתחול הראשי והבטוח של האפליקציה
 */
async function boot() {
  const currentVersion = typeof VER !== 'undefined' ? VER : '4.4.9';
  console.log(`[Boot] Starting MyWorkLog v${currentVersion}...`);

  // 1. הגדרת טיימר גיבוי מוחלט למסך הפתיחה (Max 3.5 שניות)
  const failsafeTimer = setTimeout(() => {
    console.warn('[Boot] Failsafe triggered: Force removing splash screen.');
    safeSplashExit();
  }, 3500);

  try {
    // 2. בדיקה ותקנון פורמטים של נתונים שמורים
    if (typeof fixStoredDates === 'function') {
      try { fixStoredDates(); } catch (e) { console.error('[Boot] fixStoredDates error:', e); }
    }

    // 3. טעינת העדפות, שפה ותצורות בסיסיות לממשק
    if (typeof initUI === 'function') await initUI();
    if (typeof applyTheme === 'function') applyTheme();

  } catch (bootErr) {
    console.error('[Boot] Critical error during structural boot:', bootErr);
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
    } catch (e) {
      console.error('[Render] summaryRender failed:', e);
    }
  }

  // רינדור היסטוריה
  if (typeof histRender === 'function') {
    try {
      histRender();
    } catch (e) {
      console.error('[Render] histRender failed:', e);
    }
  }

  // סנכרון תור אופליין
  if (typeof syncQueue === 'function') {
    try {
      syncQueue();
    } catch (e) {
      console.warn('[Sync] Background sync failed:', e);
    }
  }
}

// הפעלת האתחול ברגע שה-DOM מוכן
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
