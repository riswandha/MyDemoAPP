import BasePage from './base.page';
import { CheckoutCompleteLocators } from '../locators/checkout.locators';

// CheckoutCompletePage = Page Object untuk halaman "Checkout Complete" (tampil setelah Place Order sukses).
class CheckoutCompletePage extends BasePage {
  async getCompleteTitle(): Promise<string> {
    return this.getText(CheckoutCompleteLocators.completeTitle);
  }

  async isCheckoutComplete(): Promise<boolean> {
    return this.isDisplayed(CheckoutCompleteLocators.completeTitle);
  }
}

export default new CheckoutCompletePage();
