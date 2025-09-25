export function countryCodeToEmoji(cc) {
    const code = (cc || "").toUpperCase();
    if (code.length !== 2) return "🏳️";
    const A = 0x1F1E6;
    return String.fromCodePoint(A + (code.charCodeAt(0) - 65))
         + String.fromCodePoint(A + (code.charCodeAt(1) - 65));
  }
  