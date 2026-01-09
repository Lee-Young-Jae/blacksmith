// 8대 스탯 인터페이스
export interface CharacterStats {
  attack: number; // 공격력
  defense: number; // 방어력
  hp: number; // HP
  critRate: number; // 치명타 확률 (%)
  critDamage: number; // 치명타 데미지 (%)
  penetration: number; // 관통력 (%)
  attackSpeed: number; // 공격속도 (%)
  evasion: number; // 회피율 (%)
}

export const STAT_NAMES: Record<keyof CharacterStats, string> = {
  attack: "공격력",
  defense: "방어력",
  hp: "HP",
  critRate: "치명타 확률",
  critDamage: "치명타 데미지",
  penetration: "관통력",
  attackSpeed: "공격속도",
  evasion: "회피율",
};

export const STAT_ICONS: Record<keyof CharacterStats, string> = {
  attack: "⚔️",
  defense: "🛡️",
  hp: "❤️",
  critRate: "🎯",
  critDamage: "💥",
  penetration: "🔪",
  attackSpeed: "⚡",
  evasion: "💨",
};

export const STAT_COLORS: Record<keyof CharacterStats, string> = {
  attack: "text-red-400",
  defense: "text-blue-400",
  hp: "text-green-400",
  critRate: "text-yellow-400",
  critDamage: "text-orange-400",
  penetration: "text-purple-400",
  attackSpeed: "text-cyan-400",
  evasion: "text-emerald-400",
};

// 기본 캐릭터 스탯 (장비 미착용 시)
export const DEFAULT_CHARACTER_STATS: CharacterStats = {
  attack: 10,
  defense: 5,
  hp: 300,
  critRate: 5, // 5%
  critDamage: 150, // 150% (1.5배)
  penetration: 0, // 0% 관통력
  attackSpeed: 100, // 100% (기본 속도)
  evasion: 0, // 0% (회피율)
};

// 빈 스탯 (합산용)
export const EMPTY_STATS: CharacterStats = {
  attack: 0,
  defense: 0,
  hp: 0,
  critRate: 0,
  critDamage: 0,
  penetration: 0,
  attackSpeed: 0,
  evasion: 0,
};

// 스탯 합산 헬퍼
export function mergeStats(
  ...statsList: Partial<CharacterStats>[]
): CharacterStats {
  const initial: CharacterStats = { ...EMPTY_STATS };
  return statsList.reduce<CharacterStats>(
    (acc, stats) => ({
      attack: acc.attack + (stats.attack || 0),
      defense: acc.defense + (stats.defense || 0),
      hp: acc.hp + (stats.hp || 0),
      critRate: acc.critRate + (stats.critRate || 0),
      critDamage: acc.critDamage + (stats.critDamage || 0),
      penetration: acc.penetration + (stats.penetration || 0),
      attackSpeed: acc.attackSpeed + (stats.attackSpeed || 0),
      evasion: acc.evasion + (stats.evasion || 0),
    }),
    initial
  );
}

// 전투력 계산
// PvP 실제 전투 가치 기준 가중치:
// - 30초 실시간 턴제, 공격 간격 = 2000ms / (attackSpeed / 100)
// - 공속 2배 = 공격 횟수 2배 = DPS 2배
// - HP 높으면 생존 시간 증가 = 공격 횟수 증가
export function calculateCombatPower(stats: CharacterStats): number {
  const weights = {
    attack: 1.0,       // 기준: 데미지 직접 증가
    defense: 0.6,      // def/(def+100) 공식, 체감 효과
    hp: 0.15,          // 생존 시간 증가 = 공격 기회 증가
    critRate: 2.0,     // 1%당 평균 데미지 ~0.5-1% 증가
    critDamage: 0.3,   // critRate와 시너지, 10%당 ~1-3% 증가
    penetration: 2.0,  // 방어력 직접 무효화
    attackSpeed: 1.0,  // 1%p당 DPS +1% (PvP 핵심)
    evasion: 1.5,      // 1%당 생존력 ~1% 증가
  };

  return Math.floor(
    stats.attack * weights.attack +
      stats.defense * weights.defense +
      stats.hp * weights.hp +
      stats.critRate * weights.critRate +
      stats.critDamage * weights.critDamage +
      stats.penetration * weights.penetration +
      stats.attackSpeed * weights.attackSpeed +
      stats.evasion * weights.evasion
  );
}

