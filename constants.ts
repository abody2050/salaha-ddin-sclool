
import { UserRole, SchoolClass, User } from './types';

export const SCHOOL_NAME = "مدرسة صلاح الدين الأيوبي – الحصين";

export const INITIAL_ADMINS: User[] = [
  {
    id: 'admin-1',
    name: 'فؤاد محمد بن محمد السائغ',
    username: 'fouad_admin',
    role: UserRole.ADMIN,
    employeeId: 'ADM001'
  },
  {
    id: 'admin-2',
    name: 'أديب علي ناجي',
    username: 'adeeb_vp',
    role: UserRole.ADMIN,
    employeeId: 'ADM002'
  }
];

// Subject Definitions
const BASIC_SUBJECTS = [
  'قرآن', 'تربية إسلامية', 'لغة عربية', 'English', 'رياضيات', 'علوم', 'اجتماعيات'
];

const SECONDARY_SUBJECTS_10 = [
  'قرآن', 'تربية إسلامية', 'لغة عربية', 'English', 'رياضيات', 
  'كيمياء', 'فيزياء', 'أحياء', 'مجتمع', 'جغرافيا', 'تاريخ'
];

const SECONDARY_SUBJECTS_SCIENTIFIC = [
  'قرآن', 'تربية إسلامية', 'لغة عربية', 'English', 'رياضيات', 
  'كيمياء', 'فيزياء', 'أحياء'
];

const generateSubjects = (subjects: string[]) => {
  return subjects.map(name => ({
    subjectName: name,
    teacherName: 'لم يحدد',
    teacherId: ''
  }));
};

export const CLASSES: SchoolClass[] = [
  { id: 'p1', name: 'الأول الابتدائي', level: 'PRIMARY', grade: 1, academicYear: '2025-2026', supervisorName: 'أ. فؤاد السائغ', studentCount: 32, status: 'OPEN', weeklyPeriods: 30, subjects: generateSubjects(BASIC_SUBJECTS) },
  { id: 'p2', name: 'الثاني الابتدائي', level: 'PRIMARY', grade: 2, academicYear: '2025-2026', supervisorName: 'غير محدد', studentCount: 28, status: 'OPEN', weeklyPeriods: 30, subjects: generateSubjects(BASIC_SUBJECTS) },
  { id: 'p3', name: 'الثالث الابتدائي', level: 'PRIMARY', grade: 3, academicYear: '2025-2026', supervisorName: 'غير محدد', studentCount: 30, status: 'OPEN', weeklyPeriods: 30, subjects: generateSubjects(BASIC_SUBJECTS) },
  { id: 'p4', name: 'الرابع الابتدائي', level: 'PRIMARY', grade: 4, academicYear: '2025-2026', supervisorName: 'غير محدد', studentCount: 35, status: 'OPEN', weeklyPeriods: 30, subjects: generateSubjects(BASIC_SUBJECTS) },
  { id: 'p5', name: 'الخامس الابتدائي', level: 'PRIMARY', grade: 5, academicYear: '2025-2026', supervisorName: 'غير محدد', studentCount: 33, status: 'OPEN', weeklyPeriods: 30, subjects: generateSubjects(BASIC_SUBJECTS) },
  { id: 'p6', name: 'السادس الابتدائي', level: 'PRIMARY', grade: 6, academicYear: '2025-2026', supervisorName: 'غير محدد', studentCount: 31, status: 'OPEN', weeklyPeriods: 30, subjects: generateSubjects(BASIC_SUBJECTS) },
  { id: 'm7', name: 'السابع (أول متوسط)', level: 'MIDDLE', grade: 7, academicYear: '2025-2026', supervisorName: 'أ. أديب ناجي', studentCount: 28, status: 'OPEN', weeklyPeriods: 35, subjects: generateSubjects(BASIC_SUBJECTS) },
  { id: 'm8', name: 'الثامن (ثاني متوسط)', level: 'MIDDLE', grade: 8, academicYear: '2025-2026', supervisorName: 'غير محدد', studentCount: 26, status: 'OPEN', weeklyPeriods: 35, subjects: generateSubjects(BASIC_SUBJECTS) },
  { id: 'm9', name: 'التاسع (ثالث متوسط)', level: 'MIDDLE', grade: 9, academicYear: '2025-2026', supervisorName: 'غير محدد', studentCount: 25, status: 'OPEN', weeklyPeriods: 35, subjects: generateSubjects(BASIC_SUBJECTS) },
  { id: 's10', name: 'الأول الثانوي', level: 'SECONDARY', grade: 10, academicYear: '2025-2026', supervisorName: 'أ. سالم اليافعي', studentCount: 24, status: 'OPEN', weeklyPeriods: 38, subjects: generateSubjects(SECONDARY_SUBJECTS_10) },
  { id: 's11', name: 'الثاني الثانوي (علمي)', level: 'SECONDARY', grade: 11, academicYear: '2025-2026', supervisorName: 'غير محدد', studentCount: 22, status: 'OPEN', weeklyPeriods: 38, subjects: generateSubjects(SECONDARY_SUBJECTS_SCIENTIFIC) },
  { id: 's12', name: 'الثالث الثانوي', level: 'SECONDARY', grade: 12, academicYear: '2025-2026', supervisorName: 'غير محدد', studentCount: 20, status: 'OPEN', weeklyPeriods: 38, subjects: generateSubjects(SECONDARY_SUBJECTS_SCIENTIFIC) },
];

