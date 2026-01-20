
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  UserPlus, Search, Filter, MoreVertical, 
  Edit2, Trash2, Eye, UserCircle, 
  GraduationCap, Download, ChevronRight, ChevronLeft,
  CheckCircle, XCircle, Clock, TrendingUp, X, Printer, 
  FileText, Phone, User, Camera, Check, ChevronDown,
  LayoutGrid, AlertTriangle, Archive, RotateCcw,
  Calendar, BadgeCheck, Hash, RefreshCw, AlertCircle,
  Upload, Cake, Info, ShieldCheck, Zap, Lock, KeyRound, EyeOff, Sparkles, BrainCircuit, ListOrdered, Save as SaveIconLucide
} from 'lucide-react';
import { CLASSES, SCHOOL_NAME } from '../constants';
import { Student as StudentType, UserRole } from '../types';
import { saveToFirestore, deleteFromFirestore } from '../services/firebaseService';
import { analyzeStudentListImage, StudentExtractionResult } from '../services/geminiService';

interface ToastState {
  message: string;
  type: 'success' | 'error' | 'info';
  icon?: React.ReactNode;
}

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-emerald-500', 'bg-indigo-500', 
  'bg-amber-500', 'bg-rose-500', 'bg-teal-500'
];

const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 400; 
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
};

interface StudentsManagementViewProps {
  students: StudentType[];
  setStudents: React.Dispatch<React.SetStateAction<StudentType[]>>;
}

