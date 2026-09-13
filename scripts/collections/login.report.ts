import { createRuntime, writeReportData } from '../lib/report-client';
import LoginPage from '../../pages/login.page';
import { LoginLocators } from '../../locators/login.locators';
import { validUser, lockedOutUser, loginErrors, platformText } from '../../utils/test-data';

// Menjalankan & merekam seluruh Test Case dari tests/login/login.spec.ts (Fitur Login, TS001) memakai
// page object & data yang sama persis dengan spec tersebut, supaya laporan yang dihasilkan sinkron
// dengan test script yang sesungguhnya.
async function main() {
  const rt = await createRuntime('login');
  const { client } = rt;

  // Field login diisi satu per satu (bukan lewat LoginPage.login()) supaya laporan punya bukti visual
  // per langkah. Selector-nya diambil dari LoginLocators - sumber yang sama persis dengan yang dipakai
  // LoginPage, jadi laporan ikut berubah otomatis saat locator app berubah. Aksi selebihnya
  // (openLoginScreen, login, logout, isLoggedIn) tetap 100% memanggil LoginPage asli.

  // TS001/TC001 - Login dengan akun valid
  await rt.runCase('TC001', async () => {
    const caseId = 'TC001';
    rt.startCase(caseId, 'TS001/TC001', 'Login dengan akun valid');
    await rt.captureStep(caseId, 'Kondisi awal aplikasi (halaman Catalog, belum login)');

    await LoginPage.openLoginScreen();
    await rt.captureStep(caseId, 'Buka menu, lalu pilih "Log In"');

    await rt.typeInto(LoginLocators.usernameInput, validUser.username);
    await rt.typeInto(LoginLocators.passwordInput, validUser.password);
    await rt.captureStep(caseId, `Isi username (${validUser.username}) & password`);

    // LoginPage.submit() (BUKAN tap manual ke tombol) - di iOS method ini juga menunggu & menutup
    // dialog sistem "Save Password?" yang muncul setelah login berhasil; tap manual + pause tetap
    // membuat isLoggedIn() sesudahnya race condition kalau dialog itu belum sempat ditutup.
    await LoginPage.submit();
    await rt.captureStep(caseId, 'Klik tombol Login -> berhasil, kembali ke halaman Catalog');

    const loggedIn = await LoginPage.isLoggedIn();
    rt.verify(caseId, 'Status login setelah submit akun valid', 'true', String(loggedIn));
  });

  // TS001/TC002 - Login dengan akun locked out.
  //
  // ANDROID SAJA - sama seperti tests/login/login.spec.ts: app iOS tidak punya akun locked out sama
  // sekali (semua akun tersimpan, termasuk yang locked out di Android, berhasil login begitu saja di
  // iOS). Di-skip dengan kondisi yang SAMA PERSIS dengan spec asli, bukan cuma "dilewati diam-diam",
  // supaya laporan iOS tidak mencatat case yang memang tidak berlaku sebagai FAIL/dilewati tanpa
  // alasan.
  if (!client.isIOS) {
    await rt.runCase('TC002', async () => {
      const caseId = 'TC002';
      rt.startCase(caseId, 'TS001/TC002', 'Login dengan akun locked out');

      // LoginPage.openLoginScreen() otomatis logout dulu jika sesi masih login (lihat TC001 di atas)
      await LoginPage.openLoginScreen();
      await rt.captureStep(caseId, 'Buka menu, lalu pilih "Log In" (sesi sebelumnya di-logout otomatis)');

      await rt.typeInto(LoginLocators.usernameInput, lockedOutUser.username);
      await rt.typeInto(LoginLocators.passwordInput, lockedOutUser.password);
      await rt.captureStep(caseId, `Isi username (${lockedOutUser.username}) & password akun locked out`);

      await LoginPage.submit();
      await rt.captureStep(caseId, 'Klik tombol Login -> tampil pesan error locked out');

      const passwordError = await LoginPage.getPasswordError();
      rt.verify(caseId, 'Pesan error akun locked out', 'Sorry this user has been locked out.', passwordError);
      const loggedIn = await LoginPage.isLoggedIn();
      rt.verify(caseId, 'Status login setelah submit akun locked out', 'false', String(loggedIn));
    });
  }

  // TS001/TC003 - Validasi field username kosong
  await rt.runCase('TC003', async () => {
    const caseId = 'TC003';
    rt.startCase(caseId, 'TS001/TC003', 'Validasi field username kosong');

    await LoginPage.openLoginScreen();
    await rt.typeInto(LoginLocators.usernameInput, '');
    await rt.typeInto(LoginLocators.passwordInput, validUser.password);
    await rt.captureStep(caseId, 'Buka layar Login, kosongkan username, isi password, lalu submit');

    await LoginPage.submit();
    await rt.captureStep(caseId, 'Klik tombol Login -> tampil pesan error validasi username');

    const usernameError = await LoginPage.getUsernameError();
    rt.verify(caseId, 'Pesan error username kosong', 'Username is required', usernameError);
  });

  // TS001/TC004 - Validasi field password kosong
  await rt.runCase('TC004', async () => {
    const caseId = 'TC004';
    rt.startCase(caseId, 'TS001/TC004', 'Validasi field password kosong');

    await LoginPage.openLoginScreen();
    await rt.typeInto(LoginLocators.usernameInput, validUser.username);
    await rt.typeInto(LoginLocators.passwordInput, '');
    await rt.captureStep(caseId, 'Buka layar Login, isi username, kosongkan password, lalu submit');

    await LoginPage.submit();
    await rt.captureStep(caseId, 'Klik tombol Login -> tampil pesan error validasi password');

    const passwordError = await LoginPage.getPasswordError();
    rt.verify(caseId, 'Pesan error password kosong', platformText(loginErrors.passwordRequired), passwordError);
  });

  // TS001/TC005 (Sub Fitur: Logout) - Logout dari aplikasi setelah login
  await rt.runCase('TC005', async () => {
    const caseId = 'TC005';
    rt.startCase(caseId, 'TS001/TC005', 'Logout dari aplikasi setelah login');

    await LoginPage.login(validUser.username, validUser.password);
    await client.pause(4000);
    await rt.captureStep(caseId, 'Login dengan akun valid sebagai precondition');

    await LoginPage.logout();
    await rt.captureStep(caseId, 'Buka menu, klik Log Out, lalu konfirmasi pada dialog');

    const loggedIn = await LoginPage.isLoggedIn();
    rt.verify(caseId, 'Status login setelah logout', 'false', String(loggedIn));
  });

  const data = await rt.finish();
  await writeReportData('login', data);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
