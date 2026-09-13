import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { resolvePlatformSelector, type PlatformSelector } from '../../locators/types';
import { env } from '../../utils/env';
import { gestures } from '../../utils/gesture-helper';

dotenv.config();

// Platform laporan ini - satu-satunya titik percabangan Android/iOS di file ini, diset lewat
// REPORT_PLATFORM oleh orchestrator (scripts/run-multidevice-reports.ts untuk Android,
// scripts/run-ios-report.ts untuk iOS). Default 'android' untuk kompatibel dengan pemakaian lama
// (orchestrator Android belum pernah mengisi REPORT_PLATFORM secara eksplisit).
type ReportPlatform = 'android' | 'ios';
const reportPlatform: ReportPlatform = process.env.REPORT_PLATFORM === 'ios' ? 'ios' : 'android';

export interface StepRecord {
  no: number;
  caseId: string;
  description: string;
  screenshotRelPath: string;
}

export interface VerificationRecord {
  caseId: string;
  item: string;
  expected: string;
  actual: string;
  status: 'PASS' | 'FAIL';
}

export interface CaseMeta {
  caseId: string;
  ref: string;
  title: string;
}

export interface DeviceMeta {
  label: string; // mis. "Device A" (Android) atau "iOS Simulator" (iOS)
  udid: string;
  model: string;
  platformVersion: string;
  appVersion: string;
  // Label tampilan platform ("Android"/"iOS") - dipakai build-collection-report.ts untuk kolom OS &
  // teks cover, supaya tidak hardcode "Android" di sana untuk laporan iOS.
  platform: 'Android' | 'iOS';
}

export interface ReportRuntime {
  client: WebdriverIO.Browser;
  // Ambil elemen dari locator resmi di file locators/ (bukan selector yang ditulis ulang di script
  // laporan). Resolusi platform-nya sama persis dengan yang dipakai page object lewat BasePage.
  element(selector: PlatformSelector): ReturnType<WebdriverIO.Browser['$']>;
  // Isi text field lewat gestures().typeText() - SAMA PERSIS dengan BasePage.setValue() -, BUKAN
  // element.setValue() bawaan WebdriverIO. WAJIB dipakai untuk mengisi field apa pun di script
  // laporan: element.setValue() polos mengetik lewat keyboard SOFTWARE, yang di iOS menutupi tombol
  // submit dan tidak pernah bisa ditutup dari sisi Appium (lihat utils/gesture-helper.ts) - dipakai
  // apa adanya di Android karena gestures() Android memang cuma memanggil setValue() biasa.
  typeInto(selector: PlatformSelector, value: string): Promise<void>;
  startCase(caseId: string, ref: string, title: string): void;
  captureStep(caseId: string, description: string): Promise<void>;
  verify(caseId: string, item: string, expected: string, actual: string): void;
  // Jalankan SATU test case sebagai unit yang gagal-terisolasi: kalau `fn` melempar, kegagalannya
  // dicatat sebagai satu item verifikasi FAIL untuk case ini (bukan menghentikan seluruh script).
  // WAJIB dipakai membungkus tiap case di scripts/collections/*.report.ts, BUKAN memanggil langkah
  // case langsung di top-level main() - tanpa ini, SATU case yang gagal (mis. kena flake XCUITest)
  // menggagalkan seluruh proses SEBELUM rt.finish()/writeReportData() sempat jalan, sehingga data
  // case-case LAIN yang sudah berhasil direkam ikut hilang semua, bukan cuma case yang gagal.
  runCase(caseId: string, fn: () => Promise<void>): Promise<void>;
  finish(): Promise<{ steps: StepRecord[]; verifications: VerificationRecord[]; cases: CaseMeta[] }>;
}

const reportDir = path.resolve(__dirname, '../../reports');

