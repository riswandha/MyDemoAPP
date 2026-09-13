import { PlatformSelector } from './types';

// Locator untuk Fitur Cart (TS003), halaman "My Cart".
// Selector Android dari inspeksi UI di device.
// Selector iOS dari inspeksi page source di simulator iPhone 17 Pro / iOS 26.5 - bukan tebakan, setiap
// selector di bawah sudah diverifikasi end-to-end: clear cart, buka produk, pilih warna, add to cart,
// baca title/price/qty, tap +/- qty (qty benar-benar berubah), sampai proceedToCheckoutButton.
//
// TEMUAN PENTING (bukan bug locator, perilaku app): warna default produk yang masuk cart di iOS
// SELALU "Green" kalau tidak ada swatch warna yang di-tap secara eksplisit di halaman Detail Produk -
// nama produk yang dipakai untuk membuka dari katalog (mis. "...- Black") TIDAK ikut menentukan
// warna default di cart, cuma menentukan produk mana yang dibuka. Diverifikasi: buka
// "Sauce Labs Backpack - Black" lalu langsung Add to Cart tanpa pilih swatch -> cart menampilkan
// "Color: Green". Kalau butuh warna tertentu di cart, WAJIB tap swatch-nya dulu lewat
// ProductDetailPage.selectColor() sebelum addToCart() - sama seperti yang sudah dilakukan TC001 di
// tests/cart/cart.spec.ts.
export const CartLocators = {
  // iOS: tidak ada resource-id/accessibility-id untuk title (accessibility name-nya teks nama produk
  // itu sendiri, dinamis) - dipilih lewat POSISI: StaticText PERTAMA di dalam Cell item cart. Pola
  // yang sama seperti ProductDetailLocators.titleText.
  itemTitle: {
    android: 'android=new UiSelector().resourceId("com.saucelabs.mydemoapp.android:id/titleTV")',
    ios: '-ios class chain:**/XCUIElementTypeCell/XCUIElementTypeStaticText[1]',
  },
  // iOS: sama seperti title, tidak ada id - StaticText KEDUA di dalam Cell (setelah title).
  itemPrice: {
    android: 'android=new UiSelector().resourceId("com.saucelabs.mydemoapp.android:id/priceTV")',
    ios: '-ios class chain:**/XCUIElementTypeCell/XCUIElementTypeStaticText[2]',
  },
  // iOS: StaticText KELIMA di dalam Cell - urutannya: [1] title, [2] price, [3] "Color:", [4] nilai
  // warna, [5] angka quantity. Diverifikasi: angka ini benar-benar berubah setelah tap tombol +/-.
  itemQuantity: {
    android: 'android=new UiSelector().resourceId("com.saucelabs.mydemoapp.android:id/noTV")',
    ios: '-ios class chain:**/XCUIElementTypeCell/XCUIElementTypeStaticText[5]',
  },
  // iOS: tidak ada id untuk badge "1 Items" (accessibility name-nya teks itu sendiri). Dipilih lewat
  // XPath following-sibling dari label "Total:" yang teksnya tetap - class chain XCUITest TIDAK
  // mendukung navigasi sibling sama sekali (cuma bisa turun ke descendant), jadi XPath satu-satunya
  // cara yang bisa menjangkau elemen ini, sesuai pengecualian XPath di aturan CLAUDE.md.
  itemsCountText: {
    android: 'android=new UiSelector().resourceId("com.saucelabs.mydemoapp.android:id/itemsTV")',
    ios: '//XCUIElementTypeStaticText[@value="Total:"]/following-sibling::XCUIElementTypeStaticText[1]',
  },
  // iOS: sama seperti itemsCountText, following-sibling ke-2 dari "Total:" (badge jumlah item adalah
  // ke-1).
  totalPriceText: {
    android: 'android=new UiSelector().resourceId("com.saucelabs.mydemoapp.android:id/totalPriceTV")',
    ios: '//XCUIElementTypeStaticText[@value="Total:"]/following-sibling::XCUIElementTypeStaticText[2]',
  },
  proceedToCheckoutButton: {
    android: '~Confirms products for checkout',
    ios: '~ProceedToCheckout',
  },
  removeItemButton: {
    android: '~Removes product from cart',
    ios: '~Remove Item',
  },
  // Tombol +/- quantity per item di halaman Cart.
  // iOS: nama accessibility SAMA PERSIS dengan tombol +/- quantity di halaman Detail Produk
  // ("AddPlus Icons" / "SubtractMinus Icons") - aman karena masing-masing di-resolve dalam konteks
  // layarnya sendiri (BasePage.click() hanya mencari di layar yang sedang aktif).
  increaseQtyButton: {
    android: '~Increase item quantity',
    ios: '~AddPlus Icons',
  },
  decreaseQtyButton: {
    android: '~Decrease item quantity',
    ios: '~SubtractMinus Icons',
  },
  noItemsTitle: {
    android: 'android=new UiSelector().resourceId("com.saucelabs.mydemoapp.android:id/noItemTitleTV")',
    ios: '~No Items',
  },
  // iOS: accessibility id-nya "GoShopping" TANPA spasi (beda dari label yang tampil "Go Shopping" DAN
  // beda dari nama tab bar "Catalog-tab-item" dkk yang pakai tanda hubung) - dikonfirmasi lewat page
  // source dump, bukan salah ketik.
  goShoppingButton: {
    android: 'android=new UiSelector().resourceId("com.saucelabs.mydemoapp.android:id/shoppingBt")',
    ios: '~GoShopping',
  },
} satisfies Record<string, PlatformSelector>;
