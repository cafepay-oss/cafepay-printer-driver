const {app, BrowserWindow, Tray, Menu, ipcMain, session} = require('electron')
const path = require('path')
const fs = require('fs')
const AutoLaunch = require('auto-launch')
const {machineIdSync} = require('node-machine-id')
const {SAFE_PREFERENCES, adminURL, sameOrigin, trustedSender, printInput} = require('./security')
const trusted = adminURL(process.env.CAFEPAY_ADMIN_URL)
const icon = path.join(__dirname, 'cafepay-logo.png')
const autoLaunch = new AutoLaunch({name: 'Cafepay', path: app.getPath('exe')})
let mainWindow
let tray
let activePrints = 0

function guard(event) {
  if (!trustedSender(event, mainWindow, trusted)) throw new Error('Unauthorized native request')
}
function secureWindow(window, allowed) {
  window.webContents.setWindowOpenHandler(() => ({action: 'deny'}))
  window.webContents.on('will-navigate', (event, url) => { if (!allowed(url)) event.preventDefault() })
  window.webContents.on('will-redirect', (event, url) => { if (!allowed(url)) event.preventDefault() })
  window.webContents.on('will-attach-webview', event => event.preventDefault())
}
async function print(input) {
  printInput(input)
  if (activePrints >= 5) throw new Error('Printer queue is busy')
  activePrints++
  let window
  try {
    const printers = await mainWindow.webContents.getPrintersAsync()
    if (!printers.some(printer => printer.name === input.deviceName)) throw new Error('Printer is unavailable')
    window = new BrowserWindow({show: false, webPreferences: {...SAFE_PREFERENCES, javascript: false}})
    secureWindow(window, () => false)
    let html = input.html
    if (input.sample) {
      html = fs.readFileSync(path.join(__dirname, input.size === '6cm' ? 'pos6cm.html' : 'pos8cm.html'), 'utf8')
      if (input.size === '7cm') html = html.replace(/8cm/g, '7cm')
    }
    const policy = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src data:">`
    const document = '<!doctype html><html lang="fa" dir="rtl"><head>' + policy + '</head><body>' + html + '</body></html>'
    await window.loadURL('data:text/html;charset=UTF-8,' + encodeURIComponent(document))
    return await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Printer timeout')), 30000)
      window.webContents.print({silent: true, printBackground: true, deviceName: input.deviceName, copies: 1}, (success, reason) => {
        clearTimeout(timeout)
        if (success) resolve(true)
        else reject(new Error(reason || 'Printing failed'))
      })
    })
  } finally {
    activePrints--
    if (window && !window.isDestroyed()) window.destroy()
  }
}
function registerBridge() {
  ipcMain.handle('cafepay:printers', async event => {
    guard(event)
    return {printers: await mainWindow.webContents.getPrintersAsync(), machineId: machineIdSync({original: true})}
  })
  ipcMain.handle('cafepay:print', (event, input) => { guard(event); return print(input) })
  ipcMain.handle('cafepay:reload', event => { guard(event); mainWindow.reload() })
  ipcMain.handle('cafepay:notify', event => {
    guard(event)
    mainWindow.flashFrame(true)
    if (!mainWindow.isVisible() || mainWindow.isMinimized()) { mainWindow.showInactive(); mainWindow.restore() }
  })
  ipcMain.handle('cafepay:restore', event => { guard(event); mainWindow.show(); mainWindow.focus(); mainWindow.flashFrame(false) })
  ipcMain.on('cafepay:legacy-preferences', event => {
    try {
      guard(event)
      const old = JSON.parse(fs.readFileSync(path.join(app.getPath('userData'), 'user-preferences.json'), 'utf8'))
      const keys = ['token', 'activeCafe', 'cafeId', 'default-locale', 'default-route', 'VAPIDKeys', 'notificationsSettingData', 'showCafeManagementGuide']
      event.returnValue = Object.fromEntries(keys.filter(key => typeof old[key] === 'string').map(key => [key, old[key]]))
    } catch (_) { event.returnValue = {} }
  })
}
function createWindow() {
  mainWindow = new BrowserWindow({width: 1000, height: 800, minWidth: 320, minHeight: 480, icon,
    webPreferences: {...SAFE_PREFERENCES, preload: path.join(__dirname, 'preload.js')}})
  secureWindow(mainWindow, url => sameOrigin(url, trusted))
  mainWindow.loadURL(trusted.href)
  mainWindow.on('close', event => {
    if (!app.quitting) { event.preventDefault(); mainWindow.hide() }
  })
  mainWindow.on('closed', () => { mainWindow = null })
}
if (!app.requestSingleInstanceLock()) app.quit()
else {
  app.on('second-instance', () => { if (mainWindow) { mainWindow.show(); mainWindow.restore(); mainWindow.focus() } })
  app.on('before-quit', () => { app.quitting = true })
  app.whenReady().then(async () => {
    session.defaultSession.setPermissionRequestHandler((contents, permission, callback) => callback(false))
    registerBridge()
    createWindow()
    const menu = Menu.buildFromTemplate([
      {label: 'اجرای خودکار', type: 'checkbox', click: async item => {
        try { await (item.checked ? autoLaunch.enable() : autoLaunch.disable()) }
        catch (_) { item.checked = !item.checked }
      }},
      {label: 'خروج', click: () => app.quit()}
    ])
    try { menu.items[0].checked = await autoLaunch.isEnabled() } catch (_) { menu.items[0].checked = false }
    tray = new Tray(icon)
    tray.setContextMenu(menu)
    tray.setToolTip('رابط پرینتر فعال است')
    tray.on('click', () => { if (mainWindow) mainWindow.show() })
  })
  app.on('window-all-closed', () => { if (app.quitting) app.quit() })
}
