import BasePage from './base.page';
import { MenuLocators, menuItemLocator } from '../locators/menu.locators';
import { appId, isAppInForeground, restartAppToInitialState } from '../utils/device-helper';
import { gestures } from '../utils/gesture-helper';

// MenuPage = Page Object untuk item-item drawer menu selain Login/Logout: Webview, Drawing, Reset
// App State, About.
class MenuPage extends BasePage {
  // Buka salah satu item drawer menu (selain Log In/Log Out) berdasarkan label teksnya
  async openMenuItem(label: string): Promise<void> {
    await this.click(MenuLocators.menuIcon);
    await this.click(menuItemLocator(label));
  }

  // ----- Webview -----
  async openWebview(): Promise<void> {
    await this.openMenuItem('WebView');
  }

  async goToUrl(url: string): Promise<void> {
    await this.setValue(MenuLocators.webviewUrlInput, url);
    await this.click(MenuLocators.webviewGoButton);
  }

  async getWebviewUrlError(): Promise<string> {
    return this.getText(MenuLocators.webviewUrlError);
  }

  // Kembali ke halaman Catalog setelah membuka konten Webview - dipanggil sesudah TC001/TC002 supaya
  // TC berikutnya mulai dari state yang jelas (bukan dari dalam layar konten Webview).
  //
  // HANYA di sini alurnya bercabang per platform:
  //   - Android: satu `driver.back()` cukup - hardware back mengeluarkan layar konten Webview dan
  //     kembali ke Catalog.
  //   - iOS: `driver.back()` TERBUKTI TIDAK BEKERJA (temuan berulang di banyak fitur lain). Navigasi
  //     "WebView" di tab More ternyata DUA level (List More -> Form URL -> Konten Webview, PUSH bukan
  //     replace - diverifikasi langsung: satu tap back dari layar Konten hanya kembali ke Form, belum
  //     ke List), jadi tap back diulang (bukan sekali) SAMPAI item list "WebView" kelihatan lagi -
  //     itu satu-satunya sinyal yang benar-benar menandakan sudah di List More (tab bar SENDIRI tidak
  //     cukup: form URL juga masih menampilkan tab bar, cuma layar Konten yang menyembunyikannya).
  //     Mirip pola retry-tolerant BasePage.clickWithKeyboardDismissRetry - tidak bergantung asumsi jumlah level
  //     pasti.
  //
  //     KASUS KHUSUS - url invalid macet permanen di overlay "Loading ..." (lihat catatan
  //     invalidWebviewUrlError di utils/test-data.ts): overlay itu MENUTUPI SEMUA elemen di baliknya
  //     termasuk tombol back ini sendiri (visible=false di accessibility tree, bukan cuma "tidak ada"),
  //     jadi navigasi lewat UI genuinely TIDAK MUNGKIN dari state ini - diverifikasi langsung, tombol
  //     back tidak pernah `displayed` walau ditunggu. Dicek dengan timeout PENDEK (3 detik, bukan
  //     default panjang) supaya tidak menunggu sia-sia; kalau tetap tidak displayed, satu-satunya jalan
  //     keluar adalah restart app (terminate+activate TANPA hapus data - sama seperti
  //     restartAppToInitialState() di device-helper.ts) untuk kembali ke Catalog.
  async returnToCatalog(): Promise<void> {
    if (driver.isIOS) {
      const isAtMoreListRoot = () => this.isDisplayed(menuItemLocator('WebView')).catch(() => false);
      const maxBackTaps = 5;
      for (let attempt = 0; attempt < maxBackTaps && !(await isAtMoreListRoot()); attempt++) {
        const backButton = await $(this.platformLocator(MenuLocators.menuScreenBackButton));
        const canTapBack = await backButton
          .waitForDisplayed({ timeout: 3000 })
          .then(() => true)
          .catch(() => false);
        if (!canTapBack) {
          await restartAppToInitialState();
          return;
        }
        await backButton.click();
      }
      await this.click(MenuLocators.catalogTabItem);
      return;
    }
    await driver.back();
  }

  // Verifikasi navigasi webview berhasil dengan menunggu form input URL (urlET) HILANG dari layar,
  // bukan menunggu elemen "webView" tampil - elemen WebView native kadang tidak stabil terdeteksi
  // lewat UiAutomator2 (hasil observasi langsung di device), sedangkan hilangnya form URL adalah
  // sinyal yang jauh lebih stabil bahwa layar sudah berpindah dari form ke konten.
  async isWebviewContentDisplayed(): Promise<boolean> {
    try {
      const urlInput = await $(this.platformLocator(MenuLocators.webviewUrlInput));
      await urlInput.waitForDisplayed({ timeout: 15000, reverse: true });
      return true;
    } catch {
      return false;
    }
  }

  // ----- Drawing -----
  async openDrawing(): Promise<void> {
    await this.openMenuItem('Drawing');
    // Dismiss dialog permission storage/media kalau muncul (lihat komentar di menu.locators.ts)
    if (await this.isDisplayed(MenuLocators.storagePermissionAllowButton).catch(() => false)) {
      await this.click(MenuLocators.storagePermissionAllowButton);
    }
  }

