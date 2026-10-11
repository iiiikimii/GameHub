import assert from 'node:assert/strict'
import test from 'node:test'
import { getPeriodInfo } from '../services/questService.js'
import { calculateLevelInfo } from '../services/progressionService.js'

test('daily quest period starts and resets at midnight UTC', () => {
  const periods = getPeriodInfo(new Date('2026-10-11T23:59:59.999Z'))

  assert.equal(periods.dailyPeriodKey, '2026-10-11')
  assert.equal(periods.dailyStartUtc, '2026-10-11 00:00:00.000')
  assert.equal(periods.nextDailyStartUtc, '2026-10-12 00:00:00.000')
  assert.equal(periods.dailyResetSeconds, 0)
})

test('weekly quest period is ISO Monday-to-Monday in UTC', () => {
  const periods = getPeriodInfo(new Date('2026-10-11T23:59:59.999Z'))

  assert.equal(periods.weeklyPeriodKey, '2026-W41')
  assert.equal(periods.weeklyStartUtc, '2026-10-05 00:00:00.000')
  assert.equal(periods.nextWeeklyStartUtc, '2026-10-12 00:00:00.000')
})

test('ISO week numbering stays correct across a calendar year boundary', () => {
  const periods = getPeriodInfo(new Date('2021-01-01T12:00:00.000Z'))

  assert.equal(periods.weeklyPeriodKey, '2020-W53')
  assert.equal(periods.weeklyStartUtc, '2020-12-28 00:00:00.000')
  assert.equal(periods.nextWeeklyStartUtc, '2021-01-04 00:00:00.000')
})

test('XP thresholds produce consistent levels and progress', () => {
  assert.equal(calculateLevelInfo(199).level, 1)
  assert.equal(calculateLevelInfo(200).level, 2)
  assert.equal(calculateLevelInfo(500).level, 3)
  assert.equal(calculateLevelInfo(500).progressPercent, 0)
})
