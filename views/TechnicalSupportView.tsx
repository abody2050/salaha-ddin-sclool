
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  MessageSquare, Send, Search, Phone, ArrowRight, Trash2, 
  Clock, CheckCheck, Copy, CheckCircle, RefreshCw, User, X,
  ShieldCheck, LayoutGrid, GraduationCap, Calendar, Info, 
  Settings, PenTool, BadgeCheck, Zap
} from 'lucide-react';
import { fetchCollection, saveToFirestore, deleteFromFirestore } from '../services/firebaseService';
import { ChatMessage, UserRole, StaffMember, Student } from '../types';
import { CLASSES } from '../constants';

export const TechnicalSupportView: React.FC = () => {
  const [chats, setChats] = useState<ChatMessage[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedChatUser, setSelectedChatUser] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeMsgOptions, setActiveMsgOptions] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [deletingIds, setDeletingIds] = useState<string[]>([]);
  const [showPrepContext, setShowPrepContext] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadData = async () => {
      const [allChats, allStaff, allStudents] = await Promise.all([
        fetchCollection("support_chats"),
        fetchCollection("staff"),
        fetchCollection("students")
      ]);
      setChats((allChats as ChatMessage[]).sort((a, b) => b.timestamp.localeCompare(a.timestamp)));
      setStaff(allStaff as StaffMember[]);
      setStudents(allStudents as Student[]);
    };
    loadData();
    const interval = setInterval(loadData, 4000); 
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedChatUser, chats.length]);

  useEffect(() => {
    if (selectedChatUser) {
      const unreadMsgs = chats.filter(m => m.senderId === selectedChatUser && !m.isRead);
      unreadMsgs.forEach(m => {
        saveToFirestore("support_chats", m.id, { isRead: true });
      });
    }
  }, [selectedChatUser, chats]);

  const conversationUsers = useMemo(() => {
    const userMap = new Map<string, { lastTs: string, name: string, unread: number, lastMsg: string, role: UserRole }>();
    chats.forEach(m => {
      const uid = m.senderRole === UserRole.ADMIN ? m.replyToId : m.senderId;
      if (!uid || uid.startsWith('admin')) return;
      const existing = userMap.get(uid);
      const isUnread = m.senderId === uid && !m.isRead;
      if (!existing || m.timestamp > existing.lastTs) {
        userMap.set(uid, {
          lastTs: m.timestamp,
          name: m.senderRole === UserRole.ADMIN ? (existing?.name || 'مستخدم') : m.senderName,
          unread: (existing?.unread || 0) + (isUnread ? 1 : 0),
          lastMsg: m.text,
          role: m.senderRole === UserRole.ADMIN ? (existing?.role || UserRole.TEACHER) : m.senderRole
        });
      } else if (isUnread) {
        userMap.set(uid, { ...existing, unread: existing.unread + 1 });
      }
    });
    return Array.from(userMap.entries()).sort((a, b) => b[1].lastTs.localeCompare(a[1].lastTs));
  }, [chats]);

  const currentUserContext = useMemo(() => {
    if (!selectedChatUser) return null;
    const s = staff.find(x => x.id === selectedChatUser);
    if (s) return { type: 'STAFF', data: s };
    const st = students.find(x => x.id === selectedChatUser);
    if (st) return { type: 'SCOUT', data: st };
    return null;
  }, [selectedChatUser, staff, students]);

  const handleSendReply = async () => {
    if (!selectedChatUser || !replyText.trim()) return;
    const reply: ChatMessage = {
      id: `admin-reply-${Date.now()}`,
      senderId: 'admin-1',
      senderName: 'إدارة المدرسة',
      senderRole: UserRole.ADMIN,
      text: replyText,
      timestamp: new Date().toISOString(),
      isRead: false,
      replyToId: selectedChatUser 
    };
    try {
      await saveToFirestore("support_chats", reply.id, reply);
      setReplyText('');
    } catch (e) { setToast("فشل إرسال الرد"); }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] md:h-[calc(100vh-180px)] animate-in fade-in duration-500 text-right" dir="rtl">
      {toast && (
        <div className="fixed bottom-24 right-1/2 translate-x-1/2 z-[2000] px-6 py-3 bg-slate-900 text-white rounded-2xl shadow-2xl flex items-center gap-3 border border-white/10">
           <CheckCircle size={18} className="text-emerald-400" />
           <span className="font-black text-xs">{toast}</span>
        </div>
      )}

      <div className="flex-1 flex flex-col md:flex-row gap-4 min-h-0 overflow-hidden">
        {/* Sidebar: Users List */}
        <div className={`${selectedChatUser ? 'hidden lg:flex' : 'flex'} w-full md:w-80 lg:w-96 bg-white rounded-[2.5rem] shadow-xl border border-slate-100 flex-col min-h-0`}>
           <div className="p-6 border-b border-slate-50 shrink-0">
              <h3 className="font-black text-slate-800 text-lg mb-4">محادثات الدعم الفني</h3>
              <div className="relative">
                 <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                 <input 
                   placeholder="بحث في المرسلين..." 
                   className="w-full pr-10 pl-4 py-3 bg-slate-50 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-100 text-right"
                   value={searchTerm}
                   onChange={e => setSearchTerm(e.target.value)}
                 />
              </div>
           </div>
           <div className="flex-1 overflow-y-auto scrollbar-hide p-2 space-y-1">
              {conversationUsers.map(([uid, data]) => {
                if (searchTerm && !data.name.includes(searchTerm)) return null;
                const isActive = selectedChatUser === uid;
                return (
                  <button key={uid} onClick={() => setSelectedChatUser(uid)} className={`w-full p-4 rounded-2xl text-right transition-all flex items-center gap-4 border ${isActive ? 'bg-emerald-700 border-emerald-600 shadow-lg' : 'bg-white border-transparent hover:bg-slate-50'}`}>
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black shrink-0 ${isActive ? 'bg-white/20 text-white shadow-inner' : 'bg-emerald-50 text-emerald-600 shadow-sm'}`}>
                      {data.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                       <div className="flex justify-between items-center mb-1 flex-row-reverse">
                          <span className={`text-[10px] font-bold ${isActive ? 'text-emerald-100' : 'text-slate-400'}`}>{new Date(data.lastTs).toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' })}</span>
                          <p className={`font-black text-sm truncate ${isActive ? 'text-white' : 'text-slate-800'}`}>{data.name}</p>
                       </div>
                       <p className={`text-[11px] font-medium truncate ${isActive ? 'text-white/80' : 'text-slate-500'}`}>{data.lastMsg}</p>
                    </div>
                    {data.unread > 0 && !isActive && (
                      <span className="bg-emerald-500 text-white text-[10px] px-2 py-0.5 rounded-full font-black min-w-[20px] text-center shadow-md animate-bounce">{data.unread}</span>
                    )}
                  </button>
                );
              })}
           </div>
        </div>

        {/* Chat Area */}
        <div className={`${!selectedChatUser ? 'hidden md:flex' : 'flex'} flex-1 bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 flex-col overflow-hidden relative`}>
           {selectedChatUser ? (
             <div className="flex flex-1 overflow-hidden h-full flex-row-reverse">
               {/* Prep Context Sidebar (Right side of Chat) */}
               {showPrepContext && currentUserContext && (
                 <div className="hidden xl:flex w-72 bg-slate-50 border-l border-slate-100 flex-col animate-in slide-in-from-right-10 overflow-y-auto scrollbar-hide">
                    <div className="p-8 space-y-8">
                       <div className="text-center space-y-4">
                          <div className={`w-20 h-20 rounded-[2rem] mx-auto flex items-center justify-center text-white text-3xl font-black shadow-xl ${currentUserContext.data.avatarColor || 'bg-indigo-600'}`}>
                             {currentUserContext.data.name[0]}
                          </div>
                          <div className="space-y-1">
                             <h4 className="font-black text-slate-800 text-base">{currentUserContext.data.name}</h4>
                             <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">{currentUserContext.type === 'STAFF' ? 'كادر تعليمي' : 'فريق الكشافة'}</p>
                          </div>
                       </div>

                       <div className="space-y-4">
                          <div className="flex items-center gap-2 justify-end border-b border-slate-200 pb-2"><h5 className="text-[10px] font-black text-slate-400 uppercase">المهام والفصول</h5><LayoutGrid size={14} className="text-indigo-500"/></div>
                          {currentUserContext.type === 'STAFF' ? (
                            <div className="space-y-2">
                               {(currentUserContext.data as StaffMember).assignments.map((a, i) => (
                                 <div key={i} className="bg-white p-3 rounded-xl shadow-sm border border-slate-200">
                                    <p className="font-black text-[11px] text-slate-700 text-right">{a.subjectName}</p>
                                    <div className="flex flex-wrap gap-1 mt-1 justify-end">
                                       {a.classIds.map(cid => <span key={cid} className="text-[8px] bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">{CLASSES.find(c => c.id === cid)?.name.split(' ')[0]}</span>)}
                                    </div>
                                 </div>
                               ))}
                            </div>
                          ) : (
                            <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-200 text-right">
                               <p className="text-[11px] font-black text-slate-700">فصل الكشاف:</p>
                               <span className="text-[10px] text-indigo-600 font-bold">{CLASSES.find(c => c.id === (currentUserContext.data as Student).classId)?.name}</span>
                            </div>
                          )}
                       </div>

                       <div className="space-y-3 pt-6 border-t border-slate-200">
                          <button className="w-full py-3 bg-white border border-slate-200 rounded-xl font-black text-[10px] text-slate-600 hover:bg-slate-100 transition-all flex items-center justify-center gap-2">
                             <PenTool size={14}/> سجل الرصد
                          </button>
                          <button className="w-full py-3 bg-white border border-slate-200 rounded-xl font-black text-[10px] text-slate-600 hover:bg-slate-100 transition-all flex items-center justify-center gap-2">
                             <BadgeCheck size={14}/> تقرير الحضور
                          </button>
                       </div>
                    </div>
                 </div>
               )}

               {/* Messages Area */}
               <div className="flex-1 flex flex-col min-w-0">
                  <header className="p-4 md:px-8 md:py-5 border-b border-slate-100 bg-white flex justify-between items-center shrink-0 z-10 flex-row-reverse">
                     <div className="flex items-center gap-4 flex-row-reverse">
                        <button onClick={() => setSelectedChatUser(null)} className="lg:hidden p-2 text-slate-400"><ArrowRight/></button>
                        <div className="w-10 h-10 md:w-12 md:h-12 bg-emerald-700 text-white rounded-2xl flex items-center justify-center font-black text-lg shadow-lg">
                           {currentUserContext?.data.name[0] || 'U'}
                        </div>
                        <div className="text-right">
                           <h3 className="font-black text-sm md:text-base text-slate-800">{currentUserContext?.data.name || "مراسل"}</h3>
                           <p className="text-[10px] text-emerald-500 font-bold">متصل</p>
                        </div>
                     </div>
                     <div className="flex items-center gap-2">
                        <button onClick={() => setShowPrepContext(!showPrepContext)} className={`p-2 rounded-xl transition-all hidden xl:block ${showPrepContext ? 'bg-indigo-50 text-indigo-600' : 'text-slate-300'}`} title="عرض التحضير السريع"><Zap size={20}/></button>
                        <button onClick={() => setSelectedChatUser(null)} className="p-2 text-slate-300 hover:text-rose-500"><X size={20}/></button>
                     </div>
                  </header>

                  <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-4 bg-[#f0f2f5] scrollbar-hide relative" onClick={() => setActiveMsgOptions(null)}>
                     <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")' }}></div>
                     {chats.filter(c => c.senderId === selectedChatUser || (c.senderRole === UserRole.ADMIN && c.replyToId === selectedChatUser))
                      .sort((a,b) => a.timestamp.localeCompare(b.timestamp))
                      .map(msg => {
                        const isMyMsg = msg.senderRole === UserRole.ADMIN;
                        return (
                          <div key={msg.id} className={`flex ${isMyMsg ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2`}>
                             <div className={`max-w-[85%] md:max-w-[75%] px-4 py-2.5 rounded-2xl shadow-sm relative cursor-pointer active:scale-[0.98] transition-all group ${isMyMsg ? 'bg-[#dcf8c6] text-slate-800 rounded-tr-none' : 'bg-white text-slate-800 rounded-tl-none'}`}>
                                <p className="text-[13px] font-medium leading-relaxed text-right">{msg.text}</p>
                                <div className="flex items-center justify-end gap-1.5 mt-1">
                                   <span className="text-[9px] font-bold opacity-40">{new Date(msg.timestamp).toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' })}</span>
                                   {isMyMsg && <CheckCheck size={14} className={msg.isRead ? "text-blue-500" : "text-slate-400"} />}
                                </div>
                             </div>
                          </div>
                        );
                      })}
                      <div ref={chatEndRef} />
                  </div>

                  <footer className="p-4 md:p-6 bg-white border-t border-slate-100 flex items-center gap-3 shrink-0">
                     <div className="flex-1 bg-slate-50 rounded-2xl px-5 border border-slate-200">
                        <input 
                          className="w-full py-4 bg-transparent outline-none font-bold text-sm text-right"
                          placeholder="اكتب ردك هنا..."
                          value={replyText}
                          onChange={e => setReplyText(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleSendReply()}
                        />
                     </div>
                     <button onClick={handleSendReply} className="w-14 h-14 bg-emerald-600 text-white rounded-full flex items-center justify-center shadow-xl hover:bg-emerald-700 transition-all shrink-0"><Send size={24} className="rotate-180" /></button>
                  </footer>
               </div>
             </div>
           ) : (
             <div className="flex-1 flex flex-col items-center justify-center text-center p-20 bg-slate-50/30">
                <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center mb-8 shadow-xl border border-slate-50 text-slate-100"><MessageSquare size={64}/></div>
                <h3 className="text-2xl font-black text-slate-300">اختر محادثة لبدء المتابعة والتحضير</h3>
                <p className="text-slate-400 font-bold mt-2">سيظهر هنا أرشيف المحادثات والرسائل الفورية مع الكادر والطلاب</p>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};
