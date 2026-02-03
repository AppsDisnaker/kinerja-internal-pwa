// KONFIGURASI DEFAULT
const DEFAULT_FOLDER_ID = "";
const DEFAULT_SHEET_USERS = "Users";
const DEFAULT_SPREADSHEET_ID = "";
const DEFAULT_OFFICE_NAME = "Kinerja Internal";
const DEFAULT_LOGO_URL = "";

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

function saveSettings(settings) {
  try {
    if (!settings.officeName || settings.officeName.trim() === '') {
      return { success: false, message: 'Nama kantor tidak boleh kosong' };
    }
    if (settings.spreadsheetId && !isValidGoogleId(settings.spreadsheetId)) {
      return { success: false, message: 'ID Spreadsheet tidak valid' };
    }
    if (settings.folderId && !isValidGoogleId(settings.folderId)) {
      return { success: false, message: 'ID Folder tidak valid' };
    }
    var properties = PropertiesService.getScriptProperties();
    properties.setProperty('APP_SETTINGS', JSON.stringify(settings));
    return { success: true, message: 'Pengaturan berhasil disimpan' };
  } catch (e) {
    Logger.log('Error saving settings: ' + e.toString());
    return { success: false, message: 'Error menyimpan pengaturan: ' + e.toString() };
  }
}

function isValidGoogleId(id) {
  return /^[a-zA-Z0-9-_]{20,50}$/.test(id);
}

function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
}

function clearSettings() {
  var properties = PropertiesService.getScriptProperties();
  properties.deleteProperty('APP_SETTINGS');
  return 'Settings cleared';
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

function doGet() {
  Logger.log('doGet called');
  initializeMainSheet();
  return HtmlService.createHtmlOutputFromFile('Index')
      .setTitle('Dashboard Kinerja Pegawai')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function getSpreadsheet() {
  var settings = getSettings();
  if (settings.spreadsheetId) {
    try {
      var ss = SpreadsheetApp.openById(settings.spreadsheetId);
      Logger.log('Using spreadsheet ID: ' + settings.spreadsheetId);
      return ss;
    } catch (e) {
      Logger.log('Error opening spreadsheet by ID: ' + e.toString());
      throw new Error('Cannot access spreadsheet. Please check sharing permissions.');
    }
  }
  try {
    var activeSs = SpreadsheetApp.getActiveSpreadsheet();
    Logger.log('Using active spreadsheet ID: ' + activeSs.getId());
    return activeSs;
  } catch (e) {
    Logger.log('Error getting active spreadsheet: ' + e.toString());
    try {
      var ss = SpreadsheetApp.create('Kinerja Internal Data');
      Logger.log('Created new spreadsheet: ' + ss.getId());
      return ss;
    } catch (createError) {
      Logger.log('Error creating new spreadsheet: ' + createError.toString());
      throw new Error('No accessible spreadsheet. Please set spreadsheet ID in settings.');
    }
  }
}

function getUsersSheet() {
  var settings = getSettings();
  var sheetName = settings.sheetUsers || DEFAULT_SHEET_USERS;
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(["Username", "Password", "Role"]);
    sheet.appendRow(["admin", "admin123", "Admin"]);
  }
  return sheet;
}

function initializeMainSheet() {
  var ss = getSpreadsheet();
  var sheet = ss.getSheets()[0];
  if (!sheet) {
    sheet = ss.insertSheet();
  }
  var headerRange = sheet.getRange(1, 1, 1, 11);
  var headerValues = headerRange.getValues()[0];
  var expectedHeaders = [
    "Timestamp", "Tanggal", "Nama Bidang", "Sub. Kegiatan", "Uraian Kegiatan",
    "Nama Penanggung Jawab", "Tujuan Kegiatan", "Dampak", "Persentase",
    "Link Dokumentasi (Foto)", "Link Dokumen Pendukung"
  ];
  var needsHeader = false;
  for (var i = 0; i < expectedHeaders.length; i++) {
    if (headerValues[i] !== expectedHeaders[i]) {
      needsHeader = true;
      break;
    }
  }
  if (needsHeader) {
    sheet.getRange(1, 1, 1, 11).setValues([expectedHeaders]);
    sheet.getRange(1, 1, 1, 11).setFontWeight("bold");
    sheet.getRange(1, 1, 1, 11).setBackground("#f0f0f0");
    sheet.setColumnWidth(1, 150);
    sheet.setColumnWidth(2, 100);
    sheet.setColumnWidth(3, 150);
    sheet.setColumnWidth(4, 150);
    sheet.setColumnWidth(5, 200);
    sheet.setColumnWidth(6, 150);
    sheet.setColumnWidth(7, 150);
    sheet.setColumnWidth(8, 150);
    sheet.setColumnWidth(9, 100);
    sheet.setColumnWidth(10, 200);
    sheet.setColumnWidth(11, 200);
  }
}

function checkLogin(username, password) {
  var sheet = getUsersSheet();
  var data = sheet.getDataRange().getValues();
  var userFound = false;
  
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] == username) {
      userFound = true;
      if (data[i][1] == password) {
        var token = generateSessionToken();
        var cache = CacheService.getScriptCache();
        cache.put(token, JSON.stringify({ username: username, role: data[i][2] }), 3600);
        return {
          valid: true,
          role: data[i][2],
          username: username,
          token: token
        };
      } else {
        return { valid: false, message: "Password tidak cocok!", type: "wrong_password" };
      }
    }
  }
  
  if (!userFound) {
    return { valid: false, message: "Username tidak terdaftar. Silakan hubungi Admin!", type: "user_not_found" };
  }
  
  return { valid: false, message: "Username atau Password salah!", type: "general_error" };
}

