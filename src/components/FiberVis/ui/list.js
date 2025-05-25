// src/components/FiberVis/ui/list.js

// import { getElement } from './elements.js';
import { addTractsToScene, highlightTract } from '../three/tracts.js';
import { showTractDetails } from './details.js';

let loadedTracts = [];
let isFolded = true;
let renderedIndices = [];
let currentLayerIndex = 0;

let ui = {};

export function setupListUI(refs) {
  ui = {
    tractList: refs.tractList.value,
    tractCount: refs.tractCount.value,
    foldBtn: refs.foldBtn.value,
    tractDetails: refs.tractDetails.value
  };
  if (ui.foldBtn) {
    ui.foldBtn.addEventListener('click', () => {
      setFolded(!isFolded);
    });
  }
}

export function setFolded(fold) {
  isFolded = fold;
  if (!ui.tractList || !ui.foldBtn) return;
  ui.tractList.classList.toggle('hidden', isFolded);
  ui.foldBtn.textContent = isFolded ? "Show list" : "Hide list";
}

export function loadTractList(tracts, ratio = 0.1, count = undefined, color = 0x00ffe5, layerIndex = 0) {
  loadedTracts = tracts;
  currentLayerIndex = layerIndex;
  if (!ui.tractList || !ui.tractCount) return;
  ui.tractList.innerHTML = '';
  ui.tractCount.textContent = `(${tracts.length})`;

  const total = tracts.length;
  let showCount = 1;
  if (typeof count === 'number' && !isNaN(count)) {
    showCount = Math.max(1, Math.min(count, total));
  } else {
    showCount = Math.max(1, Math.round(total * ratio));
  }
  renderedIndices = Array.from({length: showCount}, (_,i) => i);

  renderedIndices.forEach(i => {
    const tract = tracts[i];
    const div = document.createElement('div');
    div.textContent = `Tract #${i+1} (${tract.length} pts)`;
    div.onclick = () => selectTract(i);
    ui.tractList.appendChild(div);
  });
  const threeObjects = addTractsToScene(renderedIndices.map(i => tracts[i]), color, layerIndex);
  if (window.layers) window.layers[layerIndex].threeObjects = threeObjects;
  selectTract(renderedIndices[0] ?? 0);
}

export function clearTractList() {
  if (!ui.tractList || !ui.tractCount) return;
  ui.tractList.innerHTML = '';
  ui.tractCount.textContent = '';
  loadedTracts = [];
  renderedIndices = [];
}

function selectTract(idx) {
  const localIdx = renderedIndices.indexOf(idx);
  if (!ui.tractList) return;
  [...ui.tractList.children].forEach((div, i) => {
    div.classList.toggle('selected', i === localIdx);
  });
  highlightTract(localIdx, currentLayerIndex);
  if (loadedTracts[idx]) {
    showTractDetails(idx, loadedTracts[idx]);
  }
}