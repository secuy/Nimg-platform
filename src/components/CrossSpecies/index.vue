<template>
  <div class="three-world">
    <h1>{{ msg }}</h1>
    <div class="canvas-container">
      <!-- 左侧画布 -->
      <div class="canvas-section">
        <div id="three-container-left" ref="threeContainerLeft" class="three-container"></div>
        <div class="control-panel">
          <div class="view-controls">
            <div class="control-group">
              <button @click="resetViewLeft">重置视图</button>
              <button @click="toggleViewModeLeft" :class="{ active: viewModeLeft === 'inspect' }">
                {{ viewModeLeft === 'browse' ? '检查模式' : '浏览模式' }}
              </button>
              <button @click="surfaceCheckLeft" :disabled="!(hasSurfaceLeft && hasLabelsLeft)" :class="{ active: surfaceCheckTagLeft }">
                {{ surfaceCheckTagLeft ? '取消' : '皮层对齐' }}
              </button>
            </div>
            <div class="control-group">
              <button @click="showCorrespondingFibersLeft" :disabled="!surfaceCheckTagLeft" :class="{ active: isShowingFibersLeft }">皮层对应纤维</button>
            </div>
            <div class="opacity-control">
              <label>皮层透明度</label>
              <input type="range" v-model="opacityLeft" min="0" max="1" step="0.01" @input="updateOpacityLeft">
            </div>
            <div v-if="viewModeLeft === 'inspect' && vertexInfoLeft" class="vertex-info">
              <h3>顶点信息</h3>
              <p>索引: {{ vertexInfoLeft.index }}</p>
              <p>位置: X: {{ vertexInfoLeft.position.x }}, Y: {{ vertexInfoLeft.position.y }}, Z: {{ vertexInfoLeft.position.z }}</p>
              <p v-if="vertexInfoLeft.label !== undefined">标签: {{ vertexInfoLeft.label }}</p>
              <p v-if="vertexInfoLeft.color">颜色: R: {{ vertexInfoLeft.color.r }}, G: {{ vertexInfoLeft.color.g }}, B: {{ vertexInfoLeft.color.b }}</p>
            </div>
            <div v-if="surfaceCheckTagLeft && vertexInfoLeft" class="vertex-info">
              <h3>顶点信息</h3>
              <p>索引: {{ vertexInfoLeft.index }}</p>
              <p>位置: X: {{ vertexInfoLeft.position.x }}, Y: {{ vertexInfoLeft.position.y }}, Z: {{ vertexInfoLeft.position.z }}</p>
              <p v-if="vertexInfoLeft.label !== undefined">标签: {{ vertexInfoLeft.label }}</p>
              <p v-if="vertexInfoLeft.color">颜色: R: {{ vertexInfoLeft.color.r }}, G: {{ vertexInfoLeft.color.g }}, B: {{ vertexInfoLeft.color.b }}</p>
            </div>
          </div>
          <div class="file-upload">
            <div class="upload-group">
              <div class="title-row">
                <label>表面文件(.surf.gii)</label>
                <button @click="discardSurfaceLeft" :disabled="!hasSurfaceLeft">丢弃皮层</button>
              </div>
              <div class="select-row">
                <select v-model="selectedSurfLeft" @input="handleSurfSelectLeft"> 
                  <option value="">请选择文件</option>
                  <option v-for="surfSysName in surfSysNames" :key="surfSysName" :value="surfSysName">
                    {{ surfSysName }}
                  </option>
                </select>
              </div>
              <div class="file-row">
                <input type="file" @change="handleSurfaceUploadLeft" accept=".surf.gii" class="inputFileLabel" ref="surfInputLeft"/>
              </div>
            </div>
            <div class="upload-group">
              <div class="title-row">
                <label>标签文件(.label.gii)</label>
                <button @click="discardLabelsLeft" :disabled="!hasLabelsLeft">丢弃标签</button>
              </div>
              <div class="select-row">
                <select v-model="selectedParcLeft" @input="handleParcSelectLeft"> 
                  <option value="">请选择文件</option>
                  <option v-for="parcSysName in parcSysNames" :key="parcSysName" :value="parcSysName">
                    {{ parcSysName }}
                  </option>
                </select>
              </div>
              <div class="file-row">
                <input type="file" @change="handleLabelUploadLeft" accept=".label.gii" class="inputFileLabel" ref="labelInputLeft"/>
              </div>
            </div>
            <div class="upload-group">
              <div class="title-row">
                <label>纤维文件(.tck)</label>
                <button @click="clearFibersLeft" :disabled="!hasFibersLeft">清空纤维</button>
              </div>
              <input type="file" @change="handleTCKUploadLeft" accept=".tck" multiple class="inputFileLabel" ref="tckInputLeft"/>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧画布 -->
      <div class="canvas-section">
        <div id="three-container-right" ref="threeContainerRight" class="three-container"></div>
        <div class="control-panel">
          <div class="view-controls">
            <div class="control-group">
              <button @click="resetViewRight">重置视图</button>
              <button @click="toggleViewModeRight" :class="{ active: viewModeRight === 'inspect' }">
                {{ viewModeRight === 'browse' ? '检查模式' : '浏览模式' }}
              </button>
              <button @click="surfaceCheckRight" :disabled="!(hasSurfaceRight && hasLabelsRight)" :class="{ active: surfaceCheckTagRight }">
                {{ surfaceCheckTagRight ? '取消' : '皮层对齐' }}
              </button>
            </div>
            <div class="control-group">
              <button @click="showCorrespondingFibersRight" :disabled="!surfaceCheckTagRight" :class="{ active: isShowingFibersRight }">皮层对应纤维</button>
            </div>
            <div class="opacity-control">
              <label>皮层透明度</label>
              <input type="range" v-model="opacityRight" min="0" max="1" step="0.01" @input="updateOpacityRight">
            </div>
            <div v-if="viewModeRight === 'inspect' && vertexInfoRight" class="vertex-info">
              <h3>顶点信息</h3>
              <p>索引: {{ vertexInfoRight.index }}</p>
              <p>位置: X: {{ vertexInfoRight.position.x }}, Y: {{ vertexInfoRight.position.y }}, Z: {{ vertexInfoRight.position.z }}</p>
              <p v-if="vertexInfoRight.label !== undefined">标签: {{ vertexInfoRight.label }}</p>
              <p v-if="vertexInfoRight.color">颜色: R: {{ vertexInfoRight.color.r }}, G: {{ vertexInfoRight.color.g }}, B: {{ vertexInfoRight.color.b }}</p>
            </div>
            <div v-if="surfaceCheckTagRight && vertexInfoRight" class="vertex-info">
              <h3>顶点信息</h3>
              <p>索引: {{ vertexInfoRight.index }}</p>
              <p>位置: X: {{ vertexInfoRight.position.x }}, Y: {{ vertexInfoRight.position.y }}, Z: {{ vertexInfoRight.position.z }}</p>
              <p v-if="vertexInfoRight.label !== undefined">标签: {{ vertexInfoRight.label }}</p>
              <p v-if="vertexInfoRight.color">颜色: R: {{ vertexInfoRight.color.r }}, G: {{ vertexInfoRight.color.g }}, B: {{ vertexInfoRight.color.b }}</p>
            </div>
          </div>
          <div class="file-upload">
            <div class="upload-group">
              <div class="title-row">
                <label>表面文件(.surf.gii)</label>
                <button @click="discardSurfaceRight" :disabled="!hasSurfaceRight">丢弃皮层</button>
              </div>
              <div class="select-row">
                <select v-model="selectedSurfRight" @input="handleSurfSelectRight"> 
                  <option value="">请选择文件</option>
                  <option v-for="surfSysName in surfSysNames" :key="surfSysName" :value="surfSysName">
                    {{ surfSysName }}
                  </option>
                </select>
              </div>
              <div class="file-row">
                <input type="file" @change="handleSurfaceUploadRight" accept=".surf.gii" class="inputFileLabel" ref="surfInputRight"/>
              </div>
            </div>
            <div class="upload-group">
              <div class="title-row">
                <label>标签文件(.label.gii)</label>
                <button @click="discardLabelsRight" :disabled="!hasLabelsRight">丢弃标签</button>
              </div>
              <div class="select-row">
                <select v-model="selectedParcRight" @input="handleParcSelectRight"> 
                  <option value="">请选择文件</option>
                  <option v-for="parcSysName in parcSysNames" :key="parcSysName" :value="parcSysName">
                    {{ parcSysName }}
                  </option>
                </select>
              </div>
              <div class="file-row">
                <input type="file" @change="handleLabelUploadRight" accept=".label.gii" class="inputFileLabel" ref="labelInputRight"/>
              </div>
            </div>
            <div class="upload-group">
              <div class="title-row">
                <label>纤维文件(.tck)</label>
                <button @click="clearFibersRight" :disabled="!hasFibersRight">清空纤维</button>
              </div>
              <input type="file" @change="handleTCKUploadRight" accept=".tck" multiple class="inputFileLabel" ref="tckInputRight"/>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive, nextTick, onMounted, onBeforeUnmount } from 'vue';
