// src/components/FiberVis/ui/elements.js

let elements = {};

export function initElements(refs) {
  elements = refs;
}

export function getElement(name) {
  return elements[name]?.value || null;
}