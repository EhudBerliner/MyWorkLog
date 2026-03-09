//  MyWorkLog – Google Apps Script  v3.0
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
const SHEET_TASK_DEF    = 'TaskDefinitions';

const HEADERS            = ['Timestamp','Report_Date','Report_Time','Category','Description','Project','Record_ID'];
const ATTENDANCE_HEADERS = ['Report_Date','Report_Time – כניסה','Report_Time – יציאה','משך יום עבודה'];
const TASK_LOG_HEADERS   = ['Report_Date','משך משימה','Project','Description'];
const PROJECT_HEADERS    = ['Project_Name','Created_At'];
const WSTANDARD_HEADERS  = ['Date','WeekDay','Day_Standard_Hours','Notes'];
const CLIENTS_HEADERS    = ['Client_ID','Client_Name','Created_At'];
const CLI_PROJ_HEADERS   = ['Project_ID','Client_ID','Project_Name','Created_At'];
const TASK_DEF_HEADERS   = ['Task_ID','Task_Name','Billable','Created_At'];

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    if (data.action === 'setDayStandard')      return ok(updateWorkStandard(data.date, data.weekDay, data.stdHours, data.notes||''));
    if (data.action === 'addProject')           return ok(addProject(data.project));
    if (data.action === 'deleteProject')        return ok(deleteProject(data.project));
    if (data.action === 'addClient')            return ok(addClient(data.id, data.name));
    if (data.action === 'deleteClient')         return ok(deleteClient(data.id));
    if (data.action === 'addClientProject')     return ok(addClientProject(data.id, data.clientId, data.name));
    if (data.action === 'deleteClientProject')  return ok(deleteClientProject(data.id));
    if (data.action === 'addTaskDef')           return ok(addTaskDef(data.id, data.name, data.billable));
    if (data.action === 'deleteTaskDef')        return ok(deleteTaskDef(data.id));
    if (data.action === 'delete')               { deleteById(data.id, data.category, data.report_date); return ok('נמחק'); }
    const ss   = SpreadsheetApp.getActiveSpreadsheet();
    const main = getOrCreateSheet(ss, SHEET_NAME, HEADERS);
    const ts   = new Date().toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' });
    main.appendRow([ts, data.report_date||'', data.report_time||'',
      translateCategory(data.category)||'', data.description||'', data.project||'', data.id||'']);
    autoFormatLastRow(main, HEADERS.length);
    if (data.category === 'entry' || data.category === 'exit') updateAttendance(ss, data);
    if (data.category === 'task') updateTasksLog(ss, data);
    return ok('נשמר');
  } catch (err) { return errResp(err.toString()); }
}

function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || '';

  if (action === 'getWorkStandard') {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = getOrCreateSheet(ss, SHEET_WSTANDARD, WSTANDARD_HEADERS);
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return jsonResp({ workStandard: [] });
    const rows = sheet.getRange(2, 1, lastRow-1, 4).getValues();
    return jsonResp({ workStandard: rows.map(r=>({date:fmtDateCell(r[0]),weekDay:String(r[1]||'').trim(),stdHours:parseFloat(r[2])||0,notes:String(r[3]||'').trim()})).filter(r=>r.date) });
  }

  if (action === 'getProjects') {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_PROJECTS);
    if (!sheet) return jsonResp({ projects: [] });
    return jsonResp({ projects: sheet.getDataRange().getValues().slice(1).map(r=>String(r[0]).trim()).filter(Boolean) });
  }

  if (action === 'getReports') {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) return jsonResp({ reports: [], projects: [] });
    const reports = sheet.getDataRange().getValues().slice(1).map(r=>({
      timestamp:fmtDateCell(r[0])||String(r[0]||''), report_date:fmtDateCell(r[1]),
      report_time:parseTimeCell(r[2]), category:reverseCategory(String(r[3]||'')),
      description:String(r[4]||''), project:String(r[5]||''), id:String(r[6]||''), sent:true
    })).filter(r=>r.id);
    const pSheet = ss.getSheetByName(SHEET_PROJECTS);
    const projects = pSheet ? pSheet.getDataRange().getValues().slice(1).map(r=>String(r[0]).trim()).filter(Boolean) : [];
    return jsonResp({ reports, projects });
  }

  if (action === 'getCRM') {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const readSheet = (name, headers, cols, mapper) => {
      const sh = ss.getSheetByName(name);
      if (!sh || sh.getLastRow() <= 1) return [];
      return sh.getRange(2,1,sh.getLastRow()-1,cols).getValues().map(mapper).filter(Boolean);
    };
    const clients = readSheet(SHEET_CLIENTS, CLIENTS_HEADERS, 3,
      r => { const id=String(r[0]).trim(),name=String(r[1]).trim(); return (id&&name)?{id,name,createdAt:String(r[2]||'')}:null; });
    const clientProjects = readSheet(SHEET_CLI_PROJ, CLI_PROJ_HEADERS, 4,
      r => { const id=String(r[0]).trim(),clientId=String(r[1]).trim(),name=String(r[2]).trim(); return (id&&clientId&&name)?{id,clientId,name,createdAt:String(r[3]||'')}:null; });
    const taskDefinitions = readSheet(SHEET_TASK_DEF, TASK_DEF_HEADERS, 4,
      r => { const id=String(r[0]).trim(),name=String(r[1]).trim(); return (id&&name)?{id,name,billable:String(r[2]).trim().toLowerCase()==='true',createdAt:String(r[3]||'')}:null; });
    return jsonResp({ clients, clientProjects, taskDefinitions });
  }

  return jsonResp({ status:'ok', app:'MyWorkLog', version:'3.0' });
}

