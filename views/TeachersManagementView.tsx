
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Users, UserPlus, Search, Phone, 
  BookOpen, MoreVertical, Edit2, 
  Trash2, ShieldCheck, Zap, X,
  Briefcase, GraduationCap, CheckCircle2, ChevronLeft,
  ArrowRight, User, Settings, Plus, LayoutGrid,
  BadgeCheck, AlertCircle, Info, Eye, EyeOff, Lock, Camera, Upload, RefreshCw, KeyRound, Save, ChevronDown, ChevronUp,
  Book, Sun, PenTool, Type, Variable, FlaskConical, Globe2, Atom, TestTube2, Microscope, Scroll, MapPin, Users2, Circle, Power, Check, FileText, ChevronRight, AlertTriangle, Sparkles, BrainCircuit, CheckSquare, Square, ShieldAlert
} from 'lucide-react';
import { Gender, JobTitle, StaffMember, TeachingAssignment, User as UserType, UserRole } from '../types';
import { CLASSES, SCHOOL_NAME } from '../constants';
import { saveToFirestore, deleteFromFirestore, logActivity } from '../services/firebaseService';
import { analyzeStaffListImage, StaffExtractionResult } from '../services/geminiService';

const JOB_TITLE_LABELS: Record<JobTitle, { male: string, female: string }> = {
  PRINCIPAL: { male: 'مدير المدرسة', female: 'مديرة المدرسة' },
  VICE_PRINCIPAL: { male: 'وكيل المدرسة', female: 'وكيلة المدرسة' },
  TEACHER: { male: 'معلم', female: 'معلمة' },
  ADMIN_STAFF: { male: 'إداري', female: 'إدارية' }
};

