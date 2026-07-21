//  MyWorkLog – Google Apps Script  v6.9 (Server-Side Deduplication + Paid Absence Compensation)
//  הדבק קוד זה ב-Apps Script של הגיליון שלך
//  לאחר מכן: Deploy > New deployment > Web App
//  ✅ הרשאות: Anyone (אנונימי) / Execute as: Me
// ============================================================

const SHEET_NAME        = 'WorkLog';
const SHEET_ATTENDANCE  = 'Attendance';
const SHEET_TASKS_LOG   = 'Tasks';
const SHEET_PROJECTS    = 'Projects';
const SHEET_WSTANDARD   = 'WorkStandard';
const SHEET_CLIENTS     = 'Clients';
const SHEET_CLI_PROJ    = 'ClientProjects';

const HEADERS           = ['Timestamp','Report_Date','Report_Time','Category','Description','Project','Record_ID'];
const TASK_LOG_HEADERS  = ['Report_Date','משך משימה','Project','Description'];
const PROJECT_HEADERS   = ['Project_Name','Created_At'];
const WSTANDARD_HEADERS = ['Date','WeekDay','Day_Standard_Hours','Notes','Description'];
const CLIENTS_HEADERS   = ['Client_ID','Client_Name','Created_At'];
const CLI_PROJ_HEADERS  = ['Project_ID','Client_ID','Project_Name','Created_At'];

const ATT_HEADERS = ['Date','Entry','Exit','Duration','Daily Standard','Deviation','Classification','_row_type'];
const ATT_NCOLS   = ATT_HEADERS.length;

// ─────────────────────────────────────────────────────────────────────────────
//  doPost - WITH SERVER-SIDE DEDUPLICATION
// ─────────────────────────────────────────────────────────────────────────────
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    if (data.action === 'setDayStandard')       return ok(updateWorkStandard(data.date, data.weekDay, data.stdHours, data.notes||'', data.description||''));
    if (data.action === 'addProject')           return ok(addProject(data.project));
    if (data.action === 'deleteProject')        return ok(deleteProject(data.project));
    if (data.action === 'addClient')            return ok(addClient(data.id, data.name));
    if (data.action === 'deleteClient')         return ok(deleteClient(data.id));
    if (data.action === 'addClientProject')     return ok(addClientProject(data.id, data.clientId, data.name));
    if (data.action === 'deleteClientProject')  return ok(deleteClientProject(data.id));
    if (data.action === 'delete')               { deleteById(data.id, data.category, data.report_date); return ok('נמחק'); }
    if (data.action === 'editReport')           return ok(editReport(data));

    const ss   = SpreadsheetApp.getActiveSpreadsheet();
    const main = getOrCreateSheet(ss, SHEET_NAME, HEADERS);
    
    // 🛡️ חסימת כפילויות בצד שרת (Server-Side Deduplication)
    if (data.id) {
      const lastRow = main.getLastRow();
      if (lastRow > 1) {
        const idCol = main.getRange(2, 7, lastRow - 1, 1).getValues();
        for (let i = 0; i < idCol.length; i++) {
          if (String(idCol[i][0]).trim() === String(data.id).trim()) {
            return ok('נשמר (כפילות סוננה בשרת)');
          }
        }
      }
    }

    const ts   = new Date().toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' });
    main.appendRow([ts, data.report_date||'', data.report_time||'',
      translateCategory(data.category)||'', data.description||'', data.project||'', data.id||'']);
    autoFormatLastRow(main, HEADERS.length);

    if (data.category === 'entry' || data.category === 'exit') rebuildDayAttendance(ss, data.report_date);
    if (data.category === 'task') updateTasksLog(ss, data);
    return ok('נשמר');
  } catch (err) { return errResp(err.toString()); }
}

