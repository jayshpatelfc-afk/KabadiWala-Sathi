export const speakText = (text, lang = "hi") => {
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    const preferredLang = lang === "hi" ? "hi-IN" : "en-US";
    const availableVoices = window.speechSynthesis.getVoices();
    const matchingVoice = availableVoices.find(
      (voice) => voice.lang.toLowerCase().startsWith(preferredLang.slice(0, 2))
    );

    utterance.lang = preferredLang;
    if (matchingVoice) {
      utterance.voice = matchingVoice;
    }

    window.speechSynthesis.speak(utterance);
  }
};