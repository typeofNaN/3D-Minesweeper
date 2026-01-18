import * as THREE from 'three';

/**
 * 创建正五边形几何体
 */
export function createPentagonGeometry(size: number): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  const vertices: number[] = [];
  const indices: number[] = [];

  // 五边形的5个顶点
  for (let i = 0; i < 5; i++) {
    const angle = (Math.PI * 2 / 5) * i - Math.PI / 2; // 从顶部开始
    const x = size * Math.cos(angle);
    const y = size * Math.sin(angle);
    vertices.push(x, y, 0);
  }

  // 中心点
  vertices.push(0, 0, 0);
  const centerIndex = 5;

  // 创建三角形扇
  for (let i = 0; i < 5; i++) {
    indices.push(centerIndex, i, (i + 1) % 5);
  }

  geometry.setIndex(indices);
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.computeVertexNormals();

  return geometry;
}
