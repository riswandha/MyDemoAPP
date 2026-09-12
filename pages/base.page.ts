import { resolvePlatformSelector, type PlatformSelector } from '../locators/types';
import { gestures, DEFAULT_SCROLL_AREA, type ScrollArea } from '../utils/gesture-helper';

// BasePage berisi fungsi-fungsi umum (reusable) yang dipakai di semua page object, supaya tiap page
// object turunan tidak perlu menulis ulang logic interaksi elemen yang sama.
//
// Semua helper interaksi menerima PlatformSelector ({ android, ios }) dan memilih selector yang tepat
// lewat platformLocator().
//
// Sesuai aturan CLAUDE.md, percabangan platform TIDAK ditulis berulang di banyak file: seluruhnya
// terpusat di dua tempat saja, sesuai jenis perbedaannya.
//   - Beda SELECTOR elemen  -> resolvePlatformSelector() di locators/types.ts
//   - Beda COMMAND gesture  -> gestures() di utils/gesture-helper.ts
// BasePage hanya memakai keduanya; di kelas ini sendiri tidak ada if/else platform.
export default class BasePage {
  // Pilih selector sesuai platform aktif. Aturan resolusinya sendiri ada di locators/types.ts supaya
  // dipakai bersama dengan script laporan (scripts/lib/report-client.ts) yang jalan di luar runner.
  protected platformLocator(selector: PlatformSelector): string {
    return resolvePlatformSelector(selector, driver.isIOS);
  }

  // Menunggu sampai elemen tampil di layar (dipakai untuk validasi/sinkronisasi)
  async waitForDisplayed(selector: PlatformSelector, timeout = 10000): Promise<void> {
    const element = await $(this.platformLocator(selector));
    await element.waitForDisplayed({ timeout });
  }

  // Menunggu sampai elemen TIDAK lagi tampil - mis. modal/overlay selesai menutup. Penting sebelum
  // mengirim aksi ke layar di belakangnya: selama overlay masih ada, tap maupun tombol back diterima
  // oleh overlay, bukan oleh layar tujuan, dan aksinya hilang tanpa error.
  async waitForNotDisplayed(selector: PlatformSelector, timeout = 10000): Promise<void> {
    const element = await $(this.platformLocator(selector));
    await element.waitForDisplayed({ timeout, reverse: true });
  }

  // Klik elemen: menunggu elemen tampil dulu baru diklik, agar tidak error saat elemen belum ready
  async click(selector: PlatformSelector): Promise<void> {
    const element = await $(this.platformLocator(selector));
    await element.waitForDisplayed();
    await element.click();
  }

  // Mengisi input field (mis. textbox username/password) dengan nilai tertentu.
  //
  // Pengetikannya sendiri didelegasikan ke gesture-helper karena caranya berbeda per platform: di iOS
  // mengetik lewat keyboard software membuat tombol submit tertutup dan form tidak bisa dikirim, jadi
  // di sana teksnya dikirim sebagai input keyboard fisik. Seluruh page object cukup memanggil method
  // ini seperti biasa - tidak ada yang perlu tahu perbedaannya.
  async setValue(selector: PlatformSelector, value: string): Promise<void> {
    const element = await $(this.platformLocator(selector));
    await element.waitForDisplayed();
    await gestures().typeText(element, value);
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
  //
  // Implementasi nyatanya ada di utils/gesture-helper.ts, terpisah per platform. Method di bawah ini
  // sengaja dipertahankan sebagai pembungkus tipis supaya seluruh page object yang sudah ada
  // (catalog.page.ts, login.page.ts, dst) tidak perlu diubah sama sekali saat dukungan iOS masuk.

  // Scroll satu gesture pada area tengah layar; mengembalikan true bila masih bisa scroll lagi.
  // Parameter viewport bisa di-override untuk kasus khusus (mis. area scroll berbeda per halaman).
  protected async scrollGesture(
    direction: 'up' | 'down',
    percent = 0.8,
    viewport?: ScrollArea,
  ): Promise<boolean> {
    return gestures().scroll(direction, percent, viewport ?? DEFAULT_SCROLL_AREA);
  }

  // Scroll berulang sampai elemen TARGET benar-benar tampil, lalu berhenti. Mengembalikan status
  // akhir apakah elemen tampil.
  //
  // Dipakai menggantikan pola "scroll sekali lalu berharap" - sekali gesture cukup di satu ukuran
  // layar tapi belum tentu di layar/versi Android lain, dan memakai elemen LAIN sebagai penanda
  // (mis. menunggu tombol Add to Cart padahal yang mau di-tap tombol plus) bisa berhenti terlalu
  // dini saat elemen yang dituju masih di luar viewport.
  //
  // Berhenti pada tiga kondisi, jadi tidak pernah loop tak berujung: elemen sudah tampil, device
  // melaporkan tidak bisa scroll lagi, atau batas aman maxScrolls tercapai.
  protected async scrollUntilDisplayed(
    selector: PlatformSelector,
    viewport?: ScrollArea,
    maxScrolls = 10,
  ): Promise<boolean> {
    const visible = () => this.isDisplayed(selector).catch(() => false);
    if (await visible()) {
      return true;
    }

    let canScrollMore = true;
    let attempts = 0;
    while (canScrollMore && attempts < maxScrolls) {
      canScrollMore = await this.scrollGesture('down', 0.8, viewport);
      attempts++;
      if (await visible()) {
        return true;
      }
    }
    return visible();
  }

  // Tap pada titik relatif terhadap ukuran layar (0..1). Dipakai mis. menutup drawer dengan menekan
  // area scrim di luar drawer - BUKAN driver.back() yang bisa keluar dari activity di device fisik.
  protected async tapAtRatio(xRatio: number, yRatio: number): Promise<void> {
    await gestures().tapAtRatio(xRatio, yRatio);
  }

  // Klik tombol lanjut (CTA) pada form checkout (Address/Payment) yang barusan diisi banyak field.
  //
  // HANYA relevan di iOS: form ini TERBUKTI TIDAK SELALU menutup keyboard software sendiri setelah
  // field terakhir diisi - perilakunya flaky (diverifikasi lewat run berulang di device yang sama:
  // kadang keyboard langsung hilang, kadang tetap terbuka dan menutupi CTA-nya sepenuhnya). Tap ke
  // elemen netral (judul layar "Checkout", lewat `dismissBySelector`) terbukti selalu berhasil
  // menutup keyboard kalau memang masih terbuka - dicoba ulang sampai CTA benar-benar `displayed`,
  // BUKAN delay tetap, supaya tidak menambah waktu di kondisi normal (keyboard sudah tertutup) dan
  // tetap andal di kondisi flaky (keyboard masih terbuka). Android tidak pernah butuh percobaan
  // ulang - CTA-nya langsung `displayed` di percobaan pertama sehingga loop berhenti seketika.
  protected async clickCheckoutCta(
    ctaSelector: PlatformSelector,
    dismissBySelector: PlatformSelector,
    maxAttempts = 5,
  ): Promise<void> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const cta = await $(this.platformLocator(ctaSelector));
      if (await cta.isDisplayed().catch(() => false)) {
        await cta.click();
        return;
      }
      if (driver.isIOS) {
        await this.click(dismissBySelector);
      }
    }
    // Percobaan terakhir: biarkan click() melempar error "tidak displayed" yang jelas, bukan gagal senyap.
    await this.click(ctaSelector);
  }

}
