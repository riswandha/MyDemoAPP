import BasePage from './base.page';
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

  async getQuantity(): Promise<string> {
    return this.getText(ProductDetailLocators.quantityText);
  }

  // Tombol quantity & Add to cart kadang berada di bawah layar (di luar viewport awal) sampai gambar
  // produk selesai dimuat, sehingga bounds-nya belum ter-render; scroll dulu kalau memang belum
  // kelihatan supaya elemen bisa ditemukan & di-tap dengan benar.
  private async scrollToAddToCartSectionIfNeeded(): Promise<void> {
    if (await this.isDisplayed(ProductDetailLocators.addToCartButton)) {
      return;
    }
    // Area scroll khusus halaman detail (mulai dari 20% tinggi, tinggi 60%) supaya bagian bawah
    // (tombol qty & Add to Cart) terbawa masuk viewport.
    await this.scrollGesture('down', 0.8, { topRatio: 0.2, heightRatio: 0.6 });
  }

  // Naikkan quantity produk sejumlah `times` kali tap tombol plus. Beri jeda singkat tiap tap supaya
  // UI (angka quantity) sempat re-render sebelum tap berikutnya/pembacaan nilai.
  async increaseQuantity(times: number): Promise<void> {
    await this.scrollToAddToCartSectionIfNeeded();
    for (let i = 0; i < times; i++) {
      await this.click(ProductDetailLocators.plusButton);
      await browser.pause(300);
    }
  }

  async addToCart(): Promise<void> {
    await this.scrollToAddToCartSectionIfNeeded();
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

  async closeReviewConfirmModal(): Promise<void> {
    await this.click(ProductDetailLocators.reviewConfirmCloseButton);
  }
}

export default new ProductDetailPage();
