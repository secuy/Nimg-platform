// TCK file parsing logic

export function readTCK(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = new Uint8Array(e.target.result);
                let headerEnd = 0;
                while (!(data[headerEnd] === 69 && data[headerEnd+1] === 78 && data[headerEnd+2] === 68)) headerEnd++;
                const decoder = new TextDecoder();
                const headerRaw = decoder.decode(data.slice(0, headerEnd+3)).split('\n');
                const header = {};
                for (const line of headerRaw) {
                    if (line === 'END') break;
                    if (line.includes(':')) {
                        const [k, v] = line.split(':');
                        header[k.trim()] = v.trim();
                    }
                }
                const fileOffset = parseInt(header.file.match(/\d+/)[0]);
                const endian = header.datatype.includes('LE');
                const byteSize = header.datatype.includes('32') ? 4 : 8;
                const dataView = new DataView(data.buffer);
                let i = -1, nans=0, infinities=0, done=false, rawTract=[], rawTracts=[];
                while (!done) {
                    i++;
                    const offset = fileOffset + i * byteSize;
                    if (offset + byteSize > data.length) break;
                    let val = byteSize === 4
                        ? dataView.getFloat32(offset, endian)
                        : dataView.getFloat64(offset, endian);
                    if (!isFinite(val) && val > 0) infinities++;
                    if (isNaN(val)) nans++;
                    else rawTract.push(val);
                    if (nans === 3) { rawTracts.push(rawTract); rawTract=[]; nans=0; }
                    if (infinities === 3) done=true;
                }
                const tracts = rawTracts.map(t =>
                    Array.from({length: Math.floor(t.length/3)}, (_,j) =>
                        [t[j*3], t[j*3+1], t[j*3+2]]
                    )
                );
                resolve({header, tracts});
            } catch (err) { reject(err); }
        };
        reader.onerror = () => reject(new Error('File read error'));
        reader.readAsArrayBuffer(file);
    });
}