# Mobile Automation — My Demo App (TypeScript + WebdriverIO + Appium)

Automation test untuk aplikasi **My Demo App (Sauce Labs)** dengan struktur cross-platform:
satu set test spec, dijalankan di platform berbeda cukup dengan mengganti file config.

Status platform saat ini:

| Platform | Status |
|---|---|
| Android | Jalan penuh (UiAutomator2), lokal & CI |
| iOS | Suite **Login** jalan penuh (XCUITest, simulator). Fitur lain masih menunggu inspeksi locator — lihat [Status iOS](#status-ios) |

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
  wdio.ios.conf.ts          # extend base + capabilities XCUITest
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

Suite **`login` sudah jalan penuh di iOS** (terverifikasi di simulator iPhone 17 Pro / iOS 26.5).
Fitur lain (`catalog`, `cart`, `checkout`, `menu`) masih Android-only: slot `ios` di file
`locators/`-nya masih penanda `TODO(ios)` — sengaja dikosongkan, bukan ditebak, karena selector wajib
berasal dari inspeksi device nyata. Bila dipaksa run di iOS, `resolvePlatformSelector()` melempar
error yang jelas alih-alih gagal senyap.

#### Menjalankan suite login di iOS

```bash
APPIUM_HOME="$PWD/.appium" npx appium driver install xcuitest@9.10.5
```

Driver dipatok di seri 9.x karena XCUITest 12.x mensyaratkan Appium 3, sedangkan project ini memakai
Appium 2. Pastikan driver terpasang di `APPIUM_HOME` project (folder `.appium/`), bukan hanya di
`APPIUM_HOME` global mesin.

```bash
xcrun simctl shutdown all
npm run test:ios:login
```

`simctl shutdown all` bukan formalitas: pengisian form di iOS dikirim sebagai input keyboard FISIK
(lihat di bawah), dan capability `appium:connectHardwareKeyboard` hanya diterapkan bila Appium
sendiri yang mem-boot simulatornya. Kalau simulator sudah terlanjur berjalan, Appium memakainya apa
adanya dan pengetikan bisa gagal. Di CI hal ini terjadi sendirinya karena simulator selalu mulai dari
keadaan mati.

Isi `IOS_DEVICE_NAME`, `IOS_PLATFORM_VERSION`, dan `IOS_UDID` di `.env` sesuai simulator yang dipakai
(`xcrun simctl list devices`). `IOS_BUNDLE_ID` sudah berisi default app-nya.

#### Tiga hal yang bikin iOS berbeda dari Android di fitur ini

Ketiganya perbedaan perilaku app/OS, bukan sekadar beda locator, dan semuanya diverifikasi langsung
di simulator:

1. **Keyboard tidak bisa ditutup.** App ini tidak melepas fokus field dengan cara apa pun yang bisa
   dipicu dari Appium, sehingga keyboard software menetap dan menutupi tombol submit. Karena itu
   `BasePage.setValue()` di iOS mengetik sebagai input keyboard fisik (`mobile: keys`) — iOS otomatis
   menyingkirkan keyboard software begitu input datang dari sana. Daftar lengkap cara yang sudah
   dicoba dan gagal ada di `utils/gesture-helper.ts`.
2. **Dialog sistem "Save Password?"** muncul setelah login berhasil. Dialog ini milik sistem, tidak
   terlihat di page source app, tapi membuat seluruh elemen app terbaca `visible=false`. Ditutup
   otomatis lewat `SystemDialogPage.dismissIosSavePasswordDialog()` — bukan lewat `autoDismissAlerts`,
   karena capability itu juga akan menutup alert validasi app yang justru harus dibaca test.
3. **Skenario locked out tidak ada di iOS.** App iOS tidak punya akun locked out sama sekali (keempat
   akun pada daftar username tersimpan semuanya berhasil login, dan tidak ada string bertema "locked"
   di binary-nya) — app-nya bahkan menerima kredensial ngawur. Skenarionya karena itu ditandai
   `@android-only` dan otomatis di-skip saat run iOS.

Teks pesan error "password kosong" juga berbeda (Android `Enter Password`, iOS `Password is
required`); nilai harapannya dipilih per platform lewat `platformText()` di `utils/test-data.ts`.

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
| Mingguan (Sabtu 01:00 WIB) | Collection report HTML + PDF |
| Manual (`workflow_dispatch`) | Pilih suite & API level sendiri, opsional collection report |

APK di-download saat runtime dari GitHub Release `saucelabs/my-demo-app-android` (tidak pernah
di-commit), driver Appium dipasang di runner dengan versi yang dikunci dari `package-lock.json`,
KVM diaktifkan, dan animasi emulator dimatikan. Laporan diunggah sebagai artifact (retensi 14 hari).

## Penjelasan Command (`package.json` scripts)

| Command | Fungsi |
|---|---|
| `npm test` / `npm run test:android` | Menjalankan seluruh test Android (`config/wdio.android.conf.ts`) |
| `npm run test:ios` | Menjalankan test iOS (`config/wdio.ios.conf.ts`) — sejauh ini baru suite `login` yang siap |
| `npm run test:ios:<suite>` | Menjalankan satu suite di iOS: `login`, `catalog`, `cart`, `checkout`, `menu`, `smoke` |
| `npm run test:<suite>` | Menjalankan satu suite saja: `login`, `catalog`, `cart`, `checkout`, `menu`, `smoke` |
| `npm run typecheck` | Cek tipe TypeScript tanpa emit (dipakai juga sebagai gate cepat di CI) |
| `npm run appium` | Menjalankan Appium server manual (opsional — run test sudah auto-start server) |
| `npm run report:generate` | Generate laporan HTML Allure dari `reports/allure-results` |
| `npm run report:open` | Membuka laporan Allure di browser |
| `npm run report:capture` | Menjalankan seluruh collection di semua device, merekam screenshot per langkah |
| `npm run report:build` | Menggabungkan hasil `report:capture` jadi HTML + PDF per fitur |
| `npm run ci:summary` | Menulis ringkasan hasil run ke GitHub Actions job summary |
