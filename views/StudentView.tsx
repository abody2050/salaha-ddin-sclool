import React from 'react';
import { 
  Award, Clock, Calendar, BookOpen, 
  TrendingUp, CheckCircle2, AlertCircle, FileText,
  ChevronLeft, Star, GraduationCap, Zap, Sparkles, Trophy, Info
} from 'lucide-react';
import { DashboardStats } from '../components/DashboardStats';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { Student, StaffMember, SystemConfig } from '../types';

interface StudentViewProps {
  students: Student[];
  staff: StaffMember[];
  config: SystemConfig;
}

const attendanceSummary = [
  { name: 'حضور', value: 94, color: '#10b981' },
  { name: 'غياب', value: 3, color: '#ef4444' },
  { name: 'تأخر', value: 3, color: '#f59e0b' },
];

// محاكاة لبيانات درجات تفصيلية للطالب
const DETAILED_GRADES = [
  { subject: 'اللغة العربية', homework: 19, attendance: 20, oral: 28, written: 27, total: 94, final: 19, color: 'emerald' },
  { subject: 'الرياضيات', homework: 18, attendance: 19, oral: 25, written: 30, total: 92, final: 18, color: 'blue' },
  { subject: 'الفيزياء', homework: 15, attendance: 20, oral: 22, written: 25, total: 82, final: 16, color: 'indigo' },
  { subject: 'اللغة الإنجليزية', homework: 20, attendance: 20, oral: 30, written: 28, total: 98, final: 20, color: 'rose' },
  { subject: 'القرآن الكريم', homework: 20, attendance: 20, oral: 30, written: 30, total: 100, final: 20, color: 'emerald' },
];

