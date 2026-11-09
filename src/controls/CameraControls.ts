import * as THREE from 'three'
import { applyScreenDrag, isDragGesture } from './rotationMath'

interface CameraControlOptions {
  onTap: (event: PointerEvent) => void
  onPointerMove?: (event: PointerEvent) => void
}

export class CameraControls {
  private activePointer: number | null = null
  private start = new THREE.Vector2()
  private previous = new THREE.Vector2()
  private dragged = false

  constructor(
    private readonly globe: THREE.Object3D,
    private readonly camera: THREE.PerspectiveCamera,
    private readonly domElement: HTMLElement,
    private readonly options: CameraControlOptions
  ) {
    domElement.style.touchAction = 'none'
    domElement.addEventListener('pointerdown', this.onPointerDown)
    domElement.addEventListener('pointermove', this.onPointerMove)
    domElement.addEventListener('pointerup', this.onPointerUp)
    domElement.addEventListener('pointercancel', this.onPointerCancel)
    domElement.addEventListener('wheel', this.onWheel, { passive: false })
  }

  reset(): void {
    this.globe.quaternion.identity()
    const aspect = Math.max(
      0.75,
      this.domElement.clientWidth / Math.max(1, this.domElement.clientHeight)
    )
    const distance = THREE.MathUtils.clamp(15.4 / Math.min(1, aspect), 15.4, 20.5)
    this.camera.position.set(0, 0, distance)
    this.camera.lookAt(0, 0, 0)
  }

  private readonly onPointerDown = (event: PointerEvent): void => {
    if (event.button !== 0 || this.activePointer !== null) return
    this.activePointer = event.pointerId
    this.start.set(event.clientX, event.clientY)
    this.previous.copy(this.start)
    this.dragged = false
    this.domElement.setPointerCapture(event.pointerId)
  }

  private readonly onPointerMove = (event: PointerEvent): void => {
    if (event.pointerId !== this.activePointer) {
      this.options.onPointerMove?.(event)
      return
    }

    const totalX = event.clientX - this.start.x
    const totalY = event.clientY - this.start.y
    if (!this.dragged && isDragGesture(totalX, totalY)) this.dragged = true

    if (this.dragged) {
      this.globe.quaternion.copy(
        applyScreenDrag(
          this.globe.quaternion,
          event.clientX - this.previous.x,
          event.clientY - this.previous.y,
          this.camera.quaternion
        )
      )
    }
    this.previous.set(event.clientX, event.clientY)
    this.options.onPointerMove?.(event)
  }

  private readonly onPointerUp = (event: PointerEvent): void => {
    if (event.pointerId !== this.activePointer) return
    if (!this.dragged) this.options.onTap(event)
    this.releasePointer(event.pointerId)
  }

  private readonly onPointerCancel = (event: PointerEvent): void => {
    if (event.pointerId === this.activePointer) this.releasePointer(event.pointerId)
  }

  private releasePointer(pointerId: number): void {
    if (this.domElement.hasPointerCapture(pointerId))
      this.domElement.releasePointerCapture(pointerId)
    this.activePointer = null
    this.dragged = false
  }

  private readonly onWheel = (event: WheelEvent): void => {
    event.preventDefault()
    const distance = THREE.MathUtils.clamp(
      this.camera.position.length() + event.deltaY * 0.006,
      10.5,
      22
    )
    this.camera.position.setLength(distance)
    this.camera.lookAt(0, 0, 0)
  }
}
