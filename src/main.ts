import * as THREE from 'three';
import { SphereGrid } from './utils/SphereGrid';
import { MinesweeperGame, CellState } from './game/MinesweeperGame';
import { CameraControls } from './controls/CameraControls';

class GameApp {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private sphereGrid: SphereGrid;
  private game: MinesweeperGame | null = null;
  private cameraControls: CameraControls;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private hexGroup: THREE.Group | null = null;

  constructor() {
    // 初始化Three.js
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e);

    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;

    const app = document.getElementById('app');
    if (app) {
      app.appendChild(this.renderer.domElement);
    }

    // 初始化相机控制
    this.cameraControls = new CameraControls(this.camera, this.renderer.domElement);
    this.cameraControls.reset();

    // 初始化射线检测
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    // 创建场景
    this.setupScene();

    // 创建网格（足球结构：五边形+六边形）
    // hexSize是六边形的边长（也是外接圆半径）
    // 使用较大的值确保可见
    this.sphereGrid = new SphereGrid(5, 1.2);
    this.initGame();

    // 设置事件监听
    this.setupEventListeners();

    // 开始渲染循环
    this.animate();

    // UI事件
    const resetBtn = document.getElementById('reset-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => this.resetGame());
    }
  }

  private setupScene() {
    // 创建星空背景
    this.createStarfield();

    // 创建地球球体
    this.createEarth();

    // 环境光
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambientLight);

    // 定向光（模拟太阳光）
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 5);
    directionalLight.castShadow = true;
    this.scene.add(directionalLight);

    // 点光源（增加一些环境亮度）
    const pointLight = new THREE.PointLight(0xffffff, 0.3);
    pointLight.position.set(-5, 5, -5);
    this.scene.add(pointLight);
  }

  private createStarfield() {
    // 创建星空背景
    const starsGeometry = new THREE.BufferGeometry();
    const starsMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.5,
      transparent: true,
      opacity: 0.8
    });

    // 生成星星位置
    const starsVertices: number[] = [];
    const numStars = 5000;

    for (let i = 0; i < numStars; i++) {
      // 在球面上随机分布星星
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const radius = 500; // 很远的位置

      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);

      starsVertices.push(x, y, z);
    }

    starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starsVertices, 3));

    const stars = new THREE.Points(starsGeometry, starsMaterial);
    this.scene.add(stars);

    // 设置背景色为深空色
    this.scene.background = new THREE.Color(0x000000);
  }

  private createEarth() {
    // 创建地球球体（稍微小于六边形网格，作为背景）
    const earthRadius = 4.95; // 稍微小于六边形网格的半径5
    const earthGeometry = new THREE.SphereGeometry(earthRadius, 64, 64);

    const textureLoader = new THREE.TextureLoader();

    // 使用真实的地球纹理
    // 使用公开的地球纹理资源
    const earthTexture = textureLoader.load(
      'https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg',
      (texture) => {
        console.log('地球纹理加载成功');
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
      },
      undefined,
      (error) => {
        console.warn('地球纹理加载失败，使用默认颜色:', error);
      }
    );

    // 加载地球法线贴图（可选）
    const normalTexture = textureLoader.load(
      'https://threejs.org/examples/textures/planets/earth_normal_2048.jpg',
      (texture) => {
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
      },
      undefined,
      () => {
        // 加载失败不影响显示
      }
    );

    // 加载地球镜面贴图（可选）
    const specularTexture = textureLoader.load(
      'https://threejs.org/examples/textures/planets/earth_specular_2048.jpg',
      (texture) => {
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
      },
      undefined,
      () => {
        // 加载失败不影响显示
      }
    );

    // 创建地球材质
    const earthMaterial = new THREE.MeshPhongMaterial({
      map: earthTexture,
      normalMap: normalTexture,
      specularMap: specularTexture,
      specular: new THREE.Color(0x333333),
      shininess: 25,
      transparent: true,
      opacity: 0.95
    });

    const earth = new THREE.Mesh(earthGeometry, earthMaterial);
    earth.renderOrder = 0; // 在地球球体之前渲染
    this.scene.add(earth);

    // 添加大气层效果
    const atmosphereGeometry = new THREE.SphereGeometry(earthRadius * 1.02, 64, 64);
    const atmosphereMaterial = new THREE.MeshBasicMaterial({
      color: 0x88ccff,
      transparent: true,
      opacity: 0.15,
      side: THREE.BackSide
    });
    const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    this.scene.add(atmosphere);
  }

  private initGame() {
    // 清除旧的网格
    if (this.hexGroup) {
      this.scene.remove(this.hexGroup);
      this.hexGroup.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach(mat => mat.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    }

    // 生成新网格
    this.hexGroup = this.sphereGrid.generateGrid();
    
    // 确保多边形在地球之后渲染（渲染顺序）
    this.hexGroup.renderOrder = 1;
    this.scene.add(this.hexGroup);
    
    console.log('多边形组已添加到场景，子对象数量:', this.hexGroup.children.length);

    // 创建游戏逻辑
    const gridKeys = Array.from(this.sphereGrid.getHexagons().keys());
    const totalCells = gridKeys.length;
    const mineCount = Math.floor(totalCells * 0.15); // 15%的地雷率

    this.game = new MinesweeperGame(
      gridKeys,
      mineCount,
      (coord) => this.sphereGrid.getKey(coord),
      (coord) => this.sphereGrid.getNeighbors(coord)
    );

    // 初始化所有六边形的材质
    this.updateAllHexMaterials();

    // 更新UI
    this.updateUI();
  }

  private setupEventListeners() {
    // 窗口大小调整
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // 鼠标点击
    this.renderer.domElement.addEventListener('click', (e) => this.onMouseClick(e));
    this.renderer.domElement.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.onRightClick(e);
    });
  }

  private onMouseClick(event: MouseEvent) {
    if (!this.game || !this.hexGroup) return;

    // 更新鼠标位置
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // 射线检测
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.hexGroup.children, true);

    if (intersects.length > 0) {
      const hex = intersects[0].object as THREE.Mesh;
      const hexKey = (hex.userData as any).hexKey;
      if (hexKey) {
        const changed = this.game.revealCell(hexKey);
        if (changed) {
          this.updateHexMaterial(hexKey);
          this.updateUI();
        }
      }
    }
  }

  private onRightClick(event: MouseEvent) {
    if (!this.game || !this.hexGroup) return;

    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.hexGroup.children, true);

    if (intersects.length > 0) {
      const hex = intersects[0].object as THREE.Mesh;
      const hexKey = (hex.userData as any).hexKey;
      if (hexKey) {
        const changed = this.game.toggleFlag(hexKey);
        if (changed) {
          this.updateHexMaterial(hexKey);
          this.updateUI();
        }
      }
    }
  }

  private updateHexMaterial(hexKey: string) {
    if (!this.game || !this.hexGroup) return;

    const hex = this.sphereGrid.getHexagons().get(hexKey);
    if (!hex) return;

    const cell = this.game.getCell(hexKey);
    if (!cell) return;

    let material: THREE.MeshStandardMaterial;

    if (cell.state === CellState.HIDDEN) {
      material = new THREE.MeshStandardMaterial({
        color: 0x444488,
        metalness: 0.3,
        roughness: 0.7,
        side: THREE.DoubleSide // 双面渲染
      });
    } else if (cell.state === CellState.FLAGGED) {
      material = new THREE.MeshStandardMaterial({
        color: 0xff0000,
        metalness: 0.5,
        roughness: 0.5,
        side: THREE.DoubleSide
      });
    } else if (cell.state === CellState.EXPLODED) {
      material = new THREE.MeshStandardMaterial({
        color: 0xff0000,
        emissive: 0xff0000,
        emissiveIntensity: 0.5,
        side: THREE.DoubleSide
      });
    } else if (cell.isMine) {
      material = new THREE.MeshStandardMaterial({
        color: 0xff0000,
        emissive: 0xff0000,
        emissiveIntensity: 0.3,
        side: THREE.DoubleSide
      });
    } else {
      // 根据周围地雷数显示不同颜色
      const colors = [
        0xffffff, // 0
        0x0000ff, // 1
        0x008000, // 2
        0xff0000, // 3
        0x800080, // 4
        0x800000, // 5
        0x008080, // 6
      ];
      const color = colors[Math.min(cell.adjacentMines, colors.length - 1)] || 0xffffff;
      material = new THREE.MeshStandardMaterial({
        color: color,
        metalness: 0.1,
        roughness: 0.9,
        side: THREE.DoubleSide
      });
    }

    hex.material = material;

    // 如果需要显示数字，可以在这里添加文本
  }

  private updateAllHexMaterials() {
    if (!this.game) return;

    for (const [key] of this.game.getAllCells()) {
      this.updateHexMaterial(key);
    }
  }

  private updateUI() {
    if (!this.game) return;

    const mineCountEl = document.getElementById('mine-count');
    const flaggedCountEl = document.getElementById('flagged-count');
    const statusEl = document.getElementById('game-status');

    if (mineCountEl) {
      const totalMines = Array.from(this.game.getAllCells().values()).filter(c => c.isMine).length;
      mineCountEl.textContent = totalMines.toString();
    }

    if (flaggedCountEl) {
      flaggedCountEl.textContent = this.game.getFlaggedCount().toString();
    }

    if (statusEl) {
      if (this.game.isGameWon()) {
        statusEl.textContent = '胜利！';
        statusEl.style.color = '#4CAF50';
      } else if (this.game.isGameOver()) {
        statusEl.textContent = '游戏结束';
        statusEl.style.color = '#f44336';
      } else {
        statusEl.textContent = '游戏中';
        statusEl.style.color = '#ffffff';
      }
    }
  }

  private resetGame() {
    this.initGame();
  }

  private animate() {
    requestAnimationFrame(() => this.animate());
    
    // 确保多边形在地球之上渲染
    this.renderer.render(this.scene, this.camera);
  }
}

// 启动应用
new GameApp();

