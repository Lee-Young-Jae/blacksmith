// 레퍼럴 상태
export type ReferralStatus = 'pending' | 'completed'

// 레퍼럴 보상 설정
export const REFERRAL_REWARDS = {
  referrer: {
    gold: 50000,
    ticketLevel: 15,
    ticketCount: 3,
  },
  referee: {
    gold: 30000,
    ticketLevel: 10,
    ticketCount: 5,
  },
} as const

// DB Row 타입
export interface ReferralRow {
  id: string
  referrer_id: string
  referee_id: string
  status: ReferralStatus
  referrer_rewarded: boolean
  referee_rewarded: boolean
  created_at: string
  completed_at: string | null
}

// 내가 초대한 친구 (get_my_referrals 결과)
export interface MyReferral {
  id: string
  refereeId: string
  refereeName: string
  status: ReferralStatus
  referrerRewarded: boolean
  createdAt: Date
  completedAt: Date | null
}

// 나를 초대한 친구 (get_my_referrer 결과)
export interface MyReferrer {
  referralId: string
  referrerId: string
  referrerName: string
  status: ReferralStatus
  refereeRewarded: boolean
  createdAt: Date
}

// RPC 응답 타입
export interface MyReferralRow {
  id: string
  referee_id: string
  referee_username: string | null
  status: ReferralStatus
  referrer_rewarded: boolean
  created_at: string
  completed_at: string | null
}

export interface MyReferrerRow {
  referral_id: string
  referrer_id: string
  referrer_username: string | null
  status: ReferralStatus
  referee_rewarded: boolean
  created_at: string
}

// Row를 프론트엔드 타입으로 변환
export function toMyReferral(row: MyReferralRow): MyReferral {
  return {
    id: row.id,
    refereeId: row.referee_id,
    refereeName: row.referee_username ?? '알 수 없음',
    status: row.status,
    referrerRewarded: row.referrer_rewarded,
    createdAt: new Date(row.created_at),
    completedAt: row.completed_at ? new Date(row.completed_at) : null,
  }
}

export function toMyReferrer(row: MyReferrerRow): MyReferrer {
  return {
    referralId: row.referral_id,
    referrerId: row.referrer_id,
    referrerName: row.referrer_username ?? '알 수 없음',
    status: row.status,
    refereeRewarded: row.referee_rewarded,
    createdAt: new Date(row.created_at),
  }
}

// 상태별 표시 텍스트
export const REFERRAL_STATUS_TEXT: Record<ReferralStatus, string> = {
  pending: '대기 중',
  completed: '완료',
}

// 상태별 색상 (Tailwind 클래스)
export const REFERRAL_STATUS_COLOR: Record<ReferralStatus, string> = {
  pending: 'text-yellow-400',
  completed: 'text-green-400',
}
