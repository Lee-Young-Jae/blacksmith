/**
 * 수련의 숲 층 선택 컴포넌트
 *
 * 현재 층 정보, 적 미리보기 표시
 */

import { useMemo } from 'react'
import type { CharacterStats } from '../../types/stats'
import { formatNumberString } from '../../types/stats'
import { TOWER_CONFIG, getTowerTier, TOWER_TIER_NAMES, TOWER_TIER_COLORS, type TowerTier } from '../../types/tower'
import { createFloorEnemy, formatLargeNumber } from '../../utils/towerBattle'
import {
  GiHealthNormal, GiShield, GiSwordBrandish, GiStopwatch,
  // 적 타입 아이콘
  GiBullseye, GiWheat, GiGears, GiSparkles, GiStoneBlock, GiOgre,
  GiSpikedDragonHead, GiCrossedSwords, GiImperialCrown, GiDeathSkull,
  // 티어 아이콘
  GiWoodPile, GiRock, GiAnvil, GiNails, GiGems,
} from 'react-icons/gi'
import type { IconType } from 'react-icons'

// =============================================
// 아이콘 매핑
// =============================================

// 적 이모지 → React Icon 매핑
const ENEMY_ICONS: Record<string, IconType> = {
  '🎯': GiBullseye,      // 나무 허수아비
  '🌾': GiWheat,         // 짚 허수아비
  '⚙️': GiGears,         // 강철 허수아비
  '✨': GiSparkles,      // 마법 허수아비
  '🗿': GiStoneBlock,    // 골렘
  '👹': GiOgre,          // 거인
  '🐉': GiSpikedDragonHead, // 드래곤
  '⚔️': GiCrossedSwords, // 고대의 수호자
  '👑': GiImperialCrown, // 심연의 군주
  '💀': GiDeathSkull,    // 세계의 끝
}

// 티어 → React Icon 매핑
const TIER_ICONS: Record<TowerTier, IconType> = {
  wood: GiWoodPile,
  stone: GiRock,
  iron: GiAnvil,
  steel: GiNails,
  mithril: GiGems,
  legendary: GiImperialCrown,
}

// =============================================
// 타입 정의
// =============================================

interface TowerFloorSelectProps {
  playerStats: CharacterStats
  onStartBattle: () => void
}

// =============================================
// 컴포넌트
// =============================================

