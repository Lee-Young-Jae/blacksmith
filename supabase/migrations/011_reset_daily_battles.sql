-- =============================================
-- 일일 대전 횟수 초기화
-- 초기화 시간 변경 (UTC → KST 자정) 적용을 위해 실행
-- =============================================

-- 오늘 날짜의 모든 대전 기록 삭제 (새로 시작)
DELETE FROM daily_battles;

-- 확인
DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Daily battles reset: % records deleted', deleted_count;
END $$;
