import BasePage from './base.page';
import type { PlatformSelector } from '../locators/types';
import { CatalogLocators, productImageLocator, sortOptionLocator, SortOption } from '../locators/catalog.locators';

export type { SortOption };

// CatalogPage = Page Object untuk layar Product Catalog (halaman utama setelah app terbuka).
class CatalogPage extends BasePage {
  // Langkah scroll saat menyusuri katalog: setengah viewport, bukan 0.8 seperti sebelumnya. Semakin
  // pendek langkahnya, semakin besar jaminan dua pembacaan berurutan masih bersinggungan.
  private static readonly COLLECT_SCROLL_PERCENT = 0.5;
  // Batas aman jumlah pembacaan layar. Katalog berisi ~22 kartu (termasuk varian warna); dengan
  // langkah setengah viewport butuh belasan pass, dan 40 memberi ruang untuk koreksi mundur tanpa
  // pernah jadi loop tak berujung.
  private static readonly MAX_COLLECT_PASSES = 40;

  // Buka halaman detail produk dengan tap pada gambar produk di katalog. Scroll cari produknya dulu
  // (mulai dari paling atas) karena posisi produk di grid bisa berubah-ubah tergantung urutan sort
  // yang aktif (mis. kalau case Sort dijalankan sebelum case ini dalam satu Test Case Collection).
  async openProduct(productName: string): Promise<void> {
    const selector = productImageLocator(productName);
    await this.scrollToProduct(selector);
    await this.click(selector);
  }

  // Buka halaman Cart lewat ikon cart di header
  async openCart(): Promise<void> {
    await this.click(CatalogLocators.cartIcon);
  }

  // Tunggu sampai layar Katalog benar-benar siap dipakai, ditandai ikon sort di header sudah ter-render.
  // Berbasis kondisi elemen, bukan delay tetap, sesuai aturan anti-flaky.
  async waitUntilLoaded(timeout = 15000): Promise<void> {
    await this.waitForDisplayed(CatalogLocators.sortIcon, timeout);
  }

  // Kembali ke Katalog dari halaman Detail Produk lewat tombol back Android, lalu tunggu katalog
  // benar-benar tampil. Dipisahkan jadi method sendiri supaya spec tidak memanggil driver.back()
  // telanjang yang selesai duluan sebelum transisi fragment beres - penyebab test berikutnya
  // mengira dirinya sudah di Katalog padahal masih di Detail Produk.
  async returnFromProductDetail(): Promise<void> {
    await driver.back();
    await this.waitUntilLoaded();
  }

  // Buka menu Sort lalu pilih salah satu urutan (menu otomatis tertutup & grid produk ter-refresh
  // begitu salah satu opsi dipilih)
  async sortBy(option: SortOption): Promise<void> {
    await this.click(CatalogLocators.sortIcon);
    await this.click(sortOptionLocator(option));
  }

  // Scroll grid produk sampai paling atas, supaya pengumpulan data lewat getAllProducts() selalu
  // mulai dari item pertama, terlepas dari posisi scroll sebelumnya (mis. bekas scroll test lain).
  // Loop sampai scrollGesture melaporkan tidak bisa scroll lagi (bukan jumlah iterasi tetap) -
  // dengan jumlah produk yang cukup banyak (~22 kartu termasuk varian warna), scroll dari posisi
  // paling bawah butuh lebih dari 6x gesture untuk benar-benar sampai atas.
  private async scrollToTop(): Promise<void> {
    let canScrollMore = true;
    let safetyCounter = 0;
    while (canScrollMore && safetyCounter < 20) {
      canScrollMore = await this.scrollGesture('up', 1.0);
      safetyCounter++;
    }
  }

  // Scroll ke posisi elemen tertentu di grid produk, dimulai dari paling atas. Dipakai supaya
  // openProduct() tidak asumsi produk selalu langsung terlihat di layar tanpa scroll.
  private async scrollToProduct(selector: PlatformSelector): Promise<void> {
    await this.scrollToTop();
    if (await this.isDisplayed(selector).catch(() => false)) return;

    let canScrollMore = true;
    let safetyCounter = 0;
    while (!(await this.isDisplayed(selector).catch(() => false)) && canScrollMore && safetyCounter < 20) {
      canScrollMore = await this.scrollGesture('down', 0.8);
      safetyCounter++;
    }
  }

  // Baca nama & harga produk yang SEDANG terlihat di layar, apa adanya tanpa dedup.
  private async readVisibleProducts(): Promise<{ titles: string[]; prices: string[] }> {
    const titleEls = await this.findAll(CatalogLocators.titleTexts);
    const priceEls = await this.findAll(CatalogLocators.priceTexts);
    const count = Math.min(titleEls.length as unknown as number, priceEls.length as unknown as number);

    const titles: string[] = [];
    const prices: string[] = [];
    for (let i = 0; i < count; i++) {
      titles.push(await titleEls[i].getText());
      prices.push(await priceEls[i].getText());
    }
    return { titles, prices };
  }

  // Kumpulkan nama & harga semua produk di catalog, urut sesuai tampilan di layar (scroll dari atas
  // sampai bawah). Dedup berdasarkan nama produk supaya overlap antar scroll tidak menghasilkan data
  // duplikat. Dipakai untuk verifikasi hasil sort tanpa hardcode daftar produk di test data, sehingga
  // test tetap valid walau isi katalog berubah.
  //
  // Kebenaran hasilnya bergantung pada satu syarat: dua pembacaan layar yang berurutan HARUS
  // bersinggungan. Kalau tidak, ada baris yang tidak pernah terbaca dan hasilnya bolong secara diam-
  // diam - persis kegagalan `indexOf(produk) === -1` di CI job API 34 (run 31253853848). Syarat itu
  // dijaga dua lapis: langkah scroll dikecilkan jadi setengah viewport, dan tiap pass diperiksa
  // apakah benar bersinggungan dengan pass sebelumnya.
  async getAllProducts(): Promise<{ titles: string[]; prices: string[] }> {
    await this.scrollToTop();

    const seenTitles = new Set<string>();
    const titles: string[] = [];
    const prices: string[] = [];

    let previousVisible: string[] = [];
    let passes = 0;
    while (passes < CatalogPage.MAX_COLLECT_PASSES) {
      passes++;
      const visible = await this.readVisibleProducts();

      // Penjaga anti-lompat: kalau tidak ada satu pun judul yang sama dengan pembacaan sebelumnya,
      // berarti gesture terakhir melewati minimal satu baris. Mundur setengah langkah lalu baca
      // ulang - JANGAN lanjut turun, karena produk yang terlewat tidak akan pernah kembali terlihat.
      const overlaps = previousVisible.length === 0 || visible.titles.some((t) => previousVisible.includes(t));
      if (!overlaps) {
        await this.scrollGesture('up', CatalogPage.COLLECT_SCROLL_PERCENT);
        continue;
      }

      for (let i = 0; i < visible.titles.length; i++) {
        const title = visible.titles[i];
        if (!seenTitles.has(title)) {
          seenTitles.add(title);
          titles.push(title);
          prices.push(visible.prices[i]);
        }
      }
      previousVisible = visible.titles;

      if (!(await this.scrollGesture('down', CatalogPage.COLLECT_SCROLL_PERCENT))) {
        break;
      }
    }

    return { titles, prices };
  }
}

export default new CatalogPage();
