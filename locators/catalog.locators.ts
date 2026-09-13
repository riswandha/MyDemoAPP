import { PlatformSelector } from './types';

export type SortOption = 'nameAsc' | 'nameDesc' | 'priceAsc' | 'priceDesc';

// Locator untuk Fitur Katalog (TS002).
// Selector Android dari inspeksi UI di device.
// Selector iOS dari inspeksi page source di simulator iPhone 17 Pro / iOS 26.5 - bukan tebakan, setiap
// selector di bawah sudah diverifikasi benar-benar me-resolve ke elemen di device.
//
// CATATAN LIMITASI APP iOS (bukan bug locator - sudah diuji ulang berkali-kali sebelum disimpulkan):
// StaticText harga tiap kartu produk di grid katalog punya accessibility label/value STATIS
// "Product Price" di SEMUA kartu, tidak pernah berisi angka harga sesungguhnya (beda dari halaman
// Detail Produk yang labelnya benar berisi "$ 29.99" dst). Diverifikasi dengan polling getText() tiap
// 400ms selama 8 detik setelah app baru dibuka - hasilnya selalu string statis yang sama, bukan race
// condition loading data. priceTexts di bawah tetap didefinisikan (perlu untuk menghitung jumlah kartu
// yang match dengan titleTexts di readVisibleProducts()), tapi nilai TEKS-nya tidak bisa dipakai untuk
// verifikasi harga di iOS - lihat catatan di tests/catalog/catalog.spec.ts.
export const CatalogLocators = {
  // iOS: cart diakses lewat tab bar bawah ("Cart-tab-item"), bukan icon di header seperti Android.
  cartIcon: {
    android: '~View cart',
    ios: '~Cart-tab-item',
  },
  // Icon sort di header catalog (buka menu pilihan urutan produk).
  // iOS: accessibility name-nya generik "Button" (bukan salah ketik - app tidak memberi label yang
  // deskriptif) - aman dipakai karena ini SATU-SATUNYA elemen dengan name persis "Button" di layar ini
  // (diverifikasi lewat full page source dump, bukan asumsi).
  sortIcon: {
    android: '~Shows current sorting order and displays available sorting options',
    ios: '-ios predicate string:type == "XCUIElementTypeButton" AND name == "Button"',
  },
  // Nama produk (title) tiap kartu di grid catalog
  titleTexts: {
    android: 'android=new UiSelector().resourceId("com.saucelabs.mydemoapp.android:id/titleTV")',
    ios: '~Product Name',
  },
  // Harga produk tiap kartu di grid catalog. LIMITASI iOS: lihat catatan di atas - teksnya selalu
  // literal "Product Price", bukan angka.
  priceTexts: {
    android: 'android=new UiSelector().resourceId("com.saucelabs.mydemoapp.android:id/priceTV")',
    ios: '~Product Price',
  },
} satisfies Record<string, PlatformSelector>;

// ===== Locator dinamis (dibentuk dari argumen) =====

// Kartu produk di katalog: TextView judul (titleTV) sendiri tidak clickable, yang clickable adalah
// ImageView (productIV) di sampingnya. XPath ini cari ImageView yang punya sibling TextView dengan
// teks PERSIS sama dengan nama produk, supaya "Sauce Labs Backpack" tidak ikut men-select varian
// warna seperti "Sauce Labs Backpack (green)".
//
// iOS: sama seperti Android, harus XPath - struktur elemennya sepadan (satu container "ProductItem"
// berisi Image gambar produk bersebelahan dengan StaticText nama produk), dan class chain XCUITest
// TIDAK BISA mengekspresikan "cari container yang px descendant-nya cocok" (predicate `[...]` di class
// chain tidak mendukung operator descendant search `**` di dalamnya - sudah dicoba dan terbukti tidak
// pernah resolve ke elemen manapun). XPath dengan predicate descendant `.//` adalah satu-satunya cara
// yang benar-benar reach elemen ini, sesuai pengecualian XPath di aturan CLAUDE.md. Diverifikasi di
// device: tap pada hasil locator ini untuk produk index ke-2 (Green) benar-benar membuka Detail Produk
// "Sauce Labs Backpack - Green", bukan produk lain.
export function productImageLocator(productName: string): PlatformSelector {
  return {
    android: `//android.widget.ImageView[following-sibling::android.widget.TextView[@text="${productName}"]]`,
    ios: `//XCUIElementTypeOther[@name="ProductItem"][.//XCUIElementTypeStaticText[@value="${productName}"]]/XCUIElementTypeImage`,
  };
}

// Selector tiap opsi di menu Sort.
// Android: content-desc diambil dari hasil inspeksi dialog sort di device.
// iOS: accessibility id sama persis dengan label yang tampil ("Name - Ascending" dst), diverifikasi
// lewat page source dump setelah tap sortIcon.
export function sortOptionLocator(option: SortOption): PlatformSelector {
  const androidSelectors: Record<SortOption, string> = {
    nameAsc: '~Ascending order by name',
    nameDesc: '~Descending order by name',
    priceAsc: '~Ascending order by price',
    priceDesc: '~Descending order by price',
  };
  const iosSelectors: Record<SortOption, string> = {
    nameAsc: '~Name - Ascending',
    nameDesc: '~Name - Descending',
    priceAsc: '~Price - Ascending',
    priceDesc: '~Price - Descending',
  };
  return { android: androidSelectors[option], ios: iosSelectors[option] };
}
