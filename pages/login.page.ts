import BasePage from './base.page';
import { restartAppToInitialState } from '../utils/device-helper';
import SystemDialogPage from './system-dialog.page';
import { LoginLocators, LoginScreenMarkers } from '../locators/login.locators';

// LoginPage = Page Object untuk Fitur Login app "My Demo App", berlaku untuk Android maupun iOS.
//
// KENAPA FITUR INI PUNYA DUA IMPLEMENTASI ALUR, BUKAN CUKUP DUA SET LOCATOR
// Mekanisme platformLocator() menutup perbedaan yang sifatnya "elemen sama, selector beda". Di fitur
// login perbedaannya lebih dalam dari itu: LANGKAH-LANGKAHNYA sendiri berbeda, dan semuanya sudah
// diverifikasi langsung di device (Android fisik & simulator iPhone 17 Pro / iOS 26.5):
//
//   1. Masuk ke layar Login. Android: buka drawer, dan bila ternyata masih dalam kondisi login harus
//      logout dulu (drawer -> Log Out -> konfirmasi) baru drawer dibuka lagi dan Log In ditekan.
//      iOS: cukup tab "More" lalu satu item menu - item yang sama itu mengantar ke layar Login baik
//      dalam kondisi sudah login (sekaligus melakukan logout) maupun belum. Tidak ada percabangan.
//   2. Mengisi form. iOS wajib menutup keyboard sebelum submit, karena keyboard menutupi tombol Login
//      yang dipatok di bawah layar; Android tidak perlu.
//   3. Membaca pesan error. Android: TextView inline yang menetap di layar. iOS: modal alert yang
//      WAJIB ditutup setelah dibaca, karena selama alert tampil seluruh interaksi berikutnya diblokir.
//   4. Membaca status login. Android: keberadaan item "Log Out" di drawer. iOS: tidak ada elemen yang
//      membedakan kondisi (lihat catatan di locators/login.locators.ts), jadi disimpulkan dari layar.
//   5. Logout. Android: ada dialog konfirmasi. iOS: sekali tap, langsung selesai.
//
// Memaksakan satu alur untuk keduanya hanya akan memindahkan if/else ke dalam setiap method. Karena
// itu polanya disamakan dengan utils/gesture-helper.ts: satu KONTRAK (LoginFlow), dua implementasi,
// dan SATU titik percabangan (flow()). Menambah langkah baru cukup ditulis di kontrak - TypeScript
// yang akan memaksa kedua platform melengkapinya, jadi tidak ada platform yang diam-diam tertinggal.
//
// Kelas LoginPage di bawah tidak berisi logika platform sama sekali; ia hanya merangkai langkah-langkah
// kontrak menjadi aksi yang dipakai test.
interface LoginFlow {
  // Bawa app dari kondisi APA PUN ke layar Login yang siap diisi (termasuk logout lebih dulu bila
  // ternyata sedang dalam kondisi login), supaya tiap test bisa mulai tanpa bergantung test sebelumnya.
  openLoginScreen(): Promise<void>;

  // Isi username & password, lalu siapkan layar supaya tombol submit benar-benar bisa ditekan.
  fillCredentials(username: string, password: string): Promise<void>;

  // Tekan tombol Login.
  submit(): Promise<void>;

  // Logout dari kondisi sudah login, sampai app benar-benar keluar dari sesi.
  logout(): Promise<void>;

  // true bila sedang dalam kondisi login.
  isLoggedIn(): Promise<boolean>;

  // Pesan error untuk field username / password. Di iOS keduanya berasal dari satu alert yang sama,
  // di Android dari dua TextView berbeda - pemanggilnya tidak perlu tahu.
  readUsernameError(): Promise<string>;
  readPasswordError(): Promise<string>;
}

// ===================== ANDROID =====================

class AndroidLoginFlow extends BasePage implements LoginFlow {
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

