// Payment tracking (top-church and habits pages)
export interface PaymentPerson {
  uid: string;
  name: string;
  phone: string;
  group: string;
  team: string;
  activityPrice: number;
  已繳費?: string;
  已領樹?: string;
  [key: string]: unknown;
}

export interface Activity {
  activityName: string;
  activityId: string;
  activityPrice: number;
  data: PaymentPerson[];
}

export type PaymentPersonWithActivity = PaymentPerson & {
  activityName: string;
  activityId: string;
};

// Attendance tracking (sixthsubmit page)
export interface AttendancePerson {
  area: string;
  group: string;
  name: string;
  sessions: Record<number, string>;
}

export interface AttendanceUpdateItem {
  name: string;
  session: number;
}

export interface AttendanceSubmitResultItem {
  name: string;
  session: number;
  success: boolean;
  reason?: string;
}

export interface AttendanceSubmitResult {
  success: boolean;
  results?: AttendanceSubmitResultItem[];
  error?: string;
}

export type PendingChecks = Record<string, boolean>;

// Submit form (submit page)
export type SubmitPersonData = [string, string, string]; // [area, group, name]

export interface SubmissionPayload {
  area: string;
  group: string;
  name: string;
  status: boolean;
  message: string;
}

// Dino game
export interface DinoObstacle {
  x: number;
  w: number;
  h: number;
  type: "cactus" | "tall";
}

export interface DinoCloud {
  x: number;
  y: number;
  w: number;
}

export interface LeaderEntry {
  rank: number;
  name: string;
  score: number;
}
