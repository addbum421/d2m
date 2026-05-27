/**
 * canvas.js — Canvas 렌더링 엔진
 *
 * 좌표계:
 *   - 맵 공간: float (0.0 ~ mapWidth, 0.0 ~ mapHeight) — 타일 단위
 *   - 화면 공간: offsetX/offsetY + scale 변환 적용
 *
 * 타일: 정수 그리드에 스냅
 * 아이콘: float 맵 좌표에 자유 배치
 *
 * 아이콘 인터랙션:
 *   - 클릭으로 선택 (하이라이트 링 표시)
 *   - Delete / Backspace 로 삭제
 *   - 빈 공간 클릭 or Escape 로 선택 해제
 */

import { TILE_BY_ID } from '../config/tiles.js';
import { ICON_TYPES } from '../config/icons.js';
import { Layers } from './layers.js';
import { Tools, TOOLS } from './tools.js';

// ── 아이콘 이미지 사전 로딩 ────────────────────────
// icons.js 에서 image 필드가 null 이 아닌 타입만 로드.
// image 를 경로로 바꾸면 자동으로 여기서 캐싱됨.
const _imgCache = {};
(function preloadIconImages() {
  for (const def of Object.values(ICON_TYPES)) {
    if (!def.image) continue;
    const img = new Image();
    img.src = def.image;
    _imgCache[def.id] = img;
  }
})();
import { getBitmask, getWallColor, isAutotile } from './autotile.js';

export class CanvasRenderer {
  /**
   * @param {HTMLCanvasElement} canvasEl
   * @param {{ width: number, height: number, tileSize: number }} mapMeta
   */
  constructor(canvasEl, mapMeta) {
    this.canvas = canvasEl;
    this.ctx = canvasEl.getContext('2d');
    this.mapWidth  = mapMeta.width;
    this.mapHeight = mapMeta.height;
    this.tileSize  = mapMeta.tileSize;

    // 뷰 변환
    this.scale   = 1.0;
    this.offsetX = 0;
    this.offsetY = 0;

    // 드래그/패닝 상태
    this._isPainting = false;
    this._isPanning  = false;
    this._lastPanX   = 0;
    this._lastPanY   = 0;

    // 아이콘 선택 상태
    // { layerIndex: number, iconIndex: number } | null
    this._selectedIcon = null;

    // 아이콘 드래그 이동 상태
    this._draggingIcon    = null;   // { layerIndex, iconIndex }
    this._dragMoved       = false;  // 임계값 초과 여부
    this._dragStartClient = { x: 0, y: 0 };
    this._lastWasDrag     = false;  // mouseup 후 외부에서 쿼리용

    this._onChangeCallback = null;

    this._bindEvents();
    this._resizeObserver = new ResizeObserver(() => this._fitCanvas());
    this._resizeObserver.observe(canvasEl.parentElement);
    this._fitCanvas();
  }

  /** 맵 변경 콜백 (자동저장 트리거용) */
  onMapChange(cb) { this._onChangeCallback = cb; }

  // ── 선택 아이콘 외부 접근 ─────────────────────────
  getSelectedIcon() { return this._selectedIcon; }

  /** 마지막 마우스업이 드래그였는지 (레이블 포커스 판단용) */
  wasLastDrag() { return this._lastWasDrag; }

  clearSelection() {
    this._selectedIcon = null;
    this.render();
  }

  deleteSelectedIcon() {
    if (!this._selectedIcon) return;
    const { layerIndex, iconIndex } = this._selectedIcon;
    Layers.removeIcon(layerIndex, iconIndex);
    this._selectedIcon = null;
    this.render();
    if (this._onChangeCallback) this._onChangeCallback();
  }

  // ── 렌더링 ──────────────────────────────────────────

  render() {
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(this.offsetX, this.offsetY);
    ctx.scale(this.scale, this.scale);

    this._drawBackground();

    for (let li = 0; li < Layers.getAll().length; li++) {
      const layer = Layers.getAll()[li];
      if (!layer.visible) continue;
      this._drawTileLayer(layer);
      this._drawIconLayer(layer, li);
    }

    this._drawGrid();
    this._drawMapBorder();
    ctx.restore();
  }

