import { describe, expect, it } from 'vitest'
import { DIFFICULTIES } from '../game/difficulties'
import { SphereGrid } from './SphereGrid'

describe('SphereGrid', () => {
  it.each([
    [1, 42],
    [3, 162]
  ])('creates a complete detail-%i dual icosphere with %i cells', (detail, count) => {
    const cells = SphereGrid.generate(detail, 5)

    expect(cells).toHaveLength(count)
    expect(cells.filter((cell) => cell.boundary.length === 5)).toHaveLength(12)
    expect(cells.filter((cell) => cell.boundary.length === 6)).toHaveLength(count - 12)
  })

  it('creates ordered boundaries and reciprocal unique neighbors', () => {
    const cells = SphereGrid.generate(3, 5)
    const byId = new Map(cells.map((cell) => [cell.id, cell]))

    for (const cell of cells) {
      expect(new Set(cell.neighborIds).size).toBe(cell.neighborIds.length)
      expect(cell.neighborIds).toHaveLength(cell.boundary.length)
      expect(cell.center.length()).toBeCloseTo(5, 5)

      const normal = cell.center.clone().normalize()
      for (let index = 0; index < cell.boundary.length; index++) {
        const current = cell.boundary[index].clone().sub(cell.center)
        const next = cell.boundary[(index + 1) % cell.boundary.length].clone().sub(cell.center)
        expect(current.cross(next).dot(normal)).toBeGreaterThan(0)
      }

      for (const neighborId of cell.neighborIds) {
        expect(byId.get(neighborId)?.neighborIds).toContain(cell.id)
      }
    }
  })

  it.each(DIFFICULTIES)('matches the declared $label tier cell count', ({ detail, cellCount }) => {
    expect(SphereGrid.generate(detail, 5)).toHaveLength(cellCount)
  })
})