// ─────────────────────────────────────────────────────────────────────────────
//  doGet
// ─────────────────────────────────────────────────────────────────────────────
function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || '';

  if (action === 'getWorkStandard') {
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = getOrCreateSheet(ss, SHEET_WSTANDARD, WSTANDARD_HEADERS);
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return jsonResp({ workStandard: [] });
    const rows = sheet.getRange(2, 1, lastRow-1, 5).getValues();
    return jsonResp({ workStandard: rows.map(r=>({
      date:fmtDateCell(r[0]), weekDay:String(r[1]||'').trim(),
      stdHours:parseFloat(r[2])||0, notes:String(r[3]||'').trim(),
      description:String(r[4]||'').trim()
    })).filter(r=>r.date) });
  }

  if (action === 'getProjects') {
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_PROJECTS);
    if (!sheet) return jsonResp({ projects: [] });
    return jsonResp({ projects: sheet.getDataRange().getValues().slice(1).map(r=>String(r[0]).trim()).filter(Boolean) });
  }

  if (action === 'getReports') {
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) return jsonResp({ reports: [], projects: [] });
    const reports = sheet.getDataRange().getValues().slice(1).map(r=>({
      timestamp:fmtDateCell(r[0])||String(r[0]||''), report_date:fmtDateCell(r[1]),
      report_time:parseTimeCell(r[2]), category:reverseCategory(String(r[3]||'')),
      description:String(r[4]||''), project:String(r[5]||''), id:String(r[6]||''), sent:true
    })).filter(r=>r.id);
    const pSheet   = ss.getSheetByName(SHEET_PROJECTS);
    const projects = pSheet ? pSheet.getDataRange().getValues().slice(1).map(r=>String(r[0]).trim()).filter(Boolean) : [];
    return jsonResp({ reports, projects });
  }

  if (action === 'rebuildAttendance') {
    rebuildAllAttendance();
    return ok('Attendance rebuilt');
  }

  return jsonResp({ status:'ok', app:'MyWorkLog', version:'6.7' });
}

// ─────────────────────────────────────────────────────────────────────────────
//  Attendance  v4.1
// ─────────────────────────────────────────────────────────────────────────────
function getStdForDate(ss, dateStr) {
  const sh = ss.getSheetByName(SHEET_WSTANDARD);
  if (!sh || sh.getLastRow() <= 1) return { stdHours:0, stdStr:'', classification:'' };
  const rows = sh.getRange(2, 1, sh.getLastRow()-1, 5).getValues();
  for (const r of rows) {
    if (fmtDateCell(r[0]) === dateStr) {
      const h = parseFloat(r[2]) || 0;
      const notes = String(r[3]||'').trim();
      const desc  = String(r[4]||'').trim();
      return { 
        stdHours:h, 
        stdStr: h>0 ? pad(Math.floor(h))+':'+pad(Math.round((h%1)*60)) : '',
        classification: [notes, desc].filter(Boolean).join(' — ')
      };
    }
  }
  return { stdHours:0, stdStr:'', classification:'' };
}

function toMins(t) {
  if (!t) return 0;
  const p = String(t).split(':');
  return parseInt(p[0]||0)*60 + parseInt(p[1]||0);
}

function fmtMins(m) {
  if (!m || m <= 0) return '';
  return pad(Math.floor(m/60)) + ':' + pad(m%60);
}

function fmtDev(d) {
  if (d === 0) return '00:00';
  const sign = d>0?'+':'-', abs=Math.abs(d);
  return sign + pad(Math.floor(abs/60)) + ':' + pad(abs%60);
}

function getPairsForDate(ss, dateStr) {
  const sh = ss.getSheetByName(SHEET_NAME);
  if (!sh || sh.getLastRow() <= 1) return { pairs:[], openEntry:null, unmatchedExits:[] };

  const entries = new Set();
  const exits = new Set();
  const seenIds = new Set();

  sh.getDataRange().getValues().slice(1).forEach(r => {
    if (fmtDateCell(r[1]) !== dateStr) return;
    
    const id = String(r[6] || '').trim();
    if (id && seenIds.has(id)) return; 
    if (id) seenIds.add(id);

    const cat = reverseCategory(String(r[3]||''));
    const t   = parseTimeCell(r[2]);
    if (!t) return;

    if (cat === 'entry') entries.add(t);
    else if (cat === 'exit') exits.add(t);
  });

  const arrEntries = Array.from(entries).sort();
  const arrExits = Array.from(exits).sort();

  const pairs = [], usedExits = new Set();
  
  for (const en of arrEntries) {
    const ex = arrExits.find(x => x >= en && !usedExits.has(x));
    if (ex) {
      usedExits.add(ex);
      const dur = toMins(ex) - toMins(en);
      if (dur > 0) pairs.push({ entry:en, exit:ex, durationMins:dur });
    }
  }

  const pairedEntries = new Set(pairs.map(p=>p.entry));
  const pairedExits   = new Set(pairs.map(p=>p.exit));
  const openEntry       = arrEntries.find(e=>!pairedEntries.has(e)) || null;
  const unmatchedExits  = arrExits.filter(x=>!pairedExits.has(x));
  
  return { pairs, openEntry, unmatchedExits };
}

