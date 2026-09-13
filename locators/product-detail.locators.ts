import { NOT_APPLICABLE, PlatformSelector } from './types';

// Locator untuk halaman Detail Produk (dipakai lintas Fitur Katalog/Cart/Checkout).
// Selector Android dari inspeksi UI di device.
// Selector iOS dari inspeksi page source di simulator iPhone 17 Pro / iOS 26.5 - bukan tebakan, setiap
// selector di bawah sudah diverifikasi benar-benar me-resolve ke elemen di device DAN interaksinya
// (tap rating, submit review, tap back) sudah dicoba end-to-end, bukan sekadar cek elemen ada.
//
// BEDA DARI KATALOG: halaman ini TIDAK kena limitasi harga statis seperti grid katalog (lihat catatan
// di locators/catalog.locators.ts) - accessibility label harga di sini ("Price") benar-benar berisi
// nilai dinamis ("$ 29.99" dst), diverifikasi untuk beberapa produk berbeda.
export const ProductDetailLocators = {
  // iOS: tidak ada resource-id/accessibility-id untuk judul (accessibility name-nya adalah teks nama
  // produk itu sendiri, berubah-ubah tergantung produk), jadi dipilih lewat POSISI struktural: judul
  // selalu StaticText PERTAMA di dalam wrapper konten ScrollView. Diverifikasi untuk 2 produk berbeda
  // (Black & Green) - hasilnya selalu tepat judul produk yang sedang dibuka, tidak pernah ambigu.
  titleText: {
    android: 'android=new UiSelector().resourceId("com.saucelabs.mydemoapp.android:id/productTV")',
    ios: '-ios class chain:**/XCUIElementTypeScrollView/XCUIElementTypeOther[1]/XCUIElementTypeStaticText[1]',
  },
  priceText: {
    android: 'android=new UiSelector().resourceId("com.saucelabs.mydemoapp.android:id/priceTV")',
    ios: '~Price',
  },
  plusButton: {
    android: '~Increase item quantity',
    ios: '~AddPlus Icons',
  },
  quantityText: {
    android: 'android=new UiSelector().resourceId("com.saucelabs.mydemoapp.android:id/noTV")',
    ios: '~Amount',
  },
  addToCartButton: {
    android: '~Tap to add product to cart',
    ios: '~AddToCart',
  },
  // iOS: cart diakses lewat tab bar bawah, sama seperti di CatalogLocators.cartIcon (tab bar-nya
  // sendiri global, tampil di semua layar utama termasuk Detail Produk).
  cartIcon: {
    android: '~View cart',
    ios: '~Cart-tab-item',
  },
  // Modal konfirmasi ("Thank you for submitting your review!") yang muncul setelah tap bintang rating.
  // Android: resource-id-nya "sortTV" - dipakai ulang oleh app dari komponen lain, bukan salah ketik.
  // iOS: modal ALERT sistem (XCUIElementTypeAlert) berisi StaticText dengan accessibility id PERSIS
  // sama dengan teks pesannya - dipakai langsung sebagai accessibility id, tidak perlu class chain.
  reviewConfirmMessage: {
    android: 'android=new UiSelector().resourceId("com.saucelabs.mydemoapp.android:id/sortTV")',
    ios: '~Thank you for submitting your review!',
  },
  // Android: tombol close (ikon X) pada modal custom.
  // iOS: tombol "OK" di dalam alert sistem - pola class chain sama persis dengan
  // LoginLocators.validationAlertOkButton (scoped ke dalam Alert supaya tidak bentrok kalau ada OK
  // button lain di layar).
  reviewConfirmCloseButton: {
    android: '~Closes review dialog',
    ios: "-ios class chain:**/XCUIElementTypeAlert/**/XCUIElementTypeButton[`name == 'OK'`]",
  },

  // HANYA iOS: tombol back di header Detail Produk. Android tidak butuh locator untuk ini - navigasi
  // kembali memakai driver.back() (tombol hardware/gesture sistem). Di iOS driver.back() TERBUKTI TIDAK
  // BEKERJA (dicoba langsung di device: layar tetap di Detail Produk setelah dipanggil), device iOS
  // tidak punya tombol back hardware, jadi satu-satunya cara adalah tap tombol back di UI. Elemennya
  // sendiri tidak punya accessibility name (kosong), jadi dipilih lewat posisi: tombol PERTAMA di
  // dalam layar Detail Produk. Dipakai oleh CatalogPage.returnFromProductDetail() yang bercabang per
  // platform pada SATU titik (bukan tersebar).
  backButton: {
    android: NOT_APPLICABLE,
    ios: '-ios class chain:**/XCUIElementTypeOther[`name == "ProductDetails-screen"`]/**/XCUIElementTypeButton[1]',
  },
} satisfies Record<string, PlatformSelector>;

// Bintang rating (1-5) di bawah harga produk, tap salah satu untuk submit rating.
// iOS: tidak ada id per-bintang (kelima tombol accessibility name-nya cuma "StarSelected Icons" atau
// "StarUnSelected Icons", tidak ada nomor urut) - dipilih lewat INDEX di dalam class chain (1-based,
// cocok dengan urutan tampil kiri-ke-kanan = bintang ke-1..5). Diverifikasi: tap index 4 benar-benar
// men-submit rating 4 dan memunculkan modal konfirmasi yang sama seperti di Android.
export function ratingStarLocator(star: 1 | 2 | 3 | 4 | 5): PlatformSelector {
  return {
    android: `android=new UiSelector().resourceId("com.saucelabs.mydemoapp.android:id/start${star}IV")`,
    ios: `-ios class chain:**/XCUIElementTypeButton[\`name == "StarSelected Icons" OR name == "StarUnSelected Icons"\`][${star}]`,
  };
}

// Swatch pilihan warna produk.
// Android: RecyclerView "colorRV", content-desc mengikuti pola "<Warna> color" (mis. "Black color").
// iOS: pola nama berbeda dan JANGGAL - accessibility name-nya selalu "<Warna>ColorUnSelected Icons"
// walaupun swatch itu SEDANG terpilih (status terpilih hanya tercermin di trait "Selected", bukan di
// name) - diverifikasi langsung di device, bukan salah baca. Warna yang tersedia di produk ini: Green,
// Blue, Black, Gray.
export function colorSwatchLocator(colorName: string): PlatformSelector {
  return {
    android: `~${colorName} color`,
    ios: `~${colorName}ColorUnSelected Icons`,
  };
}
