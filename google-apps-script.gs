// ============================================================
//  MyWorkLog – Google Apps Script  v2.1
//  הדבק קוד זה ב-Apps Script של הגיליון שלך
//  לאחר מכן: Deploy > New deployment > Web App
//  ✅ הרשאות: Anyone (אנונימי) / Execute as: Me
// ============================================================

const SHEET_NAME       = 'WorkLog';
const SHEET_ATTENDANCE = 'Attendance';
const SHEET_TASKS      = 'Tasks';
const SHEET_PROJECTS   = 'Projects';

const HEADERS            = ['Timestamp','Report_Date','Report_Time','Category','Description','Project','Record_ID'];
const ATTENDANCE_HEADERS = ['Report_Date','Report_Time – כניסה','Report_Time – יציאה','משך יום עבודה'];
const TASK_HEADERS       = ['Report_Date','משך משימה','Project','Description'];
const PROJECT_HEADERS    = ['Project_Name','Created_At'];

// ─── Router ──────────────────────────────────────────────────
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    if (data.action === 'addProject')    return ok(addProject(data.project));
    if (data.action === 'deleteProject') return ok(deleteProject(data.project));
    if (data.action === 'delete')        { deleteById(data.id, data.category, data.report_date); return ok('נמחק'); }

    // Normal report
    const ss   = SpreadsheetApp.getActiveSpreadsheet();
    const main = getOrCreateSheet(ss, SHEET_NAME, HEADERS);
    const ts   = new Date().toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' });

    main.appendRow([ts, data.report_date||'', data.report_time||'',
      translateCategory(data.category)||'', data.description||'', data.project||'', data.id||'']);
    autoFormatLastRow(main, HEADERS.length);

    if (data.category === 'entry' || data.category === 'exit') updateAttendance(ss, data);
    if (data.category === 'task') updateTasks(ss, data);

    return ok('נשמר');
  } catch (err) {
    return errResp(err.toString());
  }
}

function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || '';

  if (action === 'getProjects') {
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_PROJECTS);
    if (!sheet) return jsonResp({ projects: [] });
    const rows  = sheet.getDataRange().getValues().slice(1);
    return jsonResp({ projects: rows.map(r => String(r[0]).trim()).filter(Boolean) });
  }

  if (action === 'getReports') {
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) return jsonResp({ reports: [], projects: [] });
    const rows    = sheet.getDataRange().getValues().slice(1);
    const reports = rows.map(r => ({
      timestamp:   String(r[0]||''),
      report_date: String(r[1]||''),
      report_time: String(r[2]||''),
      category:    reverseCategory(String(r[3]||'')),
      description: String(r[4]||''),
      project:     String(r[5]||''),
      id:          String(r[6]||''),
      sent:        true,
    })).filter(r => r.id);
    // Also return current projects
    const pSheet  = ss.getSheetByName(SHEET_PROJECTS);
    const projects = pSheet
      ? pSheet.getDataRange().getValues().slice(1).map(r => String(r[0]).trim()).filter(Boolean)
      : [];
    return jsonResp({ reports, projects });
  }

  return jsonResp({ status: 'ok', app: 'MyWorkLog', version: '2.1' });
}

