// Reaction Test score formula:
// Base: 1000 points. Subtract proportionally based on reaction time.
// <150ms = 1000, 150-300ms = 900-1000, 300-500ms = 700-900, >500ms diminishes rapidly.

export function calculateReactionScore(reactionMs) {
  if (reactionMs <= 0) return 0
  if (reactionMs <= 150) return 1000
  if (reactionMs <= 300) return Math.round(1000 - ((reactionMs - 150) / 150) * 100)  // 900–1000
  if (reactionMs <= 500) return Math.round(900 - ((reactionMs - 300) / 200) * 200)   // 700–900
  if (reactionMs <= 800) return Math.round(700 - ((reactionMs - 500) / 300) * 300)   // 400–700
  if (reactionMs <= 1500) return Math.round(400 - ((reactionMs - 800) / 700) * 300)  // 100–400
  return Math.max(0, Math.round(100 - ((reactionMs - 1500) / 500) * 100))
}

export function getPerformanceLabel(reactionMs) {
  if (reactionMs <= 150) return { label: 'LIGHTNING', color: '#c8f169' }
  if (reactionMs <= 250) return { label: 'EXCELLENT', color: '#c8f169' }
  if (reactionMs <= 350) return { label: 'GREAT', color: '#8fd2dd' }
  if (reactionMs <= 500) return { label: 'GOOD', color: '#8fd2dd' }
  if (reactionMs <= 800) return { label: 'AVERAGE', color: '#f4f4ed' }
  return { label: 'SLOW', color: '#ef8b72' }
}

// Random delay between 1500ms and 4000ms
export function getRandomDelay() {
  return Math.round(1500 + Math.random() * 2500)
}
