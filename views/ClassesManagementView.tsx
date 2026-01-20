import React, { useState, useMemo } from 'react';
import { 
  LayoutGrid, BookOpen, Users, User, 
  ChevronLeft, ArrowRight, MoreHorizontal, 
  Search, ShieldCheck, Calendar, 
  Clock, Hash, BadgeCheck, AlertCircle, Info, X,
  Book, Sun, PenTool, Type, Variable, FlaskConical, Globe2, Atom, TestTube2, Microscope, Scroll, MapPin, Users2, GraduationCap
} from 'lucide-react';
import { CLASSES } from '../constants';
import { SchoolClass, Student, StaffMember } from '../types';

const LEVEL_CONFIG = {
  PRIMARY: { label: 'المرحلة الابتدائية', color: 'emerald', bg: 'bg-emerald-500', text: 'text-emerald-600', light: 'bg-emerald-50' },
  MIDDLE: { label: 'المتوسطة', color: 'amber', bg: 'bg-amber-500', text: 'text-amber-600', light: 'bg-amber-50' },
  SECONDARY: { label: 'المرحلة الثانوية', color: 'indigo', bg: 'bg-indigo-600', text: 'text-indigo-600', light: 'bg-indigo-50' }
};

const SUBJECT_STYLE: Record<string, { icon: any, color: string, bg: string, border: string, text: string }> = {
  'قرآن': { icon: Book, color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-100', text: 'text-emerald-700' },
  'تربية إسلامية': { icon: Sun, color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-100', text: 'text-amber-700' },
  'لغة عربية': { icon: PenTool, color: 'text-orange-500', bg: 'bg-orange-50', border: 'border-orange-100', text: 'text-orange-700' },
  'English': { icon: Type, color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-100', text: 'text-blue-700' },
  'رياضيات': { icon: Variable, color: 'text-indigo-500', bg: 'bg-indigo-50', border: 'border-indigo-100', text: 'text-indigo-700' },
  'علوم': { icon: FlaskConical, color: 'text-teal-500', bg: 'bg-teal-50', border: 'border-teal-100', text: 'text-teal-700' },
  'اجتماعيات': { icon: Globe2, color: 'text-sky-500', bg: 'bg-sky-50', border: 'border-sky-100', text: 'text-sky-700' },
  'فيزياء': { icon: Atom, color: 'text-violet-500', bg: 'bg-violet-50', border: 'border-violet-100', text: 'text-violet-700' },
  'كيمياء': { icon: TestTube2, color: 'text-pink-500', bg: 'bg-pink-50', border: 'border-pink-100', text: 'text-pink-700' },
  'أحياء': { icon: Microscope, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100', text: 'text-green-700' },
  'تاريخ': { icon: Scroll, color: 'text-stone-500', bg: 'bg-stone-50', border: 'border-stone-100', text: 'text-stone-700' },
  'جغرافيا': { icon: MapPin, color: 'text-red-500', bg: 'bg-red-50', border: 'border-red-100', text: 'text-red-700' },
  'مجتمع': { icon: Users2, color: 'text-cyan-600', bg: 'bg-cyan-50', border: 'border-cyan-100', text: 'text-cyan-700' },
  'مربي فصل': { icon: GraduationCap, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', text: 'text-emerald-700' }
};

interface ClassesManagementViewProps {
  staff: StaffMember[];
  students: any[];
}

export const ClassesManagementView: React.FC<ClassesManagementViewProps> = ({ staff, students }) => {
  const [selectedClass, setSelectedClass] = useState<SchoolClass | null>(null);

  const classStudents = useMemo(() => {
    if (!selectedClass) return [];
    return students.filter(s => s.classId === selectedClass.id);
  }, [selectedClass, students]);

  const getTeacherForSubject = (subjectName: string, classId: string) => {
    return staff.find(s => 
      s.isTeaching && 
      s.assignments.some(a => a.subjectName === subjectName && a.classIds.includes(classId))
    );
  };

  const renderClassList = () => (
    <div className="space-y-12 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-slate-100 pb-8">
        <div>
          <h2 className="text-4xl font-black text-slate-800 tracking-tight">الفصول الدراسية</h2>
          <p className="text-slate-400 font-bold mt-2">نظام إدارة الفصول المتزامن - مدرسة صلاح الدين الأيوبي</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        {(Object.keys(LEVEL_CONFIG) as Array<keyof typeof LEVEL_CONFIG>).map((level) => {
          const config = LEVEL_CONFIG[level];
          const levelClasses = CLASSES.filter(c => c.level === level);
          return (
            <div key={level} className="space-y-6">
              <div className={`flex items-center gap-3 px-6 py-3 ${config.light} ${config.text} rounded-[1.5rem] w-fit font-black text-xs uppercase tracking-widest border border-${config.color}-100 shadow-sm`}>
                <LayoutGrid size={18} /> {config.label}
              </div>
              <div className="space-y-5">
                {levelClasses.map(cls => {
                  const currentStudentCount = students.filter(s => s.classId === cls.id).length;
                  return (
                    <div key={cls.id} onClick={() => setSelectedClass(cls)} className="bg-white p-6 rounded-[2.5rem] shadow-lg border border-slate-100 hover:shadow-2xl hover:-translate-y-1.5 transition-all cursor-pointer group relative overflow-hidden">
                      <div className={`absolute top-0 right-0 w-3 h-full ${config.bg}`}></div>
                      <div className={`w-14 h-14 ${config.light} ${config.text} rounded-[1.2rem] flex items-center justify-center font-black text-2xl mb-6`}>{cls.grade}</div>
                      <h3 className="text-2xl font-black text-slate-800 group-hover:text-emerald-700 transition-colors leading-tight">{cls.name}</h3>
                      <div className="flex items-center gap-6 mt-6">
                        <div className="flex items-center gap-2 text-slate-400 text-xs font-bold"><Users size={16} className={config.text} /><span>{currentStudentCount} طالباً مسجلاً</span></div>
                        <div className="flex items-center gap-2 text-slate-400 text-xs font-bold"><BookOpen size={16} className={config.text} /><span>{cls.subjects.length} مواد</span></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderClassDetail = (cls: SchoolClass) => {
    const config = LEVEL_CONFIG[cls.level];
    return (
      <div className="space-y-8 animate-in slide-in-from-left-12 duration-500 pb-10">
        <div className="flex justify-between items-center">
          <button onClick={() => setSelectedClass(null)} className="flex items-center gap-3 text-slate-400 hover:text-emerald-600 font-black text-sm transition-all group">
            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" /> العودة للقائمة
          </button>
          <div className="px-4 py-2 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${config.bg}`}></div>
            <span className={`text-[10px] font-black uppercase tracking-widest ${config.text}`}>{config.label}</span>
          </div>
        </div>

        <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-8 relative overflow-hidden">
           <div className="flex items-center gap-8 text-right">
              <div className={`w-20 h-20 ${config.bg} text-white rounded-[1.8rem] flex items-center justify-center shadow-lg font-black text-4xl`}>{cls.grade}</div>
              <div>
                 <h2 className="text-4xl font-black text-slate-800 tracking-tight">{cls.name}</h2>
                 <p className="text-slate-400 font-bold text-xs mt-1">مربي الفصل: <span className="text-indigo-600">{cls.supervisorName}</span></p>
              </div>
           </div>
           <div className="flex gap-4">
              <div className="bg-slate-50 px-6 py-3 rounded-2xl text-center border border-slate-100">
                <p className="text-[9px] font-black text-slate-400 uppercase mb-1">الطلاب</p>
                <p className="text-lg font-black text-slate-700 tabular-nums">{classStudents.length}</p>
              </div>
              <div className="bg-slate-50 px-6 py-3 rounded-2xl text-center border border-slate-100">
                <p className="text-[9px] font-black text-slate-400 uppercase mb-1">الحصص</p>
                <p className="text-lg font-black text-slate-700 tabular-nums">{cls.weeklyPeriods}</p>
              </div>
           </div>
        </div>

        {/* الكادر التعليمي - التصميم المجهري الجديد */}
        <div className="bg-white p-6 rounded-[2.5rem] shadow-lg border border-slate-100">
          <div className="flex items-center gap-3 mb-4 px-2">
            <ShieldCheck size={16} className="text-indigo-500" />
            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">الكادر الأكاديمي للفصل</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {cls.subjects.map((sub, i) => {
              const teacher = getTeacherForSubject(sub.subjectName, cls.id);
              const style = SUBJECT_STYLE[sub.subjectName] || SUBJECT_STYLE['قرآن'];
              const Icon = style.icon;
              
              return (
                <div key={i} className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border ${style.bg} ${style.border} hover:shadow-md transition-all group cursor-default`}>
                  <div className={`w-7 h-7 rounded-lg ${style.bg} flex items-center justify-center border ${style.border} group-hover:scale-110 transition-transform`}>
                    <Icon size={14} className={style.color} />
                  </div>
                  <div className="flex flex-col">
                    <span className={`text-[10px] font-black ${style.text} leading-none`}>{sub.subjectName}</span>
                    <span className="text-[9px] font-bold text-slate-500 mt-1 truncate max-w-[100px]">{teacher ? teacher.name : 'لم يحدد'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden">
           <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
              <div className="flex items-center gap-3">
                <Users size={20} className="text-indigo-500" />
                <h3 className="text-xl font-black text-slate-800">قائمة طلاب الفصل</h3>
              </div>
              <span className="bg-indigo-600 text-white px-5 py-1.5 rounded-full font-black text-[10px] uppercase tracking-wider">{classStudents.length} طلاب مسجلين</span>
           </div>
           <div className="overflow-x-auto">
              <table className="w-full text-right">
                 <thead>
                    <tr className="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-50">
                       <th className="px-10 py-5">الاسم الكامل</th>
                       <th className="px-8 py-5 text-center">الكود الدراسي</th>
                       <th className="px-8 py-5 text-center">الحالة</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50">
                    {classStudents.map((st, i) => (
                       <tr key={i} className="hover:bg-emerald-50/30 transition-all group">
                          <td className="px-10 py-4">
                             <div className="flex items-center gap-4">
                                <div className={`w-9 h-9 ${st.avatarColor || 'bg-slate-100'} rounded-xl flex items-center justify-center font-black text-white text-[11px] shadow-sm`}>{st.fullName?.[0] || 'S'}</div>
                                <span className="font-black text-slate-700 text-sm group-hover:text-indigo-600 transition-colors">{st.fullName}</span>
                             </div>
                          </td>
                          <td className="px-8 py-4 text-center font-mono text-[11px] text-slate-400 font-bold">{st.studentCode}</td>
                          <td className="px-8 py-4 text-center">
                             <span className="inline-flex items-center justify-center gap-2 text-emerald-600 font-black text-[10px] bg-emerald-50 px-3 py-1.5 rounded-lg"><BadgeCheck size={12} /> نشط</span>
                          </td>
                       </tr>
                    ))}
                    {classStudents.length === 0 && (
                      <tr><td colSpan={3} className="p-20 text-center text-slate-300 font-bold">لا يوجد طلاب مقيدين في هذا الفصل حالياً</td></tr>
                    )}
                 </tbody>
              </table>
           </div>
        </div>
      </div>
    );
  };

  return <div className="min-h-screen">{selectedClass ? renderClassDetail(selectedClass) : renderClassList()}</div>;
};