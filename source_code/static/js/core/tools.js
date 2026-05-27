/**
 * tools.js — 타일 편집 도구 (브러시, 지우개, 채우기)
 *
 * 아이콘 배치/선택/삭제는 canvas.js 가 직접 처리 (float 좌표 필요).
 * ICON 은 도구 모드 식별자로만 사용.
 */

import { Layers } from './layers.js';

export const TOOLS = {
  BRUSH:  'brush',
  ERASER: 'eraser',
  FILL:   'fill',
  ICON:   'icon',   // 아이콘 배치 모드 (실제 로직은 canvas.js)
};

let _currentTool = TOOLS.BRUSH;
let _selectedTile = 0;    // 타일 id
let _selectedIcon = null; // 아이콘 id ('skull' 등)
let _mapWidth = 30;
let _mapHeight = 20;

export const Tools = {
  init(width, height) {
    _mapWidth = width;
    _mapHeight = height;
  },

  setCurrent(tool) { _currentTool = tool; },
  getCurrent() { return _currentTool; },
  setSelectedTile(id) { _selectedTile = id; },
  getSelectedTile() { return _selectedTile; },
  setSelectedIcon(id) { _selectedIcon = id; },
  getSelectedIcon() { return _selectedIcon; },

  /** 타일 도구 적용 (정수 그리드 좌표) — ICON 모드일 때는 no-op */
  applyAt(x, y) {
    if (x < 0 || x >= _mapWidth || y < 0 || y >= _mapHeight) return;

    switch (_currentTool) {
      case TOOLS.BRUSH:
        Layers.setTile(x, y, _selectedTile);
        break;
      case TOOLS.ERASER:
        Layers.setTile(x, y, null);
        break;
      case TOOLS.FILL:
        Tools._fill(x, y, _selectedTile);
        break;
      // ICON: canvas.js 의 _onMouseDown 에서 처리
    }
  },

  /** 버킷 채우기 (BFS) */
  _fill(startX, startY, newTileId) {
    const layer = Layers.getActive();
    const tiles = layer.tiles;
    const targetId = tiles[startY * _mapWidth + startX];
    if (targetId === newTileId) return;

    const queue = [[startX, startY]];
    const visited = new Set();

    while (queue.length) {
      const [x, y] = queue.shift();
      const key = y * _mapWidth + x;
      if (visited.has(key)) continue;
      if (x < 0 || x >= _mapWidth || y < 0 || y >= _mapHeight) continue;
      if (tiles[key] !== targetId) continue;

      visited.add(key);
      tiles[key] = newTileId;
      queue.push([x+1, y], [x-1, y], [x, y+1], [x, y-1]);
    }
  },
};
