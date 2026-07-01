import { describe, expect, it } from 'vitest'
import { getActualSharesForDecision } from './OperationPanel'

describe('OperationPanel helpers', () => {
  it('uses suggested shares when the user has not manually edited actual shares', () => {
    expect(getActualSharesForDecision({
      tag: 'normal',
      hasManualActualShares: false,
      actualSharesInput: null,
      suggestedShares: 3,
    })).toBe(3)
  })

  it('uses zero shares for paused records even when a suggestion exists', () => {
    expect(getActualSharesForDecision({
      tag: 'paused',
      hasManualActualShares: false,
      actualSharesInput: null,
      suggestedShares: 3,
    })).toBe(0)
  })
})
