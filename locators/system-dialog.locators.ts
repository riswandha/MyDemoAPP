import { NOT_APPLICABLE, PlatformSelector } from './types';

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
//
// iOS = NOT_APPLICABLE (bukan TODO): ANR adalah mekanisme Android; iOS tidak punya dialog setara yang
// perlu ditutup. Pemanggilnya (resetAppBeforeSession) sudah melewati pengecekan ini saat run di iOS.
export const SystemDialogLocators = {
  // Tombol "Wait": menutup dialog TANPA mematikan proses yang ANR. Ini yang dipakai untuk dismissal.
  anrWaitButton: {
    android: 'android=new UiSelector().resourceId("android:id/aerr_wait")',
    ios: NOT_APPLICABLE,
  },
  // Tombol "Close app": mematikan proses yang ANR. Dipakai sebagai cadangan bila "Wait" tidak ada
  // (varian dialog berbeda antar versi Android menampilkan set tombol yang tidak selalu sama).
  anrCloseButton: {
    android: 'android=new UiSelector().resourceId("android:id/aerr_close")',
    ios: NOT_APPLICABLE,
  },
} satisfies Record<string, PlatformSelector>;

// Dialog sistem iOS "Save Password?" (tombol "Not Now" / "Save"), muncul setelah form berisi field
// password berhasil di-submit.
//
// Dialog ini dikenali lewat TEKS, bukan selector - dan itu bukan pilihan gaya. Dialog ini milik
// springboard, bukan milik app yang dites, sehingga ia sama sekali TIDAK muncul di page source app;
// yang terlihat hanya efeknya: seluruh elemen app mendadak terbaca visible=false. Satu-satunya jalur
// yang bisa menjangkaunya adalah API alert standar (getAlertText / mobile: alert), dan yang tersedia
// di sana hanya teksnya.
//
// Dipakai untuk MEMBEDAKAN dialog sistem ini dari alert milik app sendiri ("Validation Error!") yang
// justru harus dibaca test, bukan ditutup diam-diam. Pencocokan sengaja hanya pada potongan judul,
// supaya tidak ikut rapuh terhadap kalimat penjelasan di bawahnya.
export const IOS_SAVE_PASSWORD_DIALOG_TITLE = 'Save Password?';
