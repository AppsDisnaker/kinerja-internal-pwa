# Panduan Deploy Backend Node.js untuk Kinerja Internal

## Langkah 1: Setup Google Cloud Console

### 1.1 Buat Project di Google Cloud Console
1. Buka https://console.cloud.google.com/
2. Login dengan akun Google Anda
3. Klik "Select Project" → "New Project"
4. Beri nama project, misalnya "Kinerja Internal API"
5. Klik "Create"

### 1.2 Aktifkan Google Sheets API
1. Di dashboard, klik "APIs & Services" → "Library"
2. Cari "Google Sheets API"
3. Klik dan pilih "Enable"

### 1.3 Buat Service Account
1. Klik "APIs & Services" → "Credentials"
2. Klik "Create Credentials" → "Service Account"
3. Beri nama service account, misalnya "Kinerja API"
4. Klik "Continue"
5. Untuk Role, pilih "Project" → "Viewer" (atau "Editor" jika perlu menulis)
6. Klik "Continue" → "Done"

### 1.4 Download Service Account Key
1. Di halaman Credentials, cari service account yang baru dibuat
2. Klik pada email service account
3. Tab "Keys" → "Add Key" → "Create new key"
4. Pilih "JSON" → "Create"
5. File JSON akan otomatis ter-download
6. Simpan file ini dengan aman (akan digunakan untuk autentikasi)

### 1.5 Share Spreadsheet dengan Service Account
1. Buka Google Spreadsheet Anda
2. Klik tombol "Share"
3. Masukkan email service account (dari file JSON, field `client_email`)
4. Klik "Send"

## Langkah 2: Setup di Komputer Lokal

### 2.1 Install Node.js
1. Download dari https://nodejs.org/ (pilih LTS version)
2. Install dengan default settings
3. Restart komputer

### 2.2 Clone dan Setup Project
```bash
# Clone project (jika menggunakan Git)
git clone <your-repo-url>
cd kinerja-internal-pwa

# Install dependencies
npm install
```

### 2.3 Konfigurasi Environment
```bash
# Copy file konfigurasi
cp .env.example .env

# Edit file .env dengan editor teks
# Isi dengan nilai dari file JSON service account dan Spreadsheet ID
```

Isi file `.env`:
```
PORT=3000
SPREADSHEET_ID=your_spreadsheet_id_from_url
SHEET_USERS=Users
SHEET_DATA_KINERJA=Data Kinerja
SHEET_REFERENSI=Data Referensi
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
```

### 2.4 Test Lokal
```bash
npm start
```
Buka http://localhost:3000/api/health untuk memastikan server berjalan.

## Langkah 3: Deploy ke Vercel (Direkomendasikan)

### 3.1 Buat Akun Vercel
1. Buka https://vercel.com/
2. Login dengan GitHub
3. Klik "Add New..." → "Project"
4. Import repository GitHub Anda

### 3.2 Setup Environment Variables di Vercel
1. Di Vercel dashboard, pilih project Anda
2. Klik "Settings" → "Environment Variables"
3. Tambahkan variable satu per satu:
   - `SPREADSHEET_ID` → value: ID Spreadsheet Anda
   - `SHEET_USERS` → value: Users
   - `SHEET_DATA_KINERJA` → value: Data Kinerja
   - `SHEET_REFERENSI` → value: Data Referensi
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL` → value: email dari file JSON
   - `GOOGLE_PRIVATE_KEY` → value: copy-paste ISI PENUH dari field `private_key` di file JSON (termasuk -----BEGIN PRIVATE KEY----- dan -----END PRIVATE KEY-----)

**Penting untuk GOOGLE_PRIVATE_KEY:**
- Pastekan tanpa escape `\n` (Vercel akan otomatis menangani)
- Contoh:
  ```
  GOOGLE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----
  MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQ...
  ...isi lengkap private key...
  -----END PRIVATE KEY-----
  ```

### 3.3 Deploy
1. Klik "Deploy"
2. Vercel akan otomatis build dan deploy
3. Tunggu sampai selesai (biasanya 1-2 menit)
4. Copy URL dari Vercel (misalnya: https://kinerja-internal-api.vercel.app)

## Langkah 4: Update Frontend

Edit file `index.html`, ubah `API_BASE_URL`:
```javascript
const API_BASE_URL = 'https://kinerja-internal-api.vercel.app/api';
```

## Alternatif Deploy ke Railway

### 4.1 Buat Akun Railway
1. Buka https://railway.app/
2. Login dengan GitHub
3. Klik "New Project" → "Deploy from GitHub repo"

### 4.2 Setup Environment Variables di Railway
1. Di Railway dashboard, pilih project Anda
2. Klik "Variables" tab
3. Tambahkan variable satu per satu (sama seperti di Vercel)

### 4.3 Deploy
1. Railway akan otomatis deploy dari GitHub
2. Tunggu sampai deployment selesai
3. Copy URL dari Railway

## Troubleshooting

### Error: "Service account not found"
- Pastikan email service account sudah di-share ke Spreadsheet

### Error: "Spreadsheet not found"
- Pastikan SPREADSHEET_ID benar (ambil dari URL Spreadsheet)
- Format: `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit`

### Error: "private_key" format salah
- Pastikan `GOOGLE_PRIVATE_KEY` dalam format yang benar
- Di Vercel: tanpa escape `\n`, paste langsung
- Di Railway: tanpa escape `\n`, paste langsung

### Error: CORS
- Pastikan sudah menginstall dan menggunakan `cors` middleware
- Server.js sudah include `app.use(cors())`

### Error: Timeout di Vercel
- Vercel memiliki limit execution time 10 detik untuk hobby tier
- Jika sering timeout, pertimbangkan Railway atau Render

### Error: Function crashed di Vercel
- Cek logs di Vercel dashboard → "Function" tab
- Pastikan semua environment variables sudah diisi dengan benar
