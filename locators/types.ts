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

// Gula sintaks untuk locator yang saat ini hanya punya versi Android (mayoritas, karena project ini
// Android-first). Slot iOS otomatis diisi penanda TODO_IOS supaya strukturnya sudah siap iOS.
export function androidOnly(android: string): PlatformSelector {
  return { android, ios: TODO_IOS };
}
