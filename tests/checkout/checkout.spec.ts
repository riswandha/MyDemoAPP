import LoginPage from '../../pages/login.page';
import CatalogPage from '../../pages/catalog.page';
import ProductDetailPage from '../../pages/product-detail.page';
import CartPage from '../../pages/cart.page';
import CheckoutAddressPage from '../../pages/checkout-address.page';
import CheckoutPaymentPage from '../../pages/checkout-payment.page';
import CheckoutOverviewPage from '../../pages/checkout-overview.page';
import CheckoutCompletePage from '../../pages/checkout-complete.page';
import {
  validUser,
  checkoutProduct,
  createShippingAddress,
  createPaymentDetails,
  SHIPPING_FEE,
} from '../../utils/test-data';

// Ubah teks harga dari app (mis. "$ 29.99") jadi angka supaya bisa dihitung/dibandingkan
function parsePrice(priceText: string): number {
  return Number(priceText.replace(/[^0-9.]/g, ''));
}

// Test suite untuk Fitur Checkout (TS004), mengikuti Test Script Excel: Sub Fitur "Place Order"
// (TC001) dan "Review Order" (TC002). File ini independen: login dulu lewat case Login
// (LoginPage.login) sebelum belanja, supaya bisa dijalankan sendiri tanpa bergantung pada file spec lain.
describe('Checkout Feature', () => {
  // TS004/TC001 - Melakukan checkout dan place order (alur lengkap sampai order sukses)
  it('should complete checkout for Sauce Labs Backpack x2 with price verified on every page @smoke @critical', async () => {
    // 0. Login (pakai case Login yang sama seperti login.spec.ts)
    await LoginPage.login(validUser.username, validUser.password);

    // Pastikan cart kosong dulu (lihat komentar CartPage.clearCart) supaya verifikasi harga & quantity
    // di langkah-langkah berikutnya tidak kebawa sisa item dari run sebelumnya
    await CatalogPage.openCart();
    await CartPage.clearCart();
    await CartPage.goShopping();

    // 1. Buka produk & catat harga satuan sebagai acuan verifikasi harga di halaman-halaman berikutnya
    await CatalogPage.openProduct(checkoutProduct.name);
    expect(await ProductDetailPage.getTitle()).toBe(checkoutProduct.name);
    const unitPrice = parsePrice(await ProductDetailPage.getPrice());

    // 2. Set quantity jadi 2, lalu tambahkan ke cart
    await ProductDetailPage.increaseQuantity(checkoutProduct.quantity - 1);
    expect(await ProductDetailPage.getQuantity()).toBe(String(checkoutProduct.quantity));
    await ProductDetailPage.addToCart();

    // 3. Verifikasi harga di halaman Cart terhadap halaman Product Detail:
    //    harga satuan harus sama, dan subtotal harus sama dengan (harga satuan x quantity)
    await ProductDetailPage.openCart();
    expect(await CartPage.getItemTitle()).toBe(checkoutProduct.name);
    expect(parsePrice(await CartPage.getItemPrice())).toBe(unitPrice);
    expect(await CartPage.getItemQuantity()).toBe(String(checkoutProduct.quantity));
    const cartSubtotal = parsePrice(await CartPage.getTotalPrice());
    expect(cartSubtotal).toBeCloseTo(unitPrice * checkoutProduct.quantity, 2);

    // 4. Checkout Step 1 - Alamat pengiriman
    await CartPage.proceedToCheckout();
    await CheckoutAddressPage.fillAddress(createShippingAddress());
    await CheckoutAddressPage.toPayment();

    // 5. Checkout Step 2 - Metode pembayaran
    await CheckoutPaymentPage.fillPayment(createPaymentDetails());
    await CheckoutPaymentPage.reviewOrder();

    // 6. Checkout Step 3 (Review Order) - verifikasi harga terhadap halaman Cart:
    //    harga satuan & quantity harus tetap sama, sedangkan Total di halaman ini sudah termasuk biaya
    //    pengiriman tetap (SHIPPING_FEE), jadi dibandingkan sebagai subtotal + shipping
    expect(await CheckoutOverviewPage.getItemTitle()).toBe(checkoutProduct.name);
    expect(parsePrice(await CheckoutOverviewPage.getItemPrice())).toBe(unitPrice);
    expect(await CheckoutOverviewPage.getItemsCount()).toBe(`${checkoutProduct.quantity} Items`);
    const reviewTotal = parsePrice(await CheckoutOverviewPage.getTotalAmount());
    expect(reviewTotal).toBeCloseTo(cartSubtotal + SHIPPING_FEE, 2);

    // 7. Selesaikan pesanan -> case berakhir saat halaman Checkout Complete berhasil tampil
    await CheckoutOverviewPage.placeOrder();
    expect(await CheckoutCompletePage.isCheckoutComplete()).toBe(true);
    expect(await CheckoutCompletePage.getCompleteTitle()).toBe('Checkout Complete');
  });

  // TS004/TC002 - Verifikasi ringkasan order (Review Order) sebelum place order: nama produk, warna,
  // qty dan total harga pada halaman Review Order harus sesuai dengan data yang dipilih di cart. Alur
  // singkat sendiri (bukan reuse TC001) supaya case ini independen dan bisa dibaca terpisah.
  it('should show order summary on Review Order page matching cart data @regression @critical', async () => {
    await LoginPage.login(validUser.username, validUser.password);

    await CatalogPage.openCart();
    await CartPage.clearCart();
    await CartPage.goShopping();

    await CatalogPage.openProduct(checkoutProduct.name);
    const unitPrice = parsePrice(await ProductDetailPage.getPrice());
    await ProductDetailPage.increaseQuantity(checkoutProduct.quantity - 1);
    await ProductDetailPage.addToCart();

    await ProductDetailPage.openCart();
    const cartTitle = await CartPage.getItemTitle();
    const cartQty = await CartPage.getItemQuantity();
    const cartSubtotal = parsePrice(await CartPage.getTotalPrice());

    await CartPage.proceedToCheckout();
    await CheckoutAddressPage.fillAddress(createShippingAddress());
    await CheckoutAddressPage.toPayment();
    await CheckoutPaymentPage.fillPayment(createPaymentDetails());
    await CheckoutPaymentPage.reviewOrder();

    // Bandingkan ringkasan Review Order terhadap data yang sama dari halaman Cart sebelumnya
    expect(await CheckoutOverviewPage.getItemTitle()).toBe(cartTitle);
    expect(parsePrice(await CheckoutOverviewPage.getItemPrice())).toBe(unitPrice);
    expect(await CheckoutOverviewPage.getItemsCount()).toBe(`${cartQty} Items`);
    const reviewTotal = parsePrice(await CheckoutOverviewPage.getTotalAmount());
    expect(reviewTotal).toBeCloseTo(cartSubtotal + SHIPPING_FEE, 2);

    // Selesaikan pesanan supaya cart bersih untuk run/test berikutnya
    await CheckoutOverviewPage.placeOrder();
    expect(await CheckoutCompletePage.isCheckoutComplete()).toBe(true);
  });
});
