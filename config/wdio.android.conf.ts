import path from 'path';
import { sharedConfig } from './wdio.shared.conf';
import { env } from '../utils/env';

// Config khusus Android: meng-extend config bersama (wdio.shared.conf.ts) dan membangun capabilities
// UiAutomator2 dari daftar device di env (ANDROID_DEVICES). Capabilities environment-specific diambil
// dari env, tidak di-hardcode, agar mudah diganti untuk device farm/CI.
//
// MULTI-DEVICE PARALEL: bila ANDROID_DEVICES berisi lebih dari 1 device, WDIO menjalankan suite yang
// sama di semua device secara paralel (maxInstances = jumlah device) untuk menghemat waktu. Bila hanya
// 1 device, otomatis tetap sequential seperti semula.

// Port dasar systemPort UiAutomator2. Tiap sesi paralel WAJIB punya systemPort UNIK - kalau sama,
// sesi kedua bentrok. Device ke-i memakai BASE_SYSTEM_PORT + i.
const BASE_SYSTEM_PORT = 8200;

// 'appium:app' hanya dikirim jika APP_PATH diisi (untuk install APK baru). Jika app sudah terpasang,
// biarkan APP_PATH kosong -> Appium buka app lewat appPackage/appActivity tanpa install ulang.
const androidApp = env.appPath ? { 'appium:app': path.resolve(process.cwd(), env.appPath) } : {};

const capabilities = env.androidDevices.map((udid, index) => ({
  platformName: 'Android',
  'appium:automationName': 'UiAutomator2',
  'appium:udid': udid, // serial dari `adb devices` - menentukan device mana yang dipakai
  'appium:deviceName': udid,
  // platformVersion hanya dikirim untuk single-device (nilai dari .env). Untuk multi-device yang bisa
  // beda versi/vendor, dibiarkan kosong -> UiAutomator2 mendeteksi versi Android device otomatis.
  ...(env.androidDevices.length === 1 && env.android.platformVersion
    ? { 'appium:platformVersion': env.android.platformVersion }
    : {}),
  'appium:systemPort': BASE_SYSTEM_PORT + index, // unik per device untuk paralel
  ...androidApp,
  'appium:appPackage': env.appPackage,
  'appium:appActivity': env.appActivity,
  'appium:noReset': true, // jangan hapus data/cache app tiap sesi
  'appium:fullReset': false, // tidak uninstall-reinstall tiap sesi (lebih cepat)
  'appium:newCommandTimeout': 240,
  'appium:autoGrantPermissions': true,
}));

export const config: WebdriverIO.Config = {
  ...sharedConfig,
  // Jalankan semua device paralel (1 sesi per device). 1 device -> tetap sequential.
  maxInstances: Math.max(capabilities.length, 1),
  maxInstancesPerCapability: 1,
  capabilities,
};
