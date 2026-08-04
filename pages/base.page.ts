import type { PlatformSelector } from '../locators/types';

// BasePage berisi fungsi-fungsi umum (reusable) yang dipakai di semua page object, supaya tiap page
// object turunan tidak perlu menulis ulang logic interaksi elemen yang sama.
//
// Semua helper interaksi menerima PlatformSelector ({ android, ios }) dan memilih selector yang tepat
// lewat platformLocator() - inilah SATU-SATUNYA tempat percabangan platform, sesuai aturan CLAUDE.md.
export default class BasePage {
  // Pilih selector sesuai platform aktif. Default ke Android (project ini Android-first). Bila run di
  // iOS tapi locator iOS belum diinspeksi (masih penanda TODO), lempar error jelas alih-alih gagal
  // senyap dengan selector tak valid.
  protected platformLocator(selector: PlatformSelector): string {
    if (driver.isIOS) {
      if (selector.ios.startsWith('TODO(ios)')) {
        throw new Error(
          `Locator iOS belum tersedia (${selector.ios}). Inspeksi elemen di device iOS lalu lengkapi slot ios di file locators/.`,
        );
      }
      return selector.ios;
    }
    return selector.android;
  }

  // Menunggu sampai elemen tampil di layar (dipakai untuk validasi/sinkronisasi)
  async waitForDisplayed(selector: PlatformSelector, timeout = 10000): Promise<void> {
    const element = await $(this.platformLocator(selector));
    await element.waitForDisplayed({ timeout });
  }

  // Klik elemen: menunggu elemen tampil dulu baru diklik, agar tidak error saat elemen belum ready
  async click(selector: PlatformSelector): Promise<void> {
    const element = await $(this.platformLocator(selector));
    await element.waitForDisplayed();
    await element.click();
  }

  // Mengisi input field (mis. textbox username/password) dengan nilai tertentu
  async setValue(selector: PlatformSelector, value: string): Promise<void> {
    const element = await $(this.platformLocator(selector));
    await element.waitForDisplayed();
    await element.setValue(value);
  }

  // Mengambil teks yang tampil dari sebuah elemen (mis. pesan error, label, judul halaman)
  async getText(selector: PlatformSelector): Promise<string> {
    const element = await $(this.platformLocator(selector));
    await element.waitForDisplayed();
    return element.getText();
  }

  // Mengecek apakah elemen sedang tampil di layar, mengembalikan true/false (dipakai untuk assertion)
  async isDisplayed(selector: PlatformSelector): Promise<boolean> {
    const element = await $(this.platformLocator(selector));
    return element.isDisplayed();
  }

  // Ambil banyak elemen sekaligus (mis. semua kartu produk di grid katalog) berdasarkan satu selector.
  // Return type dibiarkan di-infer sebagai chainable WebdriverIO ($$) - caller cukup `await` hasilnya.
  findAll(selector: PlatformSelector) {
    return $$(this.platformLocator(selector));
  }

  // ===== Gesture primitives (dipakai bersama beberapa page object) =====

  // Scroll satu gesture pada area tengah layar; mengembalikan true bila masih bisa scroll lagi.
  // Parameter viewport bisa di-override untuk kasus khusus (mis. area scroll berbeda per halaman).
  protected async scrollGesture(
    direction: 'up' | 'down',
    percent = 0.8,
    viewport?: { topRatio: number; heightRatio: number },
  ): Promise<boolean> {
    const { width, height } = await driver.getWindowSize();
    const topRatio = viewport?.topRatio ?? 0.3;
    const heightRatio = viewport?.heightRatio ?? 0.5;
    return (await driver.execute('mobile: scrollGesture', {
      left: 0,
      top: Math.floor(height * topRatio),
      width,
      height: Math.floor(height * heightRatio),
      direction,
      percent,
    })) as unknown as boolean;
  }

  // Tap pada titik relatif terhadap ukuran layar (0..1). Dipakai mis. menutup drawer dengan menekan
  // area scrim di luar drawer - BUKAN driver.back() yang bisa keluar dari activity di device fisik.
  protected async tapAtRatio(xRatio: number, yRatio: number): Promise<void> {
    const { width, height } = await driver.getWindowSize();
    await driver.execute('mobile: clickGesture', {
      x: Math.floor(width * xRatio),
      y: Math.floor(height * yRatio),
    });
  }
}
