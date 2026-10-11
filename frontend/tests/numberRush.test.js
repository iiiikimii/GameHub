import assert from 'node:assert/strict'
import test from 'node:test'
import { calculateNumberRushScore } from '../src/games/NumberRush/utils.js'

test('Number Rush score never exceeds the backend submission limit', () => {
  const score = calculateNumberRushScore({
    correct: 25,
    wrong: 0,
    timeLeft: 5,
    totalTime: 30,
  })

  assert.equal(score, 2000)
})

test('Number Rush keeps its score formula below the submission limit', () => {
  const score = calculateNumberRushScore({
    correct: 10,
    wrong: 2,
    timeLeft: 15,
    totalTime: 30,
  })

  assert.equal(score, 820)
})
