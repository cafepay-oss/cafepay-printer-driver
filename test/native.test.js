const {test} = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const path = require('node:path')

async function setup() {
  const handlers = {}, windows = [], launch = []
  let menu, ready
  class Window {
    constructor(options) {
      this.options = options
      this.events = {}
      this.webContents = {
        mainFrame: {url: 'http://localhost:3001'},
        setWindowOpenHandler: handler => { this.openHandler = handler },
        on: (event, handler) => { this.events[event] = handler },
        getPrintersAsync: async () => [{name: 'Receipt'}],
        print: (options, callback) => { this.printOptions = options; this.printCallback = callback }
      }
      windows.push(this)
    }
    on() {}
    async loadURL(url) { this.url = url }
    destroy() { this.destroyed = true }
    isDestroyed() { return !!this.destroyed }
  }
  const app = {getPath: () => '/fake/profile', requestSingleInstanceLock: () => true, on() {},
    whenReady: () => ({then: fn => { ready = Promise.resolve().then(fn) }})}
  const electron = {app, BrowserWindow: Window, ipcMain: {handle: (name, fn) => { handlers[name] = fn }, on() {}},
    session: {defaultSession: {setPermissionRequestHandler() {}}},
    Menu: {buildFromTemplate: items => { menu = {items}; return menu }},
    Tray: class {setContextMenu() {} setToolTip() {} on() {}}}
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../main.js'), 'utf8'), {
    require: name => name === 'electron' ? electron : name === 'auto-launch' ? class {
      async isEnabled() { return false }
      async enable() { launch.push('enable') }
      async disable() { launch.push('disable') }
    } : name === 'node-machine-id' ? {machineIdSync: () => 'test-machine'} : name === './security' ? require('../security') : require(name),
    __dirname: path.join(__dirname, '..'), process: {env: {CAFEPAY_ADMIN_URL: 'http://localhost:3001'}}, setTimeout, clearTimeout, Buffer, URL
  })
  await ready
  const main = windows[0]
  const event = {sender: main.webContents, senderFrame: main.webContents.mainFrame}
  return {handlers, windows, main, event, menu, launch}
}

test('native main window blocks unexpected navigation and new windows', async () => {
  const {main} = await setup()
  let blocked = 0
  main.events['will-navigate']({preventDefault: () => blocked++}, 'file:///etc/passwd')
  main.events['will-navigate']({preventDefault: () => blocked++}, 'http://localhost:3001/settings')
  assert.equal(blocked, 1)
  assert.equal(main.openHandler().action, 'deny')
  assert.equal(main.options.webPreferences.nodeIntegration, false)
})
test('native print waits for the callback and destroys its isolated window', async () => {
  const {handlers, windows, event} = await setup()
  let settled = false
  const promise = handlers['cafepay:print'](event, {deviceName: 'Receipt', html: '<script>bad()</script><p>رسید</p>'})
  promise.then(() => { settled = true })
  await new Promise(resolve => setImmediate(resolve))
  const print = windows[1]
  assert.equal(settled, false)
  assert.equal(print.options.webPreferences.javascript, false)
  assert.equal(print.options.webPreferences.nodeIntegration, false)
  assert(decodeURIComponent(print.url).includes("default-src 'none'"))
  print.printCallback(true)
  assert.equal(await promise, true)
  assert.equal(print.destroyed, true)
})
test('native print rejects OS failures and destroys its window', async () => {
  const {handlers, windows, event} = await setup()
  const promise = handlers['cafepay:print'](event, {deviceName: 'Receipt', html: '<p>رسید</p>'})
  await new Promise(resolve => setImmediate(resolve))
  windows[1].printCallback(false, 'Paper unavailable')
  await assert.rejects(promise, /Paper unavailable/)
  assert.equal(windows[1].destroyed, true)
})
test('native print rejects untrusted frames and absent printers', async () => {
  const {handlers, event, windows} = await setup()
  assert.throws(() => handlers['cafepay:print']({...event, senderFrame: {}}, {}), /Unauthorized/)
  await assert.rejects(handlers['cafepay:print'](event, {deviceName: 'Missing', html: '<p>رسید</p>'}), /unavailable/)
  assert.equal(windows.length, 1)
})
test('autostart follows the checkbox state', async () => {
  const {menu, launch} = await setup()
  await menu.items[0].click({checked: true})
  await menu.items[0].click({checked: false})
  assert.deepEqual(launch, ['enable', 'disable'])
})
