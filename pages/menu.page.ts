import BasePage from './base.page';
import { MenuLocators, menuItemLocator } from '../locators/menu.locators';
import { getCurrentPackage } from '../utils/device-helper';
import { APP_PACKAGE_DEFAULT } from '../utils/env';

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
    await driver.execute('mobile: dragGesture', { startX, startY, endX, endY, speed: 1000 });
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

  async getAppVersion(): Promise<string> {
    return this.getText(MenuLocators.aboutVersionText);
  }

  // Beda dengan Webview di menu utama (buka konten di dalam app), link ini membuka browser EKSTERNAL
  // (Intent.ACTION_VIEW) di luar app - diverifikasi langsung di device lewat `dumpsys activity` yang
  // menunjukkan activity berpindah ke package browser device (mis. MIUI Browser), bukan ke layar
  // webView milik app.
  async goToSauceLabsWebsite(): Promise<void> {
    await this.click(MenuLocators.aboutWebsiteLink);
  }

  // Cek apakah browser eksternal berhasil terbuka (current package bukan lagi app "My Demo App").
  // Menunggu berbasis kondisi - polling package aktif sampai berubah - bukan delay tetap: cold start
  // browser bisa jauh lebih lama dari 1,5 detik di device lambat, dan hampir instan di device cepat.
  // Timeout habis = browser memang tidak terbuka, jadi dikembalikan false (bukan error), karena
  // status ini yang justru diassert di spec.
  async isExternalBrowserOpened(timeout = 15000): Promise<boolean> {
    try {
      await driver.waitUntil(async () => (await getCurrentPackage()) !== APP_PACKAGE_DEFAULT, {
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
