
import React, { useMemo } from 'react';
import { Printer, Download, ArrowRight, ShieldCheck, Hash, MapPin, BadgeCheck, FileText, Scissors, Award } from 'lucide-react';
import { SCHOOL_NAME } from '../constants';

interface ExamPrintPreviewProps {
  type: string;
  data: any;
  onBack: () => void;
}

export const ExamPrintPreview: React.FC<ExamPrintPreviewProps> = ({ type, data, onBack }) => {
  const { examRecords, halls, classes, activePeriod } = data;

  const handleDownloadPDF = () => {
    const element = document.getElementById('a4-print-container');
    const h2p = (window as any).html2pdf;
    if (!element || !h2p) return;
    
    const opt = {
      margin: 0,
      filename: `مستندات_الكنترول_${activePeriod?.name}_${Date.now()}.pdf`,
      image: { type: 'jpeg', quality: 1.0 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    h2p().set(opt).from(element).save();
  };

  // --- الترويسة السيادية اليمنية ---
  const OfficialHeader = ({ pageNum, totalPages }: { pageNum: number, totalPages: number }) => (
    <div className="official-header-print border-b-4 border-double border-slate-900 pb-8 mb-10" dir="rtl">
       <div className="flex justify-between items-start">
          <div className="text-right w-1/3">
             <p className="font-black text-[14px]">الجمهورية اليمنية</p>
             <p className="font-black text-[13px] mt-1">وزارة التربية والتعليم</p>
             <p className="font-black text-[11px] text-slate-500 mt-1">مكتب التربية - محافظة الضالع</p>
          </div>
          <div className="text-center w-1/3 flex flex-col items-center">
             <div className="w-20 h-20 mb-3">
                <img 
                  src="https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Emblem_of_Yemen.svg/1200px-Emblem_of_Yemen.svg.png" 
                  className="w-full grayscale brightness-0" 
                  alt="Republic Emblem" 
                />
             </div>
             <h1 className="text-2xl font-black tracking-tight">{SCHOOL_NAME}</h1>
             <div className="mt-3 bg-slate-950 text-white px-8 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.4em] shadow-lg">إدارة الكنترول والاختبارات</div>
          </div>
          <div className="text-left w-1/3 text-[11px] font-black space-y-1.5">
             <p>العام الدراسي: {activePeriod?.academicYear}</p>
             <p>الدورة: {activePeriod?.name}</p>
             <p>التاريخ: {new Date().toLocaleDateString('ar-YE')}</p>
             <div className="bg-slate-100 px-4 py-1 rounded-xl inline-block mt-2 border border-slate-200">
                صفحة رقم ( {pageNum} من {totalPages} )
             </div>
          </div>
       </div>
    </div>
  );

  // --- محرك تجزئة البيانات لصفحات A4 ---
  const renderCallingLists = () => {
    const studentsPerPage = 22; // سعة مثالية لصفحة A4 مع الترويسة
    const pages = [];
    for (let i = 0; i < examRecords.length; i += studentsPerPage) {
      pages.push(examRecords.slice(i, i + studentsPerPage));
    }

    return pages.map((page, pIdx) => (
      <div key={pIdx} className="a4-page-container bg-white shadow-[0_40px_80px_rgba(0,0,0,0.2)] mx-auto mb-20 p-[20mm] relative overflow-hidden text-right" style={{ width: '210mm', height: '297mm' }}>
         <OfficialHeader pageNum={pIdx + 1} totalPages={pages.length} />
         
         <div className="text-center mb-10">
            <h2 className="text-2xl font-black border-2 border-slate-900 py-4 rounded-[1.5rem] inline-block px-24 shadow-sm bg-slate-50 uppercase tracking-widest">كشف مناداة لجان الاختبارات</h2>
         </div>

         <table className="w-full text-right border-collapse">
            <thead>
               <tr className="bg-slate-100">
                  <th className="border-2 border-slate-900 p-4 text-center w-14 text-[12px] font-black">م</th>
                  <th className="border-2 border-slate-900 p-4 text-[13px] font-black">الاسم الرباعي الكامل للطالب</th>
                  <th className="border-2 border-slate-900 p-4 text-center w-36 text-[12px] font-black">رقم الجلوس</th>
                  <th className="border-2 border-slate-900 p-4 text-center w-40 text-[12px] font-black">اللجنة / القاعة</th>
                  <th className="border-2 border-slate-900 p-4 text-center w-44 text-[12px] font-black">توقيع الطالب</th>
               </tr>
            </thead>
            <tbody>
               {page.map((rec: any, idx: number) => (
                 <tr key={rec.studentId} className="h-11">
                    <td className="border-2 border-slate-900 p-3 text-center font-bold text-xs">{pIdx * studentsPerPage + idx + 1}</td>
                    <td className="border-2 border-slate-900 p-3 pr-6 font-black text-[14px] text-slate-800">{rec.studentName}</td>
                    <td className="border-2 border-slate-900 p-3 text-center font-mono font-black text-xl text-indigo-800">{rec.seatNumber}</td>
                    <td className="border-2 border-slate-900 p-3 text-center font-bold text-[12px]">{halls.find((h: any) => h.id === rec.hallId)?.name}</td>
                    <td className="border-2 border-slate-900 p-3"></td>
                 </tr>
               ))}
            </tbody>
         </table>

         {/* التذييل الرسمي */}
         <div className="absolute bottom-[20mm] left-[20mm] right-[20mm] border-t-2 border-slate-900 pt-8">
            <div className="flex justify-between items-end text-[12px] font-black">
               <div className="space-y-6">
                  <p>توقيع مراقب اللجنة: .......................................</p>
                  <p>توقيع رئيس الكنترول: .......................................</p>
               </div>
               <div className="text-center pb-2">
                  <p className="text-slate-300 text-[10px] mb-4 uppercase tracking-[0.3em]">Official School Seal Area</p>
                  <div className="w-28 h-28 border-2 border-dashed border-slate-200 rounded-full flex items-center justify-center mx-auto">
                     <ShieldCheck size={48} className="text-slate-100" />
                  </div>
               </div>
               <div className="text-left space-y-4">
                  <p>يعتمد مدير المدرسة</p>
                  <p className="pt-6">أ/ ..............................</p>
               </div>
            </div>
         </div>
      </div>
    ));
  };

  return (
    <div className="min-h-screen bg-slate-200 py-16 font-sans overflow-y-auto" dir="rtl">
      {/* Universal Control Bar */}
      <div className="fixed top-8 right-8 left-8 z-[5000] flex justify-between items-center bg-white/90 backdrop-blur-3xl px-12 py-8 rounded-[3.5rem] border border-white/40 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.4)] animate-in slide-in-from-top-12 duration-700">
         <div className="flex items-center gap-10 flex-row-reverse">
            <div className="text-right">
               <h3 className="text-slate-950 font-black text-3xl leading-none">معاينة المستندات السيادية</h3>
               <p className="text-emerald-600 font-bold text-xs uppercase mt-3 tracking-[0.3em] flex items-center gap-3 justify-end">
                  <ShieldCheck size={18}/> Unified Digital Printing Engine (Ver. 3.5)
               </p>
            </div>
            <button onClick={onBack} className="p-6 bg-slate-950 text-white rounded-[2rem] hover:bg-rose-600 transition-all shadow-2xl active:scale-90 group">
               <ArrowRight className="group-hover:translate-x-2 transition-transform" size={28} />
            </button>
         </div>
         
         <div className="flex gap-6">
            <button onClick={handleDownloadPDF} className="px-14 py-6 bg-emerald-600 text-white rounded-[2.2rem] font-black shadow-2xl shadow-emerald-200 hover:bg-emerald-700 transition-all flex items-center gap-5 active:scale-95 text-xl">
               <Download size={28}/> تصدير PDF رسمي
            </button>
            <button onClick={() => window.print()} className="px-14 py-6 bg-white text-slate-950 rounded-[2.2rem] font-black shadow-xl border border-slate-100 hover:bg-slate-50 transition-all flex items-center gap-5 active:scale-95 text-xl">
               <Printer size={28}/> طباعة فورية
            </button>
         </div>
      </div>

      {/* Visual Workspace Container */}
      <div id="a4-print-container" className="pt-48 flex flex-col items-center">
         {renderCallingLists()}
      </div>

      <style>{`
        @media print {
          body { background: white !important; padding: 0 !important; margin: 0 !important; }
          .fixed { display: none !important; }
          #a4-print-container { padding-top: 0 !important; }
          .a4-page-container { 
            margin: 0 !important; 
            box-shadow: none !important; 
            border: none !important;
            page-break-after: always;
            width: 210mm !important;
            height: 297mm !important;
          }
          @page { 
            margin: 0; 
            size: A4; 
          }
        }
        .a4-page-container {
          transition: transform 0.6s cubic-bezier(0.2, 1, 0.3, 1);
        }
        #a4-print-container:hover .a4-page-container {
          transform: translateY(-8px);
        }
      `}</style>
    </div>
  );
};
