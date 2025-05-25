import * as THREE from 'three';
import { scene } from './scene.js';

// tractLinesPerLayer: [[THREE.Line, ...], ...]
export let tractLinesPerLayer = [];

export function clearLayerTractLines(layerIdx) {
    if (typeof layerIdx === 'number') {
        if (tractLinesPerLayer[layerIdx]) {
            for (const line of tractLinesPerLayer[layerIdx]) scene.remove(line);
            tractLinesPerLayer[layerIdx] = [];
        }
        return;
    }
    tractLinesPerLayer.forEach(lines => lines.forEach(line => scene.remove(line)));
    tractLinesPerLayer = [];
}

/**
 * Add tracts for a layer. Returns array of THREE.Line objects.
 * Removes previous tracts for this layer.
 */
export function addTractsToScene(tracts, color = 0x00ffe5, layerIdx = 0) {
    if (!scene) {
        console.error('Three.js scene is not initialized!');
        return [];
    }
    if (!tractLinesPerLayer[layerIdx])
        tractLinesPerLayer[layerIdx] = [];
    // Remove previous
    for (const line of tractLinesPerLayer[layerIdx])
        scene.remove(line);
    tractLinesPerLayer[layerIdx] = [];

    const lines = [];
    for (const tract of tracts) {
        const points = tract.map(([x, y, z]) => new THREE.Vector3(x, y, z));
        const geom = new THREE.BufferGeometry().setFromPoints(points);
        const mat = new THREE.LineBasicMaterial({ color, linewidth:2 });
        const line = new THREE.Line(geom, mat);
        scene.add(line);
        lines.push(line);
    }
    tractLinesPerLayer[layerIdx] = lines;
    return lines;
}

export function highlightTract(index, layerIdx = 0) {
    (tractLinesPerLayer[layerIdx] || []).forEach((line, i) => {
        if (i === index) {
            line.material.color.set(0xffe600);
            line.material.linewidth = 4;
        } else {
            line.material.color.set(line.material.color.getHex());
            line.material.linewidth = 2;
        }
        line.material.needsUpdate = true;
    });
}

export function hideTractLines(layerIdx) {
    (tractLinesPerLayer[layerIdx] || []).forEach(line => line.visible = false);
}

export function showTractLines(layerIdx) {
    (tractLinesPerLayer[layerIdx] || []).forEach(line => line.visible = true);
}