import { useCrossSpecies } from './CrossSpecies';
import './styles.css';

export default {
  name: 'CrossSpecies',
  props: {
    msg: String
  },
  setup() {
    const threeContainerLeft = ref(null);
    const threeContainerRight = ref(null);

    const sharedState = reactive({
      left: null,   // 占位，稍后赋值
      right: null   // 占位，稍后赋值
    });

    const leftWorld = useCrossSpecies(threeContainerLeft, sharedState, 'left');
    const rightWorld = useCrossSpecies(threeContainerRight, sharedState, 'right');

    // 添加下拉框的响应式数据
    const selectedSurfLeft = ref('');
    const selectedParcLeft = ref('');
    const selectedSurfRight = ref('');
    const selectedParcRight = ref('');

    // 添加事件监听器
    onMounted(() => {
      window.addEventListener('reset-surface-select', (event) => {
        if (event.detail.side === 'left') {
          selectedSurfLeft.value = '';
        } else {
          selectedSurfRight.value = '';
        }
      });

      window.addEventListener('reset-label-select', (event) => {
        if (event.detail.side === 'left') {
          selectedParcLeft.value = '';
        } else {
          selectedParcRight.value = '';
        }
      });
    });

    onBeforeUnmount(() => {
      window.removeEventListener('reset-surface-select', () => {});
      window.removeEventListener('reset-label-select', () => {});
    });

    nextTick(() => {
      sharedState.left = leftWorld;
      sharedState.right = rightWorld;
    });

    // 添加处理函数
    const handleSurfSelectLeft = async (event) => {
      const filename = event.target.value;
      if (filename) {
        await leftWorld.loadGIFTIFileFromServer(filename);
      }
    };

    const handleParcSelectLeft = async (event) => {
      const filename = event.target.value;
      if (filename) {
        await leftWorld.loadLabelGIFTIFileFromServer(filename);
      }
    };

    const handleSurfSelectRight = async (event) => {
      const filename = event.target.value;
      if (filename) {
        await rightWorld.loadGIFTIFileFromServer(filename);
      }
    };

    const handleParcSelectRight = async (event) => {
      const filename = event.target.value;
      if (filename) {
        await rightWorld.loadLabelGIFTIFileFromServer(filename);
      }
    };

    return {
      threeContainerLeft,
      threeContainerRight,
      
      // 公共
      surfSysNames: leftWorld.surfSysNames,
      parcSysNames: leftWorld.parcSysNames,
      
      // 左侧画布
      opacityLeft: leftWorld.opacity,
      hasSurfaceLeft: leftWorld.hasSurface,
      hasLabelsLeft: leftWorld.hasLabels,
      hasFibersLeft: leftWorld.hasFibers,
      surfInputLeft: leftWorld.surfInput,
      labelInputLeft: leftWorld.labelInput,
      tckInputLeft: leftWorld.tckInput,
      viewModeLeft: leftWorld.viewMode,
      surfaceCheckTagLeft: leftWorld.surfaceCheckTag,
      vertexInfoLeft: leftWorld.vertexInfo,
      isShowingFibersLeft: leftWorld.isShowingFibers,
      
      handleSurfaceUploadLeft: leftWorld.handleSurfaceUpload,
      handleLabelUploadLeft: leftWorld.handleLabelUpload,
      handleTCKUploadLeft: leftWorld.handleTCKUpload,
      discardSurfaceLeft: leftWorld.discardSurface,
      discardLabelsLeft: leftWorld.discardLabels,
      clearFibersLeft: leftWorld.clearFibers,
      resetViewLeft: leftWorld.resetView,
      updateOpacityLeft: leftWorld.updateOpacity,
      toggleViewModeLeft: leftWorld.toggleViewMode,
      surfaceCheckLeft: leftWorld.surfaceCheck,
      showCorrespondingFibersLeft: leftWorld.showCorrespondingFibers,
      // 右侧画布
      opacityRight: rightWorld.opacity,
      hasSurfaceRight: rightWorld.hasSurface,
      hasLabelsRight: rightWorld.hasLabels,
      hasFibersRight: rightWorld.hasFibers,
      surfInputRight: rightWorld.surfInput,
      labelInputRight: rightWorld.labelInput,
      tckInputRight: rightWorld.tckInput,
      viewModeRight: rightWorld.viewMode,
      surfaceCheckTagRight: rightWorld.surfaceCheckTag,
      vertexInfoRight: rightWorld.vertexInfo,
      isShowingFibersRight: rightWorld.isShowingFibers,
      handleSurfaceUploadRight: rightWorld.handleSurfaceUpload,
      handleLabelUploadRight: rightWorld.handleLabelUpload,
      handleTCKUploadRight: rightWorld.handleTCKUpload,
      discardSurfaceRight: rightWorld.discardSurface,
      discardLabelsRight: rightWorld.discardLabels,
      clearFibersRight: rightWorld.clearFibers,
      resetViewRight: rightWorld.resetView,
      updateOpacityRight: rightWorld.updateOpacity,
      toggleViewModeRight: rightWorld.toggleViewMode,
      surfaceCheckRight: rightWorld.surfaceCheck,
      showCorrespondingFibersRight: rightWorld.showCorrespondingFibers,
      // 添加下拉框的数据
      selectedSurfLeft,
      selectedParcLeft,
      selectedSurfRight,
      selectedParcRight,
      handleSurfSelectLeft,
      handleParcSelectLeft,
      handleSurfSelectRight,
      handleParcSelectRight
    };
  }
}
</script>