// Mock data generators for development and demo purposes
import type { AttendeeDwellTime, AutoCheckInLog, BluetoothDevice } from '../types/database';

// ============================================================
// Mock Attendees
// ============================================================
const firstNames = [
  'Sarah', 'Michael', 'Emily', 'James', 'Sophia', 'David', 'Olivia', 'Daniel',
  'Isabella', 'Alexander', 'Mia', 'William', 'Charlotte', 'Benjamin', 'Amelia',
  'Ethan', 'Harper', 'Lucas', 'Ella', 'Mason', 'Aria', 'Logan', 'Chloe', 'Noah',
  'Fatima', 'Omar', 'Yuki', 'Raj', 'Lina', 'Carlos', 'Priya', 'Ahmed', 'Ana',
  'Wei', 'Nadia', 'Jamal', 'Elena', 'Hassan', 'Mei', 'Dmitri', 'Aisha', 'Luis'
];
const lastNames = [
  'Johnson', 'Smith', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Anderson', 'Taylor', 'Thomas', 'Hernandez', 'Moore',
  'Martin', 'Jackson', 'Thompson', 'White', 'Lopez', 'Lee', 'Harris', 'Clark',
  'Kim', 'Singh', 'Patel', 'Nakamura', 'Al-Rashid', 'Chen', 'O\'Brien', 'Müller',
  'Fernandez', 'Tanaka', 'Kowalski', 'Petrov', 'Hassan', 'Santos', 'Johansson'
];
const companies = [
  'TechCorp', 'InnovateLab', 'Digital Dynamics', 'Cloud9 Solutions', 'NextGen AI',
  'DataFlow Inc', 'Quantum Systems', 'FutureStack', 'Vertex Analytics', 'MetaVerse Co',
  'BlockChain Labs', 'Neural Networks Inc', 'CyberSec Pro', 'GreenTech IO', 'RoboTech',
  'StreamLine', 'Byte Academy', 'Pixel Perfect', 'CodeForge', 'Synapse Studios'
];
const positions = [
  'CEO', 'CTO', 'VP of Engineering', 'Product Manager', 'Software Engineer',
  'Data Scientist', 'UX Designer', 'Marketing Director', 'Founder', 'DevOps Engineer',
  'AI Researcher', 'Blockchain Developer', 'Cloud Architect', 'Security Analyst',
  'Head of Innovation', 'Tech Lead', 'Full Stack Developer', 'VP of Sales'
];

const targetAudienceOptions = [
  'Developers', 'Designers', 'Entrepreneurs', 'Students', 'Executives',
  'Data Scientists', 'Product Managers', 'Marketing Professionals',
  'Investors', 'Researchers', 'Startups', 'Enterprise', 'Government',
  'Healthcare Professionals', 'Educators', 'Media & Press'
];

export function getTargetAudienceOptions(): string[] {
  return targetAudienceOptions;
}

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomId(): string {
  return crypto.randomUUID ? crypto.randomUUID() : 
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
}

// ============================================================
// Mock Bluetooth Devices
// ============================================================
export function generateMockBluetoothDevices(eventId: string, count: number = 6): BluetoothDevice[] {
  const zones = [
    { name: 'Main Entrance', type: 'entrance' },
    { name: 'Exit Gate A', type: 'exit' },
    { name: 'Exit Gate B', type: 'exit' },
    { name: 'VIP Lounge', type: 'zone' },
    { name: 'Main Stage', type: 'stage' },
    { name: 'Exhibition Hall', type: 'zone' },
    { name: 'Workshop Room A', type: 'zone' },
    { name: 'Workshop Room B', type: 'zone' },
    { name: 'Sponsor Booth Area', type: 'booth' },
    { name: 'Registration Desk', type: 'entrance' },
  ];

  return zones.slice(0, count).map((zone, i) => ({
    id: randomId(),
    event_id: eventId,
    device_name: `BLE-${zone.name.replace(/\s/g, '-').toUpperCase()}-${String(i + 1).padStart(2, '0')}`,
    device_mac: `AA:BB:CC:DD:EE:${String(i + 1).padStart(2, '0')}`,
    beacon_uuid: `f7826da6-4fa2-4e98-8024-bc5b71e0893e`,
    major: 1,
    minor: i + 1,
    zone_name: zone.name,
    location_type: zone.type,
    floor: i < 5 ? 1 : 2,
    x_position: 10 + (i % 3) * 35,
    y_position: 10 + Math.floor(i / 3) * 40,
    is_active: Math.random() > 0.1,
    last_ping: new Date(Date.now() - Math.random() * 60000).toISOString(),
    created_at: new Date().toISOString(),
  }));
}

