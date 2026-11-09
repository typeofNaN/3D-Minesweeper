import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { applyScreenDrag, isDragGesture } from './rotationMath'

describe('rotationMath', () => {
  it('moves the front surface upward when the pointer moves upward', () => {
    const rotation = applyScreenDrag(new THREE.Quaternion(), 0, -40, new THREE.Quaternion(), 0.01)

    const movedFront = new THREE.Vector3(0, 0, 1).applyQuaternion(rotation)
    expect(movedFront.y).toBeGreaterThan(0)
  })

  it('remains normalized and continues rotating through repeated pole crossings', () => {
    let rotation = new THREE.Quaternion()
    const samples: THREE.Vector3[] = []

    for (let step = 0; step < 80; step++) {
      rotation = applyScreenDrag(rotation, 0, -10, new THREE.Quaternion(), 0.01)
      samples.push(new THREE.Vector3(0, 0, 1).applyQuaternion(rotation))
    }

    expect(rotation.length()).toBeCloseTo(1, 8)
    expect(samples.some((vector) => vector.z < -0.95)).toBe(true)
    expect(samples[samples.length - 1].distanceTo(samples[samples.length - 2])).toBeGreaterThan(
      0.05
    )
  })

  it('separates taps from pointer drags with a movement threshold', () => {
    expect(isDragGesture(2, 2, 6)).toBe(false)
    expect(isDragGesture(5, 4, 6)).toBe(true)
  })
})
