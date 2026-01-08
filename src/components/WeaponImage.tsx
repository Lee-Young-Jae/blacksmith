import { useState, useEffect, useMemo } from "react";
import type { WeaponType } from "../types/weapon";
import { getWeaponAtLevel, getLevelTier, LEVEL_GLOW } from "../types/weapon";

interface WeaponImageProps {
  weapon: WeaponType;
  level?: number;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  showGlow?: boolean;
}

const SIZE_CLASSES = {
  sm: "w-8 h-8 text-2xl",
  md: "w-16 h-16 text-4xl",
  lg: "w-24 h-24 text-6xl",
  xl: "w-32 h-32 text-7xl",
};

const IMAGE_SIZE_CLASSES = {
  sm: "w-8 h-8",
  md: "w-16 h-16",
  lg: "w-24 h-24",
  xl: "w-32 h-32",
};

export function WeaponImage({
  weapon,
  level = 0,
  size = "md",
  className = "",
  showGlow = true,
}: WeaponImageProps) {
  // Track which level indices have failed to load
  const [failedIndices, setFailedIndices] = useState<Set<number>>(new Set());

  const levelTier = getLevelTier(level);
  const glowClass = showGlow ? LEVEL_GLOW[levelTier] : "";

  // Reset failed indices when weapon changes
  useEffect(() => {
    setFailedIndices(new Set());
  }, [weapon.id]);

  // Find the best available image (current level, or fallback backwards)
  const { imagePath, currentIndex, weaponLevel } = useMemo(() => {
    // 디버깅: weaponType이 제대로 전달되는지 확인
    if (!weapon || !weapon.levels || weapon.levels.length === 0) {
      console.warn("[WeaponImage] Invalid weapon data:", { weapon, level });
      return {
        imagePath: undefined,
        currentIndex: -1,
        weaponLevel: { name: "Unknown", comment: "", image: undefined },
      };
    }

    const maxLevel = weapon.levels.length - 1;
    const effectiveLevel = Math.min(level, maxLevel);

    // Start from current level and go backwards to find a working image
    for (let i = effectiveLevel; i >= 0; i--) {
      const levelData = getWeaponAtLevel(weapon, i);
      if (levelData.image && !failedIndices.has(i)) {
        return {
          imagePath: levelData.image,
          currentIndex: i,
          weaponLevel: levelData,
        };
      }
    }

    // No image found, return current level data for name
    const finalLevelData = getWeaponAtLevel(weapon, effectiveLevel);
    console.warn("[WeaponImage] No image found for weapon:", {
      weaponId: weapon.id,
      level: effectiveLevel,
      hasLevels: weapon.levels.length > 0,
      levelDataImage: finalLevelData.image,
    });
    return {
      imagePath: undefined,
      currentIndex: -1,
      weaponLevel: finalLevelData,
    };
  }, [weapon, level, failedIndices]);

  // Handle image load error - mark this index as failed and try next
  const handleImageError = () => {
    if (currentIndex >= 0) {
      setFailedIndices((prev) => new Set([...prev, currentIndex]));
    }
  };

  // 이미지가 있으면 이미지 표시
  if (imagePath) {
    return (
      <img
        src={imagePath}
        alt={weaponLevel.name}
        className={`${IMAGE_SIZE_CLASSES[size]} object-contain ${glowClass} ${className}`}
        onError={handleImageError}
        loading="lazy"
      />
    );
  }

  // 이미지가 없거나 로드 실패 시 이모지 표시
  return (
    <span
      className={`${SIZE_CLASSES[size]} flex items-center justify-center ${glowClass} ${className}`}
    >
      {weapon.emoji}
    </span>
  );
}
