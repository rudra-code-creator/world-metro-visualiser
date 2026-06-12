import crypto from 'node:crypto';

/** Direct upload.wikimedia.org thumbnail — works reliably in <img> tags */
export function commonsThumbUrl(filename, width = 960) {
  const normalized = filename.replace(/ /g, '_');
  const hash = crypto.createHash('md5').update(normalized).digest('hex');
  const encoded = encodeURIComponent(normalized);
  return `https://upload.wikimedia.org/wikipedia/commons/thumb/${hash[0]}/${hash.slice(0, 2)}/${encoded}/${width}px-${normalized}`;
}
