// ============================================================
//  MyWorkLog – Google Apps Script  v2.0
//  הדבק קוד זה ב-Apps Script של הגיליון שלך
//  לאחר מכן: Deploy > New deployment > Web App
//  ✅ הרשאות: Anyone (אנונימי) / Execute as: Me
// ============================================================

const SHEET_NAME       = 'WorkLog';
const SHEET_ATTENDANCE = 'Attendance';
const SHEET_TASKS      = 'Tasks';

const HEADERS            = ['Timestamp', 'Report_Date', 'Report_Time', 'Category', 'Description', 'Project', 'Record_ID'];
const ATTENDANCE_HEADERS = ['Report_Date', 'Report_Time – כניסה', 'Report_Time – יציאה', 'משך יום עבודה'];
const TASK_HEADERS       = ['Report_Date', 'משך משימה', 'Project', 'Description'];

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    if (data.action === 'delete') {
      deleteById(data.id);
      return ok('נמחק');
    }

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
    if (data.category === 'task')  updateTasks(ss, data);

    return ok('נשמר בהצלחה');
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  // Handle delete via GET (used by app since POST is no-cors)
  if (e && e.parameter && e.parameter.action === 'delete' && e.parameter.id) {
    try {
      deleteById(e.parameter.id);
      return ContentService.createTextOutput(JSON.stringify({ status: 'ok', message: 'נמחק' })).setMimeType(ContentService.MimeType.JSON);
    } catch(err) {
      return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.toString() })).setMimeType(ContentService.MimeType.JSON);
    }
  }
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok', app: 'MyWorkLog' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function updateAttendance(ss, data) {
  const sheet    = getOrCreateSheet(ss, SHEET_ATTENDANCE, ATTENDANCE_HEADERS);
  const date     = data.report_date;
  const time     = data.report_time;
  const allData  = sheet.getDataRange().getValues();
  let rowIdx     = -1;

  for (let i = 1; i < allData.length; i++) {
    if (allData[i][0] === date) { rowIdx = i + 1; break; }
  }

  if (rowIdx === -1) {
    const newRow = [date, '', '', ''];
    if (data.category === 'entry') newRow[1] = time;
    else newRow[2] = time;
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

function updateTasks(ss, data) {
  const sheet = getOrCreateSheet(ss, SHEET_TASKS, TASK_HEADERS);
  sheet.appendRow([data.report_date || '', data.report_time || '', data.project || '', data.description || '']);
  autoFormatLastRow(sheet, TASK_HEADERS.length);
}

function deleteById(id) {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) return;
  const data  = sheet.getDataRange().getValues();
  for (let i = data.length - 1; i >= 1; i--) {
    if (String(data[i][6]) === String(id)) sheet.deleteRow(i + 1);
  }
}

function calcDuration(entry, exit) {
  if (!entry || !exit) return '';
  const toMins = t => { const p = String(t).split(':'); return parseInt(p[0]) * 60 + parseInt(p[1] || 0); };
  const diff   = toMins(exit) - toMins(entry);
  if (diff <= 0) return '';
  return pad(Math.floor(diff / 60)) + ':' + pad(diff % 60);
}

function pad(n) { return String(n).padStart(2, '0'); }

function ok(msg) {
  return ContentService.createTextOutput(JSON.stringify({ status: 'ok', message: msg })).setMimeType(ContentService.MimeType.JSON);
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
    headers.forEach((_, i) => sheet.setColumnWidth(i + 1, i >= 2 ? 200 : 130));
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

/*
  SETUP:
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
*/
