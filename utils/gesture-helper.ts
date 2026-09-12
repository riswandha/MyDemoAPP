// Helper COMMAND driver (scroll, tap koordinat, pengetikan) yang bercabang per platform.
//
// KENAPA FILE INI ADA
// Locator sudah punya satu titik percabangan terpusat (resolvePlatformSelector di locators/types.ts),
// tapi gesture TIDAK tertolong oleh mekanisme itu: yang berbeda antara Android dan iOS bukan selector
// elemennya, melainkan COMMAND Appium-nya. `mobile: scrollGesture` dan `mobile: clickGesture` adalah
// command milik driver UiAutomator2 - dipanggil di iOS bukan menghasilkan perilaku berbeda, tapi
// langsung error. Jadi gesture butuh titik percabangannya sendiri, dan file ini adalah satu-satunya
// tempat itu berada.
//
// POLANYA SAMA DENGAN LOCATOR
// Pemanggil (BasePage dan seluruh page object) memakai API yang sama persis di kedua platform dan
// TIDAK PERNAH menulis if/else platform. Yang memilih implementasi hanya gestures() di bagian bawah
// file ini.
//
// CARA MENAMBAH/MENGUBAH PERILAKU PER PLATFORM
// Setiap platform punya satu objek implementasi (androidGestures / iosGestures) yang memenuhi kontrak
// GestureStrategy. Untuk menambah gesture baru (mis. tap-and-hold, drag antar elemen): tambahkan
// method-nya di interface GestureStrategy, lalu TypeScript akan memaksa kedua objek melengkapinya -
// tidak ada platform yang bisa diam-diam tertinggal. Untuk mengubah perilaku satu platform saja,
// cukup sentuh objek platform itu; pemanggil tidak perlu diubah sama sekali.

// Area layar tempat gesture dijalankan, dinyatakan sebagai rasio (0..1) terhadap tinggi layar, bukan
// piksel - supaya sama perilakunya di berbagai ukuran device tanpa angka ajaib per-device.
export interface ScrollArea {
  topRatio: number;
  heightRatio: number;
}

// Area default: mulai 30% dari atas, setinggi 50% layar. Sengaja tidak memakai seluruh layar supaya
// gesture tidak menyenggol header, tab bar, maupun area gestur sistem di tepi layar.
export const DEFAULT_SCROLL_AREA: ScrollArea = { topRatio: 0.3, heightRatio: 0.5 };

// Kontrak gesture yang WAJIB dipenuhi kedua platform. Pemanggil hanya tahu kontrak ini.
export interface GestureStrategy {
  // Scroll satu gesture pada area tertentu.
  // `percent` = seberapa jauh relatif terhadap tinggi area (0..1).
  // Return: true bila layar masih bisa di-scroll lagi ke arah tsb, false bila sudah mentok.
  //
  // Nilai balik ini load-bearing, bukan informasi tambahan: catalog.page.ts memakainya sebagai
  // SATU-SATUNYA kondisi berhenti saat menyusuri katalog (getAllProducts) dan saat kembali ke atas
  // (scrollToTop). Implementasi yang selalu mengembalikan true akan membuat loop itu berjalan sampai
  // batas aman setiap kali - lambat, dan menyamarkan bug sebagai "lambat saja".
  scroll(direction: 'up' | 'down', percent: number, area: ScrollArea): Promise<boolean>;

  // Tap pada titik relatif terhadap ukuran layar (0..1). Dipakai mis. menutup drawer/overlay dengan
  // menekan area di luarnya - bukan driver.back(), yang di device fisik bisa keluar dari activity.
  tapAtRatio(xRatio: number, yRatio: number): Promise<void>;

  // Isi sebuah field dengan teks.
  //
  // Terlihat seperti hal yang tidak perlu dibedakan per platform - toh WebdriverIO sudah punya
  // element.setValue(). Ternyata perlu: di iOS setValue() mengetik lewat KEYBOARD SOFTWARE, dan
  // keyboard itu menutupi tombol submit yang dipatok di bawah layar (di layar Login: tombol di y=714,
  // keyboard mulai y=583) sehingga tombolnya terbaca visible=false dan tidak bisa diklik. Form yang
  // diisi dengan setValue() karena itu TIDAK PERNAH bisa di-submit di iOS. Detail & daftar cara yang
  // sudah dicoba ada di implementasi iOS di bawah.
  // Tipe elemennya diambil dari tipe kembalian $() global WebdriverIO supaya tidak perlu meng-import
  // tipe dari paket webdriverio (paketnya ESM, sedangkan project ini CommonJS).
  typeText(element: ReturnType<typeof $>, value: string): Promise<void>;
}

