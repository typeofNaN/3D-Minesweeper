export enum CellState {
  HIDDEN = 'hidden',
  REVEALED = 'revealed',
  FLAGGED = 'flagged',
  EXPLODED = 'exploded'
}

export enum GameStatus {
  READY = 'ready',
  PLAYING = 'playing',
  WON = 'won',
  LOST = 'lost'
}

export interface GameCell {
  id: number
  isMine: boolean
  state: CellState
  adjacentMines: number
}

export interface GameActionResult {
  changedIds: number[]
  status: GameStatus
}

export class MinesweeperGame {
  private readonly cells = new Map<number, GameCell>()
  private readonly ids: number[]
  private readonly neighbors: Map<number, number[]>
  private readonly mineCount: number
  private readonly random: () => number
  private minesGenerated = false
  private _status = GameStatus.READY

  constructor(
    ids: number[],
    neighbors: Map<number, number[]>,
    mineCount: number,
    random: () => number = Math.random
  ) {
    this.ids = [...ids]
    this.neighbors = neighbors
    const safeCapacity =
      ids.length === 0
        ? 0
        : Math.min(
            ...ids.map((id) => Math.max(0, ids.length - 1 - (neighbors.get(id)?.length ?? 0)))
          )
    this.mineCount = Math.max(0, Math.min(mineCount, safeCapacity))
    this.random = random

    for (const id of ids) {
      this.cells.set(id, {
        id,
        isMine: false,
        state: CellState.HIDDEN,
        adjacentMines: 0
      })
    }
  }

  get status(): GameStatus {
    return this._status
  }

  get flagsRemaining(): number {
    return (
      this.mineCount - this.getCells().filter((cell) => cell.state === CellState.FLAGGED).length
    )
  }

  get totalMines(): number {
    return this.mineCount
  }

  getCell(id: number): GameCell | undefined {
    return this.cells.get(id)
  }

  getCells(): GameCell[] {
    return Array.from(this.cells.values())
  }

  reveal(id: number): GameActionResult {
    if (this._status === GameStatus.LOST || this._status === GameStatus.WON) {
      return this.result([])
    }

    const cell = this.cells.get(id)
    if (!cell || cell.state === CellState.FLAGGED) return this.result([])

    if (!this.minesGenerated) this.generateMines(id)
    if (cell.state === CellState.REVEALED) return this.chord(id)
    if (cell.isMine) return this.explode(id)

    const changed = new Set<number>()
    this.floodReveal(id, changed)
    this.checkWin()
    return this.result(changed)
  }

  toggleFlag(id: number): GameActionResult {
    if (this._status === GameStatus.LOST || this._status === GameStatus.WON) {
      return this.result([])
    }

    const cell = this.cells.get(id)
    if (!cell || cell.state === CellState.REVEALED || cell.state === CellState.EXPLODED) {
      return this.result([])
    }

    if (cell.state === CellState.HIDDEN && this.flagsRemaining <= 0) return this.result([])
    cell.state = cell.state === CellState.FLAGGED ? CellState.HIDDEN : CellState.FLAGGED
    return this.result([id])
  }

  private generateMines(firstId: number): void {
    const protectedIds = new Set([firstId, ...(this.neighbors.get(firstId) ?? [])])
    const candidates = this.ids.filter((id) => !protectedIds.has(id))
    const mineIds: number[] = []

    while (mineIds.length < this.mineCount && candidates.length > 0) {
      const index = Math.min(candidates.length - 1, Math.floor(this.random() * candidates.length))
      mineIds.push(candidates.splice(index, 1)[0])
    }

    for (const mineId of mineIds) this.cells.get(mineId)!.isMine = true
    for (const cell of this.cells.values()) {
      cell.adjacentMines = (this.neighbors.get(cell.id) ?? []).filter(
        (neighborId) => this.cells.get(neighborId)?.isMine
      ).length
    }

    this.minesGenerated = true
    this._status = GameStatus.PLAYING
  }

  private floodReveal(startId: number, changed: Set<number>): void {
    const queue = [startId]
    const visited = new Set<number>()

    while (queue.length > 0) {
      const id = queue.shift()!
      if (visited.has(id)) continue
      visited.add(id)

      const cell = this.cells.get(id)
      if (!cell || cell.isMine || cell.state !== CellState.HIDDEN) continue
      cell.state = CellState.REVEALED
      changed.add(id)

      if (cell.adjacentMines === 0) {
        for (const neighborId of this.neighbors.get(id) ?? []) queue.push(neighborId)
      }
    }
  }

  private chord(id: number): GameActionResult {
    const cell = this.cells.get(id)!
    const neighborIds = this.neighbors.get(id) ?? []
    const flagged = neighborIds.filter(
      (neighborId) => this.cells.get(neighborId)?.state === CellState.FLAGGED
    ).length
    if (cell.adjacentMines === 0 || flagged !== cell.adjacentMines) return this.result([])

    const changed = new Set<number>()
    for (const neighborId of neighborIds) {
      const neighbor = this.cells.get(neighborId)
      if (!neighbor || neighbor.state !== CellState.HIDDEN) continue
      if (neighbor.isMine) return this.explode(neighborId, changed)
      this.floodReveal(neighborId, changed)
    }

    this.checkWin()
    return this.result(changed)
  }

  private explode(id: number, existing = new Set<number>()): GameActionResult {
    this.cells.get(id)!.state = CellState.EXPLODED
    existing.add(id)
    for (const cell of this.cells.values()) {
      if (cell.isMine && cell.id !== id && cell.state !== CellState.FLAGGED) {
        cell.state = CellState.REVEALED
        existing.add(cell.id)
      }
    }
    this._status = GameStatus.LOST
    return this.result(existing)
  }

  private checkWin(): void {
    if (this.getCells().every((cell) => cell.isMine || cell.state === CellState.REVEALED)) {
      this._status = GameStatus.WON
    }
  }

  private result(changed: Iterable<number>): GameActionResult {
    return { changedIds: Array.from(changed), status: this._status }
  }
}
