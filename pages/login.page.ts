import BasePage from './base.page';
import { LoginLocators } from '../locators/login.locators';

// LoginPage = Page Object untuk layar Login pada app "My Demo App" (com.saucelabs.mydemoapp.android).
class LoginPage extends BasePage {
  // Buka drawer menu lalu tunggu isinya benar-benar ter-render, ditandai munculnya item "Log In"
  // (kondisi belum login) ATAU "Log Out" (kondisi sudah login) - salah satunya PASTI ada di kedua
  // kondisi. Menunggu kondisi elemen, bukan delay tetap: selama drawer masih beranimasi, pembacaan
  // isDisplayed() bisa mengembalikan false padahal itemnya sebentar lagi muncul, dan pemanggilnya
  // salah menyimpulkan status login.
  private async openDrawer(): Promise<void> {
    await this.click(LoginLocators.menuIcon);
    await driver.waitUntil(
      async () =>
        (await this.isDisplayed(LoginLocators.logoutMenuItem).catch(() => false)) ||
        (await this.isDisplayed(LoginLocators.loginMenuItem).catch(() => false)),
      {
        timeout: 10000,
        interval: 200,
        timeoutMsg: 'Drawer menu tidak terbuka: item "Log In"/"Log Out" tidak muncul dalam 10 detik.',
      },
    );
  }

  // Buka drawer menu lalu pilih "Log In" untuk masuk ke layar login.
  // Karena state app persist antar test run (noReset), kalau session sebelumnya masih dalam kondisi
  // login, logout dulu supaya spec ini bisa jalan sendiri dari kondisi apa pun (independen dari
  // urutan/hasil test lain).
  async openLoginScreen(): Promise<void> {
    await this.openDrawer();
    if (await this.isDisplayed(LoginLocators.logoutMenuItem)) {
      await this.click(LoginLocators.logoutMenuItem);
      await this.click(LoginLocators.logoutConfirmButton);
      await this.openDrawer();
    }
    await this.click(LoginLocators.loginMenuItem);
  }

  // Aksi login lengkap: buka menu -> pilih Log In -> isi username & password -> klik tombol Login
  async login(username: string, password: string): Promise<void> {
    await this.openLoginScreen();
    await this.setValue(LoginLocators.usernameInput, username);
    await this.setValue(LoginLocators.passwordInput, password);
    await this.click(LoginLocators.loginButton);
  }

  // Aksi logout lengkap: buka menu -> pilih Log Out -> konfirmasi pada dialog "Are you sure..."
  async logout(): Promise<void> {
    await this.click(LoginLocators.menuIcon);
    await this.click(LoginLocators.logoutMenuItem);
    await this.click(LoginLocators.logoutConfirmButton);
  }

  // Pesan error validasi field username kosong ("Username is required")
  async getUsernameError(): Promise<string> {
    return this.getText(LoginLocators.usernameErrorText);
  }

  // Pesan error di field password: validasi kosong ("Enter Password") atau akun locked out
  // ("Sorry this user has been locked out.") tergantung skenario
  async getPasswordError(): Promise<string> {
    return this.getText(LoginLocators.passwordErrorText);
  }

  // Mengecek status login dengan membuka drawer menu, lalu menutupnya lagi dengan tap area scrim
  // (bagian gelap di luar drawer), BUKAN driver.back() - back() kadang keluar dari activity/app
  // sepenuhnya alih-alih cuma menutup drawer (device fisik), yang bikin elemen berikutnya
  // (mis. click(menuIcon) di test/openLoginScreen selanjutnya) gagal ditemukan.
  // Return true jika item "Log Out" tampil (= sudah login).
  async isLoggedIn(): Promise<boolean> {
    await this.openDrawer();
    const loggedIn = await this.isDisplayed(LoginLocators.logoutMenuItem);

    // Tunggu drawer benar-benar tertutup sebelum method ini selesai: selama drawer/scrim masih ada,
    // tap berikutnya diterima oleh overlay dan hilang tanpa error. Penanda yang ditunggu adalah item
    // yang tadi memang tampil (openDrawer() menjamin salah satunya ada), jadi hilangnya item itu =
    // drawer sudah menutup.
    await this.tapAtRatio(0.9, 0.3);
    await this.waitForNotDisplayed(loggedIn ? LoginLocators.logoutMenuItem : LoginLocators.loginMenuItem);

    return loggedIn;
  }
}

// Export sebagai instance tunggal (singleton) agar bisa langsung dipakai di semua test spec
// tanpa perlu `new LoginPage()` berulang kali
export default new LoginPage();
