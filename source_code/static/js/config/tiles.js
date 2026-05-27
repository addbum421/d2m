/**
 * tiles.js — 타일 타입 정의
 * 새 타일 추가 시 이 파일에만 항목 추가하면 됨
 */

export const TILE_TYPES = {
  // id: 정수 (null = 빈칸/투명)
  floor: {
    id: 0,
    label: '바닥',
    color: '#8B7355',
    borderColor: '#6B5335',
    borderWidth: 1,          // 테두리 두께 (px)
    autotile: false,
  },
  wall: {
    id: 1,
    label: '벽',
    color: '#4A4A5A',
    borderColor: '#2A2A3A',
    borderWidth: 3,
    autotile: true,
  },
  void: {
    id: 2,
    label: '공허',
    color: '#0D0D1A',
    borderColor: '#050508',
    borderWidth: 3,
    autotile: false,
  },
};

/** id → type 객체 역방향 조회 맵 */
export const TILE_BY_ID = Object.fromEntries(
  Object.values(TILE_TYPES).map(t => [t.id, t])
);

/** 팔레트에 표시할 순서 */
export const TILE_PALETTE_ORDER = ['floor', 'wall', 'void'];
