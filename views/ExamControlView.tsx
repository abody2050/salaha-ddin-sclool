
import React, { useState, useMemo, useEffect } from 'react';
import { 
  ShieldCheck, Calendar, Users, MapPin, Hash, Lock, 
  Printer, Save, RefreshCw, ChevronLeft, ArrowRight,
  LayoutGrid, ListChecks, Table, FileText, Settings,
  AlertTriangle, CheckCircle, Info, Zap, Trash2, Plus,
  Boxes, Search, BadgeCheck, LayoutList, Layers, History,
  FilePlus, Send, Unlock, MoreVertical, X, Sparkles, Fingerprint
} from 'lucide-react';
import { Student, SchoolClass, SystemConfig, User, ExamPeriod, ExamHall, StudentExamRecord, ExamSession } from '../types';
import { fetchCollection, saveToFirestore, logActivity, deleteFromFirestore } from '../services/firebaseService';
import { ExamPrintPreview } from './ExamPrintPreview';

interface ExamControlViewProps {
  students: Student[];
  classes: SchoolClass[];
  config: SystemConfig;
  user: User;
}

type ExamSubView = 'DASHBOARD' | 'SETUP' | 'LOGISTICS' | 'SEATING' | 'MASTER_SHEET' | 'PRINT_PREVIEW';

