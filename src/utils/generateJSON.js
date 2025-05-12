const fs = require('fs');
const path = require('path');

const directoryPath = '../../public/cross-species_parcellation';
const fileList = [];

fs.readdirSync(directoryPath).forEach((file) => {
  if (file.endsWith('.gii')) {  // 只取 .gii 格式的文件
    fileList.push(file);
  }
});

// 生成文件列表文件
fs.writeFileSync(path.join(directoryPath, 'parcList.json'), JSON.stringify(fileList, null, 2));
