//  MyWorkLog – Google Apps Script  v6.2
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

// ── Attendance sheet columns (v4.0) ──────────────────────────────────────────
//   A=Date   B=Entry  C=Exit   D=Duration  E=Daily Standard  F=Deviation  G=_row_type(hidden)
//
//   סוג שורה (col G):
//     'single'  – יום עם זוג אחד
//     'summary' – שורת סיכום יומי (>1 זוג): כניסה ראשונה | יציאה אחרונה | סה"כ
//     'detail'  – שורת פירוט (col A = dateStr, Std/Dev ריקות, italic)
const ATT_HEADERS = ['Date','Entry','Exit','Duration','Daily Standard','Deviation','Classification','_row_type'];
const ATT_NCOLS   = ATT_HEADERS.length;

// ─────────────────────────────────────────────────────────────────────────────
//  doPost
// ─────────────────────────────────────────────────────────────────────────────
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    if (data.action === 'setDayStandard')      return ok(updateWorkStandard(data.date, data.weekDay, data.stdHours, data.notes||'', data.description||''));
    if (data.action === 'addProject')           return ok(addProject(data.project));
    if (data.action === 'deleteProject')        return ok(deleteProject(data.project));
    if (data.action === 'addClient')            return ok(addClient(data.id, data.name));
    if (data.action === 'deleteClient')         return ok(deleteClient(data.id));
    if (data.action === 'addClientProject')     return ok(addClientProject(data.id, data.clientId, data.name));
    if (data.action === 'deleteClientProject')  return ok(deleteClientProject(data.id));
    if (data.action === 'delete')               { deleteById(data.id, data.category, data.report_date); return ok('נמחק'); }

    const ss   = SpreadsheetApp.getActiveSpreadsheet();
    const main = getOrCreateSheet(ss, SHEET_NAME, HEADERS);
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

  return jsonResp({ status:'ok', app:'MyWorkLog', version:'6.3' });
}

// ─────────────────────────────────────────────────────────────────────────────
//  Attendance  v4.0
// ─────────────────────────────────────────────────────────────────────────────

/** WorkStandard lookup → { stdHours, stdStr:"HH:MM"|"" } */
function getStdForDate(ss, dateStr) {
  const sh = ss.getSheetByName(SHEET_WSTANDARD);
  if (!sh || sh.getLastRow() <= 1) return { stdHours:0, stdStr:'' };
  const rows = sh.getRange(2, 1, sh.getLastRow()-1, 3).getValues();
  for (const r of rows) {
    if (fmtDateCell(r[0]) === dateStr) {
      const h = parseFloat(r[2]) || 0;
      return { stdHours:h, stdStr: h>0 ? pad(Math.floor(h))+':'+pad(Math.round((h%1)*60)) : '' };
    }
  }
  return { stdHours:0, stdStr:'' };
}

/** "HH:MM" → total minutes */
function toMins(t) {
  if (!t) return 0;
  const p = String(t).split(':');
  return parseInt(p[0]||0)*60 + parseInt(p[1]||0);
}

/** minutes → "HH:MM" or "" */
function fmtMins(m) {
  if (!m || m <= 0) return '';
  return pad(Math.floor(m/60)) + ':' + pad(m%60);
}

/** deviation minutes → "+HH:MM" / "-HH:MM" / "00:00" */
function fmtDev(d) {
  if (d === 0) return '00:00';
  const sign = d>0?'+':'-', abs=Math.abs(d);
  return sign + pad(Math.floor(abs/60)) + ':' + pad(abs%60);
}

/**
 * Read WorkLog for a date → match entry/exit pairs greedily.
 * Returns { pairs:[{entry,exit,durationMins}], openEntry:str|null }
 */
function getPairsForDate(ss, dateStr) {
  const sh = ss.getSheetByName(SHEET_NAME);
  if (!sh || sh.getLastRow() <= 1) return { pairs:[], openEntry:null };

  const entries=[], exits=[];
  sh.getDataRange().getValues().slice(1).forEach(r => {
    if (fmtDateCell(r[1]) !== dateStr) return;
    const cat = reverseCategory(String(r[3]||''));
    const t   = parseTimeCell(r[2]);
    if (!t) return;
    if (cat==='entry') entries.push(t);
    else if (cat==='exit') exits.push(t);
  });
  entries.sort(); exits.sort();

  const pairs=[], usedExits=new Set();
  for (const en of entries) {
    const ex = exits.find(x => x>=en && !usedExits.has(x));
    if (ex) {
      usedExits.add(ex);
      const dur = toMins(ex) - toMins(en);
      if (dur>0) pairs.push({ entry:en, exit:ex, durationMins:dur });
    }
  }
  const pairedEntries = new Set(pairs.map(p=>p.entry));
  const pairedExits   = new Set(pairs.map(p=>p.exit));
  const openEntry       = entries.find(e=>!pairedEntries.has(e)) || null;
  const unmatchedExits  = exits.filter(x=>!pairedExits.has(x));
  return { pairs, openEntry, unmatchedExits };
}

