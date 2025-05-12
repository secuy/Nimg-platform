import * as THREE from 'three';

/**
 * 生成均匀分布的颜色
 * @param {number} count - 需要生成的颜色数量
 * @returns {Object} 颜色映射对象，key为索引，value为THREE.Color对象
 */
export function generateColors(count) {
    const colors = {};
    for (let i = 0; i < count; i++) {
        const hue = (i / count) * 360;
        const saturation = 0.8;
        const value = 0.9;
        
        const h = hue / 60;
        const c = value * saturation;
        const x = c * (1 - Math.abs((h % 2) - 1));
        const m = value - c;
        
        let r, g, b;
        if (h < 1) { [r, g, b] = [c, x, 0]; }
        else if (h < 2) { [r, g, b] = [x, c, 0]; }
        else if (h < 3) { [r, g, b] = [0, c, x]; }
        else if (h < 4) { [r, g, b] = [0, x, c]; }
        else if (h < 5) { [r, g, b] = [x, 0, c]; }
        else { [r, g, b] = [c, 0, x]; }
        
        colors[i] = new THREE.Color(
            (r + m),
            (g + m),
            (b + m)
        );
    }
    return colors;
}

/**
 * 更新几何体的顶点颜色
 * @param {THREE.BufferGeometry} geometry - 要更新的几何体
 * @param {Int32Array} labels - 顶点标签数据
 * @param {Object} labelColors - 标签到颜色的映射,labelsColors可以为空
 */
export function updateVertexColors(geometry, labels, labelColors) {
    const vertexCount = geometry.attributes.position.count;
    const colors = new Float32Array(vertexCount * 3);
    const defaultColor = new THREE.Color(0x808080);

    for (let i = 0; i < vertexCount; i++) {
        let color = defaultColor;

        if (labels && labels.length === vertexCount) {
            const label = labels[i].toString();
            color = label === "0" ? defaultColor : labelColors[label] || defaultColor;
        }

        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
    }

    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.attributes.color.needsUpdate = true;
}