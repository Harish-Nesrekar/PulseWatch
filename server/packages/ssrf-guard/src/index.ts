import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export class UnsafeTargetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsafeTargetError";
  }
}

function isPrivateOrSpecialIPv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return true;
  const [a, b] = parts;
  return (
    a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51) ||
    (a === 203 && b === 0)
  );
}

function isPrivateOrSpecialIPv6(ip: string): boolean {
  const value = ip.toLowerCase().split("%")[0];
  if (value === "::" || value === "::1") return true;
  if (value.startsWith("fc") || value.startsWith("fd")) return true;
  if (/^fe[89ab]/.test(value)) return true;
  if (value.startsWith("ff")) return true;
  if (value.startsWith("::ffff:")) {
    const mapped = value.slice(7);
    if (isIP(mapped) === 4) return isPrivateOrSpecialIPv4(mapped);
    const hex = mapped.split(":");
    if (hex.length === 2) {
      const n = hex.map((x) => parseInt(x, 16));
      const v4 = `${n[0] >> 8}.${n[0] & 255}.${n[1] >> 8}.${n[1] & 255}`;
      return isPrivateOrSpecialIPv4(v4);
    }
    return true;
  }
  return false;
}

export async function validatePublicHttpUrl(rawUrl: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new UnsafeTargetError("A valid URL is required.");
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new UnsafeTargetError("Only HTTP and HTTPS URLs are allowed.");
  }
  if (url.username || url.password) throw new UnsafeTargetError("URLs containing credentials are not allowed.");
  if (url.port && !["80", "443"].includes(url.port)) {
    throw new UnsafeTargetError("Only ports 80 and 443 are allowed.");
  }

  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local")) {
    throw new UnsafeTargetError("Local hostnames are not allowed.");
  }

  const family = isIP(hostname);
  if (family === 4 && isPrivateOrSpecialIPv4(hostname)) {
    throw new UnsafeTargetError("Private or special-use IP addresses are not allowed.");
  }
  if (family === 6 && isPrivateOrSpecialIPv6(hostname)) {
    throw new UnsafeTargetError("Private or special-use IP addresses are not allowed.");
  }

  if (!family) {
    const records = await lookup(hostname, { all: true, verbatim: true });
    if (records.length === 0) throw new UnsafeTargetError("Hostname did not resolve.");
    for (const record of records) {
      if (
        (record.family === 4 && isPrivateOrSpecialIPv4(record.address)) ||
        (record.family === 6 && isPrivateOrSpecialIPv6(record.address))
      ) {
        throw new UnsafeTargetError("Hostname resolves to a private or special-use address.");
      }
    }
  }

  return url;
}