function deleteAttendanceRowsForDate(sheet, dateStr) {
  if (sheet.getLastRow() <= 1) return;
  const vals = sheet.getDataRange().getValues();
  for (let i = vals.length-1; i >= 1; i--) {
    if (fmtDateCell(vals[i][0]) === dateStr) sheet.deleteRow(i+1);
  }
}

function rebuildDayAttendance(ss, dateStr) {
  const sheet = getOrCreateAttSheet(ss);
  deleteAttendanceRowsForDate(sheet, dateStr);
  SpreadsheetApp.flush();

  let { pairs, openEntry, unmatchedExits } = getPairsForDate(ss, dateStr);
  const { stdHours, stdStr, classification } = getStdForDate(ss, dateStr);
  
  const lowerClass = String(classification).toLowerCase();
  const isPaidAbsence = /חופש|מחלה|חלה|sick|vacation|חג|שבתון|sabbatical/.test(lowerClass);

  if (pairs.length === 0 && !openEntry && unmatchedExits.length === 0 && !isPaidAbsence) return;

  const stdMins   = Math.round(stdHours * 60);
  let totalMins = pairs.reduce((s,p)=>s+p.durationMins, 0);
  
  if (isPaidAbsence && stdMins > 0 && totalMins < stdMins) {
    totalMins = stdMins;
  }

  const devMins   = stdMins > 0 ? totalMins - stdMins : null;
  const devStr    = devMins !== null ? fmtDev(devMins) : '';

  const newRows = [];

  if (pairs.length === 0 && isPaidAbsence) {
    newRows.push([dateStr, '🛡️ מפוצה', '🛡️ מפוצה', fmtMins(totalMins), stdStr, devStr, classification, 'single']);
  } else if (pairs.length <= 1 && !openEntry) {
    const p = pairs[0] || { entry: '🛡️ מפוצה', exit: '🛡️ מפוצה' };
    newRows.push([dateStr, p.entry, p.exit, fmtMins(totalMins), stdStr, devStr, classification, 'single']);
  } else {
    const firstEntry = pairs.length>0 ? pairs[0].entry : openEntry;
    const lastExit   = pairs.length>0 ? pairs[pairs.length-1].exit : '';
    newRows.push([dateStr, firstEntry, lastExit, fmtMins(totalMins), stdStr, devStr, classification, 'summary']);
    for (const p of pairs) {
      newRows.push([dateStr, p.entry, p.exit, fmtMins(p.durationMins), '', '', '', 'detail']);
    }
    if (openEntry) newRows.push([dateStr, openEntry, '⏳ פתוח', '', '', '', '', 'detail']);
  }

  unmatchedExits.forEach(ex => {
    newRows.push([dateStr, '⚠️ חסרה כניסה', ex, '', stdStr, devStr, classification, 'orphan']);
  });

  let insertBefore = -1;
  if (sheet.getLastRow() > 1) {
    const data = sheet.getRange(2, 1, sheet.getLastRow()-1, ATT_NCOLS).getValues();
    for (let i=0; i<data.length; i++) {
      const rowDate = fmtDateCell(data[i][0]);
      const rowType = String(data[i][7] || data[i][6]); 
      if ((rowType === 'single' || rowType === 'summary' || rowType === 'orphan') && rowDate > dateStr) {
        insertBefore = i + 2;
        break;
      }
    }
  }

  if (insertBefore !== -1) {
    sheet.insertRowsBefore(insertBefore, newRows.length);
    sheet.getRange(insertBefore, 1, newRows.length, ATT_NCOLS).setValues(newRows);
    formatAttRows(sheet, insertBefore, newRows);
  } else {
    const firstNew = sheet.getLastRow() + 1;
    sheet.getRange(firstNew, 1, newRows.length, ATT_NCOLS).setValues(newRows);
    formatAttRows(sheet, firstNew, newRows);
  }
}

