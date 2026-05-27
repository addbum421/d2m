/**
 * layers.js — 레이어 스택 관리
 */

let _layers = [];
let _activeLayerIndex = 0;
let _width = 30;
let _height = 20;

function emptyTiles() {
  return new Array(_width * _height).fill(null);
}

export const Layers = {
  init(width, height, layersData = null) {
    _width = width;
    _height = height;
    if (layersData) {
      _layers = layersData;
    } else {
      _layers = [{
        id: 'layer_0',
        name: '레이어 1',
        visible: true,
        locked: false,
        tiles: emptyTiles(),
        icons: [],
      }];
    }
    _activeLayerIndex = 0;
  },

  getAll() { return _layers; },
  getActive() { return _layers[_activeLayerIndex]; },
  getActiveIndex() { return _activeLayerIndex; },
  setActiveIndex(i) { _activeLayerIndex = Math.max(0, Math.min(i, _layers.length - 1)); },

  add(name = null) {
    const idx = _layers.length;
    _layers.push({
      id: `layer_${Date.now()}`,
      name: name ?? `레이어 ${idx + 1}`,
      visible: true,
      locked: false,
      tiles: emptyTiles(),
      icons: [],
    });
    _activeLayerIndex = _layers.length - 1;
  },

  remove(index) {
    if (_layers.length <= 1) return; // 최소 1개 유지
    _layers.splice(index, 1);
    _activeLayerIndex = Math.max(0, Math.min(_activeLayerIndex, _layers.length - 1));
  },

  /**
   * 드래그로 레이어 순서 변경
   * active 레이어가 이동 대상이면 따라서 업데이트
   */
  reorder(fromIndex, toIndex) {
    if (fromIndex === toIndex) return;
    if (fromIndex < 0 || fromIndex >= _layers.length) return;
    if (toIndex   < 0 || toIndex   >= _layers.length) return;

    const [moved] = _layers.splice(fromIndex, 1);
    _layers.splice(toIndex, 0, moved);

    // active 인덱스 보정
    if (_activeLayerIndex === fromIndex) {
      _activeLayerIndex = toIndex;
    } else if (fromIndex < _activeLayerIndex && toIndex >= _activeLayerIndex) {
      _activeLayerIndex--;
    } else if (fromIndex > _activeLayerIndex && toIndex <= _activeLayerIndex) {
      _activeLayerIndex++;
    }
  },

  /** active 를 한 칸 위(index-1)로 이동 */
  moveActiveUp() {
    const i = _activeLayerIndex;
    if (i <= 0) return false;
    Layers.reorder(i, i - 1);
    return true;
  },

  /** active 를 한 칸 아래(index+1)로 이동 */
  moveActiveDown() {
    const i = _activeLayerIndex;
    if (i >= _layers.length - 1) return false;
    Layers.reorder(i, i + 1);
    return true;
  },

  toggleVisible(index) {
    _layers[index].visible = !_layers[index].visible;
  },

  toggleLocked(index) {
    _layers[index].locked = !_layers[index].locked;
  },

  setTile(x, y, tileId) {
    const layer = Layers.getActive();
    if (layer.locked) return;
    layer.tiles[y * _width + x] = tileId;
  },

  getTile(layerIndex, x, y) {
    return _layers[layerIndex].tiles[y * _width + x];
  },

  /**
   * 아이콘 추가 — x, y 는 타일 단위 float (타일 그리드 비종속)
   * 예: x=2.37, y=5.91 → 맵 위 자유 위치
   */
  addIcon(x, y, iconType) {
    const layer = Layers.getActive();
    if (layer.locked) return false;
    layer.icons.push({ type: iconType, x, y });
    return true;
  },

  /**
   * 인덱스로 아이콘 직접 삭제
   */
  removeIcon(layerIndex, iconIndex) {
    const layer = _layers[layerIndex];
    if (!layer) return;
    layer.icons.splice(iconIndex, 1);
  },

  /**
   * 특정 float 좌표 근처의 아이콘 검색 (모든 visible 레이어 대상)
   * @returns {{ layerIndex, iconIndex, icon } | null}
   */
  findIconAt(x, y, radius = 0.55) {
    // 위쪽 레이어부터 탐색 (렌더링 역순)
    for (let li = _layers.length - 1; li >= 0; li--) {
      const layer = _layers[li];
      if (!layer.visible) continue;
      for (let ii = layer.icons.length - 1; ii >= 0; ii--) {
        const icon = layer.icons[ii];
        if (Math.hypot(icon.x - x, icon.y - y) < radius) {
          return { layerIndex: li, iconIndex: ii, icon };
        }
      }
    }
    return null;
  },

  toJSON() {
    return _layers.map(l => ({
      ...l,
      tiles: [...l.tiles],
      icons: l.icons.map(i => ({ ...i })),
    }));
  },
};
