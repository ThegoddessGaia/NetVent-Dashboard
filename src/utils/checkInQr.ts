export type CheckInQrPayload = {
  t?: string;
  v?: number;
  userId?: string;
  eventId?: string;
  role?: string;
  badgeId?: string | null;
};

export type ParsedCheckInQr =
  | {
      kind: 'structured';
      raw: string;
      payload: CheckInQrPayload;
    }
  | {
      kind: 'legacy';
      raw: string;
    };

export const parseCheckInQrValue = (value: string): ParsedCheckInQr => {
  const raw = value.trim();

  try {
    const parsed = JSON.parse(raw) as CheckInQrPayload;
    if (parsed && typeof parsed === 'object') {
      const hasRegistrationShape =
        (parsed.t === 'badge' && parsed.v === 1 && typeof parsed.userId === 'string' && typeof parsed.eventId === 'string') ||
        (typeof parsed.userId === 'string' && typeof parsed.eventId === 'string');

      if (hasRegistrationShape) {
        return {
          kind: 'structured',
          raw,
          payload: parsed,
        };
      }
    }
  } catch {
    // Fall back to legacy raw QR lookup.
  }

  return {
    kind: 'legacy',
    raw,
  };
};
