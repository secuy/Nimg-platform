import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

/**
 * 创建并配置相机
 * @param {number} width - 视口宽度
 * @param {number} height - 视口高度
 * @returns {THREE.PerspectiveCamera} 配置好的相机对象
 */
export function createCamera(width, height) {
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 10;
    return camera;
}

/**
 * 创建并配置轨道控制器
 * @param {THREE.PerspectiveCamera} camera - 相机对象
 * @param {HTMLElement} domElement - 控制器绑定的DOM元素
 * @returns {OrbitControls} 配置好的控制器对象
 */
export function createControls(camera, domElement) {
    const controls = new OrbitControls(camera, domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controls.minDistance = 1;
    controls.maxDistance = 200;
    controls.rotateSpeed = 0.3;
    controls.zoomSpeed = 0.5;
    controls.panSpeed = 0.3;
    return controls;
}

/**
 * 调整相机位置以适应模型
 * @param {THREE.PerspectiveCamera} camera - 相机对象
 * @param {THREE.Object3D} object - 要适应的模型对象
 * @param {OrbitControls} controls - 轨道控制器对象
 */
export function adjustCameraToObject(camera, object) {
    const box = new THREE.Box3().setFromObject(object);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = camera.fov * (Math.PI / 180);
    let cameraZ = Math.abs(maxDim / Math.tan(fov / 2));
    camera.position.z = cameraZ * 3;
    camera.lookAt(center);

}
