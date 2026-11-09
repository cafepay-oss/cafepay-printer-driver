const {contextBridge, ipcRenderer} = require('electron')
contextBridge.exposeInMainWorld('cafepayDesktop', Object.freeze({
  getPrinterList: () => ipcRenderer.invoke('cafepay:printers'),
  print: input => ipcRenderer.invoke('cafepay:print', input),
  notify: () => ipcRenderer.invoke('cafepay:notify'),
  restore: () => ipcRenderer.invoke('cafepay:restore'),
  reload: () => ipcRenderer.invoke('cafepay:reload'),
  legacyPreferences: () => ipcRenderer.sendSync('cafepay:legacy-preferences')
}))
