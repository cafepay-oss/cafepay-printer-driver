const {test} = require('node:test')
const assert = require('node:assert/strict')
const {adminURL, sameOrigin, trustedSender, printInput, SAFE_PREFERENCES} = require('../security')

test('admin origin accepts HTTPS and local HTTP only', () => {
  assert.equal(adminURL('http://localhost:3001').origin, 'http://localhost:3001')
  for (const url of ['http://example.com', 'file:///etc/passwd', 'https://user:secret@example.com', 'javascript:alert(1)']) {
    assert.throws(() => adminURL(url))
  }
  assert.equal(sameOrigin('https://utils.cafepay.app.evil.example', adminURL()), false)
  assert.equal(sameOrigin('https://utils.cafepay.app/path', adminURL()), true)
})
test('native requests require the main frame of the trusted window', () => {
  const frame = {url: 'https://utils.cafepay.app/path'}
  const window = {webContents: {mainFrame: frame}}
  const event = {sender: window.webContents, senderFrame: frame}
  assert.equal(trustedSender(event, window, adminURL()), true)
  assert.equal(trustedSender({...event, senderFrame: {url: frame.url}}, window, adminURL()), false)
  assert.equal(trustedSender({...event, sender: {}}, window, adminURL()), false)
  frame.url = 'https://other.example'
  assert.equal(trustedSender(event, window, adminURL()), false)
})
test('print input rejects missing names, paths, excessive content, and invalid sample sizes', () => {
  assert.throws(() => printInput({deviceName: '', html: 'test'}))
  assert.throws(() => printInput({deviceName: 'printer', sample: true, size: '../../secret'}))
  assert.throws(() => printInput({deviceName: 'printer', html: 'x'.repeat(2097153)}))
  assert.throws(() => printInput({deviceName: 'printer', file: '/etc/passwd'}))
  assert.equal(printInput({deviceName: 'printer', html: '<p>رسید</p>'}).deviceName, 'printer')
  assert.equal(printInput({deviceName: 'printer', sample: true, size: '7cm'}).size, '7cm')
})
test('renderers keep native access disabled and isolation enabled', () => {
  assert.equal(SAFE_PREFERENCES.nodeIntegration, false)
  assert.equal(SAFE_PREFERENCES.contextIsolation, true)
  assert.equal(SAFE_PREFERENCES.sandbox, true)
  assert.equal(SAFE_PREFERENCES.webSecurity, true)
})