const SUBJECT_ICONS: Record<string, { icon: any, color: string, bg: string, border?: string, levels: string[] }> = {
  'قرآن': { icon: Book, color: 'text-emerald-500', bg: 'bg-emerald-50', levels: ['PRIMARY', 'MIDDLE', 'SECONDARY'] },
  'تربية إسلامية': { icon: Sun, color: 'text-amber-500', bg: 'bg-amber-50', levels: ['PRIMARY', 'MIDDLE', 'SECONDARY'] },
  'لغة عربية': { icon: PenTool, color: 'text-orange-500', bg: 'bg-orange-50', border: 'border-orange-100', levels: ['PRIMARY', 'MIDDLE', 'SECONDARY'] },
  'English': { icon: Type, color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-100', levels: ['PRIMARY', 'MIDDLE', 'SECONDARY'] },
  'رياضيات': { icon: Variable, color: 'text-indigo-500', bg: 'bg-indigo-50', border: 'border-indigo-100', levels: ['PRIMARY', 'MIDDLE', 'SECONDARY'] },
  'علوم': { icon: FlaskConical, color: 'text-teal-500', bg: 'bg-teal-50', border: 'border-teal-100', levels: ['PRIMARY', 'MIDDLE'] },
  'اجتماعيات': { icon: Globe2, color: 'text-sky-500', bg: 'bg-sky-100', border: 'border-sky-200', levels: ['PRIMARY', 'MIDDLE'] },
  'فيزياء': { icon: Atom, color: 'text-violet-500', bg: 'bg-violet-50', border: 'border-violet-100', levels: ['SECONDARY'] },
  'كيمياء': { icon: TestTube2, color: 'text-pink-500', bg: 'bg-pink-50', border: 'border-pink-100', levels: ['SECONDARY'] },
  'أحياء': { icon: Microscope, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100', levels: ['SECONDARY'] },
  'تاريخ': { icon: Scroll, color: 'text-stone-500', bg: 'bg-stone-50', border: 'border-stone-100', levels: ['SECONDARY'] },
  'جغرافيا': { icon: MapPin, color: 'text-red-500', bg: 'bg-red-100', border: 'border-red-200', levels: ['SECONDARY'] },
  'مجتمع': { icon: Users2, color: 'text-cyan-600', bg: 'bg-cyan-50', border: 'border-cyan-100', levels: ['SECONDARY'] },
  'مربي فصل': { icon: GraduationCap, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', levels: ['PRIMARY', 'MIDDLE', 'SECONDARY'] }
};

const ALL_SUBJECTS = Object.keys(SUBJECT_ICONS);

const getShortClassName = (id: string): string => {
  const map: Record<string, string> = {
    'p1': 'أول', 'p2': 'ثاني', 'p3': 'ثالث', 'p4': 'رابع', 'p5': 'خامس', 'p6': 'سادس',
    'm7': 'سابع', 'm8': 'ثامن', 'm9': 'تاسع',
    's10': '1ث', 's11': '2ث', 's12': '3ث'
  };
  return map[id] || id;
};

const generateEnglishUsername = (arabicName: string) => {
  const firstName = arabicName.trim().split(' ')[0];
  const map: any = { 'ا': 'a', 'ب': 'b', 'ت': 't', 'ث': 'th', 'ج': 'j', 'ح': 'h', 'خ': 'kh', 'د': 'd', 'ذ': 'dh', 'ر': 'r', 'ز': 'z', 'س': 's', 'ش': 'sh', 'ص': 's', 'ض': 'd', 'ط': 't', 'ظ': 'z', 'ع': 'a', 'غ': 'gh', 'ف': 'f', 'ق': 'q', 'ك': 'k', 'ل': 'l', 'م': 'm', 'ن': 'n', 'ه': 'h', 'و': 'w', 'ي': 'y' };
  const english = firstName.split('').map(char => map[char] || '').join('');
  const nums = Math.floor(10 + Math.random() * 89);
  const letter = String.fromCharCode(97 + Math.floor(Math.random() * 26));
  return `${english || 'user'}${nums}${letter}`;
};

const generateRandomString = (length: number, charset: string) => {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return result;
};

interface TeachersManagementViewProps {
  staff: StaffMember[];
  setStaff: React.Dispatch<React.SetStateAction<StaffMember[]>>;
  user: UserType;
}

export const TeachersManagementView: React.FC<TeachersManagementViewProps> = ({ staff, setStaff, user }) => {
  const [view, setView] = useState<'LIST' | 'PROFILE'>('LIST');
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCredentials, setShowCredentials] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');

  // Bulk Selection States
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const longPressTimer = useRef<any>(null);

  // AI Modal States
  const [showAIModal, setShowAIModal] = useState(false);
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiExtractedData, setAiExtractedData] = useState<(StaffExtractionResult['staff'][0] & { id: string, isVolunteer: boolean, assignments: TeachingAssignment[] })[] | null>(null);
  const [activeAssignMemberIdx, setActiveAssignMemberIdx] = useState<number | null>(null);
  const aiFileInputRef = useRef<HTMLInputElement>(null);

  const filteredStaffList = useMemo(() => staff.filter(s => s.name.includes(searchTerm)), [staff, searchTerm]);

  const sortedStaff = useMemo(() => {
    const males = filteredStaffList.filter(s => s.gender === Gender.MALE).sort((a, b) => a.name.localeCompare(b.name, 'ar'));
    const females = filteredStaffList.filter(s => s.gender === Gender.FEMALE).sort((a, b) => a.name.localeCompare(b.name, 'ar'));
    return { males, females };
  }, [filteredStaffList]);

  const handleOpenProfile = (member: StaffMember) => {
    if (isSelectionMode) {
      toggleSelection(member.id);
      return;
    }
    setSelectedStaff(member);
    setView('PROFILE');
  };

  const startLongPress = (id: string) => {
    longPressTimer.current = setTimeout(() => {
      setIsSelectionMode(true);
      toggleSelection(id);
      if (window.navigator.vibrate) window.navigator.vibrate(50);
    }, 600);
  };

  const endLongPress = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      if (next.size === 0) setIsSelectionMode(false);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredStaffList.length) {
      setSelectedIds(new Set());
      setIsSelectionMode(false);
    } else {
      setSelectedIds(new Set(filteredStaffList.map(s => s.id)));
      setIsSelectionMode(true);
    }
  };

  const handleBulkDelete = async () => {
    setIsAIProcessing(true);
    try {
      const idsToDelete = Array.from(selectedIds) as string[];
      const promises = idsToDelete.map(id => deleteFromFirestore("staff", id));
      await Promise.all(promises);
      
      setStaff(prev => prev.filter(s => !selectedIds.has(s.id)));
      await logActivity(user, `حذف جماعي لعدد ${selectedIds.size} من الكادر`, 'STAFF');
      setSelectedIds(new Set());
      setIsSelectionMode(false);
      setShowBulkDeleteModal(false);
    } catch (e) {
      alert("فشل في تنفيذ الحذف الجماعي");
    } finally {
      setIsAIProcessing(false);
    }
  };

  const handleAIFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

      const result = await analyzeStaffListImage(base64);
      setAiExtractedData(result.staff.map((s, idx) => ({ 
        ...s, 
        id: `ai-${Date.now()}-${idx}`, 
        isVolunteer: false,
        assignments: [] 
      })));
    } catch (err: any) {
      setAiError(err.message || "فشل تحليل الكشف. يرجى التأكد من وضوح الصورة.");
    } finally {
      setIsAIProcessing(false);
    }
  };

  const finalizeAIAddition = async () => {
    if (!aiExtractedData) return;
    setIsAIProcessing(true);
    try {
      const newEntries: StaffMember[] = aiExtractedData.map((item, idx) => ({
        id: (Date.now() + idx).toString(),
        name: item.name,
        username: generateEnglishUsername(item.name),
        password: generateRandomString(10, 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789!@#'),
        role: item.jobTitle === 'PRINCIPAL' ? UserRole.ADMIN : UserRole.TEACHER,
        employeeId: (Date.now() + idx).toString(),
        jobTitle: item.jobTitle,
        gender: item.gender as Gender,
        phone: item.phone || '',
        isTeaching: true,
        assignments: item.assignments,
        isVolunteer: item.isVolunteer,
        joinDate: new Date().toISOString().split('T')[0],
        avatarColor: item.gender === 'FEMALE' ? 'bg-rose-600' : 'bg-emerald-600',
        status: 'ACTIVE'
      }));

      const savePromises = newEntries.map(s => saveToFirestore("staff", s.id, s));
      await Promise.all(savePromises);
      setStaff([...newEntries, ...staff]);
      setShowAIModal(false);
      setAiExtractedData(null);
      await logActivity(user, `إضافة ${newEntries.length} أعضاء جدد عبر الذكاء الاصطناعي`, 'STAFF');
    } catch (e) {
      alert("فشل حفظ البيانات المستخرجة");
    } finally {
      setIsAIProcessing(false);
    }
  };

  const handleVerifyAdmin = async () => {
    if (adminPassword === '123') {
       setShowCredentials(true);
       setShowAuthModal(false);
       setAdminPassword('');
       await logActivity(user, "كشف كلمات مرور الكادر التعليمي", 'SECURITY');
    } else {
       alert('كلمة مرور الإدارة غير صحيحة');
    }
  };

  const handleDeleteStaff = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const member = staff.find(s => s.id === id);
    if (!confirm(`هل أنت متأكد من حذف ${member?.name}؟`)) return;
    try {
      await deleteFromFirestore("staff", id);
      setStaff(prev => prev.filter(s => s.id !== id));
      await logActivity(user, `حذف عضو من الكادر التعليمي`, 'STAFF', `العضو: ${member?.name}`);
      if (selectedStaff?.id === id) {
        setView('LIST');
        setSelectedStaff(null);
      }
    } catch (e) {
      alert("فشل حذف العضو من قاعدة البيانات");
    }
  };

  const handleUpdateStaff = async (updatedMember: StaffMember) => {
    try {
      await saveToFirestore("staff", updatedMember.id, updatedMember);
      setStaff(prev => prev.map(s => s.id === updatedMember.id ? updatedMember : s));
      await logActivity(user, `تعديل بيانات عضو في الكادر`, 'STAFF', `العضو: ${updatedMember.name}`);
      setSelectedStaff(updatedMember);
      setShowEditModal(false);
    } catch (e) {
      alert("فشل التحديث في Firestore");
    }
  };

  const handleUpdateSecurity = async (id: string, newUsername: string, newPass: string) => {
    const member = staff.find(s => s.id === id);
    if (!member) return;
    const updated = { ...member, username: newUsername, password: newPass };
    try {
      await saveToFirestore("staff", id, updated);
      setStaff(prev => prev.map(s => s.id === id ? updated : s));
      await logActivity(user, `تحديث أمني لحساب عضو`, 'SECURITY', `العضو: ${member.name}`);
      if (selectedStaff?.id === id) { setSelectedStaff(updated); }
    } catch (e) {
      alert("فشل تحديث بيانات الحماية");
    }
  };

  const StaffRows = ({ list, startIndex }: { list: StaffMember[], startIndex: number }) => (
    <>
      {list.map((member, idx) => {
        const uniqueClassIds = Array.from(new Set(member.assignments.flatMap(a => a.classIds)));
        const classStr = uniqueClassIds.map(getShortClassName).join(' | ');
        const isSelected = selectedIds.has(member.id);
        
        return (
          <tr 
            key={member.id} 
            className={`hover:bg-emerald-50/50 transition-all group cursor-pointer border-b border-slate-50 last:border-none ${member.status === 'INACTIVE' ? 'opacity-60 grayscale' : ''} ${isSelected ? 'bg-emerald-50/80 border-r-4 border-r-emerald-500' : ''}`}
          >
            <td className="px-2 py-6 text-center w-12 min-w-[48px]">
              {isSelectionMode ? (
                <button onClick={(e) => { e.stopPropagation(); toggleSelection(member.id); }} className={`p-2 transition-all ${isSelected ? 'text-emerald-600 scale-125' : 'text-slate-200 hover:text-emerald-300'}`}>
                  {isSelected ? <CheckSquare size={22} fill="currentColor" className="text-white" /> : <Square size={22} />}
                </button>
              ) : (
                <span className="text-[10px] md:text-xs font-black text-slate-300">{startIndex + idx + 1}</span>
              )}
            </td>
            <td 
              className="px-2 md:px-6 py-6 whitespace-nowrap"
              onMouseDown={() => startLongPress(member.id)}
              onMouseUp={endLongPress}
              onMouseLeave={endLongPress}
              onTouchStart={() => startLongPress(member.id)}
              onTouchEnd={endLongPress}
              onClick={() => handleOpenProfile(member)}
            >
              <div className="flex items-center gap-2 md:gap-4">
                <div className={`shrink-0 w-10 h-10 md:w-12 md:h-12 ${member.avatarColor} rounded-full md:rounded-2xl flex items-center justify-center text-white font-black text-[10px] md:text-sm shadow-md transition-transform group-hover:scale-110`}>
                  {member.name?.[0] || 'M'}
                </div>
                <div className="min-w-0 text-right">
                  <p className="font-black text-slate-800 text-[10px] md:text-sm truncate">أ/ {member.name}</p>
                  <p className="text-[8px] md:text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{JOB_TITLE_LABELS[member.jobTitle][member.gender === Gender.MALE ? 'male' : 'female']}</p>
                </div>
              </div>
            </td>
            {showCredentials ? (
               <>
                 <td className="px-2 md:px-6 py-6 text-center font-mono text-[10px] font-black text-emerald-600">{member.username}</td>
                 <td className="px-2 md:px-6 py-6 text-center font-mono text-[10px] font-black text-indigo-600 tracking-widest">{member.password}</td>
               </>
            ) : (
              <>
                <td className="px-2 md:px-6 py-6">
                   <div className="flex flex-wrap gap-1.5 justify-center max-w-[220px] mx-auto">
                      {Array.from(new Set(member.assignments.map(a => a.subjectName))).map((subName, i) => (
                        <span key={i} className="px-2.5 py-1 rounded-lg bg-indigo-50 text-[8px] font-black text-indigo-600 border border-indigo-100 whitespace-nowrap">{subName}</span>
                      ))}
                      {member.assignments.length === 0 && <span className="text-[9px] text-slate-300 whitespace-nowrap">بلا تكليف</span>}
                   </div>
                </td>
                <td className="px-2 md:px-6 py-6 text-center whitespace-nowrap">
                  <span className="text-[8px] md:text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100 shadow-sm">{uniqueClassIds.length > 0 ? classStr : 'لم يحدد'}</span>
                </td>
              </>
            )}
            <td className="px-2 md:px-6 py-6 text-center hidden md:table-cell whitespace-nowrap">
              <span className={`text-[8px] md:text-[9px] font-black px-3 py-1.5 rounded-xl ${member.isVolunteer ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-slate-100 text-slate-400 border border-slate-200'}`}>{member.isVolunteer ? 'متطوع' : 'رسمي'}</span>
            </td>
            <td className="px-2 md:px-6 py-6 text-center whitespace-nowrap">
              <div className={`inline-flex items-center gap-1.5 text-[8px] md:text-[10px] font-black px-3 py-1.5 rounded-2xl ${member.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-500 border border-rose-100'}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${member.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                {member.status === 'ACTIVE' ? 'نشط' : 'متوقف'}
              </div>
            </td>
            <td className="px-2 md:px-6 py-6 text-center">
               <div className="flex items-center justify-center gap-2">
                  <button onClick={() => handleOpenProfile(member)} className="p-2.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-xl transition-all shadow-sm" title="الملف الشخصي"><Eye size={18}/></button>
                  <button onClick={(e) => { e.stopPropagation(); setSelectedStaff(member); setShowEditModal(true); }} className="p-2.5 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-xl transition-all shadow-sm" title="تعديل"><Edit2 size={18}/></button>
                  <button onClick={(e) => handleDeleteStaff(member.id, e)} className="p-2.5 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white rounded-xl transition-all shadow-sm" title="حذف"><Trash2 size={18}/></button>
               </div>
            </td>
          </tr>
        );
      })}
    </>
  );

  return (
    <div className="relative min-h-screen">
      {view === 'LIST' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div className="bg-white px-8 py-4 rounded-[2rem] shadow-xl border border-slate-100 flex items-center gap-6 flex-row-reverse">
              <button 
                onClick={() => { setShowAIModal(true); setAiError(null); setAiExtractedData(null); }}
                className="w-12 h-12 bg-indigo-600 text-white rounded-2xl shadow-lg flex items-center justify-center hover:bg-indigo-700 active:scale-95 transition-all shrink-0 border border-white/20"
                title="مساعد المعلمين الذكي"
              >
                <Sparkles size={22} />
              </button>
              <div className="text-right">
                <h2 className="text-3xl font-black text-emerald-900 tracking-tight">شؤون المعلمين والكادر</h2>
                <div className="flex items-center gap-2 mt-1 justify-end">
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">{SCHOOL_NAME}</p>
                  <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                </div>
              </div>
            </div>
            
            {isSelectionMode ? (
              <div className="flex items-center gap-4 bg-emerald-600 text-white px-6 py-4 rounded-[1.5rem] shadow-2xl animate-in slide-in-from-top-4 flex-row-reverse border border-white/20">
                <div className="flex items-center gap-3 flex-row-reverse border-l border-white/20 pl-4">
                  <BadgeCheck className="text-emerald-300" size={24} />
                  <span className="font-black text-sm">تم تحديد {selectedIds.size} معلمين</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowBulkDeleteModal(true)} className="px-5 py-3 bg-white text-rose-600 rounded-xl transition-all hover:bg-rose-50 flex items-center gap-2 font-black text-xs shadow-lg">
                    <Trash2 size={16}/> حذف المحدد
                  </button>
                  <button onClick={() => { setIsSelectionMode(false); setSelectedIds(new Set()); }} className="px-5 py-3 bg-emerald-700 text-white rounded-xl transition-all hover:bg-emerald-800 font-black text-xs">
                    إلغاء التحديد
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-4 w-full lg:w-auto">
                {!showCredentials ? (
                  <button onClick={() => setShowAuthModal(true)} className="px-6 py-4 bg-white border-2 border-indigo-50 text-indigo-600 rounded-2xl font-black text-sm hover:bg-indigo-50 transition-all flex items-center gap-3 shadow-md">
                     <Lock size={18} />
                     <span>كشف حسابات الدخول</span>
                  </button>
                ) : (
                  <div className="px-6 py-4 bg-indigo-50 text-indigo-700 rounded-2xl font-black text-sm border border-indigo-100 flex items-center gap-3 shadow-inner">
                    <ShieldCheck size={18} /> الحسابات معروضة للإدارة
                  </div>
                )}
                <button onClick={() => setShowAddModal(true)} className="flex-1 lg:flex-none px-10 py-4 bg-emerald-600 text-white rounded-[1.5rem] font-black shadow-2xl shadow-emerald-100 hover:bg-emerald-700 transition-all flex items-center justify-center gap-3 active:scale-95">
                  <UserPlus size={22} />
                  <span>إضافة كادر جديد</span>
                </button>
              </div>
            )}
          </div>
          
          <div className="bg-white p-4 rounded-[2.5rem] shadow-lg border border-slate-100">
             <div className="relative">
                <Search className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300" size={24} />
                <input type="text" placeholder="ابحث عن اسم، تخصص، أو منصب وظيفي..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pr-16 pl-6 py-5 bg-slate-50 border-none rounded-[1.5rem] font-black text-sm outline-none focus:ring-4 focus:ring-emerald-50 transition-all text-right" />
             </div>
          </div>

          <div className="bg-white rounded-[3.5rem] shadow-2xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse table-auto">
                <thead>
                  <tr className="bg-emerald-950 text-white text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em]">
                    <th className="px-2 py-7 text-center w-12 border-none">
                      {isSelectionMode ? (
                        <button onClick={toggleSelectAll} className="p-2 text-white hover:text-emerald-300">
                           {selectedIds.size === filteredStaffList.length ? <CheckSquare size={22} /> : <Square size={22} />}
                        </button>
                      ) : "#"}
                    </th>
                    <th className="px-6 py-7 border-none whitespace-nowrap">الاسم والوظيفة</th>
                    {showCredentials ? (
                      <>
                        <th className="px-6 py-7 text-center border-none whitespace-nowrap">اسم المستخدم</th>
                        <th className="px-6 py-7 text-center border-none whitespace-nowrap">كلمة المرور</th>
                      </>
                    ) : (
                      <>
                        <th className="px-6 py-7 text-center border-none whitespace-nowrap">التخصصات</th>
                        <th className="px-6 py-7 text-center border-none whitespace-nowrap">الفصول</th>
                      </>
                    )}
                    <th className="px-6 py-7 text-center hidden md:table-cell border-none whitespace-nowrap">النوع</th>
                    <th className="px-6 py-7 text-center border-none whitespace-nowrap">الحالة</th>
                    <th className="px-6 py-7 text-center border-none w-40 whitespace-nowrap">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <StaffRows list={sortedStaff.males} startIndex={0} />
                  {(sortedStaff.males.length > 0 && sortedStaff.females.length > 0) && (
                    <tr className="bg-slate-50/50">
                      <td colSpan={8} className="px-6 py-3 border-y border-slate-100 text-right">
                        <div className="flex items-center gap-4 flex-row-reverse">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-2 flex-row-reverse"><Users size={14}/> قسم المعلمات</span>
                          <div className="h-px bg-slate-200 flex-1"></div>
                        </div>
                      </td>
                    </tr>
                  )}
                  <StaffRows list={sortedStaff.females} startIndex={sortedStaff.males.length} />
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Modal */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 z-[5000] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-xl animate-in fade-in">
           <div className="bg-white w-full max-w-md rounded-[3rem] p-10 shadow-2xl text-center space-y-6 animate-in zoom-in-95">
              <div className="w-24 h-24 bg-rose-50 text-rose-600 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-inner animate-bounce">
                <ShieldAlert size={48} />
              </div>
              <h3 className="text-3xl font-black text-slate-800">تأكيد حذف جماعي</h3>
              <p className="text-slate-500 font-bold leading-relaxed">
                أنت على وشك حذف <span className="text-rose-600 font-black text-xl">{selectedIds.size}</span> من الكادر التعليمي. <br />
                <span className="text-rose-700 underline decoration-rose-200">لن تستطيع استعادتهم نهائياً بعد هذه الخطوة.</span>
              </p>
              <div className="flex flex-col gap-3 pt-6">
                 <button 
                  onClick={handleBulkDelete}
                  disabled={isAIProcessing}
                  className="w-full py-5 bg-rose-600 text-white rounded-[1.8rem] font-black text-lg shadow-2xl shadow-rose-200 active:scale-95 transition-all flex items-center justify-center gap-3"
                 >
                    {isAIProcessing ? <RefreshCw className="animate-spin" size={24}/> : <Trash2 size={24}/>}
                    تأكيد الحذف النهائي
                 </button>
                 <button onClick={() => setShowBulkDeleteModal(false)} className="w-full py-4 text-slate-400 font-black hover:text-slate-600 transition-colors">تراجع عن القرار</button>
              </div>
           </div>
        </div>
      )}

      {/* AI Modal */}
      {showAIModal && (
        <div className="fixed inset-0 z-[4000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl animate-in fade-in">
           <div className="bg-white w-full max-w-6xl rounded-[3rem] shadow-2xl overflow-hidden border border-slate-100 flex flex-col animate-in zoom-in-95 max-h-[90vh]">
              <div className="p-6 bg-indigo-700 text-white flex justify-between items-center shrink-0 flex-row-reverse">
                 <div className="flex items-center gap-4 flex-row-reverse">
                    <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center shadow-inner"><BrainCircuit size={28}/></div>
                    <div className="text-right">
                       <h3 className="text-lg font-black leading-tight">مساعد Gemini الذكي للمعلمين</h3>
                       <p className="text-[10px] text-white/50 font-black uppercase tracking-widest">Neural Faculty Enrollment</p>
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
                         <button onClick={() => setAiError(null)} className="mt-2 text-[10px] font-black text-rose-700 underline">إعادة المحاولة</button>
                      </div>
                   </div>
                 )}

                 {!aiExtractedData ? (
                   <div className="space-y-10 py-10">
                      <div className="text-center space-y-4">
                         <h4 className="text-2xl font-black text-slate-800">أضف طاقمك التعليمي في ثوانٍ</h4>
                         <p className="text-slate-400 font-bold max-w-md mx-auto leading-relaxed">التقط صورة لكشف أسماء المعلمين، وسيقوم المساعد باستخراج أسمائهم، أرقام هواتفهم، ومسمياتهم الوظيفية.</p>
                      </div>

                      <div className="bg-slate-50 p-8 rounded-[2.5rem] border-2 border-dashed border-slate-200 text-center space-y-6">
                         <div 
                           onClick={() => !isAIProcessing && aiFileInputRef.current?.click()}
                           className={`group h-64 bg-white rounded-[2rem] border-4 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center ${isAIProcessing ? 'opacity-50 pointer-events-none' : 'border-indigo-100 hover:border-indigo-500 hover:bg-indigo-50/30'}`}
                         >
                            {isAIProcessing ? (
                              <div className="flex flex-col items-center gap-4">
                                 <RefreshCw className="animate-spin text-indigo-600" size={64}/>
                                 <p className="font-black text-indigo-600 animate-pulse">جاري تحليل بيانات الكادر...</p>
                              </div>
                            ) : (
                              <>
                                 <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-4 transition-transform group-hover:scale-110">
                                    <Camera size={36} />
                                 </div>
                                 <p className="font-black text-slate-600 text-lg">التقط صورة أو ارفع الكشف</p>
                                 <p className="text-slate-400 text-xs font-bold mt-1">يدعم استخراج الأسماء، الجنس، والهواتف</p>
                              </>
                            )}
                         </div>
                         <input type="file" ref={aiFileInputRef} className="hidden" accept="image/*" onChange={handleAIFileUpload} />
                      </div>
                   </div>
                 ) : (
                   <div className="space-y-6 animate-in slide-in-from-left-4">
                      <div className="flex justify-between items-center border-b border-slate-100 pb-4 flex-row-reverse">
                         <div className="text-right">
                            <h4 className="text-xl font-black text-slate-800">المراجعة المجهرية للكادر</h4>
                            <p className="text-xs font-bold text-slate-400 mt-1">يرجى التأكد من دقة المسميات الوظيفية والجنس قبل الاعتماد</p>
                         </div>
                         <div className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-xl font-black text-[10px] border border-emerald-100">تم رصد {aiExtractedData.length} موظفاً</div>
                      </div>

                      <div className="bg-white rounded-[2.5rem] overflow-hidden border border-slate-300 shadow-inner">
                         <div className="overflow-x-auto">
                            <table className="w-full text-right table-auto min-w-full">
                               <thead>
                                  <tr className="bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest whitespace-nowrap">
                                     <th className="px-2 py-4 w-8 text-center">#</th>
                                     <th className="px-4 py-4 text-right">اسم الموظف بالكامل</th>
                                     <th className="px-1 py-4 text-center">الجنس</th>
                                     <th className="px-1 py-4 text-center">الوظيفة</th>
                                     <th className="px-1 py-4 text-center">متطوع</th>
                                     <th className="px-4 py-4 text-center">المواد والفصول</th>
                                     <th className="px-4 py-4 text-center">رقم الهاتف</th>
                                     <th className="px-2 py-4 text-center w-12"></th>
                                  </tr>
                               </thead>
                               <tbody className="divide-y divide-slate-100">
                                  {aiExtractedData.map((st, idx) => {
                                    const isFemale = st.gender === 'FEMALE';
                                    return (
                                    <tr key={st.id} className="hover:bg-slate-50 transition-all whitespace-nowrap">
                                       <td className="px-2 py-2 text-center font-black text-slate-300 text-[10px]">{idx + 1}</td>
                                       <td className="px-4 py-2 min-w-[180px]">
                                          <input 
                                            value={st.name} 
                                            onChange={e => {
                                               const next = [...aiExtractedData];
                                               next[idx].name = e.target.value;
                                               setAiExtractedData(next);
                                            }}
                                            className="w-full px-1 py-1.5 bg-transparent font-black text-[12px] text-black outline-none border-b border-transparent focus:border-indigo-400 text-right" 
                                          />
                                       </td>
                                       <td className="px-1 py-2 text-center">
                                          <select 
                                            value={st.gender}
                                            onChange={e => {
                                               const next = [...aiExtractedData];
                                               next[idx].gender = e.target.value as any;
                                               setAiExtractedData(next);
                                            }}
                                            className="bg-transparent font-black text-[11px] text-black text-center outline-none cursor-pointer"
                                          >
                                             <option value="MALE">ذكر</option>
                                             <option value="FEMALE">أنثى</option>
                                          </select>
                                       </td>
                                       <td className="px-1 py-2 text-center">
                                          <select 
                                            value={st.jobTitle}
                                            onChange={e => {
                                               const next = [...aiExtractedData];
                                               next[idx].jobTitle = e.target.value as any;
                                               setAiExtractedData(next);
                                            }}
                                            className="bg-transparent font-black text-[11px] text-black text-center outline-none cursor-pointer"
                                          >
                                             <option value="TEACHER">{isFemale ? 'معلمة' : 'معلم'}</option>
                                             <option value="PRINCIPAL">{isFemale ? 'مديرة' : 'مدير'}</option>
                                             <option value="VICE_PRINCIPAL">{isFemale ? 'وكيلة' : 'وكيل'}</option>
                                             <option value="ADMIN_STAFF">{isFemale ? 'إدارية' : 'إداري'}</option>
                                          </select>
                                       </td>
                                       <td className="px-1 py-2 text-center">
                                          <button 
                                             onClick={() => {
                                               const next = [...aiExtractedData];
                                               next[idx].isVolunteer = !next[idx].isVolunteer;
                                               setAiExtractedData(next);
                                             }}
                                             className={`px-3 py-1 rounded-lg text-[9px] font-black transition-all border-2 ${st.isVolunteer ? 'bg-amber-50 border-amber-400 text-amber-700 shadow-sm' : 'bg-slate-50 border-transparent text-slate-400'}`}
                                          >
                                             {st.isVolunteer ? 'نعم' : 'لا'}
                                          </button>
                                       </td>
                                       <td className="px-4 py-2 text-center">
                                          <button 
                                             onClick={() => setActiveAssignMemberIdx(idx)}
                                             className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-black text-[10px] border border-indigo-100 flex items-center gap-2 mx-auto hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                                          >
                                             <BookOpen size={14}/>
                                             <span>({st.assignments.length}) مواد/فصول</span>
                                          </button>
                                       </td>
                                       <td className="px-4 py-2 text-center">
                                          <input 
                                            value={st.phone || ''} 
                                            placeholder="بلا هاتف"
                                            onChange={e => {
                                               const next = [...aiExtractedData];
                                               next[idx].phone = e.target.value;
                                               setAiExtractedData(next);
                                            }}
                                            className="w-full px-1 py-1.5 bg-transparent font-bold text-[11px] text-black text-center outline-none" 
                                          />
                                       </td>
                                       <td className="px-2 py-2 text-center">
                                          <button onClick={() => {
                                            const next = [...aiExtractedData];
                                            next.splice(idx, 1);
                                            setAiExtractedData(next);
                                          }} className="text-rose-300 hover:text-rose-600 transition-colors"><Trash2 size={16}/></button>
                                       </td>
                                    </tr>
                                    );
                                  })}
                               </tbody>
                            </table>
                         </div>
                      </div>

                      <div className="flex justify-center gap-3 pt-6 flex-row-reverse">
                         <button 
                           onClick={finalizeAIAddition}
                           disabled={isAIProcessing}
                           className="px-14 py-5 bg-emerald-600 text-white rounded-[2rem] font-black text-lg shadow-2xl hover:bg-emerald-700 active:scale-95 transition-all flex items-center gap-3"
                         >
                            {isAIProcessing ? <RefreshCw className="animate-spin" size={24}/> : <SaveIconLucide size={24}/>}
                            <span>اعتماد الطاقم الجديد</span>
                         </button>
                         <button onClick={() => setAiExtractedData(null)} className="px-10 py-5 bg-slate-100 text-slate-500 rounded-[2rem] font-black text-lg">إلغاء</button>
                      </div>
                   </div>
                 )}
              </div>
           </div>
        </div>
      )}

      {activeAssignMemberIdx !== null && aiExtractedData && (
        <div className="fixed inset-0 z-[5000] flex items-center justify-center p-6 bg-slate-950/70 backdrop-blur-md animate-in zoom-in-95">
           <div className="bg-white w-full max-w-xl rounded-[3rem] p-10 shadow-2xl overflow-y-auto max-h-[85vh] scrollbar-hide text-right" dir="rtl">
              <div className="flex justify-between items-center mb-8 flex-row-reverse">
                 <div className="text-right">
                    <h3 className="text-xl font-black text-slate-800 leading-none">إسناد المواد للفترة الانتقالية</h3>
                    <p className="text-xs font-bold text-slate-400 mt-2">تخصيص مواد المعلم: {aiExtractedData[activeAssignMemberIdx].name}</p>
                 </div>
                 <button onClick={() => setActiveAssignMemberIdx(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={24}/></button>
              </div>

              <div className="space-y-6">
                 <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {ALL_SUBJECTS.map(sub => {
                       const member = aiExtractedData[activeAssignMemberIdx];
                       const isAlreadyAdded = member.assignments.some(a => a.subjectName === sub);
                       return (
                          <button 
                             key={sub} 
                             onClick={() => {
                                const next = [...aiExtractedData];
                                if (isAlreadyAdded) {
                                   next[activeAssignMemberIdx].assignments = member.assignments.filter(a => a.subjectName !== sub);
                                } else {
                                   next[activeAssignMemberIdx].assignments.push({ subjectName: sub, classIds: [] });
                                }
                                setAiExtractedData(next);
                             }}
                             className={`flex items-center gap-2.5 p-3 rounded-xl border-2 transition-all flex-row-reverse ${isAlreadyAdded ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-md' : 'bg-white text-slate-500 border-slate-50 hover:border-slate-200'}`}
                          >
                             <div className={`p-1.5 rounded-lg ${SUBJECT_ICONS[sub].bg}`}><Book size={14} className={SUBJECT_ICONS[sub].color} /></div>
                             <span className="text-[10px] font-black">{sub}</span>
                          </button>
                       );
                    })}
                 </div>

                 <div className="space-y-4 pt-6 border-t border-slate-100">
                    {aiExtractedData[activeAssignMemberIdx].assignments.map((asgn, sIdx) => (
                       <div key={sIdx} className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 space-y-4">
                          <div className="flex justify-between items-center flex-row-reverse">
                             <div className="flex items-center gap-3 flex-row-reverse">
                                <div className={`p-2 rounded-xl ${SUBJECT_ICONS[asgn.subjectName].bg}`}><Book size={16} className={SUBJECT_ICONS[asgn.subjectName].color} /></div>
                                <span className="font-black text-sm text-slate-800">{asgn.subjectName}</span>
                             </div>
                             <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">تحديد الفصول</p>
                          </div>
                          <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                             {CLASSES.filter(c => SUBJECT_ICONS[asgn.subjectName].levels.includes(c.level)).map(cls => (
                                <button 
                                   key={cls.id}
                                   onClick={() => {
                                      const next = [...aiExtractedData];
                                      const currentClassIds = next[activeAssignMemberIdx].assignments[sIdx].classIds;
                                      if (currentClassIds.includes(cls.id)) {
                                         next[activeAssignMemberIdx].assignments[sIdx].classIds = currentClassIds.filter(id => id !== cls.id);
                                      } else {
                                         next[activeAssignMemberIdx].assignments[sIdx].classIds.push(cls.id);
                                      }
                                      setAiExtractedData(next);
                                   }}
                                   className={`py-2 px-1 rounded-xl text-[9px] font-black transition-all border-2 ${asgn.classIds.includes(cls.id) ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white border-white text-slate-400 shadow-sm'}`}
                                >
                                   {cls.name.split(' ')[0]}
                                </button>
                             ))}
                          </div>
                       </div>
                    ))}
                 </div>

                 <button onClick={() => setActiveAssignMemberIdx(null)} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-lg shadow-2xl active:scale-95 transition-transform mt-8">حفظ تكليفات المعلم</button>
              </div>
           </div>
        </div>
      )}

      {view === 'PROFILE' && selectedStaff && (<ProfileView selectedStaff={selectedStaff} onBack={() => setView('LIST')} onEdit={() => setShowEditModal(true)} onDelete={() => handleDeleteStaff(selectedStaff.id)} onUpdateSecurity={handleUpdateSecurity} />)}
      
      {showAuthModal && (
        <div className="fixed inset-0 z-[900] flex items-center justify-center p-6 bg-slate-950/70 backdrop-blur-xl animate-in fade-in">
           <div className="bg-white w-full max-w-sm rounded-[3rem] p-10 shadow-2xl animate-in zoom-in-95 text-center"><div className="space-y-4 mb-8"><div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-[2rem] flex items-center justify-center mx-auto shadow-inner"><Lock size={36}/></div><h3 className="text-2xl font-black text-slate-800 tracking-tight">التحقق الإداري</h3><p className="text-xs font-bold text-slate-400 leading-relaxed">أدخل رمز الأمان لإظهار كلمات السر (الرمز الافتراضي 123)</p></div><div className="space-y-4"><input type="password" autoFocus value={adminPassword} onChange={e => setAdminPassword(e.target.value)} className="w-full px-6 py-4 bg-slate-100 rounded-2xl font-black text-center text-xl outline-none focus:ring-4 focus:ring-indigo-100" placeholder="الرمز 123" onKeyDown={e => e.key === 'Enter' && handleVerifyAdmin()} /><div className="flex gap-3 pt-2"><button onClick={handleVerifyAdmin} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-xl shadow-indigo-100 active:scale-95 transition-transform">فتح الكشوف</button><button onClick={() => setShowAuthModal(false)} className="px-6 py-4 bg-slate-100 text-slate-400 rounded-2xl font-black">إلغاء</button></div></div></div>
        </div>
      )}
      
      {showAddModal && <StaffModal staff={staff} onClose={() => setShowAddModal(false)} onSave={async (member) => { 
        try {
          await saveToFirestore("staff", member.id, member);
          setStaff([member, ...staff]); 
          await logActivity(user, `إضافة عضو جديد للكادر`, 'STAFF', `الاسم: ${member.name}`);
          setShowAddModal(false); 
        } catch (e) { alert("فشل الإضافة في السحابة"); }
      }} />}
      {showEditModal && selectedStaff && <StaffModal staff={staff} memberToEdit={selectedStaff} onClose={() => setShowEditModal(false)} onSave={handleUpdateStaff} />}
    </div>
  );
};

