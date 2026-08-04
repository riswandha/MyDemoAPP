import CatalogPage from '../../pages/catalog.page';
import ProductDetailPage from '../../pages/product-detail.page';
import CartPage from '../../pages/cart.page';
import {
  cartProduct,
  cartProductColor,
  addProductData,
  updateQtyIncreaseData,
  updateQtyDecreaseData,
  repeatedAddToCartData,
} from '../../utils/test-data';

// Ubah teks harga dari app (mis. "$ 29.99") jadi angka supaya bisa dihitung/dibandingkan
function parsePrice(priceText: string): number {
  return Number(priceText.replace(/[^0-9.]/g, ''));
}

// Test suite untuk Fitur Cart (TS003), mengikuti Test Script Excel: Sub Fitur "Tambah Produk" (TC001),
// "Hapus Produk" (TC002), "Update Qty" (TC003 tambah, TC004 kurangi), "Total Harga" (TC005).
//
// CATATAN: Excel memakai produk "Onesie" (TC001) & "Sauce Labs Bike Light" (TC005), tapi hasil
// investigasi di device menemukan bug crash asli di app - hanya "Sauce Labs Backpack" (index 0-5 di
// grid katalog) yang bisa dibuka tanpa crash (lihat catatan lengkap di utils/test-data.ts). Seluruh
// case di bawah memakai Backpack sebagai pengganti. File ini independen: tidak perlu login untuk fitur
// Cart, dan tiap case membersihkan cart dulu (lihat CartPage.clearCart) supaya tidak kebawa sisa item
// dari test/run sebelumnya.
describe('Cart Feature', () => {
  // TS003/TC001 - Menambahkan produk ke keranjang
  it('should add product to cart with selected color and quantity @smoke @critical', async () => {
    await CatalogPage.openCart();
    await CartPage.clearCart();
    await CartPage.goShopping();

    await CatalogPage.openProduct(cartProduct);
    await ProductDetailPage.selectColor(cartProductColor);
    await ProductDetailPage.increaseQuantity(addProductData.quantity - 1);
    const unitPrice = parsePrice(await ProductDetailPage.getPrice());
    await ProductDetailPage.addToCart();

    await ProductDetailPage.openCart();
    expect(await CartPage.getItemTitle()).toBe(cartProduct);
    expect(await CartPage.getItemQuantity()).toBe(String(addProductData.quantity));
    expect(parsePrice(await CartPage.getTotalPrice())).toBeCloseTo(unitPrice * addProductData.quantity, 2);
  });

  // TS003/TC002 - Menghapus produk dari keranjang
  it('should remove item from cart and show empty cart page @regression @critical', async () => {
    await CatalogPage.openCart();
    await CartPage.clearCart();
    await CartPage.goShopping();

    await CatalogPage.openProduct(cartProduct);
    await ProductDetailPage.addToCart();
    await ProductDetailPage.openCart();

    expect(await CartPage.isEmpty()).toBe(false);
    await CartPage.removeItem();
    expect(await CartPage.isEmpty()).toBe(true);
  });

  // TS003/TC003 - Menambah jumlah (qty) produk di keranjang
  it('should increase item quantity in cart and update subtotal @regression', async () => {
    await CatalogPage.openCart();
    await CartPage.clearCart();
    await CartPage.goShopping();

    await CatalogPage.openProduct(cartProduct);
    await ProductDetailPage.increaseQuantity(updateQtyIncreaseData.initialQty - 1);
    const unitPrice = parsePrice(await ProductDetailPage.getPrice());
    await ProductDetailPage.addToCart();
    await ProductDetailPage.openCart();
    expect(await CartPage.getItemQuantity()).toBe(String(updateQtyIncreaseData.initialQty));

    await CartPage.increaseQty(updateQtyIncreaseData.increaseBy);

    const finalQty = updateQtyIncreaseData.initialQty + updateQtyIncreaseData.increaseBy;
    expect(await CartPage.getItemQuantity()).toBe(String(finalQty));
    expect(parsePrice(await CartPage.getTotalPrice())).toBeCloseTo(unitPrice * finalQty, 2);
  });

  // TS003/TC004 - Mengurangi jumlah (qty) produk di keranjang
  it('should decrease item quantity in cart and update subtotal @regression', async () => {
    await CatalogPage.openCart();
    await CartPage.clearCart();
    await CartPage.goShopping();

    await CatalogPage.openProduct(cartProduct);
    await ProductDetailPage.increaseQuantity(updateQtyDecreaseData.initialQty - 1);
    const unitPrice = parsePrice(await ProductDetailPage.getPrice());
    await ProductDetailPage.addToCart();
    await ProductDetailPage.openCart();
    expect(await CartPage.getItemQuantity()).toBe(String(updateQtyDecreaseData.initialQty));

    await CartPage.decreaseQty(updateQtyDecreaseData.decreaseBy);

    const finalQty = updateQtyDecreaseData.initialQty - updateQtyDecreaseData.decreaseBy;
    expect(await CartPage.getItemQuantity()).toBe(String(finalQty));
    expect(parsePrice(await CartPage.getTotalPrice())).toBeCloseTo(unitPrice * finalQty, 2);
  });

  // TS003/TC005 - Menambahkan produk yang sama ke cart berkali-kali, verifikasi total harga
  it('should accumulate total price when adding the same product to cart multiple times @regression @critical', async () => {
    await CatalogPage.openCart();
    await CartPage.clearCart();
    await CartPage.goShopping();

    await CatalogPage.openProduct(cartProduct);
    await ProductDetailPage.increaseQuantity(repeatedAddToCartData.quantityPerAdd - 1);
    const unitPrice = parsePrice(await ProductDetailPage.getPrice());

    for (let i = 0; i < repeatedAddToCartData.addToCartTimes; i++) {
      await ProductDetailPage.addToCart();
    }

    await ProductDetailPage.openCart();
    const totalQty = repeatedAddToCartData.quantityPerAdd * repeatedAddToCartData.addToCartTimes;
    expect(await CartPage.getItemQuantity()).toBe(String(totalQty));
    expect(parsePrice(await CartPage.getTotalPrice())).toBeCloseTo(unitPrice * totalQty, 2);
  });
});
