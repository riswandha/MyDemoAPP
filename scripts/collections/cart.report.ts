import { createRuntime, writeReportData } from '../lib/report-client';
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

function parsePrice(priceText: string): number {
  return Number(priceText.replace(/[^0-9.]/g, ''));
}

function fmt(amount: number): string {
  return `$ ${amount.toFixed(2)}`;
}

function closeEnough(a: number, b: number, tolerance = 0.01): boolean {
  return Math.abs(a - b) <= tolerance;
}

// Verifikasi nilai uang dengan toleransi kecil (setara `toBeCloseTo` di spec asli), supaya
// pembulatan desimal tidak salah dilaporkan sebagai FAIL. Kalau dalam toleransi, actual ditampilkan
// sama dengan expected (PASS); kalau tidak, actual menampilkan nilai sebenarnya (FAIL).
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

// Menjalankan & merekam seluruh Test Case dari tests/cart/cart.spec.ts (Fitur Cart, TS003) memakai
// page object & data yang sama persis dengan spec tersebut (termasuk pemakaian "Sauce Labs Backpack"
// sebagai pengganti produk di Excel - lihat catatan bug crash app di utils/test-data.ts).
async function main() {
  const rt = await createRuntime('cart');
  const { client } = rt;

  async function resetCart(caseId: string): Promise<void> {
    await CatalogPage.openCart();
    await CartPage.clearCart();
    await CartPage.goShopping();
    await rt.captureStep(caseId, 'Pastikan cart kosong sebelum mulai skenario (clear cart & go shopping)');
  }

  // TS003/TC001 - Menambahkan produk ke keranjang
  {
    const caseId = 'TC001';
    rt.startCase(caseId, 'TS003/TC001', 'Menambahkan produk ke keranjang dengan warna & quantity tertentu');
    await resetCart(caseId);

    await CatalogPage.openProduct(cartProduct);
    await ProductDetailPage.selectColor(cartProductColor);
    await rt.captureStep(caseId, `Buka produk "${cartProduct}", pilih warna ${cartProductColor}`);

    await ProductDetailPage.increaseQuantity(addProductData.quantity - 1);
    const unitPrice = parsePrice(await ProductDetailPage.getPrice());
    await rt.captureStep(caseId, `Set quantity menjadi ${addProductData.quantity}`);

    await ProductDetailPage.addToCart();
    await ProductDetailPage.openCart();
    await rt.captureStep(caseId, 'Add to Cart, lalu buka halaman Cart');

    const itemTitle = await CartPage.getItemTitle();
    rt.verify(caseId, 'Judul item di Cart', cartProduct, itemTitle);
    const itemQty = await CartPage.getItemQuantity();
    rt.verify(caseId, 'Quantity item di Cart', String(addProductData.quantity), itemQty);
    const totalPrice = parsePrice(await CartPage.getTotalPrice());
    const expectedTotal = unitPrice * addProductData.quantity;
    verifyMoney(rt, caseId, 'Subtotal Cart (harga satuan x quantity)', expectedTotal, totalPrice);
  }

  // TS003/TC002 - Menghapus produk dari keranjang
  {
    const caseId = 'TC002';
    rt.startCase(caseId, 'TS003/TC002', 'Menghapus produk dari keranjang');
    await resetCart(caseId);

    await CatalogPage.openProduct(cartProduct);
    await ProductDetailPage.addToCart();
    await ProductDetailPage.openCart();
    await rt.captureStep(caseId, `Tambahkan "${cartProduct}" ke cart, lalu buka halaman Cart`);

    const isEmptyBefore = await CartPage.isEmpty();
    rt.verify(caseId, 'Cart tidak kosong sebelum item dihapus', 'false', String(isEmptyBefore));

    await CartPage.removeItem();
    await rt.captureStep(caseId, 'Hapus item dari Cart (tombol Remove)');

    const isEmptyAfter = await CartPage.isEmpty();
    rt.verify(caseId, 'Cart kosong setelah item dihapus', 'true', String(isEmptyAfter));
  }

  // TS003/TC003 - Menambah jumlah (qty) produk di keranjang
  {
    const caseId = 'TC003';
    rt.startCase(caseId, 'TS003/TC003', 'Menambah jumlah (qty) produk di keranjang');
    await resetCart(caseId);

    await CatalogPage.openProduct(cartProduct);
    await ProductDetailPage.increaseQuantity(updateQtyIncreaseData.initialQty - 1);
    const unitPrice = parsePrice(await ProductDetailPage.getPrice());
    await ProductDetailPage.addToCart();
    await ProductDetailPage.openCart();
    await rt.captureStep(caseId, `Tambahkan "${cartProduct}" qty ${updateQtyIncreaseData.initialQty} ke cart`);

    const initialQty = await CartPage.getItemQuantity();
    rt.verify(caseId, 'Quantity awal di Cart', String(updateQtyIncreaseData.initialQty), initialQty);

    await CartPage.increaseQty(updateQtyIncreaseData.increaseBy);
    await rt.captureStep(caseId, `Tap tombol + sebanyak ${updateQtyIncreaseData.increaseBy}x di halaman Cart`);

    const finalQty = updateQtyIncreaseData.initialQty + updateQtyIncreaseData.increaseBy;
    const actualQty = await CartPage.getItemQuantity();
    rt.verify(caseId, 'Quantity akhir di Cart', String(finalQty), actualQty);
    const totalPrice = parsePrice(await CartPage.getTotalPrice());
    const expectedTotal = unitPrice * finalQty;
    verifyMoney(rt, caseId, 'Subtotal Cart setelah qty ditambah', expectedTotal, totalPrice);
  }

  // TS003/TC004 - Mengurangi jumlah (qty) produk di keranjang
  {
    const caseId = 'TC004';
    rt.startCase(caseId, 'TS003/TC004', 'Mengurangi jumlah (qty) produk di keranjang');
    await resetCart(caseId);

    await CatalogPage.openProduct(cartProduct);
    await ProductDetailPage.increaseQuantity(updateQtyDecreaseData.initialQty - 1);
    const unitPrice = parsePrice(await ProductDetailPage.getPrice());
    await ProductDetailPage.addToCart();
    await ProductDetailPage.openCart();
    await rt.captureStep(caseId, `Tambahkan "${cartProduct}" qty ${updateQtyDecreaseData.initialQty} ke cart`);

    const initialQty = await CartPage.getItemQuantity();
    rt.verify(caseId, 'Quantity awal di Cart', String(updateQtyDecreaseData.initialQty), initialQty);

    await CartPage.decreaseQty(updateQtyDecreaseData.decreaseBy);
    await rt.captureStep(caseId, `Tap tombol - sebanyak ${updateQtyDecreaseData.decreaseBy}x di halaman Cart`);

    const finalQty = updateQtyDecreaseData.initialQty - updateQtyDecreaseData.decreaseBy;
    const actualQty = await CartPage.getItemQuantity();
    rt.verify(caseId, 'Quantity akhir di Cart', String(finalQty), actualQty);
    const totalPrice = parsePrice(await CartPage.getTotalPrice());
    const expectedTotal = unitPrice * finalQty;
    verifyMoney(rt, caseId, 'Subtotal Cart setelah qty dikurangi', expectedTotal, totalPrice);
  }

  // TS003/TC005 - Menambahkan produk yang sama ke cart berkali-kali
  {
    const caseId = 'TC005';
    rt.startCase(caseId, 'TS003/TC005', 'Akumulasi total harga saat produk sama ditambahkan berkali-kali');
    await resetCart(caseId);

    await CatalogPage.openProduct(cartProduct);
    await ProductDetailPage.increaseQuantity(repeatedAddToCartData.quantityPerAdd - 1);
    const unitPrice = parsePrice(await ProductDetailPage.getPrice());
    await rt.captureStep(caseId, `Set quantity per Add to Cart menjadi ${repeatedAddToCartData.quantityPerAdd}`);

    for (let i = 0; i < repeatedAddToCartData.addToCartTimes; i++) {
      await ProductDetailPage.addToCart();
    }
    await rt.captureStep(caseId, `Tap Add to Cart sebanyak ${repeatedAddToCartData.addToCartTimes}x`);

    await ProductDetailPage.openCart();
    await rt.captureStep(caseId, 'Buka halaman Cart untuk verifikasi akumulasi');

    const totalQty = repeatedAddToCartData.quantityPerAdd * repeatedAddToCartData.addToCartTimes;
    const actualQty = await CartPage.getItemQuantity();
    rt.verify(caseId, 'Total quantity terakumulasi', String(totalQty), actualQty);
    const totalPrice = parsePrice(await CartPage.getTotalPrice());
    const expectedTotal = unitPrice * totalQty;
    verifyMoney(rt, caseId, 'Total harga terakumulasi', expectedTotal, totalPrice);
  }

  const data = await rt.finish();
  await writeReportData('cart', data);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
