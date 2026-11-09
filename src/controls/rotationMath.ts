import * as THREE from 'three'

export function applyScreenDrag(
  current: THREE.Quaternion,
  deltaX: number,
  deltaY: number,
  cameraQuaternion: THREE.Quaternion,
  sensitivity = 0.006
): THREE.Quaternion {
  const screenUp = new THREE.Vector3(0, 1, 0).applyQuaternion(cameraQuaternion).normalize()
  const screenRight = new THREE.Vector3(1, 0, 0).applyQuaternion(cameraQuaternion).normalize()
  const horizontal = new THREE.Quaternion().setFromAxisAngle(screenUp, deltaX * sensitivity)
  const vertical = new THREE.Quaternion().setFromAxisAngle(screenRight, deltaY * sensitivity)
  const delta = horizontal.multiply(vertical)
  return delta.multiply(current.clone()).normalize()
}

export function isDragGesture(deltaX: number, deltaY: number, threshold = 6): boolean {
  return deltaX * deltaX + deltaY * deltaY >= threshold * threshold
}