export const StudentView: React.FC<StudentViewProps> = ({ config }) => {
  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700">
      {/* Welcome Hero */}
      <div className="relative overflow-hidden bg-emerald-950 rounded-[3.5rem] p-10 md:p-16 text-white shadow-[0_35px_60px_-15px_rgba(6,78,59,0.3)]">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/20 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute -bottom-20 -left-20 w-[400px] h-[400px] bg-teal-500/10 rounded-full blur-[100px]"></div>
        
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-center gap-12">
          <div className="text-center lg:text-right space-y-6">
            <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-xl px-6 py-2 rounded-full border border-white/10 shadow-lg">
              <Sparkles size={18} className="text-yellow-400" />
              <span className="text-sm font-black tracking-widest uppercase">طالب فخري متميز</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-tight">
              اصنع <span className="text-emerald-400">مستقبلك</span> <br /> بيديك اليوم!
            </h1>
            <p className="text-emerald-100/70 text-xl font-medium max-w-xl leading-relaxed">
              مرحباً بك في قلعة العلم، مدرسة صلاح الدين تفخر بك. راجع درجاتك وحضورك اليومي بدقة.
            </p>
          </div>
          
          <div className="relative w-80 h-80 hidden lg:block">
             <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/30 to-teal-500/30 rounded-[3rem] rotate-6 scale-95 blur-sm"></div>
             <div className="absolute inset-0 bg-white/5 backdrop-blur-3xl rounded-[3rem] border border-white/10 flex items-center justify-center shadow-inner">
                <Trophy size={160} className="text-emerald-400 drop-shadow-[0_0_20px_rgba(52,211,153,0.5)]" />
             </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {[
          { label: 'المعدل العام', value: '94.8%', color: 'text-emerald-500', icon: TrendingUp },
          { label: 'نسبة الحضور', value: '98%', color: 'text-blue-500', icon: CheckCircle2 },
          { label: 'الكتب المستلمة', value: '11/11', color: 'text-purple-500', icon: BookOpen },
          { label: 'العام الدراسي', value: config.academicYear, color: 'text-amber-500', icon: Calendar },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 flex flex-col items-center text-center group hover:bg-emerald-950 transition-all duration-500">
             <div className={`p-4 rounded-2xl bg-slate-50 mb-4 group-hover:bg-white/10 transition-colors ${stat.color}`}>
                <stat.icon size={24} />
             </div>
             <h4 className="text-2xl md:text-3xl font-black text-slate-800 group-hover:text-white transition-colors">{stat.value}</h4>
             <p className="text-[10px] font-black text-slate-400 group-hover:text-emerald-400 uppercase tracking-widest mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* سجل الرصد التفصيلي الكامل للطالب - Locked Layout */}
      <div className="bg-white rounded-[3.5rem] shadow-2xl border border-slate-100 overflow-hidden">
        <div className="p-10 border-b border-slate-50 flex flex-col md:flex-row justify-between items-center bg-slate-50/30 gap-4">
          <div>
            <h3 className="text-2xl font-black text-slate-800">سجل النتائج التفصيلي (الرصد الشهري)</h3>
            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Detailed Academic Grading Report</p>
          </div>
          <div className="flex items-center gap-3">
             <span className="px-5 py-2 bg-emerald-100 text-emerald-700 rounded-2xl font-black text-xs border border-emerald-200">
                الشهر الحالي: {config.activeMonths?.[0]?.gregorian || 'غير محدد'}
             </span>
          </div>
        </div>
        <div className="w-full">
          <table className="w-full text-right table-fixed border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white text-[9px] md:text-[11px] font-black uppercase tracking-tight md:tracking-widest">
                <th className="w-[22%] px-2 md:px-6 py-4 md:py-6">المادة الدراسية</th>
                <th className="w-[10%] px-1 py-4 md:py-6 text-center">واجب(20)</th>
                <th className="w-[10%] px-1 py-4 md:py-6 text-center">مواظبة(20)</th>
                <th className="w-[10%] px-1 py-4 md:py-6 text-center">شفهي(30)</th>
                <th className="w-[10%] px-1 py-4 md:py-6 text-center">تحريري(30)</th>
                <th className="w-[15%] px-1 py-4 md:py-6 text-center bg-emerald-900">المجموع(100)</th>
                <th className="w-[14%] px-1 py-4 md:py-6 text-center bg-indigo-900">المحصلة(20)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {DETAILED_GRADES.map((row, i) => (
                <tr key={i} className="hover:bg-slate-50 transition-all group">
                  <td className="px-2 md:px-6 py-4 border-l border-slate-50">
                    <div className="flex items-center gap-2 md:gap-4">
                      <div className={`hidden sm:flex w-8 h-8 rounded-lg bg-${row.color}-50 text-${row.color}-600 items-center justify-center font-black text-xs shrink-0 shadow-inner`}>
                        {row.subject?.[0] || 'S'}
                      </div>
                      <span className="font-black text-slate-700 text-[10px] md:text-sm truncate">{row.subject}</span>
                    </div>
                  </td>
                  <td className="px-1 py-4 text-center font-mono text-[11px] md:text-sm text-slate-500">{row.homework}</td>
                  <td className="px-1 py-4 text-center font-mono text-[11px] md:text-sm text-slate-500">{row.attendance}</td>
                  <td className="px-1 py-4 text-center font-mono text-[11px] md:text-sm text-slate-500">{row.oral}</td>
                  <td className="px-1 py-4 text-center font-mono text-[11px] md:text-sm text-slate-500">{row.written}</td>
                  <td className="px-1 py-4 text-center">
                    <span className={`inline-block px-2 md:px-4 py-1.5 rounded-xl font-black text-xs md:text-lg border-2 ${row.total >= 90 ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                      {row.total}
                    </span>
                  </td>
                  <td className="px-1 py-4 text-center">
                    <span className="text-sm md:text-2xl font-black text-indigo-600 tabular-nums">{row.final}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-10 bg-slate-50 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white rounded-2xl shadow-sm text-emerald-600 border border-emerald-50"><Info size={24} /></div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">تنبيه هام</p>
              <p className="text-xs font-bold text-slate-600">هذه البيانات نهائية ومستخرجة من السجل الرقمي الموحد للمدرسة.</p>
            </div>
          </div>
          <button className="w-full md:w-auto px-10 py-4 bg-white border border-slate-200 text-slate-800 rounded-[1.5rem] font-black text-sm hover:bg-slate-100 transition-all flex items-center justify-center gap-3 shadow-md">
            <FileText size={20} className="text-emerald-600" /> طباعة الشهادة الشهرية
          </button>
        </div>
      </div>
    </div>
  );
};