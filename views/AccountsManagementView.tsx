
import React, { useState } from 'react';
import { Users, UserCheck, ShieldCheck, Key, Eye, EyeOff, Search, ArrowRight, Lock, Unlock, Hash, FileSpreadsheet, Printer, Edit2, X, CheckCircle2, ChevronDown, Check } from 'lucide-react';
import { StaffMember, Student, UserRole } from '../types';
import { CLASSES } from '../constants';
import { saveToFirestore } from '../services/firebaseService';

interface AccountsManagementViewProps {
  staff: StaffMember[];
  students: Student[];
}

export const AccountsManagementView: React.FC<AccountsManagementViewProps> = ({ staff, students }) => {
  const [activeTab, setActiveTab] = useState<UserRole>(UserRole.TEACHER);
  const [searchTerm, setSearchTerm] = useState('');
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [revealAll, setRevealAll] = useState(false);
  
  // States for editing credentials
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemType, setEditingItemType] = useState<'TEACHER' | 'SCOUT' | null>(null);
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [assignedClasses, setAssignedClasses] = useState<string[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);

  const togglePassword = (id: string) => {
    setVisiblePasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleRevealAll = () => {
    setRevealAll(!revealAll);
    setVisiblePasswords({}); 
  };

  const handleOpenEdit = (item: any) => {
    setEditingItemId(item.id);
    setEditingItemType(item.type);
    setEditUsername(item.username || '');
    setEditPassword(item.password || '');
    setAssignedClasses(item.assignedClasses || []);
  };

  const handleSaveSecurity = async () => {
    if (!editingItemId || !editUsername.trim() || !editPassword.trim()) return;
    setIsUpdating(true);
    try {
      if (editingItemType === 'TEACHER') {
        const member = staff.find(s => s.id === editingItemId);
        if (member) {
          const updatedMember = { ...member, username: editUsername, password: editPassword };
          await saveToFirestore("staff", editingItemId, updatedMember);
        }
      } else if (editingItemType === 'SCOUT') {
        const student = students.find(s => s.id === editingItemId);
        if (student) {
          const updatedStudent = { 
            ...student, 
            studentCode: editUsername, 
            scoutPin: editPassword,
            assignedClasses: assignedClasses 
          };
          await saveToFirestore("students", editingItemId, updatedStudent);
        }
      }
      alert("تم تحديث بيانات الحماية والصلاحيات بنجاح");
      setEditingItemId(null);
    } catch (e) {
      console.error(e);
      alert("فشل تحديث البيانات، يرجى المحاولة لاحقاً");
    } finally {
      setIsUpdating(false);
    }
  };

  const toggleClassAssignment = (cid: string) => {
    setAssignedClasses(prev => prev.includes(cid) ? prev.filter(id => id !== cid) : [...prev, cid]);
  };

  const filteredData = () => {
    let data: any[] = [];
    if (activeTab === UserRole.TEACHER) {
      data = staff.map(s => ({
        id: s.id, name: `أ/ ${s.name}`, username: s.username, password: s.password, type: 'TEACHER', phone: s.phone
      }));
    } else if (activeTab === UserRole.PARENT) {
      const uniqueParents = Array.from(new Set(students.map(s => s.parentPhone)));
      data = uniqueParents.map(phone => {
        const student = students.find(s => s.parentPhone === phone);
        return { 
          id: phone, 
          fullName: student?.fullName, 
          username: phone, 
          password: student?.studentCode, 
          type: 'PARENT', 
          phone: phone 
        };
      });
    } else if (activeTab === UserRole.SCOUT) {
      data = students.filter(s => s.isScout).map(s => ({
        id: s.id, 
        name: s.fullName, 
        username: s.studentCode, 
        password: s.scoutPin, 
        type: 'SCOUT', 
        phone: s.parentPhone,
        assignedClasses: s.assignedClasses || []
      }));
    }
    return data.filter(item => (item.name || item.fullName || '').includes(searchTerm) || item.username?.includes(searchTerm));
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Edit Modal */}
      {editingItemId && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-slate-950/70 backdrop-blur-xl">
           <div className="bg-white w-full max-w-md rounded-[3rem] p-10 animate-in zoom-in-95 shadow-2xl text-right overflow-y-auto max-h-[90vh] scrollbar-hide">
              <div className="flex justify-between items-center mb-8 flex-row-reverse">
                <h3 className="text-2xl font-black text-slate-800">إدارة الحساب والصلاحيات</h3>
                <button onClick={() => setEditingItemId(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={24}/></button>
              </div>
              <div className="space-y-8">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase mr-3">اسم المستخدم الجديد</label>
                    <input value={editUsername} onChange={e => setEditUsername(e.target.value)} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black outline-none focus:ring-4 focus:ring-emerald-50 text-indigo-600 font-mono text-right" />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase mr-3">كلمة المرور الجديدة</label>
                    <input value={editPassword} onChange={e => setEditPassword(e.target.value)} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black outline-none focus:ring-4 focus:ring-emerald-50 text-indigo-600 font-mono text-right" />
                 </div>

                 {editingItemType === 'SCOUT' && (
                   <div className="space-y-4 border-t border-slate-100 pt-6">
                      <label className="text-[10px] font-black text-slate-400 uppercase mr-3 flex items-center gap-2 justify-end">إسناد فصول إضافية للرصد <ShieldCheck size={14} className="text-emerald-500"/></label>
                      <div className="grid grid-cols-2 gap-2">
                         {CLASSES.map(cls => (
                           <button 
                             key={cls.id} 
                             onClick={() => toggleClassAssignment(cls.id)}
                             className={`p-3 rounded-xl border-2 font-black text-[10px] transition-all text-right flex items-center justify-between flex-row-reverse ${assignedClasses.includes(cls.id) ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-50 hover:bg-slate-50'}`}
                           >
                              <span>{cls.name}</span>
                              {assignedClasses.includes(cls.id) && <Check size={14} />}
                           </button>
                         ))}
                      </div>
                      <p className="text-[9px] text-slate-400 font-bold leading-relaxed">بشكل افتراضي، الكشاف لديه صلاحية على فصله. الفصول المختارة هنا هي صلاحيات "إضافية".</p>
                   </div>
                 )}

                 <button 
                  onClick={handleSaveSecurity}
                  disabled={isUpdating}
                  className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black shadow-2xl shadow-indigo-100 active:scale-95 transition-transform flex items-center justify-center gap-2"
                 >
                   {isUpdating ? 'جاري الحفظ...' : 'اعتماد التحديثات الأمنية'}
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Header Section */}
      <div className="bg-white p-10 rounded-[3.5rem] shadow-xl border border-slate-100 flex flex-col lg:flex-row justify-between items-center gap-8 text-right">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 bg-indigo-600 text-white rounded-3xl flex items-center justify-center shadow-2xl shadow-indigo-100 font-black">
            <Key size={40} />
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-800 tracking-tight">إدارة الحسابات والأمان</h2>
            <p className="text-slate-400 font-bold mt-1 uppercase tracking-widest text-[10px]">Cyber Security & Access Control Hub</p>
          </div>
        </div>
        
        <div className="flex gap-4">
          <button 
            onClick={toggleRevealAll}
            className={`px-8 py-4 rounded-2xl font-black text-sm flex items-center gap-3 transition-all shadow-xl active:scale-95 ${
              revealAll ? 'bg-rose-600 text-white shadow-rose-100' : 'bg-emerald-600 text-white shadow-emerald-100'
            }`}
          >
            {revealAll ? <Lock size={20}/> : <Unlock size={20}/>}
            <span>{revealAll ? 'حجب كافة الرموز' : 'كشف كافة الرموز'}</span>
          </button>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex bg-slate-100 p-1.5 rounded-[2rem] w-full md:w-fit shrink-0">
          {[
            { id: UserRole.TEACHER, label: 'المعلمون', icon: Users },
            { id: UserRole.PARENT, label: 'أولياء الأمور', icon: UserCheck },
            { id: UserRole.SCOUT, label: 'الكشافة', icon: ShieldCheck },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setSearchTerm(''); }}
              className={`px-8 py-4 rounded-[1.5rem] font-black text-xs transition-all flex items-center gap-3 whitespace-nowrap ${
                activeTab === tab.id ? 'bg-white text-indigo-600 shadow-xl scale-105' : 'text-slate-400 hover:bg-white/50'
              }`}
            >
              <tab.icon size={16} /> {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 bg-white p-2 rounded-[2rem] shadow-md border border-slate-100 relative flex items-center">
          <Search className="absolute right-6 text-slate-300" size={20} />
          <input 
            type="text" 
            placeholder="ابحث بالاسم، اسم المستخدم، أو الكود..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pr-14 pl-6 py-3 bg-transparent border-none rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-100 transition-all text-right"
          />
        </div>
      </div>

      {/* Modern Table Design */}
      <div className="bg-white rounded-[3.5rem] shadow-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-emerald-950 text-white text-[10px] font-black uppercase tracking-[0.2em]">
                <th className="px-8 py-7 text-center w-24 border-none"><div className="flex items-center justify-center gap-2"><Hash size={14}/> <span>S.N</span></div></th>
                <th className="px-8 py-7 border-none">الاسم المستعار / الجهة</th>
                <th className="px-8 py-7 border-none">اسم المستخدم</th>
                <th className="px-8 py-7 border-none">كلمة المرور / الرمز</th>
                <th className="px-8 py-7 text-center w-40 border-none">التحكم</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredData().map((item, idx) => {
                const isVisible = revealAll || visiblePasswords[item.id];
                return (
                  <tr key={item.id} className="hover:bg-indigo-50/30 transition-all group">
                    <td className="px-8 py-6 text-center">
                       <span className="text-xs font-black text-slate-300 group-hover:text-indigo-600 transition-colors">
                          {String(idx + 1).padStart(2, '0')}
                       </span>
                    </td>
                    <td className="px-8 py-6">
                       <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs text-white shadow-lg ${item.type === 'TEACHER' ? 'bg-indigo-500' : item.type === 'PARENT' ? 'bg-emerald-500' : 'bg-amber-500'}`}>
                             {(item.name || item.fullName)?.[0]}
                          </div>
                          <div>
                             <p className="font-black text-slate-800 text-sm leading-none">{item.name || item.fullName}</p>
                             <p className="text-[9px] text-slate-400 font-bold mt-1.5 uppercase tracking-widest">{item.phone || 'بلا هاتف'}</p>
                          </div>
                       </div>
                    </td>
                    <td className="px-8 py-6">
                       <span className="font-mono font-black text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 text-xs">
                          {item.username}
                       </span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <span className={`font-mono font-black tracking-widest text-sm ${isVisible ? 'text-emerald-700' : 'text-slate-300'}`}>
                           {isVisible ? item.password : '••••••••'}
                        </span>
                        {!revealAll && (
                          <button onClick={() => togglePassword(item.id)} className="p-2 bg-slate-50 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all">
                            {isVisible ? <EyeOff size={16}/> : <Eye size={16}/>}
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-6 text-center">
                       {item.type === 'TEACHER' || item.type === 'SCOUT' ? (
                         <button onClick={() => handleOpenEdit(item)} className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-black text-[10px] hover:bg-indigo-600 hover:text-white transition-all flex items-center gap-2 mx-auto">
                            <Edit2 size={12}/> تعديل الحساب
                         </button>
                       ) : (
                         <span className="inline-flex items-center gap-1.5 text-[9px] font-black text-emerald-600 bg-emerald-50 px-4 py-2 rounded-full border border-emerald-100">
                            <ShieldCheck size={12}/> آمن
                         </span>
                       )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
