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

## Langkah 3: Deploy ke Railway

### 3.1 Buat Akun Railway
1. Buka https://railway.app/
2. Login dengan GitHub
3. Klik "New Project" → "Deploy from GitHub repo"

### 3.2 Setup Environment Variables di Railway
1. Di Railway dashboard, pilih project Anda
2. Klik "Variables" tab
3. Tambahkan variable satu per satu:
   - `SPREADSHEET_ID`
   - `SHEET_USERS`
   - `SHEET_DATA_KINERJA`
   - `SHEET_REFERENSI`
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `GOOGLE_PRIVATE_KEY` (copy-paste seluruh isi dari field `private_key` di file JSON, termasuk baris -----BEGIN/END PRIVATE KEY-----)

### 3.3 Deploy
1. Railway akan otomatis deploy dari GitHub
2. Tunggu sampai deployment selesai
3. Copy URL dari Railway (misalnya: https://kinerja-internal-api.up.railway.app)

## Langkah 4: Update Frontend

Edit file `index.html`, ubah `API_BASE_URL`:
```javascript
const API_BASE_URL = 'https://kinerja-internal-api.up.railway.app/api';
```

## Alternatif Deploy ke Vercel

Jika lebih memilih Vercel:

1. Buat file `vercel.json`:
```json
{
  "version": 2,
  "builds": [
    {
      "src": "server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/server.js"
    }
  ]
}
```

2. Install Vercel CLI: `npm i -g vercel`
3. Deploy: `vercel --prod`

## Troubleshooting

### Error: "Service account not found"
- Pastikan email service account sudah di-share ke Spreadsheet

### Error: "Spreadsheet not found"
- Pastikan SPREADSHEET_ID benar (ambil dari URL Spreadsheet)

### Error: "private_key" format salah
- Pastikan `GOOGLE_PRIVATE_KEY` dalam format yang benar
- Gunakan tanda kutip ganda di awal dan akhir
- Jika di Railway, tidak perlu escape \n

### Error: CORS
- Pastikan sudah menginstall dan menggunakan `cors` middleware
