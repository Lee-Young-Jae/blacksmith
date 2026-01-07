-- =============================================
-- 친구 초대(레퍼럴) 시스템 마이그레이션
-- 초대자와 피초대자 모두에게 골드 + 강화권 보상 지급
-- =============================================

-- =============================================
-- 1. user_profiles 테이블 확장
-- =============================================
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS referral_code VARCHAR(8) UNIQUE,
ADD COLUMN IF NOT EXISTS has_first_enhancement BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_user_profiles_referral_code
ON user_profiles(referral_code);

-- =============================================
-- 2. referrals 테이블 생성
-- =============================================
CREATE TABLE IF NOT EXISTS referrals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- 초대자 (레퍼럴 코드 소유자)
  referrer_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,

  -- 피초대자 (새로 가입한 유저)
  referee_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,

  -- 레퍼럴 상태: pending (대기), completed (완료)
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed')),

  -- 보상 지급 여부
  referrer_rewarded BOOLEAN NOT NULL DEFAULT FALSE,
  referee_rewarded BOOLEAN NOT NULL DEFAULT FALSE,

  -- 타임스탬프
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  -- 한 유저는 한 번만 피초대자가 될 수 있음
  CONSTRAINT unique_referee UNIQUE (referee_id),

  -- 자기 자신 초대 방지
  CONSTRAINT no_self_referral CHECK (referrer_id != referee_id)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id, status);
CREATE INDEX IF NOT EXISTS idx_referrals_referee ON referrals(referee_id);
CREATE INDEX IF NOT EXISTS idx_referrals_pending ON referrals(status) WHERE status = 'pending';

-- =============================================
-- 3. RLS 정책
-- =============================================
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- 자신이 초대한 목록 조회
CREATE POLICY "Users can read their referrals as referrer"
  ON referrals FOR SELECT
  USING (auth.uid() = referrer_id);

-- 자신이 피초대자인 레퍼럴 조회
CREATE POLICY "Users can read their referrals as referee"
  ON referrals FOR SELECT
  USING (auth.uid() = referee_id);

-- =============================================
-- 4. 레퍼럴 코드 생성 함수
-- =============================================
CREATE OR REPLACE FUNCTION generate_referral_code(p_user_id UUID)
RETURNS VARCHAR(8) AS $$
DECLARE
  v_code VARCHAR(8);
  v_exists BOOLEAN;
BEGIN
  -- 이미 코드가 있는지 확인
  SELECT referral_code INTO v_code
  FROM user_profiles
  WHERE id = p_user_id;

  IF v_code IS NOT NULL THEN
    RETURN v_code;
  END IF;

  -- 유니크한 코드 생성 (최대 10회 시도)
  FOR i IN 1..10 LOOP
    -- 8자리 대문자 + 숫자 코드 생성
    v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

    SELECT EXISTS(SELECT 1 FROM user_profiles WHERE referral_code = v_code) INTO v_exists;

    IF NOT v_exists THEN
      UPDATE user_profiles
      SET referral_code = v_code
      WHERE id = p_user_id;

      RETURN v_code;
    END IF;
  END LOOP;

  RAISE EXCEPTION 'Failed to generate unique referral code';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 5. 레퍼럴 코드 적용 함수 (회원가입 시 호출)
-- =============================================
CREATE OR REPLACE FUNCTION apply_referral_code(
  p_referee_id UUID,
  p_referral_code VARCHAR(8)
)
RETURNS UUID AS $$
DECLARE
  v_referrer_id UUID;
  v_referral_id UUID;
BEGIN
  -- 코드가 없으면 무시
  IF p_referral_code IS NULL OR p_referral_code = '' THEN
    RETURN NULL;
  END IF;

  -- 초대자 찾기
  SELECT id INTO v_referrer_id
  FROM user_profiles
  WHERE referral_code = upper(p_referral_code)
    AND id != p_referee_id;

  IF v_referrer_id IS NULL THEN
    RETURN NULL; -- 유효하지 않은 코드는 조용히 무시
  END IF;

  -- 이미 레퍼럴 관계가 있는지 확인
  IF EXISTS (SELECT 1 FROM referrals WHERE referee_id = p_referee_id) THEN
    RETURN NULL;
  END IF;

  -- 레퍼럴 관계 생성
  INSERT INTO referrals (referrer_id, referee_id)
  VALUES (v_referrer_id, p_referee_id)
  RETURNING id INTO v_referral_id;

  RETURN v_referral_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 6. 첫 강화 완료 시 레퍼럴 보상 지급 함수
