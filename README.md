# Android Native Automation (TypeScript + WebdriverIO + Appium)

## Prasyarat
- Node.js 18+
- Java JDK 11+ dan Android SDK terpasang (`ANDROID_HOME` sudah di-set)
- Emulator Android aktif atau device fisik terhubung (`adb devices`)
- Appium 2.x dengan driver `uiautomator2`

## Setup

```bash
npm install
npx appium driver install uiautomator2
cp .env.example .env
```

Isi `.env` sesuai device dan APK yang digunakan, lalu letakkan file `.apk` di folder `apps/`.

## Menjalankan Test

```bash
npm run test:android
```

## Struktur Folder

```
config/                 # konfigurasi WebdriverIO/Appium
  wdio.android.conf.ts
test/
  specs/                # test case (*.spec.ts)
  pageobjects/          # Page Object Model
  data/                 # test data
apps/                   # file .apk
reports/                # hasil report (allure, screenshot)
```

## Report

```bash
npm run report:generate
npm run report:open
```

Catatan: file PDF hasil `report:capture`/`report:build` **tidak di-commit** ke repo (lihat `.gitignore`)
karena berisi screenshot layar device asli. Bagikan lewat artifact CI atau share manual bila dibutuhkan.

## Penjelasan Command (`package.json` scripts)

| Command | Fungsi |
|---|---|
| `npm run test` | Menjalankan test menggunakan config default (`config/wdio.conf.ts`) |
| `npm run test:android` | Menjalankan seluruh test Android sesuai `config/wdio.android.conf.ts` (capabilities device, path APK, dll) |
| `npm run appium` | Menjalankan Appium server secara manual (opsional, karena `test:android` sudah auto-start via `services`) |
| `npm run report:generate` | Membaca hasil mentah di `reports/allure-results` lalu generate laporan HTML ke `reports/allure-report` |
| `npm run report:open` | Membuka laporan Allure yang sudah di-generate di browser |
