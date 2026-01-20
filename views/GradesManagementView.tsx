
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  GraduationCap, Users, ArrowRight, ArrowLeft,
  Book, Sun, PenTool, Type, Variable, FlaskConical, 
  Globe2, Atom, TestTube2, Microscope, Scroll, MapPin, Users2,
  ArrowLeftRight, Info, X, RefreshCw, CheckCircle2, Cloud, AlertTriangle, Check, 
  Search, Filter, ListChecks, CircleDashed, AlertCircle, Save, UserCheck, ShieldCheck,
  MessageSquare, Clock, CalendarDays, ChevronLeft, LayoutList, BookOpen, CloudCheck,
  WifiOff, RotateCcw, ShieldAlert, RotateCw, Lock, Unlock, SendHorizontal, FileX, Wifi
} from 'lucide-react';
import { CLASSES } from '../constants';
import { Student, StaffMember, StudentGradeRecord, GradeEntry, SystemConfig, User as UserType, UserRole } from '../types';
import { saveToFirestore, fetchCollection, logActivity, sanitizeData } from '../services/firebaseService';

const SUBJECT_STYLING: Record<string, { icon: any, color: string, bg: string, border: string, text: string }> = {
  'قرآن': { icon: Book, color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-100', text: 'text-emerald-700' },
  'تربية إسلامية': { icon: Sun, color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-100', text: 'text-amber-700' },
  'لغة عربية': { icon: PenTool, color: 'text-orange-500', bg: 'bg-orange-50', border: 'border-orange-100', text: 'text-orange-700' },
  'English': { icon: Type, color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-100', text: 'text-blue-700' },
  'رياضيات': { icon: Variable, color: 'text-indigo-500', bg: 'bg-indigo-50', border: 'border-indigo-100', text: 'text-indigo-700' },
  'علوم': { icon: FlaskConical, color: 'text-teal-500', bg: 'bg-teal-50', border: 'border-teal-100', text: 'text-teal-700' },
  'اجتماعيات': { icon: Globe2, color: 'text-sky-500', bg: 'bg-sky-100', border: 'border-sky-200', text: 'text-sky-700' },
  'فيزياء': { icon: Atom, color: 'text-violet-500', bg: 'bg-violet-50', border: 'border-violet-100', text: 'text-violet-700' },
  'كيمياء': { icon: TestTube2, color: 'text-pink-500', bg: 'bg-pink-50', border: 'border-pink-100', text: 'text-pink-700' },
  'أحياء': { icon: Microscope, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100', text: 'text-green-700' },
  'تاريخ': { icon: Scroll, color: 'text-stone-500', bg: 'bg-stone-50', border: 'border-stone-100', text: 'text-stone-700' },
  'جغرافيا': { icon: MapPin, color: 'text-red-500', bg: 'bg-red-100', border: 'border-red-200', text: 'text-red-700' },
};

const GRADE_LIMITS = { homework: 20, attendance: 20, oral: 30, written: 30, total: 100 };

type ViewState = 'CLASS_SELECT' | 'SUBJECT_SELECT' | 'MONTH_SELECT' | 'GRADING_GRID';
type MobileLayoutMode = 'CARDS' | 'TABLE';
type SyncStatus = 'READY' | 'PENDING' | 'LOCAL_SAVED' | 'SYNCING' | 'DONE' | 'ERROR';
type FilterMode = 'ALL' | 'COMPLETED' | 'INCOMPLETE' | 'NOT_RECORDED';

interface GradesManagementViewProps {
  students: Student[];
  staff: StaffMember[];
  config: SystemConfig;
  user: UserType;
}

export const GradesManagementView: React.FC<GradesManagementViewProps> = ({ students, staff, config, user }) => {
  const [currentView, setCurrentView] = useState<ViewState>('CLASS_SELECT');
  const [mobileLayout, setMobileLayout] = useState<MobileLayoutMode>(() => (localStorage.getItem('preferred_grading_layout') as MobileLayoutMode) || 'CARDS');
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [activeMonthIndex, setActiveMonthIndex] = useState(0); 
  const [filterMode, setFilterMode] = useState<FilterMode>('ALL');
  const [gradesDb, setGradesDb] = useState<Record<string, StudentGradeRecord>>({});
  const [locks, setLocks] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<{msg: string, type: 'success' | 'error'} | null>(null);
  const [manualOverrideIds, setManualOverrideIds] = useState<Set<string>>(new Set());
  const [overrideConfirm, setOverrideConfirm] = useState<{ studentId: string; studentName: string; newValue: string; subFields: {label: string, val: any}[]; } | null>(null);
  const [restoreConfirm, setRestoreConfirm] = useState<{ studentId: string; studentName: string; monthData: any; } | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('READY');
  const [showSyncSuccessText, setShowSyncSuccessText] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  const autoSaveTimerRef = useRef<any>(null);
  const pendingSyncQueue = useRef<Record<string, any>>({});

  // استعادة البيانات من التخزين المحلي عند البدء
  useEffect(() => {
    const localData = localStorage.getItem('offline_grades_cache');
    if (localData) {
      try {
        const parsed = JSON.parse(localData);
        setGradesDb(prev => ({ ...prev, ...parsed }));
      } catch (e) { console.error("Error parsing local cache"); }
    }
  }, []);

  // حفظ نسخة احتياطية محلية عند كل تغيير
  useEffect(() => {
    if (Object.keys(gradesDb).length > 0) {
      try {
        // استخدام sanitizeData قبل JSON.stringify يمنع أخطاء Circular Structure
        const cleanGrades = sanitizeData(gradesDb);
        localStorage.setItem('offline_grades_cache', JSON.stringify(cleanGrades));
      } catch (e) {
        console.error("Local Storage Save Error:", e);
      }
    }
  }, [gradesDb]);

  // مراقبة حالة الإنترنت والمزامنة التلقائية
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      processSyncQueue();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (selectedClassId && selectedSubject) {
       const loadGradesAndLocks = async () => {
          const [remoteGrades, remoteLocks] = await Promise.all([
             fetchCollection("grades"),
             fetchCollection("grading_locks")
          ]);
          
          const formattedGrades: Record<string, StudentGradeRecord> = {};
          remoteGrades.forEach((g: any) => { formattedGrades[`${g.studentId}-${g.subjectName}`] = g; });
          
          // دمج البيانات السحابية مع المحلية (الأولوية للأحدث)
          setGradesDb(prev => ({ ...formattedGrades, ...prev }));

          const formattedLocks: Record<string, boolean> = {};
          remoteLocks.forEach((l: any) => { formattedLocks[l.id] = l.isLocked; });
          setLocks(formattedLocks);
       };
       loadGradesAndLocks();
    }
  }, [selectedClassId, selectedSubject, currentView]);

  useEffect(() => {
    const currentMonthName = new Intl.DateTimeFormat('ar-YE', { month: 'long' }).format(new Date());
    const idx = config.activeMonths.findIndex(m => currentMonthName.includes(m.gregorian));
    if (idx !== -1) setActiveMonthIndex(idx);
  }, [config.activeMonths]);

  const activeMonth = config.activeMonths?.[activeMonthIndex] || config.activeMonths?.[0];
  const selectedClass = CLASSES.find(c => c.id === selectedClassId);
  const isAdmin = user.role === UserRole.ADMIN;
  const currentLockId = `${selectedClassId}_${selectedSubject}_${activeMonth?.gregorian}`;
  const isMonthLocked = locks[currentLockId] || false;

  const hasManualOverridePermission = useMemo(() => {
    if (isAdmin) return true;
    const currentStaff = staff.find(s => s.id === user.employeeId);
    return currentStaff?.canManualOverrideTotal === true;
  }, [user, staff, isAdmin]);

  const processSyncQueue = async () => {
    const queue = pendingSyncQueue.current;
    const keys = Object.keys(queue);
    if (keys.length === 0 || !navigator.onLine) return;

    setSyncStatus('SYNCING');
    try {
      for (const key of keys) {
        await saveToFirestore("grades", key, queue[key]);
        delete queue[key];
      }
      setSyncStatus('DONE');
      setShowSyncSuccessText(true);
      setTimeout(() => { setShowSyncSuccessText(false); setSyncStatus('READY'); }, 3000);
    } catch (e) {
      setSyncStatus('ERROR');
    }
  };

  const triggerSync = (key: string, data: any) => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    
    // وضعها في طابور المزامنة
    pendingSyncQueue.current[key] = data;

    if (!navigator.onLine) {
      setSyncStatus('LOCAL_SAVED');
      return;
    }

    setSyncStatus('SYNCING');
    autoSaveTimerRef.current = setTimeout(processSyncQueue, 4000); 
  };

  const executeGradeUpdate = (studentId: string, field: string, value: string, markManual: boolean) => {
    const numValue = value === '' ? undefined : parseInt(value);
    const recordKey = `${studentId}-${selectedSubject}`;
    if (markManual) setManualOverrideIds(prev => new Set(prev).add(studentId));

    setGradesDb(prev => {
      const currentRecord = prev[recordKey] || { studentId, classId: selectedClassId!, subjectName: selectedSubject!, months: {} };
      const currentMonthData = currentRecord.months[activeMonth.gregorian] || { };
      const updatedMonthData = { ...currentMonthData, [field]: numValue } as any;

      if (['homework', 'attendance', 'oral', 'written'].includes(field)) {
        const subFields = [updatedMonthData.homework, updatedMonthData.attendance, updatedMonthData.oral, updatedMonthData.written];
        const anyFieldHasValue = subFields.some(v => v !== undefined);
        if (anyFieldHasValue) {
          updatedMonthData.total = subFields.reduce((a, b) => (a || 0) + (b || 0), 0);
          updatedMonthData.finalScore = Math.round(updatedMonthData.total / 5);
        } else {
          updatedMonthData.total = undefined;
          updatedMonthData.finalScore = undefined;
        }
      } else if (field === 'total') {
        updatedMonthData.finalScore = updatedMonthData.total !== undefined ? Math.round(updatedMonthData.total / 5) : undefined;
      }

      const nextState = { ...prev, [recordKey]: { ...currentRecord, months: { ...currentRecord.months, [activeMonth.gregorian]: updatedMonthData } } };
      
      const isSubfieldsComplete = updatedMonthData.homework !== undefined && 
                                  updatedMonthData.attendance !== undefined && 
                                  updatedMonthData.oral !== undefined && 
                                  updatedMonthData.written !== undefined;
      
      if (isSubfieldsComplete || field === 'total' || markManual) {
        triggerSync(recordKey, nextState[recordKey]);
      } else {
        setSyncStatus('PENDING');
      }
      
      return nextState;
    });
  };

  const getMonthStatus = (monthName: string) => {
    const classSts = students.filter(s => s.classId === selectedClassId);
    if (classSts.length === 0) return 'NOT_STARTED';
    let withTotalCount = 0;
    let fullyCompletedCount = 0;
    classSts.forEach(s => {
      const data = gradesDb[`${s.id}-${selectedSubject}`]?.months?.[monthName] as any;
      if (data?.total !== undefined) {
        withTotalCount++;
        const subFields = [data.homework, data.attendance, data.oral, data.written];
        if (subFields.every(v => v !== undefined)) fullyCompletedCount++;
      }
    });
    if (withTotalCount === 0) return 'NOT_STARTED';
    if (fullyCompletedCount === classSts.length) return 'ALL_COMPLETED';
    return 'PARTIAL';
  };

  const filteredStudents = useMemo(() => {
    const list = students.filter(s => s.classId === selectedClassId).sort((a, b) => a.fullName.localeCompare(b.fullName, 'ar'));
    if (filterMode === 'ALL') return list;
    return list.filter(s => {
      const recordKey = `${s.id}-${selectedSubject}`;
      const data = (gradesDb[recordKey]?.months?.[activeMonth.gregorian] || {}) as any;
      const isManual = manualOverrideIds.has(s.id);
      const hasTotal = data.total !== undefined;
      const hasAllSubFields = [data.homework, data.attendance, data.oral, data.written].every(v => v !== undefined);
      if (filterMode === 'COMPLETED') return hasTotal && (isManual || hasAllSubFields);
      if (filterMode === 'INCOMPLETE') return hasTotal && !isManual && !hasAllSubFields;
      if (filterMode === 'NOT_RECORDED') return !hasTotal;
      return true;
    });
  }, [students, selectedClassId, selectedSubject, gradesDb, activeMonth, filterMode, manualOverrideIds]);

  const toggleLock = async (monthName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAdmin) return;
    const lockId = `${selectedClassId}_${selectedSubject}_${monthName}`;
    const newState = !locks[lockId];
    await saveToFirestore("grading_locks", lockId, { id: lockId, isLocked: newState });
    setLocks(prev => ({ ...prev, [lockId]: newState }));
    setToast({ msg: newState ? "تم قفل الشهر" : "تم فتح التعديل", type: 'success' });
    setTimeout(() => setToast(null), 3000);
  };

  const handleGradeChange = (studentId: string, studentName: string, field: string, value: string) => {
    if (isMonthLocked && !isAdmin) {
       setToast({ msg: "هذا الشهر معتمد ومغلق من الإدارة", type: 'error' });
       setTimeout(() => setToast(null), 3000);
       return;
    }
    const numValue = value === '' ? undefined : parseInt(value);
    const limit = GRADE_LIMITS[field as keyof typeof GRADE_LIMITS] || 100;
    if (numValue !== undefined && numValue > limit) {
      setToast({ msg: `الدرجة القصوى هي ${limit}`, type: 'error' });
      setTimeout(() => setToast(null), 3000);
      return;
    }
    if (field === 'total') {
      if (!hasManualOverridePermission) {
        setToast({ msg: "لا تملك صلاحية الرصد اليدوي", type: 'error' });
        setTimeout(() => setToast(null), 3000);
        return;
      }
      executeGradeUpdate(studentId, 'total', value, true);
    } else {
      executeGradeUpdate(studentId, field, value, false);
    }
  };

  if (currentView === 'CLASS_SELECT') {
    return (
      <div className="space-y-8 animate-in fade-in duration-500 text-right" dir="rtl">
        <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
           <div className="flex items-center gap-6 w-full md:w-auto flex-row-reverse">
              <div className="w-16 h-16 bg-emerald-600 text-white rounded-2xl flex items-center justify-center shadow-lg shrink-0"><GraduationCap size={32} /></div>
              <div className="text-right flex-1">
                <h2 className="text-2xl font-black text-slate-800 leading-tight">اختيار الصف الدراسي</h2>
                <p className="text-slate-400 font-bold text-[10px] uppercase mt-1 tracking-widest leading-none">Grade Entry Hub</p>
              </div>
           </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {CLASSES.filter(c => isAdmin || staff.find(s => s.id === user.employeeId)?.assignments.some(a => a.classIds.includes(c.id))).map(cls => (
             <button key={cls.id} onClick={() => { setSelectedClassId(cls.id); setCurrentView('SUBJECT_SELECT'); }} className="bg-white p-8 rounded-[2.5rem] shadow-lg border border-slate-100 hover:border-emerald-500 hover:scale-[1.02] transition-all text-right group flex flex-col items-end">
                <div className="w-14 h-14 bg-slate-50 text-emerald-600 rounded-2xl flex items-center justify-center font-black text-2xl group-hover:bg-emerald-600 group-hover:text-white transition-all mb-4 shadow-sm">{cls.grade}</div>
                <h3 className="text-xl font-black text-slate-800 leading-tight">{cls.name}</h3>
                <div className="flex items-center gap-2 mt-4 text-slate-400 text-xs font-bold justify-end flex-row-reverse"><Users size={14} /> {students.filter(s => s.classId === cls.id).length} طالباً</div>
             </button>
           ))}
        </div>
      </div>
    );
  }

  if (currentView === 'SUBJECT_SELECT' && selectedClass) {
    return (
      <div className="space-y-8 animate-in slide-in-from-right-6 duration-500 text-right" dir="rtl">
        <div className="flex justify-start">
          <button onClick={() => setCurrentView('CLASS_SELECT')} className="flex items-center gap-2 text-slate-400 font-black text-sm hover:text-emerald-600 transition-colors"> <ArrowRight size={20} className="ml-2" /> العودة للفصول </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
           {selectedClass.subjects.filter(s => isAdmin || staff.find(st => st.id === user.employeeId)?.assignments.some(a => a.subjectName === s.subjectName)).map((sub, i) => {
             const style = SUBJECT_STYLING[sub.subjectName] || SUBJECT_STYLING['قرآن'];
             return (
               <button key={i} onClick={() => { setSelectedSubject(sub.subjectName); setCurrentView('MONTH_SELECT'); }} className="bg-white p-6 rounded-[2rem] shadow-md border border-slate-100 flex items-center gap-6 hover:border-emerald-500 hover:scale-105 transition-all text-right group flex-row">
                  <div className={`w-14 h-14 shrink-0 ${style.bg} ${style.color} rounded-2xl flex items-center justify-center border ${style.border} shadow-sm`}><style.icon size={28} /></div>
                  <div className="min-w-0 flex-1 text-right">
                    <h3 className="text-lg font-black text-slate-800 truncate">{sub.subjectName}</h3>
                    <p className="text-[10px] font-bold text-slate-400 mt-0.5 truncate uppercase tracking-widest">تحديد الشهر للرصد</p>
                  </div>
               </button>
             );
           })}
        </div>
      </div>
    );
  }

  if (currentView === 'MONTH_SELECT' && selectedSubject) {
    return (
      <div className="space-y-8 animate-in slide-in-from-right-6 duration-500 text-right" dir="rtl">
        <div className="flex justify-between items-center px-4">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shadow-sm border border-indigo-100"><CalendarDays size={24}/></div>
              <div className="text-right">
                 <h3 className="text-xl font-black text-slate-800 leading-none">اختر شهر الرصد</h3>
                 <p className="text-[10px] text-slate-400 font-bold uppercase">{selectedSubject} - {selectedClass?.name}</p>
              </div>
           </div>
           <button onClick={() => setCurrentView('SUBJECT_SELECT')} className="flex items-center gap-2 text-slate-400 font-black text-sm hover:text-emerald-600 transition-colors"> <ArrowRight size={20} className="ml-2" /> العودة للمواد </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           {config.activeMonths.map((m, idx) => {
             const status = getMonthStatus(m.gregorian);
             const lockId = `${selectedClassId}_${selectedSubject}_${m.gregorian}`;
             const isLocked = locks[lockId] || false;
             return (
               <button 
                key={idx} 
                onClick={() => { setActiveMonthIndex(idx); setCurrentView('GRADING_GRID'); }}
                className={`p-8 bg-white rounded-[2.5rem] shadow-xl border-2 transition-all flex items-center justify-between group hover:scale-[1.02] flex-row ${activeMonthIndex === idx ? 'border-emerald-500 ring-4 ring-emerald-50' : 'border-transparent hover:border-indigo-100'}`}
               >
                  <div className="flex items-center gap-6 text-right">
                     <div className="text-right">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-xl font-black text-slate-800 leading-none">{m.gregorian}</h4>
                          {isLocked && <Lock size={14} className="text-rose-500" />}
                        </div>
                        <p className="text-[11px] font-bold text-slate-400">{m.hijri}</p>
                     </div>
                  </div>
                  <div className="flex items-center gap-3">
                     {isAdmin && (
                        <div onClick={(e) => toggleLock(m.gregorian, e)} className={`p-3 rounded-xl transition-all ${isLocked ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-300 hover:bg-emerald-50 hover:text-emerald-600'}`}>
                           {isLocked ? <Lock size={18}/> : <Unlock size={18}/>}
                        </div>
                     )}
                     {status === 'ALL_COMPLETED' ? (
                        <div className="flex items-center gap-1.5 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 font-black text-[10px]">
                           <CheckCircle2 size={14}/> تم رصد جميع الطلاب
                        </div>
                     ) : status === 'PARTIAL' ? (
                        <div className="flex items-center gap-1.5 px-4 py-2 bg-amber-50 text-amber-600 rounded-xl border border-amber-100 font-black text-[10px]">
                           <CircleDashed size={14}/> تم الرصد ولم يكتمل
                        </div>
                     ) : (
                        <div className="p-3 bg-slate-50 rounded-xl text-slate-300 group-hover:bg-indigo-600 group-hover:text-white transition-all"><ChevronLeft size={20}/></div>
                     )}
                  </div>
               </button>
             );
           })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 animate-in fade-in duration-500 pb-24 text-right relative" dir="rtl">
      {/* مؤشر حالة المزامنة المتطور - ثابت أعلى اليسار */}
      <div className="fixed top-28 left-6 z-[2000] flex items-center gap-2 pointer-events-none">
         <div className="relative pointer-events-auto shrink-0 flex items-center gap-2 flex-row-reverse">
            <div className="relative group">
               <div className={`w-4 h-4 rounded-full shadow-2xl transition-all duration-500 border-2 border-white ${
                 syncStatus === 'SYNCING' ? 'bg-amber-400 animate-ping' : 
                 syncStatus === 'LOCAL_SAVED' ? 'bg-blue-500' :
                 syncStatus === 'ERROR' ? 'bg-rose-500' : 
                 syncStatus === 'PENDING' ? 'bg-slate-300' : 
                 'bg-emerald-500 shadow-[0_0_10px_#10b981]'
               }`}></div>
               <div className={`absolute top-0 left-0 w-4 h-4 rounded-full border border-white/50 ${
                 syncStatus === 'SYNCING' ? 'bg-amber-500' : 
                 syncStatus === 'LOCAL_SAVED' ? 'bg-blue-600' :
                 syncStatus === 'ERROR' ? 'bg-rose-600' : 
                 syncStatus === 'PENDING' ? 'bg-slate-400' : 
                 'bg-emerald-600'
               }`}></div>
               
               {/* تلميح صغير عند الوقوف */}
               <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 bg-slate-900 text-white px-3 py-1 rounded-lg text-[9px] font-black opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                  {syncStatus === 'LOCAL_SAVED' ? 'محفوظ بجهازك - بانتظار إنترنت' : 
                   syncStatus === 'SYNCING' ? 'جاري الرفع للسحاب...' : 
                   syncStatus === 'PENDING' ? 'بانتظار إكمال الـ 4 حقول' : 'كافة البيانات مؤمنة'}
               </div>
            </div>
            
            {syncStatus === 'LOCAL_SAVED' && (
               <div className="bg-blue-600 text-white px-3 py-1.5 rounded-full font-black text-[8px] flex items-center gap-1.5 shadow-xl border border-blue-400 animate-in slide-in-from-left-2">
                  <WifiOff size={10}/> بانتظار الشبكة
               </div>
            )}
            {syncStatus === 'PENDING' && (
               <div className="bg-slate-100 text-slate-400 px-3 py-1.5 rounded-full font-black text-[8px] border border-slate-200 shadow-sm flex items-center gap-1 animate-in slide-in-from-left-2">
                  <Clock size={8}/> إدخال جزئي
               </div>
            )}
            {showSyncSuccessText && (
               <div className="bg-emerald-600 text-white px-3 py-1.5 rounded-full font-black text-[8px] animate-in slide-in-from-left-2 border border-white/20 shadow-xl">
                  تم التأمين سحابياً
               </div>
            )}
         </div>
      </div>

      {toast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[3000] w-full max-w-md px-6 animate-in slide-in-from-top-full duration-500">
          <div className={`flex items-center gap-4 px-6 py-4 rounded-3xl shadow-2xl border backdrop-blur-md ${toast.type === 'success' ? 'bg-emerald-600/90 border-emerald-400 text-white' : 'bg-rose-600/90 border-rose-400 text-white'}`}>
             {toast.type === 'success' ? <CheckCircle2 size={24}/> : <AlertTriangle size={24}/>}
             <p className="font-black text-sm leading-relaxed text-right">{toast.msg}</p>
          </div>
        </div>
      )}

      {overrideConfirm && (
        <div className="fixed inset-0 z-[2500] flex items-center justify-center p-6 bg-slate-950/70 backdrop-blur-md animate-in fade-in">
           <div className="bg-white w-full max-w-sm rounded-[3rem] p-10 shadow-2xl animate-in zoom-in-95 text-right">
              <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-inner"><ShieldAlert size={40} /></div>
              <h3 className="text-xl font-black text-slate-800 mb-4">تعديل المجموع يدوياً</h3>
              <p className="text-sm font-bold text-slate-500 leading-relaxed mb-8">سيتم تجاوز الحساب التلقائي للطالب <span className="text-rose-600 font-black">"{overrideConfirm.studentName}"</span>.</p>
              <div className="flex flex-col gap-3">
                 <button onClick={() => { executeGradeUpdate(overrideConfirm.studentId, 'total', overrideConfirm.newValue, true); setOverrideConfirm(null); }} className="w-full py-5 bg-rose-600 text-white rounded-2xl font-black shadow-xl active:scale-95 transition-transform">تأكيد الرصد اليدوي</button>
                 <button onClick={() => setOverrideConfirm(null)} className="w-full py-4 bg-slate-100 text-slate-400 rounded-2xl font-black">إلغاء</button>
              </div>
           </div>
        </div>
      )}

      <div className="bg-white p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] shadow-xl border border-slate-100 relative overflow-hidden text-right">
         <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl"></div>
         <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
            <div className="flex items-center gap-4 w-full md:w-auto">
               <div className={`w-14 h-14 md:w-20 md:h-20 rounded-2xl md:rounded-[2rem] flex items-center justify-center shadow-lg bg-emerald-600 text-white shrink-0`}>
                 {selectedSubject && SUBJECT_STYLING[selectedSubject] ? React.createElement(SUBJECT_STYLING[selectedSubject].icon, {size: 32}) : <GraduationCap size={32}/>}
               </div>
               <div className="text-right flex-1">
                 <h2 className="text-xl md:text-3xl font-black text-slate-800 leading-tight">{selectedSubject}</h2>
                 <div className="flex flex-wrap items-center gap-2 mt-1 justify-start">
                    <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-[10px] font-black uppercase">شهر {activeMonth.gregorian}</span>
                    <span className="bg-slate-100 px-3 py-1 rounded-full text-[9px] font-black text-slate-500 uppercase">{selectedClass?.name}</span>
                    {isMonthLocked && <span className="bg-rose-50 text-rose-600 px-3 py-1 rounded-full text-[9px] font-black flex items-center gap-1"><Lock size={10}/> معتمد ومغلق</span>}
                 </div>
               </div>
            </div>

            <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 scrollbar-hide">
               <button 
                  onClick={processSyncQueue}
                  disabled={syncStatus === 'SYNCING' || !isOnline}
                  className={`flex-1 md:flex-none px-6 py-3 rounded-xl font-black text-xs shadow-lg transition-all flex items-center justify-center gap-3 active:scale-95 ${isOnline ? 'bg-emerald-700 text-white hover:bg-emerald-800' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
               >
                  {syncStatus === 'SYNCING' ? <RefreshCw className="animate-spin" size={18} /> : <SendHorizontal size={18} className="rotate-180" />}
                  <span>{isOnline ? 'مزامنة السحابة الآن' : 'غير متصل بالشبكة'}</span>
               </button>
               <button onClick={() => setMobileLayout(mobileLayout === 'CARDS' ? 'TABLE' : 'CARDS')} className="flex-1 md:hidden bg-slate-900 text-white px-4 py-2 rounded-xl border border-slate-700 flex flex-col items-center justify-center min-w-[80px] active:scale-90 transition-all">
                  {mobileLayout === 'CARDS' ? <LayoutList size={18} /> : <BookOpen size={18} />}
                  <span className="text-[7px] font-black mt-1 uppercase tracking-widest">{mobileLayout === 'CARDS' ? 'عرض الجدول' : 'عرض البطاقات'}</span>
               </button>
            </div>
         </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-center gap-4 px-2">
         <button onClick={() => setCurrentView('MONTH_SELECT')} className="flex items-center gap-1.5 text-slate-400 font-black text-[10px] font-black hover:text-emerald-600 transition-colors w-full md:w-auto flex-row-reverse"> 
            العودة للشهور <ArrowRight size={14} className="mr-1 rotate-180" /> 
         </button>
         
         <div className="flex bg-slate-200/50 p-1 rounded-xl gap-1 border border-slate-100 shadow-inner overflow-x-auto scrollbar-hide w-full md:w-auto">
           {[
             { id: 'ALL', label: 'الكل', icon: Filter },
             { id: 'COMPLETED', label: 'مكتمل', icon: ListChecks },
             { id: 'INCOMPLETE', label: 'لم يكتمل', icon: CircleDashed },
             { id: 'NOT_RECORDED', label: 'لم يرصد', icon: FileX }
           ].map(f => (
             <button key={f.id} onClick={() => setFilterMode(f.id as FilterMode)} className={`px-3 md:px-5 flex items-center justify-center gap-1.5 py-2 rounded-lg font-black text-[9px] transition-all whitespace-nowrap ${filterMode === f.id ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                <f.icon size={12} /> {f.label}
             </button>
           ))}
        </div>
      </div>

      {/* الجدول الرئيسي للرصد */}
      <div className="hidden md:block bg-white rounded-[2.5rem] shadow-xl border border-slate-200 overflow-hidden text-right">
         <table className="w-full text-right table-fixed border-collapse" dir="rtl">
            <thead>
               <tr className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest">
                  <th className="w-[5%] px-1 py-6 text-center border-none">#</th>
                  <th className="w-[25%] px-6 py-6 border-none text-right">اسم الطالب</th>
                  <th className="w-[9%] px-1 py-6 text-center bg-blue-500/10 text-blue-900 border-none">واجب(20)</th>
                  <th className="w-[9%] px-1 py-6 text-center bg-orange-500/10 text-orange-900 border-none">مواظبة(20)</th>
                  <th className="w-[9%] px-1 py-6 text-center bg-amber-500/10 text-amber-900 border-none">شفهي(30)</th>
                  <th className="w-[9%] px-1 py-6 text-center bg-indigo-500/10 text-indigo-900 border-none">تحريري(30)</th>
                  <th className="w-[12%] px-1 py-6 text-center bg-emerald-600 border-none">المجموع(100)</th>
                  <th className="w-[9%] px-1 py-6 text-center bg-indigo-900 border-none">المحصلة(20)</th>
               </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
               {filteredStudents.map((student, idx) => {
                  const recordKey = `${student.id}-${selectedSubject}`;
                  const monthData = (gradesDb[recordKey]?.months?.[activeMonth.gregorian] || { }) as any;
                  const isManual = manualOverrideIds.has(student.id);
                  const isLockedField = isMonthLocked && !isAdmin;
                  
                  return (
                    <tr key={student.id} className="hover:bg-slate-50 transition-all group">
                       <td className="px-1 py-4 text-center text-xs text-slate-300 font-black">{idx + 1}</td>
                       <td className="px-6 py-4 text-right"><span className="font-black text-slate-700 text-sm truncate block">{student.fullName}</span></td>
                       {[
                         { field: 'homework', color: 'blue' },
                         { field: 'attendance', color: 'orange' },
                         { field: 'oral', color: 'amber' },
                         { field: 'written', color: 'indigo' }
                       ].map(sub => (
                         <td key={sub.field} className={`px-1 py-4 text-center transition-all duration-500 ${isManual ? 'blur-[3px] opacity-40 cursor-pointer grayscale' : ''}`} onClick={() => isManual && setRestoreConfirm({ studentId: student.id, studentName: student.fullName, monthData })}>
                            <input 
                              type="number" 
                              value={monthData[sub.field] ?? ''} 
                              disabled={isManual || isLockedField}
                              onFocus={(e) => e.target.select()}
                              onChange={(e) => handleGradeChange(student.id, student.fullName, sub.field, e.target.value)} 
                              className={`w-12 mx-auto p-2 bg-slate-50 border border-slate-100 rounded-xl text-center font-black text-${sub.color}-600 outline-none focus:ring-2 focus:ring-${sub.color}-200`}
                            />
                         </td>
                       ))}
                       <td className="px-1 py-4 text-center bg-emerald-50/20">
                          <input 
                            type="number" 
                            value={monthData.total ?? ''} 
                            onFocus={(e) => !isLockedField && hasManualOverridePermission && e.target.select()}
                            onChange={(e) => handleGradeChange(student.id, student.fullName, 'total', e.target.value)} 
                            readOnly={!hasManualOverridePermission || isLockedField}
                            className={`w-14 mx-auto p-2 bg-emerald-100/50 border-2 rounded-xl text-center font-black text-emerald-700 outline-none transition-all ${isManual ? 'border-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.3)]' : 'border-emerald-200'} ${isLockedField || !hasManualOverridePermission ? 'cursor-not-allowed opacity-50' : 'focus:ring-2 focus:ring-emerald-400'}`}
                          />
                       </td>
                       <td className="px-1 py-4 text-center bg-indigo-50/20"><div className="w-12 mx-auto p-2 bg-indigo-100 text-indigo-700 rounded-xl text-center font-black text-sm">{monthData.finalScore ?? ''}</div></td>
                    </tr>
                  );
               })}
            </tbody>
         </table>
      </div>

      {/* عرض البطاقات للجوال */}
      <div className="md:hidden space-y-4 px-2">
         {mobileLayout === 'CARDS' ? (
           filteredStudents.map((student) => {
             const recordKey = `${student.id}-${selectedSubject}`;
             const monthData = (gradesDb[recordKey]?.months?.[activeMonth.gregorian] || { }) as any;
             const isManual = manualOverrideIds.has(student.id);
             const isLockedField = isMonthLocked && !isAdmin;

             return (
               <div key={student.id} className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-bottom-4">
                  <div className="bg-slate-900 p-5 flex justify-between items-center text-white flex-row-reverse">
                     <div className="flex items-center gap-3 flex-row-reverse">
                        <div className={`w-12 h-12 rounded-2xl ${student.avatarColor || 'bg-emerald-600'} flex items-center justify-center text-white font-black shadow-lg shrink-0`}>{student.fullName[0]}</div>
                        <div className="text-right">
                           <h4 className="font-black text-sm leading-tight mb-1">{student.fullName}</h4>
                           <span className="text-[9px] font-black text-slate-400 uppercase">فصل: {selectedClass?.name}</span>
                        </div>
                     </div>
                     <div className="bg-white/10 px-3 py-1.5 rounded-xl border border-white/5 text-center min-w-[70px]">
                        <p className="text-[7px] font-black text-white/50 mb-1">المحصلة (20)</p>
                        <p className="text-xl font-black text-emerald-400 leading-none">{monthData.finalScore ?? ''}</p>
                     </div>
                  </div>

                  <div className="p-6 grid grid-cols-2 gap-4">
                     {[
                       {f: 'homework', l: 'الواجبات', c: 'blue', m: 20},
                       {f: 'attendance', l: 'المواظبة', c: 'orange', m: 20},
                       {f: 'oral', l: 'الشفهي', c: 'amber', m: 30},
                       {f: 'written', l: 'التحريري', c: 'indigo', m: 30},
                     ].map(field => (
                       <div key={field.f} className={`space-y-1 text-right transition-all duration-500 ${isManual ? 'blur-[4px] opacity-40 grayscale' : ''}`} onClick={() => isManual && setRestoreConfirm({ studentId: student.id, studentName: student.fullName, monthData })}>
                          <label className="text-[9px] font-black text-slate-400 uppercase px-1">{field.l} ({field.m})</label>
                          <input 
                            type="number" 
                            disabled={isManual || isLockedField} 
                            onFocus={(e) => e.target.select()}
                            value={monthData[field.f] ?? ''} 
                            onChange={(e) => handleGradeChange(student.id, student.fullName, field.f, e.target.value)} 
                            className={`w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-center font-black text-${field.c}-600 outline-none focus:border-${field.c}-400 transition-all`} 
                          />
                       </div>
                     ))}
                     <div className="col-span-2 mt-2 pt-4 border-t border-slate-50 space-y-2 text-right">
                        <label className="text-[10px] font-black text-emerald-600 uppercase px-1 block mb-1">المجموع النهائي (100)</label>
                        <input 
                          type="number" 
                          onFocus={(e) => !isLockedField && hasManualOverridePermission && e.target.select()}
                          value={monthData.total ?? ''} 
                          onChange={(e) => handleGradeChange(student.id, student.fullName, 'total', e.target.value)} 
                          readOnly={!hasManualOverridePermission || isLockedField}
                          className={`w-full p-5 bg-emerald-50 border-2 rounded-[1.5rem] text-center font-black text-emerald-700 text-xl outline-none transition-all ${isManual ? 'border-amber-400' : 'border-emerald-200'} ${isLockedField || !hasManualOverridePermission ? 'cursor-not-allowed opacity-50' : ''}`} 
                        />
                     </div>
                  </div>
               </div>
             );
           })
         ) : (
           <div className="bg-white rounded-[1.5rem] shadow-xl border border-slate-200 overflow-hidden text-right">
              <table className="w-full text-[8px] border-collapse" dir="rtl">
                 <thead>
                    <tr className="bg-slate-900 text-white font-black uppercase">
                       <th className="p-1.5 text-center border-none w-4">#</th>
                       <th className="p-2 text-right border-none">الطالب</th>
                       <th className="p-1 text-center border-none w-6 bg-blue-500/20">واجب</th>
                       <th className="p-1 text-center border-none w-6 bg-orange-500/20">مواظبة</th>
                       <th className="p-1 text-center border-none w-6 bg-amber-500/20">شفهي</th>
                       <th className="p-1 text-center border-none w-6 bg-indigo-500/20">تحرير</th>
                       <th className="p-1 text-center bg-emerald-600 border-none w-8 text-white">مجموع</th>
                       <th className="p-1 text-center bg-indigo-900 border-none w-6 text-white">محصلة</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                    {filteredStudents.map((st, idx) => {
                       const recordKey = `${st.id}-${selectedSubject}`;
                       const monthData = (gradesDb[recordKey]?.months?.[activeMonth.gregorian] || {}) as any;
                       const isManual = manualOverrideIds.has(st.id);
                       const isLockedField = isMonthLocked && !isAdmin;

                       return (
                          <tr key={st.id} className="hover:bg-slate-50">
                             <td className="p-1.5 text-center font-black text-slate-300">{idx + 1}</td>
                             <td className="p-2 font-black text-slate-700 truncate max-w-[80px] text-right">{st.fullName.split(' ')[0]} {st.fullName.split(' ')[1]}</td>
                             {[ { f: 'homework', c: 'blue' }, { f: 'attendance', c: 'orange' }, { f: 'oral', c: 'amber' }, { f: 'written', c: 'indigo' } ].map(sub => (
                               <td key={sub.f} className={`p-0.5 transition-all ${isManual ? 'blur-[1.5px] opacity-30 grayscale' : ''}`}>
                                  <input type="number" onFocus={(e) => e.target.select()} disabled={isManual || isLockedField} value={monthData[sub.f] ?? ''} onChange={(e) => handleGradeChange(st.id, st.fullName, sub.f, e.target.value)} className={`w-6 h-6 mx-auto p-0 bg-slate-50 border border-slate-100 rounded text-center font-bold text-${sub.c}-600 outline-none`} />
                               </td>
                             ))}
                             <td className="p-0.5 bg-emerald-50"><input type="number" onFocus={(e) => !isLockedField && hasManualOverridePermission && e.target.select()} value={monthData.total ?? ''} onChange={(e) => handleGradeChange(st.id, st.fullName, 'total', e.target.value)} readOnly={!hasManualOverridePermission || isLockedField} className={`w-8 h-6 mx-auto p-0 bg-white border rounded text-center font-black text-emerald-700 outline-none ${isManual ? 'border-amber-400' : 'border-emerald-500'} ${isLockedField || !hasManualOverridePermission ? 'cursor-not-allowed' : ''}`} /></td>
                             <td className="p-0.5 bg-indigo-50 text-center font-black text-indigo-700 text-[9px]">{monthData.finalScore ?? ''}</td>
                          </tr>
                       );
                    })}
                 </tbody>
              </table>
           </div>
         )}
      </div>

      {restoreConfirm && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-6 bg-slate-950/70 backdrop-blur-md animate-in fade-in">
           <div className="bg-white w-full max-w-sm rounded-[3rem] p-10 shadow-2xl animate-in zoom-in-95 text-right border border-slate-100">
              <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-inner"><RotateCw size={40} className="animate-spin-slow" /></div>
              <h3 className="text-xl font-black text-slate-800 mb-4 text-center">استعادة الحساب التلقائي</h3>
              <p className="text-sm font-bold text-slate-500 text-center mb-8">هل تريد إلغاء المجموع اليدوي والعودة للحساب الآلي بناءً على الحقول؟</p>
              <div className="flex flex-col gap-3">
                 <button onClick={() => {
                    const restoredTotal = (restoreConfirm.monthData.homework || 0) + (restoreConfirm.monthData.attendance || 0) + (restoreConfirm.monthData.oral || 0) + (restoreConfirm.monthData.written || 0);
                    executeGradeUpdate(restoreConfirm.studentId, 'total', String(restoredTotal), false);
                    setManualOverrideIds(prev => { const next = new Set(prev); next.delete(restoreConfirm.studentId); return next; });
                    setRestoreConfirm(null);
                    setToast({ msg: "تمت الاستعادة بنجاح", type: 'success' });
                    setTimeout(() => setToast(null), 3000);
                 }} className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-black shadow-xl active:scale-95 transition-transform">نعم، استعادة</button>
                 <button onClick={() => setRestoreConfirm(null)} className="w-full py-4 bg-slate-100 text-slate-400 rounded-2xl font-black">إلغاء</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
