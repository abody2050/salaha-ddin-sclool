
import React, { useState, useEffect, useMemo } from 'react';
import { 
  User, Award, Clock, Calendar, ShieldCheck, 
  ChevronLeft, ArrowRight, Star, Info, 
  CheckCircle2, MessageSquare, Send, X, LayoutGrid, Zap, Phone, GraduationCap,
  BookOpen, Sparkles, LogOut, AlertTriangle, TrendingUp, BarChart3, FileText, 
  BadgeCheck, Users, ChevronDown, ChevronUp, MessageCircle, Copy, Trash2, Coffee
} from 'lucide-react';
import { Student, SystemConfig, User as UserType, UserRole, AttendanceDay, AttendanceStatus, ChatMessage, StudentGradeRecord, StaffMember } from '../types';
import { fetchCollection, saveToFirestore } from '../services/firebaseService';
import { CLASSES } from '../constants';
import { ChatPortal } from './ChatPortal';
import { CustomToast } from '../components/CustomUI';

interface ParentPortalViewProps {
  user: UserType;
  students: Student[];
  config: SystemConfig;
  onLogout: () => void;
}

type PeriodType = 'THIS_WEEK' | 'LAST_WEEK' | 'THIS_MONTH' | 'CUSTOM';

const STATUS_MAP = {
  [AttendanceStatus.PRESENT]: { label: 'حاضر ✅', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
  [AttendanceStatus.ABSENT]: { label: 'غائب ❌', color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100' },
  [AttendanceStatus.LATE]: { label: 'متأخر ⏳', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
  [AttendanceStatus.EXCUSED]: { label: 'مستأذن 📝', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
  [AttendanceStatus.ESCAPED]: { label: 'هارب ⚠️', color: 'text-slate-800', bg: 'bg-slate-100', border: 'border-slate-300' },
};

export const ParentPortalView: React.FC<ParentPortalViewProps> = ({ user, students, config, onLogout }) => {
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceDay[]>([]);
  const [gradesHistory, setGradesHistory] = useState<StudentGradeRecord[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [showChat, setShowChat] = useState(false);
  const [chatRecipient, setChatRecipient] = useState<{id: string, name: string, role: UserRole, subject?: string, className?: string} | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>(config.activeMonths[0]?.gregorian || '');
  const [toast, setToast] = useState<string | null>(null);
  const [period, setPeriod] = useState<PeriodType>('THIS_WEEK');
  // Fix: Added missing unreadCount state
  const [unreadCount, setUnreadCount] = useState(0);

  const myChildren = useMemo(() => students.filter(s => s.parentPhone === user?.username), [students, user]);
  const activeChild = useMemo(() => myChildren.find(c => c.id === selectedChildId), [myChildren, selectedChildId]);
  
  useEffect(() => {
    const loadData = async () => {
      const [allAtt, allGrades, allStaff] = await Promise.all([
        fetchCollection("attendance") as Promise<AttendanceDay[]>,
        fetchCollection("grades") as Promise<StudentGradeRecord[]>,
        fetchCollection("staff") as Promise<StaffMember[]>
      ]);
      setAttendanceHistory(allAtt.sort((a, b) => b.date.localeCompare(a.date)));
      setGradesHistory(allGrades);
      setStaff(allStaff);
    };
    loadData();
  }, []);

  const getWeeklyStats = (studentId: string) => {
    const now = new Date();
    const day = now.getDay();
    // السبت (6) هو بداية الأسبوع في نظامنا
    const diff = now.getDate() - day + (day === 6 ? 0 : -1) - 6; 
    const startOfWeek = new Date(now.setDate(diff));
    startOfWeek.setHours(0,0,0,0);

    const weeklyRecords = attendanceHistory.filter(d => 
      d.records[studentId] && new Date(d.date) >= startOfWeek
    );

    const stats = { present: 0, absent: 0, late: 0, excused: 0, escaped: 0 };
    weeklyRecords.forEach(d => {
      const s = d.records[studentId].status;
      if (s === AttendanceStatus.PRESENT) stats.present++;
      else if (s === AttendanceStatus.ABSENT) stats.absent++;
      else if (s === AttendanceStatus.LATE) stats.late++;
      else if (s === AttendanceStatus.EXCUSED) stats.excused++;
      else if (s === AttendanceStatus.ESCAPED) stats.escaped++;
    });

    const total = weeklyRecords.length;
    const percent = total > 0 ? Math.round(((stats.present + stats.excused) / total) * 100) : 100;

    return { ...stats, total, percent };
  };

  const isWeekend = useMemo(() => {
    const day = new Date().getDay();
    return day === 4 || day === 5; // الخميس (4) والجمعة (5)
  }, []);

  const renderChildDetail = (child: Student) => {
    const weeklyStats = getWeeklyStats(child.id);
    const childGrades = gradesHistory.filter(g => g.studentId === child.id);
    const today = new Date().toISOString().split('T')[0];
    const todayRec = attendanceHistory.find(d => d.date === today)?.records[child.id];
    const todayStatus = todayRec ? STATUS_MAP[todayRec.status] : { label: 'لم يرصد بعد', color: 'text-slate-400', bg: 'bg-slate-50', border: 'border-slate-100' };

    const childClass = CLASSES.find(c => c.id === child.classId);

    return (
      <div className="space-y-8 px-4 pb-32 animate-in slide-in-from-left-4 text-right" dir="rtl">
        {/* Today's Status Hero */}
        <div className="bg-white p-8 rounded-[3.5rem] shadow-2xl border border-slate-100 relative overflow-hidden">
           <div className={`absolute top-0 right-0 w-2 h-full ${isWeekend ? 'bg-amber-400' : todayStatus.color.replace('text', 'bg')}`}></div>
           <div className="flex flex-col md:flex-row items-center gap-8">
              <div className={`w-24 h-24 rounded-[2.5rem] flex items-center justify-center text-white text-4xl font-black shadow-xl ${child.avatarColor}`}>
                {child.fullName[0]}
              </div>
              <div className="flex-1 text-center md:text-right">
                 <h2 className="text-2xl font-black text-slate-800">{child.fullName}</h2>
                 <div className="flex flex-wrap justify-center md:justify-start gap-2 mt-2">
                    <span className="bg-slate-100 px-3 py-1 rounded-full text-[10px] font-black text-slate-500 uppercase">{childClass?.name}</span>
                    <span className="bg-indigo-50 px-3 py-1 rounded-full text-[10px] font-black text-indigo-600 uppercase">كود: {child.studentCode}</span>
                 </div>
              </div>
              <div className={`px-8 py-5 rounded-[2.2rem] border-2 ${isWeekend ? 'bg-amber-50 border-amber-100' : `${todayStatus.bg} ${todayStatus.border}`} text-center min-w-[180px]`}>
                 <p className="text-[9px] font-black opacity-40 uppercase mb-1">حالة الحضور اليوم</p>
                 {isWeekend ? (
                   <div className="flex items-center justify-center gap-2 text-amber-700">
                      <Coffee size={18}/>
                      <p className="text-lg font-black">إجازة نهاية الأسبوع</p>
                   </div>
                 ) : (
                   <p className={`text-lg font-black ${todayStatus.color}`}>{todayStatus.label} {todayRec?.note ? `(${todayRec.note})` : ''}</p>
                 )}
              </div>
           </div>
        </div>

        {/* Weekly Stats Card */}
        <div className="bg-white p-8 rounded-[3.5rem] shadow-xl border border-slate-100">
           <div className="flex items-center gap-3 mb-8 justify-end flex-row-reverse">
              <BarChart3 className="text-indigo-600" />
              <h3 className="font-black text-slate-800 text-lg">إحصائيات المواظبة لهذا الأسبوع</h3>
           </div>
           <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { label: 'أيام الحضور', val: weeklyStats.present, color: 'emerald' },
                { label: 'أيام الغياب', val: weeklyStats.absent, color: 'rose' },
                { label: 'استئذان', val: weeklyStats.excused, color: 'blue' },
                { label: 'حالات هروب', val: weeklyStats.escaped, color: 'slate' },
                { label: 'تأخر', val: weeklyStats.late, color: 'amber' },
              ].map((s, i) => (
                <div key={i} className={`bg-${s.color}-50 border border-${s.color}-100 p-6 rounded-[2rem] text-center`}>
                   <p className="text-2xl font-black text-slate-800">{s.val}</p>
                   <p className={`text-[9px] font-black text-${s.color}-600 uppercase mt-1`}>{s.label}</p>
                </div>
              ))}
           </div>
           <div className="mt-6 bg-slate-900 p-6 rounded-[2.5rem] flex items-center justify-between text-white flex-row-reverse">
              <p className="font-black text-sm">مستوى الالتزام الأسبوعي</p>
              <div className="flex items-center gap-4">
                 <div className="w-48 h-2 bg-white/10 rounded-full overflow-hidden hidden md:block">
                    <div className="bg-emerald-500 h-full transition-all duration-1000" style={{ width: `${weeklyStats.percent}%` }}></div>
                 </div>
                 <span className="text-2xl font-black text-emerald-400">{weeklyStats.percent}%</span>
              </div>
           </div>
        </div>

        {/* Academic Grades - Monthly Kashf Style */}
        <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-100 overflow-hidden">
           <div className="p-8 border-b border-slate-50 flex flex-col md:flex-row justify-between items-center bg-slate-50/30 gap-6">
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg"><FileText size={24}/></div>
                 <div>
                    <h3 className="font-black text-slate-800 text-lg">سجل النتائج الشهري (الأصلي)</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Official Academic Grading Record</p>
                 </div>
              </div>
              
              <div className="flex bg-slate-100 p-1.5 rounded-2xl overflow-x-auto max-w-full scrollbar-hide">
                 {config.activeMonths.map((m, idx) => (
                    <button 
                      key={idx} 
                      onClick={() => setSelectedMonth(m.gregorian)}
                      className={`px-5 py-2.5 rounded-xl text-[10px] font-black transition-all whitespace-nowrap ${selectedMonth === m.gregorian ? 'bg-white text-indigo-600 shadow-md scale-105' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                       {m.gregorian}
                       <span className="block text-[7px] opacity-50">{idx < 2 ? 'الترم الأول' : 'الترم الثاني'}</span>
                    </button>
                 ))}
              </div>
           </div>

           <div className="overflow-x-auto">
              <table className="w-full text-right table-fixed min-w-[700px]">
                 <thead>
                    <tr className="bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest">
                       <th className="py-5 pr-8 w-1/4">المادة الدراسية</th>
                       <th className="py-5 text-center">أعمال(20)</th>
                       <th className="py-5 text-center">مواظبة(20)</th>
                       <th className="py-5 text-center">شفهي(30)</th>
                       <th className="py-5 text-center">تحريري(30)</th>
                       <th className="py-5 text-center bg-emerald-600">المجموع(100)</th>
                       <th className="py-5 text-center bg-indigo-900 w-24">المحصلة(20)</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                    {childClass?.subjects.map((sub, i) => {
                       const grade = childGrades.find(g => g.subjectName === sub.subjectName);
                       const m = grade?.months[selectedMonth];
                       const hasData = m && m.total !== undefined;

                       return (
                         <tr key={i} className="hover:bg-slate-50 transition-all group">
                            <td className="py-5 pr-8">
                               <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors"><BookOpen size={16}/></div>
                                  <div>
                                     <p className="font-black text-slate-700 text-sm leading-none">{sub.subjectName}</p>
                                     <p className="text-[9px] text-slate-400 font-bold mt-1.5">أ/ {sub.teacherName}</p>
                                  </div>
                               </div>
                            </td>
                            <td className="py-5 text-center font-mono font-black text-slate-400">{hasData ? m.homework : '-'}</td>
                            <td className="py-5 text-center font-mono font-black text-slate-400">{hasData ? m.attendance : '-'}</td>
                            <td className="py-5 text-center font-mono font-black text-slate-400">{hasData ? m.oral : '-'}</td>
                            <td className="py-5 text-center font-mono font-black text-slate-400">{hasData ? m.written : '-'}</td>
                            <td className="py-5 text-center">
                               <span className={`inline-block px-4 py-1.5 rounded-xl font-black text-sm ${hasData ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'text-slate-300'}`}>
                                  {hasData ? m.total : '-'}
                               </span>
                            </td>
                            <td className="py-5 text-center bg-indigo-50/30">
                               <span className="text-xl font-black text-indigo-700 tabular-nums">{hasData ? m.finalScore : '-'}</span>
                            </td>
                         </tr>
                       );
                    })}
                 </tbody>
              </table>
           </div>
        </div>

        {/* Teachers List & Contact */}
        <div className="space-y-4">
           <h3 className="font-black text-slate-800 flex items-center gap-3 px-2 justify-end">تواصل مع معلمي الابن <Users className="text-indigo-500" size={20}/></h3>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {childClass?.subjects.map((sub, i) => (
                <div key={i} className="bg-white p-6 rounded-[2.5rem] shadow-lg border border-slate-100 flex items-center justify-between group hover:border-emerald-500 transition-all">
                   <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner">{sub.teacherName[0]}</div>
                      <div className="text-right">
                         <h4 className="font-black text-slate-800 text-sm">أ/ {sub.teacherName}</h4>
                         <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{sub.subjectName}</p>
                      </div>
                   </div>
                   <button 
                    onClick={() => { setChatRecipient({id: sub.teacherId, name: sub.teacherName, role: UserRole.TEACHER, subject: sub.subjectName, className: childClass.name}); setShowChat(true); }}
                    className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                   >
                      <MessageCircle size={22}/>
                   </button>
                </div>
              ))}
           </div>
        </div>
      </div>
    );
  };

  const renderChildList = () => (
    <div className="space-y-8 px-4 pb-24 animate-in fade-in" dir="rtl">
       <div className="bg-indigo-950 p-12 rounded-[4rem] text-white shadow-2xl relative overflow-hidden border border-white/10">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px]"></div>
          <div className="relative z-10 text-right">
             <div className="w-16 h-16 bg-white/10 rounded-[1.5rem] flex items-center justify-center mb-6 border border-white/10 shadow-inner">
                <ShieldCheck size={32} className="text-emerald-400" />
             </div>
             <h2 className="text-4xl font-black leading-tight">أهلاً بك، <br />ولي أمر طلابنا الكرام</h2>
             <p className="text-indigo-300 font-bold mt-4 text-lg">أبناؤك أمانة، ونحن شركاؤك في صناعة مستقبلهم.</p>
          </div>
          <div className="mt-12">
             <div className="bg-white/10 px-6 py-3 rounded-2xl border border-white/10 backdrop-blur-md text-[11px] font-black text-indigo-100 uppercase tracking-widest inline-flex items-center gap-3">
                <BadgeCheck size={18} className="text-emerald-400" /> الأبناء المسجلين: {myChildren.length}
             </div>
          </div>
       </div>

       <div className="space-y-6">
          <h3 className="font-black text-2xl text-slate-800 px-2 text-right">اختر الابن للمتابعة</h3>
          <div className="grid grid-cols-1 gap-6">
             {myChildren.map(child => (
               <div key={child.id} onClick={() => setSelectedChildId(child.id)} className="bg-white p-10 rounded-[3.5rem] shadow-xl border border-slate-100 flex items-center gap-10 group active:scale-95 transition-all cursor-pointer hover:border-indigo-500 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className={`w-24 h-24 rounded-[2.5rem] flex items-center justify-center text-white font-black text-4xl shadow-2xl transition-transform group-hover:scale-110 ${child.avatarColor}`}>{child.fullName[0]}</div>
                  <div className="flex-1 text-right">
                     <h4 className="font-black text-2xl text-slate-800 leading-none mb-3">{child.fullName}</h4>
                     <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">{CLASSES.find(c => c.id === child.classId)?.name}</p>
                     <div className="flex gap-4 mt-6">
                        <div className="flex items-center gap-2 text-emerald-600 font-black text-[10px]"><CheckCircle2 size={14}/> متابعة الانضباط</div>
                        <div className="flex items-center gap-2 text-indigo-600 font-black text-[10px]"><Star size={14}/> سجل الدرجات</div>
                     </div>
                  </div>
                  <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all shadow-inner"><ChevronLeft size={28} /></div>
               </div>
             ))}
          </div>
       </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans" dir="rtl">
       {toast && <CustomToast message={toast} onClose={() => setToast(null)} />}
       
       {showChat && (
         <ChatPortal 
           user={user} 
           recipient={chatRecipient}
           childrenNames={myChildren.map(c => c.fullName)}
           onClose={() => { setShowChat(false); setUnreadCount(0); }} 
           onShowToast={setToast} 
         />
       )}

       <header className="bg-white/95 backdrop-blur-xl px-8 py-8 border-b border-slate-100 flex justify-between items-center sticky top-0 z-50 shadow-sm">
          <div className="flex items-center gap-4">
             <div className="w-14 h-14 bg-indigo-950 rounded-2xl flex items-center justify-center shadow-2xl border border-indigo-400/20"><User className="text-white" size={32}/></div>
             <div className="text-right">
                <h1 className="text-xl font-black text-slate-800 leading-none">بوابة ولي الأمر</h1>
                <p className="text-[10px] text-indigo-600 font-black uppercase mt-1.5 tracking-widest">Unified Parental Hub</p>
             </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => { setChatRecipient({id: 'admin-1', name: 'إدارة المدرسة', role: UserRole.ADMIN}); setShowChat(true); }}
              className="p-4 bg-indigo-50 text-indigo-700 rounded-2xl relative hover:bg-indigo-100 transition-all border border-indigo-100 active:scale-90"
            >
                <MessageSquare size={24}/>
            </button>
            <button onClick={onLogout} className="p-4 bg-rose-50 text-rose-500 rounded-2xl border border-rose-100 hover:bg-rose-100 transition-all shadow-sm active:scale-90"><LogOut size={24}/></button>
          </div>
       </header>

       <main className="py-12 max-w-5xl mx-auto">
          {selectedChildId ? (
            <div>
               <div className="px-6 mb-10 flex justify-end">
                  <button onClick={() => setSelectedChildId(null)} className="px-8 py-4 bg-white shadow-xl border border-slate-100 rounded-2xl font-black text-sm text-slate-400 hover:text-indigo-600 transition-all flex items-center gap-3 active:scale-95 group">
                    <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" /> العودة لقائمة الأبناء
                  </button>
               </div>
               {activeChild && renderChildDetail(activeChild)}
            </div>
          ) : renderChildList()}
       </main>

       {/* Parent Navigation */}
       <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-2xl border-t border-slate-100 px-12 py-6 flex justify-around items-center z-[110] shadow-[0_-20px_50px_rgba(0,0,0,0.06)] rounded-t-[3.5rem] md:max-w-md md:mx-auto md:mb-6 md:rounded-full md:border">
          <button onClick={() => setSelectedChildId(null)} className={`flex flex-col items-center gap-1.5 transition-all ${!selectedChildId ? 'text-indigo-600 scale-110' : 'text-slate-300 hover:text-slate-400'}`}>
             <div className={`p-3 rounded-2xl transition-all ${!selectedChildId ? 'bg-indigo-50 shadow-inner' : ''}`}><LayoutGrid size={24} strokeWidth={!selectedChildId ? 3 : 2} /></div>
             <span className="text-[10px] font-black uppercase tracking-tight">الرئيسية</span>
          </button>
          <button 
            onClick={() => { setChatRecipient({id: 'admin-1', name: 'إدارة المدرسة', role: UserRole.ADMIN}); setShowChat(true); }}
            className="flex flex-col items-center gap-1.5 text-slate-300 hover:text-indigo-600 transition-all"
          >
             <div className="p-3 rounded-2xl bg-slate-50"><MessageSquare size={24} /></div>
             <span className="text-[10px] font-black uppercase tracking-tight">تواصل مباشر</span>
          </button>
       </nav>
    </div>
  );
};
