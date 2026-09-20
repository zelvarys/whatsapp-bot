const QRCode = require('qrcode');

// Generates a QR code image buffer from arbitrary text or URL.
async function generate(text) {
  return QRCode.toBuffer(text, {
    width: 300,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    }
  });
}

module.exports = { generate };