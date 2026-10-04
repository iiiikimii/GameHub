// Number Rush utilities

// Generate a shuffled grid of numbers 1..count
export function generateGrid(count = 9) {
  const nums = Array.from({ length: count }, (_, i) => i + 1)
  // Fisher-Yates shuffle
  for (let i = nums.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[nums[i], nums[j]] = [nums[j], nums[i]]
  }
  return nums
}

// Score: base points per correct click, minus penalty for wrongs, bonus for time remaining
export function calculateNumberRushScore({ correct, wrong, timeLeft, totalTime, gridSize }) {
  const BASE_PER_CORRECT = 80
  const WRONG_PENALTY = 40
  const TIME_BONUS_MAX = 200

  const correctPoints = correct * BASE_PER_CORRECT
  const wrongDeductions = wrong * WRONG_PENALTY
  const timeBonus = Math.round((timeLeft / totalTime) * TIME_BONUS_MAX)

  return Math.max(0, correctPoints - wrongDeductions + timeBonus)
}

// Grid configurations for different sizes
export const GRID_SIZE = 9    // 3×3 grid of numbers 1-9
export const TOTAL_TIME = 30  // seconds
