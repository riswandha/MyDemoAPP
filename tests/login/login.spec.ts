import LoginPage from '../../pages/login.page';
import { validUser, lockedOutUser } from '../../utils/test-data';

// Test suite untuk Fitur Login (TS001), mengikuti Test Script Excel: Sub Fitur "Login" (TC001-TC004)
// dan Sub Fitur "Logout" (TC005). Digabung dalam satu file karena keduanya berada di bawah Fitur yang
// sama pada tabel test case.
describe('Login Feature', () => {
  // TS001/TC001 - Login dengan akun valid
  it('should login successfully with valid credentials @smoke @critical', async () => {
    await LoginPage.login(validUser.username, validUser.password);

    const loggedIn = await LoginPage.isLoggedIn();
    expect(loggedIn).toBe(true);
  });

  // TS001/TC002 - Login dengan akun locked out. Pesan error diverifikasi langsung dari device
  // ("Sorry this user has been locked out.", tanpa koma - beda tipis dengan teks di Excel yang pakai
  // koma; acuan = teks app nyata supaya test valid, selisih dicatat sebagai temuan/defect penulisan).
  it('should show error message when login with locked out account @regression @critical', async () => {
    await LoginPage.login(lockedOutUser.username, lockedOutUser.password);

    expect(await LoginPage.getPasswordError()).toBe('Sorry this user has been locked out.');
    expect(await LoginPage.isLoggedIn()).toBe(false);
  });

  // TS001/TC003 - Validasi field username kosong
  it('should show error message when username field is empty @regression', async () => {
    await LoginPage.login('', validUser.password);

    expect(await LoginPage.getUsernameError()).toBe('Username is required');
  });

  // TS001/TC004 - Validasi field password kosong. Excel menulis expected "Password is required", tapi
  // app menampilkan "Enter Password" - acuan = teks app nyata (selisih dicatat sebagai temuan/defect
  // penulisan Excel), supaya test tetap hijau terhadap perilaku app yang sebenarnya.
  it('should show error message when password field is empty @regression', async () => {
    await LoginPage.login(validUser.username, '');

    expect(await LoginPage.getPasswordError()).toBe('Enter Password');
  });

  // TS001/TC005 (Sub Fitur: Logout) - Logout dari aplikasi setelah login
  it('should logout successfully after login @smoke @critical', async () => {
    await LoginPage.login(validUser.username, validUser.password);
    await LoginPage.logout();

    const loggedIn = await LoginPage.isLoggedIn();
    expect(loggedIn).toBe(false);
  });
});
