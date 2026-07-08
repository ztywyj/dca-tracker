import { describe, expect, it } from 'vitest'
import { buildBackupPayload } from './backup'

describe('buildBackupPayload', () => {
  const planA = { id: 'plan-a', name: 'Plan A' }
  const planB = { id: 'plan-b', name: 'Plan B' }
  const records = [{ id: 'record-1', planId: 'plan-a' }]

  it('includes every plan when a full plans list is provided', () => {
    // Regression test: exporting used to only ever include the single
    // active plan, silently dropping other plans from the backup file.
    const payload = buildBackupPayload(planA, [planA, planB], records)

    expect(payload.plans).toEqual([planA, planB])
    expect(payload.plan).toBe(planA)
    expect(payload.activePlanId).toBe('plan-a')
    expect(payload.records).toBe(records)
    expect(payload.version).toBe('2.0')
    expect(typeof payload.exportedAt).toBe('string')
  })

  it('falls back to the single active plan when no plans list is available', () => {
    const payload = buildBackupPayload(planA, undefined, records)

    expect(payload.plans).toEqual([planA])
  })

  it('produces an empty plans array when there is no active plan', () => {
    const payload = buildBackupPayload(null, [], [])

    expect(payload.plans).toEqual([])
    expect(payload.activePlanId).toBeNull()
    expect(payload.records).toEqual([])
  })
})
