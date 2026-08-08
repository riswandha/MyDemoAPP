import BasePage from './base.page';
import type { PlatformSelector } from '../locators/types';
import { CartLocators } from '../locators/cart.locators';

// CartPage = Page Object untuk halaman "My Cart".
class CartPage extends BasePage {
  async getItemTitle(): Promise<string> {
    return this.getText(CartLocators.itemTitle);
  }

  async getItemPrice(): Promise<string> {
    return this.getText(CartLocators.itemPrice);
  }

  async getItemQuantity(): Promise<string> {
    return this.getText(CartLocators.itemQuantity);
  }

  async getItemsCount(): Promise<string> {
    return this.getText(CartLocators.itemsCountText);
  }

  // Subtotal (harga satuan x quantity), dipakai sebagai acuan verifikasi harga di halaman Review Order
  async getTotalPrice(): Promise<string> {
    return this.getText(CartLocators.totalPriceText);
  }

  async proceedToCheckout(): Promise<void> {
    await this.click(CartLocators.proceedToCheckoutButton);
  }

  // Naikkan/turunkan quantity item di cart sejumlah `times` kali tap. Tiap tap menunggu angka
  // quantity benar-benar berubah sebelum tap berikutnya - berbasis kondisi, menggantikan
  // browser.pause(300) yang dilarang aturan anti-flaky. Subtotal di-render app bersamaan dengan
  // angka quantity, jadi perubahan angka itu sekaligus menandakan subtotal sudah ikut ter-update.
  async increaseQty(times = 1): Promise<void> {
    await this.changeQty(CartLocators.increaseQtyButton, times, +1);
  }

  async decreaseQty(times = 1): Promise<void> {
    await this.changeQty(CartLocators.decreaseQtyButton, times, -1);
  }

  private async changeQty(button: PlatformSelector, times: number, delta: 1 | -1): Promise<void> {
    for (let i = 0; i < times; i++) {
      const before = Number(await this.getItemQuantity());
      const expected = before + delta;
      await this.click(button);
      await browser.waitUntil(async () => Number(await this.getItemQuantity()) === expected, {
        timeout: 10000,
        timeoutMsg: `Quantity item di cart tidak berubah menjadi ${expected} setelah tap tombol qty`,
      });
    }
  }

  async isEmpty(): Promise<boolean> {
    return this.isDisplayed(CartLocators.noItemsTitle);
  }

  // Hapus satu item dari cart (tombol "Remove" pada kartu item)
  async removeItem(): Promise<void> {
    await this.click(CartLocators.removeItemButton);
  }

  // App pakai noReset (state device persist antar run) dan cart tidak otomatis kosong setelah checkout
  // sukses sampai tombol "Go Shopping" ditekan, jadi sisa item dari run sebelumnya bisa ikut kebawa.
  // Method ini bersihkan cart dulu supaya test checkout independen dari state run lain.
  async clearCart(): Promise<void> {
    while (!(await this.isEmpty())) {
      await this.click(CartLocators.removeItemButton);
    }
  }

  async goShopping(): Promise<void> {
    await this.click(CartLocators.goShoppingButton);
  }
}

export default new CartPage();