// Ubah label device ("Device A") jadi slug aman untuk nama file/folder ("device-a").
export function deviceLabelSlug(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Metadata device yang dipakai run report ini. Diambil dari env yang di-set orchestrator
// (scripts/run-multidevice-reports.ts untuk Android, scripts/run-ios-report.ts untuk iOS). Untuk
// pemakaian standalone lama (1 device Android), fallback ke DEVICE_NAME supaya tetap kompatibel.
// platformVersion/appVersion/model hanya untuk DITAMPILKAN di laporan - tidak dikirim sebagai
// capability (udid/deviceName+platformVersion sudah cukup menentukan device/simulator).
const currentDevice: DeviceMeta = {
  label: process.env.REPORT_LABEL || (reportPlatform === 'ios' ? 'iOS Simulator' : 'Device A'),
  udid:
    process.env.REPORT_UDID ||
    process.env.DEVICE_NAME ||
    (reportPlatform === 'ios' ? env.ios.deviceName : 'emulator-5554'),
  model: process.env.REPORT_MODEL || (reportPlatform === 'ios' ? env.ios.deviceName : ''),
  platformVersion: process.env.REPORT_PLATFORM_VERSION || (reportPlatform === 'ios' ? env.ios.platformVersion : ''),
  appVersion: process.env.REPORT_APP_VERSION || '',
  platform: reportPlatform === 'ios' ? 'iOS' : 'Android',
};

// Capability Android - identik dengan yang dipakai orchestrator lama, tidak berubah.
const androidCapabilities: WebdriverIO.Capabilities = {
  platformName: 'Android',
  'appium:automationName': 'UiAutomator2',
  'appium:udid': currentDevice.udid, // serial dari `adb devices` - menentukan device mana
  'appium:deviceName': currentDevice.udid,
  // systemPort unik per device (dari env), aman bila kelak dijalankan berbarengan.
  'appium:systemPort': Number(process.env.REPORT_SYSTEM_PORT) || 8200,
  'appium:appPackage': process.env.APP_PACKAGE,
  'appium:appActivity': process.env.APP_ACTIVITY,
  'appium:noReset': true,
  'appium:fullReset': false,
  'appium:newCommandTimeout': 240,
  'appium:autoGrantPermissions': true,
};

// Capability iOS - SENGAJA disalin persis dari config/wdio.ios.conf.ts (bukan cuma "mirip"), supaya
// perilaku sesi WebDriver di laporan ini identik dengan yang dipakai test suite sungguhan. Kalau
// wdio.ios.conf.ts berubah, sinkronkan juga di sini.
const iosCapabilities: WebdriverIO.Capabilities = {
  platformName: 'iOS',
  'appium:automationName': 'XCUITest',
  'appium:deviceName': env.ios.deviceName,
  'appium:platformVersion': env.ios.platformVersion,
  ...(env.ios.udid ? { 'appium:udid': env.ios.udid } : {}),
  ...(env.appPath ? { 'appium:app': path.resolve(process.cwd(), env.appPath) } : {}),
  'appium:bundleId': env.ios.bundleId,
  'appium:noReset': true,
  'appium:fullReset': false,
  'appium:newCommandTimeout': 240,
  'appium:wdaLaunchTimeout': 600000,
  'appium:wdaConnectionTimeout': 600000,
  'appium:simulatorStartupTimeout': 300000,
  'appium:connectHardwareKeyboard': true,
};

export async function createRuntime(collection: string): Promise<ReportRuntime> {
  const { remote } = await import('webdriverio');
  const client = await remote({
    hostname: process.env.APPIUM_HOST || '127.0.0.1',
    port: Number(process.env.APPIUM_PORT) || 4723,
    path: '/',
    // iOS butuh timeout klien lebih panjang - lihat catatan lengkap connectionRetryTimeout di
    // config/wdio.ios.conf.ts (WDA build+launch di simulator baru bisa lebih lama dari 120s bawaan).
    connectionRetryTimeout: reportPlatform === 'ios' ? 600000 : 120000,
    connectionRetryCount: reportPlatform === 'ios' ? 1 : 3,
    logLevel: 'warn',
    waitforTimeout: 25000,
    capabilities: reportPlatform === 'ios' ? iosCapabilities : androidCapabilities,
  });

  // Page object di pages/*.ts memakai $/driver/browser sebagai global (pola standar WebdriverIO) -
  // di-set manual di sini supaya bisa dipakai ulang dari script standalone ini.
  (global as unknown as { browser: WebdriverIO.Browser }).browser = client;
  (global as unknown as { driver: WebdriverIO.Browser }).driver = client;
  (global as unknown as { $: WebdriverIO.Browser['$'] }).$ = client.$.bind(client);
  (global as unknown as { $$: WebdriverIO.Browser['$$'] }).$$ = client.$$.bind(client);

  // Screenshot dipisah per platform + device (subfolder slug label) supaya bukti visual Android & iOS
  // (dan tiap device di dalamnya) tidak saling menimpa dan bisa ditampilkan berdampingan di laporan.
  const labelSlug = deviceLabelSlug(currentDevice.label);
  const screenshotsRoot = path.join(reportDir, 'screenshots', collection, reportPlatform, labelSlug);
  fs.mkdirSync(screenshotsRoot, { recursive: true });

  const steps: StepRecord[] = [];
  const verifications: VerificationRecord[] = [];
  const cases: CaseMeta[] = [];
  const caseCounters: Record<string, number> = {};

  // Jembatan ke file locators/: script laporan butuh memecah aksi page object jadi langkah-langkah
  // kecil demi bukti visual per langkah, tapi TIDAK boleh menulis ulang selector-nya sendiri -
  // duplikat seperti itu diam-diam menyimpang begitu locator aslinya berubah.
  function element(selector: PlatformSelector) {
    return client.$(resolvePlatformSelector(selector, client.isIOS));
  }

  async function typeInto(selector: PlatformSelector, value: string): Promise<void> {
    const el = await element(selector);
    await el.waitForDisplayed();
    await gestures().typeText(el, value);
  }

  function startCase(caseId: string, ref: string, title: string): void {
    cases.push({ caseId, ref, title });
    console.log(`\n=== [${currentDevice.label}] ${ref} - ${title} ===`);
  }

  async function captureStep(caseId: string, description: string): Promise<void> {
    caseCounters[caseId] = (caseCounters[caseId] || 0) + 1;
    const no = caseCounters[caseId];
    const fileName = `${caseId.toLowerCase()}-${String(no).padStart(2, '0')}.png`;
    const filePath = path.join(screenshotsRoot, fileName);
    // Jeda singkat supaya transisi/animasi layar selesai dulu sebelum screenshot diambil.
    await client.pause(700);
    await client.saveScreenshot(filePath);
    steps.push({
      no,
      caseId,
      description,
      screenshotRelPath: `screenshots/${collection}/${reportPlatform}/${labelSlug}/${fileName}`,
    });
    console.log(`[${currentDevice.label}][${caseId} #${no}] ${description}`);
  }

  function verify(caseId: string, item: string, expected: string, actual: string): void {
    const status: 'PASS' | 'FAIL' = expected === actual ? 'PASS' : 'FAIL';
    verifications.push({ caseId, item, expected, actual, status });
    console.log(`  [${currentDevice.label}] verify [${status}] ${item} -> expected="${expected}" actual="${actual}"`);
  }

  async function runCase(caseId: string, fn: () => Promise<void>): Promise<void> {
    try {
      await fn();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`  [${currentDevice.label}] CASE ${caseId} GAGAL (dicatat, lanjut ke case berikutnya): ${message}`);
      verify(caseId, 'Case selesai tanpa error', 'true', `false - ${message}`);
    }
  }

  async function finish() {
    await client.deleteSession();
    return { steps, verifications, cases };
  }

  // Samakan kondisi awal dengan hook `before` di config: paksa app restart ke layar awal (Catalog)
  // supaya tiap collection mulai dari kondisi navigasi konsisten. Data app tetap ada karena noReset.
  const appIdentifier =
    reportPlatform === 'ios' ? env.ios.bundleId : (process.env.APP_PACKAGE as string) || 'com.saucelabs.mydemoapp.android';
  await client.terminateApp(appIdentifier);
  await client.activateApp(appIdentifier);
  await client.pause(1200);

  return { client, element, typeInto, startCase, captureStep, verify, runCase, finish };
}

