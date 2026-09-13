class GameHelpers {
  constructor(sock) {
    this.sock = sock;
  }
  
  extractPhoneNumber(jid) {
    const phoneWithCountryCode = jid.split('@')[0];
    const digitsOnly = phoneWithCountryCode.replace(/\D/g, '');
    
    if (digitsOnly.startsWith('234')) {
      return '0' + digitsOnly.substring(3);
    }
    return digitsOnly;
  }
  
  async getDisplayName(jid) {
    try {
      if (global.userData?.[jid]?.username) {
        return global.userData[jid].username;
      }
      
      try {
        const contact = await this.sock.getContact(jid);
        return contact.pushname || contact.notify || contact.name || this.extractPhoneNumber(jid);
      } catch {
        return this.extractPhoneNumber(jid);
      }
    } catch (error) {
      return this.extractPhoneNumber(jid);
    }
  }
}

module.exports = GameHelpers;