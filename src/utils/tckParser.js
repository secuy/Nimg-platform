import { rotatePoints } from './cordTrans';

/**
 * 解析.tck文件内容
 * @param {ArrayBuffer} buffer - .tck文件的二进制数据
 * @returns {Promise<THREE.BufferGeometry>} 解析后的几何体
 */
export async function parseTCK(buffer, options = {}) {
    const dataView = new DataView(buffer);
    const decoder = new TextDecoder('utf-8');
    const uint8Array = new Uint8Array(buffer);

    // 1. 提取header
    let headerText = '';
    let headerEnd = 0;
    for (let i = 0; i < uint8Array.length - 2; i++) {
        const slice = decoder.decode(uint8Array.slice(i, i + 3));
        if (slice === 'END') {
            headerEnd = i + 3; // END结束
            break;
        }
    }
    if (headerEnd === 0) {
        throw new Error('Header解析失败，未找到END');
    }
    headerText = decoder.decode(uint8Array.slice(0, headerEnd));
    const headerLines = headerText.split('\n');

    // 2. 解析header为字典
    const header = {};
    const commandHistory = [];
    for (const line of headerLines) {
        if (line === 'END') break;
        if (line.startsWith('mrtrix tracks')) {
            header['first_line'] = 'mrtrix tracks';
        } else if (line.startsWith('command_history:')) {
            commandHistory.push(line.split(':')[1].trim());
        } else if (line.includes(':')) {
            const [key, value] = line.split(':');
            header[key.trim()] = value.trim();
        }
    }
    header['command_history'] = commandHistory;

    // 3. 确定数据开始offset
    let fileOffset = 0;
    if (header['file']) {
        const match = header['file'].match(/\d+/);
        if (match) {
            fileOffset = parseInt(match[0]);
        }
    }

    // 4. 确定数据格式
    const isLittleEndian = header['datatype'].includes('LE');
    const isFloat32 = header['datatype'].includes('32');
    const bytesPerFloat = isFloat32 ? 4 : 8;
    const floatReader = isFloat32
        ? (offset) => dataView.getFloat32(offset, isLittleEndian)
        : (offset) => dataView.getFloat64(offset, isLittleEndian);

    // 5. 读取fiber数据
    let offset = fileOffset;
    const tracts = [];
    let currentTract = [];
    let nanCount = 0;
    let infCount = 0;
    let done = false;

    // 读取count指定的轨迹数量
    const numTracts = parseInt(header['count']);
    console.log('预期轨迹数量:', numTracts);
    
    while (!done && offset + bytesPerFloat <= buffer.byteLength && tracts.length < numTracts) {
        const x = floatReader(offset);
        const y = floatReader(offset + bytesPerFloat);
        const z = floatReader(offset + bytesPerFloat * 2);
        offset += bytesPerFloat * 3;

        if (Number.isNaN(x) || Number.isNaN(y) || Number.isNaN(z)) {
            nanCount++;
            if (nanCount === 1) {
                // 当前fiber结束
                if (currentTract.length > 0) {
                    // 应用旋转（如果提供了旋转选项）
                    if (options.rotation) {
                        currentTract = rotatePoints(currentTract, options.rotation);
                    }
                    tracts.push(currentTract);
                    currentTract = [];
                }
                nanCount = 0;
            }
        } else if (x === Infinity || y === Infinity || z === Infinity) {
            infCount++;
            if (infCount === 1) {
                done = true;
            }
        } else {
            nanCount = 0;
            currentTract.push(x, y, z);
        }
    }

    // 添加最后一个轨迹（如果有的话）
    if (currentTract.length > 0) {
        tracts.push(currentTract);
    }

    console.log(`总共读取了 ${tracts.length} 条tract`);
    return tracts;
}