// ─── Attendance ───────────────────────────────────────────────
function updateAttendance(ss, data) {
  const sheet   = getOrCreateSheet(ss, SHEET_ATTENDANCE, ATTENDANCE_HEADERS);
  const date    = data.report_date;
  const time    = data.report_time;
  const all     = sheet.getDataRange().getValues();
  let rowIdx    = -1;
  for (let i = 1; i < all.length; i++) {
    if (all[i][0] === date) { rowIdx = i + 1; break; }
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
  sheet.appendRow([data.report_date||'', data.report_time||'', data.project||'', data.description||'']);
  autoFormatLastRow(sheet, TASK_HEADERS.length);
}

// ─── Delete by ID — also cleans Attendance and Tasks ─────────
function deleteById(id, category, report_date) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. Remove from WorkLog
  const main = ss.getSheetByName(SHEET_NAME);
  if (main) {
    const data = main.getDataRange().getValues();
    for (let i = data.length - 1; i >= 1; i--) {
      if (String(data[i][6]) === String(id)) main.deleteRow(i + 1);
    }
  }

  // 2. Clean Attendance if entry or exit
  if ((category === 'entry' || category === 'exit') && report_date) {
    const attSheet = ss.getSheetByName(SHEET_ATTENDANCE);
    if (attSheet) {
      const attData = attSheet.getDataRange().getValues();
      for (let i = 1; i < attData.length; i++) {
        if (attData[i][0] === report_date) {
          const rowIdx = i + 1;
          if (category === 'entry') {
            attSheet.getRange(rowIdx, 2).setValue('');  // clear entry time
            attSheet.getRange(rowIdx, 4).setValue('');  // clear duration
          } else {
            attSheet.getRange(rowIdx, 3).setValue('');  // clear exit time
            attSheet.getRange(rowIdx, 4).setValue('');  // clear duration
          }
          // If both entry and exit are now empty, delete the whole row
          const entryVal = attSheet.getRange(rowIdx, 2).getValue();
          const exitVal  = attSheet.getRange(rowIdx, 3).getValue();
          if (!entryVal && !exitVal) attSheet.deleteRow(rowIdx);
          break;
        }
      }
    }
  }

  // 3. Clean Tasks if task (match by id in description — not ideal, but WorkLog is source of truth)
  // Tasks sheet doesn't store Record_ID, so we rely on WorkLog deletion only.
}

// ─── Projects ────────────────────────────────────────────────
function addProject(name) {
  if (!name || !name.trim()) return 'empty';
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = getOrCreateSheet(ss, SHEET_PROJECTS, PROJECT_HEADERS);
  const rows  = sheet.getDataRange().getValues().slice(1);
  if (rows.some(r => String(r[0]).trim().toLowerCase() === name.trim().toLowerCase())) return 'exists';
  sheet.appendRow([name.trim(), new Date().toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' })]);
  autoFormatLastRow(sheet, PROJECT_HEADERS.length);
  return 'added';
}

function deleteProject(name) {
  if (!name) return 'no name';
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_PROJECTS);
  if (!sheet) return 'no sheet';
  const rows = sheet.getDataRange().getValues();
  for (let i = rows.length - 1; i >= 1; i--) {
    if (String(rows[i][0]).trim().toLowerCase() === name.trim().toLowerCase()) sheet.deleteRow(i + 1);
  }
  return 'deleted';
}

// ─── Helpers ─────────────────────────────────────────────────
function calcDuration(entry, exit) {
  if (!entry || !exit) return '';
  const toMins = t => { const p = String(t).split(':'); return parseInt(p[0])*60 + parseInt(p[1]||0); };
  const diff = toMins(exit) - toMins(entry);
  if (diff <= 0) return '';
  return pad(Math.floor(diff/60)) + ':' + pad(diff % 60);
}

function pad(n) { return String(n).padStart(2, '0'); }

function ok(msg) {
  return ContentService.createTextOutput(JSON.stringify({ status:'ok', message:msg }))
    .setMimeType(ContentService.MimeType.JSON);
}
function errResp(msg) {
  return ContentService.createTextOutput(JSON.stringify({ status:'error', message:msg }))
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
  return { entry:'כניסה', exit:'יציאה', task:'משימה' }[cat] || cat;
}
function reverseCategory(heb) {
  return { 'כניסה':'entry', 'יציאה':'exit', 'משימה':'task' }[heb] || heb;
}

/*
  SETUP (v2.1):
  1. פתח גיליון Google Sheets חדש
  2. Extensions > Apps Script
  3. הדבק קוד זה ושמור (Ctrl+S)
  4. Deploy > New deployment > Web App
     Execute as: Me | Who has access: Anyone
  5. העתק Web App URL → הגדרות האפליקציה
  6. הדבק URL הגיליון → הגדרות האפליקציה

  גיליונות שייווצרו אוטומטית:
  ✅ WorkLog    - כל הדיווחים
  ✅ Attendance - כניסה + יציאה + משך יום
  ✅ Tasks      - דיווחי משימות
  ✅ Projects   - פרויקטים (חדש v2.1, דו-כיווני)

  GET actions: ?action=getProjects | ?action=getReports
  POST actions: { action:'delete', id, category, report_date }
              | { action:'addProject', project }
              | { action:'deleteProject', project }
              | { ...report } — שמירת דיווח
*/
