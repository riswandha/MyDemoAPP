import { NOT_APPLICABLE, PlatformSelector } from './types';

// Locator untuk Fitur Login (TS001) app "My Demo App".
//
// Selector Android diambil dari inspeksi UI langsung di device (uiautomator dump).
// Selector iOS diambil dari inspeksi page source langsung di simulator iPhone 17 Pro / iOS 26.5
// (bundle com.saucelabs.mydemo.app.ios) - bukan tebakan, setiap selector di bawah sudah diverifikasi
// benar-benar me-resolve ke elemen di device.
//
// PERBEDAAN STRUKTUR ANDROID vs iOS PADA FITUR INI (bukan sekadar beda nama locator, jadi page object
// yang harus menyesuaikan alurnya):
//  1. Navigasi menu: Android pakai drawer (icon hamburger di header), iOS pakai tab bar di bawah
//     ("More"). Karena itu menuIcon menunjuk ke dua jenis elemen yang berbeda perannya.
//  2. Item menu Login/Logout: di iOS SATU elemen dengan accessibility id yang SAMA PERSIS
//     ("LogOut-menu-item") dipakai untuk kedua kondisi - teks yang tampil berubah "Login"/"Log Out",
//     tapi teks itu TIDAK diekspos ke accessibility tree (StaticText-nya 0x0 tanpa value). Akibatnya
//     status login TIDAK bisa dideteksi dari menu di iOS, beda dengan Android yang punya dua id
//     berbeda (Login Menu Item vs Logout Menu Item). Lihat catatan di loginMenuItem/logoutMenuItem.
//  3. Pesan error validasi: Android menampilkannya sebagai TextView inline di bawah field, iOS
//     menampilkannya sebagai MODAL ALERT berjudul "Validation Error!" yang wajib di-dismiss lewat
//     tombol OK sebelum interaksi berikutnya.
//  4. Logout: Android memunculkan dialog konfirmasi, iOS langsung logout sekali tap tanpa konfirmasi.
export const LoginLocators = {
  // Pintu masuk ke menu.
  // Android: icon garis 3 (hamburger) di header untuk membuka drawer.
  // iOS: tab "More" di tab bar bawah - bukan drawer, jadi tidak ada animasi buka/tutup yang perlu
  // ditunggu seperti di Android.
  menuIcon: {
    android: '~View menu',
    ios: '~More-tab-item',
  },

  // Item menu untuk masuk ke layar Login.
  // Android: item "Log In" di dalam drawer, id-nya berbeda dari item Log Out.
  // iOS: id-nya "LogOut-menu-item" walaupun yang tampil tulisan "Login" - id ini SAMA untuk kondisi
  // sudah login maupun belum (lihat logoutMenuItem). Bukan salah ketik.
  loginMenuItem: {
    android: '~Login Menu Item',
    ios: '~LogOut-menu-item',
  },

  // Item menu untuk logout.
  // Android: hanya muncul setelah login berhasil, jadi keberadaannya = penanda status login.
  // iOS: elemen yang sama persis dengan loginMenuItem (id identik, selalu ada di kedua kondisi), jadi
  // TIDAK bisa dipakai sebagai penanda status login. Di iOS status login harus disimpulkan dari layar
  // tujuan setelah submit (Catalog-screen muncul = login sukses, layar Login masih bertahan = gagal).
  logoutMenuItem: {
    android: '~Logout Menu Item',
    ios: '~LogOut-menu-item',
  },

  // Input username di layar login.
  // iOS: field-nya polos - tanpa accessibility id, tanpa label, tanpa placeholder. Prioritas 1
  // (accessibility id) tidak tersedia, jadi turun ke prioritas 2 (selector native iOS) memakai class
  // chain, BUKAN XPath. Aman karena di layar ini hanya ada satu XCUIElementTypeTextField.
  usernameInput: {
    android: 'android=new UiSelector().resourceId("com.saucelabs.mydemoapp.android:id/nameET")',
    ios: '-ios class chain:**/XCUIElementTypeTextField',
  },

  // Input password di layar login.
  // iOS: sama seperti username - polos tanpa id. Dibedakan lewat tipe SecureTextField, dan di layar
  // ini hanya ada satu.
  passwordInput: {
    android: 'android=new UiSelector().resourceId("com.saucelabs.mydemoapp.android:id/passwordET")',
    ios: '-ios class chain:**/XCUIElementTypeSecureTextField',
  },

  // Tombol Login.
  // iOS: sengaja TIDAK memakai '~Login' walaupun accessibility id itu ada, karena judul layar juga
  // bernama "Login" - dua elemen dengan name sama, jadi pencarian by accessibility id ambigu dan
  // urutannya tidak dijamin. Predicate string menyaring sekalian tipenya supaya deterministik.
  loginButton: {
    android: 'android=new UiSelector().resourceId("com.saucelabs.mydemoapp.android:id/loginBtn")',
    ios: "-ios predicate string:type == 'XCUIElementTypeButton' AND name == 'Login'",
  },

  // Pesan error validasi username ("Username is required").
  // Android: TextView inline di bawah field username.
  // iOS: baris pesan (StaticText ke-2) di dalam modal alert "Validation Error!" - StaticText ke-1
  // adalah judul alert-nya. iOS memakai satu alert untuk semua error validasi, jadi selector ini sama
  // dengan passwordErrorText; yang membedakan hanya isi teksnya.
  usernameErrorText: {
    android: 'android=new UiSelector().resourceId("com.saucelabs.mydemoapp.android:id/nameErrorTV")',
    ios: '-ios class chain:**/XCUIElementTypeAlert/**/XCUIElementTypeStaticText[2]',
  },

  // Pesan error di field password.
  // Android: TextView inline, dipakai untuk validasi kosong ("Enter Password") maupun pesan akun
  // locked out ("Sorry this user has been locked out.") - resource-id sama, teks beda per skenario.
  // iOS: baris pesan di dalam modal alert yang sama dengan usernameErrorText.
  passwordErrorText: {
    android: 'android=new UiSelector().resourceId("com.saucelabs.mydemoapp.android:id/passwordErrorTV")',
    ios: '-ios class chain:**/XCUIElementTypeAlert/**/XCUIElementTypeStaticText[2]',
  },

  // Judul modal alert validasi di iOS ("Validation Error!"). Berguna sebagai penanda kondisi untuk
  // explicit wait: menunggu alert benar-benar tampil sebelum membaca pesannya. Android tidak memakai
  // alert untuk validasi login.
  validationAlertTitle: {
    android: NOT_APPLICABLE,
    ios: '-ios class chain:**/XCUIElementTypeAlert/**/XCUIElementTypeStaticText[1]',
  },

  // Tombol OK pada modal alert validasi iOS. WAJIB ditekan setelah membaca pesan error: selama alert
  // masih tampil, seluruh interaksi ke layar di belakangnya diblokir.
  validationAlertOkButton: {
    android: NOT_APPLICABLE,
    ios: "-ios class chain:**/XCUIElementTypeAlert/**/XCUIElementTypeButton[`name == 'OK'`]",
  },

  // Tombol "LOGOUT" pada dialog konfirmasi setelah memilih item Log Out.
  // Hanya ada di Android - iOS langsung logout sekali tap tanpa dialog konfirmasi sama sekali
  // (terverifikasi di simulator), jadi alur logout di page object harus bercabang per platform.
  logoutConfirmButton: {
    android: 'android=new UiSelector().resourceId("android:id/button1")',
    ios: NOT_APPLICABLE,
  },
} satisfies Record<string, PlatformSelector>;

