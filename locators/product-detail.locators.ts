import { androidOnly, PlatformSelector } from './types';

// Locator untuk halaman Detail Produk (dipakai lintas Fitur Katalog/Cart/Checkout). Selector Android
// dari inspeksi UI di device. iOS = TODO.
export const ProductDetailLocators = {
  titleText: androidOnly('android=new UiSelector().resourceId("com.saucelabs.mydemoapp.android:id/productTV")'),
  priceText: androidOnly('android=new UiSelector().resourceId("com.saucelabs.mydemoapp.android:id/priceTV")'),
  plusButton: androidOnly('~Increase item quantity'),
  quantityText: androidOnly('android=new UiSelector().resourceId("com.saucelabs.mydemoapp.android:id/noTV")'),
  addToCartButton: androidOnly('~Tap to add product to cart'),
  cartIcon: androidOnly('~View cart'),
  // Modal konfirmasi ("Thank you for submitting your review!") yang muncul setelah tap bintang rating.
  // Resource-id-nya "sortTV" - dipakai ulang oleh app dari komponen lain, bukan salah ketik.
  reviewConfirmMessage: androidOnly('android=new UiSelector().resourceId("com.saucelabs.mydemoapp.android:id/sortTV")'),
  reviewConfirmCloseButton: androidOnly('~Closes review dialog'),
} satisfies Record<string, PlatformSelector>;

// Bintang rating (1-5) di bawah harga produk, tap salah satu untuk submit rating
export function ratingStarLocator(star: 1 | 2 | 3 | 4 | 5): PlatformSelector {
  return androidOnly(`android=new UiSelector().resourceId("com.saucelabs.mydemoapp.android:id/start${star}IV")`);
}

// Swatch pilihan warna produk (RecyclerView "colorRV"), content-desc mengikuti pola "<Warna> color"
// (mis. "Black color", "Blue color") - diverifikasi langsung di device.
export function colorSwatchLocator(colorName: string): PlatformSelector {
  return androidOnly(`~${colorName} color`);
}