  _drawBackground() {
    const { ctx, mapWidth, mapHeight, tileSize } = this;
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, mapWidth * tileSize, mapHeight * tileSize);
  }

  _drawTileLayer(layer) {
    const { ctx, mapWidth, mapHeight, tileSize } = this;
    const tiles = layer.tiles;

    for (let y = 0; y < mapHeight; y++) {
      for (let x = 0; x < mapWidth; x++) {
        const tileId = tiles[y * mapWidth + x];
        if (tileId === null || tileId === undefined) continue;
        const tileDef = TILE_BY_ID[tileId];
        if (!tileDef) continue;

        const px = x * tileSize;
        const py = y * tileSize;

        let color = tileDef.color;
        if (isAutotile(tileId)) {
          const mask = getBitmask(tiles, x, y, mapWidth, mapHeight, tileId);
          color = getWallColor(mask);
        }

        // 볼록 코너 라운드 계산
        const r = (tileDef.cornerRadius ?? 0) * tileSize;
        const radii = r > 0
          ? this._getCornerRadii(tiles, x, y, tileId, r)
          : { tl: 0, tr: 0, br: 0, bl: 0 };
        const hasRound = radii.tl || radii.tr || radii.br || radii.bl;

        ctx.save();

        // 면(fill) — 라운드 있으면 rounded path, 없으면 fillRect
        if (hasRound) {
          this._buildRoundedPath(ctx, px, py, tileSize, tileSize, radii);
          ctx.fillStyle = color;
          ctx.fill();
        } else {
          ctx.fillStyle = color;
          ctx.fillRect(px, py, tileSize, tileSize);
        }

        // 공유 테두리 — 라운드 있으면 clip 후 선 그리기 (코너 자동 처리)
        if (tileDef.borderColor) {
          if (hasRound) {
            this._buildRoundedPath(ctx, px, py, tileSize, tileSize, radii);
            ctx.clip();
          }
          this._drawSharedBorder(
            ctx, tiles, x, y, tileId, px, py,
            tileDef.borderColor,
            tileDef.borderWidth ?? 1,
          );
        }

        ctx.restore();
      }
    }
  }

  /**
   * 각 모서리의 라운드 반지름 계산.
   * 볼록 코너(해당 방향 2개 이웃이 모두 다른 타입)에만 r 적용.
   */
  _getCornerRadii(tiles, x, y, tileId, r) {
    const { mapWidth, mapHeight } = this;
    const same = (nx, ny) => {
      if (nx < 0 || nx >= mapWidth || ny < 0 || ny >= mapHeight) return false;
      return tiles[ny * mapWidth + nx] === tileId;
    };
    return {
      tl: (!same(x - 1, y) && !same(x, y - 1)) ? r : 0,
      tr: (!same(x + 1, y) && !same(x, y - 1)) ? r : 0,
      br: (!same(x + 1, y) && !same(x, y + 1)) ? r : 0,
      bl: (!same(x - 1, y) && !same(x, y + 1)) ? r : 0,
    };
  }

  /**
   * 모서리별 반지름을 가진 둥근 사각형 path 생성 (fill/clip 공용).
   * radii: { tl, tr, br, bl } — 각 코너 반지름 (0 = 직각)
   */
  _buildRoundedPath(ctx, x, y, w, h, { tl, tr, br, bl }) {
    ctx.beginPath();
    ctx.moveTo(x + tl, y);
    ctx.lineTo(x + w - tr, y);
    tr > 0 ? ctx.arcTo(x + w, y,     x + w, y + tr,     tr) : ctx.lineTo(x + w, y);
    ctx.lineTo(x + w, y + h - br);
    br > 0 ? ctx.arcTo(x + w, y + h, x + w - br, y + h, br) : ctx.lineTo(x + w, y + h);
    ctx.lineTo(x + bl, y + h);
    bl > 0 ? ctx.arcTo(x,     y + h, x,     y + h - bl, bl) : ctx.lineTo(x, y + h);
    ctx.lineTo(x, y + tl);
    tl > 0 ? ctx.arcTo(x,     y,     x + tl, y,         tl) : ctx.lineTo(x, y);
    ctx.closePath();
  }

  /**
   * 4방향 이웃을 확인해 타입이 다른(또는 빈) 방향의 선만 그림.
   * 같은 타입끼리 맞닿은 면은 선을 그리지 않아 이중 테두리가 생기지 않음.
   */
  _drawSharedBorder(ctx, tiles, x, y, tileId, px, py, borderColor, borderWidth) {
    const { mapWidth, mapHeight, tileSize } = this;

    const neighbor = (nx, ny) => {
      if (nx < 0 || nx >= mapWidth || ny < 0 || ny >= mapHeight) return null;
      return tiles[ny * mapWidth + nx] ?? null;
    };

    // 두꺼운 선은 중심이 정수 좌표에 오도록 보정값 조정
    // lineWidth가 짝수면 0, 홀수면 0.5
    const o = (borderWidth % 2 === 0) ? 0 : 0.5;

    ctx.strokeStyle = borderColor;
    ctx.lineWidth   = borderWidth;
    ctx.beginPath();

    if (neighbor(x, y - 1) !== tileId) {           // 위
      ctx.moveTo(px,            py + o);
      ctx.lineTo(px + tileSize, py + o);
    }
    if (neighbor(x + 1, y) !== tileId) {           // 오른쪽
      ctx.moveTo(px + tileSize - o, py);
      ctx.lineTo(px + tileSize - o, py + tileSize);
    }
    if (neighbor(x, y + 1) !== tileId) {           // 아래
      ctx.moveTo(px,            py + tileSize - o);
      ctx.lineTo(px + tileSize, py + tileSize - o);
    }
    if (neighbor(x - 1, y) !== tileId) {           // 왼쪽
      ctx.moveTo(px + o, py);
      ctx.lineTo(px + o, py + tileSize);
    }

    ctx.stroke();
  }

  _drawIconLayer(layer, layerIndex) {
    const { ctx, tileSize } = this;
    const sel = this._selectedIcon;

    for (let ii = 0; ii < layer.icons.length; ii++) {
      const icon = layer.icons[ii];
      const def  = ICON_TYPES[icon.type];
      if (!def) continue;

      const px = icon.x * tileSize;
      const py = icon.y * tileSize;
      const isSelected = sel && sel.layerIndex === layerIndex && sel.iconIndex === ii;

      ctx.save();

      // 선택 하이라이트 링
      if (isSelected) {
        ctx.strokeStyle = '#63b3ed';
        ctx.lineWidth   = 2 / this.scale;
        ctx.shadowColor = '#63b3ed';
        ctx.shadowBlur  = 8;
        ctx.beginPath();
        ctx.arc(px, py, tileSize * 0.48, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // 아이콘 본체 — 이미지 우선, 없으면 이모지 fallback
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';

      const cachedImg = _imgCache[def.id];
      if (cachedImg && cachedImg.complete && cachedImg.naturalWidth > 0) {
        // 이미지 파일 렌더링 (image 필드가 경로로 교체됐을 때)
        const half = tileSize * 0.45;
        ctx.drawImage(cachedImg, px - half, py - half, half * 2, half * 2);
      } else {
        // 이모지 렌더링 (기본값)
        ctx.font = `${Math.max(def.fontSize, 8)}px serif`;
        ctx.fillText(def.emoji, px, py + (def.offsetY ?? 0));
      }

      // 상단 레이블 텍스트
      if (icon.label) {
        const labelSize = Math.max(9, tileSize * 0.28);
        ctx.font         = `bold ${labelSize}px 'Segoe UI', sans-serif`;
        ctx.textBaseline = 'bottom';
        ctx.shadowColor  = 'rgba(0,0,0,0.85)';
        ctx.shadowBlur   = 4;
        ctx.fillStyle    = '#ffffff';
        ctx.fillText(icon.label, px, py - tileSize * 0.5);
        ctx.shadowBlur   = 0;
      }

      ctx.restore();
    }
  }

  _drawGrid() {
    const { ctx, mapWidth, mapHeight, tileSize } = this;
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= mapWidth; x++) {
      ctx.beginPath();
      ctx.moveTo(x * tileSize, 0);
      ctx.lineTo(x * tileSize, mapHeight * tileSize);
      ctx.stroke();
    }
    for (let y = 0; y <= mapHeight; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * tileSize);
      ctx.lineTo(mapWidth * tileSize, y * tileSize);
      ctx.stroke();
    }
  }

  _drawMapBorder() {
    const { ctx, mapWidth, mapHeight, tileSize } = this;
    ctx.strokeStyle = 'rgba(99,179,237,0.4)';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, mapWidth * tileSize, mapHeight * tileSize);
  }

  // ── 좌표 변환 ────────────────────────────────────────

  /** 화면 픽셀 → 맵 타일 단위 float */
  _canvasToMapFloat(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left  - this.offsetX) / this.scale / this.tileSize,
      y: (clientY - rect.top   - this.offsetY) / this.scale / this.tileSize,
    };
  }

  /** 화면 픽셀 → 맵 타일 정수 인덱스 */
  _canvasToTile(clientX, clientY) {
    const { x, y } = this._canvasToMapFloat(clientX, clientY);
    return { x: Math.floor(x), y: Math.floor(y) };
  }

  // ── 이벤트 바인딩 ────────────────────────────────────

  _bindEvents() {
    const c = this.canvas;
    c.addEventListener('mousedown',   e => this._onMouseDown(e));
    c.addEventListener('mousemove',   e => this._onMouseMove(e));
    c.addEventListener('mouseup',     () => this._onMouseUp());
    c.addEventListener('mouseleave',  () => this._onMouseUp());
    c.addEventListener('wheel',       e => this._onWheel(e), { passive: false });
    c.addEventListener('contextmenu', e => e.preventDefault());

    // Delete → 선택 아이콘 삭제 (Backspace 제외: 레이블 인풋 타이핑 방해)
    window.addEventListener('keydown', e => {
      // 인풋/텍스트영역 포커스 중이면 단축키 무시
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (e.key === 'Delete') {
        if (this._selectedIcon) {
          e.preventDefault();
          this.deleteSelectedIcon();
        }
      }
      if (e.key === 'Escape') {
        this.clearSelection();
      }
    });
  }

  _onMouseDown(e) {
    if (e.button === 1 || e.button === 2) {
      // 중간/우클릭 → 패닝
      this._isPanning = true;
      this._lastPanX  = e.clientX;
      this._lastPanY  = e.clientY;
      return;
    }

    const mapPos  = this._canvasToMapFloat(e.clientX, e.clientY);
    const tilePos = this._canvasToTile(e.clientX, e.clientY);

    // ① 아이콘 히트 감지 (도구 무관)
    const hit = Layers.findIconAt(mapPos.x, mapPos.y);
    if (hit) {
      // 선택 + 드래그 추적 시작
      this._selectedIcon    = { layerIndex: hit.layerIndex, iconIndex: hit.iconIndex };
      this._draggingIcon    = { layerIndex: hit.layerIndex, iconIndex: hit.iconIndex };
      this._dragMoved       = false;
      this._dragStartClient = { x: e.clientX, y: e.clientY };
      this._lastWasDrag     = false;
      this.render();
      return;
    }

    // ② 빈 공간 클릭 → 선택 해제
    this._selectedIcon = null;
    this._draggingIcon = null;

    // ③ ICON 도구: float 좌표에 아이콘 배치
    if (Tools.getCurrent() === TOOLS.ICON) {
      Layers.addIcon(mapPos.x, mapPos.y, Tools.getSelectedIcon());
      this.render();
      if (this._onChangeCallback) this._onChangeCallback();
      return;
    }

    // ④ 타일 도구: 타일 그리드에 페인팅
    this._isPainting = true;
    this._applyTileTool(tilePos.x, tilePos.y);
  }

  _onMouseMove(e) {
    // 아이콘 드래그 이동 (패닝·페인팅보다 우선)
    if (this._draggingIcon) {
      const dx = e.clientX - this._dragStartClient.x;
      const dy = e.clientY - this._dragStartClient.y;
      if (!this._dragMoved && Math.hypot(dx, dy) > 5) {
        this._dragMoved = true;
      }
      if (this._dragMoved) {
        const mp = this._canvasToMapFloat(e.clientX, e.clientY);
        const { layerIndex, iconIndex } = this._draggingIcon;
        const icon = Layers.getAll()[layerIndex]?.icons[iconIndex];
        if (icon) {
          icon.x = Math.max(0, Math.min(mp.x, this.mapWidth));
          icon.y = Math.max(0, Math.min(mp.y, this.mapHeight));
          this.render();
        }
      }
      return;
    }

    if (this._isPanning) {
      this.offsetX += e.clientX - this._lastPanX;
      this.offsetY += e.clientY - this._lastPanY;
      this._lastPanX = e.clientX;
      this._lastPanY = e.clientY;
      this.render();
    } else if (this._isPainting) {
      const { x, y } = this._canvasToTile(e.clientX, e.clientY);
      this._applyTileTool(x, y);
    }
  }

  _onMouseUp() {
    if (this._draggingIcon) {
      this._lastWasDrag = this._dragMoved;
      // 실제로 이동이 발생했을 때만 자동저장 트리거
      if (this._dragMoved && this._onChangeCallback) this._onChangeCallback();
      this._draggingIcon = null;
      this._dragMoved    = false;
      return;
    }
    this._isPainting = false;
    this._isPanning  = false;
  }

  _onWheel(e) {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    this.offsetX = mx - (mx - this.offsetX) * factor;
    this.offsetY = my - (my - this.offsetY) * factor;
    this.scale   = Math.max(0.2, Math.min(this.scale * factor, 8));
    this.render();
  }

  _applyTileTool(x, y) {
    if (x < 0 || x >= this.mapWidth || y < 0 || y >= this.mapHeight) return;
    Tools.applyAt(x, y);
    this.render();
    if (this._onChangeCallback) this._onChangeCallback();
  }

  // ── 유틸 ─────────────────────────────────────────────

  _fitCanvas() {
    const parent = this.canvas.parentElement;
    this.canvas.width  = parent.clientWidth;
    this.canvas.height = parent.clientHeight;
    this.render();
  }

  resetView() {
    this.scale   = 1.0;
    this.offsetX = 20;
    this.offsetY = 20;
    this.render();
  }
}