const ProfileView: React.FC<{
  selectedStaff: StaffMember;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onUpdateSecurity: (id: string, user: string, pass: string) => void;
}> = ({ selectedStaff, onBack, onEdit, onDelete, onUpdateSecurity }) => {
  const [showPassModal, setShowPassModal] = useState(false);
  const [tempUsername, setTempUsername] = useState(selectedStaff.username || '');
  const [tempPassword, setTempPassword] = useState(selectedStaff.password || '');
  const [isDeleting, setIsDeleting] = useState(false);
  const [countdown, setCountdown] = useState(3);
  useEffect(() => { let timer: any; if (isDeleting && countdown > 0) { timer = setTimeout(() => setCountdown(countdown - 1), 1000); } return () => clearTimeout(timer); }, [isDeleting, countdown]);

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-left-6 duration-500 pb-20 relative z-10 text-right">
      <div className="flex justify-between items-center bg-white p-4 rounded-[1.5rem] shadow-sm border border-slate-100 flex-row-reverse"><button onClick={onBack} className="flex items-center gap-3 text-slate-400 font-black text-sm hover:text-emerald-600 transition-colors flex-row-reverse group"><ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" /> العودة للسجل العام</button><div className="flex gap-2"><button onClick={onEdit} className="p-3 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-emerald-600 shadow-sm transition-all hover:scale-105 group"><Edit2 size={18} className="group-hover:rotate-12 transition-transform" /></button><button onClick={() => setIsDeleting(true)} className="p-3 bg-white border border-slate-200 rounded-xl text-rose-400 hover:text-rose-600 shadow-sm transition-all hover:scale-105"><Trash2 size={18} /></button></div></div>
      {isDeleting && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-2xl animate-in fade-in"><div className="bg-white w-full max-sm rounded-[3rem] p-10 shadow-2xl text-center space-y-6 animate-in zoom-in-95"><div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-[2rem] flex items-center justify-center mx-auto animate-pulse"><AlertCircle size={40} /></div><h3 className="text-2xl font-black text-slate-800">تنبيه حذف نهائي</h3><p className="text-sm font-bold text-slate-400">هل أنت متأكد تماماً من حذف هذا العضو؟ سيتم مسح كافة سجلاته وبيانات دخوله من المدرسة.</p><div className="flex flex-col gap-3 pt-4"><button onClick={() => countdown === 0 && onDelete()} disabled={countdown > 0} className={`w-full py-5 rounded-2xl font-black text-white shadow-xl transition-all ${countdown === 0 ? 'bg-rose-600 shadow-rose-200 scale-105' : 'bg-rose-200 cursor-not-allowed opacity-50'}`}>{countdown === 0 ? 'تأكيد الحذف النهائي' : `انتظر للتأكيد... (${countdown})`}</button><button onClick={() => { setIsDeleting(false); setCountdown(3); }} className="w-full py-4 bg-slate-100 text-slate-400 rounded-2xl font-black hover:bg-slate-200 transition-colors">إلغاء العملية</button></div></div></div>
      )}
      <div className="bg-white rounded-[3.5rem] shadow-2xl border border-slate-100 overflow-hidden"><div className={`h-48 ${selectedStaff.avatarColor} relative overflow-hidden`}><div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_white_1px,_transparent_1px)] bg-[length:20px_20px]"></div><div className="absolute -bottom-16 right-12"><div className={`w-36 h-36 rounded-[2.5rem] border-8 border-white shadow-2xl flex items-center justify-center text-white text-5xl font-black ${selectedStaff.avatarColor}`}>{selectedStaff.name?.[0] || 'M'}</div></div></div><div className="pt-24 pb-12 px-12 text-right"><div className="flex flex-col md:flex-row justify-between items-start gap-8 flex-row-reverse"><div className="text-right"><h2 className="text-4xl font-black text-slate-800 tracking-tight">{selectedStaff.name}</h2><p className="text-xl font-bold text-emerald-600 mt-2 flex items-center gap-2 flex-row-reverse"><div className="w-2 h-2 rounded-full bg-emerald-500"></div>{JOB_TITLE_LABELS[selectedStaff.jobTitle][selectedStaff.gender === Gender.MALE ? 'male' : 'female']}</p></div><div className="flex flex-col items-end gap-3"><span className={`px-6 py-2 rounded-2xl font-black text-xs border ${selectedStaff.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-500 border-rose-100'}`}>{selectedStaff.status === 'ACTIVE' ? 'نشط برمجياً' : 'متوقف حالياً'}</span><p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">تاريخ الانضمام: {selectedStaff.joinDate}</p></div></div><div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12 border-y border-slate-100 py-10 text-right bg-slate-50/30 px-6 rounded-3xl flex-row-reverse"><div className="space-y-2 text-right"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">رقم التواصل المباشر</p><p className="text-2xl font-black text-slate-700 font-mono flex items-center gap-3 flex-row-reverse"><Phone size={20} className="text-indigo-400" />{selectedStaff.phone || 'بلا هاتف'}</p></div><div className="space-y-2 text-right"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">التصنيف الوظيفي</p><p className="text-xl font-black text-slate-700 flex items-center gap-3 flex-row-reverse"><ShieldCheck size={20} className="text-amber-400" />{selectedStaff.isVolunteer ? 'كادر متطوع خارجي' : 'كادر رسمي مسجل'}</p></div></div><div className="mt-12 space-y-8"><div className="flex justify-between items-center border-b-2 border-slate-50 pb-4 flex-row-reverse"><h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 flex-row-reverse"><LayoutGrid size={18} className="text-emerald-500" /> الجدول الدراسي والتكليفات</h3><span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">إجمالي المواد: {selectedStaff.assignments.length}</span></div><div className="grid grid-cols-1 md:grid-cols-2 gap-6">{selectedStaff.assignments.map((asgn, i) => { const subConfig = SUBJECT_ICONS[asgn.subjectName] || SUBJECT_ICONS['قرآن']; const Icon = subConfig.icon; return (<div key={i} className={`rounded-[2.5rem] border border-slate-100 bg-white p-8 transition-all hover:shadow-2xl hover:border-emerald-200 group relative overflow-hidden text-right`}><div className="absolute top-0 right-0 w-2 h-full bg-emerald-500 opacity-20"></div><div className="flex flex-col gap-6"><div className="flex justify-between items-center flex-row-reverse"><div className="flex items-center gap-5 flex-row-reverse"><div className={`w-14 h-14 ${subConfig.bg} rounded-2xl flex items-center justify-center border-2 border-white shadow-xl group-hover:scale-110 transition-transform`}><Icon size={28} className={subConfig.color} /></div><div className="text-right"><h5 className="font-black text-slate-800 text-xl">{asgn.subjectName}</h5><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">مسند لـ {asgn.classIds.length} فصول</p></div></div></div><div className="flex flex-wrap gap-2 justify-end">{asgn.classIds.map(cid => { const cls = CLASSES.find(c => c.id === cid); return (<span key={cid} className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-100 text-[10px] font-black text-slate-500 shadow-sm flex items-center gap-1.5 flex-row-reverse"><div className="w-1.5 h-1.5 rounded-full bg-indigo-400"></div>{cls?.name}</span>); })}{asgn.classIds.length === 0 && <p className="text-xs italic text-slate-300 font-bold">لم يتم اختيار فصول لهذه المادة</p>}</div></div></div>); })}{selectedStaff.assignments.length === 0 && (<div className="col-span-full p-20 text-center bg-slate-50 rounded-[3rem] border-4 border-dashed border-slate-100"><BookOpen size={64} className="mx-auto text-slate-200 mb-6" /><p className="text-xl font-black text-slate-300">لم يتم إسناد أي مواد تعليمية لهذا العضو بعد</p><button onClick={onEdit} className="mt-6 px-10 py-3 bg-white text-emerald-600 rounded-2xl font-black text-xs border border-emerald-100 shadow-sm">إسناد مواد الآن</button></div>)}</div></div><div className="mt-12 p-10 bg-slate-900 rounded-[3.5rem] text-white relative overflow-hidden group shadow-2xl text-right"><div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/20 rounded-full blur-[80px]"></div><div className="flex justify-between items-center mb-8 relative z-10 flex-row-reverse"><h4 className="font-black flex items-center gap-3 text-xl flex-row-reverse"><Lock size={24} className="text-indigo-400" /> حساب الدخول الموحد</h4><button onClick={() => setShowPassModal(true)} className="px-8 py-3 bg-white/10 hover:bg-white/20 rounded-2xl font-black text-xs transition-all flex items-center gap-3 border border-white/5 flex-row-reverse"><Settings size={18} /> تعديل الحماية</button></div><div className="flex flex-col md:flex-row gap-12 relative z-10 flex-row-reverse"><div className="space-y-2 text-right"><p className="text-[11px] text-white/40 font-black uppercase tracking-widest">اسم المستخدم (Username)</p><p className="text-2xl font-black text-indigo-400 font-mono tracking-tight">{selectedStaff.username}</p></div><div className="space-y-2 text-right"><p className="text-[11px] text-white/40 font-black uppercase tracking-widest">كلمة المرور (Password)</p><p className="text-2xl font-black text-indigo-400 font-mono tracking-widest flex items-center gap-2 justify-end"><div className="flex gap-1.5 flex-row-reverse">{Array(8).fill(0).map((_,i) => <div key={i} className="w-1.5 h-1.5 rounded-full bg-indigo-400"></div>)}</div></p></div></div></div></div></div>
      {showPassModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-slate-950/60 backdrop-blur-xl"><div className="bg-white w-full max-w-sm rounded-[3rem] p-10 animate-in zoom-in-95 shadow-2xl"><div className="flex justify-between items-center mb-8 flex-row-reverse"><h3 className="text-2xl font-black text-slate-800">تحديث الحماية</h3><button onClick={() => setShowPassModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={24}/></button></div><div className="space-y-8 text-right"><div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase mr-3">اسم المستخدم الجديد</label><input value={tempUsername} onChange={e => setTempUsername(e.target.value)} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black outline-none focus:ring-4 focus:ring-emerald-50 text-indigo-600 font-mono text-right" /></div><div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase mr-3">كلمة المرور الجديدة</label><input value={tempPassword} onChange={e => setTempPassword(e.target.value)} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black outline-none focus:ring-4 focus:ring-emerald-50 text-indigo-600 font-mono text-right" /></div><button onClick={() => { onUpdateSecurity(selectedStaff.id, tempUsername, tempPassword); setShowPassModal(false); }} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black shadow-2xl shadow-indigo-100 active:scale-95 transition-transform">اعتماد التحديثات الأمنية</button></div></div></div>
      )}
    </div>
  );
};

const StaffModal: React.FC<{
  staff: StaffMember[];
  memberToEdit?: StaffMember;
  onClose: () => void;
  onSave: (member: StaffMember) => void;
}> = ({ staff, memberToEdit, onClose, onSave }) => {
  const [formData, setFormData] = useState<Partial<StaffMember>>(memberToEdit || {
    id: Date.now().toString(),
    name: '',
    gender: Gender.MALE,
    phone: '',
    jobTitle: 'TEACHER',
    isTeaching: true,
    assignments: [],
    isVolunteer: false,
    joinDate: new Date().toISOString().split('T')[0].replace(/-/g, '/'),
    avatarColor: 'bg-emerald-600',
    status: 'ACTIVE',
    username: '',
    password: '',
    canManualOverrideTotal: false
  });

  const [currentStep, setCurrentStep] = useState(1);
  const [expandedAsgn, setExpandedAsgn] = useState<string | null>(null);
  const [showSubjectPicker, setShowSubjectPicker] = useState(false);
  const [showJobPicker, setShowJobPicker] = useState(false);

  const isFemale = formData.gender === Gender.FEMALE;
  const themeClasses = { bg: isFemale ? 'bg-rose-600' : 'bg-emerald-600', text: isFemale ? 'text-rose-600' : 'text-emerald-600', ring: isFemale ? 'ring-rose-50' : 'ring-emerald-50' };
  const currentPrincipal = staff.find(s => s.jobTitle === 'PRINCIPAL' && s.id !== formData.id);

  useEffect(() => { if (formData.name && !formData.username && !memberToEdit) { const user = generateEnglishUsername(formData.name); const pass = generateRandomString(10, 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789!@#'); setFormData(prev => ({ ...prev, username: user, password: pass })); } }, [formData.name, memberToEdit]);
  const isValidStep1 = formData.name && formData.jobTitle;

  const addNewSubject = (sub: string) => { if (formData.assignments?.some(a => a.subjectName === sub)) return; setFormData(prev => ({ ...prev, assignments: [...(prev.assignments || []), { subjectName: sub, classIds: [] }] })); setExpandedAsgn(sub); setShowSubjectPicker(false); };
  const toggleClass = (classId: string, subjectName: string) => { setFormData(prev => { const assignments = [...(prev.assignments || [])]; const asgnIndex = assignments.findIndex(a => a.subjectName === subjectName); if (asgnIndex > -1) { const classIds = assignments[asgnIndex].classIds.includes(classId) ? assignments[asgnIndex].classIds.filter(id => id !== classId) : [...assignments[asgnIndex].classIds, classId]; assignments[asgnIndex] = { ...assignments[asgnIndex], classIds }; } return { ...prev, assignments }; }); };
  const pronoun = isFemale ? 'ها' : 'ه';
  const address = isFemale ? 'المعلمة' : 'المعلم';

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 md:p-10 bg-emerald-950/60 backdrop-blur-xl animate-in fade-in">
       <div className="bg-white w-full max-w-2xl rounded-[3.5rem] shadow-[0_35px_60px_-15px_rgba(0,0,0,0.5)] overflow-hidden border border-slate-100 flex flex-col max-h-full animate-in zoom-in-95">
          <div className={`p-8 ${themeClasses.bg} text-white flex justify-between items-center shrink-0 transition-all duration-500 flex-row-reverse`}>
             <div className="flex items-center gap-4 flex-row-reverse"><div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">{memberToEdit ? <Edit2 /> : <UserPlus />}</div><div className="text-right"><h3 className="text-xl font-black">{memberToEdit ? `تعديل بيانات ${address}` : `إضافة ${address} جديد${isFemale ? 'ة' : ''}`}</h3><p className="text-white/40 text-[9px] font-black uppercase tracking-widest mt-0.5">Academic Staff System Hub</p></div></div>
             <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={24}/></button>
          </div>
          <div className="p-10 overflow-y-auto space-y-8 text-right scrollbar-hide">
             <div className="flex items-center justify-center gap-12 mb-4 flex-row-reverse">
                {[1, 2, 3].map(s => (
                  <div key={s} className="flex flex-col items-center gap-2">
                     <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs transition-all ${currentStep >= s ? `${themeClasses.bg} text-white shadow-lg` : 'bg-slate-100 text-slate-300'}`}>{s}</div>
                     <span className={`text-[9px] font-black uppercase tracking-widest ${currentStep >= s ? themeClasses.text : 'text-slate-300'}`}>{s === 1 ? 'البيانات' : s === 2 ? 'التكليف' : 'الحماية'}</span>
                  </div>
                ))}
             </div>
             {currentStep === 1 && (
               <div className="space-y-6 animate-in fade-in text-right">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div className="space-y-1 text-right"><label className="text-[10px] font-black text-slate-400 uppercase mr-2">اسم {address} كاملاً</label><input autoFocus value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className={`w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl font-black text-sm outline-none focus:ring-4 ${themeClasses.ring} text-right`} placeholder="الاسم الرباعي" /></div>
                     <div className="space-y-1 text-right"><label className="text-[10px] font-black text-slate-400 uppercase mr-2">نوع {address}</label><div className="flex bg-slate-100 p-1.5 rounded-2xl flex-row-reverse"><button type="button" onClick={() => setFormData({...formData, gender: Gender.MALE, avatarColor: 'bg-emerald-600'})} className={`flex-1 py-2 rounded-xl font-black text-xs transition-all ${formData.gender === Gender.MALE ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-400'}`}>معلم</button><button type="button" onClick={() => setFormData({...formData, gender: Gender.FEMALE, avatarColor: 'bg-rose-600'})} className={`flex-1 py-2 rounded-xl font-black text-xs transition-all ${formData.gender === Gender.FEMALE ? 'bg-white text-rose-700 shadow-sm' : 'text-slate-400'}`}>معلمة</button></div></div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div className="space-y-1 relative text-right">
                        <label className="text-[10px] font-black text-slate-400 uppercase mr-2">المسمى الوظيفي</label>
                        <button type="button" onClick={() => setShowJobPicker(!showJobPicker)} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl font-black text-sm text-right flex justify-between items-center flex-row-reverse"><span>{JOB_TITLE_LABELS[formData.jobTitle as JobTitle][isFemale ? 'female' : 'male']}</span><ChevronDown size={18} className="text-slate-300" /></button>
                        {showJobPicker && (
                           <div className="absolute z-[1100] top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95">
                              {[{ id: 'TEACHER', label: isFemale ? 'معلمة' : 'معلم' },{ id: 'PRINCIPAL', label: isFemale ? 'مديرة المدرسة' : 'مدير المدرسة', isRestricted: !!currentPrincipal },{ id: 'VICE_PRINCIPAL', label: isFemale ? 'وكيلة المدرسة' : 'وكيل المدرسة' },{ id: 'ADMIN_STAFF', label: isFemale ? 'إدارية' : 'إداري' }].map(job => (
                                 <button key={job.id} type="button" disabled={job.isRestricted} onClick={() => { setFormData({...formData, jobTitle: job.id as JobTitle}); setShowJobPicker(false); }} className={`w-full p-4 text-right font-black text-xs transition-all flex justify-between items-center flex-row-reverse ${job.isRestricted ? 'opacity-30 grayscale cursor-not-allowed bg-slate-50' : 'hover:bg-slate-50'}`}><span>{job.label}</span>{job.isRestricted && <span className="text-[8px] bg-rose-50 text-rose-500 px-2 py-0.5 rounded-full">المدير الحالي: {currentPrincipal?.name}</span>}</button>
                              ))}
                           </div>
                        )}
                     </div>
                     <div className="space-y-1 text-right"><label className="text-[10px] font-black text-slate-400 uppercase mr-2">رقم الهاتف</label><input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl font-black text-sm font-mono text-right" placeholder="77x xxx xxx" /></div>
                  </div>
                  
                  <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-4">
                    <h4 className="text-[11px] font-black text-indigo-600 uppercase tracking-widest border-b border-indigo-100 pb-2 mb-2">إعدادات الرصد المتقدم</h4>
                    <div className="flex items-center justify-between flex-row-reverse">
                       <div className="text-right">
                          <p className="text-xs font-black text-slate-700">تفعيل الرصد اليدوي للمجموع</p>
                          <p className="text-[9px] text-slate-400 font-bold mt-0.5">السماح بتجاوز الحساب الآلي وكتابة المجموع النهائي مباشرة</p>
                       </div>
                       <button 
                         type="button"
                         onClick={() => setFormData({...formData, canManualOverrideTotal: !formData.canManualOverrideTotal})}
                         className={`w-14 h-8 rounded-full relative transition-all ${formData.canManualOverrideTotal ? 'bg-indigo-600' : 'bg-slate-300'}`}
                       >
                          <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all shadow-md ${formData.canManualOverrideTotal ? 'right-7' : 'right-1'}`}></div>
                       </button>
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-50 flex items-center gap-6 flex-row-reverse">
                    <div onClick={() => setFormData({...formData, isVolunteer: !formData.isVolunteer})} className={`inline-flex items-center gap-3 px-6 py-3 rounded-2xl cursor-pointer transition-all border-2 flex-row-reverse ${formData.isVolunteer ? 'bg-amber-50 border-amber-200 shadow-sm' : 'bg-white border-slate-100'}`}><div className={`w-8 h-4 rounded-full relative transition-all ${formData.isVolunteer ? 'bg-amber-500' : 'bg-slate-200'}`}><div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${formData.isVolunteer ? 'left-4' : 'left-0.5'}`}></div></div><span className={`text-[10px] font-black uppercase ${formData.isVolunteer ? 'text-amber-700' : 'text-slate-400'}`}>كادر متطوع</span></div>
                    <div onClick={() => setFormData({...formData, status: formData.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'})} className={`inline-flex items-center gap-3 px-6 py-3 rounded-2xl cursor-pointer transition-all border-2 flex-row-reverse ${formData.status === 'ACTIVE' ? 'bg-emerald-50 border-emerald-200 shadow-sm' : 'bg-rose-50 border-rose-200 shadow-sm'}`}><span className={`text-[10px] font-black uppercase ${formData.status === 'ACTIVE' ? 'text-emerald-700' : 'text-rose-700'}`}>{formData.status === 'ACTIVE' ? 'نشط' : 'متوقف'}</span></div>
                  </div>
               </div>
             )}
             {currentStep === 2 && (
               <div className="space-y-6 animate-in fade-in text-right">
                  <div className="flex justify-between items-center mb-2 px-2 flex-row-reverse"><h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">إسناد وتوزيع المواد</h4><button type="button" onClick={() => setShowSubjectPicker(true)} className={`flex items-center gap-2 px-4 py-2 ${themeClasses.bg} text-white rounded-xl font-black text-[10px] shadow-lg transition-transform hover:scale-105 active:scale-95 flex-row-reverse`}><Plus size={14} /> إسناد مادة</button></div>
                  {showSubjectPicker && (
                    <div className="p-6 bg-slate-50 rounded-[2.5rem] border border-slate-100 grid grid-cols-2 sm:grid-cols-3 gap-2 animate-in zoom-in-95 shadow-inner flex-row-reverse">
                       {ALL_SUBJECTS.map(sub => (
                          <button key={sub} type="button" disabled={formData.assignments?.some(a => a.subjectName === sub)} onClick={() => addNewSubject(sub)} className={`flex items-center gap-3 p-3 rounded-xl border transition-all flex-row-reverse ${formData.assignments?.some(a => a.subjectName === sub) ? 'opacity-30 grayscale cursor-not-allowed bg-slate-200' : 'bg-white hover:border-emerald-200 hover:shadow-md'}`}><div className={`p-2 rounded-lg ${SUBJECT_ICONS[sub].bg}`}><Book size={14} className={SUBJECT_ICONS[sub].color} /></div><span className="text-[10px] font-black text-slate-700">{sub}</span></button>
                       ))}
                    </div>
                  )}
                  <div className="space-y-4">
                     {formData.assignments?.map((asgn, i) => {
                        const subConfig = SUBJECT_ICONS[asgn.subjectName];
                        const isExpanded = expandedAsgn === asgn.subjectName;
                        return (
                          <div key={i} className={`rounded-[2rem] border transition-all overflow-hidden ${isExpanded ? 'border-indigo-200 bg-white shadow-xl' : 'border-slate-100 bg-slate-50/50'}`}>
                             <div className="p-5 flex justify-between items-center group flex-row-reverse">
                                <div className="flex items-center gap-4 flex-row-reverse">
                                   <div className={`w-10 h-10 ${subConfig.bg} rounded-xl flex items-center justify-center border border-white group-hover:scale-110 transition-transform`}><Book size={20} className={subConfig.color} /></div>
                                   <div className="text-right"><h5 className="font-black text-slate-800 text-sm">{asgn.subjectName}</h5><p className="text-[9px] font-bold text-slate-400">{asgn.classIds.length} فصول نشطة</p></div>
                                </div>
                                <div className="flex items-center gap-3">
                                   <button type="button" onClick={() => setExpandedAsgn(isExpanded ? null : asgn.subjectName)} className={`p-2 rounded-lg transition-colors ${isExpanded ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-300'}`}>
                                      {isExpanded ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
                                   </button>
                                </div>
                             </div>
                             {isExpanded && (
                               <div className="px-5 pb-6 animate-in slide-in-from-top-2 space-y-4 bg-slate-50/20 pt-2 border-t border-slate-100 text-right">
                                  {(['PRIMARY', 'MIDDLE', 'SECONDARY'] as const).map(lvl => {
                                     const lvlClasses = CLASSES.filter(c => c.level === lvl && subConfig.levels.includes(c.level));
                                     if (lvlClasses.length === 0) return null;
                                     return (
                                       <div key={lvl} className="space-y-2 text-right">
                                          <p className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md w-fit bg-slate-200 text-slate-700 mr-auto`}>{lvl}</p>
                                          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 flex-row-reverse">{lvlClasses.map(cls => (
                                                <button key={cls.id} type="button" onClick={() => toggleClass(cls.id, asgn.subjectName)} className={`px-3 py-2.5 rounded-xl font-black text-[9px] transition-all border ${asgn.classIds.includes(cls.id) ? `${themeClasses.bg} text-white border-white shadow-md` : 'bg-white text-slate-400 border-slate-100 hover:border-slate-200'}`}>{cls.name}</button>
                                             ))}</div>
                                       </div>
                                     );
                                  })}
                               </div>
                             )}
                          </div>
                        );
                     })}
                  </div>
               </div>
             )}
             {currentStep === 3 && (
                <div className="space-y-8 animate-in fade-in text-right">
                   <div className="p-8 bg-slate-900 rounded-[3rem] text-white"><div className="flex items-center gap-4 mb-8 flex-row-reverse"><div className="p-3 bg-white/10 rounded-2xl"><ShieldCheck size={28} className={isFemale ? 'text-rose-400' : 'text-emerald-400'} /></div><h4 className="font-black text-lg text-right">بوابة دخول {address}</h4></div><div className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-row-reverse"><div className="space-y-2 text-right"><label className="text-[10px] font-black text-white/30 uppercase mr-3">اسم المستخدم</label><input value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className={`w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl font-black font-mono outline-none focus:bg-white/10 transition-all text-right ${isFemale ? 'text-rose-400' : 'text-emerald-400'}`} /></div><div className="space-y-2 text-right"><label className="text-[10px] font-black text-white/30 uppercase mr-3">كلمة المرور</label><input value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className={`w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl font-black font-mono outline-none focus:bg-white/10 transition-all text-right ${isFemale ? 'text-rose-400' : 'text-emerald-400'}`} /></div></div><div className="mt-8 pt-8 border-t border-white/5 flex items-center justify-between flex-row-reverse"><p className="text-[9px] text-white/30 font-bold max-w-xs leading-relaxed text-right">بيانات الدخول تمكن {address} من الوصول لمهام{pronoun} عبر النظام.</p><button type="button" onClick={() => setFormData({...formData, password: generateRandomString(12, 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789!@#')})} className={`flex items-center gap-2 text-[10px] font-black transition-colors flex-row-reverse ${isFemale ? 'text-rose-400 hover:text-rose-300' : 'text-emerald-400 hover:text-emerald-300'}`}><RefreshCw size={14} /> توليد كلمة مرور جديدة</button></div></div>
                </div>
             )}
          </div>
          <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-between shrink-0 flex-row-reverse">
             {currentStep > 1 ? (<button type="button" onClick={() => setCurrentStep(prev => prev - 1)} className="px-8 py-4 text-slate-400 font-black hover:text-slate-600 flex items-center gap-2 active:scale-95 transition-transform flex-row-reverse group"><ArrowRight size={20} className="group-hover:translate-x-1 transition-transform rotate-180" /> السابق</button>) : (<div />)}
             {currentStep < 3 ? (<button type="button" disabled={!isValidStep1} onClick={() => setCurrentStep(prev => prev + 1)} className={`px-10 py-4 rounded-2xl font-black flex items-center gap-2 transition-all shadow-xl flex-row-reverse ${isValidStep1 ? `${themeClasses.bg} text-white shadow-emerald-100 hover:scale-105 active:scale-95` : 'bg-slate-200 text-slate-400 cursor-not-allowed grayscale'}`}>التالي <ChevronLeft size={20} /></button>) : (<button onClick={() => onSave(formData as StaffMember)} className={`px-12 py-4 ${themeClasses.bg} text-white rounded-2xl font-black shadow-xl hover:scale-105 transition-all flex items-center gap-2 active:scale-95 flex-row-reverse`}>حفظ واعتماد البيانات <CheckCircle2 size={20} /></button>)}
          </div>
       </div>
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