// 숫자 포맷팅 (소수점 정밀도 문제 해결)
export function formatNumber(value: number, decimals: number = 1): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

// 숫자를 문자열로 포맷팅 (소수점 정밀도 문제 해결)
export function formatNumberString(
  value: number,
  decimals: number = 1
): string {
  const rounded = formatNumber(value, decimals);
  // 정수인 경우 소수점 없이 표시
  return Number.isInteger(rounded)
    ? rounded.toString()
    : rounded.toFixed(decimals);
}

// 퍼센트 스탯 여부 확인
export const PERCENTAGE_STATS: (keyof CharacterStats)[] = [
  "critRate",
  "critDamage",
  "penetration",
  "attackSpeed",
  "evasion",
];

// 스탯 포맷팅 (표시용)
export function formatStat(stat: keyof CharacterStats, value: number): string {
  const isPercentage = PERCENTAGE_STATS.includes(stat);
  if (isPercentage) {
    const formatted = formatNumberString(value, 1);
    return `${formatted}%`;
  }
  return Math.round(value).toLocaleString();
}

// 스탯 비교 (증감 표시용)
export function compareStats(
  before: CharacterStats,
  after: CharacterStats
): Record<keyof CharacterStats, number> {
  return {
    attack: after.attack - before.attack,
    defense: after.defense - before.defense,
    hp: after.hp - before.hp,
    critRate: after.critRate - before.critRate,
    critDamage: after.critDamage - before.critDamage,
    penetration: after.penetration - before.penetration,
    attackSpeed: after.attackSpeed - before.attackSpeed,
    evasion: after.evasion - before.evasion,
  };
}

// =============================================
// 크리티컬 데미지 (선형 적용, 체감 없음)
// =============================================

/**
 * 크리티컬 데미지 적용 (선형)
 * - 타 게임과 동일하게 체감 없이 그대로 적용
 * - 예: 300% → 300%
 */
export function getEffectiveCritDamage(rawCritDamage: number): number {
  return rawCritDamage;
}

// =============================================
// 방어력 데미지 감소 공식 (LoL 스타일)
// =============================================

// 방어력 공식 설정
export const DEFENSE_CONFIG = {
  K: 120, // 방어력 120 = 50% 감소
};

/**
 * 방어력 기반 데미지 감소율 계산 (LoL 공식)
 *
 * 공식: reduction = defense / (defense + K)
 * - K=120: 방어력 120일 때 50% 감소
 * - 방어력이 높아질수록 감소율 증가 (체감 효과)
 *
 * 예시 (K=120):
 * - 60 방어 = 33% 감소
 * - 120 방어 = 50% 감소
 * - 240 방어 = 67% 감소
 * - 360 방어 = 75% 감소
 */
export function getDefenseReduction(defense: number): number {
  const { K } = DEFENSE_CONFIG;
  return defense / (defense + K);
}

/**
 * 관통력 적용 후 실제 데미지 감소율 계산
 *
 * 공식: effectiveReduction = baseReduction × (1 - penetration/100)
 * - 관통력이 방어력의 효과를 직접 감소시킴
 *
 * 예시:
 * - 50% 감소, 0% 관통 = 50% 감소
 * - 50% 감소, 50% 관통 = 25% 감소
 * - 50% 감소, 100% 관통 = 0% 감소
 */
export function getEffectiveDefenseReduction(
  defense: number,
  penetration: number
): number {
  const baseReduction = getDefenseReduction(defense);
  const penetrationMultiplier = 1 - Math.min(100, penetration) / 100;
  return baseReduction * penetrationMultiplier;
}

/**
 * 최종 데미지 배율 계산 (1 - 감소율)
 *
 * 이 값을 공격력에 곱하면 방어력 적용 후 데미지가 됨
 */
export function getDamageMultiplier(
  defense: number,
  penetration: number
): number {
  const reduction = getEffectiveDefenseReduction(defense, penetration);
  return 1 - reduction;
}
