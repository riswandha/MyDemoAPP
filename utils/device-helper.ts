// Helper level-device/app (bukan interaksi elemen). Membungkus command Appium yang menyangkut siklus
// hidup aplikasi & status device, supaya page object/hook tidak memanggil `driver` mentah tersebar.

// Package aplikasi yang sedang di foreground saat ini (dipakai mis. untuk memverifikasi app berpindah
// ke browser eksternal pada skenario About).
export async function getCurrentPackage(): Promise<string> {
  return driver.getCurrentPackage();
}

// Bawa app ke kondisi awal (layar Catalog) tanpa menghapus data: terminate lalu activate ulang.
// autoLaunch bawaan Appium kadang tidak konsisten membawa app ke foreground di device fisik, dan
// terminate->activate memastikan navigasi selalu reset ke layar awal tiap sesi/spec (bukan lanjut
// dari layar terakhir sesi sebelumnya). Data app (login, cart) tetap dipertahankan karena noReset.
export async function restartAppToInitialState(appPackage: string): Promise<void> {
  await driver.terminateApp(appPackage);
  await driver.activateApp(appPackage);
}