// Hitung kotak area gesture dalam piksel dari rasio + ukuran layar aktual device.
async function resolveArea(area: ScrollArea) {
  const { width, height } = await driver.getWindowSize();
  const top = Math.floor(height * area.topRatio);
  const areaHeight = Math.floor(height * area.heightRatio);
  return { width, height, top, areaHeight };
}

// ===================== ANDROID (UiAutomator2) =====================

// Kecepatan scroll (piksel/detik) yang dikirim ke UiAutomator2. Default bawaan `mobile: scrollGesture`
// adalah 5000 - cukup cepat untuk memicu FLING pada RecyclerView, yaitu inersia yang membuat daftar
// terus meluncur setelah jari "diangkat". Akibatnya jarak yang benar-benar ter-scroll BISA JAUH LEBIH
// BESAR dari `percent` yang diminta, dan satu baris konten terlewat tanpa error apa pun.
//
// Itu penyebab kegagalan CI di job API 34 run 31253853848: catalog.spec.ts gagal dengan
// `indexOf(produk) === -1` - produknya ada di katalog, tapi tidak pernah kebagian terbaca karena
// scroll melompatinya. Nilai 2000 cukup pelan untuk jadi drag terkontrol tanpa inersia, dan masih
// jauh lebih cepat daripada menunggu animasi fling selesai.
const ANDROID_SCROLL_SPEED = 2000;

const androidGestures: GestureStrategy = {
  // UiAutomator2 sudah mengembalikan sendiri status "masih bisa scroll lagi", jadi tidak perlu
  // diukur manual seperti di iOS.
  async scroll(direction, percent, area) {
    const { width, top, areaHeight } = await resolveArea(area);
    return (await driver.execute('mobile: scrollGesture', {
      left: 0,
      top,
      width,
      height: areaHeight,
      direction,
      percent,
      speed: ANDROID_SCROLL_SPEED,
    })) as unknown as boolean;
  },

  async tapAtRatio(xRatio, yRatio) {
    const { width, height } = await driver.getWindowSize();
    await driver.execute('mobile: clickGesture', {
      x: Math.floor(width * xRatio),
      y: Math.floor(height * yRatio),
    });
  },

  // Android tidak punya masalah di atas: keyboard-nya tidak menutupi tombol submit, dan setValue()
  // menimpa isi field yang sudah ada (termasuk saat diisi string kosong, yang berarti mengosongkan).
  async typeText(element, value) {
    await element.setValue(value);
  },
};

// ===================== iOS (XCUITest) =====================

// Durasi drag (detik) untuk satu gesture scroll di iOS. Sengaja TIDAK memakai `mobile: swipe`:
// swipe di XCUITest bersifat fling dan melompati konten persis seperti masalah fling di Android -
// terverifikasi di simulator iPhone 17 Pro, satu swipe melompat dari "Backpack - Black" langsung ke
// "Bolt T-Shirt", melewati enam kartu tanpa error apa pun. `mobile: dragFromToForDuration` dengan
// durasi 1 detik menghasilkan drag terkontrol tanpa inersia, sehingga dua pembacaan layar berurutan
// dijamin masih bersinggungan - syarat yang diandalkan getAllProducts() di catalog.page.ts.
const IOS_DRAG_DURATION_SECONDS = 1.0;

