<template>
  <div id="container" class="fibervis-container">
    <div id="sidebar" ref="sidebar">
      <div id="sidebar-header">
        <input type="file" ref="tckFile" accept=".tck" multiple @change="onTCKFileChange" />
        <div ref="layerPanel"></div>
        <div id="tract-control-menu" style="margin-bottom:8px;">
          <label>Display mode:
            <select ref="tractControlMode" v-model="controlMode" @change="onControlModeChange">
              <option value="ratio">Ratio (%)</option>
              <option value="count">Exact Number</option>
            </select>
          </label>
        </div>
        <div ref="tractSliderContainer" style="margin-bottom:10px;">
          <label>Render tracts: <span ref="tractSliderValue">{{ Math.round(currentRatio * 100) }}</span>%</label>
          <input type="range" ref="tractSlider" min="1" max="100" v-model="sliderValue" @input="onSliderInput" />
        </div>
        <div ref="tractCountContainer" style="margin-bottom:10px; display:none;">
          <label>Render tracts: </label>
          <input type="number" ref="tractCountInput" min="1" v-model="currentCount" @input="onCountInput"
            style="width:70px;" />
        </div>
        <div id="sidebar-header-row">
          <b>Tracts</b>
          <div ref="tractCount" style="margin-left:1em; color:#888;"></div>
          <button ref="foldBtn" @click="onFoldBtnClick">Hide list</button>
        </div>
      </div>
      <div id="sidebar-content">
        <div ref="tractList"></div>
        <div ref="tractDetails"></div>
      </div>
    </div>
    <canvas ref="threeCanvas" tabindex="0"
      style="flex:1;width:100%;height:100vh;outline:none;background:#181818;display:block;">
    </canvas>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue';
import { initElements } from './ui/elements.js';
import { loadTractList, clearTractList, setFolded, setupListUI } from './ui/list.js';
// import { showTractDetails } from './ui/details.js';
import { clearLayerTractLines, hideTractLines, showTractLines } from './three/tracts.js';
import { animate } from './three/renderLoop.js';
import { readTCK } from './utils/tckparser.js';

// refs
const tckFile = ref(null);
const layerPanel = ref(null);
const tractList = ref(null);
const tractDetails = ref(null);
const tractCount = ref(null);
const foldBtn = ref(null);
const tractSlider = ref(null);
const tractSliderValue = ref(null);
const tractControlMode = ref(null);
const tractSliderContainer = ref(null);
const tractCountContainer = ref(null);
const tractCountInput = ref(null);
const threeCanvas = ref(null);

// 状态
let layers = [];
let selectedLayerIndex = -1;
const controlMode = ref('ratio');
const currentRatio = ref(0.1);
const currentCount = ref(1);
const sliderValue = ref(10);

// 颜色循环
const COLORS = [
  0x00ffe5, 0xffe600, 0xff00bf, 0x009aff, 0xff7433, 0x8eeb34, 0xbf34eb
];
function pickLayerColor(idx) {
  return COLORS[idx % COLORS.length];
}

