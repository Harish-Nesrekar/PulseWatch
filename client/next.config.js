/** @type {import('next').NextConfig} */
const net = require('node:net');

function isDevelopmentHostname(hostname) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '');

  if (
    host === 'localhost' ||
    host === 'host.docker.internal' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal')
  ) {
    return true;
  }

  const family = net.isIP(host);
  if (family === 4) {
    const [first, second] = host.split('.').map(Number);
    return (
      first === 0 ||
      first === 10 ||
      first === 127 ||
      (first === 169 && second === 254) ||
      (first === 172 && second >= 16 && second <= 31) ||
      (first === 192 && second === 168)
    );
  }

  if (family === 6) {
    return host === '::' || host === '::1' ||
      host.startsWith('fc') || host.startsWith('fd') ||
      host.startsWith('fe80:');
  }

  return (
    !host.includes('.') ||
    /(^|[.-])(your|placeholder)(?:[.-]|$)/.test(host) ||
    /\.(test|invalid|example)$/.test(host) ||
    host === 'example.com' ||
    host.endsWith('.example.com') ||
    host === 'example.net' ||
    host.endsWith('.example.net') ||
    host === 'example.org' ||
    host.endsWith('.example.org')
  );
}

function validateProductionApiUrl(value) {
  if (!value) {
    throw new Error('NEXT_PUBLIC_API_URL is required for production builds.');
  }

  // Allow the same-origin Vercel API proxy.
  if (value === '/api') {
    return;
  }

  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(
      'NEXT_PUBLIC_API_URL must be /api or a valid HTTPS URL.'
    );
  }

  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    isDevelopmentHostname(url.hostname)
  ) {
    throw new Error(
      'NEXT_PUBLIC_API_URL must use HTTPS and a non-development hostname.'
    );
  }
}


const isProductionBuild =
  process.env.NODE_ENV === 'production' &&
  process.env.VERCEL_ENV === 'production';

if (isProductionBuild) {
  validateProductionApiUrl(process.env.NEXT_PUBLIC_API_URL);
}

const nextConfig = {
  reactStrictMode: true,
};

module.exports = nextConfig;
