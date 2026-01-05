-- =============================================
-- 선물 시스템 마이그레이션
-- 묵념 이미지 + 장비 선물 + 선물함
-- =============================================

-- =============================================
-- 1. 선물 테이블
-- =============================================
CREATE TABLE IF NOT EXISTS gifts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- 발신자/수신자
  sender_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,

  -- 선물 유형: 'condolence' (묵념 이미지) | 'equipment' (장비)
  gift_type VARCHAR(20) NOT NULL CHECK (gift_type IN ('condolence', 'equipment')),

  -- 묵념 이미지인 경우: 이미지 식별자
  condolence_image_id VARCHAR(50),

  -- 장비인 경우: 장비 정보 스냅샷
  -- { equipment_base_id, star_level, consecutive_fails, rarity, potentials[] }
  equipment_data JSONB,

  -- 메시지 (선택사항)
  message VARCHAR(200),

  -- 강화 기록 참조 (묵념인 경우, 어떤 강화 실패에 대한 것인지)
  enhancement_history_id UUID REFERENCES enhancement_history(id) ON DELETE SET NULL,

  -- 상태
  is_claimed BOOLEAN NOT NULL DEFAULT FALSE,
  claimed_at TIMESTAMPTZ,

  -- 만료 (30일)
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 2. 인덱스
-- =============================================
CREATE INDEX IF NOT EXISTS idx_gifts_receiver ON gifts(receiver_id, is_claimed, expires_at);
CREATE INDEX IF NOT EXISTS idx_gifts_sender ON gifts(sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gifts_expires ON gifts(expires_at) WHERE is_claimed = FALSE;

-- =============================================
-- 3. RLS (Row Level Security)
-- =============================================
ALTER TABLE gifts ENABLE ROW LEVEL SECURITY;

-- 수신자: 자신이 받은 선물 조회
CREATE POLICY "Users can read received gifts"
  ON gifts FOR SELECT
  USING (auth.uid() = receiver_id);

-- 발신자: 자신이 보낸 선물 조회
CREATE POLICY "Users can read sent gifts"
  ON gifts FOR SELECT
  USING (auth.uid() = sender_id);

-- 발신자: 묵념 이미지만 직접 생성 가능 (장비는 RPC 함수로만)
CREATE POLICY "Users can send condolence gifts"
  ON gifts FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND gift_type = 'condolence'
    AND sender_id != receiver_id
  );

-- 수신자: 선물 수령 상태만 업데이트 가능
CREATE POLICY "Users can claim their gifts"
  ON gifts FOR UPDATE
  USING (auth.uid() = receiver_id AND is_claimed = FALSE)
  WITH CHECK (is_claimed = TRUE);

-- =============================================
-- 4. 장비 선물 함수 (SECURITY DEFINER - RLS 우회)
-- =============================================
CREATE OR REPLACE FUNCTION send_equipment_gift(
  p_sender_id UUID,
  p_receiver_id UUID,
  p_equipment_id UUID,
  p_message VARCHAR(200) DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_equipment RECORD;
  v_potentials JSONB;
  v_gift_id UUID;
BEGIN
  -- 1. 자기 자신에게는 선물 불가
  IF p_sender_id = p_receiver_id THEN
    RAISE EXCEPTION 'Cannot send gift to yourself';
  END IF;

  -- 2. 장비 존재 및 소유권 확인 (장착 중이면 선물 불가)
  SELECT * INTO v_equipment
  FROM user_equipment
  WHERE id = p_equipment_id
    AND user_id = p_sender_id
    AND is_equipped = FALSE;

  IF v_equipment IS NULL THEN
    RAISE EXCEPTION 'Equipment not found or cannot be gifted';
  END IF;

  -- 3. 수신자 존재 확인
  IF NOT EXISTS (SELECT 1 FROM user_profiles WHERE id = p_receiver_id) THEN
    RAISE EXCEPTION 'Receiver not found';
  END IF;

  -- 4. 잠재옵션 스냅샷 생성
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'stat', stat_type,
      'value', stat_value,
      'isPercentage', is_percentage,
      'isLocked', is_locked
    ) ORDER BY line_index
  ), '[]'::jsonb) INTO v_potentials
  FROM equipment_potentials
  WHERE equipment_id = p_equipment_id;

  -- 5. 선물 레코드 생성
  INSERT INTO gifts (
    sender_id,
    receiver_id,
    gift_type,
    equipment_data,
    message
  ) VALUES (
    p_sender_id,
    p_receiver_id,
    'equipment',
    jsonb_build_object(
      'equipment_base_id', v_equipment.equipment_base_id,
      'star_level', v_equipment.star_level,
      'consecutive_fails', v_equipment.consecutive_fails,
      'rarity', v_equipment.rarity,
      'potentials', v_potentials
    ),
    p_message
  )
  RETURNING id INTO v_gift_id;

  -- 6. 원본 장비 삭제 (잠재옵션은 CASCADE로 함께 삭제)
  DELETE FROM user_equipment WHERE id = p_equipment_id;

  RETURN v_gift_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 5. 선물 수령 함수 (장비 - SECURITY DEFINER)