function getUserList() {
  var sheet = getUsersSheet();
  var data = sheet.getDataRange().getValues();
  var users = [];
  for (var i = 1; i < data.length; i++) {
    users.push({
      username: data[i][0],
      role: data[i][2]
    });
  }
  return users;
}

function addUser(username, password, role) {
  var sheet = getUsersSheet();
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] == username) {
      return { success: false, message: "Username sudah ada!" };
    }
  }
  sheet.appendRow([username, password, role]);
  return { success: true, message: "User berhasil ditambahkan!" };
}

function editUser(oldUsername, newUsername, newPassword, newRole) {
  var sheet = getUsersSheet();
  var data = sheet.getDataRange().getValues();
  if (oldUsername !== newUsername) {
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] == newUsername) {
        return { success: false, message: "Username baru sudah digunakan!" };
      }
    }
  }
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] == oldUsername) {
      sheet.getRange(i + 1, 1).setValue(newUsername);
      if (newPassword && newPassword.toString().trim() !== "") {
        sheet.getRange(i + 1, 2).setValue(newPassword);
      }
      sheet.getRange(i + 1, 3).setValue(newRole);
      return { success: true, message: "Data user berhasil diperbarui!" };
    }
  }
  return { success: false, message: "User tidak ditemukan!" };
}

function deleteUser(username) {
  var sheet = getUsersSheet();
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] == username) {
      sheet.deleteRow(i + 1);
      return { success: true, message: "User berhasil dihapus!" };
    }
  }
  return { success: false, message: "User tidak ditemukan!" };
}

function getData() {
  try {
    Logger.log('Starting getData...');
    var ss = getSpreadsheet();
    Logger.log('Spreadsheet obtained: ' + ss.getName());
    Logger.log('Spreadsheet ID: ' + ss.getId());
    var sheet = ss.getSheets()[0];
    if (!sheet) {
      Logger.log('No sheet found, initializing...');
      initializeMainSheet();
      sheet = ss.getSheets()[0];
    }
    if (!sheet) {
      Logger.log('Failed to initialize sheet');
      return [];
    }
    var lastRow = sheet.getLastRow();
    Logger.log('Sheet last row: ' + lastRow);
    Logger.log('Sheet name: ' + sheet.getName());
    if (lastRow < 2) {
      Logger.log('No data rows');
      return [];
    }
    var data = sheet.getRange(2, 1, lastRow - 1, 11).getValues();
    Logger.log('Data rows retrieved: ' + data.length);
    var processedData = data.map(function(row) {
      return row.map(function(cell) {
        if (cell instanceof Date) {
          return cell.toISOString();
        }
        return cell;
      });
    });
    Logger.log('Sample processed data row 0: ' + JSON.stringify(processedData[0]));
    var result = processedData.map(function(row, index) {
      var rowIndex = index + 2;
      return row.concat([rowIndex]);
    });
    Logger.log('Returning ' + result.length + ' data rows');
    return result;
  } catch (e) {
    Logger.log('Error in getData: ' + e.toString());
    return [];
  }
}

