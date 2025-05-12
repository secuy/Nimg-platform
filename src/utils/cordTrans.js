import * as THREE from 'three';

/**
 * 对顶点坐标进行旋转
 * @param {Float32Array} pointsArray - 顶点坐标数组
 * @param {Object} options - 旋转选项
 * @param {number} [options.rotateX=0] - 绕X轴旋转的角度（弧度）
 * @param {number} [options.rotateY=0] - 绕Y轴旋转的角度（弧度）
 * @param {number} [options.rotateZ=0] - 绕Z轴旋转的角度（弧度）
 * @returns {Float32Array} 旋转后的顶点坐标数组
 */
export function rotatePoints(pointsArray, options = {}) {
    const { rotateX = 0, rotateY = 0, rotateZ = 0 } = options;
    
    // 创建旋转矩阵
    const rotationMatrix = new THREE.Matrix4();
    rotationMatrix.makeRotationFromEuler(new THREE.Euler(rotateX, rotateY, rotateZ));
    
    // 创建临时向量
    const vector = new THREE.Vector3();
    
    // 对每个顶点应用旋转
    for (let i = 0; i < pointsArray.length; i += 3) {
        vector.set(pointsArray[i], pointsArray[i + 1], pointsArray[i + 2]);
        vector.applyMatrix4(rotationMatrix);
        pointsArray[i] = vector.x;
        pointsArray[i + 1] = vector.y;
        pointsArray[i + 2] = vector.z;
    }
    
    return pointsArray;
}
