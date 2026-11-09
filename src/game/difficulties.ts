export type DifficultyId = 'calm' | 'dense' | 'extreme' | 'nightmare' | 'abyss'

export interface DifficultyConfig {
  id: DifficultyId
  label: string
  detail: number
  cellCount: number
  mines: number
  labelScale: number
}

export const DIFFICULTIES: readonly DifficultyConfig[] = [
  { id: 'calm', label: '简单', detail: 1, cellCount: 42, mines: 6, labelScale: 0.62 },
  { id: 'dense', label: '标准', detail: 3, cellCount: 162, mines: 26, labelScale: 0.32 },
  { id: 'extreme', label: '极限', detail: 4, cellCount: 252, mines: 48, labelScale: 0.25 },
  { id: 'nightmare', label: '噩梦', detail: 5, cellCount: 362, mines: 78, labelScale: 0.21 },
  { id: 'abyss', label: '深渊', detail: 7, cellCount: 642, mines: 154, labelScale: 0.16 }
]

export const DIFFICULTY_BY_ID = new Map(
  DIFFICULTIES.map((difficulty) => [difficulty.id, difficulty])
)
