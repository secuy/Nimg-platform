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
        <div ref="tractSliderContainer" style="margin-bottom:10px;" v-show="controlMode === 'ratio'">
          <label>Render tracts: <span ref="tractSliderValue">{{ Math.round(currentRatio * 100) }}</span>%</label>
          <input type="range" ref="tractSlider" min="1" max="100" v-model="sliderValue" @input="onSliderInput" />
        </div>
        <div ref="tractCountContainer" style="margin-bottom:10px;" v-show="controlMode === 'count'">
          <label>Render tracts: </label>
          <input type="number" ref="tractCountInput" :min="1" :max="maxCount" :value="currentCount"
            @input="onCountInput" style="width:80px;" />
          <span style="color:#888;">/ {{ maxCount }}</span>
        </div>
        <div id="sidebar-header-row">
          <b>Tracts</b>
          <div ref="tractCount" style="margin-left:1em; color:#888;"></div>
          <button ref="foldBtn" @click="onFoldBtnClick">{{ isFolded ? 'Show list' : 'Hide list' }}</button>
        </div>
      </div>
      <div id="sidebar-content">
        <div ref="tractList" :class="{ hidden: isFolded }"></div>
        <!-- 属性上传和切换控件 -->
        <div id="attribute-panel" v-if="currentLayer && currentLayer.tracts && currentLayer.tracts.length">
          <div id="attr-upload-row">
            <button id="add-attr-btn" @click="toggleAttrUpload">{{ attrUploadOpen ? 'Cancel' : 'Add Attribute (.txt)' }}</button>
            <div id="attr-switcher" v-if="attributeNames.length">
              <label for="attr-select">Show attribute:</label>
              <select id="attr-select" v-model="currentAttrName" @change="onAttrSwitch">
                <option v-for="name in attributeNames" :key="name" :value="name">{{ name }}</option>
              </select>
            </div>
          </div>
          <form v-show="attrUploadOpen" id="attr-upload-form" @submit.prevent="onAttrUpload">
            <label>Attribute file (.txt): <input type="file" ref="attrFileInput" accept=".txt" required></label>
            <label>Attribute name: <input type="text" v-model="attrName" required placeholder="e.g. FA"></label>
            <button type="submit">Upload</button>
            <span class="attr-upload-error" v-if="attrUploadError">{{ attrUploadError }}</span>
            <span class="attr-upload-success" v-if="attrUploadSuccess">{{ attrUploadSuccess }}</span>
          </form>
        </div>
        <div ref="tractDetails"></div>
      </div>
    </div>
    <canvas ref="threeCanvas" tabindex="0"
      style="flex:1;width:100%;height:100vh;outline:none;background:#181818;display:block;">
    </canvas>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick, watch, computed } from 'vue';
import { initElements } from './ui/elements.js';
import { loadTractList, clearTractList, setupListUI } from './ui/list.js';
import { clearLayerTractLines, hideTractLines, showTractLines } from './three/tracts.js';
import { animate } from './three/renderLoop.js';
import { readTCK } from './utils/tckparser.js';
import { showTractDetails } from './ui/details.js';
import { setAttributes, getAttrNames, getAttrForTract, clearAttributes } from './ui/attributes.js';

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

// 响应式状态
const layers = ref([]);
const selectedLayerIndex = ref(-1);
const isFolded = ref(true);

const attrUploadOpen = ref(false);
const attrName = ref('');
const attrFileInput = ref(null);
const attrUploadError = ref('');
const attrUploadSuccess = ref('');
const currentAttrName = ref('');

// 控制模式和 tract 数量
const controlMode = ref('ratio');
const currentRatio = ref(0.1);
const currentCount = ref(1);
const sliderValue = ref(10);

const maxCount = ref(1);

// 计算属性
const attributeNames = computed(() => getAttrNames());
const currentLayer = computed(() => layers.value[selectedLayerIndex.value] || null);

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
  maxCount.value = layer ? layer.tracts.length : 1;
  if (tractCountInput.value) {
    tractCountInput.value.max = maxCount.value;
    tractCountInput.value.min = 1;
  }
}

function renderLayerPanel() {
  if (!layerPanel.value) return;
  layerPanel.value.innerHTML = '';
  layers.value.forEach((layer, idx) => {
    const row = document.createElement('div');
    row.className = 'layer-row';
    if (idx === selectedLayerIndex.value) row.classList.add('selected');
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
  const layer = layers.value[idx];
  if (layer.visible) {
    showTractLines(idx);
  } else {
    hideTractLines(idx);
  }
}

function selectLayer(idx) {
  if (selectedLayerIndex.value === idx) return;
  selectedLayerIndex.value = idx;
  renderLayerPanel();
  const layer = layers.value[idx];
  updateCountInputMax(layer);

  clearAttributes();
  currentAttrName.value = '';

  currentRatio.value = typeof layer.ratio === 'number' ? layer.ratio : 0.1;
  currentCount.value = typeof layer.count === 'number' ? layer.count : 1;
  sliderValue.value = Math.round(currentRatio.value * 100);

  if (tractCountInput.value) tractCountInput.value.value = currentCount.value;

  renderTractsByControl();
  isFolded.value = true;
}

function deleteLayer(idx) {
  clearLayerTractLines(idx);
  layers.value.splice(idx, 1);
  if (selectedLayerIndex.value === idx) {
    selectedLayerIndex.value = layers.value.length > 0 ? 0 : -1;
  } else if (selectedLayerIndex.value > idx) {
    selectedLayerIndex.value--;
  }
  renderLayerPanel();
  if (selectedLayerIndex.value >= 0) {
    selectLayer(selectedLayerIndex.value);
  } else {
    clearTractList();
    clearAttributes();
    currentAttrName.value = '';
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
        const color = pickLayerColor(layers.value.length);
        const layer = {
          name,
          tracts,
          color,
          visible: true,
          threeObjects: [],
          ratio: currentRatio.value,
          count: 1
        };
        layers.value.push(layer);
      } catch (err) {
        alert('Error parsing ' + name + ': ' + err.message);
      }
    }
    if (layers.value.length > 0) {
      selectLayer(layers.value.length - 1);
    }
    renderLayerPanel();
    if (tckFile.value) tckFile.value.value = '';
  })();
}

