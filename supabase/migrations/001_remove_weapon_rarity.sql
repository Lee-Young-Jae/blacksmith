-- =============================================
-- 마이그레이션: weapon_rarity 컬럼 제거
-- 진화 시스템 도입으로 희귀도 개념 삭제
-- =============================================

-- 1. 뷰 먼저 삭제 (weapon_rarity 참조)
DROP VIEW IF EXISTS recent_enhancements;

-- 2. user_weapons 테이블에서 weapon_rarity 컬럼 제거
ALTER TABLE user_weapons DROP COLUMN IF EXISTS weapon_rarity;

-- 3. enhancement_history 테이블에서 weapon_rarity 컬럼 제거
ALTER TABLE enhancement_history DROP COLUMN IF EXISTS weapon_rarity;

-- 4. 뷰 재생성 (weapon_rarity 없이)
CREATE VIEW recent_enhancements AS
SELECT
  eh.id,
  up.username,
  eh.weapon_name,
  eh.from_level,
  eh.to_level,
  eh.result,
  eh.was_chance_time,
  eh.created_at
FROM enhancement_history eh
JOIN user_profiles up ON eh.user_id = up.id
ORDER BY eh.created_at DESC
LIMIT 50;

-- 완료 메시지
DO $$
BEGIN
  RAISE NOTICE 'Migration completed: weapon_rarity columns removed successfully';
END $$;
