import { createRuntime, writeReportData } from '../lib/report-client';
import LoginPage from '../../pages/login.page';
import CatalogPage from '../../pages/catalog.page';
import ProductDetailPage from '../../pages/product-detail.page';
import CartPage from '../../pages/cart.page';
import CheckoutAddressPage from '../../pages/checkout-address.page';
import CheckoutPaymentPage from '../../pages/checkout-payment.page';
import CheckoutOverviewPage from '../../pages/checkout-overview.page';
import CheckoutCompletePage from '../../pages/checkout-complete.page';
import { validUser } from '../../utils/test-data';
import { checkoutProduct, createShippingAddress, createPaymentDetails, SHIPPING_FEE } from '../../utils/test-data';

function parsePrice(priceText: string): number {
  return Number(priceText.replace(/[^0-9.]/g, ''));
}

function fmt(amount: number): string {
  return `$ ${amount.toFixed(2)}`;
}

function closeEnough(a: number, b: number, tolerance = 0.01): boolean {
  return Math.abs(a - b) <= tolerance;
}

function verifyMoney(
  rt: { verify: (caseId: string, item: string, expected: string, actual: string) => void },
  caseId: string,
  item: string,
  expectedAmount: number,
  actualAmount: number
): void {
  const expectedStr = fmt(expectedAmount);
  const pass = closeEnough(expectedAmount, actualAmount);
  rt.verify(caseId, `${item} (actual ${fmt(actualAmount)})`, expectedStr, pass ? expectedStr : fmt(actualAmount));
}

