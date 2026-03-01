// ============================================================
//  MyWorkLog – Google Apps Script
//  הדבק קוד זה ב-Apps Script של הגיליון שלך
//  לאחר מכן: Deploy > New deployment > Web App
//  ✅ הרשאות: Anyone (אנונימי) / Execute as: Me
// ============================================================

const SHEET_NAME = 'WorkLog';
const HEADERS = ['Timestamp', 'Report_Date', 'Report_Time', 'Category', 'Description', 'Project'];

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const sheet = getOrCreateSheet();

    const row = [
      new Date().toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' }),
      data.report_date   || '',
      data.report_time   || '',
      translateCategory(data.category) || '',
      data.description   || '',
      data.project       || '',
    ];

    sheet.appendRow(row);
    autoFormatLastRow(sheet);

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok', message: 'נשמר בהצלחה' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  // For CORS preflight / health check
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok', app: 'MyWorkLog' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function getOrCreateSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    // Add header row
    const headerRow = sheet.getRange(1, 1, 1, HEADERS.length);
    headerRow.setValues([HEADERS]);
    headerRow.setFontWeight('bold');
    headerRow.setBackground('#1a1d27');
    headerRow.setFontColor('#4ade80');

    // Freeze header
    sheet.setFrozenRows(1);

    // Column widths
    sheet.setColumnWidth(1, 160); // Timestamp
    sheet.setColumnWidth(2, 100); // Date
    sheet.setColumnWidth(3, 100); // Time
    sheet.setColumnWidth(4, 80);  // Category
    sheet.setColumnWidth(5, 300); // Description
    sheet.setColumnWidth(6, 130); // Project
  }

  return sheet;
}

function autoFormatLastRow(sheet) {
  const lastRow = sheet.getLastRow();
  const range = sheet.getRange(lastRow, 1, 1, HEADERS.length);

  // Alternate row coloring
  if (lastRow % 2 === 0) {
    range.setBackground('#f8f9fa');
  }
}

function translateCategory(cat) {
  const map = { entry: 'כניסה', exit: 'יציאה', task: 'משימה' };
  return map[cat] || cat;
}

// ============================================================
//  SETUP INSTRUCTIONS
// ============================================================
/*
  1. פתח את גיליון Google Sheets שלך
  2. Extensions > Apps Script
  3. מחק את הקוד הקיים והדבק את הקוד הזה
  4. שמור (Ctrl+S)
  5. Deploy > New deployment
     - Type: Web App
     - Execute as: Me
     - Who has access: Anyone
  6. אשר הרשאות
  7. העתק את ה-Web App URL
  8. הדבק את ה-URL בהגדרות האפליקציה MyWorkLog
*/
