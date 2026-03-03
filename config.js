/* ═══════════════════════════════════════════════════════
   MyWorkLog · config.js
   Constants, i18n messages, color tokens, defaults
   ═══════════════════════════════════════════════════════ */

'use strict';

/* ── Version ─────────────────────────────────────────── */
const VER = '1.4.0';

/* ── LocalStorage Keys ───────────────────────────────── */
const K = {
  ep:       'mwl_endpoint',
  reps:     'mwl_reports',
  q:        'mwl_sync_queue',   // renamed for clarity (task 3)
  proj:     'mwl_projects',
  lang:     'mwl_lang',
  theme:    'mwl_theme',
  prefs:    'mwl_prefs',
  ver:      'mwl_version',
  inst:     'mwl_install_dismissed',
  sheetUrl: 'mwl_sheet_url',
  scroll:   'mwl_scroll',
};

/* ── Default Projects ─────────────────────────────────── */
const DEFAULT_PROJECTS = ['כללי', 'אדמיניסטרציה', 'פיתוח', 'שיווק'];

/* ── Color Tokens (mirror of CSS vars for JS use) ────── */
const COLORS = {
  lime:    '#c8f135',
  lime2:   '#a8d420',
  red:     '#ff4d6a',
  blue:    '#4dabff',
  amber:   '#ffb830',
  text:    '#e8e8f0',
  text2:   '#8888aa',
  bg0:     '#0a0a0f',
  bg1:     '#111118',
  bg2:     '#16161f',
  bg3:     '#1c1c28',
};

/* ── Category Config ─────────────────────────────────── */
const CATEGORIES = {
  entry: { color: COLORS.lime,  dotClass: 'entry', i18nKey: 'catEntry'  },
  exit:  { color: COLORS.red,   dotClass: 'exit',  i18nKey: 'catExit'   },
  task:  { color: COLORS.blue,  dotClass: 'task',  i18nKey: 'catTask'   },
};