const iosGestures: GestureStrategy = {
  // XCUITest TIDAK melaporkan apakah layar masih bisa di-scroll, jadi status itu diukur sendiri:
  // bandingkan kondisi layar sebelum dan sesudah drag. Kalau tidak ada yang berubah sama sekali,
  // berarti sudah mentok.
  //
  // Perbandingan memakai page source utuh karena itu satu-satunya sinyal yang berlaku di SEMUA layar -
  // indikator scroll bar iOS hanya muncul sesaat saat jari bergerak, jadi tidak bisa diandalkan, dan
  // mematok elemen jangkar tertentu akan mengikat helper generik ini ke satu layar spesifik.
  // Biayanya dua pembacaan page source per gesture (~0,4 detik masing-masing pada katalog 28 KB);
  // itu harga yang dibayar agar kondisi berhenti benar-benar akurat, bukan tebakan.
  async scroll(direction, percent, area) {
    const { width, top, areaHeight } = await resolveArea(area);
    const x = Math.floor(width / 2);
    const distance = Math.floor(areaHeight * percent);

    // Scroll ke BAWAH = jari bergerak ke ATAS (konten naik), dan sebaliknya.
    const fromY = direction === 'down' ? top + areaHeight : top;
    const toY = direction === 'down' ? top + areaHeight - distance : top + distance;

    const before = await driver.getPageSource();
    await driver.execute('mobile: dragFromToForDuration', {
      fromX: x,
      fromY,
      toX: x,
      toY,
      duration: IOS_DRAG_DURATION_SECONDS,
    });
    const after = await driver.getPageSource();

    return before !== after;
  },

  async tapAtRatio(xRatio, yRatio) {
    const { width, height } = await driver.getWindowSize();
    await driver.execute('mobile: tap', {
      x: Math.floor(width * xRatio),
      y: Math.floor(height * yRatio),
    });
  },

  // Mengetik lewat KEYBOARD FISIK (hardware key XCUITest), bukan lewat keyboard software seperti
  // element.setValue(). Ini bukan soal kecepatan, melainkan satu-satunya cara yang membuat form di iOS
  // bisa di-submit sama sekali.
  //
  // Sebabnya: app ini tidak melepas fokus field dengan cara apa pun yang bisa dipicu dari sisi Appium,
  // jadi begitu keyboard software muncul ia menetap dan menutupi tombol submit. Semua cara berikut
  // sudah dicoba satu per satu di simulator iPhone 17 Pro / iOS 26.5, dengan tolok ukur "tombol Login
  // yang tertutup kembali bisa diklik", dan SEMUANYA gagal:
  //   driver.hideKeyboard() - polos, ('pressKey','Return'), dan mobile: hideKeyboard
  //   klik tombol Return di keyboard software, dan setValue diakhiri '\n'
  //   tap elemen netral di luar field, dan tap koordinat di area kosong
  //   drag ke bawah di area keyboard, maupun drag di dalam scroll view (tidak ada keyboardDismissMode)
  //   mobile: backgroundApp lalu kembali ke foreground
  //   capability forceSimulatorSoftwareKeyboardPresence: false + connectHardwareKeyboard: true
  //   mobile: performIoHidEvent tombol Return/Escape (sempat berhasil, TIDAK reprodusibel - jangan dipakai)
  //
  // Yang berhasil: mengetik sebagai input HARDWARE. iOS menyembunyikan keyboard software begitu input
  // datang dari keyboard fisik, jadi tombol submit langsung terjangkau lagi tanpa perlu langkah
  // "tutup keyboard" sama sekali. Dua catatan penting dari hasil pengujian:
  //   - `mobile: keys` hanya menerima SATU karakter per entri (string yang lebih panjang ditolak
  //     dengan error "Input key ... is too long"), jadi teksnya dipecah per karakter.
  //   - Node XCUIElementTypeKeyboard BISA MASIH ADA di page source sesudahnya. Jangan pakai
  //     keberadaannya sebagai penanda; yang menentukan adalah elemen yang tadi tertutup kembali
  //     visible=true.
  // Konsekuensi lingkungan: keyboard fisik simulator harus tersambung (capability
  // appium:connectHardwareKeyboard di config/wdio.ios.conf.ts yang memastikannya).
  async typeText(element, value) {
    // XCUITest tidak bisa MENGOSONGKAN field lewat pengetikan, jadi nilai kosong tidak dikirim sama
    // sekali - kalau dikirim, field-nya tetap tidak berubah dan keyboard justru terlanjur muncul.
    // Pemanggil yang butuh field kosong mengandalkan layarnya yang memang selalu bersih saat dibuka
    // (lihat catatan di pages/login.page.ts).
    if (!value) {
      return;
    }

    // Field harus difokuskan dulu supaya hardware key mendarat di sana.
    await element.click();
    await driver.execute('mobile: keys', { keys: value.split('') });
  },
};

// SATU-SATUNYA percabangan platform untuk gesture di seluruh project - sejajar dengan
// resolvePlatformSelector() yang memegang peran sama untuk locator.
export function gestures(): GestureStrategy {
  return driver.isIOS ? iosGestures : androidGestures;
}