// Menjalankan & merekam seluruh Test Case dari tests/checkout/checkout.spec.ts (Fitur Checkout, TS004)
// memakai page object & data yang sama persis dengan spec tersebut.
async function main() {
  const rt = await createRuntime('checkout');

  // TS004/TC001 - Checkout & place order lengkap, harga diverifikasi di tiap halaman
  {
    const caseId = 'TC001';
    rt.startCase(caseId, 'TS004/TC001', 'Checkout & place order lengkap dengan verifikasi harga di tiap halaman');

    await LoginPage.login(validUser.username, validUser.password);
    await rt.client.pause(4000);
    await rt.captureStep(caseId, 'Login dengan akun valid sebagai precondition');

    await CatalogPage.openCart();
    await CartPage.clearCart();
    await CartPage.goShopping();
    await rt.captureStep(caseId, 'Pastikan cart kosong sebelum mulai belanja');

    await CatalogPage.openProduct(checkoutProduct.name);
    await rt.captureStep(caseId, `Buka halaman detail produk "${checkoutProduct.name}"`);
    const productTitle = await ProductDetailPage.getTitle();
    rt.verify(caseId, 'Product Detail - Judul produk', checkoutProduct.name, productTitle);
    const unitPrice = parsePrice(await ProductDetailPage.getPrice());

    await ProductDetailPage.increaseQuantity(checkoutProduct.quantity - 1);
    await rt.captureStep(caseId, `Set quantity produk menjadi ${checkoutProduct.quantity}`);
    const productQty = await ProductDetailPage.getQuantity();
    rt.verify(caseId, 'Product Detail - Quantity', String(checkoutProduct.quantity), productQty);

    await ProductDetailPage.addToCart();
    await rt.captureStep(caseId, 'Tambahkan produk ke cart (Add to Cart)');

    await ProductDetailPage.openCart();
    await rt.captureStep(caseId, 'Buka halaman Cart');
    const cartItemTitle = await CartPage.getItemTitle();
    rt.verify(caseId, 'Cart - Judul item', checkoutProduct.name, cartItemTitle);
    const cartUnitPrice = parsePrice(await CartPage.getItemPrice());
    verifyMoney(rt, caseId, 'Cart - Harga satuan (vs Product Detail)', unitPrice, cartUnitPrice);
    const cartQty = await CartPage.getItemQuantity();
    rt.verify(caseId, 'Cart - Quantity', String(checkoutProduct.quantity), cartQty);
    const cartSubtotal = parsePrice(await CartPage.getTotalPrice());
    verifyMoney(
      rt,
      caseId,
      'Cart - Subtotal (harga satuan x quantity)',
      unitPrice * checkoutProduct.quantity,
      cartSubtotal
    );

    await CartPage.proceedToCheckout();
    await rt.captureStep(caseId, 'Proceed To Checkout -> Checkout Step 1 (Alamat Pengiriman)');

    await CheckoutAddressPage.fillAddress(createShippingAddress());
    await rt.captureStep(caseId, 'Isi form alamat pengiriman');

    await CheckoutAddressPage.toPayment();
    await rt.captureStep(caseId, 'Lanjut ke Checkout Step 2 (Metode Pembayaran)');

    await CheckoutPaymentPage.fillPayment(createPaymentDetails());
    await rt.captureStep(caseId, 'Isi form metode pembayaran');

    await CheckoutPaymentPage.reviewOrder();
    await rt.captureStep(caseId, 'Lanjut ke Checkout Step 3 (Review Order)');
    const reviewTitle = await CheckoutOverviewPage.getItemTitle();
    rt.verify(caseId, 'Review Order - Judul item', checkoutProduct.name, reviewTitle);
    const reviewUnitPrice = parsePrice(await CheckoutOverviewPage.getItemPrice());
    verifyMoney(rt, caseId, 'Review Order - Harga satuan (vs Cart)', unitPrice, reviewUnitPrice);
    const reviewItemsCount = await CheckoutOverviewPage.getItemsCount();
    rt.verify(caseId, 'Review Order - Jumlah item', `${checkoutProduct.quantity} Items`, reviewItemsCount);
    const reviewTotal = parsePrice(await CheckoutOverviewPage.getTotalAmount());
    verifyMoney(
      rt,
      caseId,
      'Review Order - Total (Subtotal Cart + Shipping $5.99)',
      cartSubtotal + SHIPPING_FEE,
      reviewTotal
    );

    await CheckoutOverviewPage.placeOrder();
    await rt.captureStep(caseId, 'Place Order -> halaman Checkout Complete');
    const isComplete = await CheckoutCompletePage.isCheckoutComplete();
    rt.verify(caseId, 'Halaman Checkout Complete tampil', 'true', String(isComplete));
    const completeTitle = await CheckoutCompletePage.getCompleteTitle();
    rt.verify(caseId, 'Judul halaman', 'Checkout Complete', completeTitle);
  }

  // TS004/TC002 - Review Order summary sesuai data Cart
  {
    const caseId = 'TC002';
    rt.startCase(caseId, 'TS004/TC002', 'Ringkasan Review Order sesuai dengan data yang dipilih di Cart');

    await LoginPage.login(validUser.username, validUser.password);
    await rt.client.pause(4000);
    await rt.captureStep(caseId, 'Login dengan akun valid sebagai precondition');

    await CatalogPage.openCart();
    await CartPage.clearCart();
    await CartPage.goShopping();
    await rt.captureStep(caseId, 'Pastikan cart kosong sebelum mulai belanja');

    await CatalogPage.openProduct(checkoutProduct.name);
    const unitPrice = parsePrice(await ProductDetailPage.getPrice());
    await ProductDetailPage.increaseQuantity(checkoutProduct.quantity - 1);
    await ProductDetailPage.addToCart();
    await rt.captureStep(caseId, `Buka "${checkoutProduct.name}", set quantity ${checkoutProduct.quantity}, Add to Cart`);

    await ProductDetailPage.openCart();
    const cartTitle = await CartPage.getItemTitle();
    const cartQty = await CartPage.getItemQuantity();
    const cartSubtotal = parsePrice(await CartPage.getTotalPrice());
    await rt.captureStep(caseId, 'Buka halaman Cart, catat judul/qty/subtotal sebagai acuan');

    await CartPage.proceedToCheckout();
    await CheckoutAddressPage.fillAddress(createShippingAddress());
    await CheckoutAddressPage.toPayment();
    await rt.captureStep(caseId, 'Checkout Step 1 - isi alamat pengiriman, lanjut ke pembayaran');

    await CheckoutPaymentPage.fillPayment(createPaymentDetails());
    await CheckoutPaymentPage.reviewOrder();
    await rt.captureStep(caseId, 'Checkout Step 2 - isi metode pembayaran, lanjut ke Review Order');

    const reviewItemTitle = await CheckoutOverviewPage.getItemTitle();
    rt.verify(caseId, 'Review Order - Judul item (vs Cart)', cartTitle, reviewItemTitle);
    const reviewUnitPrice = parsePrice(await CheckoutOverviewPage.getItemPrice());
    verifyMoney(rt, caseId, 'Review Order - Harga satuan (vs Product Detail)', unitPrice, reviewUnitPrice);
    const reviewItemsCount = await CheckoutOverviewPage.getItemsCount();
    rt.verify(caseId, 'Review Order - Jumlah item (vs Cart)', `${cartQty} Items`, reviewItemsCount);
    const reviewTotal = parsePrice(await CheckoutOverviewPage.getTotalAmount());
    verifyMoney(
      rt,
      caseId,
      'Review Order - Total (Subtotal Cart + Shipping $5.99)',
      cartSubtotal + SHIPPING_FEE,
      reviewTotal
    );

    await CheckoutOverviewPage.placeOrder();
    await rt.captureStep(caseId, 'Place Order -> halaman Checkout Complete (cart dikosongkan kembali)');
    const isComplete = await CheckoutCompletePage.isCheckoutComplete();
    rt.verify(caseId, 'Halaman Checkout Complete tampil', 'true', String(isComplete));
  }

  const data = await rt.finish();
  await writeReportData('checkout', data);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
