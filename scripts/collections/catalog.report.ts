import { createRuntime, writeReportData } from '../lib/report-client';
import CatalogPage from '../../pages/catalog.page';
import ProductDetailPage from '../../pages/product-detail.page';
import { baseProducts, detailProduct, reviewRatingStars } from '../../utils/test-data';

function parsePrice(priceText: string): number {
  return Number(priceText.replace(/[^0-9.]/g, ''));
}

function fmt(amount: number): string {
  return `$ ${amount.toFixed(2)}`;
}

// Sama persis dengan tests/catalog/catalog.spec.ts: cek satu nama family produk (mis. "Sauce Labs
// Backpack") terwakili di katalog - baik sebagai entri polos (Android) MAUPUN varian warna dengan
// suffix "<Nama> - <Warna>" (iOS, lihat catatan di utils/test-data.ts pada `detailProduct`). BUKAN
// percabangan platform, cuma pencocokan yang cukup longgar untuk menampung dua bentuk data yang
// sama-sama sah - disalin ke sini (bukan di-import) karena fungsi ini tidak diekspor dari file spec.
function catalogHasProductFamily(titles: string[], productName: string): boolean {
  return titles.some((title) => title === productName || title.startsWith(`${productName} - `));
}

// Menjalankan & merekam seluruh Test Case dari tests/catalog/catalog.spec.ts (Fitur Katalog, TS002)
// memakai page object & data yang sama persis dengan spec tersebut. Urutan eksekusi disamakan
// dengan spec asli: TC001, TC002, TC004, baru TC003 (Sort) di akhir - lihat catatan bug crash app
// di komentar tests/catalog/catalog.spec.ts kenapa urutannya seperti ini.
async function main() {
  const rt = await createRuntime('catalog');
  const { client } = rt;

  // TS002/TC001 - Menampilkan daftar produk pada halaman katalog
  await rt.runCase('TC001', async () => {
    const caseId = 'TC001';
    rt.startCase(caseId, 'TS002/TC001', 'Menampilkan daftar produk pada halaman katalog');
    await rt.captureStep(caseId, 'Kondisi awal halaman Catalog (belum perlu login)');

    const { titles, prices } = await CatalogPage.getAllProducts();
    await rt.captureStep(caseId, 'Kumpulkan seluruh nama & harga produk yang tampil di grid katalog');

    baseProducts.forEach((productName) => {
      const present = catalogHasProductFamily(titles, productName);
      rt.verify(caseId, `Produk "${productName}" tampil di katalog`, 'true', String(present));
      // LIMITASI APP iOS (bukan bug locator - lihat locators/catalog.locators.ts): harga tiap kartu
      // di grid katalog selalu literal "Product Price", tidak pernah berisi angka - sama seperti
      // spec asli, verifikasi harga di grid HANYA dijalankan di Android (di iOS harga sudah
      // tervalidasi di halaman Detail Produk lewat TC002).
      if (!client.isIOS) {
        const index = titles.indexOf(productName);
        const price = index >= 0 ? parsePrice(prices[index]) : NaN;
        rt.verify(caseId, `Harga produk "${productName}" > 0 (actual ${fmt(price || 0)})`, 'true', String(price > 0));
      }
    });
  });

  // TS002/TC002 - Melihat detail produk
  await rt.runCase('TC002', async () => {
    const caseId = 'TC002';
    rt.startCase(caseId, 'TS002/TC002', 'Melihat detail produk (nama, harga, warna, quantity)');

    // detailProduct berbeda per platform (lihat catatan di utils/test-data.ts) - script ini memakai
    // `client` dari webdriverio remote() langsung, bukan global `driver` milik runner WDIO, jadi
    // diresolusi manual di sini alih-alih lewat platformText().
    const product = client.isIOS ? detailProduct.ios : detailProduct.android;

    await CatalogPage.openProduct(product);
    await rt.captureStep(caseId, `Buka halaman detail produk "${product}"`);

    const title = await ProductDetailPage.getTitle();
    rt.verify(caseId, 'Judul produk di halaman detail', product, title);
    const price = parsePrice(await ProductDetailPage.getPrice());
    rt.verify(caseId, `Harga produk > 0 (actual ${fmt(price)})`, 'true', String(price > 0));
    const qty = await ProductDetailPage.getQuantity();
    rt.verify(caseId, 'Quantity awal di halaman detail', '1', qty);
  });

  // TS002/TC004 - Submit review/rating pada produk (lanjut dari halaman detail TC002)
  await rt.runCase('TC004', async () => {
    const caseId = 'TC004';
    rt.startCase(caseId, 'TS002/TC004', 'Submit review/rating pada produk');

    await ProductDetailPage.submitRating(reviewRatingStars);
    await rt.captureStep(caseId, `Tap bintang rating ke-${reviewRatingStars} pada halaman detail produk`);

    const message = await ProductDetailPage.getReviewConfirmMessage();
    rt.verify(caseId, 'Pesan konfirmasi setelah submit rating', 'Thank you for submitting your review!', message);

    await ProductDetailPage.closeReviewConfirmModal();
    await rt.captureStep(caseId, 'Tutup modal konfirmasi review');

    await CatalogPage.returnFromProductDetail();
    await rt.captureStep(caseId, 'Kembali ke halaman Katalog (tombol back)');
  });

  // TS002/TC003 - Sort produk (Name Asc/Desc, Price Asc/Desc)
  const sortCases: Array<{
    id: string;
    option: 'nameAsc' | 'nameDesc' | 'priceAsc' | 'priceDesc';
    label: string;
    mode: 'name' | 'price';
    order: 'asc' | 'desc';
  }> = [
    { id: 'TC003a', option: 'nameAsc', label: 'Name - Ascending', mode: 'name', order: 'asc' },
    { id: 'TC003b', option: 'nameDesc', label: 'Name - Descending', mode: 'name', order: 'desc' },
    { id: 'TC003c', option: 'priceAsc', label: 'Price - Ascending', mode: 'price', order: 'asc' },
    { id: 'TC003d', option: 'priceDesc', label: 'Price - Descending', mode: 'price', order: 'desc' },
  ];

  for (const sc of sortCases) {
    // Sort berdasarkan HARGA (Price Asc/Desc) HANYA Android - sama seperti tests/catalog/catalog.spec.ts:
    // harga di grid katalog app iOS selalu literal "Product Price" (lihat locators/catalog.locators.ts),
    // jadi parsePrice() di sini akan selalu 0 dan assertion-nya lolos TANPA benar-benar menguji apa
    // pun (false positive) - lebih berbahaya daripada di-skip terang-terangan.
    if (sc.mode === 'price' && client.isIOS) {
      continue;
    }

    await rt.runCase(sc.id, async () => {
      rt.startCase(sc.id, 'TS002/TC003', `Mengurutkan produk berdasarkan ${sc.label}`);

      await CatalogPage.sortBy(sc.option);
      await rt.captureStep(sc.id, `Buka menu Sort, pilih urutan "${sc.label}"`);

      const { titles, prices } = await CatalogPage.getAllProducts();
      await rt.captureStep(sc.id, 'Kumpulkan ulang urutan produk yang tampil setelah di-sort');

      if (sc.mode === 'name') {
        const expected = [...titles].sort();
        if (sc.order === 'desc') expected.reverse();
        rt.verify(sc.id, `Urutan nama produk (${sc.label})`, expected.join(' | '), titles.join(' | '));
        rt.verify(sc.id, 'Produk paling atas sesuai urutan', expected[0], titles[0]);
        rt.verify(sc.id, 'Produk paling bawah sesuai urutan', expected[expected.length - 1], titles[titles.length - 1]);
      } else {
        const values = prices.map(parsePrice);
        const expected = [...values].sort((a, b) => (sc.order === 'asc' ? a - b : b - a));
        rt.verify(sc.id, `Urutan harga produk (${sc.label})`, expected.map(fmt).join(' | '), values.map(fmt).join(' | '));
        const expectedEdge = sc.order === 'asc' ? Math.min(...values) : Math.max(...values);
        rt.verify(sc.id, 'Harga paling atas sesuai urutan', fmt(expectedEdge), fmt(values[0]));
        const expectedOtherEdge = sc.order === 'asc' ? Math.max(...values) : Math.min(...values);
        rt.verify(sc.id, 'Harga paling bawah sesuai urutan', fmt(expectedOtherEdge), fmt(values[values.length - 1]));
      }
    });
  }

  const data = await rt.finish();
  await writeReportData('catalog', data);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
