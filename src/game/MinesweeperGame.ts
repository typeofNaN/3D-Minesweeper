import { HexCoordinate } from '../utils/SphereGrid';

export enum CellState {
  HIDDEN = 'hidden',
  REVEALED = 'revealed',
  FLAGGED = 'flagged',
  EXPLODED = 'exploded'
}

export interface Cell {
  coord: HexCoordinate;
  isMine: boolean;
  state: CellState;
  adjacentMines: number;
}

export class MinesweeperGame {
  private cells: Map<string, Cell> = new Map();
  private gridKeys: string[];
  private mineCount: number;
  private gameOver: boolean = false;
  private gameWon: boolean = false;
  private firstClick: boolean = true;
  private getKey: (coord: HexCoordinate) => string;
  private getNeighbors: (coord: HexCoordinate) => HexCoordinate[];

  constructor(
    gridKeys: string[],
    mineCount: number,
    getKey: (coord: HexCoordinate) => string,
    getNeighbors: (coord: HexCoordinate) => HexCoordinate[]
  ) {
    this.gridKeys = gridKeys;
    this.mineCount = mineCount;
    this.getKey = getKey;
    this.getNeighbors = getNeighbors;
    this.initializeCells();
  }

  /**
   * 初始化所有格子
   */
  private initializeCells() {
    for (const key of this.gridKeys) {
      // 从key解析坐标
      const parts = key.split(',');
      if (parts.length !== 3) continue;
      const coord: HexCoordinate = {
        q: parseInt(parts[0]),
        r: parseInt(parts[1]),
        s: parseInt(parts[2])
      };

      this.cells.set(key, {
        coord,
        isMine: false,
        state: CellState.HIDDEN,
        adjacentMines: 0
      });
    }
  }

  /**
   * 在首次点击后生成地雷
   */
  private generateMines(excludeKey: string) {
    const availableKeys = this.gridKeys.filter(key => key !== excludeKey);
    const mineKeys = new Set<string>();

    while (mineKeys.size < this.mineCount && mineKeys.size < availableKeys.length) {
      const randomKey = availableKeys[Math.floor(Math.random() * availableKeys.length)];
      mineKeys.add(randomKey);
    }

    // 设置地雷
    for (const key of mineKeys) {
      const cell = this.cells.get(key);
      if (cell) {
        cell.isMine = true;
      }
    }

    // 计算每个格子周围的地雷数
    for (const [key, cell] of this.cells) {
      if (!cell.isMine) {
        const neighbors = this.getNeighbors(cell.coord);
        let count = 0;
        for (const neighbor of neighbors) {
          const neighborKey = this.getKey(neighbor);
          const neighborCell = this.cells.get(neighborKey);
          if (neighborCell?.isMine) {
            count++;
          }
        }
        cell.adjacentMines = count;
      }
    }
  }

  /**
   * 点击格子（左键）
   */
  revealCell(key: string): boolean {
    if (this.gameOver || this.gameWon) return false;

    const cell = this.cells.get(key);
    if (!cell || cell.state !== CellState.HIDDEN) return false;

    // 首次点击时生成地雷（确保首次点击不会是地雷）
    if (this.firstClick) {
      this.generateMines(key);
      this.firstClick = false;
    }

    // 如果点击到地雷，游戏结束
    if (cell.isMine) {
      cell.state = CellState.EXPLODED;
      this.gameOver = true;
      return false;
    }

    // 揭示格子
    this.revealCellRecursive(key);

    // 检查是否获胜
    this.checkWin();

    return true;
  }

  /**
   * 递归揭示格子（如果周围没有地雷，自动揭示相邻格子）
   */
  private revealCellRecursive(key: string) {
    const cell = this.cells.get(key);
    if (!cell || cell.state !== CellState.HIDDEN || cell.isMine) return;

    cell.state = CellState.REVEALED;

    // 如果周围没有地雷，递归揭示相邻格子
    if (cell.adjacentMines === 0) {
      const neighbors = this.getNeighbors(cell.coord);
      for (const neighbor of neighbors) {
        const neighborKey = this.getKey(neighbor);
        const neighborCell = this.cells.get(neighborKey);
        if (neighborCell && neighborCell.state === CellState.HIDDEN) {
          this.revealCellRecursive(neighborKey);
        }
      }
    }
  }

  /**
   * 标记/取消标记格子（右键）
   */
  toggleFlag(key: string): boolean {
    if (this.gameOver || this.gameWon) return false;

    const cell = this.cells.get(key);
    if (!cell || cell.state === CellState.REVEALED) return false;

    if (cell.state === CellState.HIDDEN) {
      cell.state = CellState.FLAGGED;
    } else if (cell.state === CellState.FLAGGED) {
      cell.state = CellState.HIDDEN;
    }

    return true;
  }

  /**
   * 检查是否获胜
   */
  private checkWin() {
    let revealedCount = 0;
    for (const cell of this.cells.values()) {
      if (cell.state === CellState.REVEALED && !cell.isMine) {
        revealedCount++;
      }
    }

    const totalCells = this.gridKeys.length;
    const nonMineCells = totalCells - this.mineCount;

    if (revealedCount === nonMineCells) {
      this.gameWon = true;
    }
  }

  /**
   * 获取格子信息
   */
  getCell(key: string): Cell | undefined {
    return this.cells.get(key);
  }

  /**
   * 获取所有格子
   */
  getAllCells(): Map<string, Cell> {
    return this.cells;
  }

  /**
   * 重置游戏
   */
  reset() {
    this.cells.clear();
    this.gameOver = false;
    this.gameWon = false;
    this.firstClick = true;
    this.initializeCells();
  }

  /**
   * 获取游戏状态
   */
  isGameOver(): boolean {
    return this.gameOver;
  }

  isGameWon(): boolean {
    return this.gameWon;
  }

  /**
   * 获取已标记数量
   */
  getFlaggedCount(): number {
    let count = 0;
    for (const cell of this.cells.values()) {
      if (cell.state === CellState.FLAGGED) {
        count++;
      }
    }
    return count;
  }
}