  // Karena state app persist antar test run (noReset), kalau sesi sebelumnya masih dalam kondisi
  // login, logout dulu supaya spec ini bisa jalan dari kondisi apa pun.
  async openLoginScreen(): Promise<void> {
    await this.openDrawer();
    if (await this.isDisplayed(LoginLocators.logoutMenuItem)) {
      await this.click(LoginLocators.logoutMenuItem);
      await this.click(LoginLocators.logoutConfirmButton);
      await this.openDrawer();
    }
    await this.click(LoginLocators.loginMenuItem);
  }

  // setValue dipakai apa adanya termasuk saat nilainya string kosong: di Android setValue('') menimpa
  // isi field (mengosongkannya), jadi skenario "field dikosongkan" tetap terjamin walau field sempat
  // terisi sisa langkah sebelumnya.
  async fillCredentials(username: string, password: string): Promise<void> {
    await this.setValue(LoginLocators.usernameInput, username);
    await this.setValue(LoginLocators.passwordInput, password);
  }

  async submit(): Promise<void> {
    await this.click(LoginLocators.loginButton);
  }

  async logout(): Promise<void> {
    await this.click(LoginLocators.menuIcon);
    await this.click(LoginLocators.logoutMenuItem);
    await this.click(LoginLocators.logoutConfirmButton);
  }

  // Status login dibaca dengan membuka drawer, lalu menutupnya lagi dengan tap area scrim (bagian
  // gelap di luar drawer), BUKAN driver.back() - back() kadang keluar dari activity/app sepenuhnya
  // alih-alih cuma menutup drawer (device fisik), yang bikin aksi berikutnya gagal menemukan elemen.
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

  async readUsernameError(): Promise<string> {
    return this.getText(LoginLocators.usernameErrorText);
  }

  async readPasswordError(): Promise<string> {
    return this.getText(LoginLocators.passwordErrorText);
  }
}

// ===================== iOS =====================

class IOSLoginFlow extends BasePage implements LoginFlow {
  // Mulai dengan me-restart app - langkah yang TIDAK ada di Android, dan bukan sekadar kehati-hatian.
  //
  // Sebabnya: setelah alert validasi ditutup, field yang tadi diisi merebut fokus lagi dan keyboard
  // software muncul kembali. Keyboard itu menutupi tab bar, sehingga tab "More" tidak bisa ditekan dan
  // test BERIKUTNYA gagal di langkah pertamanya - gagal di tempat yang tidak ada hubungannya dengan
  // penyebabnya. Keyboard-nya sendiri tidak bisa ditutup dari sisi Appium (lihat daftar cara yang
  // sudah dicoba di utils/gesture-helper.ts), dan karena tab bar ikut tertutup, tidak ada jalan keluar
  // lewat navigasi di dalam app. Restart app adalah satu-satunya cara yang tersisa - sekaligus membuat
  // tiap test benar-benar mulai dari layar awal, sesuai aturan independensi test.
  //
  // Jebakan halus yang sempat menyesatkan: selama keyboard menutupi tab bar, tab "More" tetap terbaca
  // isDisplayed() == true karena tepi bawahnya masih menyembul di bawah keyboard. Yang tertutup justru
  // TITIK TENGAHNYA - dan itulah yang ditekan saat click(). Jadi kondisi ini tidak bisa dideteksi
  // dengan pengecekan "displayed" biasa; klik-nya "berhasil" tapi mendarat di keyboard.
  //
  // Sesudah restart, cukup tab "More" lalu satu item menu. Item itu punya accessibility id yang sama
  // untuk kondisi sudah/belum login, dan hasil akhirnya pun sama: berada di layar Login - bedanya
  // hanya, kalau tadinya sedang login, tap itu sekalian me-logout. Jadi tidak ada pengecekan kondisi
  // yang perlu dilakukan di sini (terverifikasi dari kedua kondisi awal di simulator).
  async openLoginScreen(): Promise<void> {
    await restartAppToInitialState();
    await this.click(LoginLocators.menuIcon);
    await this.click(LoginLocators.loginMenuItem);
    await this.waitForDisplayed(LoginScreenMarkers.loginScreen);
  }

