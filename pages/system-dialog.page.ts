import BasePage from './base.page';
import { SystemDialogLocators } from '../locators/system-dialog.locators';

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
}

export default new SystemDialogPage();
