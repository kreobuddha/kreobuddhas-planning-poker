// 32 characters, with the pairs that get misread aloud or mistyped (O/0, I/1) left out.
// The length being a power of two also means a random byte maps onto it without modulo bias.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

// A code is the session's document id and the only thing standing between a stranger and the
// room, so it's drawn from the CSPRNG rather than Math.random.
export const generateSessionCode = (length = 6): string => {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let code = '';
  for (const byte of bytes) {
    code += ALPHABET[byte % ALPHABET.length];
  }
  return code;
};
