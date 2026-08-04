import BasePage from './base.page';
import { CheckoutAddressLocators } from '../locators/checkout.locators';

export interface ShippingAddress {
  fullName: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  region: string;
  zipCode: string;
  country: string;
}

// CheckoutAddressPage = Page Object untuk Checkout Step 1 (form alamat pengiriman).
class CheckoutAddressPage extends BasePage {
  async fillAddress(address: ShippingAddress): Promise<void> {
    await this.setValue(CheckoutAddressLocators.fullNameInput, address.fullName);
    await this.setValue(CheckoutAddressLocators.addressLine1Input, address.addressLine1);
    await this.setValue(CheckoutAddressLocators.addressLine2Input, address.addressLine2);
    await this.setValue(CheckoutAddressLocators.cityInput, address.city);
    await this.setValue(CheckoutAddressLocators.regionInput, address.region);
    await this.setValue(CheckoutAddressLocators.zipCodeInput, address.zipCode);
    await this.setValue(CheckoutAddressLocators.countryInput, address.country);
  }

  async toPayment(): Promise<void> {
    await this.click(CheckoutAddressLocators.toPaymentButton);
  }
}

export default new CheckoutAddressPage();