// Reference management functions
function getBidangList() {
  try {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName('Bidang');
    if (!sheet) {
      // Create sheet if it doesn't exist
      sheet = ss.insertSheet('Bidang');
      sheet.appendRow(['Nama Bidang']);
      sheet.getRange(1, 1).setFontWeight('bold');
      return [];
    }

    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) return []; // No data besides header

    var bidangList = [];
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] && data[i][0].toString().trim() !== '') {
        bidangList.push(data[i][0].toString().trim());
      }
    }
    return bidangList;
  } catch (e) {
    Logger.log('Error getting bidang list: ' + e.toString());
    return [];
  }
}

function getSubKegiatanList(bidangFilter) {
  try {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName('Sub. Kegiatan');
    if (!sheet) {
      // Create sheet if it doesn't exist
      sheet = ss.insertSheet('Sub. Kegiatan');
      sheet.appendRow(['Nama Sub Kegiatan', 'Bidang']);
      sheet.getRange(1, 1, 1, 2).setFontWeight('bold');
      return [];
    }

    // Check if sheet has the new structure (with Bidang column)
    var headerRange = sheet.getRange(1, 1, 1, 2);
    var headerValues = headerRange.getValues()[0];
    var hasBidangColumn = headerValues.length >= 2 && headerValues[1] === 'Bidang';

    // If old structure, migrate it
    if (!hasBidangColumn) {
      sheet.getRange(1, 2).setValue('Bidang');
      sheet.getRange(1, 1, 1, 2).setFontWeight('bold');
    }

    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) return []; // No data besides header

    var subKegiatanList = [];
    
    // Normalize bidangFilter for precise matching
    var normalizedBidangFilter = bidangFilter ? bidangFilter.toString().trim().toLowerCase() : '';
    
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] && data[i][0].toString().trim() !== '') {
        var bidang = data[i][1] ? data[i][1].toString().trim() : '';
        var normalizedBidang = bidang.toLowerCase();
        var item = {
          nama: data[i][0].toString().trim(),
          bidang: bidang,
          normalizedBidang: normalizedBidang
        };

        // If bidangFilter is provided, only return items for that bidang
        // Precise matching: exact match on normalized bidang or empty bidang (legacy data)
        if (!bidangFilter) {
          // No filter - include all items
          subKegiatanList.push(item);
        } else if (normalizedBidang === normalizedBidangFilter) {
          // Exact match - include items with matching bidang
          subKegiatanList.push(item);
        } else if (bidang === '') {
          // Legacy data with empty bidang - include in filtered results
          subKegiatanList.push(item);
        }
        // Note: Items with different bidang are NOT included
      }
    }
    
    // Sort by bidang first, then by name (put empty bidang at the end)
    subKegiatanList.sort(function(a, b) {
      // Put items with empty bidang at the end
      if (a.bidang === '' && b.bidang !== '') return 1;
      if (a.bidang !== '' && b.bidang === '') return -1;
      // Sort by bidang
      if (a.bidang < b.bidang) return -1;
      if (a.bidang > b.bidang) return 1;
      // Sort by name
      if (a.nama < b.nama) return -1;
      if (a.nama > b.nama) return 1;
      return 0;
    });
    
    Logger.log('getSubKegiatanList filtered: ' + subKegiatanList.length + ' items for bidangFilter: ' + bidangFilter);
    return subKegiatanList;
  } catch (e) {
    Logger.log('Error getting sub kegiatan list: ' + e.toString());
    return [];
  }
}

function addBidang(bidangName) {
  try {
    if (!bidangName || bidangName.trim() === '') {
      return { success: false, message: 'Nama bidang tidak boleh kosong' };
    }

    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName('Bidang');
    if (!sheet) {
      sheet = ss.insertSheet('Bidang');
      sheet.appendRow(['Nama Bidang']);
      sheet.getRange(1, 1).setFontWeight('bold');
    }

    // Check if bidang already exists
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] && data[i][0].toString().trim().toLowerCase() === bidangName.trim().toLowerCase()) {
        return { success: false, message: 'Bidang sudah ada dalam daftar' };
      }
    }

    sheet.appendRow([bidangName.trim()]);
    return { success: true, message: 'Bidang berhasil ditambahkan' };
  } catch (e) {
    Logger.log('Error adding bidang: ' + e.toString());
    return { success: false, message: 'Error menambah bidang: ' + e.toString() };
  }
}