function addClient(id, name) {
  if (!id||!name||!name.trim()) return 'empty';
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = getOrCreateSheet(ss, SHEET_CLIENTS, CLIENTS_HEADERS);
  if (sheet.getLastRow()>1 && sheet.getRange(2,1,sheet.getLastRow()-1,1).getValues().some(r=>String(r[0]).trim()===id)) return 'exists';
  sheet.appendRow([id,name.trim(),new Date().toLocaleString('he-IL',{timeZone:'Asia/Jerusalem'})]);
  autoFormatLastRow(sheet,CLIENTS_HEADERS.length); return 'added';
}

function deleteClient(id) {
  if (!id) return 'no id';
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  deleteRowById(ss, SHEET_CLIENTS, id, 0);
  const pSheet = ss.getSheetByName(SHEET_CLI_PROJ);
  if (pSheet && pSheet.getLastRow()>1) {
    const rows = pSheet.getRange(2,1,pSheet.getLastRow()-1,2).getValues();
    for (let i=rows.length-1;i>=0;i--) if(String(rows[i][1]).trim()===id) pSheet.deleteRow(i+2);
  }
  return 'deleted';
}

function addClientProject(id, clientId, name) {
  if (!id||!clientId||!name||!name.trim()) return 'empty';
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = getOrCreateSheet(ss, SHEET_CLI_PROJ, CLI_PROJ_HEADERS);
  if (sheet.getLastRow()>1 && sheet.getRange(2,1,sheet.getLastRow()-1,1).getValues().some(r=>String(r[0]).trim()===id)) return 'exists';
  sheet.appendRow([id,clientId,name.trim(),new Date().toLocaleString('he-IL',{timeZone:'Asia/Jerusalem'})]);
  autoFormatLastRow(sheet,CLI_PROJ_HEADERS.length);
  addProject(name.trim()); // also add to legacy flat list
  return 'added';
}

function deleteClientProject(id) {
  if (!id) return 'no id';
  deleteRowById(SpreadsheetApp.getActiveSpreadsheet(), SHEET_CLI_PROJ, id, 0);
  return 'deleted';
}

function addTaskDef(id, name, billable) {
  if (!id||!name||!name.trim()) return 'empty';
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = getOrCreateSheet(ss, SHEET_TASK_DEF, TASK_DEF_HEADERS);
  if (sheet.getLastRow()>1 && sheet.getRange(2,1,sheet.getLastRow()-1,1).getValues().some(r=>String(r[0]).trim()===id)) return 'exists';
  sheet.appendRow([id,name.trim(),billable?'true':'false',new Date().toLocaleString('he-IL',{timeZone:'Asia/Jerusalem'})]);
  autoFormatLastRow(sheet,TASK_DEF_HEADERS.length); return 'added';
}

function deleteTaskDef(id) {
  if (!id) return 'no id';
  deleteRowById(SpreadsheetApp.getActiveSpreadsheet(), SHEET_TASK_DEF, id, 0);
  return 'deleted';
}

