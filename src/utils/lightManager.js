import * as THREE from 'three';

/**
 * 创建并配置场景的光照系统
 * @param {THREE.Scene} scene - Three.js场景对象
 * @returns {Object} 包含所有光源的对象，方便后续管理
 */
export function setupLights(scene) {
    // 环境光
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);
    
    // 方向光配置
    const directionalLights = [
        { position: [1, 1, 1], intensity: 0.5 },
        { position: [-1, -1, -1], intensity: 0.5 },
        { position: [0, 1, -1], intensity: 0.5 },
        { position: [0, -1, 1], intensity: 0.5 }
    ];

    // 创建并添加方向光
    const lights = directionalLights.map((config) => {
        const light = new THREE.DirectionalLight(0xffffff, config.intensity);
        light.position.set(...config.position);
        scene.add(light);
        return light;
    });

    return {
        ambientLight,
        directionalLights: lights
    };
} 