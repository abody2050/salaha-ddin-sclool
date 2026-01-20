
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  BookOpen, Calendar, ChevronLeft, GraduationCap, 
  CheckCircle2, Clock, User, LogOut, Save, 
  ArrowRight, PenTool, ClipboardList, TrendingUp,
  Sparkles, FileSpreadsheet, LayoutGrid, Star, Hash,
  AlertTriangle, Lock, ShieldCheck, MessageSquare, Send, X, Info, BadgeCheck, Phone,
  Users, Key, RefreshCw, Search, ArrowLeft, CalendarDays, Filter, FileText, BarChart3,
  Trophy, UserCheck, UserX, Timer, FileEdit, Zap, Printer, BrainCircuit, Camera, AlertCircle
} from 'lucide-react';
import { StaffMember, Student, SchoolClass, SystemConfig, User as UserType, UserRole, AppNotification, ChatMessage, AttendanceDay, AttendanceStatus, AttendanceEntry } from '../types';
import { CLASSES } from '../constants';
import { fetchCollection, saveToFirestore } from '../services/firebaseService';
import { ChatPortal } from './ChatPortal';
import { CustomToast } from '../components/CustomUI';
import { GradesManagementView } from './GradesManagementView';
import { analyzeTeacherGradesImage, GradeExtractionResult } from '../services/geminiService';

interface TeacherPortalViewProps {
  user: UserType;
  staffMember: StaffMember;
  students: Student[];
  config: SystemConfig;
  onLogout: () => void;
}

type PortalView = 'HOME' | 'GRADING' | 'STUDENTS' | 'SECURITY' | 'REPORT';
type DateRangeType = 'THIS_WEEK' | 'LAST_WEEK' | 'THIS_MONTH' | 'LAST_MONTH' | 'CUSTOM';

