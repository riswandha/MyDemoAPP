import { createRuntime, writeReportData } from '../lib/report-client';
import LoginPage from '../../pages/login.page';
import { validUser, lockedOutUser } from '../../utils/test-data';

// Menjalankan & merekam seluruh Test Case dari tests/login/login.spec.ts (Fitur Login, TS001) memakai
// page object & data yang sama persis dengan spec tersebut, supaya laporan yang dihasilkan sinkron
// dengan test script yang sesungguhnya.
async function main() {
  const rt = await createRuntime('login');
  const { client } = rt;

  // Selector di sini SENGAJA disamakan persis dengan yang dipakai di LoginPage (bukan tebakan),
  // dipakai hanya untuk mengisi field satu-satu supaya laporan punya bukti visual per langkah -
  // aksinya sendiri (openLoginScreen, login, logout, isLoggedIn) tetap 100% memanggil LoginPage asli.
  const usernameInput =
    'android=new UiSelector().resourceId("com.saucelabs.mydemoapp.android:id/nameET")';
  const passwordInput =
    'android=new UiSelector().resourceId("com.saucelabs.mydemoapp.android:id/passwordET")';
  const loginButton = 'android=new UiSelector().resourceId("com.saucelabs.mydemoapp.android:id/loginBtn")';

  // TS001/TC001 - Login dengan akun valid
  {
    const caseId = 'TC001';
    rt.startCase(caseId, 'TS001/TC001', 'Login dengan akun valid');
    await rt.captureStep(caseId, 'Kondisi awal aplikasi (halaman Catalog, belum login)');

    await LoginPage.openLoginScreen();
    await rt.captureStep(caseId, 'Buka menu, lalu pilih "Log In"');

    await client.$(usernameInput).setValue(validUser.username);
    await client.$(passwordInput).setValue(validUser.password);
    await rt.captureStep(caseId, `Isi username (${validUser.username}) & password`);

    await client.$(loginButton).click();
    await client.pause(4000);
    await rt.captureStep(caseId, 'Klik tombol Login -> berhasil, kembali ke halaman Catalog');

    const loggedIn = await LoginPage.isLoggedIn();
    rt.verify(caseId, 'Status login setelah submit akun valid', 'true', String(loggedIn));
  }

  // TS001/TC002 - Login dengan akun locked out
  {
    const caseId = 'TC002';
    rt.startCase(caseId, 'TS001/TC002', 'Login dengan akun locked out');

    // LoginPage.openLoginScreen() otomatis logout dulu jika sesi masih login (lihat TC001 di atas)
    await LoginPage.openLoginScreen();
    await rt.captureStep(caseId, 'Buka menu, lalu pilih "Log In" (sesi sebelumnya di-logout otomatis)');

    await client.$(usernameInput).setValue(lockedOutUser.username);
    await client.$(passwordInput).setValue(lockedOutUser.password);
    await rt.captureStep(caseId, `Isi username (${lockedOutUser.username}) & password akun locked out`);

    await client.$(loginButton).click();
    await rt.captureStep(caseId, 'Klik tombol Login -> tampil pesan error locked out');

    const passwordError = await LoginPage.getPasswordError();
    rt.verify(caseId, 'Pesan error akun locked out', 'Sorry this user has been locked out.', passwordError);
    const loggedIn = await LoginPage.isLoggedIn();
    rt.verify(caseId, 'Status login setelah submit akun locked out', 'false', String(loggedIn));
  }

  // TS001/TC003 - Validasi field username kosong
  {
    const caseId = 'TC003';
    rt.startCase(caseId, 'TS001/TC003', 'Validasi field username kosong');

    await LoginPage.openLoginScreen();
    await client.$(usernameInput).setValue('');
    await client.$(passwordInput).setValue(validUser.password);
    await rt.captureStep(caseId, 'Buka layar Login, kosongkan username, isi password, lalu submit');

    await client.$(loginButton).click();
    await rt.captureStep(caseId, 'Klik tombol Login -> tampil pesan error validasi username');

    const usernameError = await LoginPage.getUsernameError();
    rt.verify(caseId, 'Pesan error username kosong', 'Username is required', usernameError);
  }

  // TS001/TC004 - Validasi field password kosong
  {
    const caseId = 'TC004';
    rt.startCase(caseId, 'TS001/TC004', 'Validasi field password kosong');

    await LoginPage.openLoginScreen();
    await client.$(usernameInput).setValue(validUser.username);
    await client.$(passwordInput).setValue('');
    await rt.captureStep(caseId, 'Buka layar Login, isi username, kosongkan password, lalu submit');

    await client.$(loginButton).click();
    await rt.captureStep(caseId, 'Klik tombol Login -> tampil pesan error validasi password');

    const passwordError = await LoginPage.getPasswordError();
    rt.verify(caseId, 'Pesan error password kosong', 'Enter Password', passwordError);
  }

  // TS001/TC005 (Sub Fitur: Logout) - Logout dari aplikasi setelah login
  {
    const caseId = 'TC005';
    rt.startCase(caseId, 'TS001/TC005', 'Logout dari aplikasi setelah login');

    await LoginPage.login(validUser.username, validUser.password);
    await client.pause(4000);
    await rt.captureStep(caseId, 'Login dengan akun valid sebagai precondition');

    await LoginPage.logout();
    await rt.captureStep(caseId, 'Buka menu, klik Log Out, lalu konfirmasi pada dialog');

    const loggedIn = await LoginPage.isLoggedIn();
    rt.verify(caseId, 'Status login setelah logout', 'false', String(loggedIn));
  }

  const data = await rt.finish();
  await writeReportData('login', data);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
