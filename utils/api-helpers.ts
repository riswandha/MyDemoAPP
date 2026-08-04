// Helper untuk setup precondition data lewat API backend (bukan lewat UI), sesuai aturan CLAUDE.md.
//
// STATUS: sengaja kosong. "My Demo App - Sauce Labs" adalah demo app lokal tanpa backend API yang
// bisa dipakai untuk menyiapkan data test (akun & katalog sudah tetap/hardcoded di dalam app). Semua
// precondition ditangani lewat state app di device: akun demo bawaan, "Reset App State", dan
// pembersihan cart lewat UI (lihat CartPage.clearCart).
//
// Bila nanti ada endpoint backend (mis. untuk seeding akun/order), tambahkan fungsi seeding &
// cleanup-nya di file ini agar setup data tidak lewat UI.
export {};