// ============================================================
// Mock Auto Check-In Stream (simulates live BLE detections)
// ============================================================
export function generateMockAutoCheckIn(eventId: string): AutoCheckInLog & { user_name: string; user_company: string; ticket_type: string } {
  const ticketTypes = ['general', 'vip', 'speaker', 'staff', 'student', 'press'];
  const detectionTypes: ('bluetooth' | 'geofence' | 'wifi')[] = ['bluetooth', 'geofence', 'bluetooth'];
  
  return {
    id: randomId(),
    event_id: eventId,
    user_id: randomId(),
    beacon_device_id: randomId(),
    detection_type: randomFrom(detectionTypes),
    signal_strength: -(Math.floor(Math.random() * 40) + 30),
    detected_at: new Date().toISOString(),
    confirmed: false,
    confirmed_by: null,
    confirmed_at: null,
    user_name: `${randomFrom(firstNames)} ${randomFrom(lastNames)}`,
    user_company: randomFrom(companies),
    ticket_type: randomFrom(ticketTypes),
  };
}

// ============================================================
// Mock Dwell Time Data
// ============================================================
export function generateMockDwellTimeData(eventId: string, count: number = 50): AttendeeDwellTime[] {
  const ticketTypes = ['general', 'vip', 'speaker', 'staff', 'student', 'press'];
  const roles = ['attendee', 'vip', 'speaker', 'staff'];

  return Array.from({ length: count }, () => {
    const checkIn = new Date(Date.now() - Math.random() * 8 * 60 * 60 * 1000);
    const dwellMinutes = Math.floor(30 + Math.random() * 300);
    const hasCheckedOut = Math.random() > 0.3;
    const checkOut = hasCheckedOut ? new Date(checkIn.getTime() + dwellMinutes * 60 * 1000) : null;
    const ticketType = randomFrom(ticketTypes);
    
    return {
      user_id: randomId(),
      event_id: eventId,
      attendee_name: `${randomFrom(firstNames)} ${randomFrom(lastNames)}`,
      attendee_email: `user${Math.floor(Math.random() * 9999)}@example.com`,
      company: randomFrom(companies),
      ticket_type: ticketType,
      attendee_role: ticketType === 'vip' ? 'vip' : ticketType === 'speaker' ? 'speaker' : ticketType === 'staff' ? 'staff' : randomFrom(roles),
      first_check_in: checkIn.toISOString(),
      last_check_out: checkOut?.toISOString() || null,
      total_check_ins: Math.floor(1 + Math.random() * 3),
      total_check_outs: hasCheckedOut ? Math.floor(1 + Math.random() * 2) : 0,
      dwell_time_minutes: hasCheckedOut ? dwellMinutes : null,
    };
  });
}

// ============================================================
// Mock Registrations with Roles
// ============================================================
export interface MockRegistration {
  id: string;
  user_id: string;
  event_id: string;
  status: string;
  qr_code?: string | null;
  ticket_type: string;
  role: string;
  assigned_zone: string | null;
  notes: string | null;
  registered_at: string;
  checked_in_at: string | null;
  checked_out_at: string | null;
  user_name: string;
  user_email: string;
  user_company: string;
  user_position: string;
  user_avatar_url: string | null;
}

export function generateMockRegistrations(eventId: string, count: number = 80): MockRegistration[] {
  const ticketDistribution = [
    ...Array(Math.floor(count * 0.55)).fill('general'),
    ...Array(Math.floor(count * 0.15)).fill('vip'),
    ...Array(Math.floor(count * 0.1)).fill('speaker'),
    ...Array(Math.floor(count * 0.08)).fill('staff'),
    ...Array(Math.floor(count * 0.07)).fill('student'),
    ...Array(Math.floor(count * 0.05)).fill('press'),
  ];

  while (ticketDistribution.length < count) {
    ticketDistribution.push('general');
  }

  return ticketDistribution.slice(0, count).map((ticketType) => {
    const name = `${randomFrom(firstNames)} ${randomFrom(lastNames)}`;
    const company = randomFrom(companies);
    const hasCheckedIn = Math.random() > 0.35;
    const checkInTime = hasCheckedIn ? new Date(Date.now() - Math.random() * 6 * 60 * 60 * 1000) : null;
    const hasCheckedOut = hasCheckedIn && Math.random() > 0.6;
    const checkOutTime = hasCheckedOut && checkInTime ? new Date(checkInTime.getTime() + (30 + Math.random() * 240) * 60 * 1000) : null;

    return {
      id: randomId(),
      user_id: randomId(),
      event_id: eventId,
      status: 'registered',
      qr_code: `QR-${eventId.slice(0, 8).toUpperCase()}-${randomId().slice(0, 8).toUpperCase()}`,
      ticket_type: ticketType,
      role: ticketType === 'vip' ? 'vip' : ticketType === 'speaker' ? 'speaker' : ticketType === 'staff' ? 'staff' : 'attendee',
      assigned_zone: ticketType === 'vip' ? 'VIP Lounge' : ticketType === 'speaker' ? 'Backstage' : null,
      notes: ticketType === 'speaker' ? 'Keynote speaker' : null,
      registered_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      checked_in_at: checkInTime?.toISOString() || null,
      checked_out_at: checkOutTime?.toISOString() || null,
      user_name: name,
      user_email: `${name.toLowerCase().replace(' ', '.')}@${company.toLowerCase().replace(/\s/g, '')}.com`,
      user_company: company,
      user_position: randomFrom(positions),
      user_avatar_url: null,
    };
  });
}

