//  MyWorkLog – Google Apps Script  v2.4
//  הדבק קוד זה ב-Apps Script של הגיליון שלך
//  לאחר מכן: Deploy > New deployment > Web App
//  ✅ הרשאות: Anyone (אנונימי) / Execute as: Me
// ============================================================

const SHEET_NAME        = 'WorkLog';
const SHEET_ATTENDANCE  = 'Attendance';
const SHEET_TASKS       = 'Tasks';
const SHEET_PROJECTS    = 'Projects';
const SHEET_WSTANDARD   = 'WorkStandard';

const HEADERS            = ['Timestamp','Report_Date','Report_Time','Category','Description','Project','Record_ID'];
const ATTENDANCE_HEADERS = ['Report_Date','Report_Time – כניסה','Report_Time – יציאה','משך יום עבודה'];
const TASK_HEADERS       = ['Report_Date','משך משימה','Project','Description'];
const PROJECT_HEADERS    = ['Project_Name','Created_At'];
const WSTANDARD_HEADERS  = ['Date','WeekDay','Day_Standard_Hours','Notes'];

// ─── Router ──────────────────────────────────────────────────
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    if (data.action === 'setDayStandard') return ok(updateWorkStandard(data.date, data.weekDay, data.stdHours, data.notes||''));
    if (data.action === 'addProject')     return ok(addProject(data.project));
    if (data.action === 'deleteProject')  return ok(deleteProject(data.project));
    if (data.action === 'delete')         { deleteById(data.id, data.category, data.report_date); return ok('נמחק'); }
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

  if (action === 'getWorkStandard') {
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = getOrCreateSheet(ss, SHEET_WSTANDARD, WSTANDARD_HEADERS);
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return jsonResp({ workStandard: [] });
    const rows = sheet.getRange(2, 1, lastRow - 1, 4).getValues();
    const workStandard = rows
      .map(r => ({
        date:     fmtDateCell(r[0]),
        weekDay:  String(r[1]||'').trim(),
        stdHours: parseFloat(r[2]) || 0,
        notes:    String(r[3]||'').trim(),
      }))
      .filter(r => r.date);
    return jsonResp({ workStandard });
  }

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
      timestamp:   fmtDateCell(r[0])||String(r[0]||''),
      report_date: fmtDateCell(r[1]),
      report_time: (function(v){if(!v)return'';if(v instanceof Date)return String(v.getHours()).padStart(2,'0')+':'+String(v.getMinutes()).padStart(2,'0');var s=String(v).trim();var hms=s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);if(hms)return hms[1].padStart(2,'0')+':'+hms[2];var n=parseFloat(s);if(!isNaN(n)&&n>=0&&n<1){var tot=Math.round(n*1440);return String(Math.floor(tot/60)).padStart(2,'0')+':'+String(tot%60).padStart(2,'0');}var dm=s.match(/(\d{1,2}):(\d{2})/);if(dm)return dm[1].padStart(2,'0')+':'+dm[2];return s;})(r[2]),
      category:    reverseCategory(String(r[3]||'')),
      description: String(r[4]||''),
      project:     String(r[5]||''),
      id:          String(r[6]||''),
      sent:        true,
    })).filter(r => r.id);
    const pSheet   = ss.getSheetByName(SHEET_PROJECTS);
    const projects = pSheet
      ? pSheet.getDataRange().getValues().slice(1).map(r => String(r[0]).trim()).filter(Boolean)
      : [];
    return jsonResp({ reports, projects });
  }

  return jsonResp({ status: 'ok', app: 'MyWorkLog', version: '2.4' });
}

// ─── WorkStandard ─────────────────────────────────────────────
function updateWorkStandard(date, weekDay, stdHours, notes) {
  if (!date) return 'no date';
  const dateStr = String(date).trim();
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = getOrCreateSheet(ss, SHEET_WSTANDARD, WSTANDARD_HEADERS);
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    const col = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (let i = 0; i < col.length; i++) {
      if (fmtDateCell(col[i][0]) === dateStr) {
        sheet.getRange(i + 2, 1, 1, 4).setValues([[dateStr, weekDay||'', Number(stdHours)||0, notes||'']]);
        return 'updated';
      }
    }
  }
  sheet.appendRow([dateStr, weekDay||'', Number(stdHours)||0, notes||'']);
  autoFormatLastRow(sheet, WSTANDARD_HEADERS.length);
  return 'added';
}

// ── הפעל פעם אחת מה-editor כדי להקים את גיליון WorkStandard ──
function setupWorkStandard() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = getOrCreateSheet(ss, SHEET_WSTANDARD, WSTANDARD_HEADERS);
  sheet.getRange('A2:A1000').setNumberFormat('@STRING@');
  sheet.setColumnWidth(1, 120);
  sheet.setColumnWidth(2, 100);
  sheet.setColumnWidth(3, 170);
  sheet.setColumnWidth(4, 260);
  if (sheet.getLastRow() <= 1) {
    const today = Utilities.formatDate(new Date(), 'Asia/Jerusalem', 'yyyy-MM-dd');
    const dow   = ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'][new Date().getDay()];
    sheet.appendRow([today, dow, 8, 'דוגמה — ניתן למחוק']);
  }
  SpreadsheetApp.getUi().alert(
    'גיליון WorkStandard מוכן!\n\n' +
    'עמודות:\n' +
    '  A  Date               — YYYY-MM-DD\n' +
    '  B  WeekDay            — יום בשבוע\n' +
    '  C  Day_Standard_Hours — תקן שעות (מספר)\n' +
    '  D  Notes              — הערות (חופש, חג...)\n\n' +
    'ימים עם תקן 0 נחשבים ללא דרישה.'
  );
}

