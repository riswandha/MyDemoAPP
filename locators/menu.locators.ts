import { androidOnly, NOT_APPLICABLE, TODO_IOS, PlatformSelector } from './types';

// Locator untuk Fitur Menu (TS005): Webview, Drawing, Reset App State, About.
// Selector Android dari inspeksi UI di device. Item drawer menu (selain Log In/Log Out) tidak punya
// content-desc sendiri, jadi diakses lewat resourceId "itemTV" + kecocokan teks persis (lihat
// menuItemLocator).
//
// Selector iOS dari inspeksi page source di simulator iPhone 17 Pro / iOS 26.5 - bukan tebakan.
//
// PERBEDAAN STRUKTUR PENTING: Android membuka item-item ini lewat DRAWER (hamburger menu di header).
// iOS TIDAK PUNYA drawer sama sekali - item yang sama diakses lewat tab bar bawah "More" yang
// menampilkan LIST layar penuh. Perbedaan ini tetap bisa lewat SATU titik percabangan locator biasa
// (menuIcon) tanpa mengubah alur openMenuItem() di menu.page.ts sama sekali: di Android menuIcon
// membuka drawer, di iOS menuIcon (~More-tab-item) berpindah ke tab More - hasil akhirnya sama,
// "kondisi siap tap item menu berdasarkan label".
export const MenuLocators = {
  menuIcon: { android: '~View menu', ios: '~More-tab-item' },

  // ===== Webview =====
  webviewUrlInput: {
    android: 'android=new UiSelector().resourceId("com.saucelabs.mydemoapp.android:id/urlET")',
    // Tidak ada resource-id/accessibility-id (sama seperti field Address/Payment di Checkout) - hanya
    // ada SATU text field di layar ini, aman dipilih lewat class chain tanpa index.
    ios: '-ios class chain:**/XCUIElementTypeTextField',
  },
  webviewGoButton: { android: '~Tap to view content of given url', ios: '~Go To Site' },
  // iOS TIDAK PERNAH menampilkan pesan validasi ini - lihat catatan lengkap di webviewUrlError di bawah.
  webviewUrlError: {
    android: 'android=new UiSelector().resourceId("com.saucelabs.mydemoapp.android:id/urlErrorTV")',
    // LIMITASI/PERBEDAAN PERILAKU APP iOS (bukan bug locator - sudah diverifikasi berkali-kali lewat
    // page source dump, ditunggu sampai 10 detik, byte page source-nya persis sama sepanjang waktu):
    // Android memvalidasi format URL secara SINKRON sebelum navigasi (menampilkan urlErrorTV inline di
    // form yang sama bila input tidak punya titik/domain sama sekali). iOS TIDAK melakukan validasi
    // client-side apa pun - form URL langsung ditinggalkan begitu "Go To Site" ditekan (valid maupun
    // tidak), dan untuk input yang bukan URL sungguhan (mis. "saucelabs" tanpa domain), WKWebView-nya
    // gagal me-resolve tapi app TIDAK PERNAH menangani kegagalan itu - layar macet permanen di overlay
    // "Loading ..." (StaticText accessibility id sama persis, dipakai sebagai locator di sini).
    // Diverifikasi kontras: url VALID ("https://www.saucelabs.com") sukses memuat halaman sungguhan
    // (page source melonjak ke ~210KB berisi konten SauceLabs) dalam <2 detik, sedangkan url invalid
    // tetap di overlay Loading 8291 byte tanpa perubahan sama sekali walau ditunggu lebih lama. Karena
    // itu, nilai TEKS yang diharapkan test ("invalidWebviewUrlError" di utils/test-data.ts) juga beda
    // per platform lewat platformText() - Android mengharapkan pesan validasi, iOS mengharapkan teks
    // "Loading ..." (bukti bahwa navigasi macet, bukan berhasil).
    ios: '~Loading ...',
  },
  webviewContent: {
    android: 'android=new UiSelector().resourceId("com.saucelabs.mydemoapp.android:id/webView")',
    ios: NOT_APPLICABLE, // iOS: tidak dipakai - isWebviewContentDisplayed() cukup mengandalkan webviewUrlInput menghilang, sama seperti Android.
  },
  // HANYA iOS - tombol back di HEADER, dipakai MenuPage.returnToCatalog() untuk keluar dari layar
  // Webview (form MAUPUN konten - keduanya push terpisah: List More -> Form URL -> Konten Webview,
  // diverifikasi butuh DUA kali tap back dari layar Konten untuk sampai ke List, bukan satu). Frame-nya
  // (x=0,y=62,w=50,h=60) IDENTIK di layar Webview/Drawing/About manapun (header sama di semua layar
  // push dari list More), jadi nama locator ini generik "menuScreenBackButton", bukan spesifik
  // Webview. Tombol ini tidak punya accessibility name, dan container layarnya (mis. "Webview-screen")
  // KEHILANGAN name-nya begitu WKWebView berhasil memuat konten (diverifikasi: pola class chain
  // scoped-by-name seperti ProductDetailLocators.backButton gagal resolve persis karena ini) - jadi
  // TIDAK BISA dipilih lewat class chain berbasis ancestor name seperti pola lain di file ini. Dipilih
  // lewat XPath berbasis KOORDINAT frame (posisi & ukuran tombol back selalu sama persis di semua
  // state) - pengecualian XPath yang sah sesuai aturan CLAUDE.md, sejajar dengan precedent
  // productImageLocator/Cart yang XPath karena class chain tidak sanggup mengekspresikan struktur ini.
  // Filter tipe Button perlu eksplisit karena wrapper Other pembungkusnya kebetulan punya frame identik.
  menuScreenBackButton: {
    android: NOT_APPLICABLE, // Android: driver.back() sudah cukup, tidak butuh locator tombol back manapun.
    ios: '//XCUIElementTypeButton[@x="0" and @y="62" and @width="50" and @height="60"]',
  },
  // HANYA iOS - tab "Catalog" di tab bar bawah, dipakai MenuPage.returnToCatalog().
  catalogTabItem: { android: NOT_APPLICABLE, ios: '~Catalog-tab-item' },

  // ===== Drawing =====
  drawingCanvas: {
    android: 'android=new UiSelector().resourceId("com.saucelabs.mydemoapp.android:id/signature_pad")',
    // Canvas-nya sendiri tidak punya accessibility name (persis seperti limitasi signature_pad di
    // Android - tidak mengekspos state coretan lewat accessibility tree).
    //
    // TIDAK BISA dipilih lewat class chain scoped-by-name seperti pola lain di file ini (mis.
    // aboutVersionText scoped ke "About-screen"): TEMUAN APP - accessibility name "Drawing-screen"
    // ternyata TIDAK menempel di container LAYAR PENUH seperti pada layar About/Webview, melainkan
    // hanya di baris HEADER-nya saja (tinggi 60pt, cuma berisi tombol back + label "More") - beda dari
    // "About-screen"/"Webview-screen" yang benar-benar membungkus seluruh layar. Diverifikasi lewat
    // page source dump: child ke-2 di dalam "Drawing-screen" tidak pernah ada (Drawing-screen cuma
    // punya 2 child: tombol back & StaticText). Karena anchor by-name tidak bisa dipakai, dipilih lewat
    // XPath berbasis KOORDINAT frame (posisi & ukuran canvas tetap di x=16,y=202,w=370,h=412) -
    // pengecualian XPath yang sah sesuai aturan CLAUDE.md, sejajar dengan precedent
    // MenuLocators.menuScreenBackButton. Ada wrapper Image dengan frame identik tapi filter tipe Other
    // menghindarinya.
    ios: '//XCUIElementTypeOther[@x="16" and @y="202" and @width="370" and @height="412"]',
  },
  drawingClearButton: { android: '~Removes anything drawn on pad', ios: '~ClearButton Icons' },
  // Dialog permission storage/media yang kadang muncul saat membuka layar Drawing di Android (dipakai
  // fitur Save). iOS TIDAK PERNAH menampilkan dialog permission ini (diverifikasi lewat page source
  // dump - layar Drawing langsung tampil tanpa overlay apa pun) - elemen ini memang tidak ada di iOS.
  storagePermissionAllowButton: {
    android: 'android=new UiSelector().resourceId("com.android.permissioncontroller:id/permission_allow_button")',
    ios: NOT_APPLICABLE,
  },

  // ===== Reset App State =====
  // iOS: dialog konfirmasi adalah ALERT SISTEM (XCUIElementTypeAlert), bukan dialog custom seperti
  // Android - pola class chain sama persis dengan LoginLocators.validationAlertOkButton (scoped ke
  // dalam Alert supaya tidak bentrok kalau ada tombol lain bernama sama di layar).
  resetAppConfirmButton: {
    android: 'android=new UiSelector().resourceId("android:id/button1").text("RESET APP")',
    ios: "-ios class chain:**/XCUIElementTypeAlert/**/XCUIElementTypeButton[`name == 'RESET APP'`]",
  },
  // iOS: pesan alert kedua ("App State has been reset.") - accessibility id-nya PERSIS sama dengan
  // teks pesan, pola sama seperti ProductDetailLocators.reviewConfirmMessage.
  resetAppDoneMessage: {
    android: 'android=new UiSelector().resourceId("android:id/message").text("App State has been reset.")',
    ios: '~App State has been reset.',
  },
  resetAppDoneOkButton: {
    android: 'android=new UiSelector().resourceId("android:id/button1").text("OK")',
    ios: "-ios class chain:**/XCUIElementTypeAlert/**/XCUIElementTypeButton[`name == 'OK'`]",
  },

  // ===== About =====
  // iOS: teks lengkapnya "Demo App V.01 by <logo> MYDEMOAPP" (satu StaticText utuh, bukan cuma versi
  // seperti Android) - tidak ada accessibility id terpisah untuk versinya saja, jadi dipilih lewat
  // posisi (StaticText ke-2 di dalam container "About-screen", sesudah judul "About "). Nomor versinya
  // sendiri diekstrak dari teks lengkap ini di getAppVersion() (menu.page.ts), bukan di locator.
  // FORMAT VERSI BEDA PLATFORM: Android tiga-bagian (mis. "V.2.1.0"), iOS dua-bagian ("V.01") - lihat
  // regex versi yang sudah disesuaikan di tests/menu/menu.spec.ts.
  aboutVersionText: {
    android: 'android=new UiSelector().resourceId("com.saucelabs.mydemoapp.android:id/versionTV")',
    ios: '-ios class chain:**/XCUIElementTypeOther[`name == "About-screen"`]/XCUIElementTypeStaticText[2]',
  },
  aboutWebsiteLink: {
    android: 'android=new UiSelector().resourceId("com.saucelabs.mydemoapp.android:id/webTV")',
    ios: '~Go to saucelabs.com',
  },
  // HANYA iOS - lihat catatan lengkap perbedaan alur di isExternalBrowserOpened() (menu.page.ts):
  // link ini membuka SFSafariViewController IN-APP (app tetap foreground), bukan browser eksternal
  // terpisah seperti Android, jadi dipakai chrome khas Safari-in-app ("Open in Safari") sebagai bukti
  // linknya benar-benar terbuka, bukan status foreground app yang di iOS tidak pernah berubah.
  aboutSafariOpenButton: { android: NOT_APPLICABLE, ios: '~OpenInSafariButton' },
} satisfies Record<string, PlatformSelector>;