-- =============================================
CREATE OR REPLACE FUNCTION complete_referral_reward(p_referee_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_referral RECORD;
  v_already_enhanced BOOLEAN;

  -- 보상 설정 (상수)
  c_referrer_gold INTEGER := 50000;
  c_referrer_ticket_level INTEGER := 15;
  c_referrer_ticket_count INTEGER := 3;
  c_referee_gold INTEGER := 30000;
  c_referee_ticket_level INTEGER := 10;
  c_referee_ticket_count INTEGER := 5;
BEGIN
  -- 이미 첫 강화를 했는지 확인
  SELECT has_first_enhancement INTO v_already_enhanced
  FROM user_profiles
  WHERE id = p_referee_id;

  IF v_already_enhanced THEN
    RETURN FALSE; -- 이미 처리됨
  END IF;

  -- 첫 강화 플래그 업데이트
  UPDATE user_profiles
  SET has_first_enhancement = TRUE
  WHERE id = p_referee_id;

  -- 레퍼럴 관계 확인
  SELECT * INTO v_referral
  FROM referrals
  WHERE referee_id = p_referee_id
    AND status = 'pending';

  IF v_referral IS NULL THEN
    RETURN FALSE; -- 레퍼럴 관계 없음
  END IF;

  -- 초대자에게 골드 선물 생성
  INSERT INTO gifts (sender_id, receiver_id, gift_type, gold_amount, message)
  VALUES (
    p_referee_id,
    v_referral.referrer_id,
    'gold',
    c_referrer_gold,
    '친구 초대 보상: 초대한 친구가 첫 강화를 완료했습니다!'
  );

  -- 초대자에게 강화권 선물 생성
  INSERT INTO gifts (sender_id, receiver_id, gift_type, ticket_level, ticket_count, message)
  VALUES (
    p_referee_id,
    v_referral.referrer_id,
    'ticket',
    c_referrer_ticket_level,
    c_referrer_ticket_count,
    '친구 초대 보상: ' || c_referrer_ticket_level || '성 강화권 ' || c_referrer_ticket_count || '개'
  );

  -- 피초대자에게 골드 선물 생성
  INSERT INTO gifts (sender_id, receiver_id, gift_type, gold_amount, message)
  VALUES (
    v_referral.referrer_id,
    p_referee_id,
    'gold',
    c_referee_gold,
    '친구 초대 보상: 첫 강화 완료!'
  );

  -- 피초대자에게 강화권 선물 생성
  INSERT INTO gifts (sender_id, receiver_id, gift_type, ticket_level, ticket_count, message)
  VALUES (
    v_referral.referrer_id,
    p_referee_id,
    'ticket',
    c_referee_ticket_level,
    c_referee_ticket_count,
    '친구 초대 보상: ' || c_referee_ticket_level || '성 강화권 ' || c_referee_ticket_count || '개'
  );

  -- 레퍼럴 상태 업데이트
  UPDATE referrals
  SET
    status = 'completed',
    referrer_rewarded = TRUE,
    referee_rewarded = TRUE,
    completed_at = NOW()
  WHERE id = v_referral.id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 7. 레퍼럴 현황 조회 함수
-- =============================================
CREATE OR REPLACE FUNCTION get_my_referrals(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  referee_id UUID,
  referee_username VARCHAR(50),
  status VARCHAR(20),
  referrer_rewarded BOOLEAN,
  created_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id,
    r.referee_id,
    up.username as referee_username,
    r.status,
    r.referrer_rewarded,
    r.created_at,
    r.completed_at
  FROM referrals r
  JOIN user_profiles up ON up.id = r.referee_id
  WHERE r.referrer_id = p_user_id
  ORDER BY r.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 8. 내 레퍼럴 정보 조회 (피초대자 입장)
-- =============================================
CREATE OR REPLACE FUNCTION get_my_referrer(p_user_id UUID)
RETURNS TABLE (
  referral_id UUID,
  referrer_id UUID,
  referrer_username VARCHAR(50),
  status VARCHAR(20),
  referee_rewarded BOOLEAN,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id as referral_id,
    r.referrer_id,
    up.username as referrer_username,
    r.status,
    r.referee_rewarded,
    r.created_at
  FROM referrals r
  JOIN user_profiles up ON up.id = r.referrer_id
  WHERE r.referee_id = p_user_id
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 9. 강화 성공 시 자동 레퍼럴 보상 트리거
-- =============================================
CREATE OR REPLACE FUNCTION on_enhancement_success()
RETURNS TRIGGER AS $$
BEGIN
  -- star_level이 0에서 1 이상으로 증가한 경우 (첫 강화)
  IF OLD.star_level = 0 AND NEW.star_level > 0 THEN
    -- 레퍼럴 보상 체크 및 지급
    PERFORM complete_referral_reward(NEW.user_id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 트리거 생성 (user_equipment 업데이트 시)
DROP TRIGGER IF EXISTS trigger_enhancement_success ON user_equipment;
CREATE TRIGGER trigger_enhancement_success
  AFTER UPDATE OF star_level ON user_equipment
  FOR EACH ROW
  WHEN (OLD.star_level < NEW.star_level)
  EXECUTE FUNCTION on_enhancement_success();

-- =============================================
-- 완료 메시지
-- =============================================
DO $$
BEGIN
  RAISE NOTICE 'Referral system migration completed successfully!';
END $$;
