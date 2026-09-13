import BasePage from './base.page';
import { SystemDialogLocators, IOS_SAVE_PASSWORD_DIALOG_TITLE } from '../locators/system-dialog.locators';

// SystemDialogPage = Page Object untuk dialog milik SISTEM yang bisa menghalangi app yang dites.
// Bukan layar app, tapi tetap dibuat sebagai page object supaya locator-nya lewat file locators/ dan
// bisa memakai helper BasePage (platformLocator, isDisplayed, click) seperti page object lainnya.
class SystemDialogPage extends BasePage {
  // Tutup dialog ANR ("<App> isn't responding") bila sedang tampil. Mengembalikan true bila memang
  // ada dialog yang ditutup, false bila layar bersih - status ini dipakai pemanggil untuk logging,
  // bukan untuk assertion (assertion tetap hanya di file spec).
  //
  // Memakai isDisplayed() yang TIDAK menunggu: kalau dialog tidak ada, hasilnya false seketika,
  // sehingga pengecekan ini tidak menambah waktu pada sesi normal yang memang tidak kena ANR.
  // Tombol "Wait" didahulukan karena hanya menutup dialog tanpa mematikan proses yang ANR; "Close
  // app" dipakai hanya bila varian dialognya tidak punya tombol "Wait".
  async dismissAnrDialog(): Promise<boolean> {
    for (const button of [SystemDialogLocators.anrWaitButton, SystemDialogLocators.anrCloseButton]) {
      if (await this.isDisplayed(button).catch(() => false)) {
        await this.click(button);
        // Pastikan dialog benar-benar hilang sebelum lanjut - selama masih ada, semua tap berikutnya
        // diterima dialog, bukan app.
        await this.waitForNotDisplayed(button, 5000);
        return true;
      }
    }
    return false;
  }

  // Tutup dialog sistem iOS "Save Password?" bila sedang tampil, dengan menekan "Not Now".
  // Mengembalikan true bila memang ada yang ditutup.
  //
  // KENAPA PERLU: dialog ini muncul sendiri setelah login berhasil, milik sistem (bukan app), dan
  // selama tampil ia membuat SELURUH elemen app terbaca visible=false. Akibatnya langkah berikutnya
  // gagal dengan pesan yang menyesatkan - "layar Catalog tidak muncul", padahal Catalog-nya ada,
  // hanya tertutup dialog sistem yang tidak kelihatan di page source app.
  //
  // KENAPA TIDAK PAKAI autoDismissAlerts: capability itu menutup SEMUA alert, termasuk alert milik
  // app sendiri ("Validation Error!") yang justru harus dibaca oleh skenario validasi login. Karena
  // itu dialog dibedakan dulu lewat teksnya, dan hanya dialog sistem yang ditutup di sini.
  //
  // Aksi 'dismiss' memilih tombol pembatalan alert, yaitu "Not Now" (terverifikasi: daftar tombolnya
  // ["Not Now", "Save"]) - sengaja bukan "Save", supaya test tidak meninggalkan kredensial tersimpan
  // di keychain device.
  async dismissIosSavePasswordDialog(): Promise<boolean> {
    let alertText: string;
    try {
      alertText = await driver.getAlertText();
    } catch {
      // Tidak ada dialog/alert apa pun yang terbuka - kondisi normal, bukan kegagalan.
      return false;
    }

    if (!alertText.includes(IOS_SAVE_PASSWORD_DIALOG_TITLE)) {
      // Ada alert, tapi milik app (mis. "Validation Error!") - biarkan, itu bagian dari skenario test.
      return false;
    }

    await driver.execute('mobile: alert', { action: 'dismiss' });
    return true;
  }
}

export default new SystemDialogPage();
