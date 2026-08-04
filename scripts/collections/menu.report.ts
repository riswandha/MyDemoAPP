import { createRuntime, writeReportData } from '../lib/report-client';
import MenuPage from '../../pages/menu.page';
import { validWebviewUrl, invalidWebviewUrl, invalidWebviewUrlError } from '../../utils/test-data';

// Menjalankan & merekam seluruh Test Case dari tests/menu/menu.spec.ts (Fitur Menu, TS005) memakai
// page object & data yang sama persis dengan spec tersebut. TC003 (Drawing - buat & simpan gambar)
// dan TC006 (QR Code Scanner) tidak direkam karena kolom Automation di test script Excel bernilai
// "Not Automation" untuk keduanya - konsisten dengan menu.spec.ts.
async function main() {
  const rt = await createRuntime('menu');
  const { client } = rt;

  // TS005/TC001 - Membuka external site melalui Webview
  {
    const caseId = 'TC001';
    rt.startCase(caseId, 'TS005/TC001', 'Membuka external site melalui Webview dengan URL https valid');
    await rt.captureStep(caseId, 'Kondisi awal halaman Catalog');

    await MenuPage.openWebview();
    await rt.captureStep(caseId, 'Buka menu, lalu pilih "WebView"');

    await MenuPage.goToUrl(validWebviewUrl);
    await rt.captureStep(caseId, `Isi URL valid (${validWebviewUrl}) lalu tap tombol Go`);

    const isDisplayed = await MenuPage.isWebviewContentDisplayed();
    rt.verify(caseId, 'Konten Webview tampil (form URL hilang dari layar)', 'true', String(isDisplayed));

    await client.back();
    await rt.captureStep(caseId, 'Kembali ke halaman Katalog (tombol back)');
  }

  // TS005/TC002 - Validasi format URL salah pada Webview
  {
    const caseId = 'TC002';
    rt.startCase(caseId, 'TS005/TC002', 'Validasi format URL salah pada Webview');

    await MenuPage.openWebview();
    await rt.captureStep(caseId, 'Buka menu, lalu pilih "WebView"');

    await MenuPage.goToUrl(invalidWebviewUrl);
    await rt.captureStep(caseId, `Isi URL tidak valid (${invalidWebviewUrl}) lalu tap tombol Go`);

    const error = await MenuPage.getWebviewUrlError();
    rt.verify(caseId, 'Pesan error format URL salah', invalidWebviewUrlError, error);
  }

  // TS005/TC004 - Membersihkan gambar pada fitur Drawing
  {
    const caseId = 'TC004';
    rt.startCase(caseId, 'TS005/TC004', 'Membersihkan gambar pada fitur Drawing (Clear)');

    await MenuPage.openDrawing();
    await rt.captureStep(caseId, 'Buka menu, lalu pilih "Drawing"');

    await MenuPage.drawStroke();
    await rt.captureStep(caseId, 'Buat coretan sederhana di canvas (swipe gesture)');

    await MenuPage.clearDrawing();
    await rt.captureStep(caseId, 'Tap tombol Clear');

    const canvasDisplayed = await MenuPage.isDrawingCanvasDisplayed();
    rt.verify(caseId, 'Canvas drawing tetap tampil normal setelah Clear', 'true', String(canvasDisplayed));
  }

  // TS005/TC005 - Melakukan reset app state
  {
    const caseId = 'TC005';
    rt.startCase(caseId, 'TS005/TC005', 'Melakukan reset app state');

    await MenuPage.resetAppState();
    await rt.captureStep(caseId, 'Buka menu, pilih "Reset App State", lalu konfirmasi RESET APP');

    const message = await MenuPage.getResetAppDoneMessage();
    rt.verify(caseId, 'Pesan konfirmasi reset app state', 'App State has been reset.', message);

    await MenuPage.confirmResetAppDone();
    await rt.captureStep(caseId, 'Tap OK pada dialog konfirmasi');
  }

  // TS005/TC007 - Verifikasi versi build dan link Sauce Labs
  {
    const caseId = 'TC007';
    rt.startCase(caseId, 'TS005/TC007', 'Verifikasi versi build dan link Sauce Labs pada halaman About');

    await MenuPage.openAbout();
    await rt.captureStep(caseId, 'Buka menu, lalu pilih "About"');

    const version = await MenuPage.getAppVersion();
    const versionMatches = /^V\.\d+\.\d+\.\d+/.test(version);
    rt.verify(caseId, `Format versi app (actual "${version}")`, 'true', String(versionMatches));

    await MenuPage.goToSauceLabsWebsite();
    await rt.captureStep(caseId, 'Tap link website Sauce Labs (membuka browser eksternal)');

    const externalOpened = await MenuPage.isExternalBrowserOpened();
    rt.verify(caseId, 'Browser eksternal terbuka (bukan halaman app)', 'true', String(externalOpened));

    // Kembali ke app supaya sesi bisa ditutup dengan bersih dari layar app, bukan dari browser eksternal
    await client.activateApp((process.env.APP_PACKAGE as string) || 'com.saucelabs.mydemoapp.android');
    await client.pause(1000);
  }

  const data = await rt.finish();
  await writeReportData('menu', data);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