/* ── i18n Messages ───────────────────────────────────── */
const I18N = {
  appTagline:              { he: 'ניהול נוכחות ומשימות',          en: 'Attendance & Task Tracker'       },
  tabReport:               { he: 'דיווח',                          en: 'Report'                          },
  tabHistory:              { he: 'היסטוריה',                       en: 'History'                         },
  tabSummary:              { he: 'סיכום',                          en: 'Summary'                         },
  catEntry:                { he: '🟢 כניסה',                       en: '🟢 Entry'                        },
  catExit:                 { he: '🔴 יציאה',                       en: '🔴 Exit'                         },
  catTask:                 { he: '📋 משימה',                       en: '📋 Task'                         },
  labelReportType:         { he: 'סוג דיווח',                      en: 'Report Type'                     },
  labelDatetime:           { he: 'תאריך ושעה',                     en: 'Date & Time'                     },
  labelDate:               { he: 'תאריך',                          en: 'Date'                            },
  labelTime:               { he: 'שעה',                            en: 'Time'                            },
  btnNow:                  { he: '🕐 עכשיו',                       en: '🕐 Now'                          },
  labelTaskDetails:        { he: 'פרטי משימה',                     en: 'Task Details'                    },
  labelDescription:        { he: 'תיאור',                          en: 'Description'                     },
  placeholderDesc:         { he: 'מה בוצע...',                     en: 'What was done...'                },
  labelProject:            { he: 'פרויקט',                         en: 'Project'                         },
  placeholderProj:         { he: 'שם הפרויקט (אופציונלי)',         en: 'Project name (optional)'         },
  labelDuration:           { he: 'משך / טווח',                     en: 'Duration / Range'                },
  modeDuration:            { he: 'משך זמן',                        en: 'Duration'                        },
  modeRange:               { he: 'טווח שעות',                      en: 'Time Range'                      },
  labelHours:              { he: 'שעות',                           en: 'Hours'                           },
  labelMinutes:            { he: 'דקות',                           en: 'Minutes'                         },
  labelStart:              { he: 'התחלה',                          en: 'Start'                           },
  labelEnd:                { he: 'סיום',                           en: 'End'                             },
  btnSubmit:               { he: 'שלח דיווח',                      en: 'Submit Report'                   },
  btnSubmitting:           { he: 'שולח...',                        en: 'Sending...'                      },
  pendingTitle:            { he: 'ממתינים',                        en: 'Pending'                         },
  btnSync:                 { he: '🔄 סנכרן',                       en: '🔄 Sync'                         },
  historyTitle:            { he: 'דיווחים – 30 ימים אחרונים',     en: 'Reports – Last 30 Days'          },
  historyEmpty:            { he: 'אין דיווחים עדיין',              en: 'No reports yet'                  },
  sumPeriodDay:            { he: 'יום',                            en: 'Day'                             },
  sumPeriodMonth:          { he: 'חודש',                           en: 'Month'                           },
  statEntries:             { he: 'כניסות',                         en: 'Entries'                         },
  statExits:               { he: 'יציאות',                         en: 'Exits'                           },
  statTasks:               { he: 'משימות',                         en: 'Tasks'                           },
  statHours:               { he: 'שעות משימות',                    en: 'Task Hours'                      },
  summaryDetail:           { he: 'פירוט דיווחים',                  en: 'Breakdown'                       },
  summaryEmpty:            { he: 'אין דיווחים בתקופה זו',         en: 'No reports for this period'      },
  settingsTitle:           { he: '⚙️ הגדרות',                      en: '⚙️ Settings'                     },
  settingsLangLabel:       { he: 'שפה',                            en: 'Language'                        },
  settingsEndpointLabel:   { he: 'כתובת Google Apps Script',       en: 'Google Apps Script URL'          },
  settingsEndpointHint:    { he: 'הדבק את ה-URL של ה-Web App',     en: 'Paste your Web App URL'          },
  settingsProjectsLabel:   { he: 'ניהול פרויקטים',                 en: 'Manage Projects'                 },
  placeholderNewProject:   { he: 'הוסף פרויקט...',                 en: 'Add project...'                  },
  settingsDataLabel:       { he: 'ניהול נתונים',                   en: 'Data Management'                 },
  btnClearData:            { he: '🗑 מחק כל הנתונים המקומיים',     en: '🗑 Clear All Local Data'         },
  btnSaveSettings:         { he: 'שמור הגדרות',                    en: 'Save Settings'                   },
  settingsPrefTitle:       { he: 'העדפות',                         en: 'Preferences'                     },
  prefVibration:           { he: 'רטט',                            en: 'Vibration'                       },
  prefAnimations:          { he: 'אנימציות',                       en: 'Animations'                      },
  prefPullRefresh:         { he: 'משיכה לרענון',                   en: 'Pull to Refresh'                 },
  installTitle:            { he: 'התקן את האפליקציה',              en: 'Install the App'                 },
  installBody:             { he: 'גישה מהירה וללא אינטרנט',        en: 'Quick access, works offline'     },
  btnInstall:              { he: 'התקן',                           en: 'Install'                         },
  btnInstallDismiss:       { he: 'אחר כך',                         en: 'Later'                           },
  toastSent:               { he: '✅ הדיווח נשלח בהצלחה',          en: '✅ Report sent'                   },
  toastSavedOffline:       { he: '☁️ נשמר מקומית, יסונכרן כשיתחדש החיבור', en: '☁️ Saved locally, will sync when online' },
  toastNoEndpoint:         { he: '⚠️ לא הוגדר Endpoint',           en: '⚠️ No Endpoint set'              },
  toastSendError:          { he: '❌ שגיאה בשליחה — נשמר לתור',    en: '❌ Send error — queued'           },
  toastNowUpdated:         { he: 'עודכן לשעה הנוכחית',             en: 'Updated to current time'         },
  toastSettingsSaved:      { he: '✅ הגדרות נשמרו',                 en: '✅ Settings saved'                },
  toastDataCleared:        { he: 'נמחק',                           en: 'Cleared'                         },
  toastSynced:             { he: (n) => `✅ נשלחו ${n} דיווחים`,   en: (n) => `✅ Synced ${n} reports`   },
  toastNoTime:             { he: '⚠️ יש לבחור תאריך ושעה',        en: '⚠️ Select date and time'         },
  toastNoDuration:         { he: '⚠️ יש להזין משך זמן',           en: '⚠️ Enter a duration'             },
  toastNoRange:            { he: '⚠️ יש לבחור שעת התחלה וסיום',   en: '⚠️ Select start and end'         },
  toastNoQueuePending:     { he: 'אין דיווחים ממתינים',            en: 'No pending reports'              },
  toastNoEndpointSync:     { he: '⚠️ הגדר Endpoint קודם',         en: '⚠️ Set Endpoint first'           },
  toastOnlineBack:         { he: '✅ חיבור לאינטרנט שוחזר',        en: '✅ Connection restored'           },
  toastSlowData:           { he: '⚠️ חיבור איטי',                  en: '⚠️ Slow connection'              },
  toastProjectAdded:       { he: '✅ פרויקט נוסף',                  en: '✅ Project added'                 },
  toastProjectExists:      { he: '⚠️ פרויקט כבר קיים',             en: '⚠️ Project already exists'       },
  toastProjectEmpty:       { he: '⚠️ שם פרויקט לא יכול להיות ריק', en: '⚠️ Project name cannot be empty' },
  toastProjectDeleted:     { he: '🗑 פרויקט נמחק',                  en: '🗑 Project deleted'               },
  toastReportDeleted:      { he: '🗑 דיווח נמחק',                   en: '🗑 Report deleted'                },
  versionLabel:            { he: (v) => `גרסה ${v}`,               en: (v) => `v${v}`                    },
  updateAvailable:         { he: 'גרסה חדשה זמינה! עדכן עכשיו',    en: 'New version available! Update now' },
  btnUpdate:               { he: 'עדכן',                           en: 'Update'                          },
  btnUpdateDismiss:        { he: 'לא עכשיו',                       en: 'Not now'                         },
  resetTitle:              { he: '⚠️ איפוס אפליקציה',               en: '⚠️ Reset App'                    },
  resetBody:               { he: 'בחר מה לשמור לפני האיפוס:',      en: 'Choose what to keep:'            },
  resetKeepReports:        { he: 'שמור היסטוריית דיווחים',          en: 'Keep report history'             },
  resetKeepSettings:       { he: 'שמור הגדרות',                    en: 'Keep settings'                   },
  resetKeepQueue:          { he: 'שמור תור ממתין',                  en: 'Keep pending queue'              },
  btnResetConfirm:         { he: '🗑 אפס הכל',                      en: '🗑 Reset Everything'              },
  btnResetCancel:          { he: 'ביטול',                           en: 'Cancel'                          },
  offlineBanner:           { he: 'אין חיבור לאינטרנט',             en: 'No internet connection'          },
  menuReport:              { he: 'דיווח',                           en: 'Report'                          },
  menuHistory:             { he: 'היסטוריה',                        en: 'History'                         },
  menuSummary:             { he: 'סיכום',                           en: 'Summary'                         },
  menuSettings:            { he: 'הגדרות',                          en: 'Settings'                        },
  confirmClearData:        { he: 'למחוק את כל הנתונים המקומיים?',  en: 'Delete all local data?'          },
  confirmDeleteReport:     { he: 'למחוק דיווח זה?',                en: 'Delete this report?'             },
  confirmDeleteProject:    { he: 'למחוק פרויקט זה?',               en: 'Delete this project?'            },
  syncQueueIndicator:      { he: 'ממתין לסנכרון',                   en: 'Pending sync'                    },
};
