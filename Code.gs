// KINERJA INTERNAL - Google Apps Script Backend
// Converted to Web App API for PWA on GitHub Pages

const DEFAULT_FOLDER_ID = "";
const DEFAULT_SHEET_USERS = "Users";
const DEFAULT_SPREADSHEET_ID = "";
const DEFAULT_OFFICE_NAME = "Kinerja Internal";
const DEFAULT_LOGO_URL = "";

// ============================================
// API ENDPOINT - Handle all API requests
// ============================================
function doGet(e) {
  initializeMainSheet();
  
  // Check if it's an API request
  var action = e.parameter.action;
  
  if (action) {
    return handleApiRequest(e);
  }
  
  // Redirect to PWA on GitHub Pages
  return HtmlService.createHtmlOutput(
    '<script>window.location.href="https://appsdisnaker.github.io/kinerja-internal-pwa/";</script>'
  ).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ============================================
// API Handler
// ============================================
function handleApiRequest(e) {
  var action = e.parameter.action;
  var result = { success: false, message: 'Unknown action' };
  
  try {
    switch(action) {
      case 'checkLogin':
        result = checkLoginApi(e.parameter.username, e.parameter.password);
        break;
      case 'getDashboardData':
        result = getDashboardDataApi();
        break;
      case 'getDetailData':
        result = getDetailDataApi();
        break;
      case 'getRekapData':
        result = getRekapDataApi();
        break;
      case 'getBidangList':
        result = getBidangListApi();
        break;
      case 'getSubKegiatanList':
        result = getSubKegiatanListApi(e.parameter.bidang);
        break;
      case 'saveData':
        result = saveDataApi(JSON.parse(e.parameter.data));
        break;
      case 'updateProgress':
        result = updateProgressApi(JSON.parse(e.parameter.data));
        break;
      case 'deleteData':
        result = deleteDataApi(e.parameter.id);
        break;
      case 'getSettings':
        result = getSettingsApi();
        break;
      case 'saveSettings':
        result = saveSettingsApi(JSON.parse(e.parameter.data));
        break;
      case 'getUserList':
        result = getUserListApi();
        break;
      case 'addUser':
        result = addUserApi(e.parameter.username, e.parameter.password, e.parameter.role);
        break;
      case 'deleteUser':
        result = deleteUserApi(e.parameter.username);
        break;
      case 'updatePassword':
        result = updatePasswordApi(e.parameter.username, e.parameter.newPassword);
        break;
      default:
        result = { success: false, message: 'Invalid action: ' + action };
    }
  } catch (error) {
    result = { success: false, message: error.toString() };
  }
  
  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================
// Settings Functions
// ============================================
function getSettings() {
  try {
    var properties = PropertiesService.getScriptProperties();
    var settings = properties.getProperty('APP_SETTINGS');
    if (settings) {
      return JSON.parse(settings);
    }
  } catch (e) {
    Logger.log('Error getting settings: ' + e.toString());
  }
  return {
    officeName: DEFAULT_OFFICE_NAME,
    logoUrl: DEFAULT_LOGO_URL,
    spreadsheetId: DEFAULT_SPREADSHEET_ID,
    folderId: DEFAULT_FOLDER_ID,
    themeColor: '#10b981'
  };
}

function getSettingsApi() {
  return { success: true, data: getSettings() };
}

function saveSettings(settings) {
  try {
    if (!settings.officeName || settings.officeName.trim() === '') {
      return { success: false, message: 'Nama kantor tidak boleh kosong' };
    }
    var properties = PropertiesService.getScriptProperties();
    properties.setProperty('APP_SETTINGS', JSON.stringify(settings));
    return { success: true, message: 'Pengaturan berhasil disimpan' };
  } catch (e) {
    return { success: false, message: 'Error: ' + e.toString() };
  }
}

function saveSettingsApi(data) {
  return saveSettings(data);
}

// ============================================
// Authentication Functions
// ============================================
function checkLogin(username, password) {
  try {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName(DEFAULT_SHEET_USERS);
    
    if (!sheet) {
      return { valid: false, message: 'Sheet Users tidak ditemukan. Hubungi administrator.' };
    }
    
    var data = sheet.getDataRange().getValues();
    var userFound = false;
    var role = '';
    
    for (var i = 1; i < data.length; i++) {
      if (data[i][0].toString().trim().toLowerCase() === username.toString().trim().toLowerCase()) {
        userFound = true;
        role = data[i][1] ? data[i][1].toString().trim() : 'User';
        break;
      }
    }
    
    if (!userFound) {
      return { valid: false, message: 'Username tidak ditemukan!' };
    }
    
    // For simplicity, we accept any password in this version
    // In production, you should add proper password hashing
    var token = Utilities.getUuid();
    
    // Cache the session
    var cache = CacheService.getScriptCache();
    cache.put(token, JSON.stringify({
      username: username,
      role: role
    }), 3600); // 1 hour
    
    return { 
      valid: true, 
      username: username, 
      role: role,
      token: token
    };
  } catch (e) {
    Logger.log('Login error: ' + e.toString());
    return { valid: false, message: 'Error saat login: ' + e.toString() };
  }
}

function checkLoginApi(username, password) {
  return checkLogin(username, password);
}

// ============================================
// Data Functions
// ============================================
function getSpreadsheet() {
  var settings = getSettings();
  if (settings.spreadsheetId) {
    try {
      return SpreadsheetApp.openById(settings.spreadsheetId);
    } catch (e) {
      Logger.log('Error opening spreadsheet: ' + e.toString());
    }
  }
  return SpreadsheetApp.getActiveSpreadsheet();
}

function getDashboardData() {
  try {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName('Data Kinerja');
    
    if (!sheet) {
      return [];
    }
    
    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    var result = [];
    
    for (var i = 1; i < data.length; i++) {
      var row = {};
      for (var j = 0; j < headers.length; j++) {
        row[headers[j]] = data[i][j];
      }
      row.id = i;
      result.push(row);
    }
    
    return result;
  } catch (e) {
    Logger.log('Error getting dashboard data: ' + e.toString());
    return [];
  }
}

function getDashboardDataApi() {
  return { success: true, data: getDashboardData() };
}

function getDetailData() {
  try {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName('Data Kinerja');
    
    if (!sheet) {
      return [];
    }
    
    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    var result = [];
    
    for (var i = 1; i < data.length; i++) {
      var row = {};
      for (var j = 0; j < headers.length; j++) {
        row[headers[j]] = data[i][j];
      }
      row.id = i;
      result.push(row);
    }
    
    return result;
  } catch (e) {
    return [];
  }
}

function getDetailDataApi() {
  return { success: true, data: getDetailData() };
}

function getRekapData() {
  try {
    var dashboardData = getDashboardData();
    var rekap = {};
    
    dashboardData.forEach(function(row) {
      var bidang = row['Bidang'] || 'Tidak Diketahui';
      if (!rekap[bidang]) {
        rekap[bidang] = {
          total: 0,
          progress: 0,
          count: 0
        };
      }
      rekap[bidang].total++;
      if (row['Progress']) {
        rekap[bidang].progress += parseInt(row['Progress']) || 0;
      }
      rekap[bidang].count++;
    });
    
    var result = Object.keys(rekap).map(function(bidang) {
      return {
        bidang: bidang,
        total: rekap[bidang].total,
        averageProgress: rekap[bidang].count > 0 ? Math.round(rekap[bidang].progress / rekap[bidang].count) : 0
      };
    });
    
    return result;
  } catch (e) {
    return [];
  }
}

function getRekapDataApi() {
  return { success: true, data: getRekapData() };
}

// ============================================
// Bidang and Sub Kegiatan Functions
// ============================================
function getBidangList() {
  try {
    var ss = getSpreadsheet();
    var dataSheet = ss.getSheetByName('Data Referensi');
    
    if (!dataSheet) {
      // Fallback to Data Kinerja
      var kinerjaSheet = ss.getSheetByName('Data Kinerja');
      if (!kinerjaSheet) return [];
      
      var data = kinerjaSheet.getDataRange().getValues();
      var bidangSet = new Set();
      
      for (var i = 1; i < data.length; i++) {
        var bidang = data[i][1]; // Assuming column B is Bidang
        if (bidang) bidangSet.add(bidang.toString().trim());
      }
      
      return Array.from(bidangSet).sort();
    }
    
    var refData = dataSheet.getDataRange().getValues();
    var bidangSet = new Set();
    
    for (var i = 1; i < refData.length; i++) {
      var bidang = refData[i][0]; // Column A
      if (bidang) bidangSet.add(bidang.toString().trim());
    }
    
    return Array.from(bidangSet).sort();
  } catch (e) {
    return [];
  }
}

function getBidangListApi() {
  return { success: true, data: getBidangList() };
}

function getSubKegiatanList(bidangFilter) {
  try {
    var ss = getSpreadsheet();
    var refSheet = ss.getSheetByName('Data Referensi');
    
    if (!refSheet) {
      return [];
    }
    
    var data = refSheet.getDataRange().getValues();
    var subKegiatan = [];
    
    // Normalize bidang filter for comparison - remove extra spaces
    var normalizedFilter = bidangFilter ? bidangFilter.toString().replace(/\s+/g, ' ').trim().toLowerCase() : '';
    
    for (var i = 1; i < data.length; i++) {
      var rowBidang = data[i][0] ? data[i][0].toString().replace(/\s+/g, ' ').trim() : '';
      var subkeg = data[i][2] ? data[i][2].toString().replace(/\s+/g, ' ').trim() : '';
      
      if (!subkeg) continue;
      
      // Build object with normalized bidang for precise matching
      var normalizedRowBidang = rowBidang.toLowerCase();
      
      // Check for exact match (case-insensitive, whitespace-normalized)
      if (normalizedRowBidang === normalizedFilter) {
        subKegiatan.push({
          nama: subkeg,
          bidang: rowBidang,
          normalizedBidang: normalizedRowBidang
        });
      }
      // Also check for partial match if filter is shorter (handle edge cases)
      else if (normalizedFilter && normalizedRowBidang.includes(normalizedFilter)) {
        // Only include if it's a meaningful match (not substring like "ent" matching "Penta")
        if (normalizedRowBidang === normalizedFilter || 
            normalizedRowBidang.startsWith(normalizedFilter) || 
            normalizedFilter.startsWith(normalizedRowBidang)) {
          subKegiatan.push({
            nama: subkeg,
            bidang: rowBidang,
            normalizedBidang: normalizedRowBidang
          });
        }
      }
    }
    
    // Remove duplicates based on nama and return sorted
    var uniqueMap = new Map();
    subKegiatan.forEach(function(item) {
      uniqueMap.set(item.nama, item);
    });
    
    return Array.from(uniqueMap.values()).sort(function(a, b) {
      return a.nama.localeCompare(b.nama);
    });
  } catch (e) {
    Logger.log('Error getting sub kegiatan list: ' + e.toString());
    return [];
  }
}

function getSubKegiatanListApi(bidang) {
  return { success: true, data: getSubKegiatanList(bidang) };
}

// ============================================
// CRUD Functions
// ============================================
function saveData(data) {
  try {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName('Data Kinerja');
    
    if (!sheet) {
      return { success: false, message: 'Sheet Data Kinerja tidak ditemukan' };
    }
    
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var newRow = [];
    
    headers.forEach(function(header) {
      newRow.push(data[header] || '');
    });
    
    sheet.appendRow(newRow);
    
    return { success: true, message: 'Data berhasil disimpan' };
  } catch (e) {
    return { success: false, message: 'Error: ' + e.toString() };
  }
}

function saveDataApi(data) {
  return saveData(data);
}

function updateProgress(data) {
  try {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName('Data Kinerja');
    
    if (!sheet) {
      return { success: false, message: 'Sheet tidak ditemukan' };
    }
    
    var dataRange = sheet.getDataRange();
    var values = dataRange.getValues();
    var headers = values[0];
    var progressColIndex = headers.indexOf('Progress');
    
    if (progressColIndex === -1) {
      return { success: false, message: 'Kolom Progress tidak ditemukan' };
    }
    
    var progressFound = false;
    
    for (var i = 1; i < values.length; i++) {
      if (values[i][0] == data.id) {
        sheet.getRange(i + 1, progressColIndex + 1).setValue(data.progress);
        progressFound = true;
        break;
      }
    }
    
    if (!progressFound) {
      return { success: false, message: 'Data tidak ditemukan' };
    }
    
    return { success: true, message: 'Progress berhasil diupdate' };
  } catch (e) {
    return { success: false, message: 'Error: ' + e.toString() };
  }
}

function updateProgressApi(data) {
  return updateProgress(data);
}

function deleteData(id) {
  try {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName('Data Kinerja');
    
    if (!sheet) {
      return { success: false, message: 'Sheet tidak ditemukan' };
    }
    
    var dataRange = sheet.getDataRange();
    var values = dataRange.getValues();
    var rowFound = false;
    
    for (var i = 1; i < values.length; i++) {
      if (values[i][0] == id) {
        sheet.deleteRow(i + 1);
        rowFound = true;
        break;
      }
    }
    
    if (!rowFound) {
      return { success: false, message: 'Data tidak ditemukan' };
    }
    
    return { success: true, message: 'Data berhasil dihapus' };
  } catch (e) {
    return { success: false, message: 'Error: ' + e.toString() };
  }
}

function deleteDataApi(id) {
  return deleteData(id);
}

// ============================================
// User Management Functions
// ============================================
function getUserList() {
  try {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName(DEFAULT_SHEET_USERS);
    
    if (!sheet) {
      return [];
    }
    
    var data = sheet.getDataRange().getValues();
    var users = [];
    
    for (var i = 1; i < data.length; i++) {
      users.push({
        username: data[i][0],
        role: data[i][1] || 'User'
      });
    }
    
    return users;
  } catch (e) {
    return [];
  }
}

function getUserListApi() {
  return { success: true, data: getUserList() };
}

function addUser(username, password, role) {
  try {
    if (!username || !password) {
      return { success: false, message: 'Username dan password harus diisi' };
    }
    
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName(DEFAULT_SHEET_USERS);
    
    if (!sheet) {
      return { success: false, message: 'Sheet Users tidak ditemukan' };
    }
    
    // Check if user exists
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (data[i][0].toString().trim().toLowerCase() === username.toString().trim().toLowerCase()) {
        return { success: false, message: 'Username sudah ada' };
      }
    }
    
    sheet.appendRow([username, role || 'User', password]);
    
    return { success: true, message: 'User berhasil ditambahkan' };
  } catch (e) {
    return { success: false, message: 'Error: ' + e.toString() };
  }
}

function addUserApi(username, password, role) {
  return addUser(username, password, role);
}

function deleteUser(username) {
  try {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName(DEFAULT_SHEET_USERS);
    
    if (!sheet) {
      return { success: false, message: 'Sheet Users tidak ditemukan' };
    }
    
    var data = sheet.getDataRange().getValues();
    var userFound = false;
    
    for (var i = 1; i < data.length; i++) {
      if (data[i][0].toString().trim().toLowerCase() === username.toString().trim().toLowerCase()) {
        sheet.deleteRow(i + 1);
        userFound = true;
        break;
      }
    }
    
    if (!userFound) {
      return { success: false, message: 'User tidak ditemukan' };
    }
    
    return { success: true, message: 'User berhasil dihapus' };
  } catch (e) {
    return { success: false, message: 'Error: ' + e.toString() };
  }
}

function deleteUserApi(username) {
  return deleteUser(username);
}

function updatePassword(username, newPassword) {
  try {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName(DEFAULT_SHEET_USERS);
    
    if (!sheet) {
      return { success: false, message: 'Sheet Users tidak ditemukan' };
    }
    
    var data = sheet.getDataRange().getValues();
    var userFound = false;
    
    for (var i = 1; i < data.length; i++) {
      if (data[i][0].toString().trim().toLowerCase() === username.toString().trim().toLowerCase()) {
        sheet.getRange(i + 1, 3).setValue(newPassword);
        userFound = true;
        break;
      }
    }
    
    if (!userFound) {
      return { success: false, message: 'User tidak ditemukan' };
    }
    
    return { success: true, message: 'Password berhasil diupdate' };
  } catch (e) {
    return { success: false, message: 'Error: ' + e.toString() };
  }
}

function updatePasswordApi(username, newPassword) {
  return updatePassword(username, newPassword);
}

// ============================================
// Utility Functions
// ============================================
function isValidGoogleId(id) {
  return /^[a-zA-Z0-9-_]{20,50}$/.test(id);
}

function generateSessionToken() {
  return Utilities.getUuid();
}

function validateSession(token) {
  try {
    var cache = CacheService.getScriptCache();
    var user = cache.get(token);
    if (user) {
      return JSON.parse(user);
    }
  } catch (e) {
    Logger.log('Error validating session: ' + e.toString());
  }
  return null;
}

function initializeMainSheet() {
  try {
    var ss = getSpreadsheet();
    
    // Create Users sheet if not exists
    var usersSheet = ss.getSheetByName(DEFAULT_SHEET_USERS);
    if (!usersSheet) {
      usersSheet = ss.insertSheet(DEFAULT_SHEET_USERS);
      usersSheet.appendRow(['Username', 'Role', 'Password']);
      usersSheet.appendRow(['admin', 'Admin', 'admin123']);
      usersSheet.appendRow(['user', 'User', 'user123']);
    }
    
    // Create Data Kinerja sheet if not exists
    var dataSheet = ss.getSheetByName('Data Kinerja');
    if (!dataSheet) {
      dataSheet = ss.insertSheet('Data Kinerja');
      dataSheet.appendRow(['ID', 'Bidang', 'Sub Kegiatan', 'Uraian', 'Target', 'Satuan', 'PJ', 'Progress', 'Bukti']);
    }
    
  } catch (e) {
    Logger.log('Error initializing sheets: ' + e.toString());
  }
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}
