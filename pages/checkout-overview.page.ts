import BasePage from './base.page';
import { CheckoutOverviewLocators } from '../locators/checkout.locators';

// CheckoutOverviewPage = Page Object untuk Checkout Step 3 (Review Order), halaman terakhir sebelum
// submit pesanan. Total di halaman ini sudah termasuk biaya pengiriman tetap yang ditambahkan
// otomatis oleh app (lihat SHIPPING_FEE di utils/test-data.ts), jadi bukan exact match dengan subtotal
// di halaman Cart, hanya harga satuan & quantity yang harus tetap sama.
class CheckoutOverviewPage extends BasePage {
  async getItemTitle(): Promise<string> {
    return this.getText(CheckoutOverviewLocators.itemTitle);
  }

  async getItemPrice(): Promise<string> {
    return this.getText(CheckoutOverviewLocators.itemPrice);
  }

  async getItemsCount(): Promise<string> {
    return this.getText(CheckoutOverviewLocators.itemsCountText);
  }

  async getTotalAmount(): Promise<string> {
    return this.getText(CheckoutOverviewLocators.totalAmountText);
  }

  async placeOrder(): Promise<void> {
    await this.click(CheckoutOverviewLocators.placeOrderButton);
  }
}

export default new CheckoutOverviewPage();