function updateWorkStandard(date, weekDay, stdHours, notes) {
  if (!date) return 'no date';
  const dateStr = String(date).trim();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = getOrCreateSheet(ss, SHEET_WSTANDARD, WSTANDARD_HEADERS);
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    const col = sheet.getRange(2,1,lastRow-1,1).getValues();
    for (let i=0;i<col.length;i++) {
      if (fmtDateCell(col[i][0])===dateStr) {
        sheet.getRange(i+2,1,1,4).setValues([[dateStr,weekDay||'',Number(stdHours)||0,notes||'']]);
        return 'updated';
      }
    }
  }
  sheet.appendRow([dateStr,weekDay||'',Number(stdHours)||0,notes||'']);
  autoFormatLastRow(sheet,WSTANDARD_HEADERS.length); return 'added';
}

function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const setup = (name,headers,widths) => {
    const sh = getOrCreateSheet(ss,name,headers);
    widths.forEach((w,i)=>sh.setColumnWidth(i+1,w));
    return sh;
  };
  setup(SHEET_WSTANDARD,  WSTANDARD_HEADERS, [120,100,170,260]);
  setup(SHEET_CLIENTS,    CLIENTS_HEADERS,   [180,220,200]);
  setup(SHEET_CLI_PROJ,   CLI_PROJ_HEADERS,  [180,180,220,200]);
  setup(SHEET_TASK_DEF,   TASK_DEF_HEADERS,  [180,220,100,200]);
  ss.getSheetByName(SHEET_WSTANDARD)?.getRange('A2:A1000').setNumberFormat('@STRING@');
  SpreadsheetApp.getUi().alert('MyWorkLog v3.0 — גיליונות מוכנים!\n\nClients | ClientProjects | TaskDefinitions | WorkStandard\n\nאל תשכח: Deploy → New deployment אחרי שמירה!');
}
function setupWorkStandard() { setupSheets(); }

function updateAttendance(ss, data) {
  const sheet = getOrCreateSheet(ss, SHEET_ATTENDANCE, ATTENDANCE_HEADERS);
  const date = data.report_date, time = data.report_time;
  const all = sheet.getDataRange().getValues();
  let rowIdx = -1;
  for (let i=1;i<all.length;i++) if (all[i][0]===date) { rowIdx=i+1; break; }
  if (rowIdx===-1) {
    const newRow=[date,'','',''];
    if(data.category==='entry') newRow[1]=time; else newRow[2]=time;
    sheet.appendRow(newRow); autoFormatLastRow(sheet,ATTENDANCE_HEADERS.length);
  } else {
    if(data.category==='entry') { if(!sheet.getRange(rowIdx,2).getValue()) sheet.getRange(rowIdx,2).setValue(time); }
    else sheet.getRange(rowIdx,3).setValue(time);
    sheet.getRange(rowIdx,4).setValue(calcDuration(sheet.getRange(rowIdx,2).getValue(),sheet.getRange(rowIdx,3).getValue()));
  }
}

function updateTasksLog(ss, data) {
  const sheet = getOrCreateSheet(ss, SHEET_TASKS_LOG, TASK_LOG_HEADERS);
  sheet.appendRow([data.report_date||'', data.report_time||'', data.project||'', data.description||'']);
  autoFormatLastRow(sheet, TASK_LOG_HEADERS.length);
}

function deleteById(id, category, report_date) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const main = ss.getSheetByName(SHEET_NAME);
  if (main) {
    const data = main.getDataRange().getValues();
    for (let i=data.length-1;i>=1;i--) if(String(data[i][6])===String(id)) main.deleteRow(i+1);
  }
  if ((category==='entry'||category==='exit') && report_date) {
    const att = ss.getSheetByName(SHEET_ATTENDANCE);
    if (att) {
      const rows = att.getDataRange().getValues();
      for (let i=1;i<rows.length;i++) {
        if (rows[i][0]===report_date) {
          const r=i+1;
          if(category==='entry'){att.getRange(r,2).setValue('');att.getRange(r,4).setValue('');}
          else{att.getRange(r,3).setValue('');att.getRange(r,4).setValue('');}
          if(!att.getRange(r,2).getValue()&&!att.getRange(r,3).getValue()) att.deleteRow(r);
          break;
        }
      }
    }
  }
}

