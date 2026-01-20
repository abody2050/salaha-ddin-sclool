
import React, { useState, useEffect } from 'react';
import { Bell, Clock, Info, CheckCircle2, Trash2, ShieldCheck, ChevronRight, LayoutGrid, Zap, UserCircle } from 'lucide-react';
import { fetchCollection, saveToFirestore, deleteFromFirestore } from '../services/firebaseService';
import { AppNotification } from '../types';

export const NotificationsCenterView: React.FC = () => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchCollection("notifications");
        // تصفية إشعارات النظام فقط واستبعاد الرسائل
        const sorted = (data as AppNotification[])
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        setNotifications(sorted);
      } catch (e) {
        console.error("Error loading notifications", e);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const markAllRead = async () => {
    const batch = notifications.map(n => saveToFirestore('notifications', n.id, { isRead: true }));
    await Promise.all(batch);
    setNotifications(notifications.map(n => ({ ...n, isRead: true })));
  };

  const clearAll = async () => {
    if (!confirm("سيتم مسح سجل التنبيهات نهائياً، هل أنت متأكد؟")) return;
    const batch = notifications.map(n => deleteFromFirestore('notifications', n.id));
    await Promise.all(batch);
    setNotifications([]);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-white p-10 rounded-[3.5rem] shadow-xl border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6 text-right">
        <div className="flex items-center gap-6">
           <div className="w-16 h-16 bg-emerald-600 text-white rounded-2xl flex items-center justify-center shadow-lg"><Bell size={32} /></div>
           <div>
              <h2 className="text-3xl font-black text-slate-800">مركز التنبيهات الذكي</h2>
              <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">System Events & Activity Logs</p>
           </div>
        </div>
        <div className="flex gap-3">
           <button onClick={markAllRead} className="px-6 py-3 bg-emerald-50 text-emerald-700 rounded-xl font-black text-xs border border-emerald-100 hover:bg-emerald-100 transition-all">تمت قراءة الكل</button>
           <button onClick={clearAll} className="px-6 py-3 bg-rose-50 text-rose-700 rounded-xl font-black text-xs border border-rose-100 hover:bg-rose-100 transition-all flex items-center gap-2"><Trash2 size={14}/> مسح التاريخ</button>
        </div>
      </div>

      <div className="bg-white rounded-[3.5rem] shadow-2xl border border-slate-100 overflow-hidden">
         <div className="p-8 border-b border-slate-50 bg-slate-50/30 flex items-center gap-3 text-right">
            <Clock size={18} className="text-slate-400" />
            <h3 className="font-black text-slate-500 text-sm">التدفق الزمني للنشاط</h3>
         </div>
         <div className="divide-y divide-slate-50">
            {isLoading ? (
              <div className="p-20 text-center"><div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div><p className="font-black text-slate-300">جاري تجميع البيانات...</p></div>
            ) : notifications.length === 0 ? (
              <div className="p-20 text-center flex flex-col items-center">
                 <Bell size={48} className="text-slate-100 mb-4" />
                 <p className="font-black text-slate-300 italic text-lg">لا توجد أي أنشطة نظام مسجلة</p>
              </div>
            ) : notifications.map(n => (
              <div key={n.id} className={`p-8 hover:bg-slate-50/50 transition-all flex items-start gap-6 relative group ${!n.isRead ? 'bg-emerald-50/30 border-r-4 border-emerald-600' : ''} text-right`}>
                 <div className={`shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center ${n.type === 'GRADE_ENTRY' ? 'bg-indigo-100 text-indigo-600' : 'bg-amber-100 text-amber-600'}`}>
                    {n.type === 'GRADE_ENTRY' ? <LayoutGrid size={24}/> : <Info size={24}/>}
                 </div>
                 <div className="flex-1">
                    <div className="flex justify-between items-start mb-2">
                       <h4 className="text-lg font-black text-slate-800">{n.title}</h4>
                       <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-3 py-1 rounded-full">{new Date(n.createdAt).toLocaleDateString('ar-YE')}</span>
                    </div>
                    <p className="text-slate-500 font-bold leading-relaxed text-sm max-w-2xl">{n.message}</p>
                    <div className="flex items-center gap-4 mt-4">
                       <div className="flex items-center gap-2 px-3 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-black text-slate-400">
                          <UserCircle size={14} /> المصدر: {n.from}
                       </div>
                       {!n.isRead && <span className="text-[10px] font-black text-emerald-600 flex items-center gap-1"><Zap size={12}/> جديد</span>}
                    </div>
                 </div>
                 <button 
                  onClick={() => {
                    deleteFromFirestore('notifications', n.id);
                    setNotifications(prev => prev.filter(x => x.id !== n.id));
                  }} 
                  className="absolute left-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-3 bg-rose-50 text-rose-500 rounded-xl"
                 >
                    <Trash2 size={18}/>
                 </button>
              </div>
            ))}
         </div>
      </div>
    </div>
  );
};
