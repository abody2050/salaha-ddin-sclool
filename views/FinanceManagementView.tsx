
import React, { useState } from 'react';
import { 
  Wallet, TrendingUp, CreditCard, ArrowUpRight, 
  ArrowDownLeft, DollarSign, Calendar, CheckCircle2, 
  Clock, FileText, Download, Plus, PieChart, LayoutGrid, Tag
} from 'lucide-react';

export const FinanceManagementView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'SALARIES' | 'EXPENSES'>('SALARIES');

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="bg-white px-6 py-3 rounded-2xl shadow-sm border border-slate-200">
          <h2 className="text-2xl font-black text-slate-800">الإدارة المالية المركزية</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Financial ERP Control</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button className="px-6 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl font-black hover:bg-slate-50 transition-all flex items-center gap-2">
            <FileText size={18} /> التقارير الضريبية
          </button>
          <button className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black shadow-xl shadow-slate-100 hover:bg-black transition-all flex items-center gap-2">
            <Plus size={20} /> إضافة عملية مالية
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         <div className="bg-emerald-600 p-8 rounded-[3rem] text-white shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">رصيد الصندوق</p>
            <h3 className="text-3xl font-black tabular-nums">1,240,000 <span className="text-xs opacity-50">ريال</span></h3>
         </div>
         <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-lg flex items-center justify-between">
            <div>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">المصروفات التشغيلية</p>
               <h3 className="text-2xl font-black text-rose-600 tabular-nums">45,800 <span className="text-xs opacity-50">ريال</span></h3>
            </div>
            <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center"><ArrowDownLeft /></div>
         </div>
         <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-lg flex items-center justify-between">
            <div>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">الرواتب المستحقة</p>
               <h3 className="text-2xl font-black text-blue-600 tabular-nums">850,000 <span className="text-xs opacity-50">ريال</span></h3>
            </div>
            <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center"><CreditCard /></div>
         </div>
      </div>

      <div className="flex bg-slate-100 p-1.5 rounded-2xl w-fit">
        <button 
          onClick={() => setActiveTab('SALARIES')}
          className={`px-8 py-3 rounded-xl font-black text-xs transition-all ${activeTab === 'SALARIES' ? 'bg-white text-emerald-900 shadow-md' : 'text-slate-400'}`}
        >سجل الرواتب</button>
        <button 
          onClick={() => setActiveTab('EXPENSES')}
          className={`px-8 py-3 rounded-xl font-black text-xs transition-all ${activeTab === 'EXPENSES' ? 'bg-white text-emerald-900 shadow-md' : 'text-slate-400'}`}
        >المصروفات العامة</button>
      </div>

      <div className="bg-white rounded-[3rem] shadow-xl border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          {activeTab === 'SALARIES' ? (
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest">
                  <th className="px-8 py-6">الموظف</th>
                  <th className="px-8 py-6">الراتب الأساسي</th>
                  <th className="px-8 py-6">البدلات</th>
                  <th className="px-8 py-6">الحالة</th>
                  <th className="px-8 py-6">تاريخ الصرف</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {[
                  { name: 'فؤاد السائغ', base: '120,000', bonus: '15,000', status: 'PAID', date: '2025/10/25' },
                  { name: 'أديب ناجي', base: '95,000', bonus: '10,000', status: 'PAID', date: '2025/10/25' },
                  { name: 'سالم اليافعي', base: '85,000', bonus: '5,000', status: 'PENDING', date: '-' },
                ].map((rec, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-all">
                    <td className="px-8 py-5 font-black text-slate-700 text-sm">{rec.name}</td>
                    <td className="px-8 py-5 font-mono text-sm text-slate-500">{rec.base}</td>
                    <td className="px-8 py-5 font-mono text-sm text-emerald-600">+{rec.bonus}</td>
                    <td className="px-8 py-5">
                      <span className={`px-4 py-1.5 rounded-full text-[10px] font-black ${rec.status === 'PAID' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                        {rec.status === 'PAID' ? 'تم الصرف' : 'قيد الانتظار'}
                      </span>
                    </td>
                    <td className="px-8 py-5 font-mono text-[10px] text-slate-400">{rec.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest">
                  <th className="px-8 py-6">بند المصروف</th>
                  <th className="px-8 py-6">التصنيف</th>
                  <th className="px-8 py-6">القيمة</th>
                  <th className="px-8 py-6">المسؤول</th>
                  <th className="px-8 py-6">التاريخ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {[
                  { title: 'إيجار المبنى - الترم الأول', cat: 'إيجارات', val: '40,000', by: 'المدير', date: '2025/10/01' },
                  { title: 'شراء قرطاسية وأقلام سبورة', cat: 'تجهيزات', val: '5,800', by: 'وكيل المدرسة', date: '2025/10/10' },
                  { title: 'صيانة مكيفات المعمل', cat: 'صيانة', val: '3,500', by: 'المدير', date: '2025/10/12' },
                ].map((rec, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-all">
                    <td className="px-8 py-5 font-black text-slate-700 text-sm">{rec.title}</td>
                    <td className="px-8 py-5 text-xs text-slate-500 font-bold"><Tag size={12} className="inline ml-1" /> {rec.cat}</td>
                    <td className="px-8 py-5 font-black text-rose-600 tabular-nums">{rec.val}</td>
                    <td className="px-8 py-5 text-[10px] font-black text-slate-400">{rec.by}</td>
                    <td className="px-8 py-5 font-mono text-[10px] text-slate-400">{rec.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