function addSubKegiatan(subKegiatanName, bidangName) {
  try {
    if (!subKegiatanName || subKegiatanName.trim() === '') {
      return { success: false, message: 'Nama sub kegiatan tidak boleh kosong' };
    }
    if (!bidangName || bidangName.trim() === '') {
      return { success: false, message: 'Bidang harus dipilih' };
    }

    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName('Sub. Kegiatan');
    if (!sheet) {
      sheet = ss.insertSheet('Sub. Kegiatan');
      sheet.appendRow(['Nama Sub Kegiatan', 'Bidang']);
      sheet.getRange(1, 1, 1, 2).setFontWeight('bold');
    }

    // Ensure sheet has the correct structure
    var headerRange = sheet.getRange(1, 1, 1, 2);
    var headerValues = headerRange.getValues()[0];
    if (headerValues[1] !== 'Bidang') {
      sheet.getRange(1, 2).setValue('Bidang');
      sheet.getRange(1, 1, 1, 2).setFontWeight('bold');
    }

    // Check if sub kegiatan already exists for this bidang
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      var existingName = data[i][0] ? data[i][0].toString().trim().toLowerCase() : '';
      var existingBidang = data[i][1] ? data[i][1].toString().trim() : '';
      if (existingName === subKegiatanName.trim().toLowerCase() && existingBidang === bidangName.trim()) {
        return { success: false, message: 'Sub kegiatan sudah ada untuk bidang ini' };
      }
    }

    sheet.appendRow([subKegiatanName.trim(), bidangName.trim()]);
    return { success: true, message: 'Sub kegiatan berhasil ditambahkan ke bidang ' + bidangName };
  } catch (e) {
    Logger.log('Error adding sub kegiatan: ' + e.toString());
    return { success: false, message: 'Error menambah sub kegiatan: ' + e.toString() };
  }
}

function deleteBidang(bidangName) {
  try {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName('Bidang');
    if (!sheet) {
      return { success: false, message: 'Sheet Bidang tidak ditemukan' };
    }

    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] && data[i][0].toString().trim() === bidangName.trim()) {
        sheet.deleteRow(i + 1);
        return { success: true, message: 'Bidang berhasil dihapus' };
      }
    }

    return { success: false, message: 'Bidang tidak ditemukan' };
  } catch (e) {
    Logger.log('Error deleting bidang: ' + e.toString());
    return { success: false, message: 'Error menghapus bidang: ' + e.toString() };
  }
}

function deleteSubKegiatan(subKegiatanName) {
  try {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName('Sub. Kegiatan');
    if (!sheet) {
      return { success: false, message: 'Sheet Sub. Kegiatan tidak ditemukan' };
    }

    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] && data[i][0].toString().trim() === subKegiatanName.trim()) {
        sheet.deleteRow(i + 1);
        return { success: true, message: 'Sub kegiatan berhasil dihapus' };
      }
    }

    return { success: false, message: 'Sub kegiatan tidak ditemukan' };
  } catch (e) {
    Logger.log('Error deleting sub kegiatan: ' + e.toString());
    return { success: false, message: 'Error menghapus sub kegiatan: ' + e.toString() };
  }
}

