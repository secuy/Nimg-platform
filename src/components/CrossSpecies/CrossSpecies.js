import { ref, onMounted, onBeforeUnmount } from 'vue';
import * as THREE from 'three';
import { setupLights } from '../../utils/lightManager';
import { createDefaultMaterial, updateMaterial, buildFiberLines } from '../../utils/materialManager';
import { parseGIFTI, parseLabelGIFTI } from '../../utils/giftiParser';
import { generateColors, updateVertexColors } from '../../utils/colorManager';
import { createCamera, createControls, adjustCameraToObject } from '../../utils/cameraManager';
import { parseTCK } from '../../utils/tckParser';

export function useCrossSpecies(containerRef, sharedState, side) {
  const opacity = ref(1);
  const hasSurface = ref(false);
  const hasLabels = ref(false);
  const hasFibers = ref(false);
  const viewMode = ref('browse'); // 'browse' 或 'inspect'
  const surfaceCheckTag = ref(false);
  const selectedVertex = ref(null);
  const vertexInfo = ref(null);
  const surfInput = ref(null);
  const labelInput = ref(null);
  const tckInput = ref(null);
  const surfSysNames = ref([]);
  const parcSysNames = ref([]);
  
  let scene = null;
  let camera = null;
  let renderer = null;
  let controls = null;
  let currentMesh = null;
  let currentTracks = [];
  let vertexLabels = null;
  let labelColors = {};
  let needsRender = true;
  let raycaster = null;
  let mouse = null;
  let highlightMaterial = null;
  let highlightMesh = null;
  let chooseLabel = null;

  /**
   * 初始化Three.js场景
   */
  const initThree = () => {
    if (!containerRef.value) return;

    // 创建场景
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x2c2c2c);

    // 创建相机和控制器
    const container = containerRef.value;
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    camera = createCamera(width, height);
    renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      depth: true,
      stencil: false,
      preserveDrawingBuffer: false,
      powerPreference: "high-performance"
    });
    
    renderer.setSize(width, height);
    renderer.setClearColor(0x2c2c2c, 1);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    controls = createControls(camera, renderer.domElement);
    
    // 设置光照
    setupLights(scene);

    // 初始化射线检测器和鼠标位置
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    // 添加鼠标点击事件监听
    renderer.domElement.addEventListener('click', onMouseClick);

    // 开始动画循环
    animate();
  };

  /**
   * 动画循环
   */
  const animate = () => {
    if (!renderer || !scene || !camera) return;
    requestAnimationFrame(animate);
    if (controls && controls.enabled && (controls.update() || needsRender)) {
      renderer.render(scene, camera);
      needsRender = false;
    }
  };

  /**
   * 处理鼠标点击皮层事件
   */
  const onMouseClick = (event) => {
    if (!renderer || !camera || !currentMesh || (viewMode.value !== 'inspect' && !surfaceCheckTag.value) ) return;

    // 计算鼠标在归一化设备坐标中的位置
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // 更新射线
    raycaster.setFromCamera(mouse, camera);

    // 检测射线与模型的交点
    const intersects = raycaster.intersectObject(currentMesh);

    if (intersects.length > 0) {
      const intersect = intersects[0];
      const vertexIndex = intersect.face.a;
      
      // 获取顶点位置
      const position = currentMesh.geometry.attributes.position;
      const vertexPosition = new THREE.Vector3(
        position.getX(vertexIndex),
        position.getY(vertexIndex),
        position.getZ(vertexIndex)
      );

      // 高亮选中的顶点
      highlightVertex(vertexPosition);

      // 获取顶点信息
      selectedVertex.value = vertexIndex;
      vertexInfo.value = {
        index: vertexIndex,
        position: {
          x: vertexPosition.x.toFixed(2),
          y: vertexPosition.y.toFixed(2),
          z: vertexPosition.z.toFixed(2)
        }
      };

      // 如果有标签，添加标签信息
      if (hasLabels.value && vertexLabels) {
        const label = vertexLabels[vertexIndex];
        vertexInfo.value.label = label;
        chooseLabel = label;
        if (labelColors[label.toString()]) {
          const color = labelColors[label.toString()];
          vertexInfo.value.color = {
            r: color.r.toFixed(2),
            g: color.g.toFixed(2),
            b: color.b.toFixed(2)
          };
        }
      }
      
      // 如果是皮层检查功能则需要进行标签选择
      if(surfaceCheckTag && viewMode.value !== 'inspect') {
        // 将所选标签保留 ，其他标签置为0
        flushChooseLabelOnSurf(chooseLabel);
        // 找到另一个画布对应的label
        const otherSide = side === 'left' ? 'right' : 'left';
        const otherWorld = sharedState[otherSide];
        otherWorld.flushChooseLabelOnSurf(chooseLabel);
      }
      needsRender = true;

    } else {
      // 如果没有选中任何顶点，清除高亮和信息
      clearHighlight();
      selectedVertex.value = null;
      vertexInfo.value = null;
      needsRender = true;
    }
  };

  /**
   * 用来一个画布对另一个画布的刷新函数，用于皮层检查，只显示皮层中选中的一个颜色
   */
  const flushChooseLabelOnSurf = (cho_label) => {
    if(vertexLabels && labelColors) {
      const filteredLabels = vertexLabels.map(label => label === cho_label ? label : 0);
      updateVertexColors(currentMesh.geometry, filteredLabels, labelColors);
    }
    needsRender = true;
  }


  /**
   * 用来重新刷新皮层标签，重新填充全脑标签
   */
  const refreshSurfaceLabel = () => {
    if (hasLabels.value && vertexLabels) {
      // 恢复原标签
      updateVertexColors(currentMesh.geometry, vertexLabels, labelColors);
      // 清除高亮点
      clearHighlight();
      selectedVertex.value = null;
      vertexInfo.value = null;
    }
    needsRender = true;
  }

  /**
   * 高亮选中的顶点
   */
  const highlightVertex = (position) => {
    // 清除之前的高亮
    clearHighlight();

    // 创建一个非常大的球体，确保可见
    const high_geometry = new THREE.SphereGeometry(2, 32, 32);
    
    highlightMaterial = new THREE.MeshPhongMaterial({
      color: 0xdddddd,
      transparent: true,
      depthTest: false, // 禁用深度测试，确保始终显示在最前面
      depthWrite: false
    });
    
    highlightMesh = new THREE.Mesh(high_geometry, highlightMaterial);
    highlightMesh.position.copy(position);
    
    // 将高亮对象添加到场景
    scene.add(highlightMesh);
    
    // 强制立即渲染
    renderer.render(scene, camera);
    needsRender = true;
  };

  /**
   * 清除高亮
   */
  const clearHighlight = () => {
    if (highlightMesh) {
      scene.remove(highlightMesh);
      highlightMesh.geometry.dispose();
      highlightMaterial.dispose();
      highlightMesh = null;
      needsRender = true;
    }
  };

  /**
   * 切换查看模式
   */
  const toggleViewMode = () => {
    surfaceCheckTag.value = false;
    
    refreshSurfaceLabel();
    
    viewMode.value = viewMode.value === 'browse' ? 'inspect' : 'browse';
    
    needsRender = true;
  };

  /**
   * 进行皮层检查
   */
  const surfaceCheck = () => {
    // 要对检查模式进行关闭，进入普通的浏览模式，并且对于两个画布都是如此
    if(viewMode.value === 'inspect') {
      toggleViewMode();
    }

    if(surfaceCheckTag.value) {
      surfaceCheckTag.value = false;
    } else {
      surfaceCheckTag.value = true;
    }
    refreshSurfaceLabel();
    // 刷新另一个
    const otherSide = side === 'left' ? 'right' : 'left';
    const otherWorld = sharedState[otherSide];
    
    otherWorld.refreshSurfaceLabel();
    needsRender = true;
  }

  /**
   * 从服务器加载GIFTI文件
   */
  const loadGIFTIFileFromServer = async (filename) => {
    try {
      const response = await fetch(`/cross-species/surfaces/${filename}`);
      if (!response.ok) {
        throw new Error('Failed to load surface file');
      }
      const fileContent = await response.text();
      await loadGIFTIFileContent(fileContent);
    } catch (error) {
      console.error('从服务器加载GIFTI文件时出错:', error);
    }
  };

  /**
   * 加载GIFTI文件内容
   */
  const loadGIFTIFileContent = async (fileContent) => {
    try {
      // 设置旋转选项，绕X轴逆时针旋转90度，绕Y轴顺时针旋转90度
      const rotationOptions = {
        rotation: {
          rotateX: -Math.PI / 2,
          rotateY: 0,
          rotateZ: Math.PI / 2
        }
      };
      
      const geometry = await parseGIFTI(fileContent, rotationOptions);
      const material = createDefaultMaterial({
        opacity: opacity.value,
        transparent: opacity.value < 1
      });
      
      const mesh = new THREE.Mesh(geometry, material);
      
      if (currentMesh) {
        scene.remove(currentMesh);
        currentMesh.geometry.dispose();
        currentMesh.material.dispose();
      }

      currentMesh = mesh;
      scene.add(mesh);
      hasSurface.value = true;
      adjustCameraToObject(camera, mesh);
      needsRender = true;
    } catch (error) {
      console.error('处理GIFTI文件内容时出错:', error);
    }
  };

  /**
   * 从服务器加载标签文件
   */
  const loadLabelGIFTIFileFromServer = async (filename) => {
    try {
      const response = await fetch(`/cross-species/cross-species_parcellation/${filename}`);
      if (!response.ok) {
        throw new Error('Failed to load label file');
      }
      const fileContent = await response.text();
      await loadLabelGIFTIFileContent(fileContent);
    } catch (error) {
      console.error('从服务器加载标签文件时出错:', error);
    }
  };

  /**
   * 加载标签文件内容
   */
  const loadLabelGIFTIFileContent = async (fileContent) => {
    try {
      vertexLabels = await parseLabelGIFTI(fileContent);
      const uniqueLabels = new Set(vertexLabels);
      const sortedLabels = Array.from(uniqueLabels).sort((a, b) => a - b);
      const colors = generateColors(sortedLabels.length);
      
      labelColors = {};
      sortedLabels.forEach((label, index) => {
        labelColors[label.toString()] = colors[index];
      });

      hasLabels.value = true;
      updateVertexColors(currentMesh.geometry, vertexLabels, labelColors);
      currentMesh.material.vertexColors = true;
      currentMesh.material.needsUpdate = true;
      needsRender = true;
    } catch (error) {
      console.error('处理标签文件内容时出错:', error);
    }
  };

  /**
   * 从服务器加载TCK文件
   */
  const loadTCKFileFromServer = async (filename) => {
    try {
      const response = await fetch(`/cross-species/tracks/${filename}`);
      if (!response.ok) {
        throw new Error('Failed to load TCK file');
      }
      const buffer = await response.arrayBuffer();
      await loadTCKFileContent(buffer);
    } catch (error) {
      console.error('从服务器加载TCK文件时出错:', error);
    }
  };

  /**
   * 加载TCK文件内容
   */
  const loadTCKFileContent = async (buffer) => {
    try {
      const rotationOptions = {
        rotation: {
          rotateX: -Math.PI / 2,
          rotateY: 0,
          rotateZ: Math.PI / 2
        }
      };

      const fibers = await parseTCK(buffer, rotationOptions);
      const fiberGroup = buildFiberLines(fibers);
      currentTracks.push(fiberGroup);
      scene.add(fiberGroup);
      hasFibers.value = true;

      if (currentMesh) {
        adjustCameraToObject(camera, currentMesh);
      } else if (currentTracks.length > 0) {
        adjustCameraToObject(camera, currentTracks[0]);
      }
      needsRender = true;
    } catch (error) {
      console.error('处理TCK文件内容时出错:', error);
    }
  };

  // 修改现有的处理函数
  const handleSurfaceUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const fileReader = new FileReader();
      fileReader.onload = async (event) => {
        await loadGIFTIFileContent(event.target.result);
      };
      fileReader.readAsText(file);
    }
  };

  const handleLabelUpload = async (event) => {
    const file = event.target.files[0];
    if (file) {
      const fileReader = new FileReader();
      fileReader.onload = async (event) => {
        await loadLabelGIFTIFileContent(event.target.result);
      };
      fileReader.readAsText(file);
    }
  };

  const handleTCKUpload = async (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    try {
      const files = Array.from(event.target.files);
      if (files.length > 0) {
        for (const file of files) {
          const buffer = await file.arrayBuffer();
          await loadTCKFileContent(buffer);
        }
      }
    } catch (error) {
      console.error('加载.tck文件时出错:', error);
    }
  };

  /**
   * 丢弃皮层
   */
  const discardSurface = () => {
    if (currentMesh && hasSurface.value) {
      
      // 清除皮层
      scene.remove(currentMesh);
      currentMesh.geometry.dispose();
      currentMesh.material.dispose();
      hasSurface.value = false;
      
      // 清除标签数据
      if(hasLabels.value) {
        vertexLabels = null;
        labelColors = {};
        hasLabels.value = false;
      }
  
      // 清除顶点信息
      if (viewMode.value === 'inspect') {
        clearHighlight();
        selectedVertex.value = null;
        vertexInfo.value = null;
      }
      needsRender = true;
      // 清空文件输入
      if (surfInput.value) surfInput.value.value = '';
      if (labelInput.value) labelInput.value.value = '';

      // 触发事件通知父组件皮层重置下拉框
      const event = new CustomEvent('reset-surface-select', {
        detail: { side }
      });
      window.dispatchEvent(event);

      // 触发事件通知父组件标签重置下拉框
      const event2 = new CustomEvent('reset-label-select', {
        detail: { side }
      });
      window.dispatchEvent(event2);
    }
  };


  /**
   * 丢弃标签
   */
  const discardLabels = () => {
    if (currentMesh && hasLabels.value) {
      const geometry = currentMesh.geometry;
  
      // 删除顶点颜色属性
      if (geometry.getAttribute('color')) {
        geometry.deleteAttribute('color');
        geometry.attributes.position.needsUpdate = true;
      }
  
      // 重置材质为统一灰色
      const material = currentMesh.material;
      material.vertexColors = false;
      material.color.set(0x808080);
      material.needsUpdate = true;
  
      // 清除标签数据
      vertexLabels = null;
      labelColors = {};
      hasLabels.value = false;
  
      // 清除顶点信息
      if (viewMode.value === 'inspect') {
        clearHighlight();
        selectedVertex.value = null;
        vertexInfo.value = null;
      }

      needsRender = true;
      // 清空文件输入
      if (labelInput.value) labelInput.value.value = '';

      // 触发事件通知父组件重置下拉框
      const event = new CustomEvent('reset-label-select', {
        detail: { side }
      });
      window.dispatchEvent(event);
    }
  };

  /**
   * 清空纤维
   */
  const clearFibers = () => {
    if (!currentTracks || !scene) return;

    // 从场景中移除所有纤维并释放资源
    currentTracks.forEach(track => {
      if (!track) return;

      if (track.children) {
        // 如果是Group，遍历其所有子对象
        track.children.forEach(child => {
          if (child && scene) {
            scene.remove(child);
            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
          }
        });
        scene.remove(track);
      } else {
        // 如果是单个Line对象
        scene.remove(track);
        if (track.geometry) track.geometry.dispose();
        if (track.material) track.material.dispose();
      }
    });
    
    // 清空数组
    currentTracks = [];
    hasFibers.value = false;
    
    // 触发重新渲染
    needsRender = true;
    // 清空文件输入
    if (tckInput.value) tckInput.value.value = '';
  };

  /**
   * 重置视图
   */
  const resetView = () => {
    if (currentMesh) {
      adjustCameraToObject(camera, currentMesh, controls);
    }
    needsRender = true;
  };

  /**
   * 更新透明度
   */
  const updateOpacity = () => {
    if (currentMesh) {
      updateMaterial(currentMesh.material, {
        opacity: opacity.value,
        transparent: opacity.value < 1
      });
      needsRender = true;
    }
  };

  /**
   * 处理窗口大小变化
   */
  const handleResize = () => {
    if (!containerRef.value || !renderer || !camera) return;
    
    const container = containerRef.value;
    const width = container.clientWidth;
    const height = container.clientHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    needsRender = true;
  };

  const fetchFilesFromPublic = async (folder, list_name) => {
    try {
      // 在 public 下，你有一个列表文件（可以是 JSON 格式）存放着文件名
      const response = await fetch(`/cross-species/${folder}/${list_name}`);
      
      if (!response.ok) {
        throw new Error('Failed to load file list');
      }
      const fileList = await response.json();
      return fileList; // 返回文件名数组
    } catch (error) {
      console.error('Error fetching file names:', error);
      return [];
    }
  };

  onMounted(() => {
    initThree();
    window.addEventListener('resize', handleResize);

    // 获取 surfaces 文件夹中的所有文件名
    fetchFilesFromPublic('surfaces', 'surfList.json')  // 将响应解析为 JSON
      .then(data => {
        surfSysNames.value = data;  // 将文件名数组存储到 surfSysNames
      })
      .catch((error) => {
        console.error('Error fetching files:', error);
      });
    
    // 获取 parcellations 文件夹中的所有文件名
    fetchFilesFromPublic('cross-species_parcellation', 'parcList.json')  // 将响应解析为 JSON
      .then(data => {
        parcSysNames.value = data;  // 将文件名数组存储到 surfSysNames
      })
      .catch((error) => {
        console.error('Error fetching files:', error);
      });
    
    
  });

  onBeforeUnmount(() => {
    window.removeEventListener('resize', handleResize);
    if (renderer) {
      renderer.domElement.removeEventListener('click', onMouseClick);
      renderer.dispose();
    }
    if (currentMesh) {
      currentMesh.geometry.dispose();
      currentMesh.material.dispose();
    }
    scene = null;
    camera = null;
    renderer = null;
    controls = null;
    currentMesh = null;
    currentTracks = [];
    vertexLabels = null;
    labelColors = {};
    raycaster = null;
    mouse = null;
    highlightMaterial = null;
    highlightMesh = null;
  });

  return {
    opacity,
    hasSurface,
    hasLabels,
    hasFibers,
    surfInput,
    labelInput,
    tckInput,
    viewMode,
    surfaceCheckTag,
    vertexInfo,
    currentMesh,
    vertexLabels,
    labelColors,
    surfSysNames,
    parcSysNames,
    handleSurfaceUpload,
    handleLabelUpload,
    handleTCKUpload,
    discardSurface,
    discardLabels,
    clearFibers,
    resetView,
    updateOpacity,
    toggleViewMode,
    surfaceCheck,
    refreshSurfaceLabel,
    flushChooseLabelOnSurf,
    loadGIFTIFileFromServer,
    loadLabelGIFTIFileFromServer,
    loadTCKFileFromServer
  };
} 