function onControlModeChange() {
  sliderValue.value = Math.round(currentRatio.value * 100);
  if (tractCountInput.value) {
    tractCountInput.value.value = currentCount.value;
  }
  const layer = layers.value[selectedLayerIndex.value];
  updateCountInputMax(layer);
  renderTractsByControl();
}

function onSliderInput() {
  currentRatio.value = sliderValue.value / 100;
  if (layers.value[selectedLayerIndex.value]) layers.value[selectedLayerIndex.value].ratio = currentRatio.value;
  updateSliderLabel();
  if (controlMode.value === 'ratio') {
    renderTractsByControl();
  }
}
function onCountInput(e) {
  let val = parseInt(e.target.value, 10) || 1;
  val = Math.max(1, Math.min(val, maxCount.value));
  currentCount.value = val;
  if (layers.value[selectedLayerIndex.value]) layers.value[selectedLayerIndex.value].count = val;
  if (tractCountInput.value) tractCountInput.value.value = val;
  if (controlMode.value === 'count') {
    renderTractsByControl();
  }
}

function onFoldBtnClick() {
  isFolded.value = !isFolded.value;
}

// --- 属性上传相关 ---
function toggleAttrUpload() {
  attrUploadOpen.value = !attrUploadOpen.value;
  attrUploadError.value = '';
  attrUploadSuccess.value = '';
  attrName.value = '';
  if (attrFileInput.value) attrFileInput.value.value = '';
}
function onAttrUpload() {
  attrUploadError.value = '';
  attrUploadSuccess.value = '';
  if (!currentLayer.value) {
    attrUploadError.value = 'Please select a TCK layer.';
    return;
  }
  const tracts = currentLayer.value.tracts;
  if (!tracts || !tracts.length) {
    attrUploadError.value = 'No tracts loaded.';
    return;
  }
  const fileDom = attrFileInput.value;
  if (!fileDom.files[0]) {
    attrUploadError.value = 'Please select a .txt file.';
    return;
  }
  if (!attrName.value.trim()) {
    attrUploadError.value = 'Attribute name required.';
    return;
  }
  const file = fileDom.files[0];
  if (!file.name.endsWith('.txt')) {
    attrUploadError.value = 'Only .txt files supported.';
    return;
  }
  const fr = new FileReader();
  fr.onload = (e) => {
    const lines = e.target.result.split(/\r?\n/).filter(line => line.trim().length > 0 && !line.trim().startsWith('#'));
    if (lines.length !== tracts.length) {
      attrUploadError.value = `File has ${lines.length} lines, but ${tracts.length} tracts loaded.`;
      return;
    }
    let attributes = [];
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].split('#')[0].trim();
      if (line === "") line = " ";
      let vals = line.split(/\s+/).map(Number);
      if (vals.length !== tracts[i].length) {
        attrUploadError.value = `Line ${i+1} has ${vals.length} values, but tract #${i+1} has ${tracts[i].length} points.`;
        return;
      }
      attributes.push(vals);
    }
    setAttributes(attrName.value.trim(), attributes);
    currentAttrName.value = attrName.value.trim();
    attrUploadSuccess.value = `Attribute "${attrName.value.trim()}" loaded!`;
    attrUploadOpen.value = false;
    attrName.value = '';
    if (tractList.value) {
      // 重新渲染列表以便 tractDetails 联动
      renderTractsByControl();
    }
  };
  fr.onerror = () => {
    attrUploadError.value = 'Error reading .txt file.';
  };
  fr.readAsText(file);
}

// 属性切换
function onAttrSwitch() {
  renderTractsByControl();
}

function renderTractsByControl() {
  if (selectedLayerIndex.value < 0) {
    clearTractList();
    return;
  }
  const layer = layers.value[selectedLayerIndex.value];
  if (!layer) return;
  if (controlMode.value === 'ratio') {
    loadTractList(layer.tracts, currentRatio.value, undefined, layer.color, selectedLayerIndex.value,
      { attribute: currentAttrName.value });
  } else {
    loadTractList(layer.tracts, undefined, currentCount.value, layer.color, selectedLayerIndex.value,
      { attribute: currentAttrName.value });
  }
}

// 监听属性变化，切换时刷新详情
watch(currentAttrName, () => {
  renderTractsByControl();
});

// 当切换 layer、ratio/count、tract 数量上限变动时，动态限制 currentCount
watch(maxCount, (val) => {
  if (currentCount.value > val) currentCount.value = val;
  if (tractCountInput.value) tractCountInput.value.value = currentCount.value;
})

onMounted(async () => {
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
  setupListUI({
    tractList,
    tractCount,
    foldBtn,
    tractDetails,
    showTractDetails: (index, tract) => {
      // 属性高亮显示
      showTractDetails(index, tract, {
        attribute: currentAttrName.value,
        getAttrForTract
      });
    }
  });
  updateSliderLabel();
  isFolded.value = true;
  await nextTick();
  import('./three/scene.js').then(mod => {
    mod.initCanvas(threeCanvas.value);
    animate();
    window._fibervis_three_ready = true;
  });
});
</script>

<style src="./styles.css"></style>