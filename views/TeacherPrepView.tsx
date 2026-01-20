
import React, { useState } from 'react';
import { CLASSES } from '../constants';
import { Plus, Search, FileText, ChevronLeft, Calendar, CheckCircle, X, BookOpen, PenTool, Hash, Clock } from 'lucide-react';

export const TeacherPrepView: React.FC = () => {
  const [isAdding, setIsAdding] = useState(false);
  const [toast, setToast] = useState<{message: string, type: 'success'} | null>(null);

  const handleSave = () => {
    setToast({ message: 'تم حفظ التحضير الدراسي بنجاح', type: 'success' });
    setTimeout(() => {
      setToast(null);
      setIsAdding(false);
    }, 3000);
  };

  return (
    <div className="max-w-6xl mx-auto -m-4 p-4 md:p-8 space-y-8 relative animate-in fade-in duration-500">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[300] w-full max-w-md px-4 animate-in slide-in-from-top-full duration-500">
          <div className="flex items-center gap-4 px-6 py-4 rounded-3xl shadow-2xl border backdrop-blur-md bg-emerald-600 border-emerald-400 text-white">
            <CheckCircle size={24} />
            <p className="font-black flex-1">{toast.message}</p>
            <button onClick={() => setToast(null)}><X size={18} /></button>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-emerald-900 p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-white/5 rounded-full blur-[80px]"></div>
        <div className="relative z-10">
          <h2 className="text-4xl font-black">المخطط الرقمي للمعلم</h2>
          <p className="text-emerald-300 font-bold mt-2">نظم دروسك، ابنِ مستقبلاً - مدرسة صلاح الدين الأيوبي</p>
        </div>
        {!isAdding ? (
          <button 
            onClick={() => setIsAdding(true)}
            className="relative z-10 bg-white text-emerald-900 px-10 py-4 rounded-2xl font-black shadow-xl hover:bg-emerald-50 transition-all flex items-center gap-3 group"
          >
            <Plus size={24} className="group-hover:rotate-90 transition-transform" />
            <span>بدء تحضير درس جديد</span>
          </button>
        ) : (
          <div className="relative z-10 flex gap-3">
            <button onClick={handleSave} className="bg-emerald-500 text-white px-8 py-4 rounded-2xl font-black hover:bg-emerald-400 transition-all shadow-lg">حفظ واعتماد</button>
            <button onClick={() => setIsAdding(false)} className="bg-white/10 backdrop-blur-md text-white px-8 py-4 rounded-2xl font-black hover:bg-white/20 transition-all border border-white/20">إلغاء</button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Class Selector Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100">
            <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-3">
              <BookOpen className="text-emerald-500" size={20} />
              فصولي الأكاديمية
            </h3>
            <div className="space-y-3">
              {CLASSES.slice(0, 5).map((c, idx) => (
                <div key={c.id} className="group p-4 rounded-2xl border border-slate-50 bg-slate-50/30 hover:bg-emerald-50 hover:border-emerald-200 transition-all cursor-pointer flex justify-between items-center">
                  <div className="flex items-center gap-3">
                     <span className="w-8 h-8 flex items-center justify-center bg-white rounded-lg text-xs font-black shadow-sm group-hover:bg-emerald-600 group-hover:text-white transition-colors">{idx + 1}</span>
                     <span className="font-black text-slate-700 text-sm">{c.name}</span>
                  </div>
                  <ChevronLeft size={16} className="text-slate-300 group-hover:text-emerald-500 group-hover:-translate-x-1 transition-all" />
                </div>
              ))}
            </div>
            <button className="w-full mt-6 py-4 text-[10px] font-black text-emerald-600 uppercase tracking-widest border-t border-slate-50 hover:text-emerald-700 transition-colors pt-6">عرض جميع الفصول</button>
          </div>
        </div>

        {/* Main Workspace */}
        <div className="lg:col-span-3">
          {isAdding ? (
            <div className="bg-white p-10 rounded-[3.5rem] shadow-2xl border border-emerald-50 animate-in zoom-in-95 duration-500">
              <div className="flex items-center gap-4 mb-10 border-b border-slate-50 pb-8">
                 <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center">
                    <PenTool size={28} />
                 </div>
                 <div>
                    <h3 className="text-2xl font-black text-slate-800">بيانات الدرس الجديد</h3>
                    <p className="text-slate-400 font-bold text-xs uppercase mt-0.5 tracking-widest">Lesson Preparation Form</p>
                 </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-1.5 text-right">
                  <label className="text-[10px] font-black text-slate-400 uppercase mr-3">عنوان الدرس المحوري</label>
                  <div className="relative">
                    <Hash className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input type="text" placeholder="مثلاً: قوانين الحركة الدائرية" className="w-full pr-12 pl-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-emerald-50 focus:bg-white transition-all" />
                  </div>
                </div>
                <div className="space-y-1.5 text-right">
                  <label className="text-[10px] font-black text-slate-400 uppercase mr-3">تاريخ التنفيذ</label>
                  <div className="relative">
                    <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input type="date" className="w-full pr-12 pl-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-emerald-50 focus:bg-white transition-all" />
                  </div>
                </div>
              </div>

              <div className="mt-8 space-y-1.5 text-right">
                <label className="text-[10px] font-black text-slate-400 uppercase mr-3">الأهداف التعليمية والوسائط</label>
                <textarea rows={6} placeholder="اكتب أهداف الدرس وخطوات التنفيذ هنا..." className="w-full p-6 bg-slate-50 border border-slate-100 rounded-[2rem] font-bold outline-none focus:ring-4 focus:ring-emerald-50 focus:bg-white transition-all resize-none"></textarea>
              </div>
            </div>
          ) : (
            <div className="space-y-8 animate-in slide-in-from-left-8 duration-500">
              {/* Archive Search */}
              <div className="bg-white p-6 rounded-[2.5rem] shadow-lg border border-slate-100 flex items-center gap-6">
                <div className="flex-1 relative">
                  <Search className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input type="text" placeholder="ابحث في أرشيف تحضيراتك..." className="w-full pr-14 pl-6 py-4 bg-slate-50/50 rounded-2xl border border-slate-100 outline-none focus:ring-4 focus:ring-emerald-50 font-bold" />
                </div>
                <button className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl hover:bg-emerald-100 transition-all border border-emerald-100">
                  <Calendar size={24} />
                </button>
              </div>

              {/* Prep Cards List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="bg-white p-8 rounded-[3rem] shadow-xl border border-slate-100 hover:shadow-2xl hover:-translate-y-1 transition-all group relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-transform"></div>
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all">
                          <FileText size={28} />
                        </div>
                        <div>
                          <h4 className="font-black text-slate-800 leading-tight">قوانين نيوتن للحركة</h4>
                          <p className="text-[10px] font-black text-slate-400 uppercase mt-1">الفيزياء • الصف الأول الثانوي</p>
                        </div>
                      </div>
                    </div>
                    <p className="text-slate-500 text-sm font-bold leading-relaxed line-clamp-3 mb-6">
                      شرح القانون الأول لنيوتن (قانون القصور الذاتي) وتطبيقاته العملية في الحياة اليومية مع إجراء تجربة بسيطة للطلاب...
                    </p>
                    <div className="flex justify-between items-center border-t border-slate-50 pt-6">
                      <div className="flex items-center gap-3">
                         <span className="flex items-center gap-1.5 text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full"><Clock size={12}/> 12 أكتوبر</span>
                         <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full">محفوظ</span>
                      </div>
                      <button className="text-xs font-black text-slate-400 hover:text-emerald-600 transition-all underline">التفاصيل</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
