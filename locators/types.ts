// Tipe & helper bersama untuk seluruh file locator.
//
// Sesuai aturan CLAUDE.md: satu flow bisnis harus jalan di dua platform (Android & iOS) dengan
// locator native yang berbeda, jadi setiap locator didefinisikan sebagai pasangan { android, ios }.
// Page object memilih salah satu lewat helper platformLocator() di BasePage - TIDAK menulis if/else
// platform berulang di banyak tempat.

export interface PlatformSelector {
  android: string;
  ios: string;
}

// Penanda locator iOS yang BELUM diinspeksi di device iOS nyata. Sesuai aturan "selector wajib dari
// inspeksi device nyata, bukan tebakan", slot iOS sengaja dikosongkan (bukan ditebak) sampai app iOS
// tersedia untuk di-inspect. platformLocator() akan melempar error yang jelas kalau penanda ini
// terpakai saat run di iOS, sehingga tidak ada kegagalan senyap.
export const TODO_IOS = 'TODO(ios): locator belum diinspeksi di device iOS';

// Penanda elemen yang MEMANG TIDAK ADA di salah satu platform - beda maknanya dengan TODO_IOS.
// TODO_IOS = "belum diinspeksi" (pekerjaan yang belum selesai); NOT_APPLICABLE = "sudah diinspeksi,
// dan elemen ini terbukti tidak ada di platform tsb". Contoh nyata: dialog konfirmasi logout ada di
// Android tapi tidak ada sama sekali di iOS (iOS langsung logout sekali tap), dan sebaliknya tombol
// OK pada alert validasi hanya ada di iOS. Dibedakan supaya error yang muncul menunjuk ke akar
// masalah yang benar: "lengkapi locator" vs "jangan panggil elemen ini di platform ini".
export const NOT_APPLICABLE = 'N/A: elemen ini tidak ada di platform tersebut';

// Gula sintaks untuk locator yang saat ini hanya punya versi Android (mayoritas, karena project ini
// Android-first). Slot iOS otomatis diisi penanda TODO_IOS supaya strukturnya sudah siap iOS.
export function androidOnly(android: string): PlatformSelector {
  return { android, ios: TODO_IOS };
}

// SATU-SATUNYA tempat percabangan platform di seluruh project (aturan CLAUDE.md: jangan tulis
// if/else platform berulang di banyak file). Dipakai oleh BasePage.platformLocator() untuk test biasa
// DAN oleh scripts/lib/report-client.ts untuk script laporan yang jalan di luar runner WebdriverIO -
// keduanya memakai resolusi yang sama persis, jadi tidak ada dua versi aturan platform yang bisa
// menyimpang.
//
// Default ke Android (project ini Android-first). Bila run di iOS tapi locator iOS belum diinspeksi
// di device nyata, lempar error jelas alih-alih gagal senyap dengan selector tak valid.
export function resolvePlatformSelector(selector: PlatformSelector, isIOS: boolean): string {
  const resolved = isIOS ? selector.ios : selector.android;

  // Elemen memang tidak ada di platform ini - yang salah pemanggilnya, bukan locator-nya. Page object
  // harus bercabang lebih dulu (mis. konfirmasi logout hanya dijalankan di Android).
  if (resolved.startsWith('N/A:')) {
    throw new Error(
      `Elemen ini tidak ada di ${isIOS ? 'iOS' : 'Android'} (${resolved}). Alur pemanggilnya harus dibedakan per platform, bukan locator-nya yang dilengkapi.`,
    );
  }

  if (isIOS && resolved.startsWith('TODO(ios)')) {
    throw new Error(
      `Locator iOS belum tersedia (${resolved}). Inspeksi elemen di device iOS lalu lengkapi slot ios di file locators/.`,
    );
  }

  return resolved;
}