  // Skenario "field dikosongkan" di iOS dijalankan dengan TIDAK mengetik apa pun di field itu, bukan
  // dengan mengosongkannya: XCUITest tidak bisa mengosongkan field lewat pengetikan, dan menghapus
  // isinya lewat clearValue() justru memunculkan keyboard yang menutupi tombol Login. Cara ini sah
  // karena layar Login di iOS SELALU dalam keadaan bersih saat dibuka - terverifikasi: keluar dari
  // layar Login lalu masuk lagi mengosongkan kedua field - sementara openLoginScreen() memang selalu
  // masuk lewat jalur itu. Jadi field yang tidak diketik dijamin kosong, bukan sekadar diasumsikan.
  //
  // Tidak ada langkah "tutup keyboard" di sini: setValue() di project ini mengetik sebagai input
  // keyboard fisik saat di iOS, dan iOS otomatis menyingkirkan keyboard software begitu input datang
  // dari sana (lihat utils/gesture-helper.ts).
  async fillCredentials(username: string, password: string): Promise<void> {
    await this.setValue(LoginLocators.usernameInput, username);
    await this.setValue(LoginLocators.passwordInput, password);
  }

  // Menekan Login saja tidak cukup di iOS: begitu login berhasil, SISTEM memunculkan dialog "Save
  // Password?" di atas app. Selama dialog itu tampil, seluruh elemen app terbaca visible=false, jadi
  // langkah apa pun sesudah ini akan gagal dengan pesan yang menyesatkan. Dialog itu ditutup di sini,
  // di tempat ia disebabkan, supaya pemanggil tidak perlu tahu-menahu.
  //
  // Yang ditunggu adalah salah satu dari tiga hasil submit yang mungkin, bukan jeda tetap:
  //   - dialog sistem muncul lalu ditutup   -> login berhasil
  //   - alert validasi app muncul           -> submit ditolak, dan dialog sistem tidak akan muncul
  //   - layar Catalog tampil                -> login berhasil tanpa dialog sistem (mis. sudah pernah
  //                                            dijawab), jadi loop tidak menggantung menunggu dialog
  //                                            yang tidak akan datang
  async submit(): Promise<void> {
    await this.click(LoginLocators.loginButton);

    await driver.waitUntil(
      async () => {
        if (await SystemDialogPage.dismissIosSavePasswordDialog()) {
          return true;
        }
        return (
          (await this.isDisplayed(LoginLocators.validationAlertTitle).catch(() => false)) ||
          (await this.isDisplayed(LoginScreenMarkers.catalogScreen).catch(() => false))
        );
      },
      {
        timeout: 20000,
        interval: 400,
        timeoutMsg: 'Submit login tidak menghasilkan apa pun dalam 20 detik: layar Catalog, alert validasi, maupun dialog sistem tidak muncul.',
      },
    );
  }

  // Sekali tap, tanpa dialog konfirmasi (terverifikasi di simulator). Tujuannya layar Login, jadi itu
  // yang ditunggu sebagai bukti logout benar-benar selesai.
  async logout(): Promise<void> {
    await this.click(LoginLocators.menuIcon);
    await this.click(LoginLocators.logoutMenuItem);
    await this.waitForDisplayed(LoginScreenMarkers.loginScreen);
  }

  // KONTRAK KHUSUS iOS: yang dibaca adalah "app sudah meninggalkan layar Login atau belum", karena
  // tidak ada satu pun elemen di app yang mengekspos status login secara langsung (lihat
  // locators/login.locators.ts). Itu sebabnya method ini bermakna tepat bila dipanggil SETELAH aksi
  // login/logout - persis cara test memakainya - dan bukan sebagai pengecekan status sewaktu-waktu
  // dari layar mana pun (katalog tetap bisa dibuka tanpa login, jadi "bukan di layar Login" di tengah
  // browsing tidak membuktikan apa-apa).
  //
  // Menunggu salah satu dari dua layar tujuan muncul lebih dulu, bukan langsung membaca: submit dan
  // logout sama-sama diikuti animasi perpindahan layar, dan membaca di tengah transisi bisa
  // menghasilkan jawaban yang salah walau app-nya sendiri baik-baik saja.
  async isLoggedIn(): Promise<boolean> {
    // Dialog "Save Password?" bisa menyusul sepersekian detik SETELAH layar Catalog sempat terbaca,
    // jadi submit() tidak selalu kebagian menutupnya. Pengecekan ulang di sini murah (satu panggilan
    // yang langsung gagal-cepat kalau tidak ada dialog) dan menutup celah balapan itu.
    await SystemDialogPage.dismissIosSavePasswordDialog();

    const onLoginScreen = () => this.isDisplayed(LoginScreenMarkers.loginScreen).catch(() => false);

    await driver.waitUntil(
      async () => (await onLoginScreen()) || (await this.isDisplayed(LoginScreenMarkers.catalogScreen).catch(() => false)),
      {
        timeout: 15000,
        interval: 300,
        timeoutMsg: 'Tidak berhasil menentukan status login: layar Login maupun Catalog tidak muncul dalam 15 detik.',
      },
    );

    return !(await onLoginScreen());
  }

