const { URL } = require('url');
const dns = require('dns').promises;
const ipRegex = require('ip-regex');

// https://www.iana.org/assignments/iana-ipv4-special-registry/iana-ipv4-special-registry.xhtml
const list = ['10.', '127.', '169.254.', '192.0.0.', '192.0.', '192.31.', '255.255.255.', '::1'];

module.exports = class {
  /**
   * Validates an URL to be conform to a URL format, and optionally validates the protocol to be HTTPS.
   * @param {String} input The URL to validate.
   * @param {Boolean} ensureHttps Whether the URL should be validated to have HTTPS protocol.
   * @param {String} blacklistedUrlRegex Whether the URL matches a black listed regex.
   */
  async validate(input, ensureHttps = true, blacklistedUrlRegex = null) {
    if (!input || !input.trim()) {
      throw new Error('InvalidUrl');
    }

    let url;
    try {
      url = new URL(input);
    } catch (e) {
      throw Error('InvalidUrl');
    }

    if (ensureHttps && url.protocol !== 'https:') {
      throw Error('UnsecureEndpoint');
    }
    if (blacklistedUrlRegex && blacklistedUrlRegex.test(url.hostname)) {
      throw Error('RestrictedUrl');
    }

    const hostname = url.hostname;
    let ipAddresses = [hostname];
    if (!ipRegex({ exact: true }).test(hostname)) {
      let ipv4Error = false;
      let ipv6Error = false;
      ipAddresses = [];

      try {
        const result = await dns.resolve4(hostname);
        ipAddresses = ipAddresses.concat(result);
      } catch (error) {
        ipv4Error = true;
      }

      try {
        const result = await dns.resolve6(hostname);
        ipAddresses = ipAddresses.concat(result);
      } catch (error) {
        ipv6Error = true;
      }

      if (ipv4Error && ipv6Error) {
        throw new Error('DnsResolutionError');
      }
    }
    ipAddresses.forEach(address => {
      list.forEach(matcher => {
        if (address.startsWith(matcher)) {
          throw new Error('InvalidAddressResolution');
        }
      });
    });

    return url.toString();
  }
};