function rebuildAllAttendance() {
  const ss   = SpreadsheetApp.getActiveSpreadsheet();
  const main = ss.getSheetByName(SHEET_NAME);
  
  const dateMap = {}; 
  const seenIds = new Set();

  // לקבלת תאריך היום הנוכחי בפורמט YYYY-MM-DD לפי שעון ישראל
  const todayStr = Utilities.formatDate(new Date(), "Asia/Jerusalem", "yyyy-MM-dd");

  // 1. איסוף דיווחים קיימים מ-WorkLog
  if (main && main.getLastRow() > 1) {
    const worklogRows = main.getDataRange().getValues().slice(1);
    worklogRows.forEach(r => {
      const id = String(r[6] || '').trim();
      if (id && seenIds.has(id)) return;
      if (id) seenIds.add(id);

      const cat = reverseCategory(String(r[3]||''));
      const d   = fmtDateCell(r[1]);
      const t   = parseTimeCell(r[2]);
      if (!d || !t) return;

      if (!dateMap[d]) dateMap[d] = { entries: new Set(), exits: new Set() };
      
      if (cat === 'entry') dateMap[d].entries.add(t);
      else if (cat === 'exit') dateMap[d].exits.add(t);
    });
  }

  // 2. משיכת נתוני תקן מ-WorkStandard ובניית מפת התקן
  const wss = ss.getSheetByName(SHEET_WSTANDARD);
  const stdMap = {};
  if (wss && wss.getLastRow() > 1) {
    wss.getRange(2, 1, wss.getLastRow()-1, 5).getValues().forEach(r => {
      const d = fmtDateCell(r[0]);
      if (!d) return;
      const h    = parseFloat(r[2]) || 0;
      const notes = String(r[3]||'').trim();
      const desc  = String(r[4]||'').trim();
      
      stdMap[d] = {
        stdHours: h,
        stdStr: h > 0 ? pad(Math.floor(h)) + ':' + pad(Math.round((h % 1) * 60)) : '',
        classification: [notes, desc].filter(Boolean).join(' — ')
      };

      // ✨ תיקון: מייצרים יום מפוצה ב-dateMap אך ורק אם יש בו שעות תקן מעל 0 (h > 0)
      const isPaidAbsence = /חופש|מחלה|חלה|sick|vacation|חג|שבתון|sabbatical/.test(notes.toLowerCase());
      if (isPaidAbsence && h > 0 && d <= todayStr && !dateMap[d]) {
        dateMap[d] = { entries: new Set(), exits: new Set() };
      }
    });
  }

  const allRows = [];
  
  // 3. מעבר על כל התאריכים הרלוונטיים
  Object.keys(dateMap).sort().forEach(dateStr => {
    const arrEntries = Array.from(dateMap[dateStr].entries).sort();
    const arrExits = Array.from(dateMap[dateStr].exits).sort();

    const pairs = [], usedExits = new Set();
    arrEntries.forEach(en => {
      const ex = arrExits.find(x => x >= en && !usedExits.has(x));
      if (ex) { 
        usedExits.add(ex); 
        const dur = toMins(ex) - toMins(en); 
        if (dur > 0) pairs.push({ entry:en, exit:ex, durationMins:dur }); 
      }
    });
    
    const pairedEntries = new Set(pairs.map(p=>p.entry));
    const pairedExits  = new Set(pairs.map(p=>p.exit));
    const openEntry       = arrEntries.find(e=>!pairedEntries.has(e)) || null;
    const unmatchedExits  = arrExits.filter(x=>!pairedExits.has(x));

    const std      = stdMap[dateStr] || { stdHours:0, stdStr:'', classification:'' };
    const stdMins  = Math.round(std.stdHours * 60);
    let totalMins = pairs.reduce((s,p)=>s+p.durationMins, 0);

    // בדיקה האם מדובר ביום היעדרות מוצדק *שיש בו תקן שעות בפועל*
    const isPaidAbsence = /חופש|מחלה|חלה|sick|vacation|חג|שבתון|sabbatical/.test(String(std.classification||'').toLowerCase());
    const hasValidStandard = stdMins > 0;

    // מנגנון הפיצוי בשעות ירוץ רק אם יש תקן שעות מוגדר
    if (isPaidAbsence && hasValidStandard && dateStr <= todayStr && totalMins < stdMins) {
      totalMins = stdMins;
    }

    // ✨ תיקון: אם אין דיווחים וזה יום ללא תקן שעות (גם אם כתוב חג/שבתון) — מדלגים לחלוטין ולא מייצרים שורה
    if (pairs.length === 0 && !openEntry && unmatchedExits.length === 0 && !(isPaidAbsence && hasValidStandard)) return;

    const devMins  = stdMins > 0 ? totalMins - stdMins : null;
    const devStr   = devMins !== null ? fmtDev(devMins) : '';
    const absenceLabel = std.classification || 'היעדרות מוצדקת';

    if (pairs.length === 0 && isPaidAbsence && hasValidStandard) {
      allRows.push([dateStr, absenceLabel, absenceLabel, fmtMins(totalMins), std.stdStr, devStr, std.classification || '', 'single']);
    } else if (pairs.length <= 1 && !openEntry) {
      const p = pairs[0] || { entry: absenceLabel, exit: absenceLabel };
      allRows.push([dateStr, p.entry, p.exit, fmtMins(totalMins), std.stdStr, devStr, std.classification || '', 'single']);
    } else {
      const firstEntry = pairs.length > 0 ? pairs[0].entry : openEntry;
      const lastExit   = pairs.length > 0 ? pairs[pairs.length-1].exit : '';
      allRows.push([dateStr, firstEntry, lastExit, fmtMins(totalMins), std.stdStr, devStr, std.classification || '', 'summary']);
      
      pairs.forEach(p => allRows.push([dateStr, p.entry, p.exit, fmtMins(p.durationMins), '', '', '', 'detail']));
      if (openEntry) allRows.push([dateStr, openEntry, '⏳ פתוח', '', '', '', '', 'detail']);
      unmatchedExits.forEach(ex => allRows.push([dateStr, '⚠️ חסרה כניסה', ex, '', std.stdStr, devStr, std.classification || '', 'orphan']));
    }
  });

  // 4. כתיבה מחדש לגיליון Attendance
  const sheet = getOrCreateAttSheet(ss);
  if (sheet.getLastRow() > 1) sheet.deleteRows(2, sheet.getLastRow()-1);

  if (allRows.length > 0) {
    sheet.getRange(2, 1, allRows.length, ATT_NCOLS).setValues(allRows);
    formatAttRows(sheet, 2, allRows);
  }
}

