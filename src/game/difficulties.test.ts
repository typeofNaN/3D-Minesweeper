import { describe, expect, it } from 'vitest'
import { DIFFICULTIES } from './difficulties'

describe('DIFFICULTIES', () => {
  it('defines five progressively larger boards with the approved mine totals', () => {
    expect(
      DIFFICULTIES.map(({ id, label, cellCount, mines }) => ({ id, label, cellCount, mines }))
    ).toEqual([
      { id: 'calm', label: '简单', cellCount: 42, mines: 6 },
      { id: 'dense', label: '标准', cellCount: 162, mines: 26 },
      { id: 'extreme', label: '极限', cellCount: 252, mines: 48 },
      { id: 'nightmare', label: '噩梦', cellCount: 362, mines: 78 },
      { id: 'abyss', label: '深渊', cellCount: 642, mines: 154 }
    ])
  })

  it('increases mine density at every tier', () => {
    const densities = DIFFICULTIES.map((difficulty) => difficulty.mines / difficulty.cellCount)

    for (let index = 1; index < densities.length; index++) {
      expect(densities[index]).toBeGreaterThan(densities[index - 1])
    }
  })
})
