// ============================================================
//  MyWorkLog – i18n Dictionary
//  All UI text managed here.
//  Structure: key → { element, action/context, he, en }
// ============================================================

const I18N = {
  // ---- APP GENERAL ----
  appName:          { element: 'brand',          context: 'App name in header',             he: 'MyWorkLog',              en: 'MyWorkLog' },
  appTagline:       { element: 'tagline',         context: 'Splash/install tagline',         he: 'ניהול נוכחות ומשימות',  en: 'Attendance & Task Tracker' },

  // ---- TABS ----
  tabReport:        { element: 'tab-button',      context: 'Main report tab',                he: 'דיווח',                  en: 'Report' },
  tabHistory:       { element: 'tab-button',      context: 'History tab',                    he: 'היסטוריה',               en: 'History' },
  tabSummary:       { element: 'tab-button',      context: 'Summary tab',                    he: 'סיכום',                  en: 'Summary' },

  // ---- CATEGORY BUTTONS ----
  catEntry:         { element: 'category-button', context: 'Clock-in / work entry',          he: '🟢 כניסה',              en: '🟢 Entry' },
  catExit:          { element: 'category-button', context: 'Clock-out / work exit',          he: '🔴 יציאה',              en: '🔴 Exit' },
  catTask:          { element: 'category-button', context: 'Task report',                    he: '📋 משימה',              en: '📋 Task' },

  // ---- FORM LABELS ----
  labelReportType:  { element: 'section-label',   context: 'Category selector heading',      he: 'סוג דיווח',             en: 'Report Type' },
  labelDatetime:    { element: 'section-label',   context: 'Date & time section heading',    he: 'תאריך ושעה',            en: 'Date & Time' },
  labelDate:        { element: 'field-label',     context: 'Date input label',               he: 'תאריך',                 en: 'Date' },
  labelTime:        { element: 'field-label',     context: 'Time input label',               he: 'שעה',                   en: 'Time' },
  btnNow:           { element: 'button',          context: 'Set date/time to current moment', he: '🕐 עכשיו',             en: '🕐 Now' },
  labelTaskDetails: { element: 'section-label',   context: 'Task detail section heading',    he: 'פרטי משימה',            en: 'Task Details' },
  labelDescription: { element: 'field-label',     context: 'Task description input',         he: 'תיאור',                 en: 'Description' },
  placeholderDesc:  { element: 'textarea',        context: 'Task description placeholder',   he: 'מה בוצע...',            en: 'What was done...' },
  labelProject:     { element: 'field-label',     context: 'Project name input',             he: 'פרויקט',                en: 'Project' },
  placeholderProj:  { element: 'input',           context: 'Project input placeholder',      he: 'שם הפרויקט (אופציונלי)',en: 'Project name (optional)' },
  labelDuration:    { element: 'field-label',     context: 'Task duration selector',         he: 'משך / טווח שעות',       en: 'Duration / Time Range' },
  modeDuration:     { element: 'toggle-button',   context: 'Duration mode (hh:mm)',          he: 'משך זמן',               en: 'Duration' },
  modeRange:        { element: 'toggle-button',   context: 'Time range mode (start-end)',    he: 'טווח שעות',             en: 'Time Range' },
  labelHours:       { element: 'field-label',     context: 'Hours input in duration mode',   he: 'שעות',                  en: 'Hours' },
  labelMinutes:     { element: 'field-label',     context: 'Minutes input in duration mode', he: 'דקות',                  en: 'Minutes' },
  labelStart:       { element: 'field-label',     context: 'Start time in range mode',       he: 'התחלה',                 en: 'Start' },
  labelEnd:         { element: 'field-label',     context: 'End time in range mode',         he: 'סיום',                  en: 'End' },

  // ---- SUBMIT ----
  btnSubmit:        { element: 'button',          context: 'Submit report button',           he: 'שלח דיווח',             en: 'Submit Report' },
  btnSubmitting:    { element: 'button-loading',  context: 'Submit button while loading',    he: 'שולח...',               en: 'Sending...' },

  // ---- PENDING QUEUE ----
  pendingTitle:     { element: 'section-label',   context: 'Pending offline queue heading',  he: 'ממתינים לשליחה',        en: 'Pending Sync' },
  btnSync:          { element: 'button',          context: 'Manually sync offline queue',    he: '🔄 סנכרן עכשיו',        en: '🔄 Sync Now' },

  // ---- HISTORY ----
  historyTitle:     { element: 'section-label',   context: 'History section heading',        he: '5 הדיווחים האחרונים',   en: 'Last 5 Reports' },
  historyEmpty:     { element: 'empty-state',     context: 'No history available',           he: 'אין דיווחים עדיין',     en: 'No reports yet' },

  // ---- SUMMARY ----
  sumPeriodDay:     { element: 'period-tab',      context: 'Daily summary view',             he: 'יום',                   en: 'Day' },
  sumPeriodMonth:   { element: 'period-tab',      context: 'Monthly summary view',           he: 'חודש',                  en: 'Month' },
  statEntries:      { element: 'stat-label',      context: 'Count of entry reports',         he: 'כניסות',                en: 'Entries' },
  statExits:        { element: 'stat-label',      context: 'Count of exit reports',          he: 'יציאות',                en: 'Exits' },
  statTasks:        { element: 'stat-label',      context: 'Count of task reports',          he: 'משימות',                en: 'Tasks' },
  statHours:        { element: 'stat-label',      context: 'Total task hours',               he: 'שעות משימות',           en: 'Task Hours' },
  summaryDetail:    { element: 'section-label',   context: 'Breakdown list in summary tab',  he: 'פירוט דיווחים',         en: 'Report Breakdown' },
  summaryEmpty:     { element: 'empty-state',     context: 'No data for selected period',    he: 'אין דיווחים בתקופה זו', en: 'No reports for this period' },

  // ---- SETTINGS MODAL ----
  settingsTitle:    { element: 'modal-header',    context: 'Settings modal title',           he: '⚙️ הגדרות',             en: '⚙️ Settings' },
  settingsLangLabel:{ element: 'field-label',     context: 'Language selector label',        he: 'שפה',                   en: 'Language' },
  settingsEndpointLabel: { element: 'field-label',context: 'Google Apps Script URL input',  he: 'כתובת Google Apps Script (Endpoint)', en: 'Google Apps Script Endpoint URL' },
  settingsEndpointHint:  { element: 'hint',       context: 'Hint below endpoint input',     he: 'הדבק את ה-URL של ה-Web App מ-Google Apps Script', en: 'Paste your Web App URL from Google Apps Script' },
  settingsProjectsLabel: { element: 'field-label',context: 'Saved projects manager',        he: 'פרויקטים שמורים',       en: 'Saved Projects' },
  placeholderNewProject: { element: 'input',      context: 'Add new project input',         he: 'הוסף פרויקט...',        en: 'Add project...' },
  settingsDataLabel:{ element: 'field-label',     context: 'Data management section',       he: 'ניהול נתונים',           en: 'Data Management' },
  btnClearData:     { element: 'button',          context: 'Delete all local data button',  he: '🗑 מחק כל הנתונים המקומיים', en: '🗑 Clear All Local Data' },
  btnSaveSettings:  { element: 'button',          context: 'Save settings button',          he: 'שמור הגדרות',           en: 'Save Settings' },

  // ---- SETTINGS – PREFERENCES ----
  settingsPrefTitle:{ element: 'section-label',   context: 'Preferences section in settings',he: 'העדפות',               en: 'Preferences' },
  prefVibration:    { element: 'toggle-label',    context: 'Vibration on/off toggle',       he: 'רטט',                   en: 'Vibration' },
  prefAnimations:   { element: 'toggle-label',    context: 'Animations on/off toggle',      he: 'אנימציות',              en: 'Animations' },
  prefDarkMode:     { element: 'toggle-label',    context: 'Dark mode on/off toggle',       he: 'מצב כהה',               en: 'Dark Mode' },
  prefPullRefresh:  { element: 'toggle-label',    context: 'Pull-to-refresh on/off toggle', he: 'משיכה לרענון',          en: 'Pull to Refresh' },

  // ---- INSTALL PROMPT ----
  installTitle:     { element: 'install-banner',  context: 'Install app banner headline',   he: 'התקן את האפליקציה',     en: 'Install the App' },
  installBody:      { element: 'install-banner',  context: 'Install app banner description',he: 'גישה מהירה וללא אינטרנט', en: 'Quick access, works offline' },
  btnInstall:       { element: 'button',          context: 'Confirm app installation',      he: 'התקן',                  en: 'Install' },
  btnInstallDismiss:{ element: 'button',          context: 'Dismiss install prompt',        he: 'אחר כך',                en: 'Later' },

  // ---- TOASTS ----
  toastSent:        { element: 'toast',           context: 'Report sent successfully',      he: '✅ הדיווח נשלח בהצלחה', en: '✅ Report sent successfully' },
  toastSavedOffline:{ element: 'toast',           context: 'No internet, saved to queue',   he: '📴 אין חיבור — נשמר לסנכרון אוטומטי', en: '📴 Offline — saved for auto-sync' },
  toastNoEndpoint:  { element: 'toast',           context: 'Endpoint not configured',       he: '⚠️ לא הוגדר Endpoint — הדיווח נשמר מקומית', en: '⚠️ No Endpoint set — saved locally' },
  toastSendError:   { element: 'toast',           context: 'Send failure, queued',          he: '❌ שגיאה בשליחה — נשמר לסנכרון', en: '❌ Send error — queued for sync' },
  toastNowUpdated:  { element: 'toast',           context: 'Date/time set to current time', he: 'עודכן לשעה הנוכחית',    en: 'Updated to current time' },
  toastSettingsSaved:{ element: 'toast',          context: 'Settings saved confirmation',   he: '✅ הגדרות נשמרו',        en: '✅ Settings saved' },
  toastDataCleared: { element: 'toast',           context: 'All local data cleared',        he: 'נמחק',                  en: 'Cleared' },
  toastSynced:      { element: 'toast',           context: 'Offline queue synced',          he: (n) => `✅ נשלחו ${n} דיווחים`, en: (n) => `✅ Synced ${n} reports` },
  toastNoDesc:      { element: 'toast',           context: 'Task description missing',      he: '⚠️ יש להזין תיאור משימה', en: '⚠️ Please enter a task description' },
  toastNoTime:      { element: 'toast',           context: 'Date or time missing',          he: '⚠️ יש לבחור תאריך ושעה', en: '⚠️ Please select date and time' },
  toastNoDuration:  { element: 'toast',           context: 'Duration is zero',              he: '⚠️ יש להזין משך זמן',   en: '⚠️ Please enter a duration' },
  toastNoRange:     { element: 'toast',           context: 'Range start/end missing',       he: '⚠️ יש לבחור שעת התחלה וסיום', en: '⚠️ Please select start and end time' },
  toastNoQueuePending: { element: 'toast',        context: 'No pending items to sync',      he: 'אין דיווחים ממתינים',   en: 'No pending reports' },
  toastNoEndpointSync: { element: 'toast',        context: 'Cannot sync without endpoint',  he: '⚠️ הגדר Endpoint קודם', en: '⚠️ Set Endpoint first' },
  toastOnlineBack:  { element: 'toast',           context: 'Internet connection restored',  he: '✅ חיבור לאינטרנט שוחזר', en: '✅ Connection restored' },
  toastSlowData:    { element: 'toast',           context: 'Slow connection warning',       he: '⚠️ חיבור איטי — ייתכן עיכוב', en: '⚠️ Slow connection — delays possible' },
  toastProjectAdded:{ element: 'toast',           context: 'Project added to saved list',   he: '✅ פרויקט נוסף',         en: '✅ Project added' },

  // ---- VERSION ----
  versionLabel:     { element: 'version-badge',   context: 'Version number badge',          he: (v) => `גרסה ${v}`,     en: (v) => `v${v}` },
  updateAvailable:  { element: 'update-prompt',   context: 'New version available message', he: 'גרסה חדשה זמינה! עדכן עכשיו', en: 'New version available! Update now' },
  btnUpdate:        { element: 'button',          context: 'Confirm update button',         he: 'עדכן',                  en: 'Update' },
  btnUpdateDismiss: { element: 'button',          context: 'Dismiss update prompt',         he: 'לא עכשיו',              en: 'Not now' },

  // ---- RESET MODAL ----
  resetTitle:       { element: 'modal-header',    context: 'Hard reset modal title',        he: '⚠️ איפוס אפליקציה',     en: '⚠️ Reset App' },
  resetBody:        { element: 'modal-body',      context: 'Reset modal description',       he: 'בחר מה לשמור לפני האיפוס:', en: 'Choose what to keep before reset:' },
  resetKeepReports: { element: 'checkbox-label',  context: 'Option to keep report history', he: 'שמור היסטוריית דיווחים', en: 'Keep report history' },
  resetKeepSettings:{ element: 'checkbox-label',  context: 'Option to keep settings',       he: 'שמור הגדרות (Endpoint, פרויקטים)', en: 'Keep settings (Endpoint, Projects)' },
  resetKeepQueue:   { element: 'checkbox-label',  context: 'Option to keep pending queue',  he: 'שמור תור ממתין',         en: 'Keep pending queue' },
  btnResetConfirm:  { element: 'button',          context: 'Confirm reset action',          he: '🗑 אפס הכל',             en: '🗑 Reset Everything' },
  btnResetCancel:   { element: 'button',          context: 'Cancel reset action',           he: 'ביטול',                  en: 'Cancel' },

  // ---- OFFLINE BANNER ----
  offlineBanner:    { element: 'offline-banner',  context: 'Top banner when network is down', he: 'אין חיבור לאינטרנט',   en: 'No internet connection' },

  // ---- HAMBURGER MENU ----
  menuReport:       { element: 'menu-item',       context: 'Link to Report tab in side menu', he: 'דיווח',                en: 'Report' },
  menuHistory:      { element: 'menu-item',       context: 'Link to History tab',            he: 'היסטוריה',              en: 'History' },
  menuSummary:      { element: 'menu-item',       context: 'Link to Summary tab',            he: 'סיכום',                 en: 'Summary' },
  menuSettings:     { element: 'menu-item',       context: 'Open settings modal',            he: 'הגדרות',                en: 'Settings' },
  menuClose:        { element: 'button',          context: 'Close side menu button',         he: 'סגור',                  en: 'Close' },

  // ---- CONFIRM DIALOGS ----
  confirmClearData: { element: 'confirm-dialog',  context: 'Confirm before clearing data',  he: 'למחוק את כל הנתונים המקומיים?', en: 'Delete all local data?' },
};

// ---- RUNTIME HELPERS ----
function t(key, ...args) {
  const lang = window._lang || 'he';
  const entry = I18N[key];
  if (!entry) return key;
  const raw = entry[lang] ?? entry['en'] ?? key;
  return typeof raw === 'function' ? raw(...args) : raw;
}

function applyLanguage(lang) {
  window._lang = lang;
  const isRTL = lang === 'he';
  document.documentElement.lang = lang;
  document.documentElement.dir = isRTL ? 'rtl' : 'ltr';

  // Apply all data-i18n attributes
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    const attr = el.dataset.i18nAttr || 'textContent';
    const val = t(key);
    if (attr === 'textContent') el.textContent = val;
    else if (attr === 'placeholder') el.placeholder = val;
    else el.setAttribute(attr, val);
  });

  localStorage.setItem('mwl_lang', lang);
}
