import path from 'path';
import { env } from '../utils/env';
import { resetAppBeforeSession, captureScreenshotOnFailure } from '../fixtures/app.fixture';

// Pakai binary Appium yang terinstall LOKAL di project ini (node_modules/.bin/appium), bukan `appium`
// global dari PATH. Alasan: appium global di mesin dev bisa punya manifest driver yang menunjuk ke
// path project lain yang sudah terhapus (mis. error "Could not read the driver manifest at
// .../node_modules/appium-uiautomator2-driver"), sedangkan appium lokal memakai driver dari project
// ini secara konsisten - membuat run portable & tidak bergantung pada state global mesin.
const localAppiumCommand = path.resolve(process.cwd(), 'node_modules/.bin/appium');

// Pakai APPIUM_HOME lokal project (.appium) supaya Appium memuat driver dari sini, bukan manifest
// global mesin dev yang bisa menunjuk path project lain yang sudah terhapus (penyebab error "Could not
// read the driver manifest ..."). Tidak menimpa APPIUM_HOME yang sudah di-set user secara eksplisit.
process.env.APPIUM_HOME = process.env.APPIUM_HOME || path.resolve(process.cwd(), '.appium');

// Config dasar yang SAMA untuk kedua platform (Android & iOS). File wdio.android.conf.ts dan
// wdio.ios.conf.ts meng-extend config ini dan hanya menambahkan `capabilities` spesifik platform,
// sesuai aturan CLAUDE.md - test spec-nya tetap sama, cukup ganti config yang dipakai saat run.
//
// Bertipe Omit<..., 'capabilities'> karena capabilities sengaja BELUM diisi di sini; itu tugas file
// config per-platform.
export const sharedConfig: Omit<WebdriverIO.Config, 'capabilities'> = {
  // 'local' = menjalankan test di mesin lokal (bukan grid/cloud). Untuk device farm/CI, file config
  // per-platform yang meng-override capabilities/hostname sesuai penyedia.
  runner: 'local',

  // Pattern lokasi file test (dipakai jika tidak ada --suite yang dipilih)
  specs: ['../tests/**/*.spec.ts'],
  exclude: [],

  // Test Case Collection per fitur/menu. Jalankan salah satu terisolasi lewat `--suite <nama>`,
  // mis. `--suite catalog`. Menggantikan folder "test collection/" lama - suites native WDIO.
  suites: {
    login: ['../tests/login/**/*.spec.ts'],
    catalog: ['../tests/catalog/**/*.spec.ts'],
    cart: ['../tests/cart/**/*.spec.ts'],
    checkout: ['../tests/checkout/**/*.spec.ts'],
    menu: ['../tests/menu/**/*.spec.ts'],
    smoke: ['../tests/smoke/**/*.spec.ts'],
  },

  // Sequential: hanya ada 1 device yang dipakai. maxInstancesPerCapability juga di-set eksplisit ke 1
  // supaya benar-benar sequential walau satu suite berisi banyak spec file.
  maxInstances: 1,
  maxInstancesPerCapability: 1,

  logLevel: 'info',
  bail: 0, // 0 = jalankan semua test walau ada yang gagal

  // Retry di level config (bukan disisipkan manual di dalam test), sesuai aturan anti-flaky CLAUDE.md:
  // spec yang gagal diulang 1x untuk meredam kegagalan sporadis akibat timing device fisik.
  specFileRetries: 1,
  specFileRetriesDeferred: false,

  baseUrl: '',
  waitforTimeout: 25000, // default timeout (ms) untuk semua waitForXxx (dinaikkan karena cold-start device fisik bisa >10s)
  connectionRetryTimeout: 120000,
  connectionRetryCount: 3,

  // Alamat & port Appium server (diambil dari env, tidak di-hardcode)
  hostname: env.appiumHost,
  port: env.appiumPort,
  path: '/',

  // Service yang otomatis start/stop Appium server saat test dijalankan (tidak perlu jalankan `appium` manual)
  services: [
    [
      'appium',
      {
        command: localAppiumCommand,
        args: {
          address: env.appiumHost,
          port: env.appiumPort,
        },
      },
    ],
  ],

  framework: 'mocha',
  reporters: [
    'spec',
    [
      'allure',
      {
        outputDir: 'reports/allure-results',
        disableWebdriverStepsReporting: false,
        disableWebdriverScreenshotsReporting: false,
      },
    ],
  ],

  mochaOpts: {
    ui: 'bdd',
    // Batas waktu (ms) per test case. Dinaikkan dari default 60000 karena flow panjang (mis. checkout
    // multi-step) di device fisik + auto-screenshot per command dari Allure bisa >60 detik. Diubah di
    // sini (level config), bukan lewat this.timeout() di spec.
    timeout: 180000,
  },

  // Hook: sekali setelah sesi terbentuk, sebelum test pertama - pastikan app mulai dari layar awal.
  before: async function () {
    await resetAppBeforeSession();
  },

  beforeTest: async function (test) {
    console.log(`Starting test: ${test.title}`);
  },

  // Hook: setelah tiap test - screenshot saat gagal (dilampirkan otomatis oleh Allure)
  afterTest: async function (_test, _context, { passed }) {
    await captureScreenshotOnFailure(passed);
  },
};
