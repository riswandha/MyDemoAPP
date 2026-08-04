import { androidOnly, PlatformSelector } from './types';

// Locator untuk Fitur Login (TS001) app "My Demo App". Selector Android diambil dari hasil inspeksi
// UI langsung di device (uiautomator dump), bukan tebakan. Slot iOS = TODO sampai diinspeksi di iOS.
export const LoginLocators = {
  // Icon garis 3 (hamburger) di header untuk membuka drawer menu
  menuIcon: androidOnly('~View menu'),
  // Item "Log In" di dalam drawer menu
  loginMenuItem: androidOnly('~Login Menu Item'),
  // Input username di layar login
  usernameInput: androidOnly('android=new UiSelector().resourceId("com.saucelabs.mydemoapp.android:id/nameET")'),
  // Input password di layar login
  passwordInput: androidOnly('android=new UiSelector().resourceId("com.saucelabs.mydemoapp.android:id/passwordET")'),
  // Tombol Login
  loginButton: androidOnly('android=new UiSelector().resourceId("com.saucelabs.mydemoapp.android:id/loginBtn")'),
  // Item "Log Out" di drawer menu, hanya muncul setelah login berhasil (dipakai untuk assertion)
  logoutMenuItem: androidOnly('~Logout Menu Item'),
  // Pesan error di bawah field username, muncul saat username kosong saat submit
  usernameErrorText: androidOnly('android=new UiSelector().resourceId("com.saucelabs.mydemoapp.android:id/nameErrorTV")'),
  // Pesan error di bawah field password, dipakai baik untuk validasi password kosong ("Enter
  // Password") maupun pesan akun locked out ("Sorry this user has been locked out.") - keduanya
  // memakai TextView/resource-id yang sama di app, cuma beda teks tergantung skenario
  passwordErrorText: androidOnly('android=new UiSelector().resourceId("com.saucelabs.mydemoapp.android:id/passwordErrorTV")'),
  // Tombol "LOGOUT" pada dialog konfirmasi yang muncul setelah memilih item Log Out
  logoutConfirmButton: androidOnly('android=new UiSelector().resourceId("android:id/button1")'),
} satisfies Record<string, PlatformSelector>;