function addSubKegiatanBulk(subKegiatanNames, bidangName) {
  try {
    if (!subKegiatanNames || !Array.isArray(subKegiatanNames) || subKegiatanNames.length === 0) {
      return { success: false, message: 'Daftar nama sub kegiatan tidak valid' };
    }

    if (!bidangName || bidangName.trim() === '') {
      return { success: false, message: 'Bidang harus dipilih' };
    }

    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName('Sub. Kegiatan');
    if (!sheet) {
      sheet = ss.insertSheet('Sub. Kegiatan');
      sheet.appendRow(['Nama Sub Kegiatan', 'Bidang']);
      sheet.getRange(1, 1, 1, 2).setFontWeight('bold');
    }

    // Ensure sheet has the correct structure
    var headerRange = sheet.getRange(1, 1, 1, 2);
    var headerValues = headerRange.getValues()[0];
    if (headerValues[1] !== 'Bidang') {
      sheet.getRange(1, 2).setValue('Bidang');
      sheet.getRange(1, 1, 1, 2).setFontWeight('bold');
    }

    // Get existing data to check for duplicates
    var existingData = sheet.getDataRange().getValues();
    var existingSubKegiatan = {};

    // Build lookup for existing sub kegiatan by bidang
    for (var i = 1; i < existingData.length; i++) {
      var existingName = existingData[i][0] ? existingData[i][0].toString().trim().toLowerCase() : '';
      var existingBidang = existingData[i][1] ? existingData[i][1].toString().trim() : '';

      if (existingName) {
        var key = existingName + '|' + existingBidang;
        existingSubKegiatan[key] = true;
      }
    }

    // Process each sub kegiatan name
    var addedCount = 0;
    var duplicateCount = 0;
    var errorCount = 0;
    var rowsToAdd = [];

    for (var j = 0; j < subKegiatanNames.length; j++) {
      var subKegiatanName = subKegiatanNames[j].trim();

      if (!subKegiatanName) {
        errorCount++;
        continue;
      }

      // Check for duplicate within the same bidang
      var lookupKey = subKegiatanName.toLowerCase() + '|' + bidangName.trim();
      if (existingSubKegiatan[lookupKey]) {
        duplicateCount++;
        continue;
      }

      // Add to rows to be inserted
      rowsToAdd.push([subKegiatanName, bidangName.trim()]);
      existingSubKegiatan[lookupKey] = true; // Prevent duplicates within the same batch
      addedCount++;
    }

    // Insert all valid rows at once
    if (rowsToAdd.length > 0) {
      var startRow = existingData.length + 1;
      sheet.getRange(startRow, 1, rowsToAdd.length, 2).setValues(rowsToAdd);
    }

    var message = 'Proses selesai. ';
    if (addedCount > 0) {
      message += 'Berhasil menambah ' + addedCount + ' sub kegiatan';
    }
    if (duplicateCount > 0) {
      message += ', ' + duplicateCount + ' duplikat dilewati';
    }
    if (errorCount > 0) {
      message += ', ' + errorCount + ' error';
    }

    return {
      success: true,
      message: message,
      addedCount: addedCount,
      duplicateCount: duplicateCount,
      errorCount: errorCount
    };

  } catch (e) {
    Logger.log('Error adding sub kegiatan bulk: ' + e.toString());
    return { success: false, message: 'Error menambah sub kegiatan: ' + e.toString() };
  }
}

