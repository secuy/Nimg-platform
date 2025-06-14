// src/components/FiberVis/ui/attributes.js

// attributeStore: { attrName: [ [vals for tract0], [tract1], ... ] }
const attrStore = {};

export function setAttributes(attrName, attrArr) {
  attrStore[attrName] = attrArr;
}

export function getAttrNames() {
  return Object.keys(attrStore);
}

export function getAttrForTract(attrName, tractIdx) {
  if (!attrStore[attrName]) return null;
  return attrStore[attrName][tractIdx] || null;
}

export function clearAttributes() {
  for (const k of Object.keys(attrStore)) delete attrStore[k];
}