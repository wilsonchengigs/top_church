/**
 * generate-overview.gs
 *
 * 安裝方式：
 *   1. 開啟 Google Sheet → 擴充功能 → Apps Script
 *   2. 貼上此檔案全部內容
 *   3. 儲存後執行 generateOverview()
 *   4. 第一次執行需授權
 *
 * Sheet 命名規則：
 *   回報資料 → 名稱為 "1" ~ "6"
 *   欄位順序 → 牧區 | 小組 | 姓名 | 完成 | 直達 | 青年
 *   完成欄位 → "v" 或 "✓" 代表已完成，有名字但無此值代表未完成(✗)，未出現代表尚報名
 *
 * 輸出：
 *   自動建立（或覆蓋）名為「總覽」的 sheet
 */

var ROUND_SHEETS = ['1', '2', '3', '4', '5', '6'];
var ROUND_LABELS = ['第一次', '第二次', '第三次', '第四次', '第五次', '第六次'];
var STATUS = { CHECKED: '✓', CROSSED: '✗', NOT_REGISTERED: '尚未報名' };

function generateOverview() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // Step 1: 讀取六張 sheet，建立每輪的查詢 map
  var roundData = {};   // { '1': Map<key, boolean>, '2': Map<key, boolean>, ... }
  var masterMap = {};   // { key: { area, group, name } }
  var masterOrder = []; // 保留插入順序以便排序

  ROUND_SHEETS.forEach(function (sheetName) {
    var sheet = ss.getSheetByName(sheetName);
    var map = {};
    roundData[sheetName] = map;

    if (!sheet) return;

    var rows = sheet.getDataRange().getValues();
    if (rows.length < 2) return;

    // 找欄位索引（容錯：欄位順序不固定）
    var header = rows[0].map(function (h) { return h.toString().trim(); });
    var colArea = header.indexOf('牧區');
    var colGroup = header.indexOf('小組');
    var colName = header.indexOf('姓名');
    var colDone = header.indexOf('完成');

    if (colName === -1) return; // 找不到姓名欄就跳過

    for (var i = 1; i < rows.length; i++) {
      var r = rows[i];
      var area  = colArea  >= 0 ? r[colArea].toString().trim()  : '';
      var group = colGroup >= 0 ? r[colGroup].toString().trim() : '';
      var name  = r[colName].toString().trim();
      if (!name) continue;

      var doneRaw = colDone >= 0 ? r[colDone].toString().trim().toLowerCase() : '';
      var completed = (doneRaw === 'v' || doneRaw === '✓');

      // key 只用牧區+姓名，避免同一人在不同次小組欄位略有差異（如 2206 vs 2206A）
      var key = area + '||' + name;
      map[key] = completed;

      if (!masterMap[key]) {
        masterMap[key] = { area: area, group: group, name: name };
        masterOrder.push(key);
      } else {
        // 每次出現都更新小組，以最後一次為準（避免不同 sheet 小組名稱不一致導致排序散掉）
        masterMap[key].group = group;
      }
    }
  });

  // Step 2: 排序 → 牧區 → 小組（第一次出現的值）→ 姓名
  masterOrder.sort(function (a, b) {
    var ma = masterMap[a];
    var mb = masterMap[b];
    return ma.area.localeCompare(mb.area, 'zh-TW') ||
           ma.group.localeCompare(mb.group, 'zh-TW') ||
           ma.name.localeCompare(mb.name, 'zh-TW');
  });

  // Step 3: 組出輸出表格
  var headers = ['牧區', '小組', '姓名'].concat(ROUND_LABELS);
  var output = [headers];

  masterOrder.forEach(function (key) {
    var m = masterMap[key];
    var row = [m.area, m.group, m.name];
    ROUND_SHEETS.forEach(function (sName) {
      var map = roundData[sName];
      if (!(key in map)) {
        row.push(STATUS.NOT_REGISTERED);
      } else {
        row.push(map[key] ? STATUS.CHECKED : STATUS.CROSSED);
      }
    });
    output.push(row);
  });

  // Step 4: 寫入「總覽」sheet（舊的直接刪掉重建，避免合併儲存格干擾）
  var overviewSheet = ss.getSheetByName('總覽');
  if (overviewSheet) ss.deleteSheet(overviewSheet);
  overviewSheet = ss.insertSheet('總覽');

  overviewSheet
    .getRange(1, 1, output.length, headers.length)
    .setValues(output);

  // 凍結首行方便閱讀
  overviewSheet.setFrozenRows(1);

  SpreadsheetApp.getUi().alert(
    '✅ 總覽已更新！\n共 ' + masterOrder.length + ' 筆成員'
  );
}


/**
 * doGet(e) — 供 React 前端讀取總覽資料（選用）
 *
 * 呼叫方式：?action=overview
 * 回傳格式：
 *   {
 *     people: [
 *       { area, group, name, sessions: { 1: '✓', 2: '✗', 3: '尚報名', ... } }
 *     ]
 *   }
 *
 * 若 sheet「總覽」不存在，自動先執行 generateOverview() 再讀取。
 */
function doGet(e) {
  var action = e && e.parameter && e.parameter.action;

  if (action === 'overview') {
    return ContentService
      .createTextOutput(JSON.stringify(getOverviewJson()))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // 其他 action 由原本邏輯處理（保持向下相容）
  return ContentService
    .createTextOutput(JSON.stringify({ error: 'unknown action' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function getOverviewJson() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('總覽');

  // 若總覽尚未產生，先執行一次
  if (!sheet) generateOverview();
  sheet = ss.getSheetByName('總覽');

  var rows = sheet.getDataRange().getValues();
  if (rows.length < 2) return { people: [] };

  // header 第 4 欄起是各次標籤（第一次...第六次），用 index 1~6 對應
  var people = [];
  for (var i = 1; i < rows.length; i++) {
    var r = rows[i];
    var sessions = {};
    for (var s = 0; s < 6; s++) {
      sessions[s + 1] = r[3 + s] ? r[3 + s].toString() : STATUS.NOT_REGISTERED;
    }
    people.push({
      area:     r[0].toString(),
      group:    r[1].toString(),
      name:     r[2].toString(),
      sessions: sessions,
    });
  }

  return { people: people };
}
