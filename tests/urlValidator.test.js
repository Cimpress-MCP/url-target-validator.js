const { describe, it, beforeEach, afterEach } = require('mocha');
const { expect } = require('chai');
const sinon = require('sinon');
const dns = require('dns').promises;

const UrlValidator = require('../src/urlValidator');

let sandbox;
beforeEach(() => sandbox = sinon.createSandbox());
afterEach(() => sandbox.restore());

describe('urlValidator.js', () => {
  describe('validates URL', () => {
    const resolvedIpAddress = '2.2.2.2';
    const urlWithDnsProblem = 'https://url-with-dns-problem.com';
    const testCases = [
      {
        name: 'url is null',
        url: null,
        error: 'InvalidUrl'
      },
      {
        name: 'when providing an invalid URL, fails completely',
        url: 'something-invalid',
        error: 'InvalidUrl'
      },
      {
        name: 'url is valid but bad',
        url: urlWithDnsProblem,
        error: 'DnsResolutionError'
      },
      {
        name: 'localhost should be excluded',
        url: 'https://localhost',
        ensureHttps: false,
        error: 'InvalidAddressResolution'
      },
      {
        name: 'localhost ip address should be excluded',
        url: 'https://127.0.0.1',
        error: 'InvalidAddressResolution',
        ensureHttps: false
      },
      {
        name: 'when ensuring valid url for protocol HTTP',
        url: 'http://unit-test/foo-bar',
        ensureHttps: false
      },
      {
        name: 'when ensuring valid url for protocol FTP',
        url: 'ftp://google.com',
        ensureHttps: false
      },
      {
        name: 'when ensuring valid url for protocol HTTPS',
        url: 'https://unit-test/foo-bar',
        ensureHttps: false
      },
      {
        name: 'when enforcing HTTPS, fails for protocol HTTP',
        url: 'http://unit-test/foo-bar',
        error: 'UnsecureEndpoint',
        ensureHttps: true
      },
      {
        name: 'when enforcing HTTPS, succeeds for protocol HTTPS',
        url: 'https://unit-test/foo-bar',
        ensureHttps: true
      },
      {
        name: 'when enforcing blacklist, fails for matching URL',
        url: 'http://unit-test.cimpress.io',
        error: 'RestrictedUrl',
        ensureHttps: false,
        blacklistRegex: new RegExp(/cimpress.io/)
      }
    ];

    testCases.forEach(test => {
      it(test.name, async () => {
        const dnsMock = sandbox.mock(dns);

        switch (test.url) {
          case urlWithDnsProblem:
            dnsMock.expects('resolve4').rejects('DnsResolutionError');
            dnsMock.expects('resolve6').rejects('DnsResolutionError');
            break;
          case 'https://localhost':
            dnsMock.expects('resolve4').resolves(['127.0.0.1']);
            dnsMock.expects('resolve6').resolves(['::1']);
            break;
          default:
            dnsMock.expects('resolve4').resolves([resolvedIpAddress]);
            dnsMock.expects('resolve6').resolves([resolvedIpAddress]);
        }

        let error;
        try {
          await new UrlValidator().validate(test.url, test.ensureHttps, test.blacklistRegex);
        } catch (capturedError) {
          error = capturedError;
        }
        expect(error && error.message).to.eql(test.error);
      });
    });
  });
});
