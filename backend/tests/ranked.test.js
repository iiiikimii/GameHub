import assert from 'node:assert/strict'
import test from 'node:test'
import {
  calculateMatchRp,
  getTierForRp,
  getTierInfo,
  getRankedRules,
  GAME_BENCHMARKS,
} from '../services/rankedService.js'

test('rank tiers switch exactly at their documented RP thresholds', () => {
  assert.equal(getTierForRp(0), 'BRONZE')
  assert.equal(getTierForRp(499), 'BRONZE')
  assert.equal(getTierForRp(500), 'SILVER')
  assert.equal(getTierForRp(999), 'SILVER')
  assert.equal(getTierForRp(1000), 'GOLD')
  assert.equal(getTierForRp(1500), 'PLATINUM')
  assert.equal(getTierForRp(2000), 'DIAMOND')
  assert.equal(getTierForRp(-10), 'BRONZE')
})

test('progress to the next tier is calculated within the current tier', () => {
  const info = getTierInfo('SILVER', 750)

  assert.equal(info.nextTier, 'GOLD')
  assert.equal(info.rpInTier, 250)
  assert.equal(info.rpNeededForNext, 500)
  assert.equal(info.progressPercent, 50)
})

test('each eligible game uses its own inclusive draw band', () => {
  const examples = [
    ['reaction-test', 649, 'LOSS'],
    ['reaction-test', 650, 'DRAW'],
    ['reaction-test', 750, 'DRAW'],
    ['reaction-test', 751, 'WIN'],
    ['number-rush', 749, 'LOSS'],
    ['number-rush', 750, 'DRAW'],
    ['number-rush', 900, 'DRAW'],
    ['number-rush', 901, 'WIN'],
    ['memory-match', 899, 'LOSS'],
    ['memory-match', 900, 'DRAW'],
    ['memory-match', 1100, 'DRAW'],
    ['memory-match', 1101, 'WIN'],
  ]

  for (const [gameSlug, score, expectedResult] of examples) {
    const result = calculateMatchRp({
      gameSlug,
      score,
      currentTier: 'BRONZE',
      duration: GAME_BENCHMARKS[gameSlug].minDuration,
    })
    assert.equal(result.result, expectedResult, `${gameSlug} score ${score}`)
  }
})

test('RP base changes follow the documented tier and result table', () => {
  const results = [
    ['BRONZE', 751, 35], ['BRONZE', 700, 15], ['BRONZE', 600, -5],
    ['SILVER', 751, 30], ['SILVER', 700, 10], ['SILVER', 600, -15],
    ['GOLD', 751, 25], ['GOLD', 700, 5], ['GOLD', 600, -20],
    ['PLATINUM', 751, 22], ['PLATINUM', 700, 0], ['PLATINUM', 600, -22],
    ['DIAMOND', 751, 20], ['DIAMOND', 700, -5], ['DIAMOND', 600, -25],
  ]

  for (const [currentTier, score, expectedBase] of results) {
    const result = calculateMatchRp({ gameSlug: 'reaction-test', score, currentTier, duration: 1 })
    assert.equal(result.baseChange, expectedBase, `${currentTier} score ${score}`)
    assert.equal(result.rpChange, expectedBase)
  }
})

test('performance bonus is rounded from normalized per-game score and capped at nine RP', () => {
  const atThreshold = calculateMatchRp({
    gameSlug: 'reaction-test', score: 850, currentTier: 'BRONZE', duration: 1,
  })
  const perfect = calculateMatchRp({
    gameSlug: 'reaction-test', score: 1000, currentTier: 'BRONZE', duration: 1,
  })

  assert.equal(atThreshold.performancePct, 85)
  assert.equal(atThreshold.perfBonus, 0)
  assert.equal(perfect.perfBonus, 9)
  assert.equal(perfect.rpChange, 44)
})

test('public ranked rules are generated from the rating constants', () => {
  const rules = getRankedRules()
  const reaction = rules.games.find((game) => game.slug === 'reaction-test')

  assert.equal(reaction.maxScore, GAME_BENCHMARKS['reaction-test'].maxScore)
  assert.equal(reaction.drawLow, GAME_BENCHMARKS['reaction-test'].drawLow)
  assert.equal(rules.baseRpChanges.BRONZE.WIN, 35)
  assert.equal(rules.baseRpChanges.DIAMOND.LOSS, -25)
  assert.equal(rules.tiers.find((tier) => tier.tier === 'DIAMOND').minRp, 2000)
  assert.equal(rules.performanceBonus.maxRp, 9)
  assert.equal(rules.durationAffectsRating, false)
})

test('unsupported games and invalid score or duration cannot produce an RP result', () => {
  assert.throws(() => calculateMatchRp({ gameSlug: 'other', score: 100, currentTier: 'BRONZE', duration: 10 }), { statusCode: 400 })
  assert.throws(() => calculateMatchRp({ gameSlug: 'reaction-test', score: 1001, currentTier: 'BRONZE', duration: 1 }), { statusCode: 400 })
  assert.throws(() => calculateMatchRp({ gameSlug: 'reaction-test', score: 100.5, currentTier: 'BRONZE', duration: 1 }), { statusCode: 400 })
  assert.throws(() => calculateMatchRp({ gameSlug: 'number-rush', score: 1000, currentTier: 'BRONZE', duration: 2 }), { statusCode: 400 })
})
