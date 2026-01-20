
import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Login } from './views/Login';
import { AdminDashboard } from './views/AdminDashboard';
import { AttendanceScanner } from './views/AttendanceScanner';
import { AttendanceManualView } from './views/AttendanceManualView';
import { TeacherPrepView } from './views/TeacherPrepView';
import { StudentView } from './views/StudentView';
import { StudentsManagementView } from './views/StudentsManagementView';
import { ClassesManagementView } from './views/ClassesManagementView';
import { TeachersManagementView } from './views/TeachersManagementView';
import { FinanceManagementView } from './views/FinanceManagementView';
import { GradesManagementView } from './views/GradesManagementView';
import { SettingsView } from './views/SettingsView';
import { TeacherPortalView } from './views/TeacherPortalView';
import { ParentPortalView } from './views/ParentPortalView';
import { ScoutPortalView } from './views/ScoutPortalView';
import { AccountsManagementView } from './views/AccountsManagementView';
import { TechnicalSupportView } from './views/TechnicalSupportView';
import { NotificationsCenterView } from './views/NotificationsCenterView';
import { ExamControlView } from './views/ExamControlView';
import { User, UserRole, StaffMember, Gender, Student, SystemConfig } from './types';
import { CLASSES } from './constants';
import { ShieldAlert, RefreshCw, LogOut } from 'lucide-react';
import { 
  fetchCollection, 
  getSystemConfig, 
  seedInitialData, 
  saveSystemConfig 
} from './services/firebaseService';

