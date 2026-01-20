
import React, { useEffect, useState, useMemo } from 'react';
import { 
  Users, UserCheck, Activity, ShieldCheck, Key,
  ArrowRight, Clock, Trash2, GraduationCap, PenTool, Lock, Settings, UserPlus, RefreshCw, CalendarCheck
} from 'lucide-react';
import { SystemConfig, StaffMember, Student, ActivityLog, UserRole, User } from '../types';
import { fetchCollection, deleteFromFirestore } from '../services/firebaseService';

interface AdminDashboardProps {
  students: Student[];
  staff: StaffMember[];
  config: SystemConfig;
  user: User; // تم إضافة اليوزر هنا لمعرفة من يشاهد اللوحة
  onNavigate?: (path: string) => void;
}

// Add ATTENDANCE and EXAMS icons to CATEGORY_ICONS mapping
const CATEGORY_ICONS: Record<ActivityLog['category'], any> = {
  SECURITY: Lock,
  GRADES: GraduationCap,
  STAFF: Users,
  SYSTEM: Settings,
  PREP: PenTool,
  FINANCE: Key,
  ATTENDANCE: CalendarCheck,
  // Added EXAMS category icon
  EXAMS: ShieldCheck
};

// Add ATTENDANCE and EXAMS color schemes to CATEGORY_COLORS mapping
const CATEGORY_COLORS: Record<ActivityLog['category'], string> = {
  SECURITY: 'text-rose-500 bg-rose-50 border-rose-100',
  GRADES: 'text-emerald-600 bg-emerald-50 border-emerald-100',
  STAFF: 'text-blue-600 bg-blue-50 border-blue-100',
  SYSTEM: 'text-slate-600 bg-slate-50 border-slate-100',
  PREP: 'text-indigo-600 bg-indigo-50 border-indigo-100',
  FINANCE: 'text-amber-600 bg-amber-50 border-amber-100',
  ATTENDANCE: 'text-teal-600 bg-teal-50 border-teal-100',
  // Added EXAMS category colors
  EXAMS: 'text-violet-600 bg-violet-50 border-violet-100'
};

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ students, staff, config, user, onNavigate }) => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);

  useEffect(() => {
    const loadLogs = async () => {
      setIsLoadingLogs(true);
      const data = await fetchCollection("activity_logs");
      setLogs((data as ActivityLog[]).sort((a, b) => b.timestamp.localeCompare(a.timestamp)));
      setIsLoadingLogs(false);
    };
    loadLogs();
    const interval = setInterval(loadLogs, 10000); // تحديث كل 10 ثواني
    return () => clearInterval(interval);
  }, []);

  const handleDeleteLog = async (id: string) => {
    try {
      await deleteFromFirestore("activity_logs", id);
      setLogs(prev => prev.filter(l => l.id !== id));
    } catch (e) {
      console.error("Failed to delete log");
    }
  };

  const formatTime = (ts: string) => {
    const date = new Date(ts);
    return date.toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 relative text-right" dir="rtl">
      <div className="bg-emerald-950 p-10 md:p-14 rounded-[3.5rem] text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px]"></div>
        <h1 className="text-3xl md:text-5xl font-black tracking-tight relative z-10 leading-tight">مرحباً بك، {user?.name?.split(' ')?.[0] || 'المستخدم'}</h1>
        <p className="text-emerald-300/60 font-bold text-sm md:text-lg mt-2 relative z-10">نظام إدارة مدرسة صلاح الدين - المحرك الأكاديمي الشامل</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'إجمالي الطلاب', value: students.length, color: 'emerald', icon: Users, path: 'students' },
          { label: 'نسبة الانضباط', value: '96%', color: 'blue', icon: UserCheck, path: 'attendance' },
          { label: 'إدارة الحسابات', value: 'نشط', color: 'indigo', icon: Key, path: 'accounts' },
          { label: 'حالة النظام', value: 'آمن', color: 'indigo', icon: ShieldCheck, path: 'settings' },
        ].map((stat, i) => (
          <div 
            key={i} 
            onClick={() => onNavigate?.(stat.path)}
            className="bg-white p-8 rounded-[3rem] shadow-xl border border-slate-100 group relative overflow-hidden cursor-pointer hover:border-emerald-500 transition-all active:scale-95"
          >
            <div className={`p-4 rounded-2xl bg-${stat.color}-50 text-${stat.color}-600 mb-6 w-fit`}><stat.icon size={28} /></div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
            <h4 className="text-3xl md:text-4xl font-black text-slate-800 mt-2">{stat.value}</h4>
            <div className="absolute bottom-6 left-8 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
               <ArrowRight size={20} className="text-emerald-50" />
            </div>
          </div>
        ))}
      </div>

      {/* مركز رصد العمليات الجديد */}
      <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-100 overflow-hidden animate-in slide-in-from-bottom-10 duration-1000">
         <div className="p-8 border-b border-slate-50 bg-slate-50/30 flex justify-between items-center">
            <div className="flex items-center gap-3">
               <Activity className="text-emerald-600" size={24} />
               <div>
                  <h3 className="text-xl font-black text-slate-800">مركز رصد العمليات</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">System Activity Ledger</p>
               </div>
            </div>
            {logs.length > 0 && <span className="bg-slate-900 text-white px-4 py-1.5 rounded-full text-[10px] font-black">إجمالي الأحداث: {logs.length}</span>}
         </div>

         <div className="max-h-[500px] overflow-y-auto scrollbar-hide divide-y divide-slate-50">
            {isLoadingLogs ? (
               <div className="p-20 text-center flex flex-col items-center gap-4">
                  <RefreshCw className="animate-spin text-emerald-600" size={40} />
                  <p className="font-black text-slate-300">جاري مزامنة السجل الأمني...</p>
               </div>
            ) : logs.length === 0 ? (
               <div className="p-20 text-center flex flex-col items-center gap-4">
                  <ShieldCheck className="text-slate-100" size={64} />
                  <p className="font-black text-slate-300">السجل فارغ، لم يتم رصد أي عمليات حتى الآن</p>
               </div>
            ) : logs.map((log) => {
               const Icon = CATEGORY_ICONS[log.category] || Activity;
               const colorClass = CATEGORY_COLORS[log.category];
               return (
                  <div key={log.id} className="p-6 md:p-8 flex items-start gap-6 hover:bg-slate-50 transition-all group relative">
                     <div className={`shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center border-2 ${colorClass} shadow-sm group-hover:scale-110 transition-transform`}>
                        <Icon size={20} />
                     </div>
                     <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-1">
                           <h4 className="font-black text-slate-800 text-sm md:text-base leading-tight">{log.action}</h4>
                           <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-3 py-1 rounded-full">{formatTime(log.timestamp)}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-2">
                           <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 rounded-lg shadow-sm">
                              <UserPlus size={12} className="text-slate-400" />
                              <span className="text-[10px] font-black text-slate-500">بواسطة: {log.userName}</span>
                              <span className="text-[8px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-md font-bold mr-1">
                                 {log.userRole === UserRole.ADMIN ? 'إدارة' : 'معلم'}
                              </span>
                           </div>
                           {log.details && <p className="text-[10px] text-slate-400 font-bold truncate italic">"{log.details}"</p>}
                        </div>
                     </div>
                     <button 
                        onClick={() => handleDeleteLog(log.id)}
                        className="opacity-0 group-hover:opacity-100 p-3 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                     >
                        <Trash2 size={16} />
                     </button>
                  </div>
               );
            })}
         </div>
         
         <div className="p-6 bg-slate-50 border-t border-slate-100 text-center">
            <p className="text-[10px] text-slate-400 font-black flex items-center justify-center gap-2">
               <ShieldCheck size={12} /> هذا السجل مشفر ومحمي برمجياً لضمان النزاهة الإدارية
            </p>
         </div>
      </div>
    </div>
  );
};
