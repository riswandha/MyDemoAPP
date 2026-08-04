import BasePage from './base.page';
import { CheckoutPaymentLocators } from '../locators/checkout.locators';

export interface PaymentDetails {
  cardHolderName: string;
  cardNumber: string;
  expirationDate: string;
  securityCode: string;
}

// CheckoutPaymentPage = Page Object untuk Checkout Step 2 (form metode pembayaran).
class CheckoutPaymentPage extends BasePage {
  async fillPayment(payment: PaymentDetails): Promise<void> {
    await this.setValue(CheckoutPaymentLocators.cardHolderNameInput, payment.cardHolderName);
    await this.setValue(CheckoutPaymentLocators.cardNumberInput, payment.cardNumber);
    await this.setValue(CheckoutPaymentLocators.expirationDateInput, payment.expirationDate);
    await this.setValue(CheckoutPaymentLocators.securityCodeInput, payment.securityCode);
  }

  async reviewOrder(): Promise<void> {
    await this.click(CheckoutPaymentLocators.reviewOrderButton);
  }
}

export default new CheckoutPaymentPage();
