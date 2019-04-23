const { URL } = require('url');
const dns = require('dns');
const ipRegex = require('ip-regex');

// https://www.iana.org/assignments/iana-ipv4-special-registry/iana-ipv4-special-registry.xhtml
const list = ['10.', '127.', '169.254.', '192.0.0.', '192.0.', '192.31.', '255.255.255.'];

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
      try {
        const ipv4Result = await new Promise((resolve, reject) => dns.resolve4(hostname, (error, addresses) => error ? reject(error) : resolve(addresses)));
        const ipv6Result = await new Promise((resolve, reject) => dns.resolve6(hostname, (error, addresses) => error ? reject(error) : resolve(addresses)));
        ipAddresses = ipv4Result.concat(ipv6Result);
      } catch (error) {
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
