
import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, LayoutGrid, Users, UserCircle, CalendarCheck, 
  GraduationCap, Wallet, Settings, FileText, 
  PenSquare, BarChart3, Camera, ClipboardList, 
  User, Award, Clock, Menu, X, LogOut, Bell,
  Megaphone, Key, MessageSquare
} from 'lucide-react';
import { UserRole, User as UserType, SystemConfig } from '../types';
import { NAV_ITEMS, SCHOOL_NAME } from '../constants';
import { fetchCollection } from '../services/firebaseService';

const icons: Record<string, any> = {
  LayoutDashboard, LayoutGrid, Users, UserCircle, CalendarCheck, GraduationCap,
  Wallet, Settings, FileText, PenSquare, BarChart3, Camera, 
  ClipboardList, User, Award, Clock, Key, MessageSquare, Bell
};

interface LayoutProps {
  user: UserType;
  onLogout: () => void;
  children: React.ReactNode;
  activePath: string;
  onNavigate: (path: string) => void;
  config: SystemConfig;
}

export const Layout: React.FC<LayoutProps> = ({ user, onLogout, children, activePath, onNavigate, config }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState({ notifications: 0, support: 0 });
  const [acknowledgedSupport, setAcknowledgedSupport] = useState(false);
  
  useEffect(() => {
    const checkUnread = async () => {
      try {
        const [notifs, chats] = await Promise.all([
          fetchCollection("notifications"),
          fetchCollection("support_chats")
        ]);
        
        const unreadNotifs = notifs.filter((n: any) => !n.isRead).length;
        const unreadChats = chats.filter((c: any) => c.senderRole !== UserRole.ADMIN && !c.isRead).length;
        
        setUnreadCounts({ notifications: unreadNotifs, support: unreadChats });
      } catch (e) {
        console.error("Error fetching unread counts", e);
      }
    };

    checkUnread();
    const interval = setInterval(checkUnread, 15000);
    return () => clearInterval(interval);
  }, []);

  // تصفير إشعار الدعم الفني بمجرد الدخول للقسم
  useEffect(() => {
    if (activePath === 'support') {
      setAcknowledgedSupport(true);
    } else if (unreadCounts.support > 0) {
      // إذا وصلت رسائل جديدة والمستخدم في قسم آخر، نعيد تفعيل التنبيه
      setAcknowledgedSupport(false);
    }
  }, [activePath, unreadCounts.support]);

  const menuItems = (NAV_ITEMS[user?.role] || []).filter(item => {
    if (item.path === 'finance' && !config.features.financeSystem) return false;
    if (item.path === 'attendance-scan' && !config.features.attendanceScanner) return false;
    if (item.path === 'prep' && !config.features.teacherPrep) return false;
    if (item.path === 'grades' && !config.features.gradingSystem) return false;
    return true;
  });

  const themeClasses = {
    emerald: 'bg-emerald-950',
    blue: 'bg-blue-950',
    indigo: 'bg-indigo-950',
    rose: 'bg-rose-950',
    dark: 'bg-black'
  };

  const activeColorClasses = {
    emerald: 'text-emerald-700 bg-white',
    blue: 'text-blue-700 bg-white',
    indigo: 'text-indigo-700 bg-white',
    rose: 'text-rose-700 bg-white',
    dark: 'text-slate-900 bg-white'
  };

  return (
    <div className={`min-h-screen ${config.theme === 'dark' ? 'bg-zinc-950 text-slate-100' : 'bg-slate-50 text-slate-900'} flex flex-col md:flex-row font-sans`} dir="rtl">
      {/* Mobile Header */}
      <header className="md:hidden bg-emerald-900 text-white p-4 flex justify-between items-center z-[110] shadow-lg">
         <button onClick={() => setIsSidebarOpen(true)} className="p-2"><Menu size={28}/></button>
         <div className="flex items-center gap-2">
            <h2 className="font-black text-sm">{SCHOOL_NAME.split('–')[0]}</h2>
         </div>
         <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center font-black">{user?.name?.[0] || 'U'}</div>
      </header>

      <aside className={`
        fixed inset-y-0 right-0 z-[120] w-72 ${themeClasses[config.theme]} text-white transform transition-all duration-500 ease-in-out
        md:translate-x-0 md:static md:inset-0 shadow-2xl
        ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          <div className="p-8">
            <div className="flex items-center justify-between mb-10">
              <div className="flex items-center space-x-3 space-x-reverse">
                <div className="w-12 h-12 bg-white/10 rounded-[1.2rem] flex items-center justify-center text-white border border-white/10 shadow-xl">
                  <GraduationCap size={28} />
                </div>
                <div>
                  <h2 className="text-xl font-black leading-tight tracking-tight">صلاح الدين</h2>
                  <p className="text-[9px] text-white/40 font-bold uppercase tracking-widest mt-0.5">School Management</p>
                </div>
              </div>
              <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-2 text-white/50"><X size={24}/></button>
            </div>
            
            <nav className="space-y-1.5 overflow-y-auto max-h-[70vh] scrollbar-hide pr-1 text-right">
              {menuItems.map((item) => {
                const Icon = icons[item.icon];
                const isActive = activePath === item.path;
                let count = 0;
                if (item.path === 'notifications') count = unreadCounts.notifications;
                if (item.path === 'support' && !acknowledgedSupport) count = unreadCounts.support;

                return (
                  <button
                    key={item.path}
                    onClick={() => {
                      onNavigate(item.path);
                      setIsSidebarOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl transition-all duration-300 ${
                      isActive 
                      ? `${activeColorClasses[config.theme]} shadow-2xl scale-[1.03] font-black` 
                      : 'text-white/50 hover:bg-white/5 hover:text-white font-bold'
                    }`}
                  >
                    <div className="flex items-center space-x-4 space-x-reverse">
                      {Icon && <Icon size={20} className={isActive ? '' : 'text-white/20'} />}
                      <span className="text-sm">{item.label}</span>
                    </div>
                    {count > 0 && (
                      <span className="bg-rose-500 text-white text-[10px] px-2 py-0.5 rounded-full font-black min-w-[20px] text-center animate-pulse">
                        {count > 9 ? '+9' : count}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="mt-auto p-8 border-t border-white/5 space-y-4">
            <button 
              onClick={onLogout}
              className="w-full flex items-center space-x-4 space-x-reverse px-5 py-4 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-2xl transition-all font-black text-sm"
            >
              <LogOut size={20} />
              <span>خروج آمن من النظام</span>
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden relative">
        {config.globalAnnouncement && (
          <div className={`px-10 py-2.5 ${themeClasses[config.theme]} text-white text-[10px] font-black flex items-center justify-center gap-3 relative z-[60]`}>
             <Megaphone size={14} className="animate-bounce" />
             <div className="flex-1 overflow-hidden whitespace-nowrap">
                <div className="inline-block animate-marquee-text">
                  {config.globalAnnouncement}
                </div>
             </div>
          </div>
        )}

        <header className="hidden md:flex bg-white/80 backdrop-blur-xl h-24 items-center justify-between px-10 border-b border-slate-100 sticky top-0 z-50">
          <div className="flex items-center gap-6">
            <div className="text-right">
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">
                {menuItems.find(i => i.path === activePath)?.label || 'لوحة التحكم'}
              </h3>
              <p className="text-[10px] text-slate-400 font-black mt-1 uppercase tracking-widest">مدرسة صلاح الدين الأيوبي – عام {config.academicYear}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-6 space-x-reverse">
             <button 
                onClick={() => onNavigate('notifications')}
                className={`p-3 rounded-2xl transition-all relative ${activePath === 'notifications' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:text-emerald-600'}`}
             >
                <Bell size={20} />
                {unreadCounts.notifications > 0 && (
                  <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white"></span>
                )}
             </button>
             <div className="flex items-center gap-4 bg-slate-50 p-2.5 rounded-[1.5rem] border border-slate-100 pr-5">
                <div className="text-right">
                   <p className="text-xs font-black text-slate-800">{user?.name || 'مستخدم'}</p>
                   <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{user?.role || 'زائر'}</p>
                </div>
                <div className={`w-11 h-11 ${config.theme === 'rose' ? 'bg-rose-600' : 'bg-emerald-600'} rounded-2xl flex items-center justify-center text-white font-black shadow-lg`}>
                  {user?.name?.[0] || 'U'}
                </div>
             </div>
          </div>
        </header>

        <div className="p-4 md:p-10 flex-1 overflow-y-auto scrollbar-hide relative">
          <div className="max-w-7xl mx-auto pb-20">
            {children}
          </div>
        </div>
      </div>

      {isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[115] md:hidden animate-in fade-in"
        ></div>
      )}
    </div>
  );
};
