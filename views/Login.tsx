
import React, { useState } from 'react';
import { SCHOOL_NAME, INITIAL_ADMINS, CLASSES } from '../constants';
import { User, UserRole, StaffMember, Student, Gender } from '../types';
import { ShieldCheck, User as UserIcon, Lock, Search, GraduationCap, AlertCircle, RefreshCw, Users } from 'lucide-react';
import { fetchCollection } from '../services/firebaseService';

interface LoginProps {
  onLogin: (user: User) => void;
  staff: StaffMember[];
}

export const Login: React.FC<LoginProps> = ({ onLogin, staff }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleUnifiedLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // 1. تحقق من الإدارة
      const foundAdmin = INITIAL_ADMINS.find(u => u.username === username && password === 'admin123');
      if (foundAdmin) {
        onLogin(foundAdmin);
        return;
      }

      // 2. تحقق من الكادر التعليمي
      const foundStaff = staff.find(s => s.username === username && s.password === password);
      if (foundStaff) {
        onLogin({
          id: foundStaff.id,
          name: `أ/ ${foundStaff.name}`,
          username: foundStaff.username!,
          role: foundStaff.jobTitle === 'PRINCIPAL' ? UserRole.ADMIN : UserRole.TEACHER,
          employeeId: foundStaff.id
        });
        return;
      }

      // 3. جلب الطلاب للتحقق من الكشافة وأولياء الأمور
      const students = await fetchCollection("students") as Student[];
      
      // أ- التحقق أولاً من دخول الكشافة (باستخدام كود الطالب ورمز الكشافة)
      const scoutStudent = students.find(s => s.isScout && s.studentCode === username && s.scoutPin === password);
      if (scoutStudent) {
        const className = CLASSES.find(c => c.id === scoutStudent.classId)?.name || 'غير محدد';
        onLogin({
          id: scoutStudent.id,
          name: `${scoutStudent.fullName} (فصل ${className})`,
          username: scoutStudent.studentCode,
          role: UserRole.SCOUT,
          employeeId: scoutStudent.id 
        });
        return;
      }

      // ب- التحقق من دخول ولي الأمر (باستخدام رقم الهاتف وكود الطالب)
      const parentMatch = students.find(s => s.parentPhone === username && s.studentCode === password);
      if (parentMatch) {
        onLogin({
          id: `parent-${parentMatch.parentPhone}-${parentMatch.id}`,
          name: `ولي أمر الطالب: ${parentMatch.fullName || parentMatch.name}`,
          username: username,
          role: UserRole.PARENT,
          parentPhone: username
        });
        return;
      }

      setError('بيانات الدخول غير صحيحة. يرجى التأكد من الحساب وكلمة المرور.');
    } catch (err) {
      setError('حدث خطأ أثناء الاتصال بالخادم.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-emerald-950 flex items-center justify-center p-4 font-sans selection:bg-emerald-500 selection:text-white" dir="rtl">
      <div className="fixed inset-0 opacity-10 pointer-events-none">
        <div className="absolute top-10 right-10 w-96 h-96 bg-emerald-500 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-10 left-10 w-96 h-96 bg-teal-500 rounded-full blur-[100px]"></div>
      </div>

      <div className="max-w-md w-full relative z-10">
        <div className="text-center mb-8">
          <div className="w-24 h-24 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-[2rem] mx-auto mb-6 flex items-center justify-center shadow-2xl text-white transform hover:rotate-6 transition-transform border-4 border-white/10">
            <GraduationCap size={56} />
          </div>
          <h1 className="text-3xl font-black text-white mb-2">{SCHOOL_NAME}</h1>
          <p className="text-emerald-300/80 font-medium tracking-tight text-center">نظام الإدارة الموحد - مدرسة صلاح الدين</p>
        </div>

        <div className="bg-white/95 backdrop-blur-xl rounded-[3rem] shadow-2xl p-10 border border-white/20">
          <form onSubmit={handleUnifiedLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-500 px-1 uppercase tracking-widest text-right block">اسم المستخدم</label>
              <div className="relative group">
                <UserIcon className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-600 transition-colors" size={20} />
                <input 
                  type="text" 
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full pr-12 pl-4 py-4 bg-slate-50 rounded-2xl border border-slate-100 outline-none focus:ring-4 focus:ring-emerald-100 transition-all font-black text-slate-700 text-right" 
                  placeholder="أدخل اسم المستخدم"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-500 px-1 uppercase tracking-widest text-right block">كلمة المرور</label>
              <div className="relative group">
                <Lock className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-600 transition-colors" size={20} />
                <input 
                  type="password" 
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pr-12 pl-4 py-4 bg-slate-50 rounded-2xl border border-slate-100 outline-none focus:ring-4 focus:ring-emerald-100 transition-all font-black text-slate-700 text-right" 
                  placeholder="أدخل كلمة المرور"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="animate-shake flex items-center gap-2 justify-center bg-rose-50 text-rose-600 py-4 rounded-2xl font-black text-xs">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <button 
              type="submit"
              disabled={isLoading}
              className="w-full py-5 bg-emerald-700 text-white rounded-2xl font-black text-lg shadow-xl shadow-emerald-900/20 hover:shadow-emerald-900/30 hover:-translate-y-1 active:translate-y-0 transition-all flex items-center justify-center space-x-2 space-x-reverse group disabled:opacity-50"
            >
              {isLoading ? <RefreshCw className="animate-spin" /> : <ShieldCheck className="group-hover:scale-110 transition-transform" />}
              <span>{isLoading ? 'جاري التحقق...' : 'دخول النظام'}</span>
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
             <p className="text-[10px] text-slate-300 font-bold mb-4 tracking-widest">بوابة الوصول الموحدة للمؤسسة</p>
          </div>
        </div>
      </div>
    </div>
  );
};
