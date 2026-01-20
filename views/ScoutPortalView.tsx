
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Shield, ClipboardList, BarChart3, MessageSquare, 
  LogOut, Calendar, UserCheck, Check,
  Zap, Clock, Users, Save, X, Search, Info, CheckCircle, 
  ShieldCheck, Star, Trophy, TrendingUp, AlertTriangle, 
  RefreshCw, Lock, Key, LayoutDashboard, ChevronDown, 
  Filter, ArrowLeft, Cloud, CloudCheck, FileText, AlertCircle,
  Table as TableIcon, LayoutGrid, User as UserIcon, History, 
  ArrowUpRight, ArrowDownRight, CalendarDays, ChevronLeft,
  XCircle, Timer, FileEdit, GraduationCap, Send, MousePointer2, BadgeCheck
} from 'lucide-react';
import { Student, User, SystemConfig, AttendanceDay, AttendanceStatus, UserRole, EscapePeriod, AttendanceEntry, ChatMessage } from '../types';
import { CLASSES } from '../constants';
import { fetchCollection, saveToFirestore, logActivity } from '../services/firebaseService';
import { ChatPortal } from './ChatPortal';
import { CustomToast } from '../components/CustomUI';

interface ScoutPortalViewProps {
  user: User;
  scoutData?: Student;
  students: Student[];
  config: SystemConfig;
  onLogout: () => void;
}

type ScoutTab = 'DASHBOARD' | 'ATTENDANCE' | 'STATS' | 'SECURITY';
type ViewMode = 'CARDS' | 'TABLE';

