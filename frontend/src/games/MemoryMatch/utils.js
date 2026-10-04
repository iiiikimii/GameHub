// Memory Match utilities

export const DIFFICULTIES = {
  easy: { label: 'Easy', pairs: 4, cols: 4, description: '4 pairs · 8 cards' },
  medium: { label: 'Medium', pairs: 6, cols: 4, description: '6 pairs · 12 cards' },
  hard: { label: 'Hard', pairs: 8, cols: 4, description: '8 pairs · 16 cards' },
}

// Emoji sets for cards
const EMOJI_POOL = [
  '🎮', '🏆', '⚡', '🧠', '🎯', '🌟', '🔥', '🎲',
  '🚀', '💎', '🦊', '🐉', '🌈', '🎭', '🏄', '🎸',
]

export function generateCards(pairs) {
  const emojis = EMOJI_POOL.slice(0, pairs)
  const cardValues = [...emojis, ...emojis]

  // Fisher-Yates shuffle
  for (let i = cardValues.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[cardValues[i], cardValues[j]] = [cardValues[j], cardValues[i]]
  }

  return cardValues.map((value, index) => ({
    id: index,
    value,
    isFlipped: false,
    isMatched: false,
  }))
}

// Score formula: base points + move efficiency bonus + time bonus
export function calculateMemoryScore({ pairs, moves, timeSeconds, difficulty }) {
  const BASE = pairs * 120
  const PERFECT_MOVES = pairs  // minimum possible moves
  const moveEfficiency = Math.max(0, 1 - (moves - PERFECT_MOVES) / (PERFECT_MOVES * 3))
  const moveBonus = Math.round(moveEfficiency * 400)

  const maxTime = { easy: 60, medium: 90, hard: 120 }[difficulty] ?? 90
  const timeBonus = Math.round(Math.max(0, 1 - timeSeconds / maxTime) * 300)

  return Math.max(0, BASE + moveBonus + timeBonus)
}
