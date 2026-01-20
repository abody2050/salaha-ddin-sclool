
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Check, X, Clock, Users, ChevronDown, Save, 
  Search, AlertCircle, CheckCircle, Info, Lock, 
  Unlock, UserCheck, MessageCircle, ArrowRight,
  ShieldCheck, AlertTriangle, Calendar, RefreshCw,
  TrendingUp, BarChart3, CloudCheck, LayoutGrid, XCircle, Timer, FileEdit
} from 'lucide-react';
import { CLASSES } from '../constants';
import { AttendanceStatus, Student, User, UserRole, SystemConfig, AttendanceDay, EscapePeriod, AttendanceEntry } from '../types';
import { saveToFirestore, fetchCollection, logActivity } from '../services/firebaseService';

interface AttendanceManualViewProps {
  students: Student[];
  user: User;
  config: SystemConfig;
}

const STATUS_CONFIG = {
  [AttendanceStatus.PRESENT]: { label: 'حاضر', color: 'bg-emerald-500', icon: CheckCircle },
  [AttendanceStatus.ABSENT]: { label: 'غائب', color: 'bg-rose-500', icon: XCircle },
  [AttendanceStatus.LATE]: { label: 'متأخر', color: 'bg-amber-500', icon: Timer },
  [AttendanceStatus.EXCUSED]: { label: 'مستأذن', color: 'bg-blue-500', icon: FileEdit },
  [AttendanceStatus.ESCAPED]: { label: 'هارب', color: 'bg-slate-800', icon: AlertTriangle },
};

