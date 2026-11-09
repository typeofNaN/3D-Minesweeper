import * as THREE from 'three'

export interface SphereCell {
  id: number
  center: THREE.Vector3
  boundary: THREE.Vector3[]
  neighborIds: number[]
}

type Triangle = [number, number, number]

export class SphereGrid {
  static generate(detail = 3, radius = 5): SphereCell[] {
    const source = new THREE.IcosahedronGeometry(1, detail)
    const positions = source.getAttribute('position')
    const vertices: THREE.Vector3[] = []
    const vertexByPosition = new Map<string, number>()
    const faces: Triangle[] = []

    const vertexIndex = (vertex: THREE.Vector3): number => {
      const normalized = vertex.normalize()
      const key = `${normalized.x.toFixed(7)},${normalized.y.toFixed(7)},${normalized.z.toFixed(7)}`
      const existing = vertexByPosition.get(key)
      if (existing !== undefined) return existing

      const id = vertices.length
      vertices.push(normalized.clone())
      vertexByPosition.set(key, id)
      return id
    }

    for (let offset = 0; offset < positions.count; offset += 3) {
      const triangle = [0, 1, 2].map((index) =>
        vertexIndex(
          new THREE.Vector3(
            positions.getX(offset + index),
            positions.getY(offset + index),
            positions.getZ(offset + index)
          )
        )
      ) as Triangle
      faces.push(triangle)
    }

    const faceCenters = faces.map(([a, b, c]) =>
      new THREE.Vector3()
        .add(vertices[a])
        .add(vertices[b])
        .add(vertices[c])
        .normalize()
        .multiplyScalar(radius)
    )
    const incidentFaces = vertices.map(() => [] as number[])
    const neighborSets = vertices.map(() => new Set<number>())

    faces.forEach((face, faceIndex) => {
      const [a, b, c] = face
      incidentFaces[a].push(faceIndex)
      incidentFaces[b].push(faceIndex)
      incidentFaces[c].push(faceIndex)
      neighborSets[a].add(b).add(c)
      neighborSets[b].add(a).add(c)
      neighborSets[c].add(a).add(b)
    })

    const cells = vertices.map((vertex, id): SphereCell => {
      const normal = vertex.clone()
      const reference =
        Math.abs(normal.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0)
      const tangentX = new THREE.Vector3().crossVectors(reference, normal).normalize()
      const tangentY = new THREE.Vector3().crossVectors(normal, tangentX).normalize()
      const center = normal.clone().multiplyScalar(radius)
      const boundary = incidentFaces[id]
        .map((faceIndex) => faceCenters[faceIndex])
        .sort((first, second) => {
          const firstDelta = first.clone().sub(center)
          const secondDelta = second.clone().sub(center)
          const firstAngle = Math.atan2(firstDelta.dot(tangentY), firstDelta.dot(tangentX))
          const secondAngle = Math.atan2(secondDelta.dot(tangentY), secondDelta.dot(tangentX))
          return firstAngle - secondAngle
        })
        .map((point) => point.clone())

      return {
        id,
        center,
        boundary,
        neighborIds: Array.from(neighborSets[id]).sort((a, b) => a - b)
      }
    })

    source.dispose()
    return cells
  }
}
