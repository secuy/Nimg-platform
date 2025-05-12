import * as THREE from 'three';

/**
 * 创建默认材质
 * @param {Object} options - 材质配置选项
 * @returns {THREE.MeshPhongMaterial} 创建的材质对象
 */
export function createDefaultMaterial(options = {}) {
    const {
        opacity = 1,
        vertexColors = false,
        shininess = 5,
        specular = new THREE.Color(0x111111)
    } = options;

    return new THREE.MeshPhongMaterial({
        color: new THREE.Color(0x808080),
        side: THREE.DoubleSide,
        opacity,
        transparent: opacity < 1,
        vertexColors,
        shininess,
        specular
    });
}

/**
 * 更新材质属性
 * @param {THREE.Material} material - 要更新的材质
 * @param {Object} options - 要更新的属性
 */
export function updateMaterial(material, options = {}) {
    Object.entries(options).forEach(([key, value]) => {
        if (material[key] !== undefined) {
            material[key] = value;
        }
    });
    material.needsUpdate = true;
} 

// 假设 tracts 是一个数组，
// 每个 tract 又是 [[x,y,z], [x,y,z], …] 形式的点列表
export function buildFiberLines(fibers) {
    const group = new THREE.Group();
    
    // 计算所有纤维的中心点
    const center = new THREE.Vector3();
    let totalPoints = 0;
    
    fibers.forEach(fiber => {
        for (let i = 0; i < fiber.length; i += 3) {
            center.x += fiber[i];
            center.y += fiber[i + 1];
            center.z += fiber[i + 2];
            totalPoints++;
        }
    });
    
    center.divideScalar(totalPoints);
    
    // 创建RGB颜色
    const rgbColor = new THREE.Color(center.x, center.y, center.z);
    
    // 获取HSL值
    const hsl = {};
    rgbColor.getHSL(hsl);
    
    // 使用HSL值作为基础颜色
    const baseColor = {
        h: hsl.h,
        s: 0.8,           // 固定饱和度
        l: 0.6            // 固定亮度
    };
    
    // 给每条纤维一个材料（可改成不同颜色或材质）
    const baseMaterial = new THREE.LineBasicMaterial({ linewidth: 1 });
    
    fibers.forEach((fiber) => {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(fiber.flat());
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        
        // 在基础颜色周围进行小范围随机变化
        const hueVariation = (Math.random() - 0.5) * 0.1; // ±0.05的色相变化
        const saturationVariation = (Math.random() - 0.5) * 0.1; // ±0.05的饱和度变化
        const lightnessVariation = (Math.random() - 0.5) * 0.1; // ±0.05的亮度变化
        
        const color = new THREE.Color().setHSL(
            (baseColor.h + hueVariation) % 1,
            Math.max(0, Math.min(1, baseColor.s + saturationVariation)),
            Math.max(0, Math.min(1, baseColor.l + lightnessVariation))
        );
        
        const material = baseMaterial.clone();
        material.color.copy(color);
        
        const line = new THREE.Line(geometry, material);
        group.add(line);
    });
    
    return group;
}