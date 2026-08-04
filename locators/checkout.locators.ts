import { androidOnly, PlatformSelector } from './types';

// Locator untuk Fitur Checkout (TS004), dikelompokkan per langkah checkout. Selector Android dari
// inspeksi UI di device. iOS = TODO. Catatan: tombol "To Payment", "Review Order", dan "Place Order"
// sama-sama memakai resource-id "paymentBtn" di app (tombol lanjut per halaman), bukan salah ketik.

// Step 1 - Form alamat pengiriman
export const CheckoutAddressLocators = {
  fullNameInput: androidOnly('android=new UiSelector().resourceId("com.saucelabs.mydemoapp.android:id/fullNameET")'),
  addressLine1Input: androidOnly('android=new UiSelector().resourceId("com.saucelabs.mydemoapp.android:id/address1ET")'),
  addressLine2Input: androidOnly('android=new UiSelector().resourceId("com.saucelabs.mydemoapp.android:id/address2ET")'),
  cityInput: androidOnly('android=new UiSelector().resourceId("com.saucelabs.mydemoapp.android:id/cityET")'),
  regionInput: androidOnly('android=new UiSelector().resourceId("com.saucelabs.mydemoapp.android:id/stateET")'),
  zipCodeInput: androidOnly('android=new UiSelector().resourceId("com.saucelabs.mydemoapp.android:id/zipET")'),
  countryInput: androidOnly('android=new UiSelector().resourceId("com.saucelabs.mydemoapp.android:id/countryET")'),
  toPaymentButton: androidOnly('android=new UiSelector().resourceId("com.saucelabs.mydemoapp.android:id/paymentBtn")'),
} satisfies Record<string, PlatformSelector>;

// Step 2 - Form metode pembayaran
export const CheckoutPaymentLocators = {
  cardHolderNameInput: androidOnly('android=new UiSelector().resourceId("com.saucelabs.mydemoapp.android:id/nameET")'),
  cardNumberInput: androidOnly('android=new UiSelector().resourceId("com.saucelabs.mydemoapp.android:id/cardNumberET")'),
  expirationDateInput: androidOnly('android=new UiSelector().resourceId("com.saucelabs.mydemoapp.android:id/expirationDateET")'),
  securityCodeInput: androidOnly('android=new UiSelector().resourceId("com.saucelabs.mydemoapp.android:id/securityCodeET")'),
  reviewOrderButton: androidOnly('android=new UiSelector().resourceId("com.saucelabs.mydemoapp.android:id/paymentBtn")'),
} satisfies Record<string, PlatformSelector>;

// Step 3 - Review Order (ringkasan sebelum Place Order)
export const CheckoutOverviewLocators = {
  itemTitle: androidOnly('android=new UiSelector().resourceId("com.saucelabs.mydemoapp.android:id/titleTV")'),
  itemPrice: androidOnly('android=new UiSelector().resourceId("com.saucelabs.mydemoapp.android:id/priceTV")'),
  itemsCountText: androidOnly('android=new UiSelector().resourceId("com.saucelabs.mydemoapp.android:id/itemNumberTV")'),
  totalAmountText: androidOnly('android=new UiSelector().resourceId("com.saucelabs.mydemoapp.android:id/totalAmountTV")'),
  placeOrderButton: androidOnly('android=new UiSelector().resourceId("com.saucelabs.mydemoapp.android:id/paymentBtn")'),
} satisfies Record<string, PlatformSelector>;

// Halaman "Checkout Complete" (tampil setelah Place Order sukses)
export const CheckoutCompleteLocators = {
  completeTitle: androidOnly('android=new UiSelector().resourceId("com.saucelabs.mydemoapp.android:id/completeTV")'),
} satisfies Record<string, PlatformSelector>;