/**
 * Delete all Attendance rows that belong to dateStr.
 * Iterates bottom-up.  A 'detail' row belongs to dateStr if the most recent
 * non-detail row above it had col A === dateStr.
 */
function deleteAttendanceRowsForDate(sheet, dateStr) {
  if (sheet.getLastRow() <= 1) return;
  const vals = sheet.getDataRange().getValues();
  // All rows for a date (single / summary / detail) now have col A = dateStr.
  // Delete every row whose col A matches.
  for (let i = vals.length-1; i >= 1; i--) {
    if (fmtDateCell(vals[i][0]) === dateStr) sheet.deleteRow(i+1);
  }
}

/**
 * Core function: rebuild Attendance rows for one date.
 *
 * Layout:
 *  0 pairs  → nothing written
 *  1 pair   → single row: [date, entry, exit, dur, std, dev, 'single']
 *  N pairs  → summary:   [date, first_entry, last_exit, total_dur, std, dev, 'summary']
 *             + details: ['', entry_i, exit_i, dur_i, '', '', 'detail']  × N
 *             + open:    ['', open_entry, '⏳ פתוח', '', '', '', 'detail']  (if any)
 */
function rebuildDayAttendance(ss, dateStr) {
  const sheet = getOrCreateAttSheet(ss);
  deleteAttendanceRowsForDate(sheet, dateStr);
  SpreadsheetApp.flush(); // commit deletions before reading getLastRow()

  const { pairs, openEntry, unmatchedExits } = getPairsForDate(ss, dateStr);
  if (pairs.length === 0 && !openEntry && unmatchedExits.length === 0) return;

  const { stdHours, stdStr, classification } = getStdForDate(ss, dateStr);
  const stdMins   = Math.round(stdHours * 60);
  const totalMins = pairs.reduce((s,p)=>s+p.durationMins, 0);
  const devMins   = stdMins > 0 ? totalMins - stdMins : null;
  const devStr    = devMins !== null ? fmtDev(devMins) : '';

  const newRows = [];

  if (pairs.length <= 1 && !openEntry) {
    // ── Single pair ──────────────────────────────────────────
    const p = pairs[0];
    newRows.push([dateStr, p.entry, p.exit, fmtMins(p.durationMins), stdStr, devStr, 'single']);
  } else {
    // ── Multiple pairs (or open session) ────────────────────
    const firstEntry = pairs.length>0 ? pairs[0].entry : openEntry;
    const lastExit   = pairs.length>0 ? pairs[pairs.length-1].exit : '';
    // Summary
    newRows.push([dateStr, firstEntry, lastExit, fmtMins(totalMins), stdStr, devStr, 'summary']);
    // Detail rows
    for (const p of pairs) {
      newRows.push([dateStr, p.entry, p.exit, fmtMins(p.durationMins), '', '', 'detail']);
    }
    if (openEntry) {
      newRows.push([dateStr, openEntry, '⏳ פתוח', '', '', '', 'detail']);
    }
  }

  // Orphan exits (exit with no matching entry) — shown with warning
  unmatchedExits.forEach(ex => {
    newRows.push([dateStr, '⚠️ חסרה כניסה', ex, '', stdStr, devStr, classification, 'orphan']);
  });

  // Find insertion point — scan only 'single' and 'summary' rows (col G) to avoid
  // confusion with 'detail' rows that share the same date.
  // We need the first anchor row whose date is strictly greater than dateStr.
  let insertBefore = -1; // sheet row number to insert before (-1 = append)
  if (sheet.getLastRow() > 1) {
    const data = sheet.getRange(2, 1, sheet.getLastRow()-1, ATT_NCOLS).getValues();
    for (let i=0; i<data.length; i++) {
      const rowDate = fmtDateCell(data[i][0]);
      const rowType = String(data[i][6]);
      if ((rowType === 'single' || rowType === 'summary' || rowType === 'orphan') && rowDate > dateStr) {
        insertBefore = i + 2; // +1 for header, +1 because getRange is 1-based
        break;
      }
    }
  }

  // Write rows
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

/** Rebuild entire Attendance from WorkLog. Safe to run at any time.
 *  Builds ALL rows in memory then writes in a single setValues() call.
 */
function rebuildAllAttendance() {
  const ss   = SpreadsheetApp.getActiveSpreadsheet();
  const main = ss.getSheetByName(SHEET_NAME);
  if (!main || main.getLastRow() <= 1) return;

  // Collect all entry/exit records from WorkLog
  const worklogRows = main.getDataRange().getValues().slice(1);

  // Group by date
  const dateMap = {}; // date -> { entries:[], exits:[] }
  worklogRows.forEach(r => {
    const cat = reverseCategory(String(r[3]||''));
    const d   = fmtDateCell(r[1]);
    const t   = parseTimeCell(r[2]);
    if (!d || !t) return;
    if (!dateMap[d]) dateMap[d] = { entries:[], exits:[] };
    if (cat === 'entry') dateMap[d].entries.push(t);
    else if (cat === 'exit') dateMap[d].exits.push(t);
  });

  // Load WorkStandard once
  const wss = ss.getSheetByName(SHEET_WSTANDARD);
  const stdMap = {}; // date -> { stdHours, stdStr }
  if (wss && wss.getLastRow() > 1) {
    wss.getRange(2, 1, wss.getLastRow()-1, 5).getValues().forEach(r => {
      const d = fmtDateCell(r[0]);
      if (!d) return;
      const h    = parseFloat(r[2]) || 0;
      const notes = String(r[3]||'').trim();
      const desc  = String(r[4]||'').trim();
      stdMap[d] = {
        stdHours:h,
        stdStr: h>0 ? pad(Math.floor(h))+':'+pad(Math.round((h%1)*60)) : '',
        classification: [notes, desc].filter(Boolean).join(' — ')
      };
    });
  }

  // Build all rows in memory (sorted by date)
  const allRows = [];
  Object.keys(dateMap).sort().forEach(dateStr => {
    const { entries, exits } = dateMap[dateStr];
    entries.sort(); exits.sort();

    // Match pairs greedily
    const pairs = [], usedExits = new Set();
    entries.forEach(en => {
      const ex = exits.find(x => x >= en && !usedExits.has(x));
      if (ex) { usedExits.add(ex); const dur=toMins(ex)-toMins(en); if(dur>0) pairs.push({entry:en,exit:ex,durationMins:dur}); }
    });
    const pairedEntries = new Set(pairs.map(p=>p.entry));
    const pairedExits  = new Set(pairs.map(p=>p.exit));
    const openEntry       = entries.find(e=>!pairedEntries.has(e)) || null;
    const unmatchedExits  = exits.filter(x=>!pairedExits.has(x));

    if (pairs.length === 0 && !openEntry && unmatchedExits.length === 0) return;

    const std      = stdMap[dateStr] || { stdHours:0, stdStr:'' };
    const stdMins  = Math.round(std.stdHours * 60);
    const totalMins = pairs.reduce((s,p)=>s+p.durationMins, 0);
    const devMins  = stdMins > 0 ? totalMins - stdMins : null;
    const devStr   = devMins !== null ? fmtDev(devMins) : '';

    if (pairs.length <= 1 && !openEntry) {
      // Single
      const p = pairs[0];
      allRows.push([dateStr, p.entry, p.exit, fmtMins(p.durationMins), std.stdStr, devStr, std.classification||'', 'single']);
    } else {
      // Summary + details
      const firstEntry = pairs.length>0 ? pairs[0].entry : openEntry;
      const lastExit   = pairs.length>0 ? pairs[pairs.length-1].exit : '';
      allRows.push([dateStr, firstEntry, lastExit, fmtMins(totalMins), std.stdStr, devStr, std.classification||'', 'summary']);
      pairs.forEach(p => allRows.push([dateStr, p.entry, p.exit, fmtMins(p.durationMins), '', '', '', 'detail']));
      if (openEntry) allRows.push([dateStr, openEntry, '⏳ פתוח', '', '', '', '', 'detail']);
      unmatchedExits.forEach(ex => allRows.push([dateStr, '⚠️ חסרה כניסה', ex, '', std.stdStr, devStr, std.classification||'', 'orphan']));
    }
  });

  // Write to sheet in one operation
  const sheet = getOrCreateAttSheet(ss);
  if (sheet.getLastRow() > 1) sheet.deleteRows(2, sheet.getLastRow()-1);

  if (allRows.length > 0) {
    sheet.getRange(2, 1, allRows.length, ATT_NCOLS).setValues(allRows);
    formatAttRows(sheet, 2, allRows);
  }
}

/** Get/create Attendance sheet with correct headers and column widths. */
function getOrCreateAttSheet(ss) {
  let sh = ss.getSheetByName(SHEET_ATTENDANCE);
  if (!sh) {
    sh = ss.insertSheet(SHEET_ATTENDANCE);
    sh.setFrozenRows(1);
  }
  // Always re-apply header style (idempotent)
  const hRange = sh.getRange(1, 1, 1, ATT_NCOLS);
  hRange.setValues([ATT_HEADERS]);
  hRange.setFontWeight('bold');
  hRange.setBackground('#1a1d27');
  hRange.setFontColor('#4ade80');
  [120, 90, 90, 90, 100, 110, 160, 0].forEach((w,i) => { if(w>0) sh.setColumnWidth(i+1,w); });
  sh.hideColumns(ATT_NCOLS); // hide _row_type helper (col H)
  sh.getRange('A2:A5000').setNumberFormat('@STRING@'); // keep dates as text, prevent auto-conversion
  return sh;
}

/** Apply formatting to a block of newly-written Attendance rows. */
function formatAttRows(sheet, startRow, rows) {
  rows.forEach((r, i) => {
    const sr    = startRow + i;
    const type  = r[6];
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
      // 'single' — alternate shading
      if (sr % 2 === 0) range.setBackground('#f8f9fa');
    }

    // Deviation colour
    const dev = String(r[5]);
    if (dev) {
      const cell = sheet.getRange(sr, 6);
      if (dev.startsWith('+'))      cell.setFontColor('#22c55e');
      else if (dev.startsWith('-')) cell.setFontColor('#ef4444');
      else                          cell.setFontColor(null);
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
//  deleteById  (v4.0 — rebuilds the whole day instead of editing cells)
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
//  updateWorkStandard  (v4.0 — also refreshes Attendance deviation column)
// ─────────────────────────────────────────────────────────────────────────────
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
  // Force col A as text BEFORE writing to prevent Sheets auto-converting to Date
  const newRow = sheet.getLastRow() + 1;
  sheet.getRange(newRow, 1).setNumberFormat('@STRING@');
  sheet.getRange(newRow, 1, 1, 5).setValues([[dateStr, weekDay||'', Number(stdHours)||0, notes||'', description||'']]);
  autoFormatLastRow(sheet, WSTANDARD_HEADERS.length);
  rebuildDayAttendance(ss, dateStr);
  return 'added';
}

// ─────────────────────────────────────────────────────────────────────────────
//  Tasks log
// ─────────────────────────────────────────────────────────────────────────────
function updateTasksLog(ss, data) {
  const sheet = getOrCreateSheet(ss, SHEET_TASKS_LOG, TASK_LOG_HEADERS);
  sheet.appendRow([data.report_date||'', data.report_time||'', data.project||'', data.description||'']);
  autoFormatLastRow(sheet, TASK_LOG_HEADERS.length);
}

// ─────────────────────────────────────────────────────────────────────────────
//  Projects
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
//  CRM
// ─────────────────────────────────────────────────────────────────────────────
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



// ─────────────────────────────────────────────────────────────────────────────
//  Setup
// ─────────────────────────────────────────────────────────────────────────────
function setupSheets() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const setup = (name,headers,widths) => {
    const sh=getOrCreateSheet(ss,name,headers);
    widths.forEach((w,i)=>sh.setColumnWidth(i+1,w));return sh;
  };
  setup(SHEET_WSTANDARD, WSTANDARD_HEADERS, [120,100,170,200,220]);
  setup(SHEET_CLIENTS,   CLIENTS_HEADERS,   [180,220,200]);
  setup(SHEET_CLI_PROJ,  CLI_PROJ_HEADERS,  [180,180,220,200]);
  // Force WorkStandard date column as plain text to prevent locale-based auto-conversion
  const wsSheet = ss.getSheetByName(SHEET_WSTANDARD);
  if (wsSheet) {
    wsSheet.getRange('A2:A5000').setNumberFormat('@STRING@');
    // Normalise any existing date cells to YYYY-MM-DD strings
    const lastR = wsSheet.getLastRow();
    if (lastR > 1) {
      const dateCol = wsSheet.getRange(2, 1, lastR-1, 1).getValues();
      const fixed = dateCol.map(r => [fmtDateCell(r[0]) || r[0]]);
      wsSheet.getRange(2, 1, lastR-1, 1).setNumberFormat('@STRING@').setValues(fixed);
    }
  }
  getOrCreateAttSheet(ss); // create / style Attendance with new headers
  SpreadsheetApp.getUi().alert(
    'MyWorkLog v6.3 — גיליונות מוכנים!\n\n' +
    'Attendance החדש: תאריך | כניסה | יציאה | משך | תקן יומי | עודף/חוסר\n\n' +
    'הרץ rebuildAllAttendance לבנות מחדש את ההיסטוריה.\n\n' +
    'Deploy → New deployment לאחר השמירה!'
  );
}
function setupWorkStandard() { setupSheets(); }

// ─────────────────────────────────────────────────────────────────────────────
//  Generic helpers
// ─────────────────────────────────────────────────────────────────────────────
function deleteRowById(ss, sheetName, id, col) {
  const sheet=ss.getSheetByName(sheetName);
  if(!sheet||sheet.getLastRow()<=1)return;
  const rows=sheet.getRange(2,1,sheet.getLastRow()-1,col+1).getValues();
  for(let i=rows.length-1;i>=0;i--)if(String(rows[i][col]).trim()===id)sheet.deleteRow(i+2);
}
/**
 * Normalise any date representation → 'YYYY-MM-DD' string.
 * Handles: Date objects, YYYY-MM-DD, ISO-8601, dd/mm/yyyy, mm/dd/yyyy.
 * Ambiguous slash dates (both parts ≤12) → prefer dd/mm (Israeli convention).
 */
function fmtDateCell(v) {
  if (!v) return '';

  // Date object — format in Israel timezone to avoid UTC midnight shift
  if (v instanceof Date) {
    if (isNaN(v.getTime())) return '';
    // Use Intl to extract local date in Israel timezone
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

  // YYYY-MM-DD or YYYY-MM-DDT... (ISO) — already normalised
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  // Slash formats: always treat as DD/MM/YYYY (Israeli convention)
  // Only switch to MM/DD if p1 is unambiguously a month (p1<=12 && p2>12 is still DD/MM)
  const slash = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slash) {
    let p1 = parseInt(slash[1], 10);
    let p2 = parseInt(slash[2], 10);
    let yr = parseInt(slash[3], 10);
    if (yr < 100) yr += (yr < 50 ? 2000 : 1900);
    let day, mon;
    if (p1 > 12 && p2 <= 12) { day = p1; mon = p2; }      // unambiguous: p1 is day
    else if (p2 > 12 && p1 <= 12) { day = p2; mon = p1; } // unambiguous: p2 is day
    else { day = p1; mon = p2; }                           // ambiguous → DD/MM (Israeli)
    return `${yr}-${String(mon).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
  }

  // Dot formats: D.M.YYYY (European/Israeli) — always DD.MM.YYYY
  const dot = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/);
  if (dot) {
    let day = parseInt(dot[1],10), mon = parseInt(dot[2],10), yr = parseInt(dot[3],10);
    if (yr < 100) yr += (yr < 50 ? 2000 : 1900);
    return `${yr}-${String(mon).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
  }

  return s; // unrecognised — return as-is
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
  // Always re-apply headers (idempotent — ensures new columns appear on re-run)
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


/**
 * DEBUG — הרץ מהעורך כדי לראות מה קורה.
 * יוצר גיליון "Debug_Attendance" עם הנתונים שיהיו ב-Attendance.
 */
function debugAttendanceData() {
  const ss   = SpreadsheetApp.getActiveSpreadsheet();
  const main = ss.getSheetByName(SHEET_NAME);
  const wss  = ss.getSheetByName(SHEET_WSTANDARD);

  const log = [];
  log.push(['=== WorkStandard rows ===','','','']);
  if (!wss || wss.getLastRow() <= 1) {
    log.push(['WorkStandard: EMPTY or missing','','','']);
  } else {
    const wsRows = wss.getRange(2,1,wss.getLastRow()-1,3).getValues();
    wsRows.forEach((r,i) => {
      const raw  = r[0];
      const fmt  = fmtDateCell(r[0]);
      const hrs  = r[2];
      log.push([`row ${i+2}`, `raw="${raw}" type=${typeof raw}`, `fmt="${fmt}"`, `hours=${hrs}`]);
    });
  }

  log.push(['','','','']);
  log.push(['=== WorkLog entry/exit dates ===','','','']);
  if (!main || main.getLastRow() <= 1) {
    log.push(['WorkLog: EMPTY','','','']);
  } else {
    const wlRows = main.getDataRange().getValues().slice(1);
    const seen = new Set();
    wlRows.forEach(r => {
      const cat = reverseCategory(String(r[3]||''));
      if (cat !== 'entry' && cat !== 'exit') return;
      const d = fmtDateCell(r[1]);
      if (seen.has(d)) return;
      seen.add(d);
      // Try to find WorkStandard for this date
      let stdResult = 'NOT FOUND in stdMap';
      if (wss && wss.getLastRow() > 1) {
        const wsRows = wss.getRange(2,1,wss.getLastRow()-1,3).getValues();
        for (const wr of wsRows) {
          if (fmtDateCell(wr[0]) === d) {
            stdResult = `FOUND: hours=${wr[2]}`;
            break;
          }
        }
      }
      log.push([d, `raw WorkLog date: "${r[1]}"`, `type: ${typeof r[1]}`, stdResult]);
    });
  }

  // Write to debug sheet
  let dbgSheet = ss.getSheetByName('Debug_Attendance');
  if (!dbgSheet) dbgSheet = ss.insertSheet('Debug_Attendance');
  else dbgSheet.clearContents();
  dbgSheet.getRange(1,1,log.length,4).setValues(log);
  SpreadsheetApp.getUi().alert('Debug complete — see sheet: Debug_Attendance');
}


/**
 * One-time repair: convert ALL WorkStandard date cells to YYYY-MM-DD strings.
 * Run manually from the editor if dates appear in wrong format (mm/dd vs dd/mm).
 */
function normalizeWorkStandardDates() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_WSTANDARD);
  if (!sheet || sheet.getLastRow() <= 1) {
    SpreadsheetApp.getUi().alert('WorkStandard sheet is empty or missing.');
    return;
  }
  const lastRow = sheet.getLastRow();
  const colA    = sheet.getRange(2, 1, lastRow-1, 1).getValues();
  let fixed = 0;
  const normalized = colA.map(r => {
    const raw = r[0];
    const fmt = fmtDateCell(raw);
    if (fmt && fmt !== String(raw)) fixed++;
    return [fmt || raw];
  });
  // Apply text format first, then write normalised values
  sheet.getRange(2, 1, lastRow-1, 1).setNumberFormat('@STRING@').setValues(normalized);
  rebuildAllAttendance();
  SpreadsheetApp.getUi().alert(
    `✅ Normalised ${fixed} date(s) in WorkStandard.\n` +
    `Attendance rebuilt.`
  );
}

/*
  ═══════════════════════════════════════════════════════
  SETUP & MIGRATION (v6.1)
  ═══════════════════════════════════════════════════════
  1. Extensions → Apps Script → הדבק → שמור (Ctrl+S)
  2. בחר setupSheets     → Run   (מקים/מעדכן גיליונות)
  3. בחר rebuildAllAttendance → Run  (בונה כל ההיסטוריה מ-WorkLog)
  4. Deploy → Manage deployments → Edit → New version → Deploy

  מבנה Attendance v4.0:
  ┌──────────┬────────┬────────┬───────┬──────────┬────────────┐
  │  תאריך   │ כניסה  │ יציאה  │ משך   │ תקן יומי │ עודף/חוסר  │
  ├──────────┼────────┼────────┼───────┼──────────┼────────────┤
  │ 2025-01  │ 09:00  │ 17:30  │ 08:30 │  09:00   │  -00:30    │ ← single
  ├──────────┼────────┼────────┼───────┼──────────┼────────────┤
  │ 2025-01  │ 08:00  │ 18:00  │ 08:30 │  09:00   │  -00:30    │ ← summary (2 pairs)
  │ 2025-01  │ 08:00  │ 12:30  │ 04:30 │          │            │ ← detail (italic)
  │ 2025-01  │ 13:30  │ 18:00  │ 04:30 │          │            │ ← detail (italic)
  └──────────┴────────┴────────┴───────┴──────────┴────────────┘
  עמודה G (_row_type) מוסתרת
  ═══════════════════════════════════════════════════════
*/