  // Buat coretan sederhana di canvas dengan gesture swipe, supaya ada "gambar" sebelum di-clear
  async drawStroke(): Promise<void> {
    const canvas = await $(this.platformLocator(MenuLocators.drawingCanvas));
    const location = await canvas.getLocation();
    const size = await canvas.getSize();
    const startX = location.x + Math.floor(size.width * 0.3);
    const startY = location.y + Math.floor(size.height * 0.5);
    const endX = location.x + Math.floor(size.width * 0.7);
    const endY = startY;
    await gestures().drag(startX, startY, endX, endY);
  }

  async clearDrawing(): Promise<void> {
    await this.click(MenuLocators.drawingClearButton);
  }

  async isDrawingCanvasDisplayed(): Promise<boolean> {
    return this.isDisplayed(MenuLocators.drawingCanvas);
  }

  // ----- Reset App State -----
  async resetAppState(): Promise<void> {
    await this.openMenuItem('Reset App State');
    await this.click(MenuLocators.resetAppConfirmButton);
  }

  async getResetAppDoneMessage(): Promise<string> {
    return this.getText(MenuLocators.resetAppDoneMessage);
  }

  async confirmResetAppDone(): Promise<void> {
    await this.click(MenuLocators.resetAppDoneOkButton);
  }

  // ----- About -----
  async openAbout(): Promise<void> {
    await this.openMenuItem('About');
  }

  // Teks lengkap accessibility-nya beda per platform (Android hanya berisi versi, iOS berisi kalimat
  // utuh "Demo App V.01 by MYDEMOAPP") - diekstrak lewat regex yang sama di kedua platform, bukan
  // percabangan platform: untuk Android ekstraksi ini no-op (teksnya memang sudah persis "V.x.x.x"),
  // untuk iOS ekstraksi ini mengambil hanya bagian "V.01"-nya. Format versinya sendiri juga beda
  // panjang (Android 3-bagian, iOS 2-bagian) - regex di sini maupun assertion di spec sengaja tidak
  // mengasumsikan jumlah bagian tertentu.
  async getAppVersion(): Promise<string> {
    const rawText = await this.getText(MenuLocators.aboutVersionText);
    const match = rawText.match(/V\.\d+(?:\.\d+)*/);
    if (!match) {
      throw new Error(`Teks versi app tidak dikenali formatnya: "${rawText}"`);
    }
    return match[0];
  }

  // Android: link ini membuka browser EKSTERNAL (Intent.ACTION_VIEW) di luar app - diverifikasi
  // langsung di device lewat `dumpsys activity` yang menunjukkan activity berpindah ke package browser
  // device (mis. MIUI Browser), bukan ke layar webView milik app.
  async goToSauceLabsWebsite(): Promise<void> {
    await this.click(MenuLocators.aboutWebsiteLink);
  }

  // Cek apakah link website berhasil membuka browser.
  //
  // HANYA di sini alurnya benar-benar bercabang per platform (bukan cuma selector), karena mekanisme
  // browsernya sendiri beda secara fundamental - diverifikasi langsung di device, bukan asumsi:
  //   - Android: `Go to saucelabs.com` membuka browser EKSTERNAL (app lain, terpisah dari proses My
  //     Demo App) - app pindah ke BACKGROUND, terdeteksi lewat `isAppInForeground(appId())` yang jadi
  //     false. Ini command lintas platform yang sama dipakai `waitForAppInForeground()` di
  //     device-helper.ts.
  //   - iOS: link yang SAMA membuka SFSafariViewController IN-APP (modal Safari yang tetap berjalan di
  //     dalam proses My Demo App) - `queryAppState` TETAP 4 (foreground) sepanjang waktu, diverifikasi
  //     lewat polling berulang selama 6 detik setelah tap, jadi status foreground TIDAK BISA dipakai
  //     sebagai sinyal di iOS. Sinyal yang benar adalah kemunculan chrome khas Safari-in-app (tombol
  //     "Open in Safari", accessibility id "OpenInSafariButton") di accessibility tree.
  //
  // Menunggu berbasis kondisi (bukan delay tetap): cold start browser/Safari view bisa jauh lebih lama
  // di device lambat, dan hampir instan di device cepat. Timeout habis = browser memang tidak terbuka,
  // jadi dikembalikan false (bukan error), karena status ini yang justru diassert di spec.
  async isExternalBrowserOpened(timeout = 15000): Promise<boolean> {
    if (driver.isIOS) {
      try {
        const safariOpenButton = await $(this.platformLocator(MenuLocators.aboutSafariOpenButton));
        await safariOpenButton.waitForDisplayed({ timeout });
        return true;
      } catch {
        return false;
      }
    }

    try {
      await driver.waitUntil(async () => !(await isAppInForeground(appId())), {
        timeout,
        interval: 300,
      });
      return true;
    } catch {
      return false;
    }
  }
}

export default new MenuPage();
