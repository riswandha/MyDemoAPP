import { NOT_APPLICABLE, PlatformSelector } from './types';

// Locator untuk Fitur Checkout (TS004), dikelompokkan per langkah checkout.
// Selector Android dari inspeksi UI di device. Catatan: tombol "To Payment", "Review Order", dan
// "Place Order" sama-sama memakai resource-id "paymentBtn" di app (tombol lanjut per halaman), bukan
// salah ketik.
// Selector iOS dari inspeksi page source di simulator iPhone 17 Pro / iOS 26.5 - bukan tebakan, setiap
// selector sudah diverifikasi end-to-end sampai halaman Checkout Complete benar-benar tampil.
//
// SEMUA text field Address & Payment TIDAK punya resource-id/accessibility-id di iOS (accessibility
// name-nya kosong) - dipilih lewat POSISI di dalam class chain (urutan tampil atas-ke-bawah,
// kiri-ke-kanan untuk baris dua kolom), diverifikasi dengan mengisi tiap field lalu screenshot untuk
// memastikan nilainya masuk ke field yang benar.
export const CheckoutAddressLocators = {
  fullNameInput: {
    android: 'android=new UiSelector().resourceId("com.saucelabs.mydemoapp.android:id/fullNameET")',
    ios: '-ios class chain:**/XCUIElementTypeTextField[1]',
  },
  addressLine1Input: {
    android: 'android=new UiSelector().resourceId("com.saucelabs.mydemoapp.android:id/address1ET")',
    ios: '-ios class chain:**/XCUIElementTypeTextField[2]',
  },
  addressLine2Input: {
    android: 'android=new UiSelector().resourceId("com.saucelabs.mydemoapp.android:id/address2ET")',
    ios: '-ios class chain:**/XCUIElementTypeTextField[3]',
  },
  // iOS: urutan tampil baris dua kolom adalah City lalu Zip Code (kolom kiri, atas-bawah) BARU
  // State/Region lalu Country (kolom kanan) - beda dari urutan field interface ShippingAddress.
  cityInput: {
    android: 'android=new UiSelector().resourceId("com.saucelabs.mydemoapp.android:id/cityET")',
    ios: '-ios class chain:**/XCUIElementTypeTextField[4]',
  },
  zipCodeInput: {
    android: 'android=new UiSelector().resourceId("com.saucelabs.mydemoapp.android:id/zipET")',
    ios: '-ios class chain:**/XCUIElementTypeTextField[5]',
  },
  regionInput: {
    android: 'android=new UiSelector().resourceId("com.saucelabs.mydemoapp.android:id/stateET")',
    ios: '-ios class chain:**/XCUIElementTypeTextField[6]',
  },
  countryInput: {
    android: 'android=new UiSelector().resourceId("com.saucelabs.mydemoapp.android:id/countryET")',
    ios: '-ios class chain:**/XCUIElementTypeTextField[7]',
  },
  toPaymentButton: {
    android: 'android=new UiSelector().resourceId("com.saucelabs.mydemoapp.android:id/paymentBtn")',
    ios: '~To Payment',
  },
  // HANYA iOS. Judul layar ("Checkout") dipakai sebagai target tap netral untuk menutup keyboard -
  // lihat catatan lengkap di BasePage.clickCheckoutCta(). Android tidak pernah memanggil ini.
  formTitle: {
    android: NOT_APPLICABLE,
    ios: '~Checkout',
  },
} satisfies Record<string, PlatformSelector>;

// Step 2 - Form metode pembayaran
export const CheckoutPaymentLocators = {
  cardHolderNameInput: {
    android: 'android=new UiSelector().resourceId("com.saucelabs.mydemoapp.android:id/nameET")',
    ios: '-ios class chain:**/XCUIElementTypeTextField[1]',
  },
  cardNumberInput: {
    android: 'android=new UiSelector().resourceId("com.saucelabs.mydemoapp.android:id/cardNumberET")',
    ios: '-ios class chain:**/XCUIElementTypeTextField[2]',
  },
  expirationDateInput: {
    android: 'android=new UiSelector().resourceId("com.saucelabs.mydemoapp.android:id/expirationDateET")',
    ios: '-ios class chain:**/XCUIElementTypeTextField[3]',
  },
  securityCodeInput: {
    android: 'android=new UiSelector().resourceId("com.saucelabs.mydemoapp.android:id/securityCodeET")',
    ios: '-ios class chain:**/XCUIElementTypeTextField[4]',
  },
  reviewOrderButton: {
    android: 'android=new UiSelector().resourceId("com.saucelabs.mydemoapp.android:id/paymentBtn")',
    ios: '~Review Order',
  },
  // HANYA iOS - sama seperti CheckoutAddressLocators.formTitle.
  formTitle: {
    android: NOT_APPLICABLE,
    ios: '~Checkout',
  },
} satisfies Record<string, PlatformSelector>;

// Step 3 - Review Order (ringkasan sebelum Place Order).
// iOS: title/price produk tidak punya id (sama seperti pola di Cart) - dipilih lewat posisi StaticText
// ke-1/ke-2 di dalam Cell. itemsCountText/totalAmountText juga tidak punya id - dipilih lewat XPath
// following-sibling dari label "Total:" yang teksnya tetap (class chain tidak bisa navigasi sibling).
export const CheckoutOverviewLocators = {
  itemTitle: {
    android: 'android=new UiSelector().resourceId("com.saucelabs.mydemoapp.android:id/titleTV")',
    ios: '-ios class chain:**/XCUIElementTypeCell/XCUIElementTypeStaticText[1]',
  },
  itemPrice: {
    android: 'android=new UiSelector().resourceId("com.saucelabs.mydemoapp.android:id/priceTV")',
    ios: '-ios class chain:**/XCUIElementTypeCell/XCUIElementTypeStaticText[2]',
  },
  itemsCountText: {
    android: 'android=new UiSelector().resourceId("com.saucelabs.mydemoapp.android:id/itemNumberTV")',
    ios: '//XCUIElementTypeStaticText[@value="Total:"]/following-sibling::XCUIElementTypeStaticText[1]',
  },
  totalAmountText: {
    android: 'android=new UiSelector().resourceId("com.saucelabs.mydemoapp.android:id/totalAmountTV")',
    ios: '//XCUIElementTypeStaticText[@value="Total:"]/following-sibling::XCUIElementTypeStaticText[2]',
  },
  placeOrderButton: {
    android: 'android=new UiSelector().resourceId("com.saucelabs.mydemoapp.android:id/paymentBtn")',
    ios: '~Place Order',
  },
} satisfies Record<string, PlatformSelector>;

// Halaman "Checkout Complete" (tampil setelah Place Order sukses)
export const CheckoutCompleteLocators = {
  completeTitle: {
    android: 'android=new UiSelector().resourceId("com.saucelabs.mydemoapp.android:id/completeTV")',
    ios: '~Checkout Complete',
  },
} satisfies Record<string, PlatformSelector>;