export const AttendanceManualView: React.FC<AttendanceManualViewProps> = ({ students, user, config }) => {
  const [selectedClassId, setSelectedClassId] = useState(CLASSES[0].id);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [allRecords, setAllRecords] = useState<AttendanceDay[]>([]);
  const [attendanceData, setAttendanceData] = useState<AttendanceDay | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [toast, setToast] = useState<{ msg: string, type: 'success' | 'error' } | null>(null);

  const isAdmin = user.role === UserRole.ADMIN;

  useEffect(() => {
    const loadAll = async () => {
      setIsLoading(true);
      const results = await fetchCollection("attendance") as AttendanceDay[];
      setAllRecords(results);
      
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
      setIsLoading(false);
    };
    loadAll();
  }, [selectedClassId, selectedDate]);

  const scoutComplianceStats = useMemo(() => {
    // إحصائيات لجميع الفصول لهذا اليوم لمعرفة من رفع ومن لم يرفع
    return CLASSES.map(cls => {
      const dayRec = allRecords.find(r => r.classId === cls.id && r.date === selectedDate);
      return {
        className: cls.name,
        hasSynced: !!dayRec,
        syncedBy: dayRec?.syncedBy || 'لم يتم الرفع',
        lastTime: dayRec?.lastSync ? new Date(dayRec.lastSync).toLocaleTimeString('ar-YE') : '-'
      };
    });
  }, [allRecords, selectedDate]);

  const updateStatus = async (studentId: string, status: AttendanceStatus) => {
    if (!attendanceData) return;
    const newRecords = { ...attendanceData.records };
    newRecords[studentId] = {
      ...(newRecords[studentId] || { studentId, status: AttendanceStatus.PRESENT }),
      status,
      updatedAt: new Date().toISOString(),
      updatedBy: user.id,
      updatedByRole: user.role,
      isAdminEdit: true // تمييز تعديل الإدارة
    };
    setAttendanceData({ ...attendanceData, records: newRecords });
  };

  const saveToCloud = async () => {
    if (!attendanceData) return;
    try {
      await saveToFirestore("attendance", attendanceData.id, { ...attendanceData, syncedBy: 'الإدارة (رصد مباشر)' });
      await logActivity(user, `تعديل إداري لتحضير فصل ${CLASSES.find(c => c.id === selectedClassId)?.name}`, 'ATTENDANCE');
      setToast({ msg: "تم حفظ التعديلات الإدارية بنجاح", type: 'success' });
      setTimeout(() => setToast(null), 3000);
    } catch (e) {
      setToast({ msg: "فشل الحفظ سحابياً", type: 'error' });
    }
  };

  const currentClassStudents = useMemo(() => {
    return students.filter(s => s.classId === selectedClassId && s.fullName.includes(searchTerm))
      .sort((a, b) => a.fullName.localeCompare(b.fullName, 'ar'));
  }, [students, selectedClassId, searchTerm]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-32 relative text-right" dir="rtl">
      {toast && (
        <div className={`fixed bottom-10 left-1/2 -translate-x-1/2 z-[1000] px-8 py-4 rounded-full shadow-2xl flex items-center gap-3 border animate-in slide-in-from-bottom-full ${toast.type === 'success' ? 'bg-emerald-600 text-white border-emerald-400' : 'bg-rose-600 text-white border-rose-400'}`}>
          {toast.type === 'success' ? <CheckCircle size={20}/> : <AlertCircle size={20}/>}
          <span className="font-black text-sm">{toast.msg}</span>
        </div>
      )}

      {/* Admin Dashboard Statistics Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
         <div className="lg:col-span-3 bg-white p-8 rounded-[3rem] shadow-xl border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-8 relative overflow-hidden">
            <div className="flex items-center gap-6 flex-row-reverse w-full">
               <div className="w-16 h-16 bg-emerald-600 text-white rounded-[1.8rem] flex items-center justify-center shadow-lg"><BarChart3 size={32} /></div>
               <div className="text-right flex-1">
                 <h2 className="text-2xl font-black text-slate-800 tracking-tight">متابعة الحضور الشاملة</h2>
                 <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">Total Attendance Control Center</p>
               </div>
            </div>
            
            <div className="flex bg-slate-100 p-1.5 rounded-2xl w-full md:w-auto overflow-x-auto">
               <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="bg-white px-4 py-2 rounded-xl font-black text-xs border-none outline-none text-emerald-700" />
               <select value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)} className="bg-transparent px-4 py-2 font-black text-xs border-none outline-none text-slate-500">
                  {CLASSES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
               </select>
            </div>
         </div>

         <div className="bg-slate-900 p-8 rounded-[3rem] text-white shadow-xl flex flex-col justify-center text-center">
            <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1">نسبة رفع الكشافين اليوم</p>
            <h3 className="text-3xl font-black">{scoutComplianceStats.filter(s => s.hasSynced).length} / {CLASSES.length}</h3>
            <div className="w-full bg-white/10 h-1.5 rounded-full mt-3 overflow-hidden">
               <div className="bg-emerald-500 h-full" style={{ width: `${(scoutComplianceStats.filter(s => s.hasSynced).length / CLASSES.length) * 100}%` }}></div>
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
         {/* Scout Compliance Sidebar */}
         <div className="xl:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-[2.5rem] shadow-lg border border-slate-100">
               <h4 className="font-black text-sm text-slate-800 mb-6 flex items-center gap-2 justify-end">حالة رفع الفصول <CloudCheck className="text-indigo-500" size={16}/></h4>
               <div className="space-y-3">
                  {scoutComplianceStats.map((s, i) => (
                    <div key={i} className={`p-4 rounded-2xl border flex items-center justify-between flex-row-reverse transition-all ${s.hasSynced ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
                       <div className="text-right">
                          <p className="font-black text-[10px] text-slate-700">{s.className}</p>
                          <p className="text-[8px] text-slate-400 font-bold">{s.syncedBy}</p>
                       </div>
                       {s.hasSynced ? <CheckCircle size={14} className="text-emerald-500"/> : <XCircle size={14} className="text-rose-500"/>}
                    </div>
                  ))}
               </div>
            </div>
         </div>

         {/* Attendance Grid */}
         <div className="xl:col-span-3 space-y-6">
            <div className="bg-white p-3 rounded-3xl shadow-md border border-slate-100 flex items-center px-6">
               <Search className="text-slate-300 ml-4" size={20}/>
               <input placeholder="بحث في طلاب الفصل المختار..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full py-4 font-bold text-sm bg-transparent outline-none" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {isLoading ? (
                 <div className="col-span-full py-20 flex flex-col items-center gap-4">
                    <RefreshCw className="animate-spin text-emerald-600" size={40} />
                    <p className="font-black text-slate-300">جاري جلب السجلات السحابية...</p>
                 </div>
               ) : currentClassStudents.map((st, idx) => {
                 // Fix: Cast the record to any to prevent type errors when accessing optional properties like isAdminEdit on fallback object
                 const rec = (attendanceData?.records[st.id] || { status: AttendanceStatus.PRESENT }) as any;
                 return (
                   <div key={st.id} className="bg-white p-6 rounded-[2.5rem] shadow-lg border border-slate-100 flex flex-col gap-5 hover:shadow-2xl transition-all">
                      <div className="flex justify-between items-center flex-row-reverse">
                         <div className="flex items-center gap-4 flex-row-reverse text-right">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-xl ${st.avatarColor}`}>{st.fullName[0]}</div>
                            <div>
                               <h4 className="font-black text-slate-800 text-sm leading-tight">{st.fullName}</h4>
                               <p className="text-[9px] text-slate-400 font-bold mt-1">تعديل الإدارة: <span className={rec.isAdminEdit ? 'text-indigo-600' : 'text-slate-300'}>{rec.isAdminEdit ? 'نعم' : 'لا'}</span></p>
                            </div>
                         </div>
                         <span className="text-[10px] font-black text-slate-200">#{idx + 1}</span>
                      </div>
                      
                      <div className="grid grid-cols-5 gap-2">
                         {Object.entries(STATUS_CONFIG).map(([s, cfg]) => (
                           <button 
                            key={s} 
                            onClick={() => updateStatus(st.id, s as AttendanceStatus)}
                            className={`py-3 rounded-2xl flex flex-col items-center gap-1 transition-all ${rec.status === s ? `${cfg.color} text-white shadow-xl scale-105` : 'bg-slate-50 text-slate-300 hover:bg-slate-100'}`}
                           >
                              <cfg.icon size={18}/>
                           </button>
                         ))}
                      </div>
                   </div>
                 );
               })}
            </div>

            <div className="pt-10 flex justify-center">
               <button 
                onClick={saveToCloud}
                className="px-12 py-5 bg-emerald-600 text-white rounded-[2.2rem] font-black text-lg shadow-2xl hover:bg-emerald-700 active:scale-95 transition-all flex items-center gap-4"
               >
                  <Save size={24}/> اعتماد تعديلات الإدارة
               </button>
            </div>
         </div>
      </div>
    </div>
  );
};