const STATUS_OPTS = [
  { s: AttendanceStatus.PRESENT, label: 'حاضر', icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-500' },
  { s: AttendanceStatus.ABSENT, label: 'غائب', icon: XCircle, color: 'text-rose-500', bg: 'bg-rose-500' },
  { s: AttendanceStatus.LATE, label: 'متأخر', icon: Timer, color: 'text-amber-500', bg: 'bg-amber-500' },
  { s: AttendanceStatus.EXCUSED, label: 'مستأذن', icon: FileEdit, color: 'text-blue-500', bg: 'bg-blue-500' },
  { s: AttendanceStatus.ESCAPED, label: 'هارب', icon: AlertTriangle, color: 'text-slate-800', bg: 'bg-slate-900' },
];

export const ScoutPortalView: React.FC<ScoutPortalViewProps> = ({ user, scoutData, students, config, onLogout }) => {
  // // Fix: Defined weekDays to provide a list of last 5 dates for attendance tracking selection
  const weekDays = useMemo(() => {
    return Array.from({ length: 5 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (4 - i));
      return {
        name: new Intl.DateTimeFormat('ar-YE', { weekday: 'short' }).format(d),
        date: d.toISOString().split('T')[0]
      };
    });
  }, []);

  const [activeTab, setActiveTab] = useState<ScoutTab>('DASHBOARD');
  const [viewMode, setViewMode] = useState<ViewMode>('TABLE');
  const [selectedClassId, setSelectedClassId] = useState<string>(scoutData?.classId || CLASSES[0].id);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceData, setAttendanceData] = useState<AttendanceDay | null>(null);
  const [allAttendanceRecords, setAllAttendanceRecords] = useState<AttendanceDay[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      const results = await fetchCollection("attendance") as AttendanceDay[];
      setAllAttendanceRecords(results);
      const docId = `${selectedClassId}_${selectedDate}`;
      const found = results.find(d => d.id === docId);
      if (found) {
        setAttendanceData(found);
      } else {
        setAttendanceData({
          id: docId, classId: selectedClassId, date: selectedDate,
          isLockedByAdmin: false, records: {}, lastSync: new Date().toISOString()
        });
      }
      setIsDirty(false);
    };
    loadData();
  }, [selectedClassId, selectedDate, activeTab]);

  const updateStatus = (studentId: string, status: AttendanceStatus) => {
    if (!attendanceData) return;
    const newRecords = { ...attendanceData.records };
    newRecords[studentId] = {
      ...(newRecords[studentId] || { studentId, status: AttendanceStatus.PRESENT }),
      status,
      updatedAt: new Date().toISOString(),
      updatedBy: user.id,
      updatedByRole: user.role,
    };
    setAttendanceData({ ...attendanceData, records: newRecords });
    setIsDirty(true);
  };

  const saveToCloud = async () => {
    if (!attendanceData) return;
    setIsSaving(true);
    try {
      await saveToFirestore("attendance", attendanceData.id, { ...attendanceData, syncedBy: user.name, lastSync: new Date().toISOString() });
      await logActivity(user, `رفع تحضير كشفي لفصل ${CLASSES.find(c => c.id === selectedClassId)?.name}`, 'ATTENDANCE');
      setToast("تم الرفع والمزامنة بنجاح");
      setIsDirty(false);
    } catch (e) { setToast("فشل الاتصال بالسيرفر"); }
    finally { setIsSaving(false); }
  };

  const filteredStudents = useMemo(() => {
    return students.filter(s => s.classId === selectedClassId && (s.fullName || s.name).includes(searchTerm))
      .sort((a, b) => (a.fullName || a.name).localeCompare((b.fullName || b.name), 'ar'));
  }, [students, selectedClassId, searchTerm]);

  const classStats = useMemo(() => {
    const records = Object.values(attendanceData?.records || {}) as AttendanceEntry[];
    const total = filteredStudents.length;
    if (total === 0) return { present: 0, absent: 0, late: 0, excused: 0, escaped: 0, total: 0, percent: 0 };
    const present = total - records.filter(r => r.status !== AttendanceStatus.PRESENT).length;
    const percent = Math.round((present / total) * 100);
    return { present, absent: total - present, total, percent };
  }, [attendanceData, filteredStudents]);

  const committedStudents = useMemo(() => {
    // حساب الالتزام التراكمي لآخر 10 سجلات حضور
    return filteredStudents.filter(s => {
      const records = allAttendanceRecords.filter(r => r.classId === selectedClassId && r.records[s.id]);
      if (records.length === 0) return true;
      return records.every(r => r.records[s.id].status === AttendanceStatus.PRESENT);
    });
  }, [allAttendanceRecords, filteredStudents, selectedClassId]);

  const renderStats = () => (
    <div className="space-y-8 animate-in slide-in-from-left-6 duration-500 pb-24 text-right" dir="rtl">
       <div className="bg-white p-10 rounded-[3.5rem] shadow-xl border border-slate-100">
          <div className="flex items-center gap-4 mb-10 flex-row-reverse border-b border-slate-50 pb-6">
             <div className="w-14 h-14 bg-indigo-600 text-white rounded-[1.5rem] flex items-center justify-center shadow-2xl"><BarChart3 size={28}/></div>
             <div className="text-right flex-1">
                <h3 className="text-2xl font-black text-slate-800 leading-none">مركز تحليلات الفصل الكشفي</h3>
                <p className="text-[10px] text-slate-400 font-bold mt-2 uppercase tracking-widest">Field Operational Intelligence</p>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
             <div className="bg-slate-900 p-10 rounded-[3rem] text-white flex flex-col items-center justify-center relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-[60px]"></div>
                <div className="relative z-10 text-center">
                   <p className="text-[10px] font-black text-emerald-400/60 uppercase tracking-[0.3em] mb-3">مستوى الانضباط اللحظي</p>
                   <h4 className="text-7xl font-black text-emerald-400 mb-2 group-hover:scale-110 transition-transform">{classStats.percent}%</h4>
                   <div className="w-48 bg-white/10 h-2.5 rounded-full overflow-hidden mx-auto">
                      <div className="bg-emerald-500 h-full transition-all duration-1000" style={{ width: `${classStats.percent}%` }}></div>
                   </div>
                   <div className="flex gap-8 mt-10">
                      <div className="text-center"><p className="text-[8px] font-bold text-white/40 mb-1">حاضرون</p><p className="font-black text-xl">{classStats.present}</p></div>
                      <div className="text-center"><p className="text-[8px] font-bold text-white/40 mb-1">غائبون</p><p className="font-black text-xl text-rose-400">{classStats.absent}</p></div>
                   </div>
                </div>
             </div>

             <div className="space-y-6">
                <div className="flex items-center justify-between flex-row-reverse px-2">
                   <h4 className="font-black text-slate-800 text-base flex items-center gap-3 flex-row-reverse">لوحة شرف الالتزام (100%) <Trophy className="text-yellow-500" size={24}/></h4>
                   <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">{committedStudents.length} طلاب</span>
                </div>
                <div className="grid grid-cols-1 gap-2.5 max-h-[350px] overflow-y-auto scrollbar-hide p-1">
                   {committedStudents.map((s, i) => (
                     <div key={i} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between flex-row-reverse group hover:border-emerald-200 hover:shadow-lg transition-all animate-in zoom-in-95">
                        <div className="flex items-center gap-4 flex-row-reverse">
                           <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-xs shadow-md ${s.avatarColor}`}>#{i+1}</div>
                           <p className="font-black text-slate-700 text-sm group-hover:text-emerald-700">{s.fullName}</p>
                        </div>
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-xl font-black text-[9px]"><Star size={12} fill="currentColor"/> تميز</div>
                     </div>
                   ))}
                   {committedStudents.length === 0 && (
                     <div className="p-10 text-center bg-slate-50 rounded-[2.5rem] border-4 border-dashed border-slate-100">
                        <BadgeCheck size={48} className="mx-auto text-slate-200 mb-4" />
                        <p className="text-slate-400 font-bold text-xs">جاري تحليل بيانات الالتزام للفصل...</p>
                     </div>
                   )}
                </div>
             </div>
          </div>
       </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans" dir="rtl">
       {toast && <CustomToast message={toast} onClose={() => setToast(null)} />}
       {showChat && <ChatPortal user={user} onClose={() => { setShowChat(false); setUnreadCount(0); }} onShowToast={setToast} />}

       <header className="bg-white/95 backdrop-blur-xl px-8 py-6 border-b border-slate-100 flex justify-between items-center sticky top-0 z-[100] shadow-sm flex-row-reverse">
          <div className="flex items-center gap-4 flex-row-reverse">
             <div className="w-12 h-12 bg-emerald-950 rounded-2xl flex items-center justify-center shadow-lg border border-emerald-500/20"><Shield className="text-emerald-400" size={28}/></div>
             <div className="text-right">
                <h1 className="text-xl font-black text-slate-800 leading-none">بوابة قائد الفصل</h1>
                <p className="text-[10px] text-emerald-600 font-black uppercase mt-1.5 tracking-widest">Field Leadership Hub</p>
             </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { setShowChat(true); setUnreadCount(0); }} className="p-3 bg-emerald-50 text-emerald-700 rounded-xl relative hover:bg-emerald-100 transition-all">
                <MessageSquare size={20}/>
                {unreadCount > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center animate-pulse border-2 border-white">{unreadCount}</span>}
            </button>
            <button onClick={onLogout} className="p-3 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-100 transition-all"><LogOut size={20}/></button>
          </div>
       </header>

       <main className="p-6 md:p-10 max-w-6xl mx-auto">
          {activeTab === 'DASHBOARD' && (
             <div className="space-y-8 animate-in fade-in duration-700 text-right">
                <div className="bg-emerald-950 p-12 rounded-[4rem] text-white shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px]"></div>
                  <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
                     <div className={`w-28 h-28 rounded-[3rem] flex items-center justify-center text-white font-black text-5xl shadow-2xl border-4 border-white/10 ${scoutData?.avatarColor}`}>
                        {scoutData?.fullName?.[0] || user.name[0]}
                     </div>
                     <div className="flex-1 text-center md:text-right">
                        <h2 className="text-4xl font-black">أهلاً، القائد {user.name.split(' ')[0]}</h2>
                        <p className="text-emerald-300/60 font-bold mt-3 uppercase tracking-widest text-xs">مسؤول الرصد الميداني - فصل {CLASSES.find(c => c.id === selectedClassId)?.name}</p>
                        <div className="flex flex-wrap justify-center md:justify-start gap-3 mt-8">
                           <div className="px-5 py-2 bg-white/10 rounded-2xl border border-white/10 text-[10px] font-black flex items-center gap-3 shadow-lg"><Trophy size={16} className="text-yellow-400"/> قائد مثالي معتمد</div>
                           <div className="px-5 py-2 bg-emerald-500/20 rounded-2xl border border-emerald-500/20 text-[10px] font-black flex items-center gap-3 shadow-lg"><ShieldCheck size={16} className="text-emerald-400"/> رصد ذكي مشفر</div>
                        </div>
                     </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                   {[
                     { label: 'حاضرون', val: classStats.present, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                     { label: 'غائبون', val: classStats.absent, color: 'text-rose-600', bg: 'bg-rose-50' },
                     { label: 'نسبة الحضور', val: `${classStats.percent}%`, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                     { label: 'طلاب الفصل', val: classStats.total, color: 'text-amber-600', bg: 'bg-amber-50' },
                   ].map((s, i) => (
                     <div key={i} className={`p-8 rounded-[2.5rem] bg-white border border-slate-100 shadow-xl flex flex-col items-center text-center hover:scale-105 transition-all`}>
                        <p className={`text-4xl font-black ${s.color}`}>{s.val}</p>
                        <p className="text-[10px] font-black text-slate-400 uppercase mt-2">{s.label}</p>
                     </div>
                   ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <button onClick={() => setActiveTab('ATTENDANCE')} className="p-10 bg-white border-2 border-transparent rounded-[3.5rem] shadow-2xl flex flex-col items-center gap-5 hover:border-emerald-500 transition-all group">
                      <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-[2rem] flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-xl"><ClipboardList size={40}/></div>
                      <span className="font-black text-xl text-slate-800">بدء الرصد الميداني</span>
                   </button>
                   <button onClick={() => setActiveTab('STATS')} className="p-10 bg-white border-2 border-transparent rounded-[3.5rem] shadow-2xl flex flex-col items-center gap-5 hover:border-indigo-500 transition-all group">
                      <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-[2rem] flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-xl"><BarChart3 size={40}/></div>
                      <span className="font-black text-xl text-slate-800">تحليلات الانضباط</span>
                   </button>
                </div>
             </div>
          )}
          {activeTab === 'STATS' && renderStats()}
          {activeTab === 'ATTENDANCE' && (
            <div className="space-y-6 animate-in slide-in-from-bottom-8 duration-500 pb-32 relative text-right">
               <div className="flex justify-between items-center px-2 flex-row-reverse">
                  <div className="text-right">
                     <h3 className="text-2xl font-black text-slate-800">رصد الحضور اليومي</h3>
                     <p className="text-xs text-slate-400 font-bold">{CLASSES.find(c => c.id === selectedClassId)?.name} • {selectedDate}</p>
                  </div>
                  <button 
                     onClick={saveToCloud}
                     disabled={isSaving || !isDirty}
                     className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-black text-sm transition-all shadow-xl ${
                       !isDirty ? 'bg-slate-100 text-slate-400' : 'bg-emerald-600 text-white shadow-emerald-200 active:scale-95'
                     }`}
                   >
                     {isSaving ? <RefreshCw className="animate-spin" size={18}/> : <CloudCheck size={18}/>}
                     <span>{isSaving ? 'جاري الرفع...' : 'مزامنة مع السحابة'}</span>
                  </button>
               </div>

               <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-slate-100">
                 <div className="grid grid-cols-5 gap-2" dir="rtl">
                    {weekDays.map(wd => (
                      <button 
                         key={wd.date}
                         onClick={() => setSelectedDate(wd.date)}
                         className={`flex flex-col items-center py-4 rounded-2xl border transition-all ${selectedDate === wd.date ? 'bg-emerald-950 border-emerald-500 text-white shadow-2xl scale-105' : 'bg-slate-50 border-transparent text-slate-400'}`}
                      >
                         <span className="text-[10px] font-black mb-1">{wd.name}</span>
                         <span className="text-[8px] font-bold opacity-40">{wd.date}</span>
                      </button>
                    ))}
                 </div>
               </div>

               <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-200 overflow-hidden">
                 <table className="w-full text-right table-fixed min-w-[320px]">
                   <thead>
                     <tr className="bg-emerald-950 text-white text-[10px] font-black uppercase tracking-tight">
                       <th className="w-12 py-6 text-center">#</th>
                       <th className="w-auto py-6 pr-4">الطالب</th>
                       <th className="w-[180px] py-6 text-center">الخيارات اللحظية</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                     {filteredStudents.map((st, idx) => {
                       const rec = attendanceData?.records[st.id] || { status: AttendanceStatus.PRESENT };
                       return (
                         <tr key={st.id} className="hover:bg-slate-50 transition-all">
                           <td className="py-5 text-center text-[10px] font-black text-slate-300">{idx + 1}</td>
                           <td className="py-5 pr-4"><p className="font-black text-slate-700 text-sm truncate">{st.fullName.split(' ')[0]} {st.fullName.split(' ')[1]}</p></td>
                           <td className="py-5 px-4">
                              <div className="flex justify-center gap-1">
                                 {STATUS_OPTS.map(opt => (
                                   <button
                                     key={opt.s}
                                     onClick={() => updateStatus(st.id, opt.s)}
                                     className={`flex-1 h-12 flex flex-col items-center justify-center rounded-xl transition-all ${rec.status === opt.s ? `${opt.bg} text-white shadow-xl scale-110` : 'bg-slate-100 text-slate-300'}`}
                                   >
                                      <opt.icon size={16} />
                                      <span className="text-[6px] font-black mt-1 uppercase">{opt.label}</span>
                                   </button>
                                 ))}
                              </div>
                           </td>
                         </tr>
                       );
                     })}
                   </tbody>
                 </table>
               </div>
            </div>
          )}
       </main>

       {/* Floating Navigation */}
       <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-2xl border-t border-slate-100 px-8 py-5 flex justify-around items-center z-[110] shadow-[0_-15px_50px_rgba(0,0,0,0.1)] rounded-t-[3.5rem] md:max-w-xl md:mx-auto md:mb-6 md:rounded-full md:border">
          {[
            { id: 'DASHBOARD', label: 'الرئيسية', icon: LayoutGrid },
            { id: 'ATTENDANCE', label: 'الرصد', icon: ClipboardList },
            { id: 'STATS', label: 'الإحصائيات', icon: BarChart3 },
            { id: 'SECURITY', label: 'أماني', icon: Lock },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as ScoutTab)} className={`flex flex-col items-center gap-1 transition-all ${activeTab === tab.id ? 'text-emerald-700 scale-110' : 'text-slate-300'}`}>
               <div className={`p-3 rounded-2xl ${activeTab === tab.id ? 'bg-emerald-50 shadow-inner' : ''}`}><tab.icon size={24} strokeWidth={activeTab === tab.id ? 3 : 2} /></div>
               <span className="text-[10px] font-black uppercase tracking-tight">{tab.label}</span>
            </button>
          ))}
       </nav>
    </div>
  );
};
