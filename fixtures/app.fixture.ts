import { restartAppToInitialState } from '../utils/device-helper';
import { env } from '../utils/env';

// Fixture/helper hook WebdriverIO yang dipakai config di lifecycle test, dipisah dari file config
// supaya config tetap ramping dan logika setup/teardown bisa dipakai ulang lintas platform
// (wdio.android.conf.ts & wdio.ios.conf.ts sama-sama memanggil helper ini).

// Dijalankan di hook `before` tiap sesi: pastikan app mulai dari layar awal (Catalog). Lihat alasan
// terminate->activate di restartAppToInitialState().
export async function resetAppBeforeSession(): Promise<void> {
  await restartAppToInitialState(env.appPackage);
}

// Dijalankan di hook `afterTest`: ambil screenshot hanya saat test gagal, untuk keperluan debugging.
//
// Screenshot dilampirkan EKSPLISIT ke Allure lewat addAttachment. Sebelumnya hanya memanggil
// browser.takeScreenshot() dan mengandalkan disableWebdriverScreenshotsReporting: false untuk
// melampirkannya otomatis - ternyata tidak terjadi: hasil run CI memuat 0 attachment pada test yang
// gagal, sehingga kegagalan tidak bisa didiagnosis dari report sama sekali.
export async function captureScreenshotOnFailure(passed: boolean): Promise<void> {
  if (passed) {
    return;
  }
  const screenshot = await browser.takeScreenshot();
  // '@wdio/allure-reporter' dipublikasikan sebagai ESM murni; di-import dinamis supaya bisa dipakai
  // dari modul CommonJS ini tanpa mengubah "module" project secara keseluruhan - pola yang sama
  // dipakai scripts/generate-report.ts untuk 'webdriverio'.
  const { default: allureReporter } = await import('@wdio/allure-reporter');
  allureReporter.addAttachment('Screenshot kegagalan', Buffer.from(screenshot, 'base64'), 'image/png');
}