-- =============================================
CREATE OR REPLACE FUNCTION claim_equipment_gift(
  p_gift_id UUID,
  p_user_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_gift RECORD;
  v_equipment_id UUID;
  v_potential JSONB;
  v_line_index INTEGER;
BEGIN
  -- 1. 선물 확인
  SELECT * INTO v_gift
  FROM gifts
  WHERE id = p_gift_id
    AND receiver_id = p_user_id
    AND gift_type = 'equipment'
    AND is_claimed = FALSE
    AND expires_at > NOW();

  IF v_gift IS NULL THEN
    RAISE EXCEPTION 'Gift not found, already claimed, or expired';
  END IF;

  -- 2. 새 장비 생성
  INSERT INTO user_equipment (
    user_id,
    equipment_base_id,
    star_level,
    consecutive_fails,
    rarity,
    is_equipped,
    equipped_slot
  ) VALUES (
    p_user_id,
    v_gift.equipment_data->>'equipment_base_id',
    (v_gift.equipment_data->>'star_level')::INTEGER,
    (v_gift.equipment_data->>'consecutive_fails')::INTEGER,
    COALESCE(v_gift.equipment_data->>'rarity', 'common'),
    FALSE,
    NULL
  )
  RETURNING id INTO v_equipment_id;

  -- 3. 잠재옵션 복원
  v_line_index := 0;
  FOR v_potential IN SELECT * FROM jsonb_array_elements(v_gift.equipment_data->'potentials')
  LOOP
    INSERT INTO equipment_potentials (
      equipment_id,
      line_index,
      stat_type,
      stat_value,
      is_percentage,
      is_locked
    ) VALUES (
      v_equipment_id,
      v_line_index,
      v_potential->>'stat',
      (v_potential->>'value')::INTEGER,
      COALESCE((v_potential->>'isPercentage')::BOOLEAN, FALSE),
      COALESCE((v_potential->>'isLocked')::BOOLEAN, FALSE)
    );
    v_line_index := v_line_index + 1;
  END LOOP;

  -- 4. 선물 수령 처리
  UPDATE gifts
  SET is_claimed = TRUE, claimed_at = NOW()
  WHERE id = p_gift_id;

  RETURN v_equipment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 6. 유저 검색 함수 (선물 보낼 때 사용)
-- =============================================
CREATE OR REPLACE FUNCTION search_users_by_username(
  p_query VARCHAR(50),
  p_exclude_user_id UUID,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  user_id UUID,
  username VARCHAR(50)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    up.id as user_id,
    up.username
  FROM user_profiles up
  WHERE up.username ILIKE ('%' || p_query || '%')
    AND up.id != p_exclude_user_id
    AND up.username IS NOT NULL
  ORDER BY
    CASE WHEN up.username ILIKE (p_query || '%') THEN 0 ELSE 1 END,
    up.username
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 7. 만료 선물 정리 함수 (cron 또는 수동 호출)
-- =============================================
CREATE OR REPLACE FUNCTION cleanup_expired_gifts()
RETURNS INTEGER AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM gifts
  WHERE is_claimed = FALSE
    AND expires_at < NOW();

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 8. 미수령 선물 개수 조회 함수
-- =============================================
CREATE OR REPLACE FUNCTION get_unclaimed_gift_count(p_user_id UUID)
RETURNS TABLE (
  total INTEGER,
  condolence INTEGER,
  equipment INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INTEGER as total,
    COUNT(*) FILTER (WHERE gift_type = 'condolence')::INTEGER as condolence,
    COUNT(*) FILTER (WHERE gift_type = 'equipment')::INTEGER as equipment
  FROM gifts
  WHERE receiver_id = p_user_id
    AND is_claimed = FALSE
    AND expires_at > NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 완료 메시지
-- =============================================
DO $$
BEGIN
  RAISE NOTICE 'Gift system migration completed successfully!';
END $$;
