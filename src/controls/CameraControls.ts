import * as THREE from 'three';

export class CameraControls {
  private camera: THREE.PerspectiveCamera;
  private domElement: HTMLElement;
  private isDragging: boolean = false;
  private previousMousePosition: { x: number; y: number } = { x: 0, y: 0 };
  private spherical: THREE.Spherical = new THREE.Spherical();
  private target: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private radius: number = 8;

  // 使用累积的四元数旋转来实现真正的 arcball 控制
  // 这样可以实现360度无边界无死角旋转
  private rotationQuaternion: THREE.Quaternion = new THREE.Quaternion();
  private initialDirection: THREE.Vector3 = new THREE.Vector3(0, 0, 1);

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement) {
    this.camera = camera;
    this.domElement = domElement;

    // 初始化相机方向
    const position = camera.position.clone();
    this.spherical.setFromVector3(position);
    this.radius = this.spherical.radius;

    // 计算初始方向向量（从目标指向相机）
    const initialDir = position.clone().sub(this.target).normalize();
    this.initialDirection.copy(initialDir);

    // 计算从默认方向到初始方向的旋转
    const defaultDir = new THREE.Vector3(0, 0, 1);
    const rotationAxis = new THREE.Vector3();
    rotationAxis.crossVectors(defaultDir, initialDir);
    if (rotationAxis.length() > 0.01) {
      const angle = Math.acos(Math.max(-1, Math.min(1, defaultDir.dot(initialDir))));
      this.rotationQuaternion.setFromAxisAngle(rotationAxis.normalize(), angle);
    } else {
      this.rotationQuaternion.identity();
    }

    this.setupEventListeners();
  }

  private setupEventListeners() {
    // 鼠标拖动旋转
    this.domElement.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.domElement.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.domElement.addEventListener('mouseup', this.onMouseUp.bind(this));
    this.domElement.addEventListener('mouseleave', this.onMouseUp.bind(this));

    // 滚轮缩放
    this.domElement.addEventListener('wheel', this.onWheel.bind(this), { passive: false });

    // 阻止右键菜单
    this.domElement.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private onMouseDown(event: MouseEvent) {
    if (event.button === 0) { // 左键
      this.isDragging = true;
      this.previousMousePosition = { x: event.clientX, y: event.clientY };
    }
  }

  /**
   * 将屏幕坐标转换为球面上的点（arcball 算法）
   */
  private screenToArcball(x: number, y: number): THREE.Vector3 {
    const width = this.domElement.clientWidth;
    const height = this.domElement.clientHeight;
    const size = Math.min(width, height);

    // 将屏幕坐标转换为 [-1, 1] 范围，以屏幕中心为原点
    const normalizedX = (2.0 * x / size) - (width / size);
    const normalizedY = (height / size) - (2.0 * y / size); // 翻转 Y 轴

    // 计算到屏幕中心的距离平方
    const lengthSq = normalizedX * normalizedX + normalizedY * normalizedY;
    const radius = 1.0; // 单位球半径

    let z = 0;
    if (lengthSq <= radius * radius) {
      // 在单位圆内，计算 z 坐标（在球面上）
      z = Math.sqrt(radius * radius - lengthSq);
    } else {
      // 在单位圆外，将点投影到单位圆上（z = 0）
      const length = Math.sqrt(lengthSq);
      const point = new THREE.Vector3(
        normalizedX / length * radius,
        normalizedY / length * radius,
        0
      );
      return point.normalize();
    }

    // 返回归一化的点（在球面上）
    const point = new THREE.Vector3(normalizedX, normalizedY, z);
    return point.normalize();
  }

  private onMouseMove(event: MouseEvent) {
    if (!this.isDragging) return;

    // 获取当前和前一个鼠标位置在球面上的点
    const currentPoint = this.screenToArcball(event.clientX, event.clientY);
    const previousPoint = this.screenToArcball(
      this.previousMousePosition.x,
      this.previousMousePosition.y
    );

    // 计算点积以检查是否接近
    const dot = previousPoint.dot(currentPoint);

    // 如果两个点相同或非常接近，跳过
    if (dot > 0.9999) {
      this.previousMousePosition = { x: event.clientX, y: event.clientY };
      return;
    }

    // 计算旋转轴：current × previous（反转顺序以修正方向）
    // 这个轴垂直于两个点所在的平面，方向由右手法则决定
    const rotationAxis = new THREE.Vector3();
    rotationAxis.crossVectors(currentPoint, previousPoint);

    // 如果旋转轴接近零（两个点几乎在同一直线上），跳过
    const axisLength = rotationAxis.length();
    if (axisLength < 0.0001) {
      this.previousMousePosition = { x: event.clientX, y: event.clientY };
      return;
    }

    // 计算旋转角度
    const angle = Math.acos(Math.max(-1, Math.min(1, dot)));

    // 归一化旋转轴并创建旋转四元数
    rotationAxis.normalize();
    const deltaRotation = new THREE.Quaternion();
    deltaRotation.setFromAxisAngle(rotationAxis, angle);

    // 累积旋转：新的旋转应用到现有旋转之前
    // 这样可以让球体跟随鼠标移动，方向正确
    this.rotationQuaternion.premultiply(deltaRotation);
    this.rotationQuaternion.normalize();

    // 更新相机位置
    this.updateCameraPosition();

    this.previousMousePosition = { x: event.clientX, y: event.clientY };
  }

  private onMouseUp(event: MouseEvent) {
    if (event.button === 0) {
      this.isDragging = false;
    }
  }

  private onWheel(event: WheelEvent) {
    event.preventDefault();

    // 缩放距离
    const delta = event.deltaY * 0.01;
    this.radius += delta;

    // 限制缩放范围
    this.radius = Math.max(3, Math.min(20, this.radius));

    this.updateCameraPosition();
  }

  private updateCameraPosition() {
    // 应用累积的旋转到初始方向
    const cameraDirection = this.initialDirection.clone();
    cameraDirection.applyQuaternion(this.rotationQuaternion);

    // 计算相机位置
    const position = cameraDirection.clone().multiplyScalar(this.radius);
    position.add(this.target);

    this.camera.position.copy(position);
    this.camera.lookAt(this.target);

    // 更新 spherical 对象以保持兼容性
    this.spherical.setFromVector3(position.clone().sub(this.target));
    this.spherical.radius = this.radius;
  }

  /**
   * 更新目标点（用于重置或动画）
   */
  setTarget(target: THREE.Vector3) {
    this.target.copy(target);
    this.updateCameraPosition();
  }

  /**
   * 重置相机位置
   */
  reset() {
    this.radius = 8;
    this.target.set(0, 0, 0);

    // 重置旋转四元数
    this.rotationQuaternion.identity();
    this.initialDirection.set(0, 0, 1).normalize();

    this.updateCameraPosition();
  }
}

