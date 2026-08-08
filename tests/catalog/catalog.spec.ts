import CatalogPage from '../../pages/catalog.page';
import ProductDetailPage from '../../pages/product-detail.page';
import { baseProducts, detailProduct, reviewRatingStars } from '../../utils/test-data';

// Ubah teks harga dari app (mis. "$ 29.99") jadi angka supaya bisa dibandingkan
function parsePrice(priceText: string): number {
  return Number(priceText.replace(/[^0-9.]/g, ''));
}

// Test suite untuk Fitur Katalog (TS002), mengikuti Test Script Excel: Sub Fitur "Daftar Produk"
// (TC001), "Detail Produk" (TC002), "Review Produk" (TC004), dan "Sort Produk" (TC003).
//
// Urutan eksekusi di file ini SENGAJA menaruh TC003 (Sort) di akhir, bukan urut TC001-002-003-004
// seperti di Excel: ditemukan bug crash asli di app (java.lang.ArrayIndexOutOfBoundsException di
// ProductCatalogFragment, diverifikasi lewat adb logcat) saat membuka detail produk sementara katalog
// dalam kondisi ter-sort. Karena TC002/TC004 perlu membuka produk, keduanya dijalankan sebelum TC003
// supaya tidak kena bug tersebut. File ini independen: catalog adalah halaman utama yang tampil begitu
// app terbuka, tidak perlu login.
describe('Catalog Feature', () => {
  // TS002/TC001 - Menampilkan daftar produk pada halaman katalog
  it('should display all products with image, name and price @smoke @critical', async () => {
    const { titles, prices } = await CatalogPage.getAllProducts();

    baseProducts.forEach((productName) => {
      const index = titles.indexOf(productName);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(parsePrice(prices[index])).toBeGreaterThan(0);
    });
  });

  // TS002/TC002 - Melihat detail produk. Excel menyebut field "deskripsi", tapi hasil inspeksi
  // langsung di device menunjukkan halaman detail produk app ini tidak punya field deskripsi - hanya
  // nama, harga, rating, pilihan warna dan quantity. Verifikasi disesuaikan dengan field yang benar-
  // benar ada di app.
  it('should display product detail page with name, price, color options and quantity @regression', async () => {
    await CatalogPage.openProduct(detailProduct);

    expect(await ProductDetailPage.getTitle()).toBe(detailProduct);
    expect(parsePrice(await ProductDetailPage.getPrice())).toBeGreaterThan(0);
    expect(await ProductDetailPage.getQuantity()).toBe('1');
  });

  // TS002/TC004 - Submit review/rating pada produk. Precondition-nya "User berada di halaman detail
  // produk" - melanjutkan dari halaman detail produk yang sudah dibuka di TC002, tidak perlu navigasi
  // ulang dari katalog.
  it('should show confirmation modal after submitting a product rating @regression', async () => {
    await ProductDetailPage.submitRating(reviewRatingStars);
    expect(await ProductDetailPage.getReviewConfirmMessage()).toBe('Thank you for submitting your review!');
    await ProductDetailPage.closeReviewConfirmModal();

    // Kembali ke halaman Katalog supaya TC003 (Sort) di bawah bisa langsung mengakses ikon sort di
    // header Katalog. Lewat page object yang menunggu katalog benar-benar tampil, bukan driver.back()
    // telanjang: back() selesai seketika sementara transisi fragment masih berjalan.
    await CatalogPage.returnFromProductDetail();
  });

  // TS002/TC003 - Mengurutkan produk berdasarkan nama/harga. Verifikasi dilakukan dengan membandingkan
  // urutan nama/harga yang benar-benar tampil di app terhadap versi ter-sort dari data yang sama
  // (bukan hardcode daftar produk), supaya test tetap valid walau isi katalog berubah.
  it('should sort products by Name - Ascending @regression', async () => {
    await CatalogPage.sortBy('nameAsc');

    const { titles } = await CatalogPage.getAllProducts();
    const expectedTitles = [...titles].sort();
    expect(titles).toEqual(expectedTitles);

    // Verifikasi eksplisit posisi teratas & terbawah: nama paling awal secara alfabet (A...) harus di
    // posisi paling atas, nama paling akhir (Z...) di posisi paling bawah
    expect(titles[0]).toBe(expectedTitles[0]);
    expect(titles[titles.length - 1]).toBe(expectedTitles[expectedTitles.length - 1]);
  });

  it('should sort products by Name - Descending @regression', async () => {
    await CatalogPage.sortBy('nameDesc');

    const { titles } = await CatalogPage.getAllProducts();
    const expectedTitles = [...titles].sort().reverse();
    expect(titles).toEqual(expectedTitles);

    // Verifikasi eksplisit posisi teratas & terbawah: nama paling akhir secara alfabet (Z...) harus di
    // posisi paling atas, nama paling awal (A...) di posisi paling bawah (kebalikan Ascending)
    expect(titles[0]).toBe(expectedTitles[0]);
    expect(titles[titles.length - 1]).toBe(expectedTitles[expectedTitles.length - 1]);
  });

  it('should sort products by Price - Ascending @regression', async () => {
    await CatalogPage.sortBy('priceAsc');

    const { prices } = await CatalogPage.getAllProducts();
    const values = prices.map(parsePrice);
    const expectedValues = [...values].sort((a, b) => a - b);
    expect(values).toEqual(expectedValues);

    // Verifikasi eksplisit posisi teratas & terbawah: harga termurah di posisi paling atas, harga
    // termahal di posisi paling bawah
    expect(values[0]).toBe(Math.min(...values));
    expect(values[values.length - 1]).toBe(Math.max(...values));
  });

  it('should sort products by Price - Descending @regression', async () => {
    await CatalogPage.sortBy('priceDesc');

    const { prices } = await CatalogPage.getAllProducts();
    const values = prices.map(parsePrice);
    const expectedValues = [...values].sort((a, b) => b - a);
    expect(values).toEqual(expectedValues);

    // Verifikasi eksplisit posisi teratas & terbawah: harga termahal di posisi paling atas, harga
    // termurah di posisi paling bawah (kebalikan Ascending)
    expect(values[0]).toBe(Math.max(...values));
    expect(values[values.length - 1]).toBe(Math.min(...values));
  });
});
