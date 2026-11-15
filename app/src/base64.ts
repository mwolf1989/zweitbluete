// react-native-ble-plx exchanges characteristic values as base64 strings.

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export function bytesToBase64(bytes: Uint8Array): string {
  let output = '';
  for (let index = 0; index < bytes.length; index += 3) {
    const remaining = bytes.length - index;
    const chunk = (bytes[index] << 16) | ((bytes[index + 1] ?? 0) << 8) | (bytes[index + 2] ?? 0);
    output += ALPHABET[(chunk >> 18) & 63];
    output += ALPHABET[(chunk >> 12) & 63];
    output += remaining > 1 ? ALPHABET[(chunk >> 6) & 63] : '=';
    output += remaining > 2 ? ALPHABET[chunk & 63] : '=';
  }
  return output;
}

export function base64ToBytes(text: string): Uint8Array {
  const clean = text.replace(/=+$/, '');
  const bytes = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let buffer = 0;
  let bits = 0;
  let position = 0;
  for (const character of clean) {
    const value = ALPHABET.indexOf(character);
    if (value < 0) {
      throw new Error(`invalid base64 character ${JSON.stringify(character)}`);
    }
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes[position++] = (buffer >> bits) & 0xff;
    }
  }
  return bytes;
}
