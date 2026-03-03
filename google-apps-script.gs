// ============================================================
//  MyWorkLog – Google Apps Script  v3.0
//  הדבק קוד זה ב-Apps Script של הגיליון שלך
//  לאחר מכן: Deploy > New deployment > Web App
//  ✅ הרשאות: Anyone (אנונימי) / Execute as: Me
// ============================================================

const SHEET_NAME       = 'WorkLog';
const SHEET_ATTENDANCE = 'Attendance';
const SHEET_TASKS      = 'Tasks';
const SHEET_PROJECTS   = 'Projects';

const HEADERS            = ['Timestamp', 'Report_Date', 'Report_Time', 'Category', 'Description', 'Project', 'Record_ID'];
const ATTENDANCE_HEADERS = ['Report_Date', 'Report_Time – כניסה', 'Report_Time – יציאה', 'משך יום עבודה'];
const TASK_HEADERS       = ['Report_Date', 'משך משימה', 'Project', 'Description'];
const PROJECT_HEADERS    = ['Project_Name', 'Created_At'];

// ─── Router ──────────────────────────────────────────────────
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    // ── Project management ──
    if (data.action === 'addProject')    return ok(addProject(data.project));
    if (data.action === 'deleteProject') return ok(deleteProject(data.project));

    // ── Delete report ──
    if (data.action === 'delete') {
      deleteById(data.id);
      return ok('נמחק');
    }

    // ── Bi-directional sync ──
    if (data.action === 'syncReports') return jsonResp(syncReports(data));

    // ── New report ──
    const ss   = SpreadsheetApp.getActiveSpreadsheet();
    const main = getOrCreateSheet(ss, SHEET_NAME, HEADERS);
    const ts   = new Date().toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' });

    main.appendRow([
      ts,
      data.report_date || '',
      data.report_time || '',
      translateCategory(data.category) || '',
      data.description || '',
      data.project     || '',
      data.id          || '',
    ]);
    autoFormatLastRow(main, HEADERS.length);

    if (data.category === 'entry' || data.category === 'exit') updateAttendance(ss, data);
    if (data.category === 'task') updateTasks(ss, data);

    return ok('נשמר בהצלחה');
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  const action = e?.parameter?.action || '';

  // ── Return project list ──
  if (action === 'getProjects') {
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_PROJECTS);
    if (!sheet) return jsonResp({ projects: [] });
    const rows = sheet.getDataRange().getValues().slice(1); // skip header
    const names = rows.map(r => String(r[0]).trim()).filter(Boolean);
    return jsonResp({ projects: names });
  }

  // ── Return all reports for bi-directional sync ──
  if (action === 'getReports') {
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) return jsonResp({ reports: [] });
    const rows = sheet.getDataRange().getValues().slice(1);
    const reports = rows.map(r => ({
      timestamp:   r[0] ? String(r[0]) : '',
      report_date: String(r[1] || ''),
      report_time: String(r[2] || ''),
      category:    reverseCategory(String(r[3] || '')),
      description: String(r[4] || ''),
      project:     String(r[5] || ''),
      id:          String(r[6] || ''),
    })).filter(r => r.id);
    return jsonResp({ reports });
  }

  return jsonResp({ status: 'ok', app: 'MyWorkLog', version: '3.0' });
}

// ─── Attendance ───────────────────────────────────────────────
function updateAttendance(ss, data) {
  const sheet   = getOrCreateSheet(ss, SHEET_ATTENDANCE, ATTENDANCE_HEADERS);
  const date    = data.report_date;
  const time    = data.report_time;
  const allData = sheet.getDataRange().getValues();
  let rowIdx    = -1;
  for (let i = 1; i < allData.length; i++) {
    if (allData[i][0] === date) { rowIdx = i + 1; break; }
  }
  if (rowIdx === -1) {
    const newRow = [date, '', '', ''];
    if (data.category === 'entry') newRow[1] = time; else newRow[2] = time;
    sheet.appendRow(newRow);
    autoFormatLastRow(sheet, ATTENDANCE_HEADERS.length);
  } else {
    if (data.category === 'entry') {
      if (!sheet.getRange(rowIdx, 2).getValue()) sheet.getRange(rowIdx, 2).setValue(time);
    } else {
      sheet.getRange(rowIdx, 3).setValue(time);
    }
    const entry = sheet.getRange(rowIdx, 2).getValue();
    const exit  = sheet.getRange(rowIdx, 3).getValue();
    sheet.getRange(rowIdx, 4).setValue(calcDuration(entry, exit));
  }
}

// ─── Tasks ───────────────────────────────────────────────────
function updateTasks(ss, data) {
  const sheet = getOrCreateSheet(ss, SHEET_TASKS, TASK_HEADERS);
  sheet.appendRow([data.report_date || '', data.report_time || '', data.project || '', data.description || '']);
  autoFormatLastRow(sheet, TASK_HEADERS.length);
}

// ─── Projects ────────────────────────────────────────────────
function addProject(name) {
  if (!name || !name.trim()) return 'empty name';
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = getOrCreateSheet(ss, SHEET_PROJECTS, PROJECT_HEADERS);
  const rows  = sheet.getDataRange().getValues().slice(1);
  const exists = rows.some(r => String(r[0]).trim().toLowerCase() === name.trim().toLowerCase());
  if (exists) return 'already exists';
  sheet.appendRow([name.trim(), new Date().toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' })]);
  autoFormatLastRow(sheet, PROJECT_HEADERS.length);
  return 'added: ' + name;
}

function deleteProject(name) {
  if (!name) return 'no name';
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_PROJECTS);
  if (!sheet) return 'no sheet';
  const rows = sheet.getDataRange().getValues();
  for (let i = rows.length - 1; i >= 1; i--) {
    if (String(rows[i][0]).trim().toLowerCase() === name.trim().toLowerCase()) {
      sheet.deleteRow(i + 1);
    }
  }
  return 'deleted: ' + name;
}

// ─── Delete by ID ─────────────────────────────────────────────
function deleteById(id) {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) return;
  const data = sheet.getDataRange().getValues();
  for (let i = data.length - 1; i >= 1; i--) {
    if (String(data[i][6]) === String(id)) sheet.deleteRow(i + 1);
  }
  // Also remove from Tasks / Attendance if needed (by matching date+time for tasks)
}

