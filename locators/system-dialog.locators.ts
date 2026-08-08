import { androidOnly, PlatformSelector } from './types';

// Locator untuk dialog milik SISTEM (bukan layar app), yang bisa muncul kapan saja di atas app dan
// memblokir seluruh interaksi. Dipisah dari locator fitur karena tidak terikat ke satu fitur pun.
//
// Kasus nyata yang menjadi alasan file ini ada: run CI 31244157054 job API 34 gagal 5 dari 6 spec
// file karena dialog ANR "Pixel Launcher isn't responding" menutupi layar sepanjang job. App-nya
// sendiri merender normal di belakang dialog, tapi dialog sistem memegang window aktif sehingga
// UiAutomator2 melaporkan "no such element" untuk SEMUA elemen app. Retry level spec tidak menolong
// karena dialognya tidak pernah hilang sendiri.
//
// Resource-id di bawah berasal dari AppErrorDialog milik framework Android (paket "android"), bukan
// dari app yang dites - id-nya sama untuk dialog ANR app manapun.
export const SystemDialogLocators = {
  // Tombol "Wait": menutup dialog TANPA mematikan proses yang ANR. Ini yang dipakai untuk dismissal.
  anrWaitButton: androidOnly('android=new UiSelector().resourceId("android:id/aerr_wait")'),
  // Tombol "Close app": mematikan proses yang ANR. Dipakai sebagai cadangan bila "Wait" tidak ada
  // (varian dialog berbeda antar versi Android menampilkan set tombol yang tidak selalu sama).
  anrCloseButton: androidOnly('android=new UiSelector().resourceId("android:id/aerr_close")'),
} satisfies Record<string, PlatformSelector>;
