/**
 * 무기 이미지 동적 임포트
 * Vite의 import.meta.glob을 사용하여 모든 무기 이미지를 자동으로 로드
 *
 * 폴더 구조: src/assets/weapons/{weapon_id}/{level}.{ext}
 * 예: src/assets/weapons/wooden_sword/0.png, wooden_sword/1.png, ...
 */

// 모든 무기 이미지를 eagerly import (레벨별 폴더 구조)
const weaponImageModules = import.meta.glob<{ default: string }>(
  "../assets/weapons/**/*.{png,jpg,jpeg,webp,gif}",
  { eager: true }
);

// 무기 ID → 레벨 → 이미지 URL 매핑
const weaponLevelImages: Record<string, Record<number, string>> = {};

for (const path in weaponImageModules) {
  // 경로 파싱: '../assets/weapons/wooden_sword/0.png' → weaponId: 'wooden_sword', level: 0
  const parts = path.split("/");
  const fileName = parts.pop()?.replace(/\.[^/.]+$/, "") || "";
  const weaponId = parts.pop() || "";

  if (weaponId && fileName) {
    const level = parseInt(fileName, 10);
    if (!isNaN(level)) {
      if (!weaponLevelImages[weaponId]) {
        weaponLevelImages[weaponId] = {};
      }
      weaponLevelImages[weaponId][level] = weaponImageModules[path].default;
    }
  }
}

/**
 * 무기 ID와 레벨로 이미지 URL 가져오기
 * @param weaponId 무기 ID (예: 'wooden_sword')
 * @param level 강화 레벨 (0-20)
 * @returns 이미지 URL 또는 undefined (해당 레벨 이미지가 없으면 가장 가까운 낮은 레벨 이미지 반환)
 */
export function getWeaponImage(
  weaponId: string,
  level: number = 0
): string | undefined {
  const images = weaponLevelImages[weaponId];
  if (!images) return undefined;

  // 정확한 레벨 이미지가 있으면 반환
  if (images[level] !== undefined) {
    return images[level];
  }

  // 없으면 가장 가까운 낮은 레벨 이미지 찾기
  const availableLevels = Object.keys(images)
    .map(Number)
    .sort((a, b) => b - a);
  for (const availableLevel of availableLevels) {
    if (availableLevel <= level) {
      return images[availableLevel];
    }
  }

  // 그래도 없으면 가장 낮은 레벨 이미지 반환
  return images[availableLevels[availableLevels.length - 1]];
}

/**
 * 무기의 모든 레벨 이미지 가져오기
 */
export function getWeaponImages(
  weaponId: string
): Record<number, string> | undefined {
  return weaponLevelImages[weaponId];
}

/**
 * 특정 무기에 이미지가 있는지 확인
 */
export function hasWeaponImage(weaponId: string, level?: number): boolean {
  const images = weaponLevelImages[weaponId];
  if (!images) return false;
  if (level !== undefined) {
    return images[level] !== undefined;
  }
  return Object.keys(images).length > 0;
}

export default weaponLevelImages;
