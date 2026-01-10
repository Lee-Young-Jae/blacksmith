-- =============================================
-- 업적별 개별 테두리 효과 시스템
-- =============================================

-- 1. border_effect 컬럼 추가
ALTER TABLE achievement_borders
ADD COLUMN IF NOT EXISTS border_effect VARCHAR(50) DEFAULT 'glow';

-- 2. border_color 컬럼 추가 (효과 색상)
ALTER TABLE achievement_borders
ADD COLUMN IF NOT EXISTS border_color VARCHAR(50) DEFAULT NULL;

-- =============================================
-- 각 업적별 고유 효과 설정
-- =============================================

-- 전투 업적
UPDATE achievement_borders SET border_effect = 'glow', border_color = 'gray' WHERE id = 'first_win';
UPDATE achievement_borders SET border_effect = 'pulse', border_color = 'blue' WHERE id = 'warrior_10';
UPDATE achievement_borders SET border_effect = 'pulse', border_color = 'purple' WHERE id = 'warrior_50';
UPDATE achievement_borders SET border_effect = 'fire', border_color = 'orange' WHERE id = 'warrior_100';
UPDATE achievement_borders SET border_effect = 'lightning', border_color = 'yellow' WHERE id = 'champion';

-- 연승 업적
UPDATE achievement_borders SET border_effect = 'wind', border_color = 'cyan' WHERE id = 'win_streak_10';
UPDATE achievement_borders SET border_effect = 'storm', border_color = 'purple' WHERE id = 'win_streak_30';
UPDATE achievement_borders SET border_effect = 'cosmic', border_color = 'indigo' WHERE id = 'win_streak_75';

-- 강화 업적
UPDATE achievement_borders SET border_effect = 'glow', border_color = 'amber' WHERE id = 'star_10';
UPDATE achievement_borders SET border_effect = 'sparkle', border_color = 'blue' WHERE id = 'star_15';
UPDATE achievement_borders SET border_effect = 'sparkle', border_color = 'purple' WHERE id = 'star_20';
UPDATE achievement_borders SET border_effect = 'particles', border_color = 'gold' WHERE id = 'star_25';
UPDATE achievement_borders SET border_effect = 'aurora', border_color = 'rainbow' WHERE id = 'star_30_tier1';
UPDATE achievement_borders SET border_effect = 'cosmic', border_color = 'rainbow' WHERE id = 'star_35_tier2';

-- 강화 횟수 업적
UPDATE achievement_borders SET border_effect = 'pulse', border_color = 'amber' WHERE id = 'enhance_100';
UPDATE achievement_borders SET border_effect = 'fire', border_color = 'red' WHERE id = 'enhance_500';

-- 수집 업적
UPDATE achievement_borders SET border_effect = 'glow', border_color = 'yellow' WHERE id = 'gold_10k';
UPDATE achievement_borders SET border_effect = 'sparkle', border_color = 'yellow' WHERE id = 'gold_100k';
UPDATE achievement_borders SET border_effect = 'rain', border_color = 'gold' WHERE id = 'gold_1m';

-- 장비 수집 업적
UPDATE achievement_borders SET border_effect = 'pulse', border_color = 'emerald' WHERE id = 'equip_10';
UPDATE achievement_borders SET border_effect = 'sparkle', border_color = 'emerald' WHERE id = 'equip_20';
UPDATE achievement_borders SET border_effect = 'particles', border_color = 'emerald' WHERE id = 'collector';

-- =============================================
-- 완료 메시지
-- =============================================
DO $$
BEGIN
  RAISE NOTICE 'Individual border effects have been configured!';
  RAISE NOTICE 'Effects: glow, pulse, sparkle, lightning, aurora, fire, rain, wind, storm, cosmic, particles';
END $$;
