import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config();

import LoginPage from '../pages/login.page';
import CatalogPage from '../pages/catalog.page';
import ProductDetailPage from '../pages/product-detail.page';
import CartPage from '../pages/cart.page';
import CheckoutAddressPage from '../pages/checkout-address.page';
import CheckoutPaymentPage from '../pages/checkout-payment.page';
import CheckoutOverviewPage from '../pages/checkout-overview.page';
import CheckoutCompletePage from '../pages/checkout-complete.page';
import { validUser } from '../utils/test-data';
import { checkoutProduct, createShippingAddress, createPaymentDetails, SHIPPING_FEE } from '../utils/test-data';

interface StepRecord {
  no: number;
  section: string;
  description: string;
  screenshotRelPath: string;
}

interface VerificationRecord {
  section: string;
  item: string;
  expected: string;
  actual: string;
  status: 'PASS' | 'FAIL';
}

const reportDir = path.resolve(__dirname, '../reports');
const screenshotsRoot = path.join(reportDir, 'screenshots');

const steps: StepRecord[] = [];
const verifications: VerificationRecord[] = [];
const sectionCounters: Record<string, number> = {};

function parsePrice(priceText: string): number {
  return Number(priceText.replace(/[^0-9.]/g, ''));
}

function fmt(amount: number): string {
  return `$ ${amount.toFixed(2)}`;
}

function verify(section: string, item: string, expected: string, actual: string): void {
  verifications.push({ section, item, expected, actual, status: expected === actual ? 'PASS' : 'FAIL' });
}