// Item menu (selain Log In/Log Out) berdasarkan label teksnya (mis. "WebView", "Drawing").
//
// iOS: setiap item punya accessibility id bersih berpola "<Label tanpa spasi>-menu-item" (mis.
// "Webview-menu-item", "ResetAppState-menu-item") - TIDAK bisa diturunkan otomatis dari label Android
// (kapitalisasi & spasinya beda, mis. Android "WebView" vs iOS "Webview"), jadi dipetakan eksplisit per
// label yang benar-benar dipakai test (lihat tests/menu/menu.spec.ts). Label lain yang belum dipakai
// test (QR Code Scanner, Report a Bug, dst) sengaja tidak dipetakan - akan lempar error TODO_IOS yang
// jelas kalau suatu saat dipanggil, bukan diam-diam salah.
const IOS_MENU_ITEM_IDS: Partial<Record<string, string>> = {
  WebView: 'Webview-menu-item',
  Drawing: 'Drawing-menu-item',
  'Reset App State': 'ResetAppState-menu-item',
  About: 'About-menu-item',
};

export function menuItemLocator(label: string): PlatformSelector {
  const iosId = IOS_MENU_ITEM_IDS[label];
  return {
    android: `android=new UiSelector().resourceId("com.saucelabs.mydemoapp.android:id/itemTV").text("${label}")`,
    ios: iosId ? `~${iosId}` : TODO_IOS,
  };
}
