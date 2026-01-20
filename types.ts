
export enum UserRole {
  ADMIN = 'ADMIN',
  TEACHER = 'TEACHER',
  SCOUT = 'SCOUT',
  STUDENT = 'STUDENT',
  PARENT = 'PARENT'
}

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE'
}

export enum AttendanceStatus {
  PRESENT = 'PRESENT',
  ABSENT = 'ABSENT',
  LATE = 'LATE',
  EXCUSED = 'EXCUSED',
  ESCAPED = 'ESCAPED'
}

export type EscapePeriod = 'P1' | 'P2' | 'P3' | 'P4' | 'P5' | 'P6' | 'P7' | 'GENERAL';

export interface AttendanceEntry {
  studentId: string;
  status: AttendanceStatus;
  note?: string;
  escapePeriod?: EscapePeriod;
  escapePeriods?: EscapePeriod[];
  updatedAt: string;
  updatedBy: string; 
  updatedByRole: UserRole;
  isAdminEdit?: boolean;
}

export interface AttendanceDay {
  id: string;
  classId: string;
  date: string; 
  isLockedByAdmin: boolean;
  records: Record<string, AttendanceEntry>;
  lastSync: string;
  syncedBy?: string;
}

export interface SystemConfig {
  schoolName: string;
  academicYear: string;
  maintenanceMessage: string;
  activeMonths: AcademicMonth[];
  attendanceConfig: {
    weekends: number[]; 
    editableDaysForScout: 'TODAY' | 'YESTERDAY' | '2DAYS' | 'WEEK' | 'OPEN' | 'LOCKED';
    scoutCanOverrideAdmin: boolean;
    defaultAllPresentOnNoSync: boolean;
  };
  features: {
    aiInsights: boolean;
    financeSystem: boolean;
    attendanceScanner: boolean;
    digitalLibrary: boolean;
    parentPortal: boolean;
    gradingSystem: boolean;
    teacherPrep: boolean;
    examControl: boolean;
  };
  permissions: {
    teachersCanEditGrades: boolean;
    scoutsCanEditAttendance: boolean;
    studentsCanSeeRankings: boolean;
  };
  theme: 'emerald' | 'blue' | 'indigo' | 'rose' | 'dark';
  maintenanceMode: boolean;
  globalAnnouncement: string;
}

export interface AcademicMonth {
  gregorian: string;
  hijri: string;
}

// --- Exam Control Interfaces ---

export interface ExamHall {
  id: string;
  name: string;
  capacity: number;
  location?: string;
}

export interface ExamSession {
  id: string;
  name: string; // "الفترة الأولى", "الفترة الثانية"
  startTime: string;
  endTime: string;
  assignedClassIds: string[];
}

export interface ExamPeriod {
  id: string;
  name: string; // مثلاً "اختبارات الفصل الأول 2025"
  type: 'MONTHLY' | 'MIDTERM' | 'FINAL';
  startDate: string;
  endDate: string;
  academicYear: string;
  status: 'ACTIVE' | 'ARCHIVED';
  sessions: ExamSession[];
}

export interface StudentExamRecord {
  // Fix: Added id property to resolve type errors in ExamControlView
  id?: string;
  studentId: string;
  studentName: string;
  classId: string;
  seatNumber: string;
  hallId: string;
  secretCode?: string;
  marks: Record<string, number>; // subjectName: mark
}

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  category: 'SECURITY' | 'GRADES' | 'STAFF' | 'SYSTEM' | 'PREP' | 'FINANCE' | 'ATTENDANCE' | 'EXAMS';
  timestamp: string;
  details?: string;
}

export type JobTitle = 'PRINCIPAL' | 'VICE_PRINCIPAL' | 'TEACHER' | 'ADMIN_STAFF';

export interface TeachingAssignment {
  subjectName: string;
  classIds: string[];
}

export interface User {
  id: string;
  name: string;
  username: string;
  role: UserRole;
  employeeId?: string;
  parentPhone?: string;
}

export interface StaffMember extends User {
  jobTitle: JobTitle;
  isTeaching: boolean;
  assignments: TeachingAssignment[];
  isVolunteer: boolean;
  joinDate: string;
  avatarColor: string;
  status: 'ACTIVE' | 'INACTIVE';
  password?: string;
  phone?: string;
  gender: Gender;
  canManualOverrideTotal?: boolean;
}

export interface Student extends User {
  fullName: string;
  classId: string;
  studentCode: string;
  gender: 'MALE' | 'FEMALE';
  status: 'ACTIVE' | 'TRANSFERRED' | 'ARCHIVED' | 'INACTIVE' | 'LATE_FEES';
  isScout: boolean;
  scoutPin?: string;
  birthDate: string;
  avatarColor: string;
  avatarUrl?: string;
  parentPhone: string;
  grade: number;
  assignedClasses?: string[];
}

export interface SchoolClass {
  id: string;
  name: string;
  level: 'PRIMARY' | 'MIDDLE' | 'SECONDARY';
  grade: number;
  academicYear: string;
  supervisorName: string;
  studentCount: number;
  status: 'OPEN' | 'LOCKED';
  weeklyPeriods: number;
  subjects: {
    subjectName: string;
    teacherName: string;
    teacherId: string;
  }[];
}

export interface GradeEntry {
  homework?: number;
  attendance?: number;
  oral?: number;
  written?: number;
  total?: number;
  finalScore?: number;
}

export interface StudentGradeRecord {
  id?: string;
  studentId: string;
  classId: string;
  subjectName: string;
  months: Record<string, GradeEntry>;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'SYSTEM' | 'GRADE_ENTRY' | 'ATTENDANCE' | 'SECURITY';
  from: string;
  createdAt: string;
  isRead: boolean;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  text: string;
  timestamp: string;
  isRead: boolean;
  replyToId?: string;
}
