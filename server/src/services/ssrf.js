const dns = require('node:dns').promises;
const net = require('node:net');

const ipv4Blocked = new net.BlockList();

[
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.31.196.0', 24],
  ['192.52.193.0', 24],
  ['192.88.99.0', 24],
  ['192.175.48.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4]
].forEach(([address, prefix]) => {
  ipv4Blocked.addSubnet(address, prefix, 'ipv4');
});

const ipv6Blocked = new net.BlockList();

[
  ['::', 128],
  ['::1', 128],
  ['::', 96],
  ['::ffff:0:0', 96],
  ['64:ff9b:1::', 48],
  ['100::', 64],
  ['2001::', 23],
  ['2001:20::', 28],
  ['2001:db8::', 32],
  ['2002::', 16],
  ['fc00::', 7],
  ['fe80::', 10],
  ['fec0::', 10],
  ['ff00::', 8]
].forEach(([address, prefix]) => {
  ipv6Blocked.addSubnet(address, prefix, 'ipv6');
});

const ipv6GlobalUnicast = new net.BlockList();
ipv6GlobalUnicast.addSubnet('2000::', 3, 'ipv6');

function isPrivate(ip) {
  const family = net.isIP(ip);

  if (family === 4) {
    return ipv4Blocked.check(ip, 'ipv4');
  }

  if (family === 6) {
    return (
      !ipv6GlobalUnicast.check(ip, 'ipv6') ||
      ipv6Blocked.check(ip, 'ipv6')
    );
  }

  return true;
}

async function lookupWithTimeout(host, timeoutMs, lookup) {
  let timer;

  try {
    return await Promise.race([
      lookup(host, { all: true, verbatim: true }),
      new Promise((resolve, reject) => {
        timer = setTimeout(
          () => reject(new Error('Hostname resolution timed out')),
          timeoutMs
        );
      })
    ]);
  } finally {
    clearTimeout(timer);
  }
}

async function validatePublicUrl(raw, options = {}) {
  const timeoutMs = Math.min(
    10000,
    Math.max(100, Number(options.timeoutMs) || 5000)
  );
  const lookup = options.lookup || dns.lookup;
  let url;

  try {
    url = new URL(raw);
  } catch {
    throw new Error('Enter a valid URL');
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('Only HTTP and HTTPS URLs are supported');
  }

  if (url.username || url.password) {
    throw new Error('URLs containing credentials are not allowed');
  }

  const hostname = url.hostname
    .toLowerCase()
    .replace(/^\[|\]$/g, '')
    .replace(/\.$/, '');

  if (
    !hostname ||
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local')
  ) {
    throw new Error('Private network targets are not allowed');
  }

  let addresses;

  if (net.isIP(hostname)) {
    addresses = [{ address: hostname, family: net.isIP(hostname) }];
  } else {
    try {
      addresses = await lookupWithTimeout(hostname, timeoutMs, lookup);
    } catch (error) {
      throw new Error(
        error.message === 'Hostname resolution timed out'
          ? error.message
          : 'Hostname could not be resolved'
      );
    }
  }

  if (
    !addresses.length ||
    addresses.some(({ address }) => isPrivate(address))
  ) {
    throw new Error(
      'Private or reserved network targets are not allowed'
    );
  }

  return {
    valid: true,
    url,
    hostname,
    addresses
  };
}

module.exports = { validatePublicUrl, isPrivate };
