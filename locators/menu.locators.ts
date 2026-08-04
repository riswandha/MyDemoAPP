import { androidOnly, PlatformSelector } from './types';

// Locator untuk Fitur Menu (TS005): Webview, Drawing, Reset App State, About. Selector Android dari
// inspeksi UI di device. iOS = TODO. Item drawer menu (selain Log In/Log Out) tidak punya content-desc
// sendiri, jadi diakses lewat resourceId "itemTV" + kecocokan teks persis (lihat menuItemLocator).
export const MenuLocators = {
  menuIcon: androidOnly('~View menu'),

  // ===== Webview =====
  webviewUrlInput: androidOnly('android=new UiSelector().resourceId("com.saucelabs.mydemoapp.android:id/urlET")'),
  webviewGoButton: androidOnly('~Tap to view content of given url'),
  webviewUrlError: androidOnly('android=new UiSelector().resourceId("com.saucelabs.mydemoapp.android:id/urlErrorTV")'),
  webviewContent: androidOnly('android=new UiSelector().resourceId("com.saucelabs.mydemoapp.android:id/webView")'),

  // ===== Drawing =====
  drawingCanvas: androidOnly('android=new UiSelector().resourceId("com.saucelabs.mydemoapp.android:id/signature_pad")'),
  drawingClearButton: androidOnly('~Removes anything drawn on pad'),
  // Dialog permission storage/media yang kadang muncul saat membuka layar Drawing (dipakai fitur Save)
  storagePermissionAllowButton: androidOnly('android=new UiSelector().resourceId("com.android.permissioncontroller:id/permission_allow_button")'),

  // ===== Reset App State =====
  resetAppConfirmButton: androidOnly('android=new UiSelector().resourceId("android:id/button1").text("RESET APP")'),
  resetAppDoneMessage: androidOnly('android=new UiSelector().resourceId("android:id/message").text("App State has been reset.")'),
  resetAppDoneOkButton: androidOnly('android=new UiSelector().resourceId("android:id/button1").text("OK")'),

  // ===== About =====
  aboutVersionText: androidOnly('android=new UiSelector().resourceId("com.saucelabs.mydemoapp.android:id/versionTV")'),
  aboutWebsiteLink: androidOnly('android=new UiSelector().resourceId("com.saucelabs.mydemoapp.android:id/webTV")'),
} satisfies Record<string, PlatformSelector>;

// Item drawer menu (selain Log In/Log Out) berdasarkan label teksnya (mis. "WebView", "Drawing")
export function menuItemLocator(label: string): PlatformSelector {
  return androidOnly(`android=new UiSelector().resourceId("com.saucelabs.mydemoapp.android:id/itemTV").text("${label}")`);
}
