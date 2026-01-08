/**
 * 무기 이미지 경로 생성
 * public/equipment 폴더에서 무기 이미지를 가져옴
 *
 * 폴더 구조: public/equipment/weapon-{weapon_id}/{level}.png
 * 예: public/equipment/weapon-wooden-sword/0.png, weapon-wooden-sword/1.png, ...
 *
 * 무기 ID 변환: wooden_sword → weapon-wooden-sword
 */

/**
 * 무기 ID를 폴더명으로 변환
 * wooden_sword → weapon-wooden-sword
 */
function weaponIdToFolderName(weaponId: string): string {
  return `weapon-${weaponId.replace(/_/g, "-")}`;
}

/**
 * 무기 이미지 경로 생성
 * @param weaponId 무기 ID (예: 'wooden_sword')
 * @param level 강화 레벨 (0-20)
 * @returns 이미지 경로 (예: '/equipment/weapon-wooden-sword/0.png')
 */
function getWeaponImagePath(weaponId: string, level: number): string {
  const folderName = weaponIdToFolderName(weaponId);
  return `/equipment/${folderName}/${level}.png`;
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
  // public 폴더의 이미지는 직접 경로를 반환
  // 이미지 존재 여부는 브라우저에서 확인 (404 시 fallback)
  return getWeaponImagePath(weaponId, level);
}

/**
 * 무기의 모든 레벨 이미지 가져오기
 * public 폴더를 사용하므로 동적으로 경로 생성
 */
export function getWeaponImages(
  weaponId: string
): Record<number, string> | undefined {
  // public 폴더의 이미지는 동적으로 경로 생성
  // 실제 존재 여부는 확인할 수 없으므로, 0-20 레벨까지 경로 반환
  const images: Record<number, string> = {};
  for (let i = 0; i <= 20; i++) {
    images[i] = getWeaponImagePath(weaponId, i);
  }
  return images;
}

/**
 * 특정 무기에 이미지가 있는지 확인
 * public 폴더를 사용하므로 항상 true 반환 (실제 존재 여부는 브라우저에서 확인)
 */
export function hasWeaponImage(_weaponId: string, _level?: number): boolean {
  // public 폴더의 이미지는 항상 경로가 존재한다고 가정
  // 실제 존재 여부는 브라우저에서 404 에러로 확인
  return true;
}
