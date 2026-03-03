/* ═══════════════════════════════════════════════════════
   MyWorkLog · i18n Dictionary
   ═══════════════════════════════════════════════════════ */
const I18N = {
  /* ── App ── */
  appTagline:         { he: 'ניהול נוכחות ומשימות',         en: 'Attendance & Task Tracker' },
  /* ── Nav ── */
  tabReport:          { he: 'דיווח',     en: 'Report' },
  tabHistory:         { he: 'היסטוריה', en: 'History' },
  tabSummary:         { he: 'סיכום',     en: 'Summary' },
  menuReport:         { he: 'דיווח',     en: 'Report' },
  menuHistory:        { he: 'היסטוריה', en: 'History' },
  menuSummary:        { he: 'סיכום',     en: 'Summary' },
  menuSettings:       { he: 'הגדרות',   en: 'Settings' },
  /* ── Report form ── */
  catEntry:           { he: '🟢 כניסה',  en: '🟢 Entry' },
  catExit:            { he: '🔴 יציאה',  en: '🔴 Exit' },
  catTask:            { he: '📋 משימה', en: '📋 Task' },
  labelReportType:    { he: 'סוג דיווח',     en: 'Report Type' },
  labelDatetime:      { he: 'תאריך ושעה',    en: 'Date & Time' },
  labelDate:          { he: 'תאריך',          en: 'Date' },
  labelTime:          { he: 'שעה',            en: 'Time' },
  btnNow:             { he: '🕐 עכשיו',       en: '🕐 Now' },
  labelTaskDetails:   { he: 'פרטי משימה',    en: 'Task Details' },
  labelDescription:   { he: 'תיאור',          en: 'Description' },
  placeholderDesc:    { he: 'מה בוצע...',      en: 'What was done...' },
  labelProject:       { he: 'פרויקט',         en: 'Project' },
  placeholderProj:    { he: 'שם הפרויקט (אופציונלי)', en: 'Project name (optional)' },
  labelDuration:      { he: 'משך / טווח',     en: 'Duration / Range' },
  modeDuration:       { he: 'משך זמן',        en: 'Duration' },
  modeRange:          { he: 'טווח שעות',      en: 'Time Range' },
  labelHours:         { he: 'שעות',           en: 'Hours' },
  labelMinutes:       { he: 'דקות',           en: 'Minutes' },
  labelStart:         { he: 'התחלה',          en: 'Start' },
  labelEnd:           { he: 'סיום',           en: 'End' },
  btnSubmit:          { he: 'שלח דיווח',      en: 'Submit Report' },
  btnSubmitting:      { he: 'שולח...',         en: 'Sending...' },
  /* ── Pending / Sync ── */
  pendingTitle:       { he: 'ממתינים',             en: 'Pending' },
  btnSync:            { he: '🔄 סנכרן',            en: '🔄 Sync' },
  btnSyncProjects:    { he: '🔄 סנכרן פרויקטים',   en: '🔄 Sync Projects' },
  /* ── History ── */
  historyTitle:       { he: '5 הדיווחים האחרונים', en: 'Last 5 Reports' },
  historyEmpty:       { he: 'אין דיווחים עדיין',   en: 'No reports yet' },
  /* ── Summary ── */
  sumPeriodDay:       { he: 'יום',    en: 'Day' },
  sumPeriodMonth:     { he: 'חודש',   en: 'Month' },
  statEntries:        { he: 'כניסות',  en: 'Entries' },
  statExits:          { he: 'יציאות',  en: 'Exits' },
  statTasks:          { he: 'משימות', en: 'Tasks' },
  statHours:          { he: 'שעות',   en: 'Hours' },
  summaryDetail:      { he: 'פירוט דיווחים',               en: 'Breakdown' },
  summaryEmpty:       { he: 'אין דיווחים בתקופה זו',       en: 'No reports for this period' },
  /* ── Settings ── */
  settingsTitle:      { he: '⚙️ הגדרות',     en: '⚙️ Settings' },
  settingsLangLabel:  { he: 'שפה',            en: 'Language' },
  settingsEndpointLabel:{ he: 'כתובת Google Apps Script', en: 'Google Apps Script URL' },
  settingsEndpointHint: { he: 'הדבק את ה-URL של ה-Web App', en: 'Paste your Web App URL' },
  settingsProjectsLabel:{ he: 'פרויקטים שמורים', en: 'Saved Projects' },
  placeholderNewProject:{ he: 'הוסף פרויקט...',  en: 'Add project...' },
  settingsDataLabel:  { he: 'ניהול נתונים',   en: 'Data Management' },
  btnClearData:       { he: '🗑 מחק כל הנתונים המקומיים', en: '🗑 Clear All Local Data' },
  btnSaveSettings:    { he: 'שמור הגדרות',    en: 'Save Settings' },
  settingsPrefTitle:  { he: 'העדפות',         en: 'Preferences' },
  prefVibration:      { he: 'רטט',            en: 'Vibration' },
  prefAnimations:     { he: 'אנימציות',       en: 'Animations' },
  prefPullRefresh:    { he: 'משיכה לרענון',   en: 'Pull to Refresh' },
  /* ── Install ── */
  installTitle:       { he: 'התקן את האפליקציה', en: 'Install the App' },
  installBody:        { he: 'גישה מהירה וללא אינטרנט', en: 'Quick access, works offline' },
  btnInstall:         { he: 'התקן',     en: 'Install' },
  btnInstallDismiss:  { he: 'אחר כך',   en: 'Later' },
  /* ── Toasts ── */
  toastSent:          { he: '✅ הדיווח נשלח בהצלחה',       en: '✅ Report sent' },
  toastSavedOffline:  { he: '📴 אין חיבור — נשמר לסנכרון', en: '📴 Offline — saved for sync' },
  toastNoEndpoint:    { he: '⚠️ לא הוגדר Endpoint',         en: '⚠️ No Endpoint set' },
  toastSendError:     { he: '❌ שגיאה בשליחה',              en: '❌ Send error — queued' },
  toastNowUpdated:    { he: 'עודכן לשעה הנוכחית',           en: 'Updated to current time' },
  toastSettingsSaved: { he: '✅ הגדרות נשמרו',              en: '✅ Settings saved' },
  toastDataCleared:   { he: 'נמחק',                          en: 'Cleared' },
  toastSynced:        { he: (n) => `✅ נשלחו ${n} דיווחים`, en: (n) => `✅ Synced ${n} reports` },
  toastNoDesc:        { he: '⚠️ יש להזין תיאור משימה',      en: '⚠️ Enter task description' },
  toastNoTime:        { he: '⚠️ יש לבחור תאריך ושעה',       en: '⚠️ Select date and time' },
  toastNoDuration:    { he: '⚠️ יש להזין משך זמן',          en: '⚠️ Enter a duration' },
  toastNoRange:       { he: '⚠️ יש לבחור שעת התחלה וסיום', en: '⚠️ Select start and end' },
  toastNoQueuePending:{ he: 'אין דיווחים ממתינים',           en: 'No pending reports' },
  toastNoEndpointSync:{ he: '⚠️ הגדר Endpoint קודם',        en: '⚠️ Set Endpoint first' },
  toastOnlineBack:    { he: '✅ חיבור לאינטרנט שוחזר',      en: '✅ Connection restored' },
  toastSlowData:      { he: '⚠️ חיבור איטי',                en: '⚠️ Slow connection' },
  toastProjectAdded:  { he: '✅ פרויקט נוסף',               en: '✅ Project added' },
  toastProjectExists: { he: '⚠️ פרויקט כבר קיים',           en: '⚠️ Project already exists' },
  toastProjectSynced: { he: '✅ פרויקטים סונכרנו',          en: '✅ Projects synced' },
  toastSyncStart:     { he: '🔄 מסנכרן...',                 en: '🔄 Syncing...' },
  toastSyncDone:      { he: (a,d) => `✅ ${a} נוספו, ${d} נמחקו`, en: (a,d) => `✅ ${a} added, ${d} removed` },
  /* ── Version / Update ── */
  versionLabel:       { he: (v) => `גרסה ${v}`,  en: (v) => `v${v}` },
  updateAvailable:    { he: 'גרסה חדשה זמינה! עדכן עכשיו', en: 'New version available! Update now' },
  btnUpdate:          { he: 'עדכן',       en: 'Update' },
  btnUpdateDismiss:   { he: 'לא עכשיו',  en: 'Not now' },
  /* ── Reset ── */
  resetTitle:         { he: '⚠️ איפוס אפליקציה',   en: '⚠️ Reset App' },
  resetBody:          { he: 'בחר מה לשמור לפני האיפוס:', en: 'Choose what to keep:' },
  resetKeepReports:   { he: 'שמור היסטוריית דיווחים', en: 'Keep report history' },
  resetKeepSettings:  { he: 'שמור הגדרות',          en: 'Keep settings' },
  resetKeepQueue:     { he: 'שמור תור ממתין',       en: 'Keep pending queue' },
  btnResetConfirm:    { he: '🗑 אפס הכל',           en: '🗑 Reset Everything' },
  btnResetCancel:     { he: 'ביטול',                en: 'Cancel' },
  /* ── Network ── */
  offlineBanner:      { he: 'אין חיבור לאינטרנט',   en: 'No internet connection' },
  /* ── Confirm ── */
  confirmClearData:   { he: 'למחוק את כל הנתונים המקומיים?', en: 'Delete all local data?' },
  confirmDelReport:   { he: 'למחוק דיווח זה?',     en: 'Delete this report?' },
  /* ── Help Modal ── */
  helpTitle:            { he: '📖 עזרה ומדריך',     en: '📖 Help & Guide' },
  helpTabGuide:         { he: 'מדריך',              en: 'Guide' },
  helpTabTypes:         { he: 'סוגי דיווח',         en: 'Report Types' },
  helpTabSetup:         { he: 'הגדרה',              en: 'Setup' },
  helpTabSheets:        { he: 'גיליונות',            en: 'Sheets' },
  helpHowToUse:         { he: 'איך משתמשים',        en: 'How to Use' },
  helpStep1:            { he: 'בחר סוג דיווח — כניסה / יציאה / משימה', en: 'Choose report type — Entry / Exit / Task' },
  helpStep2:            { he: 'בדוק תאריך ושעה — ברירת מחדל: עכשיו. לחץ עכשיו לעדכון', en: 'Check date & time — default: now. Tap Now to refresh' },
  helpStep3:            { he: 'למשימה — בחר פרויקט (חובה) והוסף תיאור', en: 'For task — choose project (required) and add description' },
  helpStep4:            { he: 'לחץ שלח — הדיווח נשמר ונשלח לגיליון', en: 'Press Submit — report saved and sent to sheet' },
  helpLogicTitle:       { he: 'לוגיקות מרכזיות',   en: 'Core Logic' },
  helpLogicDuration:    { he: 'חישוב משך יום',      en: 'Workday Duration' },
  helpLogicDurationBody:{ he: 'כניסה ויציאה לאותו תאריך נכתבות ב-Attendance באותה שורה. משך היום מחושב אוטומטית: יציאה פחות כניסה.', en: 'Entry & exit for the same date share one row in Attendance. Duration is auto-calculated.' },
  helpLogicOffline:     { he: 'מצב לא מקוון',       en: 'Offline Mode' },
  helpLogicOfflineBody: { he: 'דיווחים שנכשלו נשמרים בתור מקומי. בחזרת חיבור מסונכרנים אוטומטית. לחץ סנכרן לסנכרון ידני.', en: 'Failed reports queue locally. Auto-sync on reconnect. Tap Sync for manual sync.' },
  helpLogicDelete:      { he: 'מחיקה',              en: 'Delete' },
  helpLogicDeleteBody:  { he: 'מחיקה בהיסטוריה מוחקת מהאפליקציה ומהגיליון. אם אין חיבור — המחיקה בגיליון תבוצע בחיבור הבא.', en: 'Deleting in History removes from app and sheet. If offline, sheet deletion queues.' },
  helpLogicReset:       { he: 'איפוס אפליקציה',     en: 'App Reset' },
  helpLogicResetBody:   { he: 'לחיצה על מספר הגרסה פותחת תפריט איפוס. ניתן לבחור מה לשמור: היסטוריה, הגדרות ותור ממתין.', en: 'Tap version number to open reset menu. Choose what to preserve.' },
  helpLogicProjects:    { he: 'פרויקטים',           en: 'Projects' },
  helpLogicProjectsBody:{ he: 'פרויקטים נשמרים אוטומטית ומסונכרנים עם גיליון Projects. ניתן לנהל ב-הגדרות.', en: 'Projects auto-save and sync with Projects sheet. Manage in Settings.' },
  helpNavTitle:         { he: 'ניווט',               en: 'Navigation' },
  helpNavMenu:          { he: 'ניווט בין לשוניות, מצב כהה/בהיר, הגדרות, עזרה', en: 'Navigate tabs, dark/light mode, settings, help' },
  helpNavHistory:       { he: '30 יום אחרונים, עד 200 דיווחים, עם מחיקה', en: 'Last 30 days, up to 200 reports, with delete' },
  helpNavSummary:       { he: 'נתונים יומיים/חודשיים: כניסות, יציאות, משימות, שעות', en: 'Daily/monthly: entries, exits, tasks, hours' },
  helpNavSwipe:         { he: 'החלק ימינה/שמאלה בין לשוניות', en: 'Swipe left/right between tabs' },
  /* ── Report type descriptions ── */
  helpTypeEntryTitle:   { he: '🟢 כניסה',    en: '🟢 Entry' },
  helpTypeEntryBody:    { he: 'דיווח תחילת יום עבודה. נרשם ב-WorkLog וב-Attendance בעמודת שעת הכניסה לאותו תאריך.', en: 'Work day start. Recorded in WorkLog and Attendance entry column for that date.' },
  helpTypeExitTitle:    { he: '🔴 יציאה',    en: '🔴 Exit' },
  helpTypeExitBody:     { he: 'דיווח סיום יום עבודה. נרשם ב-Attendance בשורת אותו תאריך ומחשב אוטומטית משך היום.', en: 'Work day end. Fills Attendance exit column and auto-calculates duration.' },
  helpTypeTaskTitle:    { he: '📋 משימה',   en: '📋 Task' },
  helpTypeTaskBody:     { he: 'דיווח עבודה על משימה. פרויקט — חובה. תיאור — אופציונלי. משך זמן או טווח שעות. נרשם ב-WorkLog וב-Tasks.', en: 'Task work report. Project required, description optional. Duration or time range. Logged in WorkLog and Tasks.' },
  helpTypeRetroTitle:   { he: '📅 דיווח רטרואקטיבי', en: '📅 Retroactive Report' },
  helpTypeRetroBody:    { he: 'שנה את התאריך והשעה לפני השליחה כדי לדווח על פעולה שהתרחשה בעבר.', en: 'Change date/time before submitting to report past activities.' },
  /* ── Setup tab ── */
  helpSetupTitle:       { he: 'שלבי הגדרת Google Apps Script', en: 'Google Apps Script Setup' },
  helpSetupWarning:     { he: 'לאחר שינוי קוד — יש ליצור New Deployment ולא לעדכן קיים. ה-URL ישתנה!', en: 'After code changes — create a New Deployment, not an update. The URL will change!' },
  helpBtnDownloadGS:    { he: '⬇️ הורד google-apps-script.gs', en: '⬇️ Download google-apps-script.gs' },
  /* ── Sheets tab ── */
  helpSheetsTitle:      { he: 'גיליונות שנוצרים אוטומטית', en: 'Auto-created Sheets' },
  helpSheetWorkLog:     { he: 'כל הדיווחים — כניסה, יציאה ומשימות.', en: 'All reports — entries, exits and tasks.' },
  helpSheetAttendance:  { he: 'כניסה + יציאה לכל יום — באותה שורה. משך היום מחושב אוטומטית.', en: 'Entry + exit per day — same row. Duration auto-calculated.' },
  helpSheetTasks:       { he: 'דיווחי משימות בלבד.', en: 'Task reports only.' },
  helpSheetProjects:    { he: 'רשימת הפרויקטים השמורים, מסונכרנת דו-כיוונית עם האפליקציה.', en: 'Saved projects list, bi-directionally synced with the app.' },
  helpDataFlow:         { he: 'זרימת נתונים',   en: 'Data Flow' },
  helpDataFlowBody:     { he: 'כניסה/יציאה → WorkLog + Attendance | משימה → WorkLog + Tasks | מחיקה → מוחקת משניהם', en: 'Entry/Exit → WorkLog + Attendance | Task → WorkLog + Tasks | Delete → removes from both' },
};

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
    if (attr === 'textContent') el.textContent = val;
    else if (attr === 'placeholder') el.placeholder = val;
    else el.setAttribute(attr, val);
  });
  localStorage.setItem('mwl_lang', lang);
}

function langInit() {
  window._lang = localStorage.getItem('mwl_lang') || 'he';
  applyLang(window._lang);
}