export const ExamControlView: React.FC<ExamControlViewProps> = ({ students, classes, config, user }) => {
  const [currentSubView, setCurrentSubView] = useState<ExamSubView>('DASHBOARD');
  const [periods, setPeriods] = useState<ExamPeriod[]>([]);
  const [activePeriod, setActivePeriod] = useState<ExamPeriod | null>(null);
  const [halls, setHalls] = useState<ExamHall[]>([]);
  const [examRecords, setExamRecords] = useState<StudentExamRecord[]>([]);
  
  // Modals & Forms
  const [showBatchHallModal, setShowBatchHallModal] = useState(false);
  const [showCreatePeriodModal, setShowCreatePeriodModal] = useState(false);
  const [newPeriodName, setNewPeriodName] = useState('');
  const [batchCount, setBatchCount] = useState<number>(10);
  
  // States
  const [sessionFilter, setSessionFilter] = useState<'ALL' | string>('ALL');
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [toast, setToast] = useState<{msg: string, type: 'success' | 'error'} | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadData = async () => {
    setIsProcessing(true);
    try {
      const [ps, hs, rs] = await Promise.all([
        fetchCollection("exam_periods"),
        fetchCollection("exam_halls"),
        fetchCollection("exam_records")
      ]);
      const periodsList = ps as ExamPeriod[];
      setPeriods(periodsList.sort((a,b) => b.id.localeCompare(a.id)));
      setHalls(hs as ExamHall[]);
      
      const active = periodsList.find(p => p.status === 'ACTIVE');
      if (active) {
        setActivePeriod(active);
        const currentPeriodRecords = (rs as StudentExamRecord[]).filter(r => r.id?.startsWith(active.id));
        setExamRecords(currentPeriodRecords);
      }
    } finally { setIsProcessing(false); }
  };

  useEffect(() => { loadData(); }, []);

  // --- نظام إدارة الفترات ---
  const handleStartNewPeriod = async () => {
    if (!newPeriodName.trim()) return showToast("يرجى تسمية الدورة", 'error');
    setIsProcessing(true);
    try {
      const id = `period-${Date.now()}`;
      const newPeriod: ExamPeriod = {
        id, name: newPeriodName, type: 'FINAL',
        startDate: new Date().toISOString().split('T')[0],
        endDate: '', academicYear: config.academicYear,
        status: 'ACTIVE',
        sessions: [
          { id: `s1-${id}`, name: 'الفترة الأولى', startTime: '08:00', endTime: '10:00', assignedClassIds: [] },
          { id: `s2-${id}`, name: 'الفترة الثانية', startTime: '10:30', endTime: '12:30', assignedClassIds: [] }
        ]
      };
      
      // أرشفة القديم
      const archivePromises = periods.map(p => saveToFirestore("exam_periods", p.id, { ...p, status: 'ARCHIVED' }));
      await Promise.all(archivePromises);
      await saveToFirestore("exam_periods", id, newPeriod);
      await logActivity(user, `بدء دورة اختبارات جديدة: ${newPeriodName}`, 'EXAMS');
      
      setActivePeriod(newPeriod);
      setShowCreatePeriodModal(false);
      setNewPeriodName('');
      loadData();
      showToast("تم تفعيل الدورة الجديدة بنجاح");
    } finally { setIsProcessing(false); }
  };

  // --- نظام توليد اللجان الدفعي ---
  const handleBatchCreateHalls = async () => {
    setIsProcessing(true);
    try {
      const newHalls: ExamHall[] = [];
      const currentCount = halls.length;
      for (let i = 1; i <= batchCount; i++) {
        const h: ExamHall = {
          id: `hall-${Date.now()}-${i}`,
          name: `اللجنة رقم (${currentCount + i})`,
          capacity: 20
        };
        await saveToFirestore("exam_halls", h.id, h);
        newHalls.push(h);
      }
      setHalls([...halls, ...newHalls]);
      setShowBatchHallModal(false);
      showToast(`تم توليد ${batchCount} لجنة بنجاح`);
    } finally { setIsProcessing(false); }
  };

  // --- خوارزمية التوزيع التبادلي الذكي (Advanced Interleaving) ---
  const distributeStudents = () => {
    if (!activePeriod) return showToast("لا توجد دورة نشطة", 'error');
    if (halls.length === 0) return showToast("يرجى إنشاء اللجان أولاً", 'error');

    setIsProcessing(true);
    
    // 1. تجميع الطلاب المستهدفين (المقيدين في الفصول المسندة للجلسات)
    const assignedClassIds = Array.from(new Set(activePeriod.sessions.flatMap(s => s.assignedClassIds)));
    const targetStudents = students.filter(s => s.status === 'ACTIVE' && assignedClassIds.includes(s.classId));

    if (targetStudents.length === 0) {
      setIsProcessing(false);
      return showToast("لا يوجد طلاب في الفصول المسندة لهذه الدورة", 'error');
    }

    // 2. تجميع الطلاب حسب فصولهم وترتيبهم أبجدياً داخل كل فصل
    const classGroups: Record<string, Student[]> = {};
    assignedClassIds.forEach(cid => {
      classGroups[cid] = targetStudents
        .filter(s => s.classId === cid)
        .sort((a, b) => a.fullName.localeCompare(b.fullName, 'ar'));
    });

    // 3. التوزيع التبادلي (Interleaving Pointer Logic)
    const interleavedList: Student[] = [];
    const classIds = Object.keys(classGroups);
    let hasMore = true;
    let pointer = 0;

    while (hasMore) {
      hasMore = false;
      classIds.forEach(cid => {
        if (classGroups[cid][pointer]) {
          interleavedList.push(classGroups[cid][pointer]);
          hasMore = true;
        }
      });
      pointer++;
    }

    // 4. الإسقاط على اللجان المادية
    const newRecords: StudentExamRecord[] = [];
    let currentHallIdx = 0;
    let hallFillCount = 0;

    interleavedList.forEach((st, idx) => {
      const hall = halls[currentHallIdx];
      newRecords.push({
        id: `${activePeriod.id}_${st.id}`,
        studentId: st.id,
        studentName: st.fullName,
        classId: st.classId,
        seatNumber: String(1000 + idx + 1),
        hallId: hall.id,
        marks: {}
      });

      hallFillCount++;
      if (hallFillCount >= hall.capacity && currentHallIdx < halls.length - 1) {
        currentHallIdx++;
        hallFillCount = 0;
      }
    });

    setExamRecords(newRecords);
    setIsProcessing(false);
    showToast(`تم توزيع ${newRecords.length} طالباً بخوارزمية التبادل الذكي`);
  };

  const handleSaveDistribution = async () => {
    setIsProcessing(true);
    try {
      const promises = examRecords.map(r => saveToFirestore("exam_records", r.id!, r));
      await Promise.all(promises);
      showToast("تم اعتماد وحفظ التوزيع سحابياً");
    } finally { setIsProcessing(false); }
  };

  const generateSecretCodes = () => {
    if (examRecords.length === 0) return showToast("يرجى إجراء التوزيع أولاً", 'error');
    setExamRecords(prev => prev.map(r => ({
      ...r,
      secretCode: Math.floor(10000 + Math.random() * 89999).toString()
    })));
    showToast("تم توليد الأرقام السرية المشفرة");
  };

  const filteredRecords = useMemo(() => {
    let list = examRecords;
    if (sessionFilter !== 'ALL') {
      const sess = activePeriod?.sessions.find(s => s.id === sessionFilter);
      if (sess) list = list.filter(r => sess.assignedClassIds.includes(r.classId));
    }
    if (searchTerm) {
      list = list.filter(r => r.studentName.includes(searchTerm) || r.seatNumber.includes(searchTerm));
    }
    return list;
  }, [examRecords, sessionFilter, searchTerm, activePeriod]);

  if (currentSubView === 'PRINT_PREVIEW') {
    return <ExamPrintPreview type="ALL" data={{ activePeriod, examRecords, halls, classes }} onBack={() => setCurrentSubView('DASHBOARD')} />;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 text-right pb-24" dir="rtl">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-12 left-1/2 -translate-x-1/2 z-[6000] px-8 py-4 rounded-full shadow-2xl border animate-in slide-in-from-top-full ${toast.type === 'success' ? 'bg-emerald-600 text-white border-emerald-400' : 'bg-rose-600 text-white border-rose-400'}`}>
           <div className="flex items-center gap-3">
              {toast.type === 'success' ? <CheckCircle size={20}/> : <AlertTriangle size={20}/>}
              <span className="font-black text-sm">{toast.msg}</span>
           </div>
        </div>
      )}

      {/* Modern High-End Header */}
      <div className="bg-emerald-950 p-10 md:p-14 rounded-[4rem] text-white shadow-2xl relative overflow-hidden border border-emerald-800/50">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-400/10 rounded-full blur-[120px]"></div>
        <div className="flex flex-col md:flex-row justify-between items-center gap-8 relative z-10">
          <div>
            <div className="flex items-center gap-4 mb-4 justify-end md:justify-start flex-row-reverse">
               <ShieldCheck className="text-emerald-400" size={40} />
               <h2 className="text-4xl md:text-5xl font-black tracking-tight leading-none">إدارة الكنترول المركزي</h2>
            </div>
            <p className="text-emerald-400/60 font-bold mt-2 uppercase tracking-widest text-xs">Strategic Examination & Academic Records Bureau</p>
          </div>
          {activePeriod && (
             <div className="bg-white/10 px-8 py-5 rounded-[2.5rem] border border-white/10 backdrop-blur-xl text-right">
                <p className="text-[10px] font-black text-emerald-300 uppercase mb-2 tracking-widest">الدورة الأكاديمية النشطة</p>
                <h4 className="text-xl font-black">{activePeriod.name}</h4>
                <div className="flex items-center gap-2 mt-2 justify-end">
                   <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_10px_#34d399]"></div>
                   <span className="text-[10px] font-black text-white/50 uppercase">Live Operations</span>
                </div>
             </div>
          )}
        </div>
      </div>

      {currentSubView === 'DASHBOARD' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[
            { id: 'LOGISTICS', label: 'توزيع اللجان والقاعات', icon: MapPin, desc: 'إدارة المكان وخوارزمية التوزيع المتقاطع', color: 'emerald' },
            { id: 'SEATING', label: 'أرقام الجلوس والسرية', icon: Fingerprint, desc: 'توليد أرقام الجلوس والباركود السري', color: 'amber' },
            { id: 'MASTER_SHEET', label: 'شيت الرصد العام', icon: Table, desc: 'رصد النتائج النهائية واستخراج الأوائل', color: 'blue' },
            { id: 'PRINT_CENTER', label: 'المطبعة المركزية', icon: Printer, desc: 'طباعة الكشوف الرسمية بمعايير A4', color: 'rose', onClick: () => setCurrentSubView('PRINT_PREVIEW') },
            { id: 'SETUP', label: 'إعدادات الدورة', icon: Settings, desc: 'إدارة الفترات الدراسية والجلسات', color: 'indigo', onClick: () => setShowCreatePeriodModal(true) },
            { id: 'ARCHIVE', label: 'الأرشيف التاريخي', icon: History, desc: 'الرجوع لسجلات السنوات السابقة', color: 'slate' },
          ].map(tile => (
            <button key={tile.id} onClick={() => tile.onClick ? tile.onClick() : setCurrentSubView(tile.id as ExamSubView)} className="bg-white p-10 rounded-[3.5rem] shadow-xl border border-slate-100 text-right group hover:border-indigo-500 transition-all flex flex-col gap-8 active:scale-95 relative overflow-hidden">
              <div className={`absolute top-0 left-0 w-24 h-24 bg-${tile.color}-500/5 rounded-full -ml-12 -mt-12 group-hover:scale-150 transition-transform duration-700`}></div>
              <div className={`w-20 h-20 bg-${tile.color}-50 text-${tile.color}-600 rounded-[1.8rem] flex items-center justify-center group-hover:bg-${tile.color}-600 group-hover:text-white transition-all shadow-sm shrink-0`}><tile.icon size={36} /></div>
              <div className="text-right flex-1">
                <h3 className="text-2xl font-black text-slate-800 leading-none mb-3">{tile.label}</h3>
                <p className="text-xs font-bold text-slate-400 leading-relaxed">{tile.desc}</p>
              </div>
              <div className="pt-6 border-t border-slate-50 flex items-center gap-2 text-indigo-600 font-black text-[10px] uppercase justify-end tracking-widest">الدخول للقسم <ChevronLeft size={14}/></div>
            </button>
          ))}
        </div>
      )}

      {currentSubView === 'LOGISTICS' && (
        <div className="space-y-8 animate-in slide-in-from-left-6">
           <div className="flex justify-between items-center flex-row-reverse">
              <button onClick={() => setCurrentSubView('DASHBOARD')} className="flex items-center gap-3 text-slate-400 font-black hover:text-indigo-600 transition-all flex-row-reverse group"><ArrowRight size={24} className="group-hover:translate-x-1 transition-transform" /> العودة للوحة الكنترول</button>
              <div className="flex gap-4">
                 <button onClick={() => setShowBatchHallModal(true)} className="px-8 py-4 bg-white border-2 border-indigo-50 text-indigo-600 rounded-2xl font-black text-sm hover:bg-indigo-600 hover:text-white transition-all shadow-xl flex items-center gap-3"><Plus size={20}/> إضافة لجان</button>
                 <button onClick={handleSaveDistribution} disabled={isProcessing || examRecords.length === 0} className="px-10 py-4 bg-emerald-600 text-white rounded-2xl font-black text-sm shadow-2xl hover:bg-emerald-700 transition-all flex items-center gap-3"><Save size={20}/> حفظ التوزيع</button>
              </div>
           </div>
           
           <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
              <div className="lg:col-span-1 space-y-8">
                 <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-slate-100 text-right">
                    <div className="flex justify-between items-center mb-8 flex-row-reverse">
                       <h3 className="font-black text-xl flex items-center gap-3 flex-row-reverse">اللجان والقاعات <MapPin className="text-emerald-500" size={24}/></h3>
                       <span className="bg-slate-900 text-white px-3 py-1 rounded-full text-[10px] font-black">{halls.length}</span>
                    </div>
                    <div className="space-y-3 max-h-[500px] overflow-y-auto scrollbar-hide pr-1">
                       {halls.map(h => (
                         <div key={h.id} className="p-5 rounded-2xl bg-slate-50 border border-slate-100 flex justify-between items-center flex-row-reverse group hover:bg-white hover:border-emerald-200 transition-all">
                            <div className="text-right">
                               <p className="font-black text-sm text-slate-800">{h.name}</p>
                               <div className="flex items-center gap-2 mt-1 justify-end">
                                  <span className="text-[10px] font-bold text-slate-400">السعة: {h.capacity}</span>
                                  <div className="w-1 h-1 rounded-full bg-slate-200"></div>
                                  <span className="text-[10px] font-bold text-emerald-600">نشط</span>
                               </div>
                            </div>
                            <button onClick={async () => { await deleteFromFirestore("exam_halls", h.id); setHalls(halls.filter(x => x.id !== h.id)); }} className="text-slate-300 group-hover:text-rose-500 transition-colors p-2 hover:bg-rose-50 rounded-xl"><Trash2 size={18}/></button>
                         </div>
                       ))}
                       {halls.length === 0 && <div className="py-10 text-center text-slate-300 font-bold text-sm">لا توجد لجان مسجلة</div>}
                    </div>
                 </div>

                 <div className="bg-slate-900 p-10 rounded-[3rem] shadow-2xl text-white text-right relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-32 h-32 bg-emerald-400/10 rounded-full blur-[60px] group-hover:scale-150 transition-transform"></div>
                    <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mb-8"><Zap className="text-emerald-400" size={32} /></div>
                    <h3 className="font-black text-2xl mb-4">خوارزمية التبادل</h3>
                    <p className="text-slate-400 text-sm font-bold leading-relaxed mb-10">سيقوم المحرك بدمج طلاب الفصول وتوزيعهم بالتناوب لضمان أعلى درجات النزاهة ومنع تجاور طلاب الفصل الواحد.</p>
                    <button onClick={distributeStudents} disabled={isProcessing} className="w-full py-6 bg-emerald-600 text-white rounded-2xl font-black shadow-2xl hover:bg-emerald-500 active:scale-95 transition-all flex items-center justify-center gap-4 text-lg">
                       {isProcessing ? <RefreshCw className="animate-spin" size={24}/> : <Sparkles size={24}/>}
                       <span>تشغيل التوزيع الذكي</span>
                    </button>
                 </div>
              </div>

              <div className="lg:col-span-3 space-y-8">
                 <div className="bg-white rounded-[3.5rem] shadow-2xl border border-slate-100 overflow-hidden min-h-[600px] text-right flex flex-col">
                    <div className="p-10 border-b border-slate-50 flex flex-col md:flex-row justify-between items-center bg-slate-50/50 gap-8 flex-row-reverse">
                       <div className="flex items-center gap-6 flex-row-reverse w-full md:w-auto">
                          <h3 className="font-black text-2xl text-slate-800">مراجعة كشوف اللجان</h3>
                          <div className="flex bg-white p-1.5 rounded-2xl shadow-inner border border-slate-200">
                             <button onClick={() => setSessionFilter('ALL')} className={`px-6 py-2.5 rounded-xl font-black text-xs transition-all ${sessionFilter === 'ALL' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}>الكل</button>
                             {activePeriod?.sessions.map(s => (
                               <button key={s.id} onClick={() => setSessionFilter(s.id)} className={`px-6 py-2.5 rounded-xl font-black text-xs transition-all ${sessionFilter === s.id ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}>{s.name}</button>
                             ))}
                          </div>
                       </div>
                       <div className="flex gap-4 w-full md:w-auto">
                          <div className="flex-1 relative md:w-80">
                             <Search className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300" size={20}/>
                             <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="ابحث في قائمة الموزعين..." className="w-full pr-14 pl-6 py-4 bg-white border border-slate-200 rounded-2xl font-black text-sm outline-none focus:ring-4 focus:ring-emerald-50 transition-all text-right shadow-sm" />
                          </div>
                          <button onClick={() => setCurrentSubView('PRINT_PREVIEW')} className="p-4 bg-white border border-slate-200 rounded-2xl shadow-md text-slate-400 hover:text-emerald-600 transition-all"><Printer size={24}/></button>
                       </div>
                    </div>
                    
                    <div className="flex-1 overflow-x-auto scrollbar-hide">
                       <table className="w-full text-right border-collapse">
                          <thead>
                             <tr className="bg-slate-900 text-white text-[11px] font-black uppercase tracking-[0.2em]">
                                <th className="px-10 py-7 text-right w-20">#</th>
                                <th className="px-10 py-7">اسم الطالب الكامل</th>
                                <th className="px-10 py-7 text-center">الفصل الدراسي</th>
                                <th className="px-10 py-7 text-center">رقم الجلوس</th>
                                <th className="px-10 py-7 text-center w-48">اللجنة المسندة</th>
                             </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                             {filteredRecords.length === 0 ? (
                               <tr><td colSpan={5} className="py-32 text-center text-slate-300 font-black italic text-lg">لا توجد بيانات توزيع متاحة للعرض حالياً</td></tr>
                             ) : filteredRecords.map((rec, idx) => (
                               <tr key={rec.studentId} className="hover:bg-indigo-50/30 transition-all group">
                                  <td className="px-10 py-6 text-xs font-black text-slate-300">{idx + 1}</td>
                                  <td className="px-10 py-6 font-black text-slate-700 text-base">{rec.studentName}</td>
                                  <td className="px-10 py-6 text-center">
                                     <span className="inline-block px-4 py-2 bg-slate-100 text-slate-500 rounded-xl font-black text-[10px] uppercase">{classes.find(c => c.id === rec.classId)?.name}</span>
                                  </td>
                                  <td className="px-10 py-6 text-center font-mono font-black text-indigo-600 text-xl tracking-tight">{rec.seatNumber}</td>
                                  <td className="px-10 py-6">
                                     <div className="flex items-center justify-center gap-3">
                                        <MapPin size={14} className="text-emerald-500" />
                                        <select 
                                          value={rec.hallId} 
                                          onChange={(e) => {
                                            const next = [...examRecords];
                                            const i = next.findIndex(x => x.studentId === rec.studentId);
                                            next[i].hallId = e.target.value;
                                            setExamRecords(next);
                                          }}
                                          className="bg-transparent font-black text-xs text-slate-800 border-none focus:ring-0 outline-none cursor-pointer"
                                        >
                                          {halls.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                                        </select>
                                     </div>
                                  </td>
                               </tr>
                             ))}
                          </tbody>
                       </table>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Batch Hall Generation Modal */}
      {showBatchHallModal && (
        <div className="fixed inset-0 z-[7000] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-2xl animate-in fade-in">
           <div className="bg-white w-full max-w-md rounded-[4rem] p-12 shadow-2xl animate-in zoom-in-95 text-right flex flex-col border border-slate-100">
              <div className="flex justify-between items-center mb-10 flex-row-reverse">
                 <h3 className="text-3xl font-black text-slate-800 leading-none">توليد اللجان</h3>
                 <button onClick={() => setShowBatchHallModal(false)} className="p-3 hover:bg-slate-100 rounded-2xl transition-colors"><X size={28}/></button>
              </div>
              <div className="space-y-10">
                 <div className="w-28 h-28 bg-indigo-50 text-indigo-600 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-inner"><Boxes size={56}/></div>
                 <div className="space-y-4 text-center">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">كم عدد اللجان المطلوبة؟</label>
                    <input type="number" autoFocus value={batchCount} onChange={e => setBatchCount(parseInt(e.target.value))} className="w-full px-10 py-8 bg-slate-50 border-4 border-slate-100 rounded-[3rem] font-black text-5xl text-center outline-none focus:border-indigo-500 focus:bg-white transition-all text-indigo-600 shadow-inner" />
                 </div>
                 <div className="p-6 bg-amber-50 rounded-3xl border border-amber-100 flex items-start gap-4 flex-row-reverse">
                    <Info size={24} className="text-amber-600 shrink-0" />
                    <p className="text-xs font-bold text-amber-800 leading-relaxed">سيتم تسمية اللجان آلياً (اللجنة 1، 2...) مع ضبط سعة 20 مقعداً بشكل افتراضي لكل لجنة.</p>
                 </div>
                 <button onClick={handleBatchCreateHalls} disabled={isProcessing} className="w-full py-6 bg-indigo-600 text-white rounded-[2rem] font-black text-xl shadow-2xl hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-4">
                    {isProcessing ? <RefreshCw className="animate-spin" size={24}/> : <CheckCircle size={24}/>}
                    <span>اعتماد وإنشاء اللجان الآن</span>
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* New Period Modal */}
      {showCreatePeriodModal && (
        <div className="fixed inset-0 z-[7000] flex items-center justify-center p-6 bg-emerald-950/80 backdrop-blur-2xl animate-in fade-in">
           <div className="bg-white w-full max-w-md rounded-[4rem] p-12 shadow-2xl animate-in zoom-in-95 text-right flex flex-col border border-slate-100">
              <div className="flex justify-between items-center mb-10 flex-row-reverse">
                 <h3 className="text-3xl font-black text-slate-800 leading-none">فتح دورة اختبارات</h3>
                 <button onClick={() => setShowCreatePeriodModal(false)} className="p-3 hover:bg-slate-100 rounded-2xl transition-colors"><X size={28}/></button>
              </div>
              <div className="space-y-8">
                 <div className="w-28 h-28 bg-emerald-50 text-emerald-600 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-inner"><FilePlus size={56}/></div>
                 <div className="space-y-4">
                    <label className="text-xs font-black text-slate-400 uppercase mr-6 tracking-widest">مسمى دورة الاختبارات</label>
                    <input autoFocus value={newPeriodName} onChange={e => setNewPeriodName(e.target.value)} placeholder="مثلاً: اختبارات الترم الأول 2025" className="w-full px-8 py-6 bg-slate-50 border-2 border-slate-100 rounded-[2.2rem] font-black text-xl outline-none focus:border-emerald-500 focus:bg-white transition-all text-right shadow-sm" />
                 </div>
                 <button onClick={handleStartNewPeriod} disabled={isProcessing || !newPeriodName.trim()} className="w-full py-6 bg-emerald-600 text-white rounded-[2rem] font-black text-xl shadow-2xl hover:bg-emerald-700 active:scale-95 transition-all flex items-center justify-center gap-4">
                    {isProcessing ? <RefreshCw className="animate-spin" size={24}/> : <Send className="rotate-180" size={24}/>}
                    <span>تفعيل الدورة واعتمادها</span>
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