  async readUsernameError(): Promise<string> {
    return this.readValidationAlert();
  }

  async readPasswordError(): Promise<string> {
    return this.readValidationAlert();
  }

  // Semua error validasi login di iOS memakai SATU modal alert "Validation Error!" - yang membedakan
  // skenario hanya isi pesannya. Alert-nya ditutup di sini, setelah pesannya dibaca: selama alert
  // masih tampil, seluruh interaksi ke layar di belakangnya diblokir, sehingga test berikutnya akan
  // gagal di tempat yang sama sekali tidak berhubungan dengan penyebabnya.
  private async readValidationAlert(): Promise<string> {
    await this.waitForDisplayed(LoginLocators.validationAlertTitle);
    const message = await this.getText(LoginLocators.usernameErrorText);

    await this.click(LoginLocators.validationAlertOkButton);
    await this.waitForNotDisplayed(LoginLocators.validationAlertTitle);

    return message;
  }
}

// ===================== Page object yang dipakai test =====================

const androidFlow = new AndroidLoginFlow();
const iosFlow = new IOSLoginFlow();

class LoginPage extends BasePage {
  // SATU-SATUNYA percabangan platform di fitur ini - sejajar dengan gestures() untuk gesture dan
  // resolvePlatformSelector() untuk locator.
  private get flow(): LoginFlow {
    return driver.isIOS ? iosFlow : androidFlow;
  }

  // Bawa app ke layar Login yang siap diisi, dari kondisi apa pun.
  async openLoginScreen(): Promise<void> {
    await this.flow.openLoginScreen();
  }

  // Aksi login lengkap: masuk ke layar Login -> isi kredensial -> submit.
  async login(username: string, password: string): Promise<void> {
    await this.flow.openLoginScreen();
    await this.flow.fillCredentials(username, password);
    await this.flow.submit();
  }

  // Aksi logout lengkap (Android: termasuk konfirmasi dialog; iOS: sekali tap).
  async logout(): Promise<void> {
    await this.flow.logout();
  }

  // Pesan error validasi field username. Teksnya sama di kedua platform ("Username is required"),
  // walau sumbernya berbeda (TextView inline vs modal alert).
  async getUsernameError(): Promise<string> {
    return this.flow.readUsernameError();
  }

  // Pesan error di field password. Dipakai untuk dua skenario berbeda: password kosong, dan akun
  // locked out (khusus Android - app iOS tidak punya akun locked out sama sekali). Teks untuk
  // password kosong BERBEDA antar platform, jadi nilai harapannya diambil dari utils/test-data.ts.
  async getPasswordError(): Promise<string> {
    return this.flow.readPasswordError();
  }

  // Status login. Di Android dibaca dari drawer; di iOS disimpulkan dari layar tujuan setelah aksi
  // login/logout - lihat catatan kontrak di IOSLoginFlow.isLoggedIn().
  async isLoggedIn(): Promise<boolean> {
    return this.flow.isLoggedIn();
  }
}

// Export sebagai instance tunggal (singleton) agar bisa langsung dipakai di semua test spec
// tanpa perlu `new LoginPage()` berulang kali
export default new LoginPage();