export function TowerFloorSelect({
  playerStats,
  onStartBattle,
}: TowerFloorSelectProps) {
  // 항상 1층부터 시작
  const startFloor = 1

  // 1층 적 정보
  const enemy = useMemo(() => createFloorEnemy(startFloor), [])

  // 티어 정보
  const tier = getTowerTier(startFloor)

  return (
    <div className="space-y-4">
      {/* 적 정보 카드 */}
      <div className="bg-stone-800/50 border border-amber-700/30 rounded-2xl overflow-hidden">
        {/* 적 헤더 */}
        <div className="bg-gradient-to-r from-amber-900/40 to-orange-900/40 p-4 border-b border-amber-700/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* 적 아이콘 */}
              {(() => {
                const EnemyIcon = ENEMY_ICONS[enemy.emoji]
                return EnemyIcon ? (
                  <EnemyIcon className="text-4xl text-orange-400" />
                ) : (
                  <span className="text-4xl">{enemy.emoji}</span>
                )
              })()}
              <div>
                <h3 className="text-lg font-bold text-amber-100">{enemy.name}</h3>
                <div className="flex items-center gap-2">
                  {/* 티어 아이콘 */}
                  {(() => {
                    const TierIcon = TIER_ICONS[tier]
                    return (
                      <span className={`text-sm flex items-center gap-1 ${TOWER_TIER_COLORS[tier]}`}>
                        <TierIcon className="text-base" />
                        {TOWER_TIER_NAMES[tier]} 등급
                      </span>
                    )
                  })()}
                </div>
              </div>
            </div>

            {/* 제한시간 */}
            <div className="text-right">
              <div className="flex items-center gap-1 text-amber-400">
                <GiStopwatch className="text-lg" />
                <span className="font-bold">{TOWER_CONFIG.TIME_LIMIT / 1000}초</span>
              </div>
              <p className="text-xs text-amber-200/50">제한시간</p>
            </div>
          </div>
        </div>

        {/* 적 스탯 - 주요 */}
        <div className="p-4 grid grid-cols-3 gap-3">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-red-400 mb-1">
              <GiHealthNormal className="text-sm" />
              <span className="text-xs">HP</span>
            </div>
            <p className="text-base font-bold text-amber-100">{formatLargeNumber(enemy.stats.hp)}</p>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-blue-400 mb-1">
              <GiShield className="text-sm" />
              <span className="text-xs">방어력</span>
            </div>
            <p className="text-base font-bold text-amber-100">{enemy.stats.defense.toLocaleString()}</p>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-orange-400 mb-1">
              <GiSwordBrandish className="text-sm" />
              <span className="text-xs">공격력</span>
            </div>
            <p className="text-base font-bold text-amber-100">{enemy.stats.attack.toLocaleString()}</p>
          </div>
        </div>

        {/* 적 스탯 - 부가 */}
        <div className="px-4 pb-4 grid grid-cols-5 gap-2">
          <div className="text-center bg-stone-900/30 rounded-lg py-2">
            <p className="text-[9px] text-amber-200/50 leading-tight">치명타<br/>확률</p>
            <p className="text-xs font-medium text-amber-100">{formatNumberString(enemy.stats.critRate)}%</p>
          </div>
          <div className="text-center bg-stone-900/30 rounded-lg py-2">
            <p className="text-[9px] text-amber-200/50 leading-tight">치명타<br/>피해</p>
            <p className="text-xs font-medium text-amber-100">{formatNumberString(enemy.stats.critDamage)}%</p>
          </div>
          <div className="text-center bg-stone-900/30 rounded-lg py-2">
            <p className="text-[9px] text-amber-200/50 leading-tight">공격<br/>속도</p>
            <p className="text-xs font-medium text-amber-100">{formatNumberString(enemy.stats.attackSpeed)}</p>
          </div>
          <div className="text-center bg-stone-900/30 rounded-lg py-2">
            <p className="text-[9px] text-amber-200/50 leading-tight">방어<br/>관통</p>
            <p className="text-xs font-medium text-amber-200/50">{formatNumberString(enemy.stats.penetration)}</p>
          </div>
          <div className="text-center bg-stone-900/30 rounded-lg py-2">
            <p className="text-[9px] text-amber-200/50 leading-tight">회피<br/>확률</p>
            <p className="text-xs font-medium text-amber-200/50">{formatNumberString(enemy.stats.evasion)}</p>
          </div>
        </div>

        {/* 플레이어 vs 적 비교 */}
        <div className="px-4 pb-4">
          <div className="bg-stone-900/50 rounded-xl p-3">
            <div className="flex items-center justify-between text-sm">
              <div className="text-center flex-1">
                <p className="text-amber-200/50 text-xs mb-1">내 공격력</p>
                <p className="text-amber-400 font-bold">{playerStats.attack.toLocaleString()}</p>
              </div>
              <div className="text-amber-700/50 px-2">vs</div>
              <div className="text-center flex-1">
                <p className="text-amber-200/50 text-xs mb-1">적 HP</p>
                <p className="text-red-400 font-bold">{formatLargeNumber(enemy.stats.hp)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 도전 버튼 */}
      <button
        onClick={onStartBattle}
        className="w-full py-4 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 rounded-xl font-bold text-lg text-white transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-amber-500/30"
      >
        수련 시작
      </button>

      {/* 안내 문구 */}
      <p className="text-center text-xs text-amber-200/50">
        제한시간 내에 적을 처치하면 다음 층으로 진행합니다
      </p>
    </div>
  )
}
