const SAFE_PREFERENCES = Object.freeze({nodeIntegration: false, contextIsolation: true, sandbox: true, webSecurity: true})
function adminURL(value = 'https://utils.cafepay.app') {
  const url = new URL(value)
  if (url.username || url.password || (url.protocol !== 'https:' &&
      !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)))) {
    throw new Error('The admin URL must use HTTPS or local HTTP')
  }
  return url
}
function sameOrigin(candidate, trusted) {
  try { return new URL(candidate).origin === trusted.origin } catch (_) { return false }
}
function trustedSender(event, window, trusted) {
  return !!window && event.sender === window.webContents && event.senderFrame === window.webContents.mainFrame &&
    sameOrigin(event.senderFrame.url, trusted)
}
function printInput(input) {
  if (!input || typeof input.deviceName !== 'string' || !input.deviceName.trim() || input.deviceName.length > 256) {
    throw new Error('Invalid printer')
  }
  if (input.sample) {
    if (!['6cm', '7cm', '8cm'].includes(input.size)) throw new Error('Invalid paper width')
  } else if (typeof input.html !== 'string' || !input.html.length || Buffer.byteLength(input.html) > 2 * 1024 * 1024) {
    throw new Error('Invalid print content')
  }
  return input
}
module.exports = {SAFE_PREFERENCES, adminURL, sameOrigin, trustedSender, printInput}
