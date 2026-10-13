/**
 * Pure JavaScript 32-bit FNV-1a hash producing an 8-character hex string.
 * Runs in any environment (Node, browser, edge, WebWorker).
 */
export function hashFilename(filename: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < filename.length; i++) {
    hash ^= filename.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}
