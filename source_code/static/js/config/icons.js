/**
 * icons.js — 아이콘 타입 정의
 * 새 아이콘 추가 시 이 파일에만 항목 추가하면 됨
 *
 * image 교체 방법:
 *   image: null  → 이모지로 렌더링
 *   image: '/static/images/icons/skull.png'  → 이미지 파일로 렌더링
 */

export const ICON_TYPES = {
  skull: {
    id: 'skull',
    label: '해골 (적)',
    emoji: '💀',
    image: null,        // 교체 시 이미지 경로 입력
    fontSize: 20,
    offsetY: 4,
  },
  flag: {
    id: 'flag',
    label: '깃발 (목표)',
    emoji: '🚩',
    image: null,
    fontSize: 20,
    offsetY: 4,
  },
  heal: {
    id: 'heal',
    label: '힐팩',
    emoji: '💊',
    image: null,
    fontSize: 18,
    offsetY: 3,
  },
  user: {
    id: 'user',
    label: '유저 (스폰)',
    emoji: '🧍',
    image: null,
    fontSize: 20,
    offsetY: 4,
  },
};

/** 팔레트에 표시할 순서 */
export const ICON_PALETTE_ORDER = ['skull', 'flag', 'heal', 'user'];
