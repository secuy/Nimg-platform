import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export let renderer, scene, camera, controls, canvas;

const customMeshes = []; // 管理自定义 mesh

export function initCanvas(_canvas) {
  canvas = _canvas;
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setClearColor(0x181818);

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(45, 1, 0.01, 10000);
  camera.position.set(0, 0, 100);
  camera.lookAt(0, 0, 0);

  controls = new OrbitControls(camera, canvas);
  controls.target.set(0,0,0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.screenSpacePanning = false;
  controls.update();

  function setCanvasSize() {
    let width = canvas.parentElement.clientWidth;
    let height = canvas.parentElement.clientHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  window.addEventListener('resize', setCanvasSize);
  setTimeout(setCanvasSize, 50);

  const axesHelper = new THREE.AxesHelper();
  scene.add(axesHelper);

  // 增加环境光和方向光
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5); // 柔和环境光
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(30, 50, 100);
  scene.add(dirLight);

  // 导出到 window 方便 renderLoop 使用
  window.__fiberVisScene = {
    scene, camera, renderer, controls, setCanvasSize, canvas,
    addCustomMesh, removeCustomMesh, focusOnObject,
    getCustomMeshes: () => customMeshes
  };
}

export function getScene() {
  return window.__fiberVisScene;
}

export function addCustomMesh(mesh) {
  if (scene) {
    scene.add(mesh);
    customMeshes.push(mesh);
  }
}

export function removeCustomMesh(mesh) {
  if (scene && mesh) {
    scene.remove(mesh);
    const idx = customMeshes.indexOf(mesh);
    if (idx !== -1) customMeshes.splice(idx, 1);
  }
}

// 聚焦某个 object3D
export function focusOnObject(object) {
  if (!object || !camera || !controls) return;
  // 计算包围盒
  const box = new THREE.Box3().setFromObject(object);
  if (box.isEmpty()) return;
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());

  // 计算合适的距离
  const maxDim = Math.max(size.x, size.y, size.z);
  const fov = camera.fov * (Math.PI / 180);
  let distance = maxDim / (2 * Math.tan(fov / 2));
  distance *= 1.5; // 稍微远一点

  // 重新定位相机
  const dir = new THREE.Vector3(0, 0, 1); // 默认 z 轴方向
  camera.position.copy(center.clone().addScaledVector(dir, distance));
  camera.lookAt(center);
  controls.target.copy(center);
  controls.update();
}