import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { resolvePlatformSelector, type PlatformSelector } from '../../locators/types';

dotenv.config();

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
  label: string; // mis. "Device A"
  udid: string;
  model: string;
  platformVersion: string;
  appVersion: string;
}

export interface ReportRuntime {
  client: WebdriverIO.Browser;
  // Ambil elemen dari locator resmi di file locators/ (bukan selector yang ditulis ulang di script
  // laporan). Resolusi platform-nya sama persis dengan yang dipakai page object lewat BasePage.
  element(selector: PlatformSelector): ReturnType<WebdriverIO.Browser['$']>;
  startCase(caseId: string, ref: string, title: string): void;
  captureStep(caseId: string, description: string): Promise<void>;
  verify(caseId: string, item: string, expected: string, actual: string): void;
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
// (scripts/run-multidevice-reports.ts). Untuk pemakaian standalone lama (1 device), fallback ke
// DEVICE_NAME supaya tetap kompatibel. platformVersion/appVersion/model hanya untuk DITAMPILKAN di
// laporan - tidak dikirim sebagai capability (udid sudah cukup menentukan device; versi Android
// dideteksi otomatis oleh UiAutomator2, jadi tidak bentrok untuk device beda vendor).
const currentDevice: DeviceMeta = {
  label: process.env.REPORT_LABEL || 'Device A',
  udid: process.env.REPORT_UDID || process.env.DEVICE_NAME || 'emulator-5554',
  model: process.env.REPORT_MODEL || '',
  platformVersion: process.env.REPORT_PLATFORM_VERSION || '',
  appVersion: process.env.REPORT_APP_VERSION || '',
};

export async function createRuntime(collection: string): Promise<ReportRuntime> {
  const { remote } = await import('webdriverio');
  const client = await remote({
    hostname: process.env.APPIUM_HOST || '127.0.0.1',
    port: Number(process.env.APPIUM_PORT) || 4723,
    path: '/',
    connectionRetryTimeout: 120000,
    connectionRetryCount: 3,
    logLevel: 'warn',
    waitforTimeout: 25000,
    capabilities: {
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
    },
  });

  // Page object di pages/*.ts memakai $/driver/browser sebagai global (pola standar WebdriverIO) -
  // di-set manual di sini supaya bisa dipakai ulang dari script standalone ini.
  (global as unknown as { browser: WebdriverIO.Browser }).browser = client;
  (global as unknown as { driver: WebdriverIO.Browser }).driver = client;
  (global as unknown as { $: WebdriverIO.Browser['$'] }).$ = client.$.bind(client);
  (global as unknown as { $$: WebdriverIO.Browser['$$'] }).$$ = client.$$.bind(client);

  // Screenshot dipisah per device (subfolder slug label) supaya bukti visual tiap device tidak saling
  // menimpa dan bisa ditampilkan berdampingan di laporan.
  const labelSlug = deviceLabelSlug(currentDevice.label);
  const screenshotsRoot = path.join(reportDir, 'screenshots', collection, labelSlug);
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
    steps.push({ no, caseId, description, screenshotRelPath: `screenshots/${collection}/${labelSlug}/${fileName}` });
    console.log(`[${currentDevice.label}][${caseId} #${no}] ${description}`);
  }

  function verify(caseId: string, item: string, expected: string, actual: string): void {
    const status: 'PASS' | 'FAIL' = expected === actual ? 'PASS' : 'FAIL';
    verifications.push({ caseId, item, expected, actual, status });
    console.log(`  [${currentDevice.label}] verify [${status}] ${item} -> expected="${expected}" actual="${actual}"`);
  }

  async function finish() {
    await client.deleteSession();
    return { steps, verifications, cases };
  }

  // Samakan kondisi awal dengan hook `before` di config: paksa app restart ke layar awal (Catalog)
  // supaya tiap collection mulai dari kondisi navigasi konsisten. Data app tetap ada karena noReset.
  const appPackage = (process.env.APP_PACKAGE as string) || 'com.saucelabs.mydemoapp.android';
  await client.terminateApp(appPackage);
  await client.activateApp(appPackage);
  await client.pause(1200);

  return { client, element, startCase, captureStep, verify, finish };
}

export async function writeReportData(
  collection: string,
  data: { steps: StepRecord[]; verifications: VerificationRecord[]; cases: CaseMeta[] }
): Promise<string> {
  const dataDir = path.join(reportDir, 'data');
  fs.mkdirSync(dataDir, { recursive: true });
  // Nama file disematkan slug device supaya hasil tiap device tersimpan terpisah dan bisa digabung
  // jadi laporan per-device oleh build-collection-report.ts.
  const labelSlug = deviceLabelSlug(currentDevice.label);
  const file = path.join(dataDir, `${collection}.${labelSlug}.json`);
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
