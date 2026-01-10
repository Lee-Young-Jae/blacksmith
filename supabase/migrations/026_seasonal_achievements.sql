-- =============================================
-- 시즌 한정 업적 시스템
-- 시즌 1 전용 업적 + Tier 시스템 대응
-- =============================================

-- =============================================
-- 1. achievement_borders에 시즌 관련 컬럼 추가
-- =============================================
ALTER TABLE achievement_borders ADD COLUMN IF NOT EXISTS season_id INTEGER DEFAULT NULL;
ALTER TABLE achievement_borders ADD COLUMN IF NOT EXISTS is_seasonal BOOLEAN DEFAULT FALSE;
ALTER TABLE achievement_borders ADD COLUMN IF NOT EXISTS season_end_date TIMESTAMPTZ DEFAULT NULL;

-- =============================================
-- 2. 기존 star_25 (전설의 대장장이)를 시즌 1 한정으로 변경
-- 현재 장비 = Tier1 장비, 25성 달성은 시즌 1에서만 가능
-- =============================================
UPDATE achievement_borders
SET
  name = '개척자의 영광',
  description = '시즌 1에서 장비 25성을 달성하세요 (시즌 한정)',
  season_id = 1,
  is_seasonal = TRUE,
  season_end_date = NULL  -- 시즌 종료 시 설정
WHERE id = 'star_25';

-- =============================================
-- 3. Tier1 30성 업적 추가: 불굴의 장인 (시즌 2 한정)
-- =============================================
INSERT INTO achievement_borders (id, tier, name, description, border_class, unlock_condition, season_id, is_seasonal, season_end_date)
VALUES (
  'star_30_tier1',
  'legendary',
  '불굴의 장인',
  '시즌 2에서 Tier1 장비 30성을 달성하세요 (시즌 한정)',
  'ring-4 ring-orange-500 shadow-xl shadow-orange-500/40',
  '{"type": "max_star_tier1", "target": 30, "category": "enhancement", "season": 2}',
  2,
  TRUE,
  NULL  -- 시즌 종료 시 설정
) ON CONFLICT (id) DO NOTHING;

-- =============================================
-- 4. Tier2 35성 업적 추가: 신화의 대장장이 (시즌 3 한정)
-- =============================================
INSERT INTO achievement_borders (id, tier, name, description, border_class, unlock_condition, season_id, is_seasonal, season_end_date)
VALUES (
  'star_35_tier2',
  'legendary',
  '신화의 대장장이',
  '시즌 3에서 Tier2 장비 35성을 달성하세요 (시즌 한정)',
  'ring-4 ring-red-500 shadow-xl shadow-red-500/50',
  '{"type": "max_star_tier2", "target": 35, "category": "enhancement", "season": 3}',
  3,
  TRUE,
  NULL  -- 시즌 종료 시 설정
) ON CONFLICT (id) DO NOTHING;

-- =============================================
-- 5. 시즌 업적 획득 가능 여부 체크 함수
-- =============================================
CREATE OR REPLACE FUNCTION can_unlock_achievement(p_border_id VARCHAR(50))
RETURNS BOOLEAN AS $$
DECLARE
  v_is_seasonal BOOLEAN;
  v_season_end_date TIMESTAMPTZ;
BEGIN
  SELECT is_seasonal, season_end_date
  INTO v_is_seasonal, v_season_end_date
  FROM achievement_borders
  WHERE id = p_border_id;

  -- 시즌 업적이 아니면 항상 획득 가능
  IF NOT COALESCE(v_is_seasonal, FALSE) THEN
    RETURN TRUE;
  END IF;

  -- 시즌 종료일이 설정되지 않았으면 아직 진행 중
  IF v_season_end_date IS NULL THEN
    RETURN TRUE;
  END IF;

  -- 현재 시간이 시즌 종료일 이전인지 확인
  RETURN NOW() < v_season_end_date;
END;
$$ LANGUAGE plpgsql STABLE;

-- =============================================
-- 6. update_achievement_progress 함수 수정 (시즌 체크 추가)
-- =============================================
CREATE OR REPLACE FUNCTION update_achievement_progress(
  p_user_id UUID,
  p_border_id VARCHAR(50),
  p_progress INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  v_target INTEGER;
  v_was_unlocked BOOLEAN;
  v_can_unlock BOOLEAN;
BEGIN
  -- 시즌 업적 획득 가능 여부 체크
  v_can_unlock := can_unlock_achievement(p_border_id);
  IF NOT v_can_unlock THEN
    RETURN FALSE;
  END IF;

  -- 목표값 조회
  SELECT (unlock_condition->>'target')::INTEGER INTO v_target
  FROM achievement_borders
  WHERE id = p_border_id;

  IF v_target IS NULL THEN
    RETURN FALSE;
  END IF;

  -- 기존 해금 상태 확인
  SELECT is_unlocked INTO v_was_unlocked
  FROM user_achievements
  WHERE user_id = p_user_id AND border_id = p_border_id;

  -- 이미 해금되었으면 스킵
  IF v_was_unlocked THEN
    RETURN FALSE;
  END IF;

  -- 진행도 업데이트
  INSERT INTO user_achievements (user_id, border_id, progress, is_unlocked, unlocked_at)
  VALUES (
    p_user_id,
    p_border_id,
    p_progress,
    p_progress >= v_target,
    CASE WHEN p_progress >= v_target THEN NOW() ELSE NULL END
  )
  ON CONFLICT (user_id, border_id)
  DO UPDATE SET
    progress = GREATEST(user_achievements.progress, p_progress),
    is_unlocked = CASE
      WHEN user_achievements.is_unlocked THEN TRUE
      ELSE GREATEST(user_achievements.progress, p_progress) >= v_target
    END,
    unlocked_at = CASE
      WHEN user_achievements.is_unlocked THEN user_achievements.unlocked_at
      WHEN GREATEST(user_achievements.progress, p_progress) >= v_target THEN NOW()
      ELSE NULL
    END,
    updated_at = NOW();

  -- 새로 해금되었는지 반환
  RETURN p_progress >= v_target AND NOT COALESCE(v_was_unlocked, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 7. 시즌 종료 시 호출할 함수 (관리자용)
-- =============================================
CREATE OR REPLACE FUNCTION end_achievement_season(p_season_id INTEGER)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE achievement_borders
  SET season_end_date = NOW()
  WHERE season_id = p_season_id
    AND is_seasonal = TRUE
    AND season_end_date IS NULL;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 완료 메시지
-- =============================================
DO $$
BEGIN
  RAISE NOTICE 'Seasonal achievement system created!';
  RAISE NOTICE '- 시즌 1: star_25 (개척자의 영광) - 기본 장비 25성';
  RAISE NOTICE '- 시즌 2: star_30_tier1 (불굴의 장인) - Tier1 장비 30성';
  RAISE NOTICE '- 시즌 3: star_35_tier2 (신화의 대장장이) - Tier2 장비 35성';
  RAISE NOTICE '- Use end_achievement_season(N) to close Season N';
END $$;
