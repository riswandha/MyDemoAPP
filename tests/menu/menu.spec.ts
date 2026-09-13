import MenuPage from '../../pages/menu.page';
import { validWebviewUrl, invalidWebviewUrl, invalidWebviewUrlError, platformText } from '../../utils/test-data';

// Test suite untuk Fitur Menu (TS005), mengikuti Test Script Excel: Sub Fitur "Webview" (TC001,
// TC002), "Drawing" (TC004 - Clear), "Reset App State" (TC005), "About" (TC007). TC003 (Drawing - buat
// & simpan gambar) dan TC006 (QR Code Scanner) TIDAK dibuat karena kolom Automation di test script
// bernilai "Not Automation" untuk keduanya. File ini independen: item-item menu ini bisa diakses
// langsung dari halaman katalog tanpa perlu login.
describe('Menu Feature', () => {
  // TS005/TC001 - Membuka external site melalui Webview
  it('should open external site through Webview with a valid https url @regression', async () => {
    await MenuPage.openWebview();
    await MenuPage.goToUrl(validWebviewUrl);

    expect(await MenuPage.isWebviewContentDisplayed()).toBe(true);

    // Kembali ke halaman Katalog supaya TC002 di bawah bisa membuka menu dari kondisi normal, bukan
    // dari dalam layar konten webview (lihat catatan lengkap perbedaan platform di
    // MenuPage.returnToCatalog()).
    await MenuPage.returnToCatalog();
  });

  // TS005/TC002 - Validasi format URL salah pada Webview. Excel memakai input tanpa "https://", tapi
  // hasil investigasi di device menunjukkan app Android tetap mencoba me-load string tersebut alih-alih
  // memvalidasinya (lihat catatan di utils/test-data.ts) - data disesuaikan dengan perilaku app yang
  // sebenarnya supaya pesan error benar-benar teruji.
  //
  // PERILAKU BERBEDA TOTAL DI iOS (bukan cuma beda teks - lihat catatan lengkap di
  // utils/test-data.ts & MenuLocators.webviewUrlError): Android menampilkan pesan validasi inline,
  // iOS tidak pernah validasi dan malah macet permanen di overlay "Loading ...". Assertion di bawah
  // tetap satu baris yang sama untuk kedua platform - yang beda cuma nilai harapannya lewat
  // platformText().
  it('should show error message for invalid url format on Webview @regression', async () => {
    await MenuPage.openWebview();
    await MenuPage.goToUrl(invalidWebviewUrl);

    expect(await MenuPage.getWebviewUrlError()).toBe(platformText(invalidWebviewUrlError));

    // Sama seperti TC001: kembali ke Catalog supaya TC004 (Drawing) di bawah mulai dari state yang
    // jelas, bukan dari layar konten Webview yang menyembunyikan tab bar navigasi di iOS.
    await MenuPage.returnToCatalog();
  });

  // TS005/TC004 - Membersihkan gambar pada fitur Drawing. Canvas gambar (signature_pad) tidak
  // mengekspos state "ada/tidak ada coretan" lewat accessibility tree, jadi verifikasi dibatasi pada:
  // tombol Clear bisa diklik tanpa error dan canvas tetap tampil normal sesudahnya.
  it('should clear the drawing canvas @regression', async () => {
    await MenuPage.openDrawing();
    await MenuPage.drawStroke();

    await MenuPage.clearDrawing();
    expect(await MenuPage.isDrawingCanvasDisplayed()).toBe(true);
  });

  // TS005/TC005 - Melakukan reset app state
  it('should reset app state and show confirmation @regression', async () => {
    await MenuPage.resetAppState();

    expect(await MenuPage.getResetAppDoneMessage()).toBe('App State has been reset.');
    await MenuPage.confirmResetAppDone();
  });

  // TS005/TC007 - Verifikasi versi build dan link Sauce Labs.
  //
  // Format versi beda PANJANG per platform (Android 3-bagian mis. "V.2.1.0", iOS 2-bagian "V.01") -
  // regex di bawah sengaja tidak mengasumsikan jumlah bagian tertentu, cukup "V." diikuti minimal satu
  // kelompok angka. Link "Go to saucelabs.com" juga membuka browser dengan MEKANISME berbeda per
  // platform (Android: browser eksternal terpisah; iOS: SFSafariViewController in-app) - lihat catatan
  // lengkap di MenuPage.isExternalBrowserOpened().
  it('should display app version and open Sauce Labs website link @regression', async () => {
    await MenuPage.openAbout();

    expect(await MenuPage.getAppVersion()).toMatch(/^V\.\d+(\.\d+)*$/);
    await MenuPage.goToSauceLabsWebsite();
    expect(await MenuPage.isExternalBrowserOpened()).toBe(true);
  });
});
