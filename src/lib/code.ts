import { SESSION_CODE_LENGTH } from '@/config';

// 32 characters, with the pairs that get misread aloud or mistyped (O/0, I/1) left out.
// The length being a power of two also means a random byte maps onto it without modulo bias.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

// A code is the session's document id and the only thing standing between a stranger and the
// room, so it's drawn from the CSPRNG rather than Math.random.
export const generateSessionCode = (length = SESSION_CODE_LENGTH): string => {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let code = '';
  for (const byte of bytes) {
    code += ALPHABET[byte % ALPHABET.length];
  }
  return code;
};

// Typing a code is transcription — from a screen, a chat message, a link read aloud — so the
// field corrects what transcription gets wrong instead of rejecting it afterwards. Lowercase
// becomes uppercase because the alphabet has no lowercase; a character outside the alphabet
// cannot appear in any code, so dropping it loses nothing and spares the reader a lookup that was
// never going to find anything. Lives here rather than in the component so the alphabet is not
// written down twice.
export const normalizeSessionCode = (input: string): string =>
  [...input.toUpperCase()]
    .filter((character) => ALPHABET.includes(character))
    .join('')
    .slice(0, SESSION_CODE_LENGTH);
