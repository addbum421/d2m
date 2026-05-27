/**
 * autotile.js — 16-tile 비트마스크 오토타일링 (NSEW 4방향)
 *
 * 벽(wall) 타일이 인접한 방향에 따라 16가지 모양 중 하나를 선택합니다.
 *
 * 비트 마스크:
 *   위(N)  = 1
 *   오른(E) = 2
 *   아래(S) = 4
 *   왼(W)  = 8
 *
 * 0~15 총 16가지 조합 → 각각 다른 색상/모양으로 렌더링
 */

import { TILE_TYPES } from '../config/tiles.js';

const WALL_ID = TILE_TYPES.wall.id;

/**
 * 특정 위치의 타일이 '같은 오토타일 타입'인지 확인
 * (범위 밖 = 같은 타입으로 간주하여 벽이 이어지도록)
 */
function isSame(tiles, x, y, width, height, tileId) {
  if (x < 0 || x >= width || y < 0 || y >= height) return true;
  return tiles[y * width + x] === tileId;
}

/**
 * 4방향 비트마스크 계산 (0~15)
 * @param {Array} tiles  타일 배열 (width*height)
 * @param {number} x
 * @param {number} y
 * @param {number} width
 * @param {number} height
 * @param {number} tileId  연결 여부 확인할 타일 id
 * @returns {number} 0~15
 */
export function getBitmask(tiles, x, y, width, height, tileId) {
  let mask = 0;
  if (isSame(tiles, x,   y-1, width, height, tileId)) mask |= 1; // N
  if (isSame(tiles, x+1, y,   width, height, tileId)) mask |= 2; // E
  if (isSame(tiles, x,   y+1, width, height, tileId)) mask |= 4; // S
  if (isSame(tiles, x-1, y,   width, height, tileId)) mask |= 8; // W
  return mask;
}

/**
 * 비트마스크 → 렌더링 색상 반환 (스프라이트 없을 때 색상으로 구분)
 * 실제 스프라이트 시트 연동 시 이 함수만 수정하면 됨
 */
export function getWallColor(mask) {
  // 연결 수에 따라 명도 조절로 시각적 구분
  const connections = [0,1,2,4,8].filter(b => mask & b).length;
  const base = 74; // #4A hex
  const delta = connections * 12;
  const v = Math.min(base + delta, 180);
  return `rgb(${v}, ${v}, ${v + 16})`;
}

/**
 * 오토타일 적용 대상 여부
 */
export function isAutotile(tileId) {
  return tileId === WALL_ID;
}