const INITIAL_CONFIG: SystemConfig = {
  schoolName: "مدرسة صلاح الدين الأيوبي – الحصين",
  academicYear: "2025/2026",
  maintenanceMessage: "النظام يخضع حالياً لعملية صيانة دورية لتحديث البيانات الأكاديمية. نعتذر عن الإزعاج.",
  activeMonths: [
    { gregorian: 'أكتوبر', hijri: 'ربيع الآخر 1447هـ' },
    { gregorian: 'نوفمبر', hijri: 'جمادى الأولى 1447هـ' },
    { gregorian: 'ديسمبر', hijri: 'جمادى الآخرة 1447هـ' },
    { gregorian: 'يناير', hijri: 'رجب 1447هـ' }
  ],
  attendanceConfig: {
    weekends: [4, 5], 
    editableDaysForScout: '2DAYS',
    scoutCanOverrideAdmin: false,
    defaultAllPresentOnNoSync: false
  },
  features: {
    aiInsights: true,
    financeSystem: true,
    attendanceScanner: true,
    digitalLibrary: false,
    parentPortal: true,
    gradingSystem: true,
    teacherPrep: true,
    examControl: true
  },
  permissions: {
    teachersCanEditGrades: true,
    scoutsCanEditAttendance: true,
    studentsCanSeeRankings: true
  },
  theme: 'emerald',
  maintenanceMode: false,
  globalAnnouncement: "أهلاً بكم في نظام مدرسة صلاح الدين المحدث - عام 2025"
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [activePath, setActivePath] = useState('dashboard');
  const [config, setConfig] = useState<SystemConfig>(INITIAL_CONFIG);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        await seedInitialData([], [], INITIAL_CONFIG);
        const [remoteConfig, remoteStaff, remoteStudents] = await Promise.all([
          getSystemConfig(),
          fetchCollection("staff"),
          fetchCollection("students")
        ]);

        if (remoteConfig) {
          setConfig(prev => ({
            ...INITIAL_CONFIG,
            ...remoteConfig,
            attendanceConfig: { ...INITIAL_CONFIG.attendanceConfig, ...(remoteConfig.attendanceConfig || {}) },
            features: { ...INITIAL_CONFIG.features, ...(remoteConfig.features || {}) },
            permissions: { ...INITIAL_CONFIG.permissions, ...(remoteConfig.permissions || {}) }
          }));
        }
        if (remoteStaff.length > 0) setStaff(remoteStaff as StaffMember[]);
        if (remoteStudents.length > 0) setStudents(remoteStudents as Student[]);
      } catch (error) {
        console.error("Firebase Initialization Error:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-emerald-950 flex flex-col items-center justify-center p-6 text-center" dir="rtl">
        <RefreshCw className="animate-spin text-emerald-400 mb-6" size={64} />
        <h1 className="text-2xl font-black text-white">جاري مزامنة بيانات مدرسة صلاح الدين...</h1>
        <p className="text-emerald-300/60 font-bold mt-2">اتصال آمن بـ Google Cloud Firestore</p>
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={setUser} staff={staff} />;
  }

  if (config.maintenanceMode && user.role !== UserRole.ADMIN) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-center" dir="rtl">
        <div className="max-w-md w-full bg-white rounded-[3rem] p-12 shadow-2xl animate-in zoom-in-95">
           <div className="w-24 h-24 bg-amber-100 text-amber-600 rounded-[2rem] flex items-center justify-center mx-auto mb-8">
              <ShieldAlert size={48} />
           </div>
           <h1 className="text-3xl font-black text-slate-800 mb-4">النظام قيد الصيانة</h1>
           <p className="text-slate-500 font-bold mb-8 leading-relaxed">{config.maintenanceMessage}</p>
           <button onClick={() => setUser(null)} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black flex items-center justify-center gap-3">
             <LogOut size={20} /> خروج من النظام
           </button>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    if (!user) return null;

    switch (activePath) {
      case 'dashboard':
        return (user.role === UserRole.STUDENT) 
          ? <StudentView students={students} staff={staff} config={config} /> 
          : <AdminDashboard students={students} staff={staff} config={config} user={user} onNavigate={setActivePath} />;
      case 'exam-control':
        return <ExamControlView students={students} classes={CLASSES} config={config} user={user} />;
      case 'classes':
        return <ClassesManagementView staff={staff} students={students} />;
      case 'students':
        return <StudentsManagementView students={students} setStudents={setStudents} />;
      case 'teachers':
        return <TeachersManagementView staff={staff} setStaff={setStaff} user={user} />;
      case 'finance':
        return config.features.financeSystem ? <FinanceManagementView /> : <FeatureDisabled />;
      case 'grades':
        return config.features.gradingSystem ? <GradesManagementView students={students} staff={staff} config={config} user={user} /> : <FeatureDisabled />;
      case 'accounts':
        return <AccountsManagementView staff={staff} students={students} />;
      case 'support':
        return <TechnicalSupportView />;
      case 'notifications':
        return <NotificationsCenterView />;
      case 'attendance-scan':
        return config.features.attendanceScanner ? <AttendanceScanner /> : <FeatureDisabled />;
      case 'attendance':
      case 'attendance-manual':
        return <AttendanceManualView students={students} user={user} config={config} />;
      case 'prep':
        return config.features.teacherPrep ? <TeacherPrepView /> : <FeatureDisabled />;
      case 'settings':
        return <SettingsView config={config} setConfig={setConfig} />;
      default:
        return <AdminDashboard students={students} staff={staff} config={config} user={user} onNavigate={setActivePath} />;
    }
  };

  // Roles like Teacher, Parent, Scout have special portal layouts handled in App.tsx logic...
  if (user.role === UserRole.TEACHER) {
    const sm = staff.find(s => s.id === user.employeeId);
    if (sm) return <TeacherPortalView user={user} staffMember={sm} students={students} config={config} onLogout={() => setUser(null)} />;
  }
  if (user.role === UserRole.PARENT) return <ParentPortalView user={user} students={students} config={config} onLogout={() => setUser(null)} />;
  if (user.role === UserRole.SCOUT) {
    const scData = students.find(s => s.id === user.employeeId);
    return <ScoutPortalView user={user} scoutData={scData} students={students} config={config} onLogout={() => setUser(null)} />;
  }

  return (
    <Layout user={user} activePath={activePath} onNavigate={setActivePath} onLogout={() => setUser(null)} config={config}>
      {renderContent()}
    </Layout>
  );
};

const FeatureDisabled = () => (
  <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-12 bg-white rounded-[3rem] border-4 border-dashed border-slate-100">
    <div className="p-8 bg-slate-50 text-slate-300 rounded-[2.5rem] mb-6"><ShieldAlert size={64} /></div>
    <h3 className="text-2xl font-black text-slate-800">هذه الميزة معطلة</h3>
    <p className="text-slate-400 font-bold mt-2">يرجى مراجعة إدارة المدرسة لتفعيل هذه الصلاحية من إعدادات النظام</p>
  </div>
);

export default App;