// ─── Sync reports (bi-directional) ──────────────────────────
function syncReports(data) {
  // data.reports = array of local reports
  // data.deletedIds = array of IDs deleted locally
  const localReports  = data.reports     || [];
  const deletedIds    = data.deletedIds  || [];
  const ss            = SpreadsheetApp.getActiveSpreadsheet();
  const sheet         = getOrCreateSheet(ss, SHEET_NAME, HEADERS);
  const sheetData     = sheet.getDataRange().getValues();
  const sheetIds      = new Set(sheetData.slice(1).map(r => String(r[6])));
  const localIds      = new Set(localReports.map(r => r.id));

  // 1. Delete removed items from sheet
  for (const id of deletedIds) {
    for (let i = sheetData.length - 1; i >= 1; i--) {
      if (String(sheetData[i][6]) === String(id)) sheet.deleteRow(i + 1);
    }
  }

  // 2. Push local-only reports to sheet
  const ts = new Date().toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' });
  const toAdd = localReports.filter(r => !sheetIds.has(r.id) && !deletedIds.includes(r.id));
  for (const r of toAdd) {
    sheet.appendRow([ts, r.report_date||'', r.report_time||'', translateCategory(r.category)||'', r.description||'', r.project||'', r.id||'']);
    autoFormatLastRow(sheet, HEADERS.length);
    if (r.category === 'entry' || r.category === 'exit') updateAttendance(ss, r);
    if (r.category === 'task') updateTasks(ss, r);
  }

  // 3. Return sheet-only reports (not in local)
  const refreshedSheet = sheet.getDataRange().getValues().slice(1);
  const sheetOnly = refreshedSheet
    .filter(r => {
      const id = String(r[6]);
      return id && !localIds.has(id) && !deletedIds.includes(id);
    })
    .map(r => ({
      timestamp:   String(r[0]||''),
      report_date: String(r[1]||''),
      report_time: String(r[2]||''),
      category:    reverseCategory(String(r[3]||'')),
      description: String(r[4]||''),
      project:     String(r[5]||''),
      id:          String(r[6]||''),
      sent:        true,
    }));

  return { status: 'ok', added: toAdd.length, newReports: sheetOnly };
}

// ─── Helpers ─────────────────────────────────────────────────
function calcDuration(entry, exit) {
  if (!entry || !exit) return '';
  const toMins = t => { const p = String(t).split(':'); return parseInt(p[0])*60 + parseInt(p[1]||0); };
  const diff = toMins(exit) - toMins(entry);
  if (diff <= 0) return '';
  return pad(Math.floor(diff/60)) + ':' + pad(diff%60);
}

function pad(n) { return String(n).padStart(2, '0'); }

function ok(msg) {
  return ContentService.createTextOutput(JSON.stringify({ status: 'ok', message: msg }))
    .setMimeType(ContentService.MimeType.JSON);
}

function jsonResp(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function getOrCreateSheet(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    const hRow = sheet.getRange(1, 1, 1, headers.length);
    hRow.setValues([headers]);
    hRow.setFontWeight('bold');
    hRow.setBackground('#1a1d27');
    hRow.setFontColor('#4ade80');
    sheet.setFrozenRows(1);
    headers.forEach((_, i) => sheet.setColumnWidth(i+1, i >= 2 ? 200 : 130));
  }
  return sheet;
}

function autoFormatLastRow(sheet, colCount) {
  const lastRow = sheet.getLastRow();
  if (lastRow % 2 === 0) sheet.getRange(lastRow, 1, 1, colCount).setBackground('#f8f9fa');
}

function translateCategory(cat) {
  return { entry: 'כניסה', exit: 'יציאה', task: 'משימה' }[cat] || cat;
}

function reverseCategory(heb) {
  return { 'כניסה': 'entry', 'יציאה': 'exit', 'משימה': 'task' }[heb] || heb;
}

/*
  SETUP (v3.0):
  1. פתח את גיליון Google Sheets שלך
  2. Extensions > Apps Script
  3. הדבק קוד זה ושמור
  4. Deploy > New deployment > Web App
     Execute as: Me | Who has access: Anyone
  5. העתק Web App URL לאפליקציה (הגדרות > כתובת Script)
  6. הדבק URL של הגיליון עצמו (הגדרות > כתובת גיליון)

  גיליונות שייווצרו אוטומטית:
  ✅ WorkLog     - כל הדיווחים
  ✅ Attendance  - כניסה + יציאה + משך יום עבודה
  ✅ Tasks       - דיווחי משימות
  ✅ Projects    - פרויקטים (חדש בv3.0, מסונכרן דו-כיוונית)

  API actions (POST):
  • { action: 'addProject',    project: '...' }
  • { action: 'deleteProject', project: '...' }
  • { action: 'delete',        id: '...' }
  • { action: 'syncReports',   reports: [...], deletedIds: [...] }
  • { ...reportData } — שמירת דיווח רגיל

  API actions (GET):
  • ?action=getProjects  — מחזיר רשימת פרויקטים
  • ?action=getReports   — מחזיר כל הדיווחים (לסנכרון)
*/
