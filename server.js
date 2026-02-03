// Kinerja Internal - Node.js Backend dengan Google Sheets API
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { google } = require('googleapis');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Google Sheets Configuration
const SPREADSHEET_ID = process.env.SPREADSHEET_ID || '';
const SHEET_USERS = process.env.SHEET_USERS || 'Users';
const SHEET_DATA_KINERJA = process.env.SHEET_DATA_KINERJA || 'Data Kinerja';
const SHEET_REFERENSI = process.env.SHEET_REFERENSI || 'Data Referensi';

// Google Auth
function getAuth() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return auth;
}

function getSheetClient() {
  const auth = getAuth();
  return google.sheets({ version: 'v4', auth });
}

// ============================================
// API Routes
// ============================================

// Check Login
app.post('/api/checkLogin', async (req, res) => {
  try {
    const { username, password } = req.body;
    const sheets = getSheetClient();
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: SHEET_USERS,
    });
    
    const rows = response.data.values || [];
    
    // Skip header row
    for (let i = 1; i < rows.length; i++) {
      const rowUsername = rows[i][0] ? rows[i][0].toString().trim().toLowerCase() : '';
      if (rowUsername === username.toString().trim().toLowerCase()) {
        const role = rows[i][1] ? rows[i][1].toString().trim() : 'User';
        return res.json({
          valid: true,
          username: username,
          role: role,
          message: 'Login berhasil'
        });
      }
    }
    
    res.json({ valid: false, message: 'Username tidak ditemukan!' });
  } catch (error) {
    console.error('Login error:', error);
    res.json({ valid: false, message: 'Error saat login: ' + error.message });
  }
});

// Get Dashboard Data
app.post('/api/getDashboardData', async (req, res) => {
  try {
    const sheets = getSheetClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: SHEET_DATA_KINERJA,
    });
    
    const rows = response.data.values || [];
    if (rows.length < 2) {
      return res.json({ success: true, data: [] });
    }
    
    const headers = rows[0];
    const result = [];
    
    for (let i = 1; i < rows.length; i++) {
      const row = {};
      for (let j = 0; j < headers.length; j++) {
        row[headers[j]] = rows[i][j] || '';
      }
      row.id = i;
      result.push(row);
    }
    
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.json({ success: false, message: error.message });
  }
});

// Get Bidang List
app.post('/api/getBidangList', async (req, res) => {
  try {
    const sheets = getSheetClient();
    
    // Try Data Referensi first
    let response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: SHEET_REFERENSI,
    }).catch(() => null);
    
    if (response && response.data.values && response.data.values.length > 1) {
      const rows = response.data.values;
      const bidangSet = new Set();
      
      for (let i = 1; i < rows.length; i++) {
        const bidang = rows[i][0] ? rows[i][0].toString().trim() : '';
        if (bidang) bidangSet.add(bidang);
      }
      
      return res.json({ success: true, data: Array.from(bidangSet).sort() });
    }
    
    // Fallback to Data Kinerja
    response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: SHEET_DATA_KINERJA,
    });
    
    const rows = response.data.values || [];
    const bidangSet = new Set();
    
    for (let i = 1; i < rows.length; i++) {
      const bidang = rows[i][1] || ''; // Column B
      if (bidang) bidangSet.add(bidang.toString().trim());
    }
    
    res.json({ success: true, data: Array.from(bidangSet).sort() });
  } catch (error) {
    console.error('Bidang list error:', error);
    res.json({ success: false, message: error.message });
  }
});

// Get Sub Kegiatan List with precise filtering
app.post('/api/getSubKegiatanList', async (req, res) => {
  try {
    const { bidang } = req.body;
    const sheets = getSheetClient();
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: SHEET_REFERENSI,
    });
    
    const rows = response.data.values || [];
    const subKegiatan = [];
    
    // Normalize bidang filter
    const normalizedFilter = bidang ? bidang.toString().replace(/\s+/g, ' ').trim().toLowerCase() : '';
    
    for (let i = 1; i < rows.length; i++) {
      const rowBidang = rows[i][0] ? rows[i][0].toString().replace(/\s+/g, ' ').trim() : '';
      const subkeg = rows[i][2] ? rows[i][2].toString().replace(/\s+/g, ' ').trim() : '';
      
      if (!subkeg) continue;
      
      const normalizedRowBidang = rowBidang.toLowerCase();
      
      // Exact match only for precision
      if (normalizedRowBidang === normalizedFilter) {
        subKegiatan.push({
          nama: subkeg,
          bidang: rowBidang,
          normalizedBidang: normalizedRowBidang
        });
      }
    }
    
    // Remove duplicates
    const uniqueMap = new Map();
    subKegiatan.forEach(item => {
      uniqueMap.set(item.nama, item);
    });
    
    const result = Array.from(uniqueMap.values()).sort((a, b) => 
      a.nama.localeCompare(b.nama)
    );
    
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Sub kegiatan error:', error);
    res.json({ success: false, message: error.message });
  }
});

// Save Data
app.post('/api/saveData', async (req, res) => {
  try {
    const data = req.body;
    const sheets = getSheetClient();
    
    // Get headers
    const headerResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_DATA_KINERJA}!1:1`,
    });
    
    const headers = headerResponse.data.values[0] || [];
    const newRow = headers.map(header => data[header] || '');
    
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: SHEET_DATA_KINERJA,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [newRow] },
    });
    
    res.json({ success: true, message: 'Data berhasil disimpan' });
  } catch (error) {
    console.error('Save error:', error);
    res.json({ success: false, message: 'Error: ' + error.message });
  }
});

// Update Progress
app.post('/api/updateProgress', async (req, res) => {
  try {
    const { id, progress } = req.body;
    const sheets = getSheetClient();
    
    // Find the row
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: SHEET_DATA_KINERJA,
    });
    
    const rows = response.data.values || [];
    const headers = rows[0] || [];
    const progressColIndex = headers.indexOf('Progress');
    
    if (progressColIndex === -1) {
      return res.json({ success: false, message: 'Kolom Progress tidak ditemukan' });
    }
    
    let rowFound = false;
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] == id) {
        await sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: `${SHEET_DATA_KINERJA}!R${i + 1}C${progressColIndex + 1}`,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [[progress]] },
        });
        rowFound = true;
        break;
      }
    }
    
    if (!rowFound) {
      return res.json({ success: false, message: 'Data tidak ditemukan' });
    }
    
    res.json({ success: true, message: 'Progress berhasil diupdate' });
  } catch (error) {
    console.error('Update progress error:', error);
    res.json({ success: false, message: 'Error: ' + error.message });
  }
});

// Delete Data
app.post('/api/deleteData', async (req, res) => {
  try {
    const { id } = req.body;
    const sheets = getSheetClient();
    
    // Find and delete row
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: SHEET_DATA_KINERJA,
    });
    
    const rows = response.data.values || [];
    
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] == id) {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId: SPREADSHEET_ID,
          requestBody: {
            requests: [{
              deleteDimension: {
                range: {
                  sheetId: 0,
                  dimension: 'ROWS',
                  startIndex: i,
                  endIndex: i + 1
                }
              }
            }]
          }
        });
        return res.json({ success: true, message: 'Data berhasil dihapus' });
      }
    }
    
    res.json({ success: false, message: 'Data tidak ditemukan' });
  } catch (error) {
    console.error('Delete error:', error);
    res.json({ success: false, message: 'Error: ' + error.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`Kinerja Internal API running on port ${PORT}`);
});

module.exports = app;
