import type { EquipmentBase } from './equipment'

// 선물 유형
export type GiftType = 'condolence' | 'equipment' | 'gold' | 'ticket'

// 묵념 이미지 정의
export interface CondolenceImage {
  id: string
  name: string
  src: string
}

// 묵념 이미지 목록 (5-10개)
export const CONDOLENCE_IMAGES: CondolenceImage[] = [
  { id: 'condolence_01', name: '묵념...', src: '/images/condolence/01.png' },
  { id: 'condolence_02', name: '안타깝습니다', src: '/images/condolence/02.png' },
  { id: 'condolence_03', name: '다음엔 성공!', src: '/images/condolence/03.png' },
  { id: 'condolence_04', name: '힘내세요', src: '/images/condolence/04.png' },
  { id: 'condolence_05', name: 'RIP', src: '/images/condolence/05.png' },
  { id: 'condolence_06', name: '대성통곡', src: '/images/condolence/06.png' },
  { id: 'condolence_07', name: '눈물', src: '/images/condolence/07.png' },
  { id: 'condolence_08', name: '화이팅', src: '/images/condolence/08.png' },
]

export type CondolenceImageId = typeof CONDOLENCE_IMAGES[number]['id']

// 묵념 이미지 ID로 이미지 찾기
export function getCondolenceImage(id: string): CondolenceImage | undefined {
  return CONDOLENCE_IMAGES.find(img => img.id === id)
}

// 장비 선물 데이터 (DB에 저장되는 스냅샷)
export interface GiftEquipmentData {
  equipment_base_id: string
  star_level: number
  consecutive_fails: number
  rarity: string
  potentials: Array<{
    stat: string
    value: number
    isPercentage: boolean
    isLocked: boolean
  }>
}

// DB Row 타입
export interface GiftRow {
  id: string
  sender_id: string
  receiver_id: string
  gift_type: GiftType
  condolence_image_id: string | null
  equipment_data: GiftEquipmentData | null
  gold_amount: number | null
  ticket_level: number | null
  ticket_count: number | null
  message: string | null
  enhancement_history_id: string | null
  is_claimed: boolean
  claimed_at: string | null
  expires_at: string
  created_at: string
  // JOIN된 필드
  sender?: {
    username: string | null
  }
}

// 선물 (프론트엔드 사용)
export interface Gift {
  id: string
  senderId: string
  senderName: string
  receiverId: string
  giftType: GiftType

  // 묵념인 경우
  condolenceImageId?: string
  condolenceImage?: CondolenceImage

  // 장비인 경우
  equipmentData?: GiftEquipmentData
  equipmentBase?: EquipmentBase

  // 골드인 경우
  goldAmount?: number

  // 강화권인 경우
  ticketLevel?: number
  ticketCount?: number

  message?: string
  enhancementHistoryId?: string

  isClaimed: boolean
  claimedAt?: Date
  expiresAt: Date
  createdAt: Date
}

// 미수령 선물 카운트 (헤더 뱃지용)
export interface GiftCount {
  total: number
  condolence: number
  equipment: number
  gold: number
  ticket: number
}

// 선물 보내기 요청 타입
export interface SendCondolenceRequest {
  receiverId: string
  condolenceImageId: string
  message?: string
  enhancementHistoryId?: string
}

export interface SendEquipmentRequest {
  receiverId: string
  equipmentId: string
  message?: string
}

// 유저 검색 결과
export interface UserSearchResult {
  userId: string
  username: string
}

// 남은 시간 계산 (만료까지)
export function getTimeUntilExpiry(expiresAt: Date): string {
  const now = new Date()
  const diff = expiresAt.getTime() - now.getTime()

  if (diff <= 0) return '만료됨'

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

  if (days > 0) return `${days}일 남음`
  if (hours > 0) return `${hours}시간 남음`
  return '곧 만료'
}

// 선물 유형 이름
export const GIFT_TYPE_NAMES: Record<GiftType, string> = {
  condolence: '묵념',
  equipment: '장비',
  gold: '골드',
  ticket: '강화권',
}

// 선물 유형 아이콘
export const GIFT_TYPE_ICONS: Record<GiftType, string> = {
  condolence: '🙏',
  equipment: '🎁',
  gold: '🪙',
  ticket: '🎫',
}