export const NAV_ITEMS = {
  [UserRole.ADMIN]: [
    { label: 'لوحة التحكم', icon: 'LayoutDashboard', path: 'dashboard' },
    { label: 'كنترول الاختبارات', icon: 'ShieldCheck', path: 'exam-control' },
    { label: 'الفصول الدراسية', icon: 'LayoutGrid', path: 'classes' },
    { label: 'الطلاب', icon: 'UserCircle', path: 'students' },
    { label: 'المعلمون', icon: 'Users', path: 'teachers' },
    { label: 'الدرجات والنتائج', icon: 'GraduationCap', path: 'grades' },
    { label: 'الحضور والغياب', icon: 'CalendarCheck', path: 'attendance' },
    { label: 'النظام المالي', icon: 'Wallet', path: 'finance' },
    { label: 'إدارة الحسابات', icon: 'Key', path: 'accounts' },
    { label: 'الدعم الفني', icon: 'MessageSquare', path: 'support' },
    { label: 'مركز التنبيهات', icon: 'Bell', path: 'notifications' },
    { label: 'الإعدادات', icon: 'Settings', path: 'settings' },
  ],
  [UserRole.TEACHER]: [
    { label: 'لوحة المعلم', icon: 'LayoutDashboard', path: 'dashboard' },
    { label: 'فصولي', icon: 'LayoutGrid', path: 'classes' },
    { label: 'التحضير اليومي', icon: 'FileText', path: 'prep' },
    { label: 'إدخال الدرجات', icon: 'PenSquare', path: 'grades' },
  ],
  [UserRole.SCOUT]: [
    { label: 'رصد الحضور', icon: 'Camera', path: 'attendance-scan' },
    { label: 'الحضور اليدوي', icon: 'ClipboardList', path: 'attendance-manual' },
  ],
  [UserRole.STUDENT]: [
    { label: 'الرئيسية', icon: 'LayoutDashboard', path: 'dashboard' },
    { label: 'نتائجي الأكاديمية', icon: 'Award', path: 'grades' },
    { label: 'سجل الحضور', icon: 'Clock', path: 'attendance' },
  ],
  [UserRole.PARENT]: [
    { label: 'مستوى الطالب', icon: 'BarChart3', path: 'dashboard' },
    { label: 'الدرجات', icon: 'Award', path: 'grades' },
  ]
};