// UI handlers
function updateSliderLabel() {
  if (tractSliderValue.value)
    tractSliderValue.value.textContent = Math.round(currentRatio.value * 100);
}
function updateCountInputMax(layer) {
  if (tractCountInput.value)
    tractCountInput.value.max = layer ? layer.tracts.length : 1;
}
function renderLayerPanel() {
  if (!layerPanel.value) return;
  layerPanel.value.innerHTML = '';
  layers.forEach((layer, idx) => {
    const row = document.createElement('div');
    row.className = 'layer-row';
    if (idx === selectedLayerIndex) row.classList.add('selected');
    const colorDot = document.createElement('span');
    colorDot.style.display = 'inline-block';
    colorDot.style.width = '16px';
    colorDot.style.height = '16px';
    colorDot.style.marginRight = '5px';
    colorDot.style.background = '#' + layer.color.toString(16).padStart(6, '0');
    colorDot.style.borderRadius = '50%';
    row.appendChild(colorDot);

    const nameSpan = document.createElement('span');
    nameSpan.textContent = layer.name;
    nameSpan.style.flex = '1';
    nameSpan.style.cursor = 'pointer';
    nameSpan.onclick = () => selectLayer(idx);
    row.appendChild(nameSpan);

    const visBox = document.createElement('input');
    visBox.type = 'checkbox';
    visBox.title = layer.visible ? "Hide" : "Show";
    visBox.checked = layer.visible;
    visBox.style.marginRight = '6px';
    visBox.onchange = () => {
      layer.visible = visBox.checked;
      updateLayerVisibility(idx);
    };
    row.appendChild(visBox);

    const delBtn = document.createElement('button');
    delBtn.textContent = '🗑';
    delBtn.title = "Delete layer";
    delBtn.onclick = (evt) => {
      evt.stopPropagation();
      deleteLayer(idx);
    };
    row.appendChild(delBtn);

    layerPanel.value.appendChild(row);
  });
}
function updateLayerVisibility(idx) {
  const layer = layers[idx];
  if (layer.visible) {
    showTractLines(idx);
  } else {
    hideTractLines(idx);
  }
}
function selectLayer(idx) {
  if (selectedLayerIndex === idx) return;
  selectedLayerIndex = idx;
  renderLayerPanel();
  const layer = layers[idx];
  updateCountInputMax(layer);
  if (!tractCountInput.value.value || isNaN(+tractCountInput.value.value)) {
    currentCount.value = 1;
    tractCountInput.value.value = 1;
  } else {
    currentCount.value = Math.max(1, Math.min(parseInt(tractCountInput.value.value, 10), layer.tracts.length));
    tractCountInput.value.value = currentCount.value;
  }
  renderTractsByControl();
  setFolded(true); // Always fold by default
}
function deleteLayer(idx) {
  clearLayerTractLines(idx);
  layers.splice(idx, 1);
  if (selectedLayerIndex === idx) {
    selectedLayerIndex = layers.length > 0 ? 0 : -1;
  } else if (selectedLayerIndex > idx) {
    selectedLayerIndex--;
  }
  renderLayerPanel();
  if (selectedLayerIndex >= 0) {
    selectLayer(selectedLayerIndex);
  } else {
    clearTractList();
  }
}
function onTCKFileChange(e) {
  if (!window._fibervis_three_ready) {
    alert('3D 视窗初始化中，请稍后再试！');
    return;
  }
  const files = Array.from(e.target.files);
  (async () => {
    for (const file of files) {
      const name = file.name;
      try {
        const { tracts } = await readTCK(file);
        const color = pickLayerColor(layers.length);
        const layer = {
          name,
          tracts,
          color,
          visible: true,
          threeObjects: [],
          ratio: currentRatio.value,
          count: 1
        };
        layers.push(layer);
      } catch (err) {
        alert('Error parsing ' + name + ': ' + err.message);
      }
    }
    if (layers.length > 0) {
      selectLayer(layers.length - 1);
    }
    renderLayerPanel();
    if (tckFile.value) tckFile.value.value = '';
  })();
}
function onControlModeChange() {
  if (!tractSliderContainer.value || !tractCountContainer.value) return;
  if (controlMode.value === 'ratio') {
    tractSliderContainer.value.style.display = '';
    tractCountContainer.value.style.display = 'none';
  } else {
    tractSliderContainer.value.style.display = 'none';
    tractCountContainer.value.style.display = '';
  }
  const layer = layers[selectedLayerIndex];
  updateCountInputMax(layer);
  renderTractsByControl();
}
function onSliderInput() {
  currentRatio.value = sliderValue.value / 100;
  updateSliderLabel();
  if (controlMode.value === 'ratio') {
    renderTractsByControl();
  }
}
function onCountInput() {
  currentCount.value = Math.max(1, parseInt(tractCountInput.value.value, 10) || 1);
  if (controlMode.value === 'count') {
    renderTractsByControl();
  }
}
function onFoldBtnClick() {
  setFolded(!foldBtn.value.classList.contains('folded'));
}
function renderTractsByControl() {
  if (selectedLayerIndex < 0) {
    clearTractList();
    return;
  }
  const layer = layers[selectedLayerIndex];
  if (!layer) return;
  if (controlMode.value === 'ratio') {
    loadTractList(layer.tracts, currentRatio.value, undefined, layer.color, selectedLayerIndex);
  } else {
    loadTractList(layer.tracts, undefined, currentCount.value, layer.color, selectedLayerIndex);
  }
}

onMounted(async () => {
  // 初始化所有依赖的 dom 元素到 ui/elements.js
  initElements({
    tckFile,
    layerPanel,
    tractList,
    tractDetails,
    tractCount,
    foldBtn,
    tractSlider,
    tractSliderValue,
    tractControlMode,
    tractSliderContainer,
    tractCountContainer,
    tractCountInput
  });
  // 初始化列表 UI（把 DOM 传给 list.js）
  setupListUI({
    tractList,
    tractCount,
    foldBtn,
    tractDetails
  });
  // 默认 UI 状态
  updateSliderLabel();
  if (tractSliderContainer.value) tractSliderContainer.value.style.display = '';
  if (tractCountContainer.value) tractCountContainer.value.style.display = 'none';
  setFolded(true);
  // Three.js 场景初始化
  await nextTick();
  import('./three/scene.js').then(mod => {
    mod.initCanvas(threeCanvas.value);
    animate();
    // 标记 Three.js 已初始化
    window._fibervis_three_ready = true;
  });
});
</script>

<style src="./styles.css"></style>