function getOrCreateAttSheet(ss) {
  let sh = ss.getSheetByName(SHEET_ATTENDANCE);
  if (!sh) {
    sh = ss.insertSheet(SHEET_ATTENDANCE);
    sh.setFrozenRows(1);
  }
  const hRange = sh.getRange(1, 1, 1, ATT_NCOLS);
  hRange.setValues([ATT_HEADERS]);
  hRange.setFontWeight('bold');
  hRange.setBackground('#1a1d27');
  hRange.setFontColor('#4ade80');
  [120, 90, 90, 90, 100, 110, 160, 0].forEach((w,i) => { if(w>0) sh.setColumnWidth(i+1,w); });
  sh.hideColumns(ATT_NCOLS);
  sh.getRange('A2:A5000').setNumberFormat('@STRING@'); 
  return sh;
}

function formatAttRows(sheet, startRow, rows) {
  rows.forEach((r, i) => {
    const sr    = startRow + i;
    const type  = r[7]; 
    const range = sheet.getRange(sr, 1, 1, ATT_NCOLS);

    if (type === 'summary') {
      range.setFontWeight('bold');
      range.setBackground('#1a1d27');
      range.setFontColor('#4ade80');
    } else if (type === 'detail') {
      range.setBackground('#f0f4f8');
      range.setFontColor('#555555');
      range.setFontStyle('italic');
      range.setFontWeight('normal');
    } else if (type === 'orphan') {
      range.setBackground('#fff3cd');
      range.setFontColor('#856404');
      range.setFontStyle('italic');
      range.setFontWeight('normal');
    } else {
      if (sr % 2 === 0) range.setBackground('#f8f9fa');
    }

    const dev = String(r[5]);
    if (dev) {
      const cell = sheet.getRange(sr, 6);
      if (dev.startsWith('+'))      cell.setFontColor('#22c55e');
      else if (dev.startsWith('-')) cell.setFontColor('#ef4444');
      else                          cell.setFontColor(null);
    }
  });
}

