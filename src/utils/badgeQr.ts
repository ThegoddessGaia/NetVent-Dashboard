import type { RegistrationRole, BadgeType } from '../types/database';

export type BadgeQrRole = 'attendee' | 'speaker' | 'vip';

type BuildBadgeQrPayloadInput = {
  userId: string;
  eventId: string;
  role: BadgeQrRole;
  badgeId?: string | null;
};

export const normalizeRegistrationRole = (
  role: RegistrationRole | string | null | undefined,
  ticketType?: string | null
): BadgeQrRole => {
  if (role === 'vip' || ticketType === 'vip') return 'vip';
  if (role === 'speaker' || ticketType === 'speaker') return 'speaker';
  return 'attendee';
};

export const mapBadgeTypeToQrRole = (badgeType: BadgeType): BadgeQrRole | null => {
  if (badgeType === 'vip') return 'vip';
  if (badgeType === 'speaker') return 'speaker';
  if (badgeType === 'attendance') return 'attendee';
  return null;
};

export const buildBadgeQrPayload = ({ userId, eventId, role, badgeId }: BuildBadgeQrPayloadInput): string => {
  return JSON.stringify({
    t: 'badge',
    v: 1,
    userId,
    eventId,
    role,
    badgeId: badgeId ?? null,
  });
};
