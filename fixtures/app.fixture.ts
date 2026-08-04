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

// Dijalankan di hook `afterTest`: ambil screenshot hanya saat test gagal, untuk keperluan debugging
// (dilampirkan otomatis oleh Allure reporter).
export async function captureScreenshotOnFailure(passed: boolean): Promise<void> {
  if (!passed) {
    await browser.takeScreenshot();
  }
}
