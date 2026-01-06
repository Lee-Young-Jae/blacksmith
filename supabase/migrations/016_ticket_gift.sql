-- =============================================
-- 강화권 선물 시스템 마이그레이션
-- 관리자가 유저에게 강화권을 선물할 수 있도록 확장
-- =============================================

-- 1. gifts 테이블에 강화권 관련 컬럼 추가
ALTER TABLE gifts ADD COLUMN IF NOT EXISTS ticket_level INTEGER DEFAULT NULL;
ALTER TABLE gifts ADD COLUMN IF NOT EXISTS ticket_count INTEGER DEFAULT NULL;

-- 2. gift_type enum에 'ticket' 추가를 위해 체크 제약조건 수정
-- (PostgreSQL에서는 체크 제약조건 기반 enum을 사용하는 경우)
-- 먼저 기존 체크 제약조건이 있다면 제거하고 새로 추가
DO $$
BEGIN
  -- 기존 gift_type 체크 제약조건 제거 시도
  ALTER TABLE gifts DROP CONSTRAINT IF EXISTS gifts_gift_type_check;
EXCEPTION
  WHEN undefined_object THEN
    NULL;
END $$;

-- gift_type 체크 제약조건 추가 (ticket 포함)
ALTER TABLE gifts ADD CONSTRAINT gifts_gift_type_check
  CHECK (gift_type IN ('condolence', 'equipment', 'gold', 'ticket'));

-- 3. 강화권 선물 전송 함수 (관리자 전용)
CREATE OR REPLACE FUNCTION send_ticket_gift(
  p_admin_id UUID,
  p_receiver_id UUID,
  p_ticket_level INTEGER,
  p_ticket_count INTEGER,
  p_message TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_gift_id UUID;
BEGIN
  -- 관리자 권한 확인
  SELECT is_admin INTO v_is_admin
  FROM user_profiles
  WHERE id = p_admin_id;

  IF v_is_admin IS NOT TRUE THEN
    RAISE EXCEPTION 'Only admins can send ticket gifts';
  END IF;

  -- 유효성 검사
  IF p_ticket_level < 1 OR p_ticket_level > 25 THEN
    RAISE EXCEPTION 'Ticket level must be between 1 and 25';
  END IF;

  IF p_ticket_count < 1 THEN
    RAISE EXCEPTION 'Ticket count must be at least 1';
  END IF;

  -- 받는 사람 존재 확인
  IF NOT EXISTS (SELECT 1 FROM user_profiles WHERE id = p_receiver_id) THEN
    RAISE EXCEPTION 'Receiver not found';
  END IF;

  -- 선물 생성
  INSERT INTO gifts (
    sender_id,
    receiver_id,
    gift_type,
    ticket_level,
    ticket_count,
    message,
    expires_at
  )
  VALUES (
    p_admin_id,
    p_receiver_id,
    'ticket',
    p_ticket_level,
    p_ticket_count,
    p_message,
    NOW() + INTERVAL '30 days'
  )
  RETURNING id INTO v_gift_id;

  RETURN v_gift_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. 강화권 선물 수령 함수
CREATE OR REPLACE FUNCTION claim_ticket_gift(
  p_gift_id UUID,
  p_user_id UUID
)
RETURNS TABLE (
  ticket_level INTEGER,
  ticket_count INTEGER
) AS $$
DECLARE
  v_gift RECORD;
BEGIN
  -- 선물 확인
  SELECT * INTO v_gift
  FROM gifts
  WHERE id = p_gift_id
    AND receiver_id = p_user_id
    AND gift_type = 'ticket'
    AND is_claimed = FALSE
    AND expires_at > NOW();

  IF v_gift IS NULL THEN
    RAISE EXCEPTION 'Gift not found or already claimed';
  END IF;

  -- 강화권 지급
  PERFORM add_enhancement_tickets(
    p_user_id,
    v_gift.ticket_level,
    v_gift.ticket_count
  );

  -- 수령 처리
  UPDATE gifts
  SET is_claimed = TRUE, claimed_at = NOW()
  WHERE id = p_gift_id;

  RETURN QUERY SELECT v_gift.ticket_level, v_gift.ticket_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. 미수령 선물 카운트 함수 업데이트 (ticket 포함)
CREATE OR REPLACE FUNCTION get_unclaimed_gift_count(p_user_id UUID)
RETURNS TABLE (
  total INTEGER,
  condolence INTEGER,
  equipment INTEGER,
  gold INTEGER,
  ticket INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INTEGER as total,
    COUNT(*) FILTER (WHERE gift_type = 'condolence')::INTEGER as condolence,
    COUNT(*) FILTER (WHERE gift_type = 'equipment')::INTEGER as equipment,
    COUNT(*) FILTER (WHERE gift_type = 'gold')::INTEGER as gold,
    COUNT(*) FILTER (WHERE gift_type = 'ticket')::INTEGER as ticket
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
  RAISE NOTICE 'Ticket gift system migration completed successfully!';
END $$;
