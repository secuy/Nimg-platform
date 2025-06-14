// src/components/FiberVis/ui/details.js

import { getElement } from './elements.js';

export function showTractDetails(index, tract, opts = {}) {
  const tractDetails = getElement('tractDetails');
  if (!tractDetails) return;
  tractDetails.innerHTML = '';
  const title = document.createElement('div');
  title.innerHTML = `<b>Tract #${index+1} Details</b>`;
  tractDetails.appendChild(title);
  const info = document.createElement('div');
  info.textContent = `Number of points: ${tract.length}`;
  tractDetails.appendChild(info);

  // Show first 50 points for brevity
  const maxPoints = Math.min(tract.length, 50);
  const table = document.createElement('table');
  table.style.fontSize = '0.92em';

  let head = `<tr><th>#</th><th>X</th><th>Y</th><th>Z</th>`;
  let attrCol = false;
  let attrVals = null;
  if (opts && opts.attribute && typeof opts.getAttrForTract === 'function') {
    attrVals = opts.getAttrForTract(opts.attribute, index);
    if (attrVals) {
      head += `<th>${opts.attribute}</th>`;
      attrCol = true;
    }
  }
  head += `</tr>`;
  table.innerHTML = head;
  for (let i=0; i<maxPoints; i++) {
    const [x,y,z] = tract[i];
    let row = `<td>${i + 1}</td>
        <td>${x.toFixed(2)}</td>
        <td>${y.toFixed(2)}</td>
        <td>${z.toFixed(2)}</td>`;
    if (attrCol) {
      row += `<td>${attrVals && typeof attrVals[i] !== 'undefined' ? attrVals[i] : ''}</td>`;
    }
    const tr = document.createElement('tr');
    tr.innerHTML = row;
    table.appendChild(tr);
  }
  tractDetails.appendChild(table);
  if (tract.length > 50) {
    const note = document.createElement('div');
    note.style.fontSize = '0.86em';
    note.style.color = '#888';
    note.textContent = `Only first 50 of ${tract.length} points shown.`;
    tractDetails.appendChild(note);
  }
}