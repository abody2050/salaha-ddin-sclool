
import React, { useState } from 'react';
import { 
  Settings, Globe, Shield, Zap, Lock, Palette, 
  Save, RefreshCw, Database, Bell, Eye, EyeOff, 
  LayoutGrid, Trash2, ShieldCheck, Cpu, Cloud, 
  Smartphone, CreditCard, UserCheck, CheckCircle2,
  Camera, BookOpen, AlertCircle, MessageSquare, 
  UserPlus, FileText, Activity, Terminal,
  GraduationCap, PenSquare, Award, Calendar,
  Clock, Coffee, ShieldAlert, ChevronLeft
} from 'lucide-react';
import { SystemConfig } from '../types';

interface SettingsViewProps {
  config: SystemConfig;
  setConfig: React.Dispatch<React.SetStateAction<SystemConfig>>;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ config, setConfig }) => {
  const [activeTab, setActiveTab] = useState<'IDENTITY' | 'MODULES' | 'PERMISSIONS' | 'ATTENDANCE' | 'SECURITY'>('IDENTITY');
  const [isSaving, setIsSaving] = useState(false);

  const handleToggleFeature = (feature: keyof SystemConfig['features']) => {
    setConfig(prev => ({
      ...prev,
      features: { ...prev.features, [feature]: !prev.features[feature] }
    }));
  };

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      alert('تم اعتماد كافة الإعدادات وتطبيقها بنجاح');
    }, 1500);
  };

  const toggleWeekend = (day: number) => {
    const current = config.attendanceConfig.weekends;
    const next = current.includes(day) ? current.filter(d => d !== day) : [...current, day];
    setConfig({ ...config, attendanceConfig: { ...config.attendanceConfig, weekends: next } });
  };

  const tabs = [
    { id: 'IDENTITY', label: 'الهوية والسنة', icon: Globe },
    { id: 'MODULES', label: 'إدارة الأنظمة', icon: Zap },
    { id: 'ATTENDANCE', label: 'إعدادات الرصد', icon: Clock },
    { id: 'PERMISSIONS', label: 'الصلاحيات', icon: ShieldCheck },
    { id: 'SECURITY', label: 'أمن النظام', icon: Lock },
  ];

  const daysOfWeek = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20 text-right" dir="rtl">
      <div className="bg-emerald-950 p-12 rounded-[3.5rem] text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px]"></div>
        <div className="relative z-10">
          <h2 className="text-4xl font-black leading-tight">مركز التحكم الموحد</h2>
          <p className="text-emerald-400/60 font-black mt-2 uppercase tracking-widest text-[10px]">School Operating Engine (SOE) - Admin Suite</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        <div className="lg:w-72 shrink-0 space-y-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`w-full flex items-center justify-between px-6 py-5 rounded-[1.8rem] font-black text-sm transition-all flex-row-reverse ${
                activeTab === tab.id 
                ? 'bg-emerald-600 text-white shadow-2xl scale-[1.03]' 
                : 'bg-white text-slate-400 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-4 flex-row-reverse">
                <tab.icon size={20} />
                <span>{tab.label}</span>
              </div>
              {activeTab === tab.id && <ChevronLeft size={16}/>}
            </button>
          ))}
        </div>

        <div className="flex-1 bg-white p-10 rounded-[3.5rem] shadow-xl border border-slate-100 min-h-[600px]">
          {activeTab === 'ATTENDANCE' && (
            <div className="space-y-10 animate-in fade-in slide-in-from-left-6">
               <h3 className="text-sm font-black text-indigo-600 uppercase tracking-widest border-b border-slate-50 pb-4 flex items-center gap-3 justify-end">تكوين سياسة الرصد اليومي <Shield size={18}/></h3>
               
               <div className="space-y-6">
                  <div className="flex items-center justify-between flex-row-reverse">
                     <div className="text-right">
                        <h4 className="text-sm font-black text-slate-800">صلاحيات التعديل للكشاف</h4>
                        <p className="text-[10px] text-slate-400 font-bold mt-1">تحديد نطاق الأيام التي يمكن لقائد الفصل رصدها</p>
                     </div>
                     <select 
                       value={config.attendanceConfig.editableDaysForScout}
                       onChange={e => setConfig({...config, attendanceConfig: {...config.attendanceConfig, editableDaysForScout: e.target.value as any}})}
                       className="px-6 py-3 bg-slate-50 border border-slate-100 rounded-2xl font-black text-xs outline-none text-emerald-700"
                     >
                        <option value="TODAY">اليوم الحالي فقط</option>
                        <option value="YESTERDAY">اليوم الحالي + الأمس</option>
                        <option value="2DAYS">اليوم الحالي + يومين</option>
                        <option value="WEEK">أسبوع كامل</option>
                        <option value="OPEN">مفتوح للجميع</option>
                        <option value="LOCKED">مغلق (عرض فقط)</option>
                     </select>
                  </div>

                  <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 space-y-6">
                     <div className="flex items-center justify-between flex-row-reverse">
                        <div className="text-right">
                           <h4 className="text-sm font-black text-slate-800 font-bold">حماية تعديلات الإدارة</h4>
                           <p className="text-[10px] text-slate-400 font-bold">منع الكشاف من تعديل أي طالب قامت الإدارة بتعديل حالته</p>
                        </div>
                        <button 
                          onClick={() => setConfig({...config, attendanceConfig: {...config.attendanceConfig, scoutCanOverrideAdmin: !config.attendanceConfig.scoutCanOverrideAdmin}})}
                          className={`w-14 h-8 rounded-full relative transition-all ${config.attendanceConfig.scoutCanOverrideAdmin ? 'bg-indigo-600' : 'bg-slate-300'}`}
                        >
                           <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all shadow-md ${config.attendanceConfig.scoutCanOverrideAdmin ? 'right-7' : 'right-1'}`}></div>
                        </button>
                     </div>

                     <div className="flex items-center justify-between flex-row-reverse">
                        <div className="text-right">
                           <h4 className="text-sm font-black text-slate-800 font-bold">سلوك "عدم الرفع"</h4>
                           <p className="text-[10px] text-slate-400 font-bold">إذا لم يرفع الكشاف التحضير بنهاية اليوم، هل يُعتبر الفصل حاضراً بالكامل؟</p>
                        </div>
                        <button 
                          onClick={() => setConfig({...config, attendanceConfig: {...config.attendanceConfig, defaultAllPresentOnNoSync: !config.attendanceConfig.defaultAllPresentOnNoSync}})}
                          className={`w-14 h-8 rounded-full relative transition-all ${config.attendanceConfig.defaultAllPresentOnNoSync ? 'bg-emerald-600' : 'bg-rose-500'}`}
                        >
                           <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all shadow-md ${config.attendanceConfig.defaultAllPresentOnNoSync ? 'right-7' : 'right-1'}`}></div>
                        </button>
                     </div>
                  </div>

                  <div className="space-y-4">
                     <label className="text-[10px] font-black text-slate-400 uppercase mr-3">أيام الإجازة الرسمية</label>
                     <div className="flex flex-wrap gap-2 justify-end">
                        {daysOfWeek.map((day, idx) => (
                          <button 
                            key={idx}
                            onClick={() => toggleWeekend(idx)}
                            className={`px-6 py-3 rounded-2xl font-black text-xs border-2 transition-all ${config.attendanceConfig.weekends.includes(idx) ? 'bg-rose-50 border-rose-500 text-rose-700' : 'bg-white border-slate-100 text-slate-400'}`}
                          >
                             {day}
                          </button>
                        ))}
                     </div>
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'IDENTITY' && (
            <div className="space-y-8 animate-in fade-in">
               <h3 className="text-sm font-black text-emerald-600 border-b border-slate-50 pb-4 flex items-center gap-3 justify-end">الهوية الأكاديمية <Globe size={18}/></h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase mr-3">اسم الصرح التعليمي</label>
                    <input type="text" value={config.schoolName} onChange={e => setConfig({...config, schoolName: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-sm outline-none text-right" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase mr-3">السنة الدراسية</label>
                    <input type="text" value={config.academicYear} onChange={e => setConfig({...config, academicYear: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-sm outline-none text-center font-mono" />
                  </div>
               </div>
            </div>
          )}

          <div className="mt-12 pt-8 border-t border-slate-50 flex justify-end">
             <button onClick={handleSave} className="px-12 py-5 bg-slate-950 text-white rounded-[2rem] font-black shadow-2xl flex items-center gap-4 hover:scale-105 transition-all">
                {isSaving ? <RefreshCw className="animate-spin" /> : <Save />}
                <span className="text-lg">اعتماد كافة الإعدادات</span>
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};
