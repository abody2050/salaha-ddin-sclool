
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Send, Check, CheckCheck, Trash2, X, MessageSquare, Clock, ArrowRight, Copy, CheckCircle, RefreshCw, MoreVertical, ShieldAlert, GraduationCap, Info } from 'lucide-react';
import { User, ChatMessage, UserRole } from '../types';
import { fetchCollection, saveToFirestore, deleteFromFirestore } from '../services/firebaseService';

interface ChatPortalProps {
  user: User;
  recipient?: { id: string, name: string, role: UserRole, subject?: string, className?: string } | null;
  childrenNames?: string[];
  onClose: () => void;
  onShowToast: (msg: string) => void;
}

export const ChatPortal: React.FC<ChatPortalProps> = ({ user, recipient, childrenNames = [], onClose, onShowToast }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [activeMsgOptions, setActiveMsgOptions] = useState<string | null>(null);
  const [localToast, setLocalToast] = useState<string | null>(null);
  const [deletingIds, setDeletingIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeRecipientId = recipient?.id || 'admin-1';
  const activeRecipientName = recipient?.name || 'إدارة المدرسة';

  useEffect(() => {
    const loadMessages = async () => {
      const allMsgs = await fetchCollection("support_chats") as ChatMessage[];
      // فلترة الرسائل بين المستخدم الحالي والمستلم المختار
      const relevant = allMsgs.filter(m => 
        (m.senderId === user.id && m.replyToId === activeRecipientId) || 
        (m.senderId === activeRecipientId && m.replyToId === user.id)
      ).sort((a, b) => a.timestamp.localeCompare(b.timestamp));
      setMessages(relevant);
      setIsLoading(false);
    };
    loadMessages();
    const interval = setInterval(loadMessages, 5000);
    return () => clearInterval(interval);
  }, [user.id, activeRecipientId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // وضع علامة "تمت القراءة" على الرسائل الواصلة
  useEffect(() => {
    const unreadMsgs = messages.filter(m => m.senderId === activeRecipientId && !m.isRead);
    unreadMsgs.forEach(m => {
      saveToFirestore("support_chats", m.id, { isRead: true });
    });
  }, [messages, activeRecipientId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      senderId: user.id,
      senderName: user.name, 
      senderRole: user.role,
      text: inputText,
      timestamp: new Date().toISOString(),
      isRead: false,
      replyToId: activeRecipientId
    };

    try {
      await saveToFirestore("support_chats", newMsg.id, newMsg);
      setInputText('');
    } catch (e) {
      onShowToast("فشل إرسال الرسالة");
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setActiveMsgOptions(null);
    setLocalToast("تم نسخ نص الرسالة");
    setTimeout(() => setLocalToast(null), 3000);
  };

  const deleteMessage = async (msgId: string) => {
    setDeletingIds(prev => [...prev, msgId]);
    try {
      await deleteFromFirestore("support_chats", msgId);
      setMessages(prev => prev.filter(m => m.id !== msgId));
      setLocalToast("تم حذف الرسالة بنجاح");
    } catch (e) {
      setLocalToast("تعذر حذف الرسالة");
    } finally {
      setDeletingIds(prev => prev.filter(id => id !== msgId));
      setActiveMsgOptions(null);
      setTimeout(() => localToast && setLocalToast(null), 3000);
    }
  };

  const welcomeMessage = useMemo(() => {
    const names = childrenNames.length > 0 ? childrenNames.join(' و ') : 'أبنائكم';
    return `السلام عليكم ورحمة الله وبركاته ولي أمر الطالب ${names}. يمكنك إذا عندك أي استفسار أو تعديل أو شكوى أن ترسلها بشكل مختصر وبشكل واضح هنا مباشرة للادارة وسيتم مراجعتها والرد عليكم.`;
  }, [childrenNames]);

  return (
    <div className="fixed inset-0 z-[2000] bg-slate-100 flex flex-col md:max-w-lg md:mx-auto md:shadow-[0_20px_80px_rgba(0,0,0,0.4)] md:rounded-[3.5rem] md:my-8 overflow-hidden animate-in slide-in-from-bottom-10" dir="rtl">
      {localToast && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-[2100] animate-in slide-in-from-top-5 duration-300">
           <div className="bg-slate-900/90 backdrop-blur-md text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-white/10">
              <CheckCircle size={16} className="text-emerald-400" />
              <span className="font-black text-[11px] uppercase tracking-widest">{localToast}</span>
           </div>
        </div>
      )}

      <header className="bg-emerald-800 p-6 text-white flex items-center gap-4 shrink-0 shadow-xl flex-row-reverse border-b border-emerald-700">
         <button onClick={onClose} className="p-3 hover:bg-white/10 rounded-2xl transition-all active:scale-90"><X size={24}/></button>
         <div className="w-12 h-12 bg-white/20 rounded-[1.2rem] flex items-center justify-center font-black text-xl shadow-inner border border-white/10">
            {activeRecipientName[0]}
         </div>
         <div className="flex-1 text-right">
            <h3 className="font-black text-base leading-none text-right flex items-center gap-2 justify-end">
               {activeRecipientName}
               <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_8px_#34d399]"></div>
            </h3>
            {recipient?.role === UserRole.TEACHER && recipient.subject ? (
              <p className="text-[10px] text-emerald-200 mt-2 text-right font-bold uppercase">
                مدرس مادة {recipient.subject} {recipient.className ? `لفصل ${recipient.className}` : ''}
              </p>
            ) : (
              <p className="text-[9px] text-emerald-200 mt-2 text-right font-black uppercase tracking-[0.2em]">بوابة المتابعة الفورية</p>
            )}
         </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 scrollbar-hide bg-[#efe7de] relative" onClick={() => setActiveMsgOptions(null)}>
         <div className="absolute inset-0 opacity-[0.08] pointer-events-none" style={{ backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")' }}></div>
         
         <div className="relative z-10 space-y-6 text-right">
            {/* Automated Welcome Message Box */}
            <div className="flex justify-center mb-8">
               <div className="bg-white/90 backdrop-blur-sm text-slate-700 p-5 rounded-[2rem] border border-emerald-100 text-[12px] font-bold shadow-sm leading-relaxed text-center max-w-[90%]">
                  <Info size={16} className="text-emerald-600 mx-auto mb-2" />
                  {welcomeMessage}
               </div>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-20"><RefreshCw className="animate-spin text-emerald-700" size={32}/></div>
            ) : messages.map((msg) => {
              const isMine = msg.senderId === user.id;
              const isDeleting = deletingIds.includes(msg.id);
              return (
                <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300 relative`}>
                   <div 
                     onClick={(e) => { e.stopPropagation(); !isDeleting && setActiveMsgOptions(activeMsgOptions === msg.id ? null : msg.id); }}
                     className={`max-w-[85%] px-5 py-3 rounded-2xl shadow-md relative cursor-pointer active:scale-[0.98] transition-all group ${isDeleting ? 'opacity-40 blur-[1px]' : ''} ${
                       isMine ? 'bg-[#dcf8c6] rounded-tr-none text-slate-800' : 'bg-white rounded-tl-none text-slate-800'
                     }`}
                   >
                      {isDeleting && (
                         <div className="absolute inset-0 flex items-center justify-center z-10"><RefreshCw size={16} className="animate-spin text-emerald-700" /></div>
                      )}
                      <p className="text-[14px] font-bold leading-relaxed text-right whitespace-pre-wrap">{msg.text}</p>
                      <div className="flex items-center justify-end gap-2 mt-2">
                         <span className="text-[8px] font-black opacity-30 tracking-widest uppercase">
                           {new Date(msg.timestamp).toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' })}
                         </span>
                         {isMine && <CheckCheck size={14} className={msg.isRead ? "text-blue-500" : "text-slate-400"} />}
                      </div>

                      {activeMsgOptions === msg.id && !isDeleting && (
                        <div className={`absolute -top-14 z-50 flex gap-2 animate-in zoom-in-95 ${isMine ? 'right-0' : 'left-0'}`}>
                          <button onClick={(e) => { e.stopPropagation(); handleCopy(msg.text); }} className="bg-slate-900 text-white p-3 rounded-2xl shadow-2xl flex items-center gap-2 px-5 hover:bg-black transition-colors"><Copy size={14}/><span className="text-[10px] font-black">نسخ</span></button>
                          {isMine && (
                            <button onClick={(e) => { e.stopPropagation(); deleteMessage(msg.id); }} className="bg-rose-600 text-white p-3 rounded-2xl shadow-2xl flex items-center gap-2 px-5 hover:bg-rose-700 transition-colors"><Trash2 size={14}/><span className="text-[10px] font-black">حذف</span></button>
                          )}
                        </div>
                      )}
                   </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
         </div>
      </div>

      <footer className="bg-white p-6 md:p-8 border-t border-slate-200 shrink-0 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
         <form onSubmit={handleSendMessage} className="flex items-center gap-4">
            <div className="flex-1 bg-slate-50 rounded-[1.8rem] px-6 border-2 border-slate-100 focus-within:border-emerald-500 transition-all shadow-inner">
               <input 
                 value={inputText}
                 onChange={e => setInputText(e.target.value)}
                 placeholder="اكتب رسالتك بوضوح هنا..." 
                 className="w-full py-5 bg-transparent outline-none font-black text-sm text-right text-black"
               />
            </div>
            <button type="submit" className="w-16 h-16 bg-emerald-700 text-white rounded-full flex items-center justify-center shadow-2xl shadow-emerald-200 hover:bg-emerald-800 active:scale-90 transition-all shrink-0"><Send size={28} className="rotate-180" /></button>
         </form>
      </footer>
    </div>
  );
};
