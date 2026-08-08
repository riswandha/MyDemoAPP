import BasePage from './base.page';
import type { PlatformSelector } from '../locators/types';
import {
  ProductDetailLocators,
  ratingStarLocator,
  colorSwatchLocator,
} from '../locators/product-detail.locators';

// ProductDetailPage = Page Object untuk halaman detail produk (dibuka dari tap produk di katalog).
class ProductDetailPage extends BasePage {
  async getTitle(): Promise<string> {
    return this.getText(ProductDetailLocators.titleText);
  }

  // Harga produk, dipakai sebagai acuan verifikasi harga di halaman-halaman berikutnya (cart, review order)
  async getPrice(): Promise<string> {
    return this.getText(ProductDetailLocators.priceText);
  }

  // Angka quantity berada di bagian bawah halaman detail, sering di luar viewport awal - scroll dulu
  // ke elemennya sendiri sebelum dibaca.
  async getQuantity(): Promise<string> {
    await this.scrollToDetailElement(ProductDetailLocators.quantityText);
    return this.readQuantity();
  }

  // Baca angka quantity TANPA scroll. Dipakai di dalam polling waitUntil, di mana elemen sudah pasti
  // tampil dan scroll ulang justru akan menggeser layar saat sedang menunggu.
  private async readQuantity(): Promise<string> {
    return this.getText(ProductDetailLocators.quantityText);
  }

  // Scroll di area khusus halaman detail (mulai 20% tinggi, tinggi 60%) sampai elemen yang DITUJU
  // benar-benar tampil. Sebelumnya semua aksi memakai tombol Add to Cart sebagai penanda dan hanya
  // scroll sekali; di layar Android 11 (API 30) itu berhenti terlalu dini sehingga tombol plus dan
  // angka quantity tidak pernah masuk viewport, dan seluruh test yang menaikkan quantity gagal.
  private async scrollToDetailElement(selector: PlatformSelector): Promise<void> {
    await this.scrollUntilDisplayed(selector, { topRatio: 0.2, heightRatio: 0.6 });
  }

  // Naikkan quantity produk sejumlah `times` kali tap tombol plus. Setiap tap menunggu angka
  // quantity benar-benar bertambah sebelum tap berikutnya - berbasis kondisi, menggantikan
  // browser.pause(300) yang dilarang aturan anti-flaky.
  async increaseQuantity(times: number): Promise<void> {
    await this.scrollToDetailElement(ProductDetailLocators.plusButton);
    for (let i = 0; i < times; i++) {
      const before = Number(await this.readQuantity());
      await this.click(ProductDetailLocators.plusButton);
      await browser.waitUntil(async () => Number(await this.readQuantity()) === before + 1, {
        timeout: 10000,
        timeoutMsg: `Quantity produk tidak berubah menjadi ${before + 1} setelah tap tombol plus`,
      });
    }
  }

  async addToCart(): Promise<void> {
    await this.scrollToDetailElement(ProductDetailLocators.addToCartButton);
    await this.click(ProductDetailLocators.addToCartButton);
  }

  // Buka halaman Cart lewat ikon cart di header (header sama di semua halaman)
  async openCart(): Promise<void> {
    await this.click(ProductDetailLocators.cartIcon);
  }

  // Pilih warna produk lewat swatch warna di bawah rating (dipakai sebelum Add to Cart)
  async selectColor(colorName: string): Promise<void> {
    await this.click(colorSwatchLocator(colorName));
  }

  // Beri rating produk (1-5 bintang); modal konfirmasi "Thank you for submitting your review!" muncul.
  async submitRating(star: 1 | 2 | 3 | 4 | 5): Promise<void> {
    await this.click(ratingStarLocator(star));
  }

  async getReviewConfirmMessage(): Promise<string> {
    return this.getText(ProductDetailLocators.reviewConfirmMessage);
  }

  // Tutup modal konfirmasi review, lalu TUNGGU modal benar-benar hilang sebelum return. Tanpa wait
  // ini, aksi berikutnya (mis. tombol back untuk kembali ke katalog) dikirim saat modal masih dalam
  // animasi menutup, sehingga ditelan oleh modal dan layar tidak pernah berpindah.
  async closeReviewConfirmModal(): Promise<void> {
    await this.click(ProductDetailLocators.reviewConfirmCloseButton);
    await this.waitForNotDisplayed(ProductDetailLocators.reviewConfirmMessage);
  }
}

export default new ProductDetailPage();