// Penanda LAYAR (bukan elemen yang ditekan), dipakai untuk menyimpulkan status login di iOS.
//
// Kenapa perlu: item menu Login/Log Out di iOS memakai accessibility id yang identik, dan wrapper di
// atasnya pun tetap bernama "Login Button" di kedua kondisi (terverifikasi dengan membandingkan page
// source saat sudah login dan saat belum) - jadi menu benar-benar tidak menyimpan informasi status.
// Satu-satunya sinyal yang tersisa adalah LAYAR TUJUAN setelah submit/logout: pindah ke Catalog =
// sudah login, bertahan/kembali ke layar Login = belum login.
export const LoginScreenMarkers = {
  // Penanda "sedang berada di layar Login". Memakai TOMBOL Login, bukan judulnya: teks "Login" muncul
  // dua kali di layar ini (judul layar + label di dalam tombol), sehingga selector berbasis StaticText
  // ambigu dan match pertamanya justru label di dalam tombol - yang tertutup keyboard saat form diisi,
  // sehingga terbaca visible=false dan penanda ini jadi salah baca. Tipe Button hanya cocok ke satu
  // elemen dan hanya ada di layar ini.
  loginScreen: {
    android: NOT_APPLICABLE,
    ios: "-ios predicate string:type == 'XCUIElementTypeButton' AND name == 'Login'",
  },

  // Container layar Catalog - layar tujuan setelah login berhasil.
  //
  // PENTING: ini penanda TUJUAN, bukan penanda "sudah login". Katalog di app ini tetap bisa dibuka
  // tanpa login, jadi keberadaannya sendiri tidak membuktikan apa pun. Kegunaannya adalah sebagai
  // salah satu dari dua kondisi berhenti saat menunggu transisi setelah submit selesai, supaya status
  // login tidak dibaca saat layar masih di tengah perpindahan.
  catalogScreen: {
    android: NOT_APPLICABLE,
    ios: '~Catalog-screen',
  },
} satisfies Record<string, PlatformSelector>;
