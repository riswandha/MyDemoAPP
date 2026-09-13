// Helper level-device/app (bukan interaksi elemen). Membungkus command Appium yang menyangkut siklus
// hidup aplikasi & status device, supaya page object/hook tidak memanggil `driver` mentah tersebar.
//
// File ini juga memegang SATU-SATUNYA percabangan platform untuk urusan IDENTITAS & SIKLUS HIDUP app
// (lihat appId()). Percabangan platform di project ini total ada tiga, dibagi menurut jenis
// perbedaannya - semuanya terpusat, tidak tersebar:
//   - beda SELECTOR elemen      -> resolvePlatformSelector() di locators/types.ts
//   - beda COMMAND gesture      -> gestures() di utils/gesture-helper.ts
//   - beda IDENTITAS/lifecycle  -> appId() di file ini
//   - beda TEKS/data harapan    -> platformText() di utils/test-data.ts
// Di luar itu ada satu pengecualian yang disengaja: fitur Login punya ALUR langkah yang berbeda antar
// platform (bukan sekadar elemen/command yang berbeda), dan itu ditangani lewat kontrak LoginFlow di
// pages/login.page.ts - juga dengan satu titik percabangan, bukan if/else yang tersebar.

import { env } from './env';

// Identitas app yang dipakai Appium untuk terminate/activate. Android memakai package name
// (com.saucelabs.mydemoapp.android), iOS memakai bundle id (com.saucelabs.mydemo.app.ios) - dua
// skema penamaan yang berbeda, jadi tidak bisa dipakai satu nilai untuk keduanya.
export function appId(): string {
  return driver.isIOS ? env.ios.bundleId : env.appPackage;
}

// Appium APP_STATE: 4 = running in foreground. queryAppState() didukung UiAutomator2 MAUPUN XCUITest
// (menerima package name atau bundle id sebagai `id`), jadi ini pengecekan foreground yang lintas
// platform - dipakai di waitForAppInForeground() DAN di skenario About/buka browser eksternal
// (menu.page.ts) untuk mendeteksi app berpindah ke background di Android. `driver.getCurrentPackage()`
// (command khusus UiAutomator2, tidak ada padanannya di XCUITest) sempat dipakai untuk kebutuhan yang
// sama sebelum queryAppState() ditemukan sebagai pengganti cross-platform-nya.
const APP_STATE_RUNNING_IN_FOREGROUND = 4;

export async function isAppInForeground(id: string): Promise<boolean> {
  const state = await driver.queryAppState(id);
  return state === APP_STATE_RUNNING_IN_FOREGROUND;
}

// Tunggu sampai app dengan identitas (package/bundle id) tertentu benar-benar berada di foreground.
// Berbasis kondisi (polling status device), BUKAN delay tetap: cold start app berbeda-beda per
// device/API level, jadi angka pause tetap selalu salah - kependekan di device lambat, buang waktu
// di device cepat.
export async function waitForAppInForeground(id: string, timeout = 30000): Promise<void> {
  try {
    await driver.waitUntil(async () => isAppInForeground(id), { timeout, interval: 500 });
  } catch (err) {
    throw new Error(
      `App "${id}" tidak berada di foreground dalam ${timeout} ms. Penyebab: ${(err as Error).message}`,
    );
  }
}

// Bawa app ke kondisi awal (layar Catalog) tanpa menghapus data: terminate lalu activate ulang.
// autoLaunch bawaan Appium kadang tidak konsisten membawa app ke foreground di device fisik, dan
// terminate->activate memastikan navigasi selalu reset ke layar awal tiap sesi/spec (bukan lanjut
// dari layar terakhir sesi sebelumnya). Data app (login, cart) tetap dipertahankan karena noReset.
export async function restartAppToInitialState(): Promise<void> {
  const id = appId();
  await driver.terminateApp(id);
  await driver.activateApp(id);
}