function editReport(data) {
  if (!data.id) return 'no id';
  const ss   = SpreadsheetApp.getActiveSpreadsheet();
  const main = ss.getSheetByName(SHEET_NAME);
  if (!main || main.getLastRow() <= 1) return 'no sheet';

  const rows = main.getDataRange().getValues();
  for (let i = rows.length - 1; i >= 1; i--) {
    if (String(rows[i][6]) === String(data.id)) {
      const ts = rows[i][0]; 
      main.getRange(i + 1, 1, 1, HEADERS.length).setValues([[
        ts,
        data.report_date  || '',
        data.report_time  || '',
        translateCategory(data.category) || '',
        data.description  || '',
        data.project      || '',
        data.id
      ]]);
      if (data.category === 'entry' || data.category === 'exit') {
        rebuildDayAttendance(ss, data.report_date);
      }
      if (data.old_date && data.old_date !== data.report_date) {
        if (data.category === 'entry' || data.category === 'exit') {
          rebuildDayAttendance(ss, data.old_date);
        }
      }
      return 'updated';
    }
  }
  const ts2 = new Date().toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' });
  main.appendRow([ts2, data.report_date||'', data.report_time||'',
    translateCategory(data.category)||'', data.description||'', data.project||'', data.id||'']);
  autoFormatLastRow(main, HEADERS.length);
  if (data.category === 'entry' || data.category === 'exit') rebuildDayAttendance(ss, data.report_date);
  return 'appended';
}

function deleteById(id, category, report_date) {
  const ss   = SpreadsheetApp.getActiveSpreadsheet();
  const main = ss.getSheetByName(SHEET_NAME);
  if (main) {
    const data = main.getDataRange().getValues();
    for (let i=data.length-1; i>=1; i--)
      if (String(data[i][6])===String(id)) main.deleteRow(i+1);
  }
  if ((category==='entry'||category==='exit') && report_date)
    rebuildDayAttendance(ss, report_date);
}

function updateWorkStandard(date, weekDay, stdHours, notes, description) {
  if (!date) return 'no date';
  const dateStr = String(date).trim();
  const ss      = SpreadsheetApp.getActiveSpreadsheet();
  const sheet   = getOrCreateSheet(ss, SHEET_WSTANDARD, WSTANDARD_HEADERS);
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    const col = sheet.getRange(2, 1, lastRow-1, 1).getValues();
    for (let i=0; i<col.length; i++) {
      if (fmtDateCell(col[i][0]) === dateStr) {
        sheet.getRange(i+2, 1).setNumberFormat('@STRING@');
        sheet.getRange(i+2, 1, 1, 5).setValues([[dateStr, weekDay||'', Number(stdHours)||0, notes||'', description||'']]);
        rebuildDayAttendance(ss, dateStr);
        return 'updated';
      }
    }
  }
  const newRow = sheet.getLastRow() + 1;
  sheet.getRange(newRow, 1).setNumberFormat('@STRING@');
  sheet.getRange(newRow, 1, 1, 5).setValues([[dateStr, weekDay||'', Number(stdHours)||0, notes||'', description||'']]);
  autoFormatLastRow(sheet, WSTANDARD_HEADERS.length);
  rebuildDayAttendance(ss, dateStr);
  return 'added';
}

function updateTasksLog(ss, data) {
  const sheet = getOrCreateSheet(ss, SHEET_TASKS_LOG, TASK_LOG_HEADERS);
  sheet.appendRow([data.report_date||'', data.report_time||'', data.project||'', data.description||'']);
  autoFormatLastRow(sheet, TASK_LOG_HEADERS.length);
}