// ─── Attendance ───────────────────────────────────────────────
function updateAttendance(ss, data) {
  const sheet  = getOrCreateSheet(ss, SHEET_ATTENDANCE, ATTENDANCE_HEADERS);
  const date   = data.report_date, time = data.report_time;
  const all    = sheet.getDataRange().getValues();
  let rowIdx   = -1;
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
    sheet.getRange(rowIdx, 4).setValue(
      calcDuration(sheet.getRange(rowIdx, 2).getValue(), sheet.getRange(rowIdx, 3).getValue())
    );
  }
}

// ─── Tasks ───────────────────────────────────────────────────
function updateTasks(ss, data) {
  const sheet = getOrCreateSheet(ss, SHEET_TASKS, TASK_HEADERS);
  sheet.appendRow([data.report_date||'', data.report_time||'', data.project||'', data.description||'']);
  autoFormatLastRow(sheet, TASK_HEADERS.length);
}

// ─── Delete ───────────────────────────────────────────────────
function deleteById(id, category, report_date) {
  const ss   = SpreadsheetApp.getActiveSpreadsheet();
  const main = ss.getSheetByName(SHEET_NAME);
  if (main) {
    const data = main.getDataRange().getValues();
    for (let i = data.length - 1; i >= 1; i--) {
      if (String(data[i][6]) === String(id)) main.deleteRow(i + 1);
    }
  }
  if ((category === 'entry' || category === 'exit') && report_date) {
    const att = ss.getSheetByName(SHEET_ATTENDANCE);
    if (att) {
      const rows = att.getDataRange().getValues();
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][0] === report_date) {
          const r = i + 1;
          if (category === 'entry') { att.getRange(r,2).setValue(''); att.getRange(r,4).setValue(''); }
          else                      { att.getRange(r,3).setValue(''); att.getRange(r,4).setValue(''); }
          if (!att.getRange(r,2).getValue() && !att.getRange(r,3).getValue()) att.deleteRow(r);
          break;
        }
      }
    }
  }
}

// ─── Projects ────────────────────────────────────────────────
function addProject(name) {
  if (!name||!name.trim()) return 'empty';
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = getOrCreateSheet(ss, SHEET_PROJECTS, PROJECT_HEADERS);
  const rows  = sheet.getDataRange().getValues().slice(1);
  if (rows.some(r => String(r[0]).trim().toLowerCase() === name.trim().toLowerCase())) return 'exists';
  sheet.appendRow([name.trim(), new Date().toLocaleString('he-IL',{timeZone:'Asia/Jerusalem'})]);
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
    if (String(rows[i][0]).trim().toLowerCase() === name.trim().toLowerCase()) sheet.deleteRow(i+1);
  }
  return 'deleted';
}

// ─── Helpers ─────────────────────────────────────────────────
function calcDuration(entry, exit) {
  if (!entry||!exit) return '';
  const m = t => { const p=String(t).split(':'); return parseInt(p[0])*60+parseInt(p[1]||0); };
  const d = m(exit)-m(entry);
  return d>0 ? pad(Math.floor(d/60))+':'+pad(d%60) : '';
}

// Handles Date objects and common string formats → YYYY-MM-DD
function fmtDateCell(v) {
  if (!v) return '';
  if (v instanceof Date) {
    return v.getFullYear()+'-'+String(v.getMonth()+1).padStart(2,'0')+'-'+String(v.getDate()).padStart(2,'0');
  }
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.substring(0,10);
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
  return s;
}

function pad(n) { return String(n).padStart(2,'0'); }

function ok(msg)      { return ContentService.createTextOutput(JSON.stringify({status:'ok',message:msg})).setMimeType(ContentService.MimeType.JSON); }
function errResp(msg) { return ContentService.createTextOutput(JSON.stringify({status:'error',message:msg})).setMimeType(ContentService.MimeType.JSON); }
function jsonResp(o)  { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

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
    headers.forEach((_,i) => sheet.setColumnWidth(i+1, i>=2?200:130));
  }
  return sheet;
}
function autoFormatLastRow(sheet, colCount) {
  const r = sheet.getLastRow();
  if (r%2===0) sheet.getRange(r,1,1,colCount).setBackground('#f8f9fa');
}
function translateCategory(c) { return {entry:'כניסה',exit:'יציאה',task:'משימה'}[c]||c; }
function reverseCategory(h)   { return {'כניסה':'entry','יציאה':'exit','משימה':'task'}[h]||h; }

/*
  ═══════════════════════════════════════════════════════
  SETUP (v2.4)
  ═══════════════════════════════════════════════════════
  1. פתח את גיליון Google Sheets שלך
  2. Extensions → Apps Script → הדבק קוד זה → שמור
  3. בחר הפונקציה setupWorkStandard → לחץ Run
     (יוצר/מעצב את גיליון WorkStandard)
  4. Deploy → New deployment → Web App
     Execute as: Me | Who has access: Anyone
  5. העתק Web App URL → הגדרות האפליקציה → שמור

  ═══════════════════════════════════════════════════════
  גיליון WorkStandard
  ═══════════════════════════════════════════════════════
  A: Date               YYYY-MM-DD
  B: WeekDay            ראשון / שני / ... / שישי
  C: Day_Standard_Hours תקן שעות (8 / 8.5 / 0 לשבת-חג)
  D: Notes              הערה חופשית

  עריכה: ישירות בגיליון -או- דרך כפתור "ערוך תקן"
  בדוח היומי באפליקציה.
  ═══════════════════════════════════════════════════════
*/
