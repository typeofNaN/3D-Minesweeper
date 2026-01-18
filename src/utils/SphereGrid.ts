import * as THREE from 'three';
import { createHexagonGeometry } from './HexGeometry';
import { createPentagonGeometry } from './PentagonGeometry';

export interface HexCoordinate {
  q: number;
  r: number;
  s: number;
}

export interface CellInfo {
  coord: HexCoordinate;
  position: THREE.Vector3;
  isPentagon: boolean;
  neighbors: HexCoordinate[];
}

export class SphereGrid {
  private radius: number;
  private hexSize: number;
  private hexagons: Map<string, THREE.Mesh> = new Map();
  private gridData: Map<string, HexCoordinate> = new Map();
  private cells: Map<string, CellInfo> = new Map();

  constructor(radius: number = 5, hexSize: number = 0.3) {
    this.radius = radius;
    this.hexSize = hexSize;
  }

  /**
   * 生成足球形状的球形网格（截角二十面体）
   * 使用12个五边形和20个六边形
   */
  generateGrid(): THREE.Group {
    const group = new THREE.Group();

    // 清空之前的数据
    this.cells.clear();
    this.hexagons.clear();
    this.gridData.clear();

    // 基于截角二十面体（足球）生成网格
    // 标准足球有12个五边形和20个六边形
    const { pentagons, hexagons } = this.generateTruncatedIcosahedron();

    // 计算六边形和五边形的统一大小（确保边对边贴合）
    // 五边形和六边形需要有相同的边长
    // 对于正六边形：如果外接圆半径是hexSize，那么边长 = hexSize
    // 对于正五边形：如果边长是edgeLength，那么外接圆半径 = edgeLength / (2 * sin(π/5))
    const edgeLength = this.hexSize; // 六边形的边长（等于其外接圆半径）
    const pentagonSize = edgeLength / (2 * Math.sin(Math.PI / 5)); // 五边形的外接圆半径，使得边长为edgeLength

    console.log(`生成网格参数: 半径=${this.radius}, 六边形大小=${this.hexSize}, 五边形大小=${pentagonSize}`);
    console.log(`五边形数量: ${pentagons.length}, 六边形数量: ${hexagons.length}`);

    // 检查第一个多边形位置
    if (pentagons.length > 0) {
      console.log(`第一个五边形位置:`, pentagons[0].position);
    }
    if (hexagons.length > 0) {
      console.log(`第一个六边形位置:`, hexagons[0].position);
    }

    console.log(`生成足球网格: ${pentagons.length}个五边形, ${hexagons.length}个六边形`);

    // 创建五边形
    for (const cell of pentagons) {
      const geometry = createPentagonGeometry(pentagonSize);
      const mesh = this.createCell(geometry, cell.position, cell.coord, true);
      mesh.renderOrder = 1; // 确保在地球之上渲染
      group.add(mesh);

      const key = this.getKey(cell.coord);
      this.hexagons.set(key, mesh);
      this.gridData.set(key, cell.coord);
      this.cells.set(key, cell);
    }

    // 创建六边形
    for (const cell of hexagons) {
      const geometry = createHexagonGeometry(this.hexSize);
      const mesh = this.createCell(geometry, cell.position, cell.coord, false);
      mesh.renderOrder = 1; // 确保在地球之上渲染
      group.add(mesh);

      const key = this.getKey(cell.coord);
      this.hexagons.set(key, mesh);
      this.gridData.set(key, cell.coord);
      this.cells.set(key, cell);
    }

    console.log(`总共创建了 ${this.hexagons.size} 个多边形`);
    
    // 验证第一个多边形的位置和方向
    if (this.hexagons.size > 0) {
      const firstHex = Array.from(this.hexagons.values())[0];
      console.log('第一个多边形位置:', firstHex.position);
      console.log('第一个多边形旋转:', firstHex.rotation);
      const worldNormal = new THREE.Vector3(0, 0, 1).applyQuaternion(firstHex.quaternion);
      console.log('第一个多边形法线（应该是向外的）:', worldNormal);
      console.log('第一个多边形到原点的距离:', firstHex.position.length());
      console.log('第一个多边形是否可见:', firstHex.visible);
      console.log('第一个多边形材质:', firstHex.material);
    }
    
    return group;
  }

