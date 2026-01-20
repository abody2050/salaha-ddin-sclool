
import React, { useState, useRef } from 'react';
import { Camera, Upload, Check, AlertCircle, RefreshCw, CheckCircle, Info, X, Scan, FileImage, ShieldCheck } from 'lucide-react';
import { analyzeAttendanceImage, OCRResult } from '../services/geminiService';
import { AttendanceStatus } from '../types';

export const AttendanceScanner: React.FC = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [results, setResults] = useState<OCRResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
        processImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const processImage = async (base64: string) => {
    setIsScanning(true);
    setError(null);
    setResults(null);
    try {
      const ocrResult = await analyzeAttendanceImage(base64);
      setResults(ocrResult);
      if (ocrResult.students.length === 0) {
        throw new Error("لم يتم العثور على أسماء في الصورة. تأكد من وضوح الخط.");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsScanning(false);
    }
  };

  const handleStatusChange = (index: number, newStatus: AttendanceStatus) => {
    if (!results) return;
    const newStudents = [...results.students];
    newStudents[index].status = newStatus;
    setResults({ ...results, students: newStudents });
  };

  const submitAttendance = () => {
    setToast({ message: 'تم تحليل البيانات واعتمادها في سجلات المدرسة بنجاح', type: 'success' });
    setTimeout(() => {
      setToast(null);
      setResults(null);
      setPreview(null);
    }, 4000);
  };

  return (
    <div className="max-w-6xl mx-auto -m-4 p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
      {/* Dynamic Toast */}
      {toast && (
        <div className="fixed top-12 left-1/2 -translate-x-1/2 z-[300] w-full max-w-lg px-6 animate-in slide-in-from-top-full duration-500">
          <div className={`flex items-center gap-5 px-8 py-5 rounded-[2.5rem] shadow-2xl border backdrop-blur-xl ${toast.type === 'success' ? 'bg-emerald-600/90 border-emerald-400 text-white' : 'bg-rose-600/90 border-rose-400 text-white'}`}>
            <div className="bg-white/20 p-2 rounded-xl"><CheckCircle size={24} /></div>
            <p className="font-black text-lg flex-1 leading-tight">{toast.message}</p>
            <button onClick={() => setToast(null)} className="hover:rotate-90 transition-transform"><X size={20} /></button>
          </div>
        </div>
      )}

      {/* Advanced Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 bg-white p-10 rounded-[3.5rem] shadow-xl border border-slate-100 relative overflow-hidden">
         <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full blur-3xl opacity-50"></div>
         <div className="flex items-center gap-8 relative z-10">
            <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-[2.2rem] flex items-center justify-center shadow-inner group transition-all">
               <Scan size={48} className="group-hover:scale-110 transition-transform" />
            </div>
            <div>
               <h2 className="text-4xl font-black text-slate-800 tracking-tight">ماسح الحضور الذكي</h2>
               <p className="text-slate-400 font-bold mt-2 uppercase text-xs tracking-[0.3em] flex items-center gap-2">
                  <ShieldCheck size={14} className="text-emerald-500" /> مدعوم بتقنيات Gemini OCR
               </p>
            </div>
         </div>
         <div className="bg-slate-900 px-8 py-5 rounded-[2rem] border border-white/5 text-right">
            <p className="text-[10px] font-black text-white/30 mb-2 uppercase tracking-widest">المعالج العصبي</p>
            <div className="flex items-center gap-3">
               <div className={`w-3 h-3 rounded-full ${isScanning ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`}></div>
               <span className="font-black text-emerald-400 text-sm tracking-wide">{isScanning ? 'جاري فك التشفير...' : 'النظام جاهز للعمل'}</span>
            </div>
         </div>
      </div>

      {!preview ? (
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="group relative h-[450px] bg-white rounded-[4rem] border-4 border-dashed border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/20 transition-all cursor-pointer flex flex-col items-center justify-center overflow-hidden shadow-sm"
        >
          <div className="absolute inset-0 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
             <div className="w-full h-full" style={{backgroundImage: 'radial-gradient(#10b981 1px, transparent 1px)', backgroundSize: '30px 30px'}}></div>
          </div>
          <div className="w-28 h-28 bg-emerald-600 text-white rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-emerald-200 group-hover:scale-110 transition-transform mb-8">
            <Camera size={48} />
          </div>
          <h3 className="text-3xl font-black text-slate-800">ارفع صورة الكشف</h3>
          <p className="text-slate-400 font-bold mt-3 text-lg">التقط صورة واضحة للكشف الورقي لبدء التحليل</p>
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} capture="environment" />
          <button className="mt-10 px-12 py-5 bg-emerald-100 text-emerald-700 rounded-3xl font-black hover:bg-emerald-200 transition-all shadow-md">اختر ملف أو افتح الكاميرا</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start animate-in fade-in slide-in-from-bottom-10">
           {/* Enhanced Preview Component */}
           <div className="bg-white p-8 rounded-[3.5rem] shadow-2xl border border-slate-100 relative group overflow-hidden">
              <div className="relative rounded-[2.5rem] overflow-hidden bg-slate-950 h-[550px] flex items-center justify-center border-4 border-slate-50 shadow-inner">
                 <img src={preview} alt="Preview" className={`h-full object-contain transition-all duration-1000 ${isScanning ? 'opacity-30 grayscale blur-md scale-90' : 'opacity-80'}`} />
                 
                 {isScanning && (
                   <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-emerald-950/20">
                     <div className="w-full h-1 bg-emerald-400 absolute top-0 left-0 animate-scanning shadow-[0_0_30px_#10b981]"></div>
                     <div className="p-8 bg-white/10 backdrop-blur-xl rounded-[2.5rem] border border-white/20 flex flex-col items-center">
                        <RefreshCw className="animate-spin text-emerald-400 mb-6" size={64} />
                        <p className="text-white text-xl font-black tracking-[0.2em] uppercase">AI Deep Analysis...</p>
                        <p className="text-emerald-300/60 text-[10px] font-bold mt-2">Extracting Names & Status</p>
                     </div>
                   </div>
                 )}
              </div>
              <button 
                onClick={() => { setPreview(null); setResults(null); setError(null); }}
                className="absolute top-12 left-12 p-5 bg-white/20 backdrop-blur-xl text-white rounded-3xl hover:bg-rose-500 transition-all shadow-2xl hover:scale-110"
              >
                <X size={24} />
              </button>
           </div>

           {/* Dynamic Results Container */}
           <div className="space-y-8 h-full">
              {error && (
                <div className="bg-rose-50 border-2 border-rose-100 p-8 rounded-[2.5rem] flex items-start gap-5 animate-in shake duration-500">
                  <div className="p-3 bg-rose-100 text-rose-600 rounded-2xl"><AlertCircle size={28} /></div>
                  <div>
                    <h4 className="font-black text-rose-800 text-lg">فشل التحليل الذكي</h4>
                    <p className="text-sm text-rose-600 font-bold mt-1 leading-relaxed">{error}</p>
                    <button onClick={() => processImage(preview)} className="mt-4 text-xs font-black text-rose-700 underline">إعادة المحاولة</button>
                  </div>
                </div>
              )}

              {results && (
                <div className="bg-white rounded-[3.5rem] shadow-2xl border border-slate-100 overflow-hidden animate-in slide-in-from-left-10 duration-700 flex flex-col h-[550px]">
                  <div className="p-10 border-b border-slate-50 flex justify-between items-center bg-slate-50/50 shrink-0">
                    <div>
                       <h3 className="text-2xl font-black text-slate-800 tracking-tight">نتائج المسح (AI)</h3>
                       <p className="text-xs text-slate-400 font-bold mt-1 uppercase tracking-widest">تم تحليل {results.students.length} أسماء بنجاح</p>
                    </div>
                    <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center shadow-inner"><CheckCircle size={24} /></div>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto scrollbar-hide divide-y divide-slate-50">
                    {results.students.map((student, i) => (
                      <div key={i} className="p-8 flex flex-col sm:flex-row justify-between items-center gap-6 hover:bg-slate-50 transition-all group">
                        <div className="flex items-center gap-4">
                           <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center font-black text-slate-400 text-xs">{i+1}</div>
                           <span className="font-black text-slate-700 text-lg group-hover:text-emerald-700 transition-colors">{student.name}</span>
                        </div>
                        <div className="flex flex-wrap justify-center gap-2">
                          {[
                            { label: 'حاضر', val: AttendanceStatus.PRESENT, color: 'emerald' },
                            { label: 'غائب', val: AttendanceStatus.ABSENT, color: 'rose' },
                            { label: 'تأخر', val: AttendanceStatus.LATE, color: 'amber' },
                            { label: 'إذن', val: AttendanceStatus.EXCUSED, color: 'blue' },
                          ].map((opt) => (
                            <button
                              key={opt.val}
                              onClick={() => handleStatusChange(i, opt.val)}
                              className={`px-5 py-2.5 rounded-2xl text-[10px] font-black transition-all ${
                                student.status === opt.val 
                                ? `bg-${opt.color}-600 text-white shadow-xl scale-110 ring-4 ring-${opt.color}-100`
                                : `bg-${opt.color}-50 text-${opt.color}-600 hover:bg-${opt.color}-100`
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="p-10 bg-slate-50 border-t border-slate-100 shrink-0">
                    <button 
                      onClick={submitAttendance}
                      className="w-full py-6 bg-emerald-600 text-white rounded-[2rem] font-black text-lg shadow-2xl shadow-emerald-200 hover:bg-emerald-700 hover:-translate-y-2 transition-all flex items-center justify-center gap-4"
                    >
                      <Check size={28} />
                      <span>اعتماد كشف اليوم</span>
                    </button>
                  </div>
                </div>
              )}

              {!results && !isScanning && !error && (
                <div className="bg-emerald-950 p-12 rounded-[3.5rem] shadow-2xl text-white text-right h-full flex flex-col justify-center relative overflow-hidden">
                   <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white/5 rounded-full blur-3xl"></div>
                   <div className="w-20 h-20 bg-white/10 rounded-[2rem] flex items-center justify-center mb-8 animate-bounce backdrop-blur-md">
                      <Info size={40} className="text-emerald-400" />
                   </div>
                   <h3 className="text-2xl font-black mb-6 tracking-tight">إرشادات المعالجة الذكية</h3>
                   <ul className="space-y-6 text-emerald-100/60 text-sm font-bold">
                      <li className="flex items-center gap-4 justify-end">تأكد من عدم وجود ظل على الورقة <CheckCircle className="text-emerald-400" size={18} /></li>
                      <li className="flex items-center gap-4 justify-end">استخدم أقلاماً داكنة لكتابة الأسماء <CheckCircle className="text-emerald-400" size={18} /></li>
                      <li className="flex items-center gap-4 justify-end">ضع الكاميرا بشكل موازي للورقة تماماً <CheckCircle className="text-emerald-400" size={18} /></li>
                      <li className="flex items-center gap-4 justify-end">سيقوم النظام بتصنيف الحالات تلقائياً <CheckCircle className="text-emerald-400" size={18} /></li>
                   </ul>
                </div>
              )}
           </div>
        </div>
      )}
      <style>{`
        @keyframes scanning {
          0% { top: 0; }
          100% { top: 100%; }
        }
        .animate-scanning {
          animation: scanning 3s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
      `}</style>
    </div>
  );
};
