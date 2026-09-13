import path from 'path';
import { sharedConfig } from './wdio.shared.conf';
import { env } from '../utils/env';

// Config khusus iOS: meng-extend config bersama (wdio.shared.conf.ts) dan menambahkan capabilities
// XCUITest. Capabilities environment-specific diambil dari env, tidak di-hardcode, agar mudah diganti
// untuk device farm/CI.
//
// CATATAN DRIVER: XCUITest seri 12.x mensyaratkan Appium 3, sedangkan project ini memakai Appium 2
// (uiautomator2 untuk Android juga masih seri Appium 2). Karena itu driver yang dipakai adalah
// appium-xcuitest-driver 9.x - versi tertinggi yang peer-nya masih `appium ^2.5.4`. Driver ini WAJIB
// terpasang di APPIUM_HOME project (folder .appium/), bukan hanya di APPIUM_HOME global mesin:
//   APPIUM_HOME="$PWD/.appium" npx appium driver install xcuitest@9.10.5
export const config: WebdriverIO.Config = {
  ...sharedConfig,

  // Override HANYA di iOS: connectionRetryTimeout bawaan (wdio.shared.conf.ts, 120000ms) adalah
  // timeout SISI KLIEN untuk satu request WebDriver - jauh lebih pendek dari wdaLaunchTimeout
  // (600000ms) yang jadi budget SISI SERVER Appium untuk build+launch WDA di simulator baru.
  // Diverifikasi lewat log CI (PR #10, job 103687955966): request POST /session gagal dengan
  // "UND_ERR_HEADERS_TIMEOUT" - klien menyerah duluan sebelum Appium sendiri sempat selesai
  // (bukan simulator gagal boot, beda dari kegagalan run sebelumnya). Disamakan dengan
  // wdaLaunchTimeout supaya klien menunggu setidaknya selama server memang dikonfigurasi menunggu.
  // connectionRetryCount diturunkan ke 1 (dari default 3 di shared config) supaya kegagalan
  // genuinely tidak jelas tidak berujung menunggu sampai 3x600s=30 menit - Android tidak terdampak
  // karena override ini hanya berlaku di config ini.
  connectionRetryTimeout: 600000,
  connectionRetryCount: 1,

  capabilities: [
    {
      platformName: 'iOS',
      'appium:automationName': 'XCUITest',
      'appium:deviceName': env.ios.deviceName,
      'appium:platformVersion': env.ios.platformVersion,
      ...(env.ios.udid ? { 'appium:udid': env.ios.udid } : {}),
      // 'appium:app' hanya dikirim bila APP_PATH diisi (untuk install .app/.ipa baru). Bila app sudah
      // terpasang di device/simulator, biarkan kosong -> Appium membuka app lewat bundleId saja.
      ...(env.appPath ? { 'appium:app': path.resolve(process.cwd(), env.appPath) } : {}),
      'appium:bundleId': env.ios.bundleId,
      'appium:noReset': true, // jangan hapus data app tiap sesi (sejajar dengan config Android)
      'appium:fullReset': false,
      'appium:newCommandTimeout': 240,

      // SENGAJA TIDAK memakai autoAcceptAlerts. Berbeda dari Android yang menampilkan error validasi
      // sebagai TextView inline, app iOS menampilkannya sebagai MODAL ALERT ("Validation Error!").
      // autoAcceptAlerts akan meng-accept alert itu sebelum test sempat membaca pesannya, sehingga
      // seluruh skenario validasi login gagal tanpa sebab yang jelas. Alert ditutup eksplisit lewat
      // page object (LoginLocators.validationAlertOkButton) supaya pesannya bisa diverifikasi dulu.

      // Build WDA butuh waktu lama pada run pertama di mesin/simulator baru (kompilasi Xcode).
      'appium:wdaLaunchTimeout': 600000,
      'appium:wdaConnectionTimeout': 600000,

      // Default XCUITest driver cuma 120s - tidak cukup untuk simulator yang benar-benar baru
      // pertama kali di-boot di runner CI (macOS runner GitHub Actions selalu mulai dari simulator
      // yang belum pernah menyala sama sekali, beda dari mesin lokal yang simulatornya sudah pernah
      // boot sebelumnya). Simulator baru menjalankan proses "Data Migration" satu kali (MCProfile
      // migrator, CoreLocationMigrator, dst) yang terbukti bisa melewati 120s - diverifikasi lewat
      // log run CI (PR #10, job 103686062705): "The simulator ... has failed to finish booting after
      // 120s" persis di tengah proses Data Migration tersebut, gagal walau simulator sebenarnya masih
      // dalam proses boot normal (bukan hang).
      'appium:simulatorStartupTimeout': 300000,

      // WAJIB. Pengisian form di iOS dilakukan sebagai input keyboard FISIK, bukan lewat keyboard
      // software - karena keyboard software menutupi tombol submit yang dipatok di bawah layar dan
      // app ini tidak bisa dipaksa menutupnya dengan cara apa pun dari sisi Appium (daftar lengkap
      // cara yang sudah dicoba ada di utils/gesture-helper.ts). Tanpa capability ini, keyboard fisik
      // simulator bisa dalam keadaan tidak tersambung dan pengetikan gagal.
      //
      // Capability ini diterapkan Appium saat IA SENDIRI yang mem-boot simulator. Kalau simulator
      // sudah terlanjur berjalan, Appium memakainya apa adanya - jadi untuk run lokal, matikan dulu
      // simulatornya (`xcrun simctl shutdown all`) dan biarkan Appium yang menyalakan. Di CI hal ini
      // terjadi dengan sendirinya karena simulator selalu mulai dari keadaan mati.
      'appium:connectHardwareKeyboard': true,
    },
  ],
};
