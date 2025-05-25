import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export let renderer, scene, camera, controls, canvas;

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

  // 导出到 window 方便 renderLoop 使用
  window.__fiberVisScene = { scene, camera, renderer, controls, setCanvasSize, canvas };
}

export function getScene() {
  return window.__fiberVisScene;
}