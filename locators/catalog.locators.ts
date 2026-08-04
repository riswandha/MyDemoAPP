import { androidOnly, PlatformSelector } from './types';

export type SortOption = 'nameAsc' | 'nameDesc' | 'priceAsc' | 'priceDesc';

// Locator untuk Fitur Katalog (TS002). Selector Android dari inspeksi UI di device. iOS = TODO.
export const CatalogLocators = {
  cartIcon: androidOnly('~View cart'),
  // Icon sort di header catalog (buka menu pilihan urutan produk)
  sortIcon: androidOnly('~Shows current sorting order and displays available sorting options'),
  // Nama produk (title) tiap kartu di grid catalog
  titleTexts: androidOnly('android=new UiSelector().resourceId("com.saucelabs.mydemoapp.android:id/titleTV")'),
  // Harga produk tiap kartu di grid catalog
  priceTexts: androidOnly('android=new UiSelector().resourceId("com.saucelabs.mydemoapp.android:id/priceTV")'),
} satisfies Record<string, PlatformSelector>;

// ===== Locator dinamis (dibentuk dari argumen) =====

// Kartu produk di katalog: TextView judul (titleTV) sendiri tidak clickable, yang clickable adalah
// ImageView (productIV) di sampingnya. XPath ini cari ImageView yang punya sibling TextView dengan
// teks PERSIS sama dengan nama produk, supaya "Sauce Labs Backpack" tidak ikut men-select varian
// warna seperti "Sauce Labs Backpack (green)".
export function productImageLocator(productName: string): PlatformSelector {
  return androidOnly(
    `//android.widget.ImageView[following-sibling::android.widget.TextView[@text="${productName}"]]`,
  );
}

// Selector tiap opsi di menu Sort, content-desc diambil dari hasil inspeksi dialog sort di device
export function sortOptionLocator(option: SortOption): PlatformSelector {
  const androidSelectors: Record<SortOption, string> = {
    nameAsc: '~Ascending order by name',
    nameDesc: '~Descending order by name',
    priceAsc: '~Ascending order by price',
    priceDesc: '~Descending order by price',
  };
  return androidOnly(androidSelectors[option]);
}
