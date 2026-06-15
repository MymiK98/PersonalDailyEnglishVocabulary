// tts.js — Web Speech API 발음 재생

export function ttsSupported() {
  return 'speechSynthesis' in window;
}

export function speak(text, lang = 'en-US') {
  if (!ttsSupported() || !text) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    window.speechSynthesis.speak(u);
  } catch (e) {
    console.warn('TTS 실패:', e);
  }
}
