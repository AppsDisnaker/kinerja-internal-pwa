# Kinerja Internal - PWA (Progressive Web App)

Web app penilaian kinerja yang dapat diinstall di perangkat mobile dan dibuka tanpa kolom URL.

## Arsitektur

- **Frontend**: GitHub Pages (PWA)
- **Backend**: Node.js + Express (dengan Google Sheets API) atau Google Apps Script
- **Database**: Google Sheets

## Cara Setup - Opsi 1: Backend Node.js (Direkomendasikan)

### Step 1: Setup Google Cloud Console

1. Buka [Google Cloud Console](https://console.cloud.google.com/)
2. Buat project baru atau pilih existing project
3. Aktifkan **Google Sheets API**
4. Buat **Service Account** dan download JSON key
5. Share Spreadsheet dengan email service account

Lihat [DEPLOY.md](DEPLOY.md) untuk panduan lengkap.

### Step 2: Deploy Backend

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy dan edit `.env`:
   ```bash
   cp .env.example .env
   # Edit .env dengan nilai dari JSON service account
   ```

3. Test lokal:
   ```bash
   npm start
   ```

4. Deploy ke Railway/Render/Vercel (gratis)

### Step 3: Update Frontend API URL

Edit `index.html`, cari bagian `API_BASE_URL` dan ganti dengan URL backend Anda:
```javascript
const API_BASE_URL = 'https://your-backend-url.railway.app/api';
```

### Step 4: Upload ke GitHub Pages

1. Upload file ke repository GitHub:
   - `Index.html`
   - `manifest.json`
   - `sw.js`
2. Enable GitHub Pages di Settings → Pages → Branch: main → Folder: /
3. URL: `https://USERNAME.github.io/REPO-NAME/`

---

## Cara Setup - Opsi 2: Google Apps Script (Alternatif)

### Step 1: Deploy GAS sebagai Web App

1. Buka Google Apps Script project Anda
2. Copy isi file `Code.gs` ke editor GAS
3. Deploy sebagai Web App:
   - **Deploy** → **New deployment**
   - Select type: **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
4. Copy **Web App URL**

### Step 2: Update Frontend API URL

Edit `index.html`:
```javascript
const API_BASE_URL = 'https://script.google.com/macros/s/ABC123/exec';
```

---

## Fitur PWA

### Install di Android (Chrome)
1. Buka link aplikasi di Chrome
2. Klik menu ⋮ → **"Tambahkan ke Layar Utama"**
3. Klik **"Install"**
4. Aplikasi terbuka **tanpa kolom URL** (fullscreen)

### Install di iPhone/iPad (Safari)
1. Buka link aplikasi di Safari
2. Klik tombol **Share** → **"Add to Home Screen"**
3. Klik **"Add"**
4. Aplikasi terbuka tanpa kolom URL

## Login Default

- **Admin**: username `admin`, password `admin123`
- **User**: username `user`, password `user123`

## Troubleshooting

### CORS Error (Node.js)
Pastikan sudah menggunakan `cors` middleware di Express.

### Data Tidak Muncul
1. Cek Spreadsheet ID di environment variables
2. Pastikan sheet `Data Kinerja`, `Users`, dan `Data Referensi` ada
3. Pastikan Service Account sudah di-share ke Spreadsheet

### Login Tidak Berfungsi
1. Cek nama sheet di Google Spreadsheet (case sensitive)
2. Pastikan format data di sheet `Users`: Kolom A = username, Kolom B = role
