let preferredEnglishVoice = null
let voiceTrackingInitialized = false

function resolvePreferredEnglishVoice() {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return null
  }

  const voices = window.speechSynthesis.getVoices()
  if (!Array.isArray(voices) || voices.length === 0) {
    return null
  }

  return (
    voices.find((voice) => voice.lang === 'en-US') ??
    voices.find((voice) => voice.lang === 'en-GB') ??
    voices.find((voice) => typeof voice.lang === 'string' && voice.lang.toLowerCase().startsWith('en')) ??
    null
  )
}

function ensureVoiceTracking() {
  if (voiceTrackingInitialized || typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return
  }

  const updatePreferredVoice = () => {
    preferredEnglishVoice = resolvePreferredEnglishVoice()
  }

  updatePreferredVoice()
  window.speechSynthesis.addEventListener('voiceschanged', updatePreferredVoice)
  voiceTrackingInitialized = true
}

export function speakWithPreferredVoice(text) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window) || typeof text !== 'string' || !text.trim()) {
    return
  }

  ensureVoiceTracking()
  const englishVoice = preferredEnglishVoice ?? resolvePreferredEnglishVoice()
  const utterance = new SpeechSynthesisUtterance(text)

  if (englishVoice) {
    utterance.lang = 'en-US'
    utterance.voice = englishVoice
    utterance.voiceURI = englishVoice.voiceURI
  }

  window.speechSynthesis.speak(utterance)
}
