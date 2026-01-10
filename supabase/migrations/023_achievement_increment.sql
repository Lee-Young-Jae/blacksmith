-- =============================================
-- 업적 진행 증가 함수 (누적 타입 업적용)
-- enhance_count, gacha_count 등 누적되는 업적에 사용
-- =============================================

CREATE OR REPLACE FUNCTION increment_achievement_progress(
  p_user_id UUID,
  p_border_id VARCHAR(50),
  p_increment INTEGER DEFAULT 1
)
RETURNS BOOLEAN AS $$
DECLARE
  v_target INTEGER;
  v_current_progress INTEGER;
  v_new_progress INTEGER;
  v_was_unlocked BOOLEAN;
BEGIN
  -- 목표값 조회
  SELECT (unlock_condition->>'target')::INTEGER INTO v_target
  FROM achievement_borders
  WHERE id = p_border_id;

  IF v_target IS NULL THEN
    RETURN FALSE;
  END IF;

  -- 현재 진행도 및 해금 상태 조회
  SELECT progress, is_unlocked INTO v_current_progress, v_was_unlocked
  FROM user_achievements
  WHERE user_id = p_user_id AND border_id = p_border_id;

  -- 이미 해금되었으면 스킵
  IF v_was_unlocked THEN
    RETURN FALSE;
  END IF;

  -- 새 진행도 계산
  v_new_progress := COALESCE(v_current_progress, 0) + p_increment;

  -- 진행도 업데이트 또는 삽입
  INSERT INTO user_achievements (user_id, border_id, progress, is_unlocked, unlocked_at)
  VALUES (
    p_user_id,
    p_border_id,
    v_new_progress,
    v_new_progress >= v_target,
    CASE WHEN v_new_progress >= v_target THEN NOW() ELSE NULL END
  )
  ON CONFLICT (user_id, border_id)
  DO UPDATE SET
    progress = user_achievements.progress + p_increment,
    is_unlocked = CASE
      WHEN user_achievements.is_unlocked THEN TRUE
      ELSE (user_achievements.progress + p_increment) >= v_target
    END,
    unlocked_at = CASE
      WHEN user_achievements.is_unlocked THEN user_achievements.unlocked_at
      WHEN (user_achievements.progress + p_increment) >= v_target THEN NOW()
      ELSE NULL
    END,
    updated_at = NOW();

  -- 새로 해금되었는지 반환
  RETURN v_new_progress >= v_target AND NOT COALESCE(v_was_unlocked, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
