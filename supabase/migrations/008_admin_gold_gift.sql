-- =============================================
-- 운영자 골드 지급 시스템 마이그레이션
-- =============================================

-- =============================================
-- 1. user_profiles에 관리자 플래그 추가
-- =============================================
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;

-- =============================================
-- 2. gifts 테이블에 골드 지원 추가
-- =============================================
-- 골드 금액 컬럼 추가
ALTER TABLE gifts
ADD COLUMN IF NOT EXISTS gold_amount INTEGER;

-- gift_type 체크 제약조건 업데이트 (기존 제약조건 삭제 후 재생성)
ALTER TABLE gifts DROP CONSTRAINT IF EXISTS gifts_gift_type_check;
ALTER TABLE gifts ADD CONSTRAINT gifts_gift_type_check
  CHECK (gift_type IN ('condolence', 'equipment', 'gold'));

-- 골드 선물 유효성 검사
ALTER TABLE gifts ADD CONSTRAINT gifts_gold_amount_check
  CHECK (
    (gift_type = 'gold' AND gold_amount > 0) OR
    (gift_type != 'gold' AND gold_amount IS NULL)
  );

-- =============================================
-- 3. 관리자 전용 골드 선물 RLS 정책
-- =============================================
-- 관리자만 골드 선물 생성 가능
CREATE POLICY "Admins can send gold gifts"
  ON gifts FOR INSERT
  WITH CHECK (
    gift_type = 'gold'
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

-- =============================================
-- 4. 골드 선물 함수 (관리자 전용)
-- =============================================
CREATE OR REPLACE FUNCTION send_gold_gift(
  p_admin_id UUID,
  p_receiver_id UUID,
  p_gold_amount INTEGER,
  p_message VARCHAR(200) DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_gift_id UUID;
BEGIN
  -- 1. 관리자 권한 확인
  SELECT is_admin INTO v_is_admin
  FROM user_profiles
  WHERE id = p_admin_id;

  IF v_is_admin IS NOT TRUE THEN
    RAISE EXCEPTION 'Only admins can send gold gifts';
  END IF;

  -- 2. 금액 유효성 검사
  IF p_gold_amount <= 0 THEN
    RAISE EXCEPTION 'Gold amount must be positive';
  END IF;

  -- 3. 수신자 존재 확인
  IF NOT EXISTS (SELECT 1 FROM user_profiles WHERE id = p_receiver_id) THEN
    RAISE EXCEPTION 'Receiver not found';
  END IF;

  -- 4. 선물 레코드 생성
  INSERT INTO gifts (
    sender_id,
    receiver_id,
    gift_type,
    gold_amount,
    message
  ) VALUES (
    p_admin_id,
    p_receiver_id,
    'gold',
    p_gold_amount,
    p_message
  )
  RETURNING id INTO v_gift_id;

  RETURN v_gift_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 5. 골드 선물 수령 함수
-- =============================================
CREATE OR REPLACE FUNCTION claim_gold_gift(
  p_gift_id UUID,
  p_user_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  v_gift RECORD;
  v_gold_amount INTEGER;
BEGIN
  -- 1. 선물 확인
  SELECT * INTO v_gift
  FROM gifts
  WHERE id = p_gift_id
    AND receiver_id = p_user_id
    AND gift_type = 'gold'
    AND is_claimed = FALSE
    AND expires_at > NOW();

  IF v_gift IS NULL THEN
    RAISE EXCEPTION 'Gift not found, already claimed, or expired';
  END IF;

  v_gold_amount := v_gift.gold_amount;

  -- 2. 유저 골드 증가
  UPDATE user_profiles
  SET gold = gold + v_gold_amount
  WHERE id = p_user_id;

  -- 3. 선물 수령 처리
  UPDATE gifts
  SET is_claimed = TRUE, claimed_at = NOW()
  WHERE id = p_gift_id;

  RETURN v_gold_amount;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 6. 미수령 선물 개수 함수 업데이트 (골드 포함)
-- =============================================
-- 기존 함수 삭제 (반환 타입 변경을 위해)
DROP FUNCTION IF EXISTS get_unclaimed_gift_count(UUID);

CREATE OR REPLACE FUNCTION get_unclaimed_gift_count(p_user_id UUID)
RETURNS TABLE (
  total INTEGER,
  condolence INTEGER,
  equipment INTEGER,
  gold INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INTEGER as total,
    COUNT(*) FILTER (WHERE gift_type = 'condolence')::INTEGER as condolence,
    COUNT(*) FILTER (WHERE gift_type = 'equipment')::INTEGER as equipment,
    COUNT(*) FILTER (WHERE gift_type = 'gold')::INTEGER as gold
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
  RAISE NOTICE 'Admin gold gift system migration completed successfully!';
END $$;
