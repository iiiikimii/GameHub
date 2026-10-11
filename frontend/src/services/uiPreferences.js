const STORAGE_KEY = 'gamehub_ui_preferences_v1'

export const DEFAULT_UI_PREFERENCES = Object.freeze({
  textSize: 'standard',
  reduceMotion: false,
})

export function readUiPreferences() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? 'null')
    return {
      textSize: ['standard', 'large', 'larger'].includes(saved?.textSize) ? saved.textSize : DEFAULT_UI_PREFERENCES.textSize,
      reduceMotion: saved?.reduceMotion === true,
    }
  } catch {
    return { ...DEFAULT_UI_PREFERENCES }
  }
}

export function applyUiPreferences(preferences) {
  if (typeof document === 'undefined') return
  const textSize = ['standard', 'large', 'larger'].includes(preferences?.textSize) ? preferences.textSize : DEFAULT_UI_PREFERENCES.textSize
  document.documentElement.dataset.textSize = textSize
  document.documentElement.dataset.motion = preferences?.reduceMotion === true ? 'reduced' : 'standard'
}

export function saveUiPreferences(preferences) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences))
  } catch {
    // The setting still applies for this page session when storage is unavailable.
  }
}
