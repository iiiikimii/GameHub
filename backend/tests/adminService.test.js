import assert from 'node:assert/strict'
import test from 'node:test'
import { adminDeleteScore } from '../services/adminService.js'

function createDatabase(scoreRow) {
  const calls = []
  const connection = {
    async beginTransaction() { calls.push({ type: 'begin' }) },
    async execute(sql, params) {
      calls.push({ type: 'execute', sql, params })
      if (sql.startsWith('SELECT user_id, score')) return [[scoreRow].filter(Boolean), []]
      if (sql.startsWith('DELETE FROM scores')) return [{ affectedRows: scoreRow ? 1 : 0 }, []]
      return [{ affectedRows: 1 }, []]
    },
    async commit() { calls.push({ type: 'commit' }) },
    async rollback() { calls.push({ type: 'rollback' }) },
    release() { calls.push({ type: 'release' }) },
  }

  return {
    calls,
    database: { async getConnection() { return connection } },
  }
}

test('admin score deletion locks the score and adjusts the total in one transaction', async () => {
  const { calls, database } = createDatabase({ user_id: 7, score: 125 })

  assert.deepEqual(await adminDeleteScore('42', database), { scoreId: 42 })
  assert.deepEqual(calls.map(({ type }) => type), [
    'begin', 'execute', 'execute', 'execute', 'commit', 'release',
  ])
  assert.match(calls[1].sql, /FOR UPDATE$/)
  assert.match(calls[2].sql, /^DELETE FROM scores/)
  assert.deepEqual(calls[3].params, [125, 7])
})

test('admin score deletion does not adjust totals when the score is already absent', async () => {
  const { calls, database } = createDatabase(null)

  await assert.rejects(adminDeleteScore('42', database), { statusCode: 404 })
  assert.deepEqual(calls.map(({ type }) => type), ['begin', 'execute', 'rollback', 'release'])
})