function addProject(name) {
  if (!name||!name.trim()) return 'empty';
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = getOrCreateSheet(ss, SHEET_PROJECTS, PROJECT_HEADERS);
  if (sheet.getDataRange().getValues().slice(1).some(r=>String(r[0]).trim().toLowerCase()===name.trim().toLowerCase())) return 'exists';
  sheet.appendRow([name.trim(),new Date().toLocaleString('he-IL',{timeZone:'Asia/Jerusalem'})]);
  autoFormatLastRow(sheet,PROJECT_HEADERS.length); return 'added';
}
function deleteProject(name) {
  if (!name) return 'no name';
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_PROJECTS);
  if (!sheet) return 'no sheet';
  const rows = sheet.getDataRange().getValues();
  for (let i=rows.length-1;i>=1;i--) if(String(rows[i][0]).trim().toLowerCase()===name.trim().toLowerCase()) sheet.deleteRow(i+1);
  return 'deleted';
}

function deleteRowById(ss, sheetName, id, col) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet||sheet.getLastRow()<=1) return;
  const rows = sheet.getRange(2,1,sheet.getLastRow()-1,col+1).getValues();
  for (let i=rows.length-1;i>=0;i--) if(String(rows[i][col]).trim()===id) sheet.deleteRow(i+2);
}

function calcDuration(entry,exit) {
  if(!entry||!exit) return '';
  const m=t=>{const p=String(t).split(':');return parseInt(p[0])*60+parseInt(p[1]||0);};
  const d=m(exit)-m(entry); return d>0?pad(Math.floor(d/60))+':'+pad(d%60):'';
}
function fmtDateCell(v) {
  if (!v) return '';
  if (v instanceof Date) return v.getFullYear()+'-'+String(v.getMonth()+1).padStart(2,'0')+'-'+String(v.getDate()).padStart(2,'0');
  const s=String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.substring(0,10);
  const m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
  return s;
}
function parseTimeCell(v) {
  if (!v) return '';
  if (v instanceof Date) return String(v.getHours()).padStart(2,'0')+':'+String(v.getMinutes()).padStart(2,'0');
  const s=String(v).trim(), hms=s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (hms) return hms[1].padStart(2,'0')+':'+hms[2];
  const n=parseFloat(s);
  if (!isNaN(n)&&n>=0&&n<1) { const tot=Math.round(n*1440); return String(Math.floor(tot/60)).padStart(2,'0')+':'+String(tot%60).padStart(2,'0'); }
  const dm=s.match(/(\d{1,2}):(\d{2})/); if(dm) return dm[1].padStart(2,'0')+':'+dm[2]; return s;
}
function pad(n)       { return String(n).padStart(2,'0'); }
function ok(msg)      { return ContentService.createTextOutput(JSON.stringify({status:'ok',message:msg})).setMimeType(ContentService.MimeType.JSON); }
function errResp(msg) { return ContentService.createTextOutput(JSON.stringify({status:'error',message:msg})).setMimeType(ContentService.MimeType.JSON); }
function jsonResp(o)  { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function getOrCreateSheet(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    const hRow = sheet.getRange(1,1,1,headers.length);
    hRow.setValues([headers]); hRow.setFontWeight('bold'); hRow.setBackground('#1a1d27'); hRow.setFontColor('#4ade80');
    sheet.setFrozenRows(1); headers.forEach((_,i)=>sheet.setColumnWidth(i+1,i>=2?200:130));
  }
  return sheet;
}
function autoFormatLastRow(sheet, colCount) {
  const r=sheet.getLastRow(); if(r%2===0) sheet.getRange(r,1,1,colCount).setBackground('#f8f9fa');
}
function translateCategory(c) { return {entry:'כניסה',exit:'יציאה',task:'משימה'}[c]||c; }
function reverseCategory(h)   { return {'כניסה':'entry','יציאה':'exit','משימה':'task'}[h]||h; }

/*
  ═══════════════════════════════════════════════════════
  SETUP (v3.0)
  ═══════════════════════════════════════════════════════
  1. Extensions → Apps Script → הדבק → שמור
  2. בחר setupSheets → Run (מקים גיליונות)
  3. Deploy → New deployment → Web App
     Execute as: Me | Anyone
  4. URL → הגדרות האפליקציה

  גיליונות:  WorkLog · Attendance · Tasks · Projects
             WorkStandard · Clients · ClientProjects
             TaskDefinitions

  מבנה:
  Clients      Client_ID | Client_Name
  ClientProj   Project_ID | Client_ID | Project_Name
  TaskDef      Task_ID | Task_Name | Billable (true/false)
  ═══════════════════════════════════════════════════════
*/
