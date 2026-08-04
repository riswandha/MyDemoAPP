import { androidOnly, PlatformSelector } from './types';

// Locator untuk Fitur Cart (TS003), halaman "My Cart". Selector Android dari inspeksi UI di device.
// iOS = TODO.
export const CartLocators = {
  itemTitle: androidOnly('android=new UiSelector().resourceId("com.saucelabs.mydemoapp.android:id/titleTV")'),
  itemPrice: androidOnly('android=new UiSelector().resourceId("com.saucelabs.mydemoapp.android:id/priceTV")'),
  itemQuantity: androidOnly('android=new UiSelector().resourceId("com.saucelabs.mydemoapp.android:id/noTV")'),
  itemsCountText: androidOnly('android=new UiSelector().resourceId("com.saucelabs.mydemoapp.android:id/itemsTV")'),
  totalPriceText: androidOnly('android=new UiSelector().resourceId("com.saucelabs.mydemoapp.android:id/totalPriceTV")'),
  proceedToCheckoutButton: androidOnly('~Confirms products for checkout'),
  removeItemButton: androidOnly('~Removes product from cart'),
  // Tombol +/- quantity per item di halaman Cart (content-desc sama seperti di halaman Detail Produk)
  increaseQtyButton: androidOnly('~Increase item quantity'),
  decreaseQtyButton: androidOnly('~Decrease item quantity'),
  noItemsTitle: androidOnly('android=new UiSelector().resourceId("com.saucelabs.mydemoapp.android:id/noItemTitleTV")'),
  goShoppingButton: androidOnly('android=new UiSelector().resourceId("com.saucelabs.mydemoapp.android:id/shoppingBt")'),
} satisfies Record<string, PlatformSelector>;
