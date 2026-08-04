import * as dotenv from 'dotenv';

// Memuat variabel dari file .env (DEVICE_NAME, APP_PACKAGE, dll) ke process.env sekali di sini,
// supaya seluruh config & helper mengambil environment lewat modul ini - bukan membaca process.env
// tersebar di banyak file. Sesuai aturan CLAUDE.md: data environment-specific tidak di-hardcode,
// diambil dari satu sumber terpusat agar mudah diganti untuk device farm/CI.
dotenv.config();

// Package aplikasi "My Demo App" (Sauce Labs) - default dipakai bila APP_PACKAGE tidak diisi di .env.
export const APP_PACKAGE_DEFAULT = 'com.saucelabs.mydemoapp.android';

// Daftar device Android yang dipakai. Bisa lebih dari satu (dipisah koma) untuk run PARALEL di
// beberapa device sekaligus demi menghemat waktu - mis. ANDROID_DEVICES=emulator-5554,emulator-5556.
// Serial device asli TIDAK PERNAH ditulis di sini, hanya di .env lokal masing-masing (gitignored).
// Fallback ke DEVICE_NAME (single device) demi kompatibilitas config lama.
const androidDeviceList = (process.env.ANDROID_DEVICES || process.env.DEVICE_NAME || 'emulator-5554')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

export const env = {
  // ----- Umum / Appium server -----
  appiumHost: process.env.APPIUM_HOST || '127.0.0.1',
  appiumPort: Number(process.env.APPIUM_PORT) || 4723,

  // ----- Aplikasi -----
  appPackage: process.env.APP_PACKAGE || APP_PACKAGE_DEFAULT,
  appActivity: process.env.APP_ACTIVITY,
  // Path APK/IPA hanya dipakai bila diisi (untuk install app baru). Bila kosong, Appium membuka
  // app yang sudah terpasang di device lewat appPackage/appActivity tanpa install ulang.
  appPath: process.env.APP_PATH,

  // ----- Android -----
  // Daftar semua device (untuk run paralel). Config Android membangun satu capability per entry.
  androidDevices: androidDeviceList,
  android: {
    deviceName: androidDeviceList[0], // device pertama (dipakai bila hanya 1 device)
    platformVersion: process.env.PLATFORM_VERSION || process.env.ANDROID_PLATFORM_VERSION || '13',
  },

  // ----- iOS (disiapkan untuk cross-platform; diisi saat device iOS tersedia) -----
  ios: {
    deviceName: process.env.IOS_DEVICE_NAME || 'iPhone 15',
    platformVersion: process.env.IOS_PLATFORM_VERSION || '17',
    udid: process.env.IOS_UDID,
  },
};