async function main() {
  // 'webdriverio' dipublikasikan sebagai ESM murni; di-import secara dinamis supaya bisa dipakai
  // dari script CommonJS ini tanpa perlu mengubah "module" project secara keseluruhan.
  const { remote } = await import('webdriverio');
  const client = await remote({
    hostname: process.env.APPIUM_HOST || '127.0.0.1',
    port: Number(process.env.APPIUM_PORT) || 4723,
    path: '/',
    connectionRetryTimeout: 120000,
    connectionRetryCount: 3,
    logLevel: 'warn',
    waitforTimeout: 25000,
    capabilities: {
      platformName: 'Android',
      'appium:automationName': 'UiAutomator2',
      'appium:deviceName': process.env.DEVICE_NAME || 'emulator-5554',
      'appium:platformVersion': process.env.PLATFORM_VERSION || '13',
      'appium:appPackage': process.env.APP_PACKAGE,
      'appium:appActivity': process.env.APP_ACTIVITY,
      'appium:noReset': true,
      'appium:fullReset': false,
      'appium:newCommandTimeout': 240,
      'appium:autoGrantPermissions': true,
    },
  });

  // Page object di pages/*.ts memakai $/driver/browser sebagai global (pola standar
  // WebdriverIO), jadi supaya bisa dipakai ulang di script standalone ini, globalnya di-set manual
  // ke session yang baru dibuat, sebelum method page object mana pun dipanggil.
  (global as unknown as { browser: WebdriverIO.Browser }).browser = client;
  (global as unknown as { driver: WebdriverIO.Browser }).driver = client;
  (global as unknown as { $: WebdriverIO.Browser['$'] }).$ = client.$.bind(client);
  (global as unknown as { $$: WebdriverIO.Browser['$$'] }).$$ = client.$$.bind(client);

  async function captureStep(section: string, description: string): Promise<void> {
    sectionCounters[section] = (sectionCounters[section] || 0) + 1;
    const no = sectionCounters[section];
    const slug = section.toLowerCase();
    const fileName = `${slug}-${String(no).padStart(2, '0')}.png`;
    const filePath = path.join(screenshotsRoot, slug, fileName);
    // Jeda singkat supaya transisi/animasi layar selesai dulu sebelum screenshot diambil,
    // supaya tidak menangkap frame di tengah animasi (mis. halaman masih separuh slide-in).
    await client.pause(800);
    await client.saveScreenshot(filePath);
    steps.push({ no, section, description, screenshotRelPath: `screenshots/${slug}/${fileName}` });
    console.log(`[${section} #${no}] ${description}`);
  }

  // Cek status login dengan buka drawer menu lalu tutup lagi dengan tap area gelap di luar drawer
  // (scrim), BUKAN LoginPage.isLoggedIn() yang menutup drawer pakai driver.back(). Di device fisik
  // yang dipakai untuk generate report ini, back-key kadang malah keluar dari app (bukan cuma
  // menutup drawer) kalau dipanggil dari script standalone tanpa jeda natural seperti di wdio test
  // runner - jadi dihindari di sini demi keandalan generate report.
  async function checkLoginStatus(): Promise<boolean> {
    await client.$('~View menu').click();
    await client.pause(800);
    const isLoggedInNow = await client.$('~Logout Menu Item').isDisplayed();
    const { width, height } = await client.getWindowSize();
    await client.execute('mobile: clickGesture', { x: Math.floor(width * 0.9), y: Math.floor(height * 0.3) });
    await client.pause(500);
    return isLoggedInNow;
  }

  await client.activateApp((process.env.APP_PACKAGE as string) || 'com.saucelabs.mydemoapp.android');
  await client.pause(1500);

  // ===================== SECTION 1: LOGIN =====================
  await captureStep('Login', 'Kondisi awal aplikasi (halaman Catalog, belum login)');

  // Dipecah jadi 3 langkah terpisah (bukan panggil LoginPage.login() sekaligus) supaya laporan
  // punya bukti visual form login yang sudah terisi, bukan cuma kondisi sebelum & sesudah. Selector
  // yang dipakai sama persis dengan yang ada di LoginPage (lihat pages/login.page.ts).
  await LoginPage.openLoginScreen();
  await captureStep('Login', 'Buka menu, lalu pilih "Log In"');

  await client.$('android=new UiSelector().resourceId("com.saucelabs.mydemoapp.android:id/nameET")').setValue(
    validUser.username
  );
  await client.$('android=new UiSelector().resourceId("com.saucelabs.mydemoapp.android:id/passwordET")').setValue(
    validUser.password
  );
  await captureStep('Login', `Isi username (${validUser.username}) & password`);

  await client.$('android=new UiSelector().resourceId("com.saucelabs.mydemoapp.android:id/loginBtn")').click();
  // Setelah login sukses, app me-restart MainActivity (clear back stack) secara internal - proses
  // ini makan waktu beberapa detik di device fisik. Kalau langsung lanjut interaksi sebelum activity
  // baru benar-benar settle, tap berikutnya (mis. buka menu) bisa tidak terdaftar dengan benar.
  await client.pause(4000);
  await captureStep('Login', 'Klik tombol Login -> berhasil, kembali ke halaman Catalog');

  const loggedIn = await checkLoginStatus();
  verify('Login', 'Status login setelah submit', 'true', String(loggedIn));

  // ===================== SECTION 2: CHECKOUT =====================
  await CatalogPage.openCart();
  await CartPage.clearCart();
  await CartPage.goShopping();
  await captureStep('Checkout', 'Pastikan cart kosong sebelum mulai belanja');

  await CatalogPage.openProduct(checkoutProduct.name);
  await captureStep('Checkout', `Buka halaman detail produk "${checkoutProduct.name}"`);
  const productTitle = await ProductDetailPage.getTitle();
  verify('Checkout', 'Product Detail - Judul produk', checkoutProduct.name, productTitle);
  const unitPrice = parsePrice(await ProductDetailPage.getPrice());

  await ProductDetailPage.increaseQuantity(checkoutProduct.quantity - 1);
  await captureStep('Checkout', `Set quantity produk menjadi ${checkoutProduct.quantity}`);
  const productQty = await ProductDetailPage.getQuantity();
  verify('Checkout', 'Product Detail - Quantity', String(checkoutProduct.quantity), productQty);

  await ProductDetailPage.addToCart();
  await captureStep('Checkout', 'Tambahkan produk ke cart (Add to Cart)');

  await ProductDetailPage.openCart();
  await captureStep('Checkout', 'Buka halaman Cart');
  const cartItemTitle = await CartPage.getItemTitle();
  verify('Checkout', 'Cart - Judul item', checkoutProduct.name, cartItemTitle);
  const cartUnitPrice = parsePrice(await CartPage.getItemPrice());
  verify('Checkout', 'Cart - Harga satuan (vs Product Detail)', fmt(unitPrice), fmt(cartUnitPrice));
  const cartQty = await CartPage.getItemQuantity();
  verify('Checkout', 'Cart - Quantity', String(checkoutProduct.quantity), cartQty);
  const cartSubtotal = parsePrice(await CartPage.getTotalPrice());
  verify(
    'Checkout',
    'Cart - Subtotal (harga satuan x quantity)',
    fmt(unitPrice * checkoutProduct.quantity),
    fmt(cartSubtotal)
  );

  await CartPage.proceedToCheckout();
  await captureStep('Checkout', 'Proceed To Checkout -> Checkout Step 1 (Alamat Pengiriman)');

  await CheckoutAddressPage.fillAddress(createShippingAddress());
  await captureStep('Checkout', 'Isi form alamat pengiriman');

  await CheckoutAddressPage.toPayment();
  await captureStep('Checkout', 'Lanjut ke Checkout Step 2 (Metode Pembayaran)');

  await CheckoutPaymentPage.fillPayment(createPaymentDetails());
  await captureStep('Checkout', 'Isi form metode pembayaran');

  await CheckoutPaymentPage.reviewOrder();
  await captureStep('Checkout', 'Lanjut ke Checkout Step 3 (Review Order)');
  const reviewTitle = await CheckoutOverviewPage.getItemTitle();
  verify('Checkout', 'Review Order - Judul item', checkoutProduct.name, reviewTitle);
  const reviewUnitPrice = parsePrice(await CheckoutOverviewPage.getItemPrice());
  verify('Checkout', 'Review Order - Harga satuan (vs Cart)', fmt(unitPrice), fmt(reviewUnitPrice));
  const reviewItemsCount = await CheckoutOverviewPage.getItemsCount();
  verify('Checkout', 'Review Order - Jumlah item', `${checkoutProduct.quantity} Items`, reviewItemsCount);
  const reviewTotal = parsePrice(await CheckoutOverviewPage.getTotalAmount());
  verify(
    'Checkout',
    'Review Order - Total (Subtotal Cart + Shipping $5.99)',
    fmt(cartSubtotal + SHIPPING_FEE),
    fmt(reviewTotal)
  );

  await CheckoutOverviewPage.placeOrder();
  await captureStep('Checkout', 'Place Order -> halaman Checkout Complete');
  const isComplete = await CheckoutCompletePage.isCheckoutComplete();
  verify('Checkout', 'Halaman Checkout Complete tampil', 'true', String(isComplete));
  const completeTitle = await CheckoutCompletePage.getCompleteTitle();
  verify('Checkout', 'Judul halaman', 'Checkout Complete', completeTitle);

  // ===================== SECTION 3: LOGOUT =====================
  await LoginPage.logout();
  await captureStep('Logout', 'Buka menu, klik Log Out, lalu konfirmasi pada dialog');
  const stillLoggedIn = await checkLoginStatus();
  verify('Logout', 'Status login setelah logout', 'false', String(stillLoggedIn));

  await client.deleteSession();

  const dataFile = path.join(reportDir, 'report-data.json');
  fs.writeFileSync(dataFile, JSON.stringify({ generatedAt: new Date().toISOString(), steps, verifications }, null, 2));
  console.log(`\nData report tersimpan di: ${dataFile}`);
  console.log(`Total step: ${steps.length}, total verifikasi: ${verifications.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
