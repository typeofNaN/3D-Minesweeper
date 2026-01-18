import * as THREE from 'three';

/**
 * 创建正六边形几何体
 */
export function createHexagonGeometry(size: number): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  const vertices: number[] = [];
  const indices: number[] = [];

  // 六边形的6个顶点
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    const x = size * Math.cos(angle);
    const y = size * Math.sin(angle);
    vertices.push(x, y, 0);
  }

  // 中心点
  vertices.push(0, 0, 0);
  const centerIndex = 6;

  // 创建三角形扇
  for (let i = 0; i < 6; i++) {
    indices.push(centerIndex, i, (i + 1) % 6);
  }

  geometry.setIndex(indices);
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.computeVertexNormals();

  return geometry;
}

/**
 * 计算六边形的世界坐标位置
 */
export function hexToWorld(q: number, r: number, size: number): THREE.Vector3 {
  const x = size * (Math.sqrt(3) * q + (Math.sqrt(3) / 2) * r);
  const z = size * ((3 / 2) * r);
  return new THREE.Vector3(x, 0, z);
}