  /**
   * 生成截角二十面体（足球）的顶点位置
   * 标准足球有12个五边形和20个六边形
   */
  private generateTruncatedIcosahedron(): {
    pentagons: CellInfo[];
    hexagons: CellInfo[];
  } {
    const pentagons: CellInfo[] = [];
    const hexagons: CellInfo[] = [];

    // 使用Three.js的IcosahedronGeometry来获取精确的顶点和面信息
    const icosaGeometry = new THREE.IcosahedronGeometry(1, 0);
    const positions = icosaGeometry.attributes.position;
    const index = icosaGeometry.index;

    if (!index) {
      console.error('IcosahedronGeometry没有索引');
      return { pentagons: [], hexagons: [] };
    }

    // 提取顶点
    const icosahedronVertices: THREE.Vector3[] = [];
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);
      icosahedronVertices.push(new THREE.Vector3(x, y, z));
    }

    // 五边形中心：在原二十面体的12个顶点位置
    const pentagonCenters: THREE.Vector3[] = [];
    for (const vertex of icosahedronVertices) {
      pentagonCenters.push(vertex.clone().multiplyScalar(this.radius));
    }

    // 六边形中心：在原二十面体的20个面心位置
    const hexagonCenters: THREE.Vector3[] = [];
    const faceSet = new Set<string>();

    // 遍历所有面
    for (let i = 0; i < index.count; i += 3) {
      const i1 = index.getX(i);
      const i2 = index.getX(i + 1);
      const i3 = index.getX(i + 2);

      const v1 = icosahedronVertices[i1];
      const v2 = icosahedronVertices[i2];
      const v3 = icosahedronVertices[i3];

      // 计算面心
      const faceCenter = new THREE.Vector3()
        .add(v1)
        .add(v2)
        .add(v3)
        .divideScalar(3)
        .normalize();

      const faceKey = [i1, i2, i3].sort((a, b) => a - b).join(',');
      if (!faceSet.has(faceKey)) {
        faceSet.add(faceKey);
        hexagonCenters.push(faceCenter.multiplyScalar(this.radius));
      }
    }

    // 为五边形创建CellInfo
    for (let i = 0; i < pentagonCenters.length; i++) {
      const pos = pentagonCenters[i];
      const coord: HexCoordinate = { q: -2000 + i, r: 0, s: 2000 - i };
      pentagons.push({
        coord,
        position: pos,
        isPentagon: true,
        neighbors: []
      });
    }

    // 为六边形创建CellInfo
    for (let i = 0; i < hexagonCenters.length; i++) {
      const pos = hexagonCenters[i];
      const coord: HexCoordinate = { q: i, r: 0, s: -i };
      hexagons.push({
        coord,
        position: pos,
        isPentagon: false,
        neighbors: []
      });
    }

    // 计算邻居关系（基于球面距离）
    const allCells = [...pentagons, ...hexagons];
    // 估算邻居距离
    const hexEdgeLength = this.hexSize;
    const neighborThreshold = hexEdgeLength * 2.5; // 邻居之间的阈值

    for (const cell of allCells) {
      const neighborDistances: Array<{ coord: HexCoordinate; dist: number }> = [];

      for (const other of allCells) {
        if (cell === other) continue;
        const dist = this.getSphereDistance(cell.position, other.position);
        if (dist < neighborThreshold) {
          neighborDistances.push({ coord: other.coord, dist });
        }
      }

      // 按距离排序
      neighborDistances.sort((a, b) => a.dist - b.dist);

      // 选择最近的邻居：五边形5个，六边形6个
      const neighborCount = cell.isPentagon ? 5 : 6;
      cell.neighbors = neighborDistances.slice(0, neighborCount).map(n => n.coord);
    }

    return { pentagons, hexagons };
  }

  /**
   * 计算两个点之间的球面距离（弧长）
   */
  private getSphereDistance(pos1: THREE.Vector3, pos2: THREE.Vector3): number {
    const v1 = pos1.clone().normalize();
    const v2 = pos2.clone().normalize();
    const dot = v1.dot(v2);
    const angle = Math.acos(Math.max(-1, Math.min(1, dot)));
    return angle * this.radius;
  }

  /**
   * 创建单个网格（五边形或六边形）
   */
  private createCell(
    geometry: THREE.BufferGeometry,
    position: THREE.Vector3,
    coord: HexCoordinate,
    isPentagon: boolean
  ): THREE.Mesh {
    // 创建默认材质（后续会被updateHexMaterial替换）
    // 使用不透明材质，确保可见
    const defaultMaterial = new THREE.MeshStandardMaterial({
      color: 0x4444ff, // 使用更亮的蓝色，更容易看到
      metalness: 0.3,
      roughness: 0.7,
      side: THREE.DoubleSide, // 双面渲染，确保从任何角度都能看到
      depthTest: true,
      depthWrite: true
    });

    const mesh = new THREE.Mesh(geometry, defaultMaterial);
    
    // 设置mesh位置在球面上
    // 为了让多边形更明显，稍微向外偏移一点，确保在地球外面
    const outward = position.clone().normalize();
    const offset = 0.05; // 向外偏移，确保在地球外面且可见
    const finalPosition = position.clone().add(outward.clone().multiplyScalar(offset));
    mesh.position.copy(finalPosition);

    // 使多边形面向外（法线指向外）
    // 多边形在XY平面上，默认法线是+Z方向
    // 我们需要让+Z方向指向从球心(0,0,0)到position的方向（即向外的方向）
    
    // 计算从球心指向外的单位方向向量（这就是我们想要的法线方向）
    const targetNormal = position.clone().normalize();
    
    // 默认法线方向是+Z (0, 0, 1)
    const defaultNormal = new THREE.Vector3(0, 0, 1);
    
    // 如果目标法线就是默认方向，不需要旋转
    if (targetNormal.distanceTo(defaultNormal) < 0.001) {
      mesh.rotation.set(0, 0, 0);
    } else if (targetNormal.distanceTo(new THREE.Vector3(0, 0, -1)) < 0.001) {
      // 如果目标法线是-Z，旋转180度
      mesh.rotation.set(Math.PI, 0, 0);
    } else {
      // 计算从defaultNormal到targetNormal的旋转四元数
      const rotationQuaternion = new THREE.Quaternion();
      rotationQuaternion.setFromUnitVectors(defaultNormal, targetNormal);
      mesh.quaternion.copy(rotationQuaternion);
    }

    // 存储坐标信息
    (mesh.userData as any).hexCoord = coord;
    (mesh.userData as any).hexKey = this.getKey(coord);
    (mesh.userData as any).isPentagon = isPentagon;

    return mesh;
  }

  /**
   * 获取六边形坐标的键
   */
  getKey(coord: HexCoordinate): string {
    return `${coord.q},${coord.r},${coord.s}`;
  }

  /**
   * 解析键为坐标
   */
  parseKey(key: string): HexCoordinate | null {
    const parts = key.split(',');
    if (parts.length !== 3) return null;
    return {
      q: parseInt(parts[0]),
      r: parseInt(parts[1]),
      s: parseInt(parts[2])
    };
  }

  /**
   * 获取所有六边形（包括五边形）
   */
  getHexagons(): Map<string, THREE.Mesh> {
    return this.hexagons;
  }

  /**
   * 获取六边形的相邻坐标
   */
  getNeighbors(coord: HexCoordinate): HexCoordinate[] {
    const key = this.getKey(coord);
    const cell = this.cells.get(key);
    if (cell) {
      return cell.neighbors;
    }

    // 如果没有找到，返回空数组（不应该发生）
    return [];
  }
}