export const StudentsManagementView: React.FC<StudentsManagementViewProps> = ({ students, setStudents }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState('ALL');
  const [isExporting, setIsExporting] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showClassPickerModal, setShowClassPickerModal] = useState(false);
  
  const [showAIModal, setShowAIModal] = useState(false);
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiStep, setAiStep] = useState<'UPLOAD' | 'REVIEW' | 'SORT_CHOICE'>('UPLOAD');
  const [aiExtractedData, setAiExtractedData] = useState<StudentExtractionResult | null>(null);
  const [sortChoice, setSortChoice] = useState<'ABJAD' | 'AS_IS'>('ABJAD');

  const [selectedStudent, setSelectedStudent] = useState<StudentType | null>(null);
  const [tempSelectedClass, setTempSelectedClass] = useState<string | null>(null);

  const [toast, setToast] = useState<ToastState | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    fullName: '',
    parentPhone: '',
    autoCode: '',
    avatarUrl: '',
    birthDay: '',
    birthMonth: '',
    birthYear: '',
    isScout: false,
    scoutPin: ''
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const aiFileInputRef = useRef<HTMLInputElement>(null);

  const showSuccess = (msg: string) => {
    setToast({ message: msg, type: 'success', icon: <CheckCircle className="text-white" size={18} /> });
    setTimeout(() => setToast(null), 4000);
  };

  const generateRandomCode = () => Math.floor(1000 + Math.random() * 8999).toString();
  const generateScoutPin = () => Math.floor(100000 + Math.random() * 899999).toString();

  useEffect(() => {
    if (showAddModal) {
      setFormData({ 
        fullName: '', 
        parentPhone: '', 
        autoCode: generateRandomCode(), 
        avatarUrl: '', 
        birthDay: '', 
        birthMonth: '', 
        birthYear: '',
        isScout: false,
        scoutPin: generateScoutPin()
      });
      setTempSelectedClass(null);
      setErrors({});
    }
  }, [showAddModal]);

  const filteredStudents = useMemo(() => {
    let result = students.filter(s => {
      if (s.status === 'ARCHIVED') return false; 
      const matchesSearch = (s.fullName || s.name || '').includes(searchTerm) || (s.studentCode || '').includes(searchTerm);
      const matchesClass = selectedClassFilter === 'ALL' || s.classId === selectedClassFilter;
      return matchesSearch && matchesClass;
    });

    return result.sort((a, b) => {
      const classA = CLASSES.find(c => c.id === a.classId);
      const classB = CLASSES.find(c => c.id === b.classId);
      const gradeA = classA?.grade || 0;
      const gradeB = classB?.grade || 0;

      if (gradeA !== gradeB) return gradeA - gradeB;
      return (a.fullName || a.name || '').localeCompare((b.fullName || b.name || ''), 'ar');
    });
  }, [students, searchTerm, selectedClassFilter]);

  const selectedClassName = selectedClassFilter === 'ALL' ? 'جميع الفصول الدراسية' : CLASSES.find(c => c.id === selectedClassFilter)?.name;

  const handleExportPDF = async () => {
    const element = document.getElementById('print-document');
    const h2p = (window as any).html2pdf;
    if (!element || !h2p) {
      setToast({ message: 'عذراً، محرك تصدير الـ PDF غير متاح حالياً', type: 'error' });
      return;
    }
    
    setIsExporting(true);
    const today = new Date().toLocaleDateString('ar-YE');
    const opt = {
      margin: [10, 10, 10, 10],
      filename: `كشف_طلاب_${(selectedClassName || 'المدرسة').replace(/\s+/g, '_')}_${today}.pdf`,
      image: { type: 'jpeg', quality: 1 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    try {
      element.classList.remove('hidden');
      await new Promise(r => setTimeout(r, 500));
      await h2p().set(opt).from(element).save();
      showSuccess(`تم تصدير كشف ${selectedClassName} بنجاح`);
    } catch (err) {
      console.error(err);
      setToast({ message: 'حدث خطأ أثناء تصدير الملف', type: 'error' });
    } finally {
      element.classList.add('hidden');
      setIsExporting(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressedDataUrl = await compressImage(file);
        setFormData(prev => ({ ...prev, avatarUrl: compressedDataUrl }));
      } catch (err) {
        setToast({ message: "فشل في معالجة الصورة المرفوعة", type: "error" });
      }
    }
  };

  const handleAIFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!tempSelectedClass) {
      setToast({ message: "يرجى اختيار الفصل المستهدف أولاً", type: "error" });
      return;
    }

    setIsAIProcessing(true);
    setAiError(null);
    try {
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
      });

      const result = await analyzeStudentListImage(base64);
      setAiExtractedData(result);
      setAiStep('REVIEW');
    } catch (err: any) {
      setAiError(err.message || "حدث خطأ أثناء تحليل الصورة. يرجى تجربة صورة أكثر وضوحاً.");
    } finally {
      setIsAIProcessing(false);
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.fullName.trim()) newErrors.fullName = "الاسم رباعي مطلوب";
    if (!tempSelectedClass) newErrors.classId = "اختر الفصل";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const getCombinedBirthDate = () => {
    if (!formData.birthYear || !formData.birthMonth || !formData.birthDay) return '';
    return `${formData.birthYear}-${formData.birthMonth.padStart(2, '0')}-${formData.birthDay.padStart(2, '0')}`;
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    
    const newStudent: StudentType = {
      id: Date.now().toString(),
      name: formData.fullName,
      fullName: formData.fullName,
      username: `student_${formData.autoCode}`,
      role: UserRole.STUDENT,
      studentCode: formData.autoCode,
      classId: tempSelectedClass!,
      parentPhone: formData.parentPhone || 'غير محدد',
      status: 'ACTIVE',
      grade: CLASSES.find(c => c.id === tempSelectedClass)?.grade || 0,
      birthDate: getCombinedBirthDate(),
      avatarColor: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
      avatarUrl: formData.avatarUrl,
      isScout: formData.isScout,
      scoutPin: formData.isScout ? formData.scoutPin : undefined,
      gender: 'MALE' as any
    };

    try {
      await saveToFirestore("students", newStudent.id, newStudent);
      setStudents([newStudent, ...students]);
      setShowAddModal(false);
      showSuccess("تم تسجيل الطالب بنجاح");
    } catch (e: any) {
      setToast({ message: "فشل الحفظ في السحابة", type: "error" });
    }
  };

  const finalizeAIAddition = async () => {
    if (!aiExtractedData || !tempSelectedClass) return;
    setIsAIProcessing(true);

    try {
      const newEntries: StudentType[] = aiExtractedData.students.map((item, idx) => ({
        id: (Date.now() + idx).toString(),
        name: item.fullName,
        fullName: item.fullName,
        username: `student_${generateRandomCode()}_${idx}`,
        role: UserRole.STUDENT,
        studentCode: generateRandomCode(),
        classId: tempSelectedClass!,
        parentPhone: item.parentPhone || 'غير محدد',
        status: 'ACTIVE',
        grade: CLASSES.find(c => c.id === tempSelectedClass)?.grade || 0,
        birthDate: item.birthDate || '',
        avatarColor: AVATAR_COLORS[idx % AVATAR_COLORS.length],
        isScout: false,
        gender: 'MALE' as any
      }));

      const savePromises = newEntries.map(s => saveToFirestore("students", s.id, s));
      await Promise.all(savePromises);

      let updatedStudentsList = [...newEntries, ...students];
      
      if (sortChoice === 'ABJAD') {
        updatedStudentsList.sort((a,b) => a.fullName.localeCompare(b.fullName, 'ar'));
      }

      setStudents(updatedStudentsList);
      setShowAIModal(false);
      setAiExtractedData(null);
      showSuccess(`تمت إضافة ${newEntries.length} طالباً ذكياً بنجاح`);
    } catch (err) {
      setToast({ message: "فشل حفظ الطلاب الجدد", type: "error" });
    } finally {
      setIsAIProcessing(false);
    }
  };

  const handleEditStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !validate()) return;

    const updated = {
      ...selectedStudent,
      name: formData.fullName,
      fullName: formData.fullName,
      parentPhone: formData.parentPhone || 'غير محدد',
      classId: tempSelectedClass!,
      grade: CLASSES.find(c => c.id === tempSelectedClass)?.grade || selectedStudent.grade,
      studentCode: formData.autoCode,
      birthDate: getCombinedBirthDate(),
      avatarUrl: formData.avatarUrl || selectedStudent.avatarUrl,
      isScout: formData.isScout,
      scoutPin: formData.isScout ? (formData.scoutPin || selectedStudent.scoutPin || generateScoutPin()) : undefined
    };

    try {
      await saveToFirestore("students", selectedStudent.id, updated);
      setStudents(prev => prev.map(s => s.id === selectedStudent.id ? updated : s));
      setShowEditModal(false);
      showSuccess("تم التحديث بنجاح");
    } catch (e) {
       setToast({ message: "فشل التحديث", type: "error" });
    }
  };

  const handleDeleteStudent = async () => {
    if (!selectedStudent) return;
    try {
      await deleteFromFirestore("students", selectedStudent.id);
      setStudents(prev => prev.filter(s => s.id !== selectedStudent.id));
      setShowDeleteConfirm(false);
      showSuccess("تم حذف الطالب");
    } catch (e) {
      setToast({ message: "فشل الحذف", type: "error" });
    }
  };

  const openEdit = (s: StudentType) => {
    const [y, m, d] = (s.birthDate || '').split('-');
    setSelectedStudent(s);
    setFormData({ 
      fullName: s.fullName || s.name, 
      parentPhone: s.parentPhone === 'غير محدد' ? '' : s.parentPhone, 
      autoCode: s.studentCode, 
      avatarUrl: s.avatarUrl || '',
      birthDay: d || '',
      birthMonth: m ? parseInt(m).toString() : '',
      birthYear: y || '',
      isScout: s.isScout,
      scoutPin: s.scoutPin || generateScoutPin()
    });
    setTempSelectedClass(s.classId);
    setErrors({});
    setShowEditModal(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 -m-6 md:-m-10 p-6 md:p-10 animate-in fade-in duration-500 relative">
      
      {toast && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[5000] w-full max-w-xs px-4 animate-in slide-in-from-top-full duration-500">
          <div className={`flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl border backdrop-blur-md ${toast.type === 'success' ? 'bg-emerald-600/95 border-emerald-400 text-white' : 'bg-rose-600/95 border-rose-400 text-white'}`}>
            <div className="bg-white/20 p-1.5 rounded-xl">{toast.icon || <Info size={18} />}</div>
            <p className="font-black text-sm flex-1 leading-tight">{toast.message}</p>
            <button onClick={() => setToast(null)}><X size={16} /></button>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-6 text-right" dir="rtl">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="bg-white px-6 py-3 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-6 flex-row-reverse">
            <button 
              onClick={() => { setShowAIModal(true); setAiStep('UPLOAD'); setAiError(null); }}
              className="w-12 h-12 bg-indigo-600 text-white rounded-2xl shadow-lg flex items-center justify-center hover:bg-indigo-700 active:scale-95 transition-all shrink-0 border border-white/20"
              title="مساعد Gemini الذكي"
            >
              <Sparkles size={22} />
            </button>
            <div className="text-right">
              <h2 className="text-xl md:text-2xl font-black text-emerald-900">سجل الطلاب العام</h2>
              <div className="flex items-center gap-2 mt-0.5 justify-end">
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">{SCHOOL_NAME}</p>
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 w-full lg:w-auto">
            <button 
              onClick={handleExportPDF}
              disabled={isExporting}
              className={`flex-1 lg:flex-none px-5 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-black hover:bg-slate-50 transition-all flex items-center justify-center gap-2 shadow-sm ${isExporting ? 'opacity-50 grayscale cursor-wait' : ''}`}
            >
              {isExporting ? <RefreshCw className="animate-spin" size={16} /> : <FileText size={16} />}
              <span className="text-xs">تصدير PDF</span>
            </button>
            <button 
              onClick={() => setShowAddModal(true)}
              className="flex-1 lg:flex-none px-6 py-3 bg-emerald-600 text-white rounded-xl font-black shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              <UserPlus size={18} />
              <span className="text-xs">قيد طالب جديد</span>
            </button>
          </div>
        </div>

        <div className="bg-white p-3 rounded-3xl shadow-md border border-slate-100 flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="ابحث بالاسم أو كود الطالب..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-12 pl-6 py-3.5 bg-slate-50/50 rounded-2xl border border-slate-100 focus:ring-4 focus:ring-emerald-50 outline-none font-bold text-slate-700 text-sm"
            />
          </div>
          <button 
            onClick={() => setShowFilterModal(true)}
            className="px-6 py-3.5 bg-emerald-50 text-emerald-700 rounded-2xl font-black border border-emerald-100 flex items-center justify-center gap-3 min-w-[200px] text-xs"
          >
            <LayoutGrid size={16} />
            <span className="truncate">{selectedClassName}</span>
            <ChevronDown size={14} />
          </button>
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-emerald-950 text-white text-[10px] font-black uppercase tracking-widest">
                  <th className="px-6 py-5 text-center w-14 border-none">#</th>
                  <th className="px-6 py-5 border-none">الطالب</th>
                  <th className="px-6 py-5 border-none">الصف</th>
                  <th className="px-6 py-5 text-center border-none">الحالة</th>
                  <th className="px-6 py-5 border-none text-center">التحكم</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((student, index) => (
                  <tr key={student.id} className="hover:bg-emerald-50/30 transition-all group">
                    <td className="px-6 py-3 text-center text-[10px] font-black text-slate-300">{index + 1}</td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3 justify-end">
                        <div className="text-right">
                          <p className="font-black text-slate-800 text-xs flex items-center gap-1.5 justify-end">
                             {student.fullName || student.name}
                             {student.isScout && <Zap size={10} className="text-amber-500 fill-amber-500" />}
                          </p>
                          <p className="text-[9px] text-slate-400 font-bold tracking-tighter">ID: {student.studentCode}</p>
                        </div>
                        {student.avatarUrl ? (
                          <img src={student.avatarUrl} className="w-8 h-8 rounded-full object-cover shadow-sm border border-slate-200" alt="" />
                        ) : (
                          <div className={`w-8 h-8 ${student.avatarColor} rounded-full flex items-center justify-center text-white font-black text-[10px] shadow-sm`}>
                            {student.name?.[0] || 'S'}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-3 text-[10px] font-bold text-slate-500">
                      {CLASSES.find(c => c.id === student.classId)?.name}
                    </td>
                    <td className="px-6 py-3 text-center">
                       <span className="inline-flex items-center gap-1 text-emerald-600 font-black text-[9px] bg-emerald-50 px-2 py-1 rounded-lg">
                          <Check size={10} /> نشط
                       </span>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex justify-center gap-0.5">
                        <button onClick={() => { setSelectedStudent(student); setShowViewModal(true); }} className="p-2 text-slate-300 hover:text-emerald-600 transition-all"><Eye size={14} /></button>
                        <button onClick={() => openEdit(student)} className="p-2 text-slate-300 hover:text-blue-600 transition-all"><Edit2 size={14} /></button>
                        <button onClick={() => { setSelectedStudent(student); setShowDeleteConfirm(true); }} className="p-2 text-slate-300 hover:text-rose-600 transition-all"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showAIModal && (
        <div className="fixed inset-0 z-[4000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl animate-in fade-in">
           <div className="bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden border border-slate-100 flex flex-col animate-in zoom-in-95 max-h-[90vh]">
              <div className="p-6 bg-indigo-700 text-white flex justify-between items-center shrink-0">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center shadow-inner"><BrainCircuit size={28}/></div>
                    <div>
                       <h3 className="text-lg font-black leading-tight">مساعد Gemini الذكي للطلاب</h3>
                       <p className="text-[10px] text-white/50 font-black uppercase tracking-widest">Neural Student Enrollment Engine</p>
                    </div>
                 </div>
                 <button onClick={() => setShowAIModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={24}/></button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 scrollbar-hide text-right" dir="rtl">
                 {aiError && (
                   <div className="mb-6 p-6 bg-rose-50 border-2 border-rose-100 rounded-3xl flex items-start gap-4 animate-in shake duration-500">
                      <AlertCircle className="text-rose-600 shrink-0" size={24} />
                      <div className="text-right">
                         <h4 className="font-black text-rose-800 text-sm">خطأ في التحليل العصبي</h4>
                         <p className="text-xs font-bold text-rose-600 mt-1">{aiError}</p>
                         <button onClick={() => setAiError(null)} className="mt-2 text-[10px] font-black text-rose-700 underline">فهمت، سأحاول مرة أخرى</button>
                      </div>
                   </div>
                 )}

                 {aiStep === 'UPLOAD' && (
                   <div className="space-y-10 py-10">
                      <div className="text-center space-y-4">
                         <h4 className="text-2xl font-black text-slate-800">سجل طلابك في ثوانٍ بالذكاء الاصطناعي</h4>
                         <p className="text-slate-400 font-bold max-w-md mx-auto leading-relaxed">ارفع صورة واضحة لكشف الأسماء، وسيقوم المساعد باستخراج البيانات آلياً.</p>
                      </div>

                      <div className="bg-slate-50 p-8 rounded-[2.5rem] border-2 border-dashed border-slate-200 text-center space-y-6">
                         <div className="space-y-2 mb-6 max-w-xs mx-auto text-right">
                            <label className="text-[10px] font-black text-slate-400 uppercase mr-3">اختر الفصل المستهدف أولاً</label>
                            <button type="button" onClick={() => setShowClassPickerModal(true)} className="w-full p-4 bg-white border border-slate-200 rounded-2xl flex justify-between items-center shadow-sm">
                               <span className="font-black text-sm">{tempSelectedClass ? CLASSES.find(c => c.id === tempSelectedClass)?.name : 'اضغط لتحديد الفصل..'}</span>
                               <ChevronDown size={20} className="text-slate-300" />
                            </button>
                         </div>

                         <div 
                           onClick={() => !isAIProcessing && aiFileInputRef.current?.click()}
                           className={`group h-64 bg-white rounded-[2rem] border-4 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center ${isAIProcessing ? 'opacity-50 pointer-events-none' : 'border-indigo-100 hover:border-indigo-500 hover:bg-indigo-50/30'}`}
                         >
                            {isAIProcessing ? (
                              <div className="flex flex-col items-center gap-4">
                                 <RefreshCw className="animate-spin text-indigo-600" size={64}/>
                                 <p className="font-black text-indigo-600 animate-pulse">جاري فك تشفير الكشف ورقياً...</p>
                              </div>
                            ) : (
                              <>
                                 <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-4 transition-transform group-hover:scale-110">
                                    <Camera size={36} />
                                 </div>
                                 <p className="font-black text-slate-600 text-lg">التقط صورة أو ارفع الكشف</p>
                                 <p className="text-slate-400 text-xs font-bold mt-1">يدعم الأسماء، الهواتف، وتواريخ الميلاد</p>
                              </>
                            )}
                         </div>
                         <input type="file" ref={aiFileInputRef} className="hidden" accept="image/*" onChange={handleAIFileUpload} />
                      </div>
                   </div>
                 )}

                 {aiStep === 'REVIEW' && aiExtractedData && (
                   <div className="space-y-6 animate-in slide-in-from-left-4">
                      <div className="flex justify-between items-center border-b border-slate-100 pb-4 flex-row-reverse">
                         <div className="text-right">
                            <h4 className="text-xl font-black text-slate-800">معاينة المجهر الرقمي</h4>
                            <p className="text-xs font-bold text-slate-400 mt-1">تم تحليل الكشف، يرجى مطابقة الأسماء المكتوبة بالأسود</p>
                         </div>
                         <div className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-xl font-black text-[10px] border border-emerald-100 uppercase tracking-widest">تم رصد {aiExtractedData.students.length} طالباً</div>
                      </div>

                      <div className="bg-white rounded-[2.5rem] overflow-hidden border border-slate-300 shadow-inner">
                         <table className="w-full text-right table-fixed">
                            <thead>
                               <tr className="bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest">
                                  <th className="px-4 py-4 w-[40%]">الاسم الرباعي الكامل (Black Text)</th>
                                  <th className="px-4 py-4 text-center">ولي الأمر</th>
                                  <th className="px-4 py-4 text-center">تاريخ الميلاد</th>
                                  <th className="px-4 py-4 text-center w-14">حذف</th>
                               </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                               {aiExtractedData.students.map((st, idx) => (
                                 <tr key={idx} className="hover:bg-slate-50 transition-all">
                                    <td className="px-4 py-2">
                                       <input 
                                         value={st.fullName} 
                                         onChange={e => {
                                            const next = {...aiExtractedData};
                                            next.students[idx].fullName = e.target.value;
                                            setAiExtractedData(next);
                                         }}
                                         className="w-full px-2 py-1.5 bg-transparent font-black text-[12px] text-black outline-none border-b border-transparent focus:border-indigo-400" 
                                       />
                                    </td>
                                    <td className="px-2 py-2">
                                       <input 
                                         value={st.parentPhone || ''} 
                                         onChange={e => {
                                            const next = {...aiExtractedData};
                                            next.students[idx].parentPhone = e.target.value;
                                            setAiExtractedData(next);
                                         }}
                                         className="w-full px-2 py-1.5 bg-transparent font-bold text-[11px] text-black text-center outline-none" 
                                       />
                                    </td>
                                    <td className="px-2 py-2">
                                       <input 
                                         type="text"
                                         value={st.birthDate || ''} 
                                         placeholder="-"
                                         onChange={e => {
                                            const next = {...aiExtractedData};
                                            next.students[idx].birthDate = e.target.value;
                                            setAiExtractedData(next);
                                         }}
                                         className="w-full px-2 py-1.5 bg-transparent font-bold text-[11px] text-black text-center outline-none" 
                                       />
                                    </td>
                                    <td className="px-2 py-2 text-center">
                                       <button onClick={() => {
                                         const next = {...aiExtractedData};
                                         next.students.splice(idx, 1);
                                         setAiExtractedData({...next});
                                       }} className="text-rose-300 hover:text-rose-600 transition-colors"><Trash2 size={16}/></button>
                                    </td>
                                 </tr>
                               ))}
                            </tbody>
                         </table>
                      </div>

                      <div className="flex justify-end gap-3 pt-6 flex-row-reverse">
                         <button 
                           onClick={() => setAiStep('SORT_CHOICE')}
                           className="px-10 py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm shadow-xl hover:bg-indigo-700 transition-all flex items-center gap-2"
                         >
                            <span>متابعة للحفظ</span>
                            <ChevronLeft size={20}/>
                         </button>
                         <button onClick={() => { setAiStep('UPLOAD'); setAiError(null); }} className="px-6 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-sm">إعادة التصوير</button>
                      </div>
                   </div>
                 )}

                 {aiStep === 'SORT_CHOICE' && (
                    <div className="space-y-10 py-10 text-center animate-in zoom-in-95">
                       <div className="w-24 h-24 bg-indigo-50 text-indigo-600 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-inner"><ListOrdered size={48}/></div>
                       <div className="space-y-3">
                          <h4 className="text-2xl font-black text-slate-800">ترتيب الطلاب الجدد</h4>
                          <p className="text-slate-400 font-bold text-sm">اختر آلية الدمج مع سجلات المدرسة الحالية</p>
                       </div>

                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-xl mx-auto">
                          <button 
                            onClick={() => setSortChoice('ABJAD')}
                            className={`p-8 rounded-[2.5rem] border-2 transition-all text-right flex flex-col gap-3 group ${sortChoice === 'ABJAD' ? 'border-indigo-600 bg-indigo-50' : 'border-slate-100 hover:border-indigo-200'}`}
                          >
                             <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${sortChoice === 'ABJAD' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-100 text-slate-400'}`}><BadgeCheck size={20}/></div>
                             <div>
                                <p className={`font-black text-lg ${sortChoice === 'ABJAD' ? 'text-indigo-900' : 'text-slate-700'}`}>ترتيب أبجدي آلي</p>
                                <p className="text-[10px] text-slate-400 font-bold leading-relaxed">دمج الطلاب الجدد وترتيب الجميع هجائياً بشكل تلقائي.</p>
                             </div>
                          </button>

                          <button 
                            onClick={() => setSortChoice('AS_IS')}
                            className={`p-8 rounded-[2.5rem] border-2 transition-all text-right flex flex-col gap-3 group ${sortChoice === 'AS_IS' ? 'border-amber-600 bg-amber-50' : 'border-slate-100 hover:border-amber-200'}`}
                          >
                             <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${sortChoice === 'AS_IS' ? 'bg-amber-600 text-white shadow-lg' : 'bg-slate-100 text-slate-400'}`}><LayoutGrid size={20}/></div>
                             <div>
                                <p className={`font-black text-lg ${sortChoice === 'AS_IS' ? 'text-amber-900' : 'text-slate-700'}`}>إبقاء الترتيب الحالي</p>
                                <p className="text-[10px] text-slate-400 font-bold leading-relaxed">إضافة الطلاب في نهاية السجل حسب ترتيبهم في الكشف الممسوح.</p>
                             </div>
                          </button>
                       </div>

                       <div className="flex justify-center gap-3 pt-10 flex-row-reverse">
                          <button 
                            onClick={finalizeAIAddition}
                            disabled={isAIProcessing}
                            className="px-14 py-5 bg-emerald-600 text-white rounded-[2rem] font-black text-lg shadow-2xl hover:bg-emerald-700 transition-all flex items-center gap-3"
                          >
                             {isAIProcessing ? <RefreshCw className="animate-spin" size={24}/> : <SaveIconLucide size={24}/>}
                             <span>تأكيد واعتماد الإضافة</span>
                          </button>
                          <button onClick={() => setAiStep('REVIEW')} className="px-10 py-5 bg-slate-100 text-slate-500 rounded-[2rem] font-black text-lg">العودة للمراجعة</button>
                       </div>
                    </div>
                 )}
              </div>
           </div>
        </div>
      )}

      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 z-[4000] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 flex flex-col animate-in zoom-in-95">
            <div className="p-6 bg-emerald-800 text-white flex justify-between items-center shrink-0">
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center shadow-inner"><UserPlus size={20}/></div>
                  <h3 className="text-sm font-black leading-tight">{showEditModal ? 'تعديل البيانات' : 'قيد طالب جديد'}</h3>
               </div>
               <button onClick={() => { setShowAddModal(false); setShowEditModal(false); }} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20}/></button>
            </div>

            <form onSubmit={showEditModal ? handleEditStudent : handleAddStudent} className="p-8 space-y-6 overflow-y-auto scrollbar-hide max-h-[80vh] text-right">
               <div className="flex items-center gap-6 flex-row-reverse">
                  <div onClick={() => fileInputRef.current?.click()} className="relative shrink-0 cursor-pointer group">
                    {formData.avatarUrl ? (
                      <img src={formData.avatarUrl} className="w-20 h-20 rounded-[1.5rem] object-cover border-2 border-emerald-50 shadow-md" alt="" />
                    ) : (
                      <div className="w-20 h-20 rounded-[1.5rem] bg-slate-50 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-300 hover:text-emerald-500 transition-all">
                         <Camera size={24} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 space-y-1 text-right">
                    <label className="text-[10px] font-black text-slate-400 uppercase mr-1">الاسم الرباعي <span className="text-rose-500">*</span></label>
                    <input required value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl font-black text-sm outline-none focus:ring-4 focus:ring-emerald-100 text-right" placeholder="الاسم الكامل" />
                  </div>
               </div>
               <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />

               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1 text-right">
                    <label className="text-[10px] font-black text-slate-400 uppercase mr-1">الفصل الدراسي <span className="text-rose-500">*</span></label>
                    <button type="button" onClick={() => setShowClassPickerModal(true)} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl flex justify-between items-center shadow-sm hover:bg-slate-100 transition-all">
                       <span className="font-black text-xs truncate">{tempSelectedClass ? CLASSES.find(c => c.id === tempSelectedClass)?.name : 'اختر الفصل..'}</span>
                       <ChevronDown size={18} className="text-slate-300" />
                    </button>
                 </div>
                 <div className="space-y-1 text-right">
                    <label className="text-[10px] font-black text-slate-400 uppercase mr-1">كود الطالب</label>
                    <input value={formData.autoCode} onChange={e => setFormData({...formData, autoCode: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl font-black text-sm text-center font-mono text-emerald-700" />
                 </div>
               </div>

               <button type="submit" className="w-full py-5 mt-4 bg-emerald-600 text-white rounded-2xl font-black text-lg shadow-xl hover:bg-emerald-700 transition-all flex items-center justify-center gap-3 active:scale-95">
                  <SaveIcon size={22} />
                  <span>{showEditModal ? 'تعديل البيانات' : 'اعتماد قيد الطالب'}</span>
               </button>
            </form>
          </div>
        </div>
      )}

      {showClassPickerModal && (
        <div className="fixed inset-0 z-[6000] flex items-center justify-center p-6 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
           <div className="bg-white w-full max-w-xs rounded-[2rem] p-6 shadow-2xl animate-in zoom-in-95">
              <div className="flex justify-between items-center mb-6">
                 <h3 className="font-black text-sm">اختر الفصل الدراسي</h3>
                 <button onClick={() => setShowClassPickerModal(false)} className="p-1.5 hover:bg-slate-100 rounded-full transition-colors"><X size={16}/></button>
              </div>
              <div className="grid grid-cols-1 gap-2 max-h-[50vh] overflow-y-auto scrollbar-hide">
                 {CLASSES.map(c => (
                   <button 
                     key={c.id} 
                     type="button"
                     onClick={() => { setTempSelectedClass(c.id); setShowClassPickerModal(false); }} 
                     className={`p-4 rounded-xl border-2 font-black text-xs transition-all text-right flex justify-between items-center flex-row-reverse ${tempSelectedClass === c.id ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-50 hover:bg-slate-50'}`}
                   >
                     <span>{c.name}</span>
                     {tempSelectedClass === c.id && <Check size={16}/>}
                   </button>
                 ))}
              </div>
           </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[4000] flex items-center justify-center p-6 bg-slate-950/60 backdrop-blur-md animate-in fade-in">
           <div className="bg-white w-full max-w-xs rounded-3xl p-8 shadow-2xl text-center space-y-4 animate-in zoom-in-95">
              <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto"><AlertTriangle size={32}/></div>
              <h3 className="text-lg font-black text-slate-800 leading-tight">تأكيد الحذف</h3>
              <p className="text-[11px] font-bold text-slate-400">هل أنت متأكد من حذف الطالب وسجلاته نهائياً؟</p>
              <div className="flex flex-col gap-2 pt-2">
                 <button onClick={handleDeleteStudent} className="w-full py-3 bg-rose-600 text-white rounded-xl font-black text-xs shadow-lg shadow-rose-100">نعم، حذف نهائي</button>
                 <button onClick={() => setShowDeleteConfirm(false)} className="w-full py-3 text-slate-400 font-black text-xs">إلغاء</button>
              </div>
           </div>
        </div>
      )}

      {showFilterModal && (
        <div className="fixed inset-0 z-[1500] flex items-center justify-center p-6 bg-emerald-950/40 backdrop-blur-sm animate-in fade-in">
           <div className="bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-2xl animate-in zoom-in-95">
              <div className="flex justify-between items-center mb-6">
                 <h3 className="text-base font-black text-slate-800">تصفية القائمة</h3>
                 <button onClick={() => setShowFilterModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={18}/></button>
              </div>
              <div className="grid grid-cols-1 gap-2 mb-6 max-h-[50vh] overflow-y-auto scrollbar-hide">
                 <button 
                   onClick={() => { setSelectedClassFilter('ALL'); setShowFilterModal(false); }}
                   className={`p-3 rounded-xl border-2 font-black text-[11px] text-right transition-all ${selectedClassFilter === 'ALL' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-50'}`}
                 >
                   جميع الفصول
                 </button>
                 {CLASSES.map(c => (
                   <button 
                     key={c.id} 
                     onClick={() => { setSelectedClassFilter(c.id); setShowFilterModal(false); }}
                     className={`p-3 rounded-xl border-2 font-black text-[11px] text-right transition-all ${selectedClassFilter === c.id ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-50'}`}
                   >
                     {c.name}
                   </button>
                 ))}
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

const SaveIcon: React.FC<{size?: number, className?: string}> = ({size = 24, className}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
    <polyline points="17 21 17 13 7 13 7 21"></polyline>
    <polyline points="7 3 7 8 15 8"></polyline>
  </svg>
);
