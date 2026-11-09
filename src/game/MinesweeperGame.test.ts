import { describe, expect, it } from 'vitest'
import { CellState, GameStatus, MinesweeperGame } from './MinesweeperGame'

const lineNeighbors = (count: number): Map<number, number[]> =>
  new Map(
    Array.from({ length: count }, (_, id) => [
      id,
      [id - 1, id + 1].filter((neighbor) => neighbor >= 0 && neighbor < count)
    ])
  )

describe('MinesweeperGame', () => {
  it('keeps the first cell and all of its neighbors safe', () => {
    const game = new MinesweeperGame([0, 1, 2, 3, 4, 5], lineNeighbors(6), 2, () => 0)

    const result = game.reveal(2)

    expect(result.changedIds).toContain(2)
    expect(game.getCell(2)?.isMine).toBe(false)
    expect(game.getCell(1)?.isMine).toBe(false)
    expect(game.getCell(3)?.isMine).toBe(false)
    expect(game.getCells().filter((cell) => cell.isMine)).toHaveLength(2)
    expect(game.status).not.toBe(GameStatus.LOST)
  })

  it('caps impossible mine counts instead of sacrificing the first-click safe zone', () => {
    const game = new MinesweeperGame([0, 1, 2, 3, 4], lineNeighbors(5), 4, () => 0.99)

    game.reveal(2)

    expect(game.totalMines).toBe(2)
    expect([1, 2, 3].every((id) => game.getCell(id)?.isMine === false)).toBe(true)
    expect(game.getCells().filter((cell) => cell.isMine)).toHaveLength(2)
  })

  it('flood-reveals connected empty cells without revealing flags or mines', () => {
    const neighbors = new Map<number, number[]>([
      [0, [1]],
      [1, [0, 2]],
      [2, [1, 3]],
      [3, [2, 4]],
      [4, [3]]
    ])
    const game = new MinesweeperGame([0, 1, 2, 3, 4], neighbors, 1, () => 0.99)
    game.toggleFlag(3)

    const result = game.reveal(0)

    expect(result.changedIds).toEqual(expect.arrayContaining([0, 1, 2]))
    expect(game.getCell(3)?.state).toBe(CellState.FLAGGED)
    expect(
      game.getCells().filter((cell) => cell.isMine && cell.state === CellState.REVEALED)
    ).toHaveLength(0)
  })

  it('toggles flags and reports the remaining mine count', () => {
    const game = new MinesweeperGame([0, 1, 2, 3], lineNeighbors(4), 1, () => 0)

    expect(game.toggleFlag(1).changedIds).toEqual([1])
    expect(game.getCell(1)?.state).toBe(CellState.FLAGGED)
    expect(game.flagsRemaining).toBe(0)
    game.toggleFlag(1)
    expect(game.getCell(1)?.state).toBe(CellState.HIDDEN)
    expect(game.flagsRemaining).toBe(1)
  })

  it('does not place more flags than the configured mine total', () => {
    const game = new MinesweeperGame([0, 1, 2, 3], lineNeighbors(4), 1, () => 0)

    game.toggleFlag(0)
    const blocked = game.toggleFlag(1)

    expect(blocked.changedIds).toEqual([])
    expect(game.getCell(1)?.state).toBe(CellState.HIDDEN)
    expect(game.flagsRemaining).toBe(0)
  })

  it('chords a revealed numbered cell when its adjacent flags match', () => {
    const neighbors = new Map<number, number[]>([
      [0, []],
      [1, [2]],
      [2, [1, 3, 4]],
      [3, [2]],
      [4, [2]]
    ])
    const game = new MinesweeperGame([0, 1, 2, 3, 4], neighbors, 1, () => 0)
    game.reveal(0)
    game.reveal(2)
    const mine = game.getCells().find((cell) => cell.isMine)!
    game.toggleFlag(mine.id)

    const result = game.reveal(2)

    expect(result.changedIds.length).toBeGreaterThan(0)
    expect(
      [1, 3, 4]
        .filter((id) => id !== mine.id)
        .every((id) => game.getCell(id)?.state === CellState.REVEALED)
    ).toBe(true)
  })

  it('loses on a mine and wins after every safe cell is revealed', () => {
    const losing = new MinesweeperGame([0, 1, 2, 3], lineNeighbors(4), 1, () => 0)
    losing.reveal(0)
    const mineId = losing.getCells().find((cell) => cell.isMine)!.id
    const loss = losing.reveal(mineId)
    expect(loss.status).toBe(GameStatus.LOST)
    expect(losing.getCell(mineId)?.state).toBe(CellState.EXPLODED)

    const winning = new MinesweeperGame([0, 1, 2, 3], lineNeighbors(4), 1, () => 0)
    winning.reveal(0)
    for (const cell of winning.getCells()) {
      if (!cell.isMine) winning.reveal(cell.id)
    }
    expect(winning.status).toBe(GameStatus.WON)
  })
})