function addProject(name) {
  if (!name||!name.trim()) return 'empty';
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = getOrCreateSheet(ss, SHEET_PROJECTS, PROJECT_HEADERS);
  if (sheet.getDataRange().getValues().slice(1).some(r=>String(r[0]).trim().toLowerCase()===name.trim().toLowerCase())) return 'exists';
  sheet.appendRow([name.trim(), new Date().toLocaleString('he-IL',{timeZone:'Asia/Jerusalem'})]);
  autoFormatLastRow(sheet, PROJECT_HEADERS.length); return 'added';
}
function deleteProject(name) {
  if (!name) return 'no name';
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_PROJECTS);
  if (!sheet) return 'no sheet';
  const rows = sheet.getDataRange().getValues();
  for (let i=rows.length-1;i>=1;i--) if(String(rows[i][0]).trim().toLowerCase()===name.trim().toLowerCase()) sheet.deleteRow(i+1);
  return 'deleted';
}

function addClient(id,name){
  if(!id||!name||!name.trim())return'empty';
  const ss=SpreadsheetApp.getActiveSpreadsheet(),sheet=getOrCreateSheet(ss,SHEET_CLIENTS,CLIENTS_HEADERS);
  if(sheet.getLastRow()>1&&sheet.getRange(2,1,sheet.getLastRow()-1,1).getValues().some(r=>String(r[0]).trim()===id))return'exists';
  sheet.appendRow([id,name.trim(),new Date().toLocaleString('he-IL',{timeZone:'Asia/Jerusalem'})]);
  autoFormatLastRow(sheet,CLIENTS_HEADERS.length);return'added';
}
function deleteClient(id){
  if(!id)return'no id';
  const ss=SpreadsheetApp.getActiveSpreadsheet();
  deleteRowById(ss,SHEET_CLIENTS,id,0);
  const pSheet=ss.getSheetByName(SHEET_CLI_PROJ);
  if(pSheet&&pSheet.getLastRow()>1){
    const rows=pSheet.getRange(2,1,pSheet.getLastRow()-1,2).getValues();
    for(let i=rows.length-1;i>=0;i--)if(String(rows[i][1]).trim()===id)pSheet.deleteRow(i+2);
  }
  return'deleted';
}
function addClientProject(id,clientId,name){
  if(!id||!clientId||!name||!name.trim())return'empty';
  const ss=SpreadsheetApp.getActiveSpreadsheet(),sheet=getOrCreateSheet(ss,SHEET_CLI_PROJ,CLI_PROJ_HEADERS);
  if(sheet.getLastRow()>1&&sheet.getRange(2,1,sheet.getLastRow()-1,1).getValues().some(r=>String(r[0]).trim()===id))return'exists';
  sheet.appendRow([id,clientId,name.trim(),new Date().toLocaleString('he-IL',{timeZone:'Asia/Jerusalem'})]);
  autoFormatLastRow(sheet,CLI_PROJ_HEADERS.length);
  addProject(name.trim());return'added';
}
function deleteClientProject(id){
  if(!id)return'no id';
  deleteRowById(SpreadsheetApp.getActiveSpreadsheet(),SHEET_CLI_PROJ,id,0);return'deleted';
}

function setupSheets() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const setup = (name,headers,widths) => {
    const sh=getOrCreateSheet(ss,name,headers);
    widths.forEach((w,i)=>sh.setColumnWidth(i+1,w));return sh;
  };
  setup(SHEET_WSTANDARD, WSTANDARD_HEADERS, [120,100,170,200,220]);
  setup(SHEET_CLIENTS,   CLIENTS_HEADERS,   [180,220,200]);
  setup(SHEET_CLI_PROJ,  CLI_PROJ_HEADERS,  [180,180,220,200]);
  const wsSheet = ss.getSheetByName(SHEET_WSTANDARD);
  if (wsSheet) {
    wsSheet.getRange('A2:A5000').setNumberFormat('@STRING@');
    const lastR = wsSheet.getLastRow();
    if (lastR > 1) {
      const dateCol = wsSheet.getRange(2, 1, lastR-1, 1).getValues();
      const fixed = dateCol.map(r => [fmtDateCell(r[0]) || r[0]]);
      wsSheet.getRange(2, 1, lastR-1, 1).setNumberFormat('@STRING@').setValues(fixed);
    }
  }
  getOrCreateAttSheet(ss); 
  SpreadsheetApp.getUi().alert(
    'MyWorkLog v6.7 — גיליונות מוכנים!\n\n' +
    'חסימת כפילויות צד שרת הופעלה.\n\n' +
    'Deploy → New deployment לאחר השמירה!'
  );
}
function setupWorkStandard() { setupSheets(); }

