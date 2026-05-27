/**
 * tiles.js — 타일 타입 정의
 * 새 타일 추가 시 이 파일에만 항목 추가하면 됨
 */

export const TILE_TYPES = {
  // id: 정수 (null = 빈칸/투명)
  // cornerRadius: 0.0~0.5 — tileSize 대비 비율 (0 = 직각, 0.3 = 완만한 라운드)
  //   볼록 코너(이웃 없는 방향)에만 적용, 오목 코너는 항상 직각 유지

  // ── 바닥 단차 3종 (밝을수록 높은 단) ─────────────
  floor: {
    id: 0,
    label: '바닥',
    color: '#EBF4F6',
    borderColor: '#B8CDD1',
    borderWidth: 1,
    cornerRadius: 0.15,
    autotile: false,
  },
  floor_mid: {
    id: 3,
    label: '단차 1',
    color: '#B8D4DA',
    borderColor: '#84AAAF',
    borderWidth: 1,
    cornerRadius: 0.15,
    autotile: false,
  },
  floor_low: {
    id: 4,
    label: '단차 2',
    color: '#7DAAB5',
    borderColor: '#4E8290',
    borderWidth: 1,
    cornerRadius: 0.15,
    autotile: false,
  },

  // ── 구조물 ────────────────────────────────────────
  wall: {
    id: 1,
    label: '벽',
    color: '#4A4A5A',
    borderColor: '#2A2A3A',
    borderWidth: 3,
    cornerRadius: 0.3,
    autotile: true,
  },
  void: {
    id: 2,
    label: '공허',
    color: '#0D0D1A',
    borderColor: '#050508',
    borderWidth: 3,
    cornerRadius: 0,
    autotile: false,
  },
};

/** id → type 객체 역방향 조회 맵 */
export const TILE_BY_ID = Object.fromEntries(
  Object.values(TILE_TYPES).map(t => [t.id, t])
);

/** 팔레트에 표시할 순서 — 바닥 3종 묶음 → 벽 → 공허 */
export const TILE_PALETTE_ORDER = ['floor', 'floor_mid', 'floor_low', 'wall', 'void'];
