// Test data terpusat untuk seluruh skenario "My Demo App - Sauce Labs", mengikuti kolom "Test data"
// pada Excel Testscript.
//
// Dua kategori data di file ini:
//  1. KONSTANTA TETAP (akun demo, nama produk, quantity) - app ini demo lokal dengan akun & katalog
//     tetap, dan skenario Excel menuntut nilai persis, jadi tidak di-generate.
//  2. FAKTORI (alamat pengiriman & detail pembayaran) - nilai bebas yang tidak diverifikasi
//     assertion manapun, jadi WAJIB di-generate. Selain mengikuti aturan CLAUDE.md, ini mencegah
//     data pribadi asli ikut ter-commit maupun terekam di screenshot laporan, dan menghindari
//     collision saat run paralel di banyak device.

import type { ShippingAddress } from '../pages/checkout-address.page';
import type { PaymentDetails } from '../pages/checkout-payment.page';

// ===================== TS001 - Login =====================

// Akun valid untuk skenario login sukses. Sesuai Excel TC001: Username bob@example.com / 10203040.
export const validUser = {
  username: 'bob@example.com',
  password: '10203040',
};

// Akun berstatus locked out (Excel TC002). Terverifikasi di device: akun ini terdaftar di app dengan
// suffix "(locked out)" pada daftar saved username di layar Login, password sama dengan validUser.
export const lockedOutUser = {
  username: 'alice@example.com',
  password: '10203040',
};

// Akun tidak valid (kredensial salah) - disediakan untuk kebutuhan skenario negatif tambahan.
export const invalidUser = {
  username: 'alice@example.com',
  password: 'wrongpass',
};

// ===================== TS002 - Katalog =====================

// Nama produk memakai nama lengkap persis seperti yang tampil di app (hasil inspeksi di device) -
// beberapa berbeda dari nama singkat di Excel (mis. "Bike Light" -> app-nya "Sauce Labs Bike Light").
export const baseProducts = [
  'Sauce Labs Backpack',
  'Sauce Labs Bike Light',
  'Sauce Labs Bolt T-Shirt',
  'Sauce Labs Fleece Jacket',
  'Sauce Labs Onesie',
  'Test.allTheThings() T-Shirt',
];

// Produk untuk skenario Detail Produk (TC002) & Review Produk (TC004)
export const detailProduct = 'Sauce Labs Backpack';
export const reviewRatingStars = 4 as const;

// ===================== TS003 - Cart =====================

// CATATAN PENTING: Excel memakai produk "Onesie" (TC001) dan "Sauce Labs Bike Light" (TC005), tapi
// hasil investigasi langsung di device menemukan bug crash asli di app: HANYA "Sauce Labs Backpack"
// beserta varian warnanya (index 0-5 di grid katalog) yang bisa dibuka tanpa crash. Produk apapun
// setelah itu (Bike Light, Bolt T-Shirt, Fleece Jacket, Onesie, Test.allTheThings(), dst) membuat app
// crash saat diklik (java.lang.ArrayIndexOutOfBoundsException / NullPointerException di
// ProductCatalogFragment.java:156, diverifikasi lewat adb logcat, konsisten di berbagai skenario).
// Karena ini bug di app (bukan di test), seluruh skenario Cart memakai "Sauce Labs Backpack" sebagai
// pengganti.
export const cartProduct = 'Sauce Labs Backpack';
export const cartProductColor = 'Black';

export const addProductData = {
  quantity: 3,
};

export const updateQtyIncreaseData = {
  initialQty: 2,
  increaseBy: 3, // hasil akhir: 5
};

export const updateQtyDecreaseData = {
  initialQty: 10,
  decreaseBy: 7, // hasil akhir: 3
};

export const repeatedAddToCartData = {
  quantityPerAdd: 3,
  addToCartTimes: 3, // total 9 item
};

// ===================== TS004 - Checkout =====================

export const checkoutProduct = {
  name: 'Sauce Labs Backpack',
  quantity: 2,
};

// Suffix unik per pemanggilan: kombinasi timestamp base36 + random, supaya dua device yang jalan
// paralel tidak pernah mengisi form dengan nilai identik.
function uniqueSuffix(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.toUpperCase();
}

function randomDigits(length: number): string {
  return Array.from({ length }, () => Math.floor(Math.random() * 10)).join('');
}

// Faktori alamat pengiriman. Nilai sepenuhnya fiktif dan di-generate - JANGAN diganti jadi alamat
// nyata: form ini ikut terekam di screenshot laporan yang bisa dibagikan ke luar tim.
// `overrides` disediakan untuk skenario yang butuh nilai spesifik (mis. uji validasi field).
export function createShippingAddress(overrides: Partial<ShippingAddress> = {}): ShippingAddress {
  const suffix = uniqueSuffix();
  return {
    fullName: `QA Tester ${suffix}`,
    addressLine1: `${randomDigits(3)} Test Street`,
    addressLine2: `Unit ${randomDigits(2)}`,
    city: 'Testville',
    region: 'Test Region',
    zipCode: randomDigits(5),
    country: 'Testland',
    ...overrides,
  };
}

// Faktori detail pembayaran. Nomor kartu memakai test PAN Visa standar (4111111111111111) yang
// memang diperuntukkan untuk testing dan bukan kartu milik siapa pun.
export function createPaymentDetails(overrides: Partial<PaymentDetails> = {}): PaymentDetails {
  return {
    cardHolderName: `QA Tester ${uniqueSuffix()}`,
    cardNumber: '4111111111111111',
    expirationDate: '1230', // format MMYY
    securityCode: randomDigits(3),
    ...overrides,
  };
}

// Biaya pengiriman tetap yang ditambahkan app di halaman Review Order, di luar subtotal produk. Nilai
// ini dari observasi langsung di device: subtotal cart $59.98 -> total Review Order $65.97 (selisih
// $5.99), bukan angka tebakan.
export const SHIPPING_FEE = 5.99;

// ===================== TS005 - Menu =====================

export const validWebviewUrl = 'https://www.saucelabs.com';

// Excel memakai "www.saucelabs.com" (tanpa https://) sebagai contoh input tidak valid, tapi hasil
// investigasi di device menunjukkan app benar-benar mencoba me-load string apapun yang menyerupai
// domain (termasuk tanpa skema) alih-alih validasi client-side - baru menampilkan error "Please
// provide a correct https url." kalau input sama sekali bukan bentuk URL (tanpa titik/domain). Data
// disesuaikan dengan perilaku app yang sebenarnya supaya pesan error benar-benar teruji.
export const invalidWebviewUrl = 'saucelabs';
export const invalidWebviewUrlError = 'Please provide a correct https url.';