// ============================================================
// Mock AI Audience Matching
// ============================================================
export interface MockAIMatch {
  id: string;
  attendee_name: string;
  attendee_company: string;
  attendee_interests: string[];
  match_score: number;
  match_reasons: string[];
  suggested_role: string;
}

export function generateMockAIMatches(targetAudience: string[], count: number = 20): MockAIMatch[] {
  const interestPool = [
    'AI/ML', 'Blockchain', 'Cloud Computing', 'DevOps', 'Cybersecurity',
    'Data Science', 'UX Design', 'Product Management', 'Startups', 'IoT',
    'Web3', 'Sustainability', 'FinTech', 'HealthTech', 'EdTech', 'Robotics'
  ];

  return Array.from({ length: count }, () => {
    const interests = Array.from({ length: 2 + Math.floor(Math.random() * 4) }, () => randomFrom(interestPool));
    const uniqueInterests = [...new Set(interests)];
    const matchingCount = targetAudience.filter(t => uniqueInterests.some(i => i.toLowerCase().includes(t.toLowerCase()) || t.toLowerCase().includes(i.toLowerCase()))).length;
    const score = Math.min(0.95, 0.3 + matchingCount * 0.15 + Math.random() * 0.3);
    
    const reasons: string[] = [];
    if (matchingCount > 0) reasons.push(`Matches ${matchingCount} target audience criteria`);
    if (score > 0.8) reasons.push('Highly relevant professional background');
    if (Math.random() > 0.5) reasons.push('Active in similar events');
    if (Math.random() > 0.6) reasons.push('Connected to existing attendees');
    reasons.push(`Interest overlap: ${uniqueInterests.slice(0, 2).join(', ')}`);

    return {
      id: randomId(),
      attendee_name: `${randomFrom(firstNames)} ${randomFrom(lastNames)}`,
      attendee_company: randomFrom(companies),
      attendee_interests: uniqueInterests,
      match_score: Math.round(score * 100) / 100,
      match_reasons: reasons,
      suggested_role: score > 0.85 ? 'vip' : score > 0.7 ? 'speaker' : 'attendee',
    };
  }).sort((a, b) => b.match_score - a.match_score);
}

// ============================================================
// Mock 3D Venue Map Data
// ============================================================
export interface VenueZone3D {
  id: string;
  name: string;
  type: 'hall' | 'room' | 'stage' | 'booth' | 'lounge' | 'entrance' | 'exit' | 'restroom' | 'food';
  floor: number;
  x: number;
  y: number;
  width: number;
  height: number;
  capacity: number;
  currentOccupancy: number;
  color: string;
}

export function generateMockVenueZones(): VenueZone3D[] {
  return [
    { id: '1', name: 'Main Stage', type: 'stage', floor: 1, x: 30, y: 10, width: 40, height: 25, capacity: 500, currentOccupancy: 342, color: '#4654A1' },
    { id: '2', name: 'Exhibition Hall A', type: 'hall', floor: 1, x: 5, y: 40, width: 30, height: 20, capacity: 300, currentOccupancy: 189, color: '#10b981' },
    { id: '3', name: 'Exhibition Hall B', type: 'hall', floor: 1, x: 40, y: 40, width: 30, height: 20, capacity: 250, currentOccupancy: 156, color: '#3b82f6' },
    { id: '4', name: 'Workshop Room 1', type: 'room', floor: 2, x: 5, y: 10, width: 20, height: 15, capacity: 50, currentOccupancy: 38, color: '#f59e0b' },
    { id: '5', name: 'Workshop Room 2', type: 'room', floor: 2, x: 30, y: 10, width: 20, height: 15, capacity: 50, currentOccupancy: 44, color: '#f59e0b' },
    { id: '6', name: 'VIP Lounge', type: 'lounge', floor: 2, x: 55, y: 10, width: 20, height: 15, capacity: 80, currentOccupancy: 52, color: '#8b5cf6' },
    { id: '7', name: 'Main Entrance', type: 'entrance', floor: 1, x: 75, y: 40, width: 15, height: 12, capacity: 100, currentOccupancy: 23, color: '#6366f1' },
    { id: '8', name: 'Food Court', type: 'food', floor: 1, x: 5, y: 65, width: 25, height: 15, capacity: 200, currentOccupancy: 87, color: '#ec4899' },
    { id: '9', name: 'Sponsor Booths', type: 'booth', floor: 1, x: 35, y: 65, width: 30, height: 15, capacity: 150, currentOccupancy: 93, color: '#14b8a6' },
    { id: '10', name: 'Networking Area', type: 'lounge', floor: 1, x: 70, y: 65, width: 20, height: 15, capacity: 120, currentOccupancy: 67, color: '#f97316' },
    { id: '11', name: 'Speaker Green Room', type: 'room', floor: 2, x: 5, y: 35, width: 15, height: 10, capacity: 20, currentOccupancy: 8, color: '#84cc16' },
    { id: '12', name: 'Press Room', type: 'room', floor: 2, x: 25, y: 35, width: 15, height: 10, capacity: 30, currentOccupancy: 12, color: '#06b6d4' },
  ];
}
