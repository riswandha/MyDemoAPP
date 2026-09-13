# Mobile Automation — My Demo App (TypeScript + WebdriverIO + Appium)

Automation test untuk aplikasi **My Demo App (Sauce Labs)** dengan struktur cross-platform:
satu set test spec, dijalankan di platform berbeda cukup dengan mengganti file config.

Status platform saat ini:

| Platform | Status |
|---|---|
| Android | Jalan penuh (UiAutomator2), lokal & CI |
| iOS | Jalan penuh (XCUITest, simulator), lokal & CI — semua 6 fitur (login, smoke, catalog, cart, checkout, menu). Lihat [Status iOS](#status-ios) |

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

**Semua 6 fitur sudah jalan penuh di iOS** (terverifikasi di simulator iPhone 17 Pro / iOS 26.5):
`login`, `smoke`, `catalog` (+ product detail), `cart`, `checkout`, `menu`. Beberapa test case
ditandai `@android-only` untuk skenario yang memang tidak ada padanannya di app iOS (lihat detail per
fitur di riwayat commit masing-masing) — bukan locator yang belum dikerjakan.

#### Menjalankan suite di iOS

```bash
APPIUM_HOME="$PWD/.appium" npx appium driver install xcuitest@9.10.5
```

Driver dipatok di seri 9.x karena XCUITest 12.x mensyaratkan Appium 3, sedangkan project ini memakai
Appium 2. Pastikan driver terpasang di `APPIUM_HOME` project (folder `.appium/`), bukan hanya di
`APPIUM_HOME` global mesin.

```bash
xcrun simctl shutdown all
npm run test:ios          # seluruh suite
npm run test:ios:menu     # satu suite saja: login, smoke, catalog, cart, checkout, menu
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
format test script di `Testcript/`. Android dan iOS menghasilkan **2 laporan terpisah** per fitur
(mis. `Login-Report-Android.html` & `Login-Report-iOS.html`) - tidak pernah digabung jadi satu
laporan lintas platform.

```bash
npm run report:capture      # Android - setiap collection di setiap device pada ANDROID_DEVICES,
                             # digabung jadi laporan per fitur dengan perbandingan antar-device
npm run report:capture:ios  # iOS - setiap collection di 1 simulator (tidak ada konsep multi-device)
npm run report:build        # Menggabungkan hasil capture MANAPUN yang tersedia (Android dan/atau
                             # iOS) jadi HTML + PDF - jalankan sekali saja setelah capture platform
                             # yang diinginkan
```

Set `REPORT_SEQUENTIAL=1` (Android saja) untuk memaksa run berurutan penuh (log lebih rapi, device
tidak rebutan bandwidth USB saat ambil screenshot).

Setiap case di script laporan dibungkus `rt.runCase()` (lihat `scripts/lib/report-client.ts`) -
kalau satu case gagal (mis. flake XCUITest), kegagalannya dicatat sebagai satu item verifikasi FAIL
untuk case itu saja; case-case lain yang sudah berhasil TETAP tersimpan ke laporan, bukan ikut hilang
semua.

Catatan: seluruh isi `reports/` **tidak di-commit**. Isinya screenshot layar device asli (form
checkout, status bar, notifikasi) yang berisiko membocorkan data pribadi, dan PDF-nya puluhan MB.
Bagikan lewat artifact CI atau share manual.

## CI (GitHub Actions)

Android dan iOS berjalan sebagai **workflow terpisah** (job/stage independen, paralel), masing-masing
memakai config platform-nya sendiri, sesuai aturan CLAUDE.md.

### Android — `.github/workflows/android-tests.yml`

Strategi eksekusi disesuaikan dengan biaya — emulator lambat, jadi full regression tidak dijalankan
di setiap commit.

| Pemicu | Yang dijalankan |
|---|---|
| Pull request | `typecheck` + suite `smoke` di API 33 |
| Push ke `main` | Seluruh spec × matrix API 30 / 33 / 34 / 36 |
| Mingguan (Sabtu 01:00 WIB) | Collection report HTML + PDF |
| Manual (`workflow_dispatch`) | Pilih suite & API level sendiri, opsional collection report |

### iOS — `.github/workflows/ios-tests.yml`

Strategi PR/push SAMA seperti Android (smoke di PR, full di push main), tapi tanpa matrix versi —
runner macOS GitHub Actions hanya menyediakan SATU versi Xcode/simulator siap pakai per image, jadi
job mendeteksi RUNTIME iOS TERBARU yang tersedia di runner saat itu (bukan mematok versi seperti
`iPhone 17 Pro` / `26.5` di `.env` lokal), supaya CI tidak rusak tiap kali GitHub memperbarui image
Xcode-nya.

| Pemicu | Yang dijalankan |
|---|---|
| Pull request | `typecheck` + suite `smoke` |
| Push ke `main` | Seluruh spec |
| Mingguan (Sabtu 02:00 WIB) | Collection report iOS HTML + PDF |
| Manual (`workflow_dispatch`) | Pilih suite sendiri, opsional collection report |

App `.app` (build simulator, BUKAN `.ipa` device) di-download saat runtime dari GitHub Release
`saucelabs/my-demo-app-ios` (tidak pernah di-commit), sejajar dengan APK Android.

APK di-download saat runtime dari GitHub Release `saucelabs/my-demo-app-android` (tidak pernah
di-commit), driver Appium dipasang di runner dengan versi yang dikunci dari `package-lock.json`,
KVM diaktifkan, dan animasi emulator dimatikan. Laporan diunggah sebagai artifact (retensi 14 hari).

## Penjelasan Command (`package.json` scripts)

| Command | Fungsi |
|---|---|
| `npm test` / `npm run test:android` | Menjalankan seluruh test Android (`config/wdio.android.conf.ts`) |
| `npm run test:ios` | Menjalankan seluruh test iOS (`config/wdio.ios.conf.ts`) |
| `npm run test:ios:<suite>` | Menjalankan satu suite di iOS: `login`, `catalog`, `cart`, `checkout`, `menu`, `smoke` |
| `npm run test:<suite>` | Menjalankan satu suite saja: `login`, `catalog`, `cart`, `checkout`, `menu`, `smoke` |
| `npm run typecheck` | Cek tipe TypeScript tanpa emit (dipakai juga sebagai gate cepat di CI) |
| `npm run appium` | Menjalankan Appium server manual (opsional — run test sudah auto-start server) |
| `npm run report:generate` | Generate laporan HTML Allure dari `reports/allure-results` |
| `npm run report:open` | Membuka laporan Allure di browser |
| `npm run report:capture` | Android - menjalankan seluruh collection di semua device, merekam screenshot per langkah |
| `npm run report:capture:ios` | iOS - menjalankan seluruh collection di 1 simulator, merekam screenshot per langkah |
| `npm run report:build` | Menggabungkan hasil capture (Android dan/atau iOS, mana saja yang tersedia) jadi HTML + PDF per fitur, 2 laporan terpisah per platform |
| `npm run ci:summary` | Menulis ringkasan hasil run ke GitHub Actions job summary |
