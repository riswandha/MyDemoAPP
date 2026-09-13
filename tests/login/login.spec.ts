import LoginPage from '../../pages/login.page';
import { validUser, lockedOutUser, loginErrors, platformText } from '../../utils/test-data';

// Test suite untuk Fitur Login (TS001), mengikuti Test Script Excel: Sub Fitur "Login" (TC001-TC004)
// dan Sub Fitur "Logout" (TC005). Digabung dalam satu file karena keduanya berada di bawah Fitur yang
// sama pada tabel test case.
//
// Spec ini berjalan apa adanya di Android maupun iOS - perbedaan alur & locator antar platform
// sepenuhnya ditangani page object (lihat pages/login.page.ts), kecuali satu skenario yang memang
// tidak punya padanan di iOS (TC002, lihat catatannya di bawah).
describe('Login Feature', () => {
  // TS001/TC001 - Login dengan akun valid
  it('should login successfully with valid credentials @smoke @critical', async () => {
    await LoginPage.login(validUser.username, validUser.password);

    const loggedIn = await LoginPage.isLoggedIn();
    expect(loggedIn).toBe(true);
  });

  // TS001/TC002 - Login dengan akun locked out.
  //
  // ANDROID SAJA - bukan test yang di-skip karena gagal, tapi karena fiturnya tidak ada di app iOS.
  // Diverifikasi dua arah di simulator iPhone 17 Pro / iOS 26.5: keempat akun pada daftar username
  // tersimpan (termasuk alice@example.com yang berstatus locked out di Android) semuanya berhasil
  // login, dan tidak ada satu pun string bertema "locked" di dalam binary app iOS. App iOS bahkan
  // menerima kredensial ngawur sekalipun - tidak ada validasi kredensial sama sekali di sisi app.
  // Karena itu tidak ada perilaku apa pun yang bisa diuji di iOS, bukan sekadar beda locator/teks.
  it('should show error message when login with locked out account @regression @critical @android-only', async function () {
    if (driver.isIOS) {
      return this.skip();
    }

    await LoginPage.login(lockedOutUser.username, lockedOutUser.password);

    expect(await LoginPage.getPasswordError()).toBe(loginErrors.lockedOut);
    expect(await LoginPage.isLoggedIn()).toBe(false);
  });

  // TS001/TC003 - Validasi field username kosong
  it('should show error message when username field is empty @regression', async () => {
    await LoginPage.login('', validUser.password);

    expect(await LoginPage.getUsernameError()).toBe(loginErrors.usernameRequired);
  });

  // TS001/TC004 - Validasi field password kosong. Teks yang diharapkan berbeda antar platform (Android
  // "Enter Password", iOS "Password is required"), jadi diambil dari test-data lewat platformText()
  // alih-alih ditulis tetap di sini - alasan lengkapnya ada di utils/test-data.ts.
  it('should show error message when password field is empty @regression', async () => {
    await LoginPage.login(validUser.username, '');

    expect(await LoginPage.getPasswordError()).toBe(platformText(loginErrors.passwordRequired));
  });

  // TS001/TC005 (Sub Fitur: Logout) - Logout dari aplikasi setelah login
  it('should logout successfully after login @smoke @critical', async () => {
    await LoginPage.login(validUser.username, validUser.password);
    await LoginPage.logout();

    const loggedIn = await LoginPage.isLoggedIn();
    expect(loggedIn).toBe(false);
  });
});
