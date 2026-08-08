// Helper level-device/app (bukan interaksi elemen). Membungkus command Appium yang menyangkut siklus
// hidup aplikasi & status device, supaya page object/hook tidak memanggil `driver` mentah tersebar.

// Package aplikasi yang sedang di foreground saat ini (dipakai mis. untuk memverifikasi app berpindah
// ke browser eksternal pada skenario About).
export async function getCurrentPackage(): Promise<string> {
  return driver.getCurrentPackage();
}

// Tunggu sampai package tertentu benar-benar berada di foreground. Berbasis kondisi (polling status
// device), BUKAN delay tetap: cold start app berbeda-beda per device/API level, jadi angka pause
// tetap selalu salah - kependekan di device lambat, buang waktu di device cepat.
// Melempar error dengan pesan jelas bila melewati timeout, menyertakan package yang justru aktif
// saat itu supaya kegagalan langsung bisa didiagnosis dari pesannya (mis. app crash ke launcher).
export async function waitForAppInForeground(appPackage: string, timeout = 30000): Promise<void> {
  // Pesan error dirakit di catch, bukan lewat opsi `timeoutMsg`: string timeoutMsg dievaluasi saat
  // waitUntil DIPANGGIL, jadi nilai package terakhir belum terisi kalau ditaruh di sana.
  let lastSeenPackage = '';
  try {
    await driver.waitUntil(
      async () => {
        lastSeenPackage = await getCurrentPackage();
        return lastSeenPackage === appPackage;
      },
      { timeout, interval: 500 },
    );
  } catch (err) {
    throw new Error(
      `App "${appPackage}" tidak berada di foreground dalam ${timeout} ms ` +
        `(package aktif terakhir: "${lastSeenPackage}"). Penyebab: ${(err as Error).message}`,
    );
  }
}

// Bawa app ke kondisi awal (layar Catalog) tanpa menghapus data: terminate lalu activate ulang.
// autoLaunch bawaan Appium kadang tidak konsisten membawa app ke foreground di device fisik, dan
// terminate->activate memastikan navigasi selalu reset ke layar awal tiap sesi/spec (bukan lanjut
// dari layar terakhir sesi sebelumnya). Data app (login, cart) tetap dipertahankan karena noReset.
export async function restartAppToInitialState(appPackage: string): Promise<void> {
  await driver.terminateApp(appPackage);
  await driver.activateApp(appPackage);
}