export async function writeReportData(
  collection: string,
  data: { steps: StepRecord[]; verifications: VerificationRecord[]; cases: CaseMeta[] }
): Promise<string> {
  const dataDir = path.join(reportDir, 'data');
  fs.mkdirSync(dataDir, { recursive: true });
  // Nama file disematkan PLATFORM + slug device (mis. "login.ios.ios-simulator.json") supaya hasil
  // Android & iOS tersimpan terpisah dan tidak pernah tercampur jadi satu laporan gabungan -
  // build-collection-report.ts membangun laporan Android dan iOS sebagai file yang benar-benar
  // terpisah (sesuai permintaan: "2 laporan" berbeda, bukan satu laporan lintas platform).
  const labelSlug = deviceLabelSlug(currentDevice.label);
  const file = path.join(dataDir, `${collection}.${reportPlatform}.${labelSlug}.json`);
  fs.writeFileSync(
    file,
    JSON.stringify({ collection, device: currentDevice, generatedAt: new Date().toISOString(), ...data }, null, 2)
  );
  console.log(`\n[${currentDevice.label}] Data report tersimpan di: ${file}`);
  console.log(
    `[${currentDevice.label}] Total case: ${data.cases.length}, step: ${data.steps.length}, verifikasi: ${data.verifications.length}`
  );
  return file;
}
