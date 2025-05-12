import * as THREE from 'three';
import pako from 'pako';
import { rotatePoints } from './cordTrans';
/**
 * 解码Base64编码的GZip数据
 * @param {string} base64String - Base64编码的字符串
 * @returns {ArrayBuffer} 解码后的数据
 */
function decodeBase64Gzip(base64String) {
    const cleanBase64 = base64String
        .replace(/\s/g, '')
        .replace(/[^A-Za-z0-9+/=]/g, '');

    const binaryString = atob(cleanBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }

    return pako.inflate(bytes).buffer;
}

/**
 * 解析GIFTI文件内容
 * @param {string} content - GIFTI文件的XML内容
 * @param {Object} [options] - 解析选项
 * @param {Object} [options.rotation] - 旋转选项
 * @param {number} [options.rotation.rotateX=0] - 绕X轴旋转的角度（弧度）
 * @param {number} [options.rotation.rotateY=0] - 绕Y轴旋转的角度（弧度）
 * @param {number} [options.rotation.rotateZ=0] - 绕Z轴旋转的角度（弧度）
 * @returns {Promise<THREE.BufferGeometry>} 解析后的几何体
 */
export async function parseGIFTI(content, options = {}) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(content, "text/xml");
    
    const dataArrays = xmlDoc.getElementsByTagName('DataArray');
    let pointsData = null;
    let facesData = null;

    for (let i = 0; i < dataArrays.length; i++) {
        const dataArray = dataArrays[i];
        const intent = dataArray.getAttribute('Intent');
        const base64Data = dataArray.querySelector('Data')?.textContent;

        if (intent === 'NIFTI_INTENT_POINTSET' && base64Data) {
            pointsData = base64Data.trim();
        } else if (intent === 'NIFTI_INTENT_TRIANGLE' && base64Data) {
            facesData = base64Data.trim();
        }
    }

    if (!pointsData || !facesData) {
        throw new Error('无法找到顶点或面数据');
    }

    const pointsBuffer = await decodeBase64Gzip(pointsData);
    const facesBuffer = await decodeBase64Gzip(facesData);
    
    let pointsArray = new Float32Array(pointsBuffer);
    const facesArray = new Uint32Array(facesBuffer);

    // 应用旋转（如果提供了旋转选项）
    if (options.rotation) {
        pointsArray = rotatePoints(pointsArray, options.rotation);
    }

    // 确保面的顶点顺序正确（逆时针）
    for (let i = 0; i < facesArray.length; i += 3) {
        const temp = facesArray[i + 1];
        facesArray[i + 1] = facesArray[i + 2];
        facesArray[i + 2] = temp;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(pointsArray, 3));
    geometry.setIndex(new THREE.BufferAttribute(facesArray, 1));
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();

    return geometry;
}

/**
 * 解析标签文件内容
 * @param {string} content - 标签文件的XML内容
 * @returns {Promise<Int32Array>} 解析后的标签数据
 */
export async function parseLabelGIFTI(content) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(content, "text/xml");
    
    const dataArray = xmlDoc.querySelector('DataArray');
    if (!dataArray) {
        throw new Error('未找到数据数组');
    }

    const base64Data = dataArray.querySelector('Data')?.textContent;
    if (!base64Data) {
        throw new Error('未找到标签数据');
    }

    const labelBuffer = await decodeBase64Gzip(base64Data);
    return new Int32Array(labelBuffer);
} 