export const TeacherPortalView: React.FC<TeacherPortalViewProps> = ({ 
  user, staffMember, students, config, onLogout 
}) => {
  const [currentView, setCurrentView] = useState<PortalView>('HOME');
  const [toast, setToast] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [allAttendance, setAllAttendance] = useState<AttendanceDay[]>([]);
  
  // AI Grading States
  const [showAIModal, setShowAIModal] = useState(false);
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [extractedGrades, setExtractedGrades] = useState<GradeExtractionResult | null>(null);
  const aiFileInputRef = useRef<HTMLInputElement>(null);

  // Report States
  const [dateRangeType, setDateRangeType] = useState<DateRangeType>('THIS_MONTH');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedClassForReport, setSelectedClassForReport] = useState<string>('');

  const teacherFullName = staffMember.name;

  useEffect(() => {
    const loadAttendance = async () => {
      const data = await fetchCollection("attendance") as AttendanceDay[];
      setAllAttendance(data);
    };
    loadAttendance();
    
    const myClassIds = staffMember.assignments.flatMap(a => a.classIds);
    if (myClassIds.length > 0) setSelectedClassForReport(myClassIds[0]);

    const getUnread = async () => {
      const allMsgs = await fetchCollection("support_chats") as ChatMessage[];
      const unread = allMsgs.filter(m => m.senderRole === UserRole.ADMIN && m.replyToId === user.id && !m.isRead).length;
      setUnreadCount(unread);
    };
    getUnread();
  }, [user.id, staffMember]);

  useEffect(() => {
    const now = new Date();
    let start = new Date();
    let end = new Date();

    if (dateRangeType === 'THIS_WEEK') {
      const day = now.getDay(); 
      const diff = now.getDate() - day + (day === 6 ? 0 : -1); 
      start = new Date(new Date().setDate(diff));
      end = new Date();
    } else if (dateRangeType === 'LAST_WEEK') {
      const day = now.getDay();
      const diff = now.getDate() - day - 7 + (day === 6 ? 0 : -1);
      start = new Date(new Date().setDate(diff));
      end = new Date(new Date(start).setDate(start.getDate() + 4)); 
    } else if (dateRangeType === 'THIS_MONTH') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date();
    } else if (dateRangeType === 'LAST_MONTH') {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end = new Date(now.getFullYear(), now.getMonth(), 0);
    }

    if (dateRangeType !== 'CUSTOM') {
      setStartDate(start.toISOString().split('T')[0]);
      setEndDate(end.toISOString().split('T')[0]);
    }
  }, [dateRangeType]);

  const assignedClassesForMember = useMemo(() => {
    const myClassIds = Array.from(new Set(staffMember.assignments.flatMap(a => a.classIds)));
    return CLASSES.filter(c => myClassIds.includes(c.id));
  }, [staffMember]);

  const handleAIGradeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAIProcessing(true);
    setAiError(null);
    try {
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
      });

      const result = await analyzeTeacherGradesImage(base64);
      setExtractedGrades(result);
    } catch (err: any) {
      setAiError(err.message || "فشل تحليل صورة الدرجات.");
    } finally {
      setIsAIProcessing(false);
    }
  };

  const workingDaysList = useMemo(() => {
    if (!startDate || !endDate) return [];
    const list = [];
    let curr = new Date(startDate);
    const last = new Date(endDate);
    while (curr <= last) {
      const dayNum = curr.getDay(); 
      if (dayNum !== 4 && dayNum !== 5) {
        list.push(curr.toISOString().split('T')[0]);
      }
      curr.setDate(curr.getDate() + 1);
    }
    return list;
  }, [startDate, endDate]);

  const reportData = useMemo(() => {
    if (!selectedClassForReport) return { students: [], totals: { commitment: 0, present: 0, absent: 0, late: 0, excused: 0, escaped: 0 } };
    
    const classStudents = students.filter(s => s.classId === selectedClassForReport);
    const relevantAttendance = allAttendance.filter(d => 
      d.classId === selectedClassForReport && 
      d.date >= startDate && d.date <= endDate &&
      workingDaysList.includes(d.date)
    );

    const studentsStats = classStudents.map(student => {
      const stats = { present: 0, absent: 0, late: 0, excused: 0, escaped: 0 };
      relevantAttendance.forEach(day => {
        const rec = day.records[student.id];
        if (rec) {
          if (rec.status === AttendanceStatus.PRESENT) stats.present++;
          else if (rec.status === AttendanceStatus.ABSENT) stats.absent++;
          else if (rec.status === AttendanceStatus.LATE) stats.late++;
          else if (rec.status === AttendanceStatus.EXCUSED) stats.excused++;
          else if (rec.status === AttendanceStatus.ESCAPED) stats.escaped++;
        } else {
          stats.present++; 
        }
      });

      const totalDays = workingDaysList.length;
      const commitmentScore = totalDays > 0 ? ((stats.present + stats.excused + (stats.late * 0.5)) / totalDays) * 100 : 100;

      return {
        id: student.id,
        name: student.fullName || student.name,
        ...stats,
        commitment: Math.min(100, Math.round(commitmentScore))
      };
    });

    const totalPossible = studentsStats.length * workingDaysList.length;
    const sum = (field: keyof typeof studentsStats[0]) => studentsStats.reduce((acc, s) => acc + (Number(s[field]) || 0), 0);
    
    return {
      students: studentsStats.sort((a,b) => b.commitment - a.commitment),
      totals: {
        commitment: studentsStats.length > 0 ? Math.round(sum('commitment') / studentsStats.length) : 0,
        present: totalPossible > 0 ? Math.round((sum('present') / totalPossible) * 100) : 0,
        absent: totalPossible > 0 ? Math.round((sum('absent') / totalPossible) * 100) : 0,
        late: totalPossible > 0 ? Math.round((sum('late') / totalPossible) * 100) : 0,
        excused: totalPossible > 0 ? Math.round((sum('excused') / totalPossible) * 100) : 0,
        escaped: totalPossible > 0 ? Math.round((sum('escaped') / totalPossible) * 100) : 0,
      }
    };
  }, [selectedClassForReport, allAttendance, workingDaysList, students, startDate, endDate]);

  const renderReport = () => (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 pb-24 text-right" dir="rtl">
       <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-slate-100 space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
             <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg"><FileSpreadsheet size={24}/></div>
                <div>
                   <h3 className="text-xl font-black text-slate-800 leading-none">إحصائيات المواظبة المتقدمة</h3>
                   <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-widest">Attendance Analytics Pro</p>
                </div>
             </div>
             
             <div className="flex gap-1.5 bg-slate-100 p-1.5 rounded-2xl overflow-x-auto w-full md:w-auto scrollbar-hide">
                {['THIS_WEEK', 'LAST_WEEK', 'THIS_MONTH', 'LAST_MONTH', 'CUSTOM'].map(type => (
                  <button key={type} onClick={() => setDateRangeType(type as DateRangeType)} className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all whitespace-nowrap ${dateRangeType === type ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>{type}</button>
                ))}
             </div>
          </div>
       </div>

       <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
             <table className="w-full text-right table-fixed min-w-[600px]">
                <thead>
                   <tr className="bg-emerald-950 text-white text-[9px] font-black uppercase tracking-tight">
                      <th className="w-[6%] py-5 text-center">#</th>
                      <th className="w-[30%] py-5 pr-6">اسم الطالب</th>
                      <th className="w-[10%] py-5 text-center bg-emerald-600/10 text-emerald-600">حضور</th>
                      <th className="w-[10%] py-5 text-center bg-rose-600/10 text-rose-600">غياب</th>
                      <th className="w-[10%] py-5 text-center bg-amber-600/10 text-amber-600">تأخر</th>
                      <th className="w-[10%] py-5 text-center bg-blue-600/10 text-blue-600">إذن</th>
                      <th className="w-[10%] py-5 text-center bg-slate-900 text-white">هروب</th>
                      <th className="w-[14%] py-5 text-center">الالتزام</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                   {reportData.students.map((s, idx) => (
                     <tr key={s.id} className="hover:bg-slate-50 transition-all">
                        <td className="py-4 text-center text-[9px] font-black text-slate-300">{idx + 1}</td>
                        <td className="py-4 pr-6">
                           <p className="font-black text-slate-700 text-xs truncate leading-tight">{s.name}</p>
                        </td>
                        <td className="py-4 text-center font-black text-emerald-600 text-sm">{s.present}</td>
                        <td className="py-4 text-center font-black text-rose-600 text-sm">{s.absent}</td>
                        <td className="py-4 text-center font-black text-amber-600 text-sm">{s.late}</td>
                        <td className="py-4 text-center font-black text-blue-600 text-sm">{s.excused}</td>
                        <td className="py-4 text-center font-black text-slate-800 text-sm">{s.escaped}</td>
                        <td className="py-4 text-center font-black text-indigo-600">{s.commitment}%</td>
                     </tr>
                   ))}
                </tbody>
             </table>
          </div>
       </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans" dir="rtl">
       {toast && <CustomToast message={toast} onClose={() => setToast(null)} />}
       {showChat && <ChatPortal user={user} onClose={() => { setShowChat(false); setUnreadCount(0); }} onShowToast={setToast} />}

       <header className="bg-white/95 backdrop-blur-xl px-6 md:px-10 py-5 border-b border-slate-100 flex justify-between items-center sticky top-0 z-[100] shadow-sm flex-row-reverse">
          <div className="flex items-center gap-4 flex-row-reverse">
             <div className="w-12 h-12 bg-emerald-950 rounded-2xl flex items-center justify-center shadow-xl border border-emerald-500/20 shrink-0"><GraduationCap className="text-emerald-400" size={28}/></div>
             <div className="text-right">
                <h1 className="text-xl font-black text-slate-800 leading-none">بوابة المعلم الموحدة</h1>
                <p className="text-[10px] text-emerald-600 font-black uppercase mt-1.5 tracking-widest">Unified Educator Dashboard</p>
             </div>
          </div>
          <div className="flex items-center gap-3">
             <button 
                onClick={() => { setShowAIModal(true); setExtractedGrades(null); setAiError(null); }}
                className="w-12 h-12 bg-indigo-600 text-white rounded-2xl shadow-lg flex items-center justify-center hover:bg-indigo-700 active:scale-95 transition-all border border-white/20"
                title="مساعد رصد الدرجات بالذكاء الاصطناعي"
             >
                <Sparkles size={22} />
             </button>
             <button onClick={onLogout} className="p-3 bg-rose-50 text-rose-500 rounded-2xl border border-rose-100 hover:bg-rose-600 hover:text-white transition-all shadow-sm">
                <LogOut size={18}/>
             </button>
          </div>
       </header>

       <main className="py-8 px-4 md:px-10 max-w-6xl mx-auto">
          {currentView === 'HOME' && (
            <div className="space-y-6 animate-in fade-in duration-700 pb-24 text-right">
              <div className="bg-emerald-950 p-10 rounded-[3.5rem] text-white shadow-2xl relative overflow-hidden border border-emerald-800/50">
                 <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-400/10 rounded-full blur-[80px]"></div>
                 <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
                    <div className={`w-24 h-24 rounded-[2.5rem] flex items-center justify-center text-white font-black text-4xl shadow-2xl border-4 border-white/10 ${staffMember.avatarColor}`}>
                       {teacherFullName[0]}
                    </div>
                    <div className="flex-1 text-right">
                       <h2 className="text-3xl font-black">أهلاً بك، أ/ {teacherFullName}</h2>
                       <div className="flex items-center gap-3 mt-4 justify-start">
                          <div className="bg-white/10 px-4 py-2 rounded-2xl border border-white/10 text-[11px] font-black uppercase tracking-widest">{staffMember.jobTitle}</div>
                          <div className="bg-emerald-400/20 px-4 py-2 rounded-2xl border border-emerald-400/20 text-[11px] font-black text-emerald-100 uppercase tracking-widest">كادر معتمد</div>
                       </div>
                    </div>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <button onClick={() => setCurrentView('GRADING')} className="p-8 bg-white border border-slate-100 rounded-[2.5rem] shadow-lg flex flex-col items-center gap-3 hover:border-emerald-500 transition-all group text-center">
                    <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-sm"><PenTool size={28}/></div>
                    <span className="font-black text-sm">رصد الدرجات</span>
                 </button>
                 <button onClick={() => setCurrentView('REPORT')} className="p-8 bg-white border border-slate-100 rounded-[2.5rem] shadow-lg flex flex-col items-center gap-3 hover:border-indigo-500 transition-all group text-center">
                    <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm"><BarChart3 size={28}/></div>
                    <span className="font-black text-sm">تقارير المواظبة</span>
                 </button>
              </div>
            </div>
          )}
          {currentView === 'GRADING' && (
             <div className="animate-in slide-in-from-right-6 duration-500 pb-24 text-right">
                <button onClick={() => setCurrentView('HOME')} className="mb-6 p-3 bg-white shadow-md border border-slate-100 rounded-xl text-slate-400 hover:text-emerald-600 flex items-center gap-2 flex-row-reverse"><ArrowRight size={20} /><span className="font-black text-[10px]">العودة</span></button>
                <GradesManagementView students={students} staff={[staffMember]} config={config} user={user} />
             </div>
          )}
          {currentView === 'REPORT' && (
             <div className="animate-in slide-in-from-right-6 duration-500 pb-24 text-right">
                <button onClick={() => setCurrentView('HOME')} className="mb-6 p-3 bg-white shadow-md border border-slate-100 rounded-xl text-slate-400 hover:text-emerald-600 flex items-center gap-2 flex-row-reverse"><ArrowRight size={20} /><span className="font-black text-[10px]">العودة</span></button>
                {renderReport()}
             </div>
          )}
       </main>

       {/* Gemini AI Grades Assistant Modal */}
       {showAIModal && (
         <div className="fixed inset-0 z-[2500] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl animate-in fade-in">
            <div className="bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden border border-slate-100 flex flex-col animate-in zoom-in-95 max-h-[90vh]">
               <div className="p-6 bg-indigo-700 text-white flex justify-between items-center shrink-0 flex-row-reverse">
                  <div className="flex items-center gap-4 flex-row-reverse">
                     <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center shadow-inner"><BrainCircuit size={28}/></div>
                     <div className="text-right">
                        <h3 className="text-lg font-black leading-tight">مساعد المعلم الذكي (رصد الدرجات)</h3>
                        <p className="text-[10px] text-white/50 font-black uppercase tracking-widest">Neural Grading Assistant</p>
                     </div>
                  </div>
                  <button onClick={() => setShowAIModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={24}/></button>
               </div>

               <div className="flex-1 overflow-y-auto p-8 scrollbar-hide text-right" dir="rtl">
                  {aiError && (
                    <div className="mb-6 p-6 bg-rose-50 border-2 border-rose-100 rounded-3xl flex items-start gap-4 animate-in shake duration-500">
                       <AlertCircle className="text-rose-600 shrink-0" size={24} />
                       <div className="text-right">
                          <h4 className="font-black text-rose-800 text-sm">تنبيه المساعد</h4>
                          <p className="text-xs font-bold text-rose-600 mt-1">{aiError}</p>
                       </div>
                    </div>
                  )}

                  {!extractedGrades ? (
                    <div className="space-y-10 py-10">
                       <div className="text-center space-y-4">
                          <h4 className="text-2xl font-black text-slate-800">ارصد درجات فصلك بلمحة واحدة</h4>
                          <p className="text-slate-400 font-bold max-w-md mx-auto leading-relaxed">التقط صورة واضحة لكشف درجات الطلاب الورقي، وسيقوم المساعد باستخراج القيم آلياً ووضعها في النظام.</p>
                       </div>

                       <div 
                         onClick={() => !isAIProcessing && aiFileInputRef.current?.click()}
                         className={`group h-64 bg-slate-50 rounded-[2.5rem] border-4 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center ${isAIProcessing ? 'opacity-50 pointer-events-none' : 'border-indigo-100 hover:border-indigo-500 hover:bg-indigo-50/30'}`}
                       >
                          {isAIProcessing ? (
                             <div className="flex flex-col items-center gap-4">
                                <RefreshCw className="animate-spin text-indigo-600" size={64}/>
                                <p className="font-black text-indigo-600 animate-pulse">جاري تحليل كشف الدرجات عصبياً...</p>
                             </div>
                          ) : (
                             <>
                                <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-4 transition-transform group-hover:scale-110">
                                   <Camera size={36} />
                                </div>
                                <p className="font-black text-slate-600 text-lg">التقط صورة كشف الدرجات</p>
                                <p className="text-slate-400 text-xs font-bold mt-1">يدعم استخراج درجات الواجبات، الشفهي، والتحريري</p>
                             </>
                          )}
                       </div>
                       <input type="file" ref={aiFileInputRef} className="hidden" accept="image/*" onChange={handleAIGradeUpload} />
                    </div>
                  ) : (
                    <div className="space-y-6 animate-in slide-in-from-left-4">
                       <div className="flex justify-between items-center border-b border-slate-100 pb-4 flex-row-reverse">
                          <div className="text-right">
                             <h4 className="text-xl font-black text-slate-800">معاينة رصد المساعد</h4>
                             <p className="text-xs font-bold text-slate-400 mt-1">تم رصد {extractedGrades.grades.length} طلاب بنجاح من الكشف الورقي</p>
                          </div>
                          <button onClick={() => setExtractedGrades(null)} className="px-6 py-2 bg-slate-100 text-slate-500 rounded-xl font-black text-[10px]">إعادة المحاولة</button>
                       </div>

                       <div className="bg-white rounded-[2.5rem] overflow-hidden border border-slate-300 shadow-inner">
                          <table className="w-full text-right table-fixed">
                             <thead>
                                <tr className="bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest">
                                   <th className="px-4 py-4 w-[35%]">اسم الطالب (Black Text)</th>
                                   <th className="px-2 py-4 text-center">واجب</th>
                                   <th className="px-2 py-4 text-center">شفهي</th>
                                   <th className="px-2 py-4 text-center">تحريري</th>
                                   <th className="px-2 py-4 text-center bg-indigo-600">المجموع</th>
                                </tr>
                             </thead>
                             <tbody className="divide-y divide-slate-100">
                                {extractedGrades.grades.map((g, idx) => (
                                  <tr key={idx} className="hover:bg-slate-50 transition-all">
                                     <td className="px-4 py-2">
                                        <input 
                                          value={g.studentName} 
                                          className="w-full px-2 py-1.5 bg-transparent font-black text-[12px] text-black outline-none" 
                                          readOnly
                                        />
                                     </td>
                                     <td className="px-1 py-2">
                                        <input type="number" value={g.homework || ''} className="w-full px-1 py-1.5 bg-transparent font-bold text-[11px] text-black text-center outline-none" />
                                     </td>
                                     <td className="px-1 py-2">
                                        <input type="number" value={g.oral || ''} className="w-full px-1 py-1.5 bg-transparent font-bold text-[11px] text-black text-center outline-none" />
                                     </td>
                                     <td className="px-1 py-2">
                                        <input type="number" value={g.written || ''} className="w-full px-1 py-1.5 bg-transparent font-bold text-[11px] text-black text-center outline-none" />
                                     </td>
                                     <td className="px-1 py-2 bg-indigo-50/50">
                                        <span className="block w-full text-center font-black text-indigo-700 text-sm">{(g.homework || 0) + (g.oral || 0) + (g.written || 0) + (g.attendance || 0)}</span>
                                     </td>
                                  </tr>
                                ))}
                             </tbody>
                          </table>
                       </div>

                       <div className="pt-6 flex justify-center">
                          <button 
                            className="px-14 py-5 bg-emerald-600 text-white rounded-[2rem] font-black text-lg shadow-2xl hover:bg-emerald-700 active:scale-95 transition-all flex items-center gap-4"
                          >
                             <SaveIconLucide size={24}/>
                             <span>اعتماد البيانات في السجل الرقمي</span>
                          </button>
                       </div>
                    </div>
                  )}
               </div>
            </div>
         </div>
       )}

       {/* Bottom Navigation */}
       <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-2xl border-t border-slate-100 px-8 py-5 flex justify-around items-center z-[120] shadow-2xl rounded-t-[3rem] md:max-w-3xl md:mx-auto md:mb-6 md:rounded-[2.5rem] md:border">
          {[
            { id: 'HOME', label: 'الرئيسية', icon: LayoutGrid },
            { id: 'GRADING', label: 'الرصد', icon: PenTool },
            { id: 'REPORT', label: 'التقارير', icon: BarChart3 },
            { id: 'STUDENTS', label: 'الطلاب', icon: Users },
          ].map(tab => (
            <button key={tab.id} onClick={() => setCurrentView(tab.id as PortalView)} className={`flex flex-col items-center gap-1 transition-all ${currentView === tab.id ? 'text-emerald-700 scale-110' : 'text-slate-300'}`}>
               <div className={`p-3 rounded-2xl ${currentView === tab.id ? 'bg-emerald-50' : ''}`}><tab.icon size={22} /></div>
               <span className="text-[10px] font-black">{tab.label}</span>
            </button>
          ))}
       </nav>
    </div>
  );
};

const SaveIconLucide: React.FC<{size?: number, className?: string}> = ({size = 24, className}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
    <polyline points="17 21 17 13 7 13 7 21"></polyline>
    <polyline points="7 3 7 8 15 8"></polyline>
  </svg>
);