function deleteRowById(ss, sheetName, id, col) {
  const sheet=ss.getSheetByName(sheetName);
  if(!sheet||sheet.getLastRow()<=1)return;
  const rows=sheet.getRange(2,1,sheet.getLastRow()-1,col+1).getValues();
  for(let i=rows.length-1;i>=0;i--)if(String(rows[i][col]).trim()===id)sheet.deleteRow(i+2);
}

function fmtDateCell(v) {
  if (!v) return '';
  if (v instanceof Date) {
    if (isNaN(v.getTime())) return '';
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jerusalem',
      year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(v);
    const yp = parts.find(p=>p.type==='year').value;
    const mp = parts.find(p=>p.type==='month').value;
    const dp = parts.find(p=>p.type==='day').value;
    return `${yp}-${mp}-${dp}`;
  }
  const s = String(v).trim();
  if (!s) return '';
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const slash = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slash) {
    let p1 = parseInt(slash[1], 10);
    let p2 = parseInt(slash[2], 10);
    let yr = parseInt(slash[3], 10);
    if (yr < 100) yr += (yr < 50 ? 2000 : 1900);
    let day, mon;
    if (p1 > 12 && p2 <= 12) { day = p1; mon = p2; }      
    else if (p2 > 12 && p1 <= 12) { day = p2; mon = p1; } 
    else { day = p1; mon = p2; }                             
    return `${yr}-${String(mon).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
  }
  const dot = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/);
  if (dot) {
    let day = parseInt(dot[1],10), mon = parseInt(dot[2],10), yr = parseInt(dot[3],10);
    if (yr < 100) yr += (yr < 50 ? 2000 : 1900);
    return `${yr}-${String(mon).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
  }
  return s; 
}
function parseTimeCell(v) {
  if(!v)return'';
  if(v instanceof Date)return String(v.getHours()).padStart(2,'0')+':'+String(v.getMinutes()).padStart(2,'0');
  const s=String(v).trim(),hms=s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if(hms)return hms[1].padStart(2,'0')+':'+hms[2];
  const n=parseFloat(s);
  if(!isNaN(n)&&n>=0&&n<1){const tot=Math.round(n*1440);return String(Math.floor(tot/60)).padStart(2,'0')+':'+String(tot%60).padStart(2,'0');}
  const dm=s.match(/(\d{1,2}):(\d{2})/);if(dm)return dm[1].padStart(2,'0')+':'+dm[2];return s;
}
function pad(n)       { return String(n).padStart(2,'0'); }
function ok(msg)      { return ContentService.createTextOutput(JSON.stringify({status:'ok',message:msg})).setMimeType(ContentService.MimeType.JSON); }
function errResp(msg) { return ContentService.createTextOutput(JSON.stringify({status:'error',message:msg})).setMimeType(ContentService.MimeType.JSON); }
function jsonResp(o)  { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function getOrCreateSheet(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.setFrozenRows(1);
    headers.forEach((_,i) => sheet.setColumnWidth(i+1, i>=2 ? 200 : 130));
  }
  const hRow = sheet.getRange(1, 1, 1, headers.length);
  hRow.setValues([headers]);
  hRow.setFontWeight('bold');
  hRow.setBackground('#1a1d27');
  hRow.setFontColor('#4ade80');
  sheet.setFrozenRows(1);
  return sheet;
}
function autoFormatLastRow(sheet, colCount) {
  const r=sheet.getLastRow();if(r%2===0)sheet.getRange(r,1,1,colCount).setBackground('#f8f9fa');
}
function translateCategory(c) { return{entry:'כניסה',exit:'יציאה',task:'משימה'}[c]||c; }
function reverseCategory(h)   { return{'כניסה':'entry','יציאה':'exit','משימה':'task'}[h]||h; }
