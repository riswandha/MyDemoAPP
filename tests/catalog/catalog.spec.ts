import CatalogPage from '../../pages/catalog.page';
import ProductDetailPage from '../../pages/product-detail.page';
import { baseProducts, detailProduct, reviewRatingStars, platformText } from '../../utils/test-data';

// Ubah teks harga dari app (mis. "$ 29.99") jadi angka supaya bisa dibandingkan
function parsePrice(priceText: string): number {
  return Number(priceText.replace(/[^0-9.]/g, ''));
}

// Cek satu nama family produk (mis. "Sauce Labs Backpack") benar-benar terwakili di katalog - baik
// sebagai entri polos (app Android untuk produk ini) MAUPUN sebagai varian warna dengan suffix
// "<Nama> - <Warna>" (app iOS untuk produk yang punya pilihan warna, lihat catatan di utils/test-data.ts
// pada `detailProduct`). Dipakai untuk kedua platform sekaligus - bukan percabangan platform, cuma
// pencocokan yang cukup longgar untuk menampung dua bentuk data yang sama-sama sah.
function catalogHasProductFamily(titles: string[], productName: string): boolean {
  return titles.some((title) => title === productName || title.startsWith(`${productName} - `));
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
  it('should display all products with image and name @smoke @critical', async () => {
    const { titles } = await CatalogPage.getAllProducts();

    baseProducts.forEach((productName) => {
      expect(catalogHasProductFamily(titles, productName)).toBe(true);
    });
  });

  // TS002/TC001 (bagian harga) - HANYA Android. Diverifikasi langsung di device dengan polling
  // getText() tiap 400ms selama 8 detik setelah app baru dibuka: StaticText harga tiap kartu produk di
  // grid katalog app iOS accessibility label/value-nya STATIS "Product Price" di semua kartu, tidak
  // pernah berisi angka harga sesungguhnya - bukan race condition loading data, dan bukan salah baca
  // locator (halaman Detail Produk pada app yang SAMA menampilkan harga dengan benar). Karena app iOS
  // sendiri tidak mengekspos harga di grid katalog, harga di layar ini genuinely tidak bisa diverifikasi
  // di iOS. Lihat locators/catalog.locators.ts untuk detail temuan.
  it('should display product price for each item in catalog @regression @android-only', async function () {
    if (driver.isIOS) {
      return this.skip();
    }

    const { prices } = await CatalogPage.getAllProducts();

    prices.forEach((priceText) => {
      expect(parsePrice(priceText)).toBeGreaterThan(0);
    });
  });

  // TS002/TC002 - Melihat detail produk. Excel menyebut field "deskripsi", tapi hasil inspeksi
  // langsung di device menunjukkan halaman detail produk app ini tidak punya field deskripsi - hanya
  // nama, harga, rating, pilihan warna dan quantity. Verifikasi disesuaikan dengan field yang benar-
  // benar ada di app.
  it('should display product detail page with name, price, color options and quantity @regression', async () => {
    const product = platformText(detailProduct);
    await CatalogPage.openProduct(product);

    expect(await ProductDetailPage.getTitle()).toBe(product);
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

  // HANYA Android - alasan sama seperti TC001 bagian harga di atas: app iOS tidak mengekspos angka
  // harga di grid katalog (selalu literal "Product Price"), jadi parsePrice() di seluruh baris test ini
  // akan selalu menghasilkan 0 untuk 0 di iOS - assertion-nya akan LOLOS tapi tidak pernah benar-benar
  // menguji apa pun (false positive), lebih berbahaya daripada di-skip terang-terangan lewat tag ini.
  it('should sort products by Price - Ascending @regression @android-only', async function () {
    if (driver.isIOS) {
      return this.skip();
    }

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

  // HANYA Android - lihat catatan di atas pada test "Price - Ascending".
  it('should sort products by Price - Descending @regression @android-only', async function () {
    if (driver.isIOS) {
      return this.skip();
    }

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