function getImageAsBase64(fileId) {
  try {
    var file = DriveApp.getFileById(fileId);
    var blob = file.getBlob();
    var base64 = Utilities.base64Encode(blob.getBytes());
    
    return {
      success: true,
      imageData: base64,
      mimeType: blob.getContentType(),
      fileName: file.getName()
    };
  } catch (error) {
    console.error('Error getting image as base64:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

function deleteKinerja(rowIndex) {
  try {
    var ss = getSpreadsheet();
    var sheet = ss.getSheets()[0];

    // Get the row data before deleting to extract file URLs
    var rowData = sheet.getRange(rowIndex, 1, 1, 11).getValues()[0];
    var photoUrl = rowData[9]; // Column 10 (0-indexed as 9)
    var docUrl = rowData[10];  // Column 11 (0-indexed as 10)

    // Delete associated files from Drive
    var deletedFiles = [];
    if (photoUrl) {
      var photoDeleted = deleteFileFromDrive(photoUrl);
      if (photoDeleted) deletedFiles.push("foto");
    }
    if (docUrl) {
      var docDeleted = deleteFileFromDrive(docUrl);
      if (docDeleted) deletedFiles.push("dokumen");
    }

    // Delete the row from spreadsheet
    sheet.deleteRow(rowIndex);

    // Create success message
    var message = "Data berhasil dihapus!";
    if (deletedFiles.length > 0) {
      message += " File " + deletedFiles.join(" dan ") + " juga telah dihapus dari Drive.";
    } else if (photoUrl || docUrl) {
      message += " (File tidak dapat dihapus dari Drive, namun data telah terhapus).";
    }

    return { success: true, message: message };
  } catch (e) {
    return { success: false, message: "Error: " + e.toString() };
  }
}

// Helper function to delete file from Google Drive
function deleteFileFromDrive(fileUrl) {
  try {
    // Extract file ID from various Google Drive URL formats
    var fileId = null;
    var patterns = [
      /\/file\/d\/([a-zA-Z0-9-_]+)/,
      /[?&]id=([a-zA-Z0-9-_]+)/,
      /googleusercontent\.com\/d\/([a-zA-Z0-9-_]+)/,
      /\/d\/([a-zA-Z0-9-_]+)/
    ];

    for (var i = 0; i < patterns.length; i++) {
      var match = fileUrl.match(patterns[i]);
      if (match && match[1]) {
        fileId = match[1];
        break;
      }
    }

    if (fileId) {
      try {
        var file = DriveApp.getFileById(fileId);
        file.setTrashed(true); // Move to trash instead of permanent delete
        Logger.log('File moved to trash: ' + fileId);
        return true;
      } catch (fileError) {
        Logger.log('Error deleting file ' + fileId + ': ' + fileError.toString());
        return false;
      }
    }

    return false;
  } catch (e) {
    Logger.log('Error in deleteFileFromDrive: ' + e.toString());
    return false;
  }
}

function editKinerja(formObject) {
  try {
    var ss = getSpreadsheet();
    var sheet = ss.getSheets()[0];
    var rowIndex = parseInt(formObject.rowIndex);
    var settings = getSettings();
    var folderId = settings.folderId || DEFAULT_FOLDER_ID;
    var folder = null;
    if (folderId) {
      try {
        folder = DriveApp.getFolderById(folderId);
      } catch (e) {
        return { success: false, message: "Folder ID tidak valid. Silakan set di Settings untuk upload file." };
      }
    }
    if ((formObject.foto && formObject.foto.data) || (formObject.dokumen && formObject.dokumen.data)) {
      if (!folder) {
        return { success: false, message: "Folder ID belum dikonfigurasi untuk upload file. Silakan set di Settings." };
      }
    }
    var oldData = sheet.getRange(rowIndex, 1, 1, 11).getValues()[0];
    var oldPhotoUrl = oldData[9];
    var oldDocUrl = oldData[10];
    var photoUrl = oldPhotoUrl;
    if (formObject.foto && formObject.foto.data) {
      var photoBlob = Utilities.newBlob(Utilities.base64Decode(formObject.foto.data), formObject.foto.mimeType, formObject.foto.fileName);
      var photoFile = folder.createFile(photoBlob);
      photoFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      photoUrl = photoFile.getUrl();
    }
    var docUrl = oldDocUrl;
    if (formObject.dokumen && formObject.dokumen.data) {
      var docBlob = Utilities.newBlob(Utilities.base64Decode(formObject.dokumen.data), formObject.dokumen.mimeType, formObject.dokumen.fileName);
      var docFile = folder.createFile(docBlob);
      docFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      docUrl = docFile.getUrl();
    }
    sheet.getRange(rowIndex, 2).setValue(formObject.tanggal);
    sheet.getRange(rowIndex, 3).setValue(formObject.nama_bidang);
    sheet.getRange(rowIndex, 4).setValue(formObject.sub_kegiatan);
    sheet.getRange(rowIndex, 5).setValue(formObject.uraian);
    sheet.getRange(rowIndex, 6).setValue(formObject.penanggung_jawab);
    sheet.getRange(rowIndex, 7).setValue(formObject.tujuan);
    sheet.getRange(rowIndex, 8).setValue(formObject.dampak);
    sheet.getRange(rowIndex, 9).setValue(formObject.persentase);
    sheet.getRange(rowIndex, 10).setValue(photoUrl);
    sheet.getRange(rowIndex, 11).setValue(docUrl);
    return { success: true, message: "Data berhasil diperbarui!" };
  } catch (e) {
    return { success: false, message: "Error: " + e.toString() };
  }
}

function updateUser(oldUsername, newUsername, newPassword, newRole) {
  return editUser(oldUsername, newUsername, newPassword, newRole);
}

function updateKinerja(formObject) {
  try {
    var ss = getSpreadsheet();
    var sheet = ss.getSheets()[0];
    var rowIndex = parseInt(formObject.rowIndex);
    var settings = getSettings();
    var folderId = settings.folderId || DEFAULT_FOLDER_ID;
    var folder = null;
    if (folderId) {
      try {
        folder = DriveApp.getFolderById(folderId);
      } catch (e) {
        return { success: false, message: "Folder ID tidak valid. Silakan set di Settings untuk upload file." };
      }
    }
    if ((formObject.foto && formObject.foto.data) || (formObject.dokumen && formObject.dokumen.data)) {
      if (!folder) {
        return { success: false, message: "Folder ID belum dikonfigurasi untuk upload file. Silakan set di Settings." };
      }
    }
    var oldData = sheet.getRange(rowIndex, 1, 1, 11).getValues()[0];
    var oldPhotoUrl = oldData[9];
    var oldDocUrl = oldData[10];
    var photoUrl = oldPhotoUrl;
    if (formObject.foto && formObject.foto.data) {
      var photoBlob = Utilities.newBlob(Utilities.base64Decode(formObject.foto.data), formObject.foto.mimeType, formObject.foto.fileName);
      var photoFile = folder.createFile(photoBlob);
      photoFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      photoUrl = photoFile.getUrl();
    }
    var docUrl = oldDocUrl;
    if (formObject.dokumen && formObject.dokumen.data) {
      var docBlob = Utilities.newBlob(Utilities.base64Decode(formObject.dokumen.data), formObject.dokumen.mimeType, formObject.dokumen.fileName);
      var docFile = folder.createFile(docBlob);
      docFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      docUrl = docFile.getUrl();
    }
    sheet.getRange(rowIndex, 1).setValue(new Date());
    sheet.getRange(rowIndex, 2).setValue(formObject.tanggal);
    sheet.getRange(rowIndex, 3).setValue(formObject.nama_bidang);
    sheet.getRange(rowIndex, 4).setValue(formObject.sub_kegiatan);
    sheet.getRange(rowIndex, 5).setValue(formObject.uraian);
    sheet.getRange(rowIndex, 6).setValue(formObject.penanggung_jawab);
    sheet.getRange(rowIndex, 7).setValue(formObject.tujuan);
    sheet.getRange(rowIndex, 8).setValue(formObject.dampak);
    sheet.getRange(rowIndex, 9).setValue(formObject.persentase);
    sheet.getRange(rowIndex, 10).setValue(photoUrl);
    sheet.getRange(rowIndex, 11).setValue(docUrl);
    return { success: true, message: "Data berhasil diperbarui!" };
  } catch (e) {
    return { success: false, message: "Error: " + e.toString() };
  }
}

function processForm(formObject) {
  try {
    Logger.log('Form object received: ' + JSON.stringify(formObject));
    var ss = getSpreadsheet();
    var sheet = ss.getSheets()[0];
    var settings = getSettings();
    var folderId = settings.folderId || DEFAULT_FOLDER_ID;
    Logger.log('Folder ID: ' + folderId);
    var folder = null;
    if (folderId) {
      try {
        folder = DriveApp.getFolderById(folderId);
        Logger.log('Folder found: ' + folder.getName());
      } catch (e) {
        Logger.log('Error getting folder: ' + e.toString());
        return { success: false, message: "Folder ID tidak valid. Silakan set di Settings untuk upload file." };
      }
    }
    if ((formObject.foto && formObject.foto.data) || (formObject.dokumen && formObject.dokumen.data)) {
      if (!folder) {
        Logger.log('No folder configured for file upload');
        return { success: false, message: "Folder ID belum dikonfigurasi untuk upload file. Silakan set di Settings." };
      }
    }
    var photoUrl = "";
    if (formObject.foto && formObject.foto.data) {
      Logger.log('Uploading photo: ' + formObject.foto.fileName);
      var photoBlob = Utilities.newBlob(Utilities.base64Decode(formObject.foto.data), formObject.foto.mimeType, formObject.foto.fileName);
      var photoFile = folder.createFile(photoBlob);
      photoFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      photoUrl = photoFile.getUrl();
      Logger.log('Photo uploaded: ' + photoUrl);
    }
    var docUrl = "";
    if (formObject.dokumen && formObject.dokumen.data) {
      Logger.log('Uploading document: ' + formObject.dokumen.fileName);
      var docBlob = Utilities.newBlob(Utilities.base64Decode(formObject.dokumen.data), formObject.dokumen.mimeType, formObject.dokumen.fileName);
      var docFile = folder.createFile(docBlob);
      docFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      docUrl = docFile.getUrl();
      Logger.log('Document uploaded: ' + docUrl);
    }
    var rowData = [
      new Date(),
      formObject.tanggal,
      formObject.nama_bidang,
      formObject.sub_kegiatan,
      formObject.uraian,
      formObject.penanggung_jawab,
      formObject.tujuan,
      formObject.dampak,
      formObject.persentase,
      photoUrl,
      docUrl
    ];
    sheet.appendRow(rowData);
    Logger.log('Data appended to sheet');
    return { success: true, message: "Data berhasil disimpan!" };
  } catch (e) {
    Logger.log('Error in processForm: ' + e.toString());
    return { success: false, message: "Error: " + e.toString() };
  }
}