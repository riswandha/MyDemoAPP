# Mobile Automation — My Demo App (TypeScript + WebdriverIO + Appium)

Automation test untuk aplikasi **My Demo App (Sauce Labs)** dengan struktur cross-platform:
satu set test spec, dijalankan di platform berbeda cukup dengan mengganti file config.

Status platform saat ini:

| Platform | Status |
|---|---|
| Android | Jalan penuh (UiAutomator2), lokal & CI |
| iOS | Kerangka siap (config + slot locator), **belum runnable** — lihat [Status iOS](#status-ios) |

## Prasyarat

- Node.js 18+ (CI memakai Node 20)
- Java JDK 11+ (JDK 17 di CI — dibutuhkan emulator & Allure)
- Android SDK terpasang, `ANDROID_HOME` sudah di-set
- Emulator aktif atau device fisik terhubung (`adb devices`)

## Setup

```bash
npm install
```

```bash
npx appium driver install uiautomator2
```

```bash
cp .env.example .env
```

Isi `.env` sesuai device yang dipakai. Appium server **tidak perlu dijalankan manual** — sudah
auto-start lewat `@wdio/appium-service` (binary lokal dari `node_modules/.bin/appium`, bukan
`appium` global, supaya tidak bergantung pada manifest driver di mesin masing-masing).

Bila app **sudah terpasang** di device, biarkan `APP_PATH` kosong — Appium membuka app lewat
`APP_PACKAGE`/`APP_ACTIVITY` tanpa install ulang. Isi `APP_PATH` hanya bila ingin memasang `.apk`
baru; letakkan file-nya di `apps/` (gitignored, tidak pernah di-commit).

## Menjalankan Test

```bash
npm run test:android
```

Per fitur (WebdriverIO suite, lihat `suites` di `config/wdio.shared.conf.ts`):

```bash
npm run test:login
```

Suite lain: `test:catalog`, `test:cart`, `test:checkout`, `test:menu`, `test:smoke`.

### Run paralel di banyak device

Isi `ANDROID_DEVICES` di `.env` dengan serial dari `adb devices`, dipisah koma:

```
ANDROID_DEVICES=emulator-5554,emulator-5556
```

Config Android otomatis membuat satu capability per device (dengan `systemPort` unik) dan
menjalankan semuanya paralel. Satu device → tetap sequential seperti biasa.

## Struktur Folder

```
config/
  wdio.shared.conf.ts       # base config: specs, suites, retry, timeout, service, reporter, hook
  wdio.android.conf.ts      # extend base + capabilities UiAutomator2 (multi-device dari env)
  wdio.ios.conf.ts          # extend base + capabilities XCUITest (belum runnable)
tests/<fitur>/*.spec.ts     # test case, dikelompokkan per FITUR (login, catalog, cart, checkout, menu, smoke)
pages/
  base.page.ts              # utilitas bersama: platformLocator, wait, gesture (swipe/scroll/tap)
  <fitur>.page.ts           # page object per layar — TANPA assertion
locators/
  types.ts                  # PlatformSelector + resolvePlatformSelector (satu-satunya percabangan platform)
  <fitur>.locators.ts       # selector android & ios dipisah eksplisit
fixtures/app.fixture.ts     # hook lifecycle: reset app per sesi, screenshot saat gagal
utils/
  env.ts                    # satu pintu ke environment variable
  device-helper.ts          # helper level device/app (foreground, restart)
  test-data.ts              # konstanta & factory data test
  api-helpers.ts            # sengaja kosong — app demo ini tidak punya backend API untuk seeding
scripts/                    # pipeline laporan kustom (HTML + PDF per fitur)
apps/                       # .apk/.ipa untuk run lokal (gitignored)
reports/                    # output laporan (gitignored seluruhnya)
```

Aturan lengkap penulisan test ada di `CLAUDE.md`.

### Kenapa locator dipisah di `locators/`

Setiap locator ditulis sebagai pasangan `{ android, ios }`. Test spec tidak pernah tahu sedang
jalan di platform mana — pemilihannya terjadi di satu tempat saja
(`resolvePlatformSelector()` di `locators/types.ts`, dipakai `BasePage.platformLocator()` dan oleh
script laporan). Jadi mengganti platform = mengganti file config, bukan mengubah isi test.

### Status iOS

`npm run test:ios` **belum bisa dijalankan**. Yang masih kurang:

1. Slot `ios` di seluruh file `locators/` masih penanda `TODO(ios)` — sengaja dikosongkan, bukan
   ditebak, karena selector wajib berasal dari inspeksi device nyata. Bila dipaksa run di iOS,
   `resolvePlatformSelector()` melempar error yang jelas alih-alih gagal senyap.
2. Driver `appium-xcuitest-driver` belum ditambahkan ke dependencies.
3. Build `.app`/`.ipa` dan variabel env iOS (`IOS_DEVICE_NAME`, `IOS_PLATFORM_VERSION`, `IOS_UDID`,
   `IOS_BUNDLE_ID`) belum diisi.

## Laporan

### Allure (laporan standar hasil run test)

```bash
npm run report:generate
```

```bash
npm run report:open
```

Screenshot diambil otomatis hanya saat test **gagal**, lalu dilampirkan ke Allure.

### Collection report (HTML + PDF per fitur)

Laporan kustom berisi screenshot **per langkah** dan tabel Expected/Actual per case ID, mengikuti
format test script di `Testcript/`. Menjalankan setiap collection di setiap device pada
`ANDROID_DEVICES`, lalu menggabungkan hasilnya jadi laporan per fitur dengan perbandingan
antar-device.

```bash
npm run report:capture
```

```bash
npm run report:build
```

Set `REPORT_SEQUENTIAL=1` untuk memaksa run berurutan penuh (log lebih rapi, device tidak rebutan
bandwidth USB saat ambil screenshot).

Catatan: seluruh isi `reports/` **tidak di-commit**. Isinya screenshot layar device asli (form
checkout, status bar, notifikasi) yang berisiko membocorkan data pribadi, dan PDF-nya puluhan MB.
Bagikan lewat artifact CI atau share manual.

## CI (GitHub Actions)

Workflow: `.github/workflows/android-tests.yml`. Strategi eksekusi disesuaikan dengan biaya —
emulator lambat, jadi full regression tidak dijalankan di setiap commit.

| Pemicu | Yang dijalankan |
|---|---|
| Pull request | `typecheck` + suite `smoke` di API 33 |
| Push ke `main` | Seluruh spec × matrix API 30 / 33 / 34 / 36 |
| Nightly (18:00 UTC) | Collection report HTML + PDF |
| Manual (`workflow_dispatch`) | Pilih suite & API level sendiri, opsional collection report |

APK di-download saat runtime dari GitHub Release `saucelabs/my-demo-app-android` (tidak pernah
di-commit), driver Appium dipasang di runner dengan versi yang dikunci dari `package-lock.json`,
KVM diaktifkan, dan animasi emulator dimatikan. Laporan diunggah sebagai artifact (retensi 14 hari).

## Penjelasan Command (`package.json` scripts)

| Command | Fungsi |
|---|---|
| `npm test` / `npm run test:android` | Menjalankan seluruh test Android (`config/wdio.android.conf.ts`) |
| `npm run test:ios` | Menjalankan test iOS (`config/wdio.ios.conf.ts`) — belum runnable, lihat Status iOS |
| `npm run test:<suite>` | Menjalankan satu suite saja: `login`, `catalog`, `cart`, `checkout`, `menu`, `smoke` |
| `npm run typecheck` | Cek tipe TypeScript tanpa emit (dipakai juga sebagai gate cepat di CI) |
| `npm run appium` | Menjalankan Appium server manual (opsional — run test sudah auto-start server) |
| `npm run report:generate` | Generate laporan HTML Allure dari `reports/allure-results` |
| `npm run report:open` | Membuka laporan Allure di browser |
| `npm run report:capture` | Menjalankan seluruh collection di semua device, merekam screenshot per langkah |
| `npm run report:build` | Menggabungkan hasil `report:capture` jadi HTML + PDF per fitur |
| `npm run ci:summary` | Menulis ringkasan hasil run ke GitHub Actions job summary |
