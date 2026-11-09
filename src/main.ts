import * as THREE from 'three'
import { CameraControls } from './controls/CameraControls'
import { DIFFICULTY_BY_ID, type DifficultyId } from './game/difficulties'
import {
  CellState,
  GameStatus,
  MinesweeperGame,
  type GameActionResult
} from './game/MinesweeperGame'
import { SphereGrid, type SphereCell } from './utils/SphereGrid'

const NUMBER_COLORS = ['#dbe8ec', '#0b8ca5', '#1b6da8', '#5b55a5', '#a05083', '#b9543d', '#b33b32']

class OrbitalSweepApp {
  private readonly scene = new THREE.Scene()
  private readonly camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.1, 100)
  private readonly renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  private readonly globe = new THREE.Group()
  private readonly raycaster = new THREE.Raycaster()
  private readonly pointer = new THREE.Vector2()
  private readonly cellMeshes = new Map<number, THREE.Mesh>()
  private readonly markers = new Map<number, THREE.Sprite>()
  private readonly materials = {
    hidden: new THREE.MeshStandardMaterial({
      color: 0x24384b,
      roughness: 0.76,
      metalness: 0.18,
      flatShading: true
    }),
    revealed: new THREE.MeshStandardMaterial({
      color: 0xcbd4d3,
      roughness: 0.92,
      metalness: 0.02,
      flatShading: true
    }),
    mine: new THREE.MeshStandardMaterial({
      color: 0x6e1f25,
      emissive: 0x3b090d,
      roughness: 0.55,
      metalness: 0.2
    }),
    exploded: new THREE.MeshStandardMaterial({
      color: 0xd04b3e,
      emissive: 0x66150f,
      emissiveIntensity: 0.8,
      roughness: 0.45
    }),
    seams: new THREE.LineBasicMaterial({ color: 0x0b1823, transparent: true, opacity: 0.92 })
  }

  private cells: SphereCell[] = []
  private game!: MinesweeperGame
  private difficulty: DifficultyId = 'dense'
  private hoveredId: number | null = null
  private startedAt: number | null = null
  private elapsedBeforeFinish = 0
  private flagMode = false

  constructor() {
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
    this.renderer.setSize(innerWidth, innerHeight)
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.05
    document.querySelector<HTMLDivElement>('#app')!.appendChild(this.renderer.domElement)

    this.scene.add(this.globe)
    this.setupScene()
    const controls = new CameraControls(this.globe, this.camera, this.renderer.domElement, {
      onTap: (event) => this.handleTap(event.clientX, event.clientY),
      onPointerMove: (event) => this.updateHover(event.clientX, event.clientY)
    })
    controls.reset()

    this.renderer.domElement.addEventListener('contextmenu', (event) => {
      event.preventDefault()
      this.flagAt(event.clientX, event.clientY)
    })
    window.addEventListener('resize', this.onResize)
    this.bindUI()
    this.startGame()
    this.animate()
  }

  private setupScene(): void {
    this.scene.fog = new THREE.FogExp2(0x07111b, 0.027)
    this.scene.add(new THREE.HemisphereLight(0xbad8e8, 0x111820, 1.55))

    const keyLight = new THREE.DirectionalLight(0xffe4bc, 3.2)
    keyLight.position.set(-5, 6, 8)
    this.scene.add(keyLight)

    const rimLight = new THREE.DirectionalLight(0x5ea5d1, 2.8)
    rimLight.position.set(6, 1, -5)
    this.scene.add(rimLight)

    const core = new THREE.Mesh(
      new THREE.SphereGeometry(4.91, 48, 32),
      new THREE.MeshStandardMaterial({ color: 0x101e2a, roughness: 0.88, metalness: 0.08 })
    )
    core.name = 'globe-core'
    this.globe.add(core)

    const orbit = new THREE.Mesh(
      new THREE.TorusGeometry(5.82, 0.014, 6, 180),
      new THREE.MeshBasicMaterial({ color: 0xd99a3c, transparent: true, opacity: 0.68 })
    )
    orbit.rotation.x = Math.PI * 0.56
    orbit.rotation.y = Math.PI * 0.12
    this.scene.add(orbit)

    const secondOrbit = orbit.clone()
    secondOrbit.scale.setScalar(1.012)
    secondOrbit.rotation.x = Math.PI * 0.48
    secondOrbit.rotation.y = -Math.PI * 0.15
    ;(secondOrbit.material as THREE.Material) = (orbit.material as THREE.Material).clone()
    ;(secondOrbit.material as THREE.MeshBasicMaterial).opacity = 0.18
    this.scene.add(secondOrbit)
  }

  private bindUI(): void {
    document
      .querySelector<HTMLButtonElement>('#restart')!
      .addEventListener('click', () => this.startGame())
    document.querySelectorAll<HTMLButtonElement>('[data-difficulty]').forEach((button) => {
      button.addEventListener('click', () => {
        this.difficulty = button.dataset.difficulty as DifficultyId
        this.startGame()
      })
    })
    document.querySelector<HTMLButtonElement>('#flag-mode')!.addEventListener('click', () => {
      this.setFlagMode(!this.flagMode)
    })
  }

  private startGame(): void {
    this.clearCells()
    const config = DIFFICULTY_BY_ID.get(this.difficulty)!
    this.cells = SphereGrid.generate(config.detail, 5)
    const neighborMap = new Map(this.cells.map((cell) => [cell.id, cell.neighborIds]))
    this.game = new MinesweeperGame(
      this.cells.map((cell) => cell.id),
      neighborMap,
      config.mines
    )
    this.startedAt = null
    this.elapsedBeforeFinish = 0
    this.setFlagMode(false)
    this.hoveredId = null
    this.globe.quaternion.identity()

    for (const cell of this.cells) {
      const geometry = this.createCellGeometry(cell)
      const mesh = new THREE.Mesh(geometry, this.materials.hidden)
      mesh.userData.cellId = cell.id
      mesh.userData.isCell = true
      this.cellMeshes.set(cell.id, mesh)
      this.globe.add(mesh)

      const seamGeometry = new THREE.BufferGeometry().setFromPoints([
        ...geometry.userData.edgePoints,
        geometry.userData.edgePoints[0]
      ])
      const seam = new THREE.Line(seamGeometry, this.materials.seams)
      seam.userData.isDecoration = true
      this.globe.add(seam)

      const marker = this.createMarker(cell, '', '#ffffff', config.labelScale)
      marker.visible = false
      this.markers.set(cell.id, marker)
      this.globe.add(marker)
    }

    document.querySelectorAll<HTMLButtonElement>('[data-difficulty]').forEach((button) => {
      const selected = button.dataset.difficulty === this.difficulty
      button.classList.toggle('selected', selected)
      button.setAttribute('aria-pressed', String(selected))
    })
    this.hideResult()
    this.updateUI()
  }

  private createCellGeometry(cell: SphereCell): THREE.BufferGeometry {
    const centerDirection = cell.center.clone().normalize()
    const edgePoints = cell.boundary.map((boundary) =>
      centerDirection
        .clone()
        .lerp(boundary.clone().normalize(), 0.9)
        .normalize()
        .multiplyScalar(5.015)
    )
    const positions: number[] = [...cell.center.clone().setLength(5.015).toArray()]
    edgePoints.forEach((point) => positions.push(...point.toArray()))
    const indices: number[] = []
    for (let index = 0; index < edgePoints.length; index++) {
      indices.push(0, index + 1, ((index + 1) % edgePoints.length) + 1)
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geometry.setIndex(indices)
    geometry.computeVertexNormals()
    geometry.userData.edgePoints = edgePoints
    return geometry
  }

  private createMarker(cell: SphereCell, text: string, color: string, scale: number): THREE.Sprite {
    const canvas = document.createElement('canvas')
    canvas.width = 128
    canvas.height = 128
    const context = canvas.getContext('2d')!
    context.clearRect(0, 0, 128, 128)
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillStyle = color
    context.shadowColor = 'rgba(0,0,0,.22)'
    context.shadowBlur = 4
    if (text === '⚑') {
      context.lineWidth = 9
      context.lineCap = 'round'
      context.strokeStyle = color
      context.beginPath()
      context.moveTo(43, 102)
      context.lineTo(43, 27)
      context.stroke()
      context.shadowBlur = 7
      context.beginPath()
      context.moveTo(48, 30)
      context.lineTo(97, 45)
      context.lineTo(48, 65)
      context.closePath()
      context.fill()
      context.beginPath()
      context.ellipse(48, 105, 29, 8, 0, 0, Math.PI * 2)
      context.fill()
    } else if (text === '✹') {
      context.font = '700 82px Inter, Arial, sans-serif'
      context.fillText('✹', 64, 68)
    } else {
      context.font = '700 76px Inter, Arial, sans-serif'
      context.fillText(text, 64, 68)
    }

    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    const marker = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: true })
    )
    marker.position.copy(cell.center).setLength(5.09)
    marker.scale.setScalar(scale)
    marker.userData.currentText = text
    marker.userData.hasContent = Boolean(text)
    return marker
  }

  private setMarker(id: number, text: string, color: string): void {
    const oldMarker = this.markers.get(id)!
    if (oldMarker.userData.currentText === `${text}:${color}`) {
      oldMarker.visible = Boolean(text)
      return
    }
    const cell = this.cells[id]
    const scale = DIFFICULTY_BY_ID.get(this.difficulty)!.labelScale
    const replacement = this.createMarker(cell, text, color, scale)
    replacement.userData.currentText = `${text}:${color}`
    replacement.userData.hasContent = Boolean(text)
    replacement.visible = Boolean(text)
    this.globe.add(replacement)
    this.globe.remove(oldMarker)
    ;(oldMarker.material as THREE.SpriteMaterial).map?.dispose()
    oldMarker.material.dispose()
    this.markers.set(id, replacement)
  }

  private revealAt(clientX: number, clientY: number): void {
    const id = this.pickCell(clientX, clientY)
    if (id === null) return
    const before = this.game.status
    const result = this.game.reveal(id)
    if (before === GameStatus.READY && this.game.status === GameStatus.PLAYING)
      this.startedAt = performance.now()
    this.applyResult(result)
  }

  private handleTap(clientX: number, clientY: number): void {
    if (this.flagMode) this.flagAt(clientX, clientY)
    else this.revealAt(clientX, clientY)
  }

  private setFlagMode(enabled: boolean): void {
    this.flagMode = enabled
    const button = document.querySelector<HTMLButtonElement>('#flag-mode')
    if (!button) return
    button.classList.toggle('selected', enabled)
    button.setAttribute('aria-pressed', String(enabled))
  }

  private flagAt(clientX: number, clientY: number): void {
    const id = this.pickCell(clientX, clientY)
    if (id === null) return
    this.applyResult(this.game.toggleFlag(id))
  }

  private applyResult(result: GameActionResult): void {
    for (const id of result.changedIds) this.updateCell(id)
    if (result.status === GameStatus.WON || result.status === GameStatus.LOST) {
      if (this.startedAt !== null) this.elapsedBeforeFinish = performance.now() - this.startedAt
      this.showResult(result.status)
    }
    this.updateUI()
  }

  private updateCell(id: number): void {
    const cell = this.game.getCell(id)!
    const mesh = this.cellMeshes.get(id)!
    mesh.scale.setScalar(1)

    if (cell.state === CellState.HIDDEN) {
      mesh.material = this.materials.hidden
      this.setMarker(id, '', '#fff')
    } else if (cell.state === CellState.FLAGGED) {
      mesh.material = this.materials.hidden
      mesh.scale.setScalar(1.012)
      this.setMarker(id, '⚑', '#f6ad3c')
    } else if (cell.state === CellState.EXPLODED) {
      mesh.material = this.materials.exploded
      this.setMarker(id, '✹', '#fff1de')
    } else if (cell.isMine) {
      mesh.material = this.materials.mine
      this.setMarker(id, '✹', '#ffd8bd')
    } else {
      mesh.material = this.materials.revealed
      mesh.scale.setScalar(0.993)
      const value = cell.adjacentMines
      this.setMarker(
        id,
        value > 0 ? String(value) : '',
        NUMBER_COLORS[Math.min(value, NUMBER_COLORS.length - 1)]
      )
    }
  }

  private updateHover(clientX: number, clientY: number): void {
    const id = this.pickCell(clientX, clientY)
    if (id === this.hoveredId) return
    if (this.hoveredId !== null) this.updateCell(this.hoveredId)
    this.hoveredId = id
    if (id !== null) {
      const mesh = this.cellMeshes.get(id)!
      if (this.game.getCell(id)?.state === CellState.HIDDEN) mesh.scale.setScalar(1.018)
    }
    this.renderer.domElement.style.cursor = id === null ? 'grab' : 'pointer'
  }

  private pickCell(clientX: number, clientY: number): number | null {
    const bounds = this.renderer.domElement.getBoundingClientRect()
    this.pointer.set(
      ((clientX - bounds.left) / bounds.width) * 2 - 1,
      -((clientY - bounds.top) / bounds.height) * 2 + 1
    )
    this.raycaster.setFromCamera(this.pointer, this.camera)
    const intersections = this.raycaster.intersectObjects(
      Array.from(this.cellMeshes.values()),
      false
    )
    return intersections.length > 0 ? (intersections[0].object.userData.cellId as number) : null
  }

  private updateUI(): void {
    document.querySelector('#mine-count')!.textContent = String(this.game.totalMines).padStart(
      3,
      '0'
    )
    document.querySelector('#flag-count')!.textContent = String(this.game.flagsRemaining).padStart(
      3,
      '0'
    )
    const status = document.querySelector('#game-status')!
    status.textContent = {
      [GameStatus.READY]: 'Awaiting first scan',
      [GameStatus.PLAYING]: 'Survey active',
      [GameStatus.WON]: 'Sector cleared',
      [GameStatus.LOST]: 'Mine triggered'
    }[this.game.status]
    status.setAttribute('data-status', this.game.status)
  }

  private showResult(status: GameStatus): void {
    const result = document.querySelector<HTMLDivElement>('#result')!
    result.classList.add('visible')
    result.classList.toggle('failure', status === GameStatus.LOST)
    result.querySelector('strong')!.textContent =
      status === GameStatus.WON ? 'Sector cleared' : 'Survey failed'
    result.querySelector('span')!.textContent =
      status === GameStatus.WON
        ? 'All safe cells verified.'
        : 'A mine was triggered. Recalibrate and try again.'
  }

  private hideResult(): void {
    document.querySelector('#result')?.classList.remove('visible', 'failure')
  }

  private clearCells(): void {
    for (const mesh of this.cellMeshes.values()) {
      this.globe.remove(mesh)
      mesh.geometry.dispose()
    }
    for (const marker of this.markers.values()) {
      this.globe.remove(marker)
      ;(marker.material as THREE.SpriteMaterial).map?.dispose()
      marker.material.dispose()
    }
    const decorations = this.globe.children.filter((child) => child.userData.isDecoration)
    for (const decoration of decorations) {
      this.globe.remove(decoration)
      if (decoration instanceof THREE.Line) decoration.geometry.dispose()
    }
    this.cellMeshes.clear()
    this.markers.clear()
  }

  private readonly onResize = (): void => {
    this.camera.aspect = innerWidth / innerHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(innerWidth, innerHeight)
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate)
    if (this.game?.status === GameStatus.PLAYING && this.startedAt !== null) {
      this.renderTime(performance.now() - this.startedAt)
    } else {
      this.renderTime(this.elapsedBeforeFinish)
    }
    const worldPosition = new THREE.Vector3()
    const worldNormal = new THREE.Vector3()
    for (const marker of this.markers.values()) {
      marker.getWorldPosition(worldPosition)
      worldNormal.copy(marker.position).normalize().applyQuaternion(this.globe.quaternion)
      const facing = worldNormal.dot(this.camera.position.clone().sub(worldPosition).normalize())
      marker.visible = Boolean(marker.userData.hasContent) && facing > 0.35
    }
    this.renderer.render(this.scene, this.camera)
  }

  private renderTime(milliseconds: number): void {
    const seconds = Math.floor(milliseconds / 1000)
    const minutes = Math.floor(seconds / 60)
    document.querySelector('#timer')!.textContent =
      `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
  }
}

new OrbitalSweepApp()
