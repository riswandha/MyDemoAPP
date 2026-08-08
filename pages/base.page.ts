import { resolvePlatformSelector, type PlatformSelector } from '../locators/types';

// BasePage berisi fungsi-fungsi umum (reusable) yang dipakai di semua page object, supaya tiap page
// object turunan tidak perlu menulis ulang logic interaksi elemen yang sama.
//
// Semua helper interaksi menerima PlatformSelector ({ android, ios }) dan memilih selector yang tepat
// lewat platformLocator() - inilah SATU-SATUNYA tempat percabangan platform, sesuai aturan CLAUDE.md.
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

  // Kecepatan scroll (piksel/detik) yang dikirim ke UiAutomator2. Default bawaan `mobile:
  // scrollGesture` adalah 5000 - cukup cepat untuk memicu FLING pada RecyclerView, yaitu inersia
  // yang membuat daftar terus meluncur setelah jari "diangkat". Akibatnya jarak yang benar-benar
  // ter-scroll BISA JAUH LEBIH BESAR dari `percent` yang diminta, dan satu baris konten terlewat
  // tanpa error apa pun.
  //
  // Itu penyebab kegagalan CI di job API 34 run 31253853848: catalog.spec.ts gagal dengan
  // `indexOf(produk) === -1` - produknya ada di katalog, tapi tidak pernah kebagian terbaca karena
  // scroll melompatinya. Nilai 2000 cukup pelan untuk jadi drag terkontrol tanpa inersia, dan masih
  // jauh lebih cepat daripada menunggu animasi fling selesai.
  private static readonly SCROLL_SPEED = 2000;

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
      speed: BasePage.SCROLL_SPEED,
    })) as unknown as boolean;
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
    viewport?: { topRatio: number; heightRatio: number },
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
    const { width, height } = await driver.getWindowSize();
    await driver.execute('mobile: clickGesture', {
      x: Math.floor(width * xRatio),
      y: Math.floor(height * yRatio),
    });
  }
}
