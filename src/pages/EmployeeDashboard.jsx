import React, { 
  useState, 
  useEffect, 
  useRef, 
  useMemo,
  useCallback
} from 'react';
import { 
  ClipboardList, CheckCircle, Clock, LogOut, Trophy, 
  Megaphone, User, AlertCircle, Bell, X, Calendar, 
  Info, ChevronRight, Filter, MinusCircle, BellRing, 
  Check, Activity, Layers, ShieldCheck, Cpu, Zap, 
  Terminal, Server, Database, Search, Settings, 
  MoreVertical, RefreshCw, Eye, Trash2, Lock, Unlock, 
  Package, HardDrive, Link, ExternalLink, ArrowUpRight, 
  Target, BarChart3, PieChart, TrendingUp, Award, Globe, 
  MessageSquare, Mail, Phone, MapPin, Briefcase, Hash, 
  Star, Download, Upload, Cloud, FileText, Video, Music, 
  ImageIcon, Play, Pause, SkipForward, SkipBack, Volume2, 
  Mic, Wifi, Battery, Bluetooth, MousePointer, Keyboard, 
  Printer, Smartphone, Tablet, Tv, Monitor, Watch, 
  Headphones, Camera, Cast, Command, Box, Cpu as CpuIcon,
  Wind, CloudLightning, Sun, Moon, Sunrise, Sunset, 
  Navigation, Map, Compass, Anchor, Disc, Radio, 
  Share2, Save, Scissors, Copy, Paperclip, Eraser, 
  Highlighter, PenTool, Brush, Palette, Shapes, 
  Sticker, HelpCircle, AlertTriangle, Bug, LifeBuoy,
  FileCode, Terminal as TermIcon, Database as DbIcon,
  HardDrive as StorageIcon, Network, Cpu as ProcIcon, Send,
  ChevronLeft, ArrowRight
} from 'lucide-react';
import logoImg from '../assets/logoImg.jpg';
import api from '../api/axiosConfig';
import io from 'socket.io-client';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  CartesianGrid 
} from 'recharts';

/**
 * ==================================================================================
 * AUSDAUER SYSTEM: EMPLOYEE PORTAL (VERSION 2.7.0 - DUAL ASSIGNMENT)
 * ==================================================================================
 * FEATURE LOG:
 * 1. DUAL ASSIGNMENT: Task cards now explicitly show "From: [Chair Name]" -> "To: [My Name]".
 * 2. CONSISTENCY: Matches the new layout style of the Chair Dashboard.
 * 3. LOGIC: All previous notification, timer, and ranking logic preserved.
 * ==================================================================================
 */

const socket = io.connect("https://ausdauer-task-manager-backend.onrender.com");

const EmployeeDashboard = ({ onLogout }) => {
  // STATE ARCHITECTURE
  const [tasks, setTasks] = useState([]);
  const [profile, setProfile] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasNotification, setHasNotification] = useState(false);
  const [showNotificationMenu, setShowNotificationMenu] = useState(false);
  const [readNotificationIds, setReadNotificationIds] = useState([]);
  const [commentInputs, setCommentInputs] = useState({}); 
  
  // PERSONAL NOTES STATE
  const [showNotes, setShowNotes] = useState(false);
  const [personalNote, setPersonalNote] = useState(() => {
      return localStorage.getItem('employee_mission_log') || '';
  });

  const [toast, setToast] = useState({ show: false, message: '', type: 'info' });
  const [selectedBriefing, setSelectedBriefing] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  const STORAGE_KEY = 'ausdauer_portal_notifications_v1';
  
  const [dismissedIds, setDismissedIds] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });

  const notifRef = useRef(null); 

  // PERSISTENCE SYNC
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dismissedIds));
  }, [dismissedIds]);

  useEffect(() => {
    localStorage.setItem('employee_mission_log', personalNote);
  }, [personalNote]);

  // LIVE SYSTEM TICK
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  /**
   * DESCENDING PRIORITY ENGINE
   */
  const sortTasks = useCallback((taskArray) => {
    const weights = { 'Emergency': 3, 'High': 2, 'Medium': 1, 'Low': 0 };
    return [...taskArray].sort((a, b) => {
      const wA = weights[a.priority] || 0;
      const wB = weights[b.priority] || 0;
      if (wB !== wA) return wB - wA;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  }, []);

  /**
   * RECONSTRUCTED: LATE COMPLETION & DYNAMIC TIMER
   */
  const getTaskStatusMetrics = (task) => {
    const deadline = new Date(task.deadline);
    
    if (task.status === 'Completed') {
      const finishTime = new Date(task.updatedAt || Date.now());
      const isLate = finishTime > deadline;
      const diff = Math.abs(finishTime - deadline);
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const timeLog = `${hours}H ${mins}M`;
      
      return { 
        status: isLate ? 'LATE_COMPLETION' : 'COMPLETED',
        display: isLate ? `FINISHED LATE: ${timeLog} OVER` : `COMPLETED ON TIME`,
        colorClass: isLate ? 'bg-orange-500/20 border-orange-500/50 text-orange-500 shadow-lg' : 'bg-green-500/20 border-green-500/50 text-green-500',
        isCompleted: true
      };
    }

    const diff = deadline - currentTime;
    const absDiff = Math.abs(diff);
    const hours = Math.floor(absDiff / (1000 * 60 * 60));
    const mins = Math.floor((absDiff % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((absDiff % (1000 * 60)) / 1000);
    const timeStr = `${hours}h ${mins}m ${secs}s`;
    
    return {
      status: diff <= 0 ? 'OVERDUE' : 'ACTIVE',
      display: diff <= 0 ? `TASK OVERDUE: ${timeStr}` : `TIME REMAINING: ${timeStr}`,
      colorClass: diff <= 0 ? 'bg-red-500/20 border-red-500/50 text-red-500 animate-pulse' : 'bg-black/60 border-white/5 text-gray-300',
      isOverdue: diff <= 0
    };
  };

  // CORE SYNC ENGINE
  useEffect(() => {
    fetchDashboardContent(); 
    
    socket.on("task_update", async () => { 
      try {
        const response = await api.get('/tasks');
        setTasks(sortTasks(Array.isArray(response.data) ? response.data : []));
      } catch (e) {}
    });

    socket.on("announcement_update", () => { 
      fetchAnnouncements(); setHasNotification(true);
    });

    socket.on("priority_intimation", (data) => {
      setToast({ 
        show: true, 
        message: `PRIORITY ALERT: Task "${data.title}" moved to ${data.newPriority}!`, 
        type: data.urgent ? 'error' : 'info' 
      });
    });

    return () => { 
      socket.off("task_update"); 
      socket.off("announcement_update"); 
      socket.off("priority_intimation");
    };
  }, [sortTasks]);

  const fetchDashboardContent = async () => {
    setIsSyncing(true);
    try {
      const taskRes = await api.get('/tasks');
      setTasks(sortTasks(taskRes.data || []));
      const userRes = await api.get('/users/me'); setProfile(userRes.data);
      const lbRes = await api.get('/users/leaderboard'); 
      setLeaderboard(lbRes.data.filter(u => u.role === 'Employee'));
      fetchAnnouncements();
    } catch (e) {} finally { setIsSyncing(false); }
  };

  const fetchAnnouncements = async () => {
    try { const res = await api.get('/announcements'); setAnnouncements(res.data); } catch (e) {}
  };

  const handleStatusUpdate = useCallback(async (taskId, newStatus) => {
    const backup = [...tasks];
    setTasks(prev => prev.map(t => t._id === taskId ? { ...t, status: newStatus, updatedAt: new Date().toISOString() } : t));
    try { 
      await api.put(`/tasks/${taskId}`, { status: newStatus }); 
      const res = await api.get('/tasks');
      setTasks(sortTasks(res.data));
    } catch (err) { 
      setTasks(backup); 
      setToast({ show: true, message: 'Connection lost.', type: 'error' });
    }
  }, [tasks, sortTasks]);

  const handleAddComment = async (taskId) => {
    const text = commentInputs[taskId];
    if (!text || !text.trim()) return;
    try {
      await api.post(`/tasks/${taskId}/comments`, { text });
      setCommentInputs(prev => ({ ...prev, [taskId]: '' }));
    } catch (err) {
      setToast({ show: true, message: 'Message failed to send.', type: 'error' });
    }
  };

  const handleMarkAsReadAndClose = () => {
    const vT = tasks.filter(t => !dismissedIds.includes(t._id)).map(t => t._id);
    const vA = announcements.filter(a => !dismissedIds.includes(a._id)).map(a => a._id);
    setReadNotificationIds(prev => [...new Set([...prev, ...vT, ...vA])]);
    setShowNotificationMenu(false);
  };

  const bellTasks = tasks.filter(t => !dismissedIds.includes(t._id));
  const bellAnnouncements = announcements.filter(a => !dismissedIds.includes(a._id));

  const badgeCount = useMemo(() => {
    return bellTasks.filter(t => !readNotificationIds.includes(t._id)).length + 
           bellAnnouncements.filter(a => !readNotificationIds.includes(a._id)).length;
  }, [bellTasks, bellAnnouncements, readNotificationIds]);

  // STAFF ONLY CHART DATA
  const staffChartData = useMemo(() => leaderboard.filter(u => u.role === 'Employee'), [leaderboard]);

  return (
    <div className="h-screen w-full bg-[#050505] font-sans text-white flex flex-col overflow-hidden relative selection:bg-[#1D546C] uppercase font-black">
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-10">
         <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-[#1D546C] blur-[150px] rounded-full"></div>
      </div>

      <nav className="flex-none flex items-center justify-between border-b border-white/5 bg-[#0a0a0a]/90 px-6 py-2 sticky top-0 z-50 backdrop-blur-3xl h-[55px]">
        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-[#1D546C] p-0.5 shadow-[0_0_10px_#1D546C]"><img src={logoImg} alt="logo" className="h-6 w-6 rounded-lg object-cover" /></div>
          <h1 className="text-sm font-black italic tracking-widest uppercase leading-none">AUSDAUER GROUPS</h1>
        </div>
        <div className="flex items-center gap-6">
            <button onClick={() => setShowNotes(!showNotes)} className={`p-2.5 rounded-full transition-all active:scale-95 border ${showNotes ? 'bg-[#1D546C] border-[#1D546C] text-white' : 'bg-[#111] border-white/5 text-gray-400 hover:text-white'}`}><FileText size={16} /></button>
            <div className="relative" ref={notifRef}>
                <button onClick={() => showNotificationMenu ? handleMarkAsReadAndClose() : (setShowNotificationMenu(true), setHasNotification(false))}
                    className={`relative p-2.5 rounded-full transition-all active:scale-95 group ${showNotificationMenu ? 'bg-[#1D546C] text-white shadow-[0_0_20px_#1D546C]' : 'bg-[#111] text-gray-400 border border-white/5 hover:text-white'}`}>
                    <Bell size={16} className={hasNotification ? "animate-bounce" : ""} />
                    {badgeCount > 0 && <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-blue-500 border-2 border-[#0a0a0a] rounded-full flex items-center justify-center text-[8px] font-black shadow-lg animate-in zoom-in">{badgeCount}</span>}
                </button>
                {showNotificationMenu && (
                    <div className="absolute top-10 right-0 w-[350px] bg-[#0a0a0a] border border-[#222] rounded-[15px] shadow-[0_0_50px_rgba(0,0,0,0.95)] z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 font-black uppercase">
                        <div className="p-3 border-b border-[#222] bg-[#111] flex justify-between items-center">
                            <span className="text-[9px] tracking-widest">{badgeCount} NEW UPDATES</span>
                            <X size={12} className="text-gray-500 cursor-pointer hover:text-white" onClick={handleMarkAsReadAndClose} />
                        </div>
                        <div className="max-h-[300px] overflow-y-auto custom-scrollbar p-1">
                            {bellTasks.map(t => (
                                <div key={t._id} className={`p-4 border-b border-[#1a1a1a] hover:bg-[#121212] transition-all group relative ${!readNotificationIds.includes(t._id) ? 'bg-[#1D546C]/5 border-l-2 border-l-[#1D546C]' : 'opacity-70'}`}>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[8px] font-black text-gray-500 tracking-tighter">STATUS: ACTIVE</span>
                                        <button onClick={(e) => { e.stopPropagation(); setDismissedIds(prev => [...prev, t._id]); }} className="opacity-0 group-hover:opacity-100 p-1 text-gray-500 hover:text-red-500 transition-all"><MinusCircle size={16}/></button>
                                    </div>
                                    <h4 className="text-xs font-bold text-white mb-2 leading-tight uppercase">{t.title}</h4>
                                    <div className="flex justify-between text-[7px] text-gray-600 bg-black/40 p-2 rounded-lg font-black uppercase">
                                        <span><User size={8} className="inline mr-1 text-[#1D546C]"/> {t.assignedBy?.name || 'Chair'}</span>
                                        <span className="text-[#1D546C] font-mono"><Clock size={8} className="inline mr-1"/> {new Date(t.createdAt).toLocaleTimeString()}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button onClick={handleMarkAsReadAndClose} className="w-full py-4 bg-[#111] border-t border-[#222] hover:bg-[#1D546C] font-black text-[9px] uppercase tracking-[0.6em]">ACKNOWLEDGE ALL</button>
                    </div>
                )}
            </div>
            <button onClick={onLogout} className="flex items-center gap-2 rounded-xl border border-red-900/30 bg-red-900/10 px-3 py-1.5 text-[9px] font-black text-red-500 hover:bg-red-500 transition-all shadow-lg active:scale-90 uppercase leading-none font-black"><LogOut size={12} /> Exit</button>
        </div>
      </nav>

      <main className="flex-1 overflow-y-auto p-5 md:p-8 max-w-screen-xl mx-auto w-full flex flex-col gap-6 scroll-smooth relative font-black uppercase">
        {showNotes && (
            <div className="absolute top-0 right-0 w-80 h-full bg-[#0a0a0a] border-l border-[#222] z-40 p-6 shadow-2xl animate-in slide-in-from-right duration-300">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-[10px] text-[#1D546C] flex items-center gap-2"><FileText size={14}/> Notes Log</h3>
                    <button onClick={() => setShowNotes(false)} className="text-gray-500 hover:text-white transition-colors"><X size={14}/></button>
                </div>
                <textarea className="w-full h-[80%] bg-[#111] rounded-xl border border-[#333] p-4 text-[10px] text-gray-300 outline-none focus:border-[#1D546C] resize-none font-mono leading-relaxed normal-case" placeholder="Write down task notes here..." value={personalNote} onChange={(e) => setPersonalNote(e.target.value)} />
            </div>
        )}

        <div className="flex-none rounded-[25px] bg-gradient-to-br from-[#1D546C]/20 via-black to-black border border-[#1D546C]/35 p-4 flex items-center gap-6 shadow-xl relative font-black uppercase">
            <div className="h-10 w-10 rounded-[15px] bg-[#1D546C]/20 flex items-center justify-center text-[#1D546C] border border-[#1D546C] shadow-lg"><BellRing size={20} /></div>
            <div>
                <h4 className="text-base font-black text-white tracking-tight flex items-center gap-4 underline decoration-[#1D546C] decoration-2">Connection Log</h4>
                <p className="text-gray-400 text-[10px] mt-1 italic leading-none font-bold">Daily task logs are updated automatically at <span className="text-white font-black underline decoration-[#1D546C] underline-offset-4">09:00:00 AM</span>.</p>
            </div>
        </div>

        <div className="flex-none flex flex-col md:flex-row gap-4 justify-between items-end px-2">
          <div><h2 className="text-4xl font-black text-white tracking-tighter leading-none uppercase">Welcome, <span className="text-[#1D546C]">{profile?.name?.split(' ')[0] || 'User'}</span></h2><p className="text-[10px] text-gray-500 mt-2 font-bold uppercase tracking-[0.1em] opacity-40 italic leading-none">Status: Active</p></div>
          <div className="flex gap-4 font-black uppercase">
            {showLeaderboard ? (
                <button onClick={() => setShowLeaderboard(false)} className="flex items-center gap-3 rounded-[15px] bg-[#1D546C] px-6 py-3 transition-all duration-300 active:scale-95 text-white shadow-xl shadow-[#1D546C]/30 font-black">
                    <ChevronLeft size={16} /><span className="text-[9px] uppercase tracking-[0.25em]">Return to Tasks</span>
                </button>
            ) : (
                <button onClick={() => setShowLeaderboard(true)} className="flex items-center gap-3 rounded-[15px] border border-[#333] px-6 py-3 transition-all duration-300 active:scale-95 bg-[#111] text-gray-400 hover:text-white font-black">
                    <Trophy size={16} /><span className="text-[9px] uppercase tracking-[0.25em]">Rankings</span>
                </button>
            )}
            <div className="flex items-center gap-4 rounded-[15px] border border-[#1D546C]/30 bg-[#0a0a0a] px-6 py-3 shadow-xl border-l-[6px] border-l-[#1D546C] font-black"><div className="text-right font-black"><p className="text-[7px] uppercase tracking-[0.3em] text-[#1D546C] font-black mb-1">Points</p><p className="text-2xl font-black text-white tabular-nums tracking-tighter leading-none">{profile?.score || 0}</p></div></div>
          </div>
        </div>

        {!showLeaderboard && announcements.length > 0 && (
          <div className="flex-none w-full font-black uppercase">
              <h3 className="text-[10px] font-black text-white mb-3 flex items-center gap-3 tracking-[0.3em] opacity-60"><Megaphone size={16} className="text-yellow-500"/> Team Announcements</h3>
              <div className="w-full h-52 bg-[#0a0a0a] border border-[#222] rounded-[30px] overflow-hidden shadow-3xl relative">
                <div className="h-full overflow-y-auto custom-scrollbar p-1">
                    {announcements.map((ann, idx) => (
                      <div key={ann._id} onClick={() => setSelectedBriefing(ann)} className={`p-6 flex flex-col gap-3 cursor-pointer ${idx !== announcements.length - 1 ? 'border-b border-[#1a1a1a]' : ''} hover:bg-[#121212] transition-colors`}>
                        <div className="flex justify-between items-start leading-none font-black uppercase">
                            <h3 className="text-lg font-black text-white underline underline-offset-4 decoration-white/5 uppercase">{ann.title}</h3>
                            <span className="text-[10px] text-gray-600 bg-black/60 px-3 py-1.5 rounded-full border border-white/5 tabular-nums font-mono">{new Date(ann.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="text-xs text-gray-400 font-semibold opacity-70 italic line-clamp-1 normal-case tracking-tight">"{ann.message}"</p>
                      </div>
                    ))}
                </div>
              </div>
          </div>
        )}

        <div className="w-full flex-1 font-black uppercase">
          {showLeaderboard ? (
            <div className="w-full rounded-[40px] border border-[#1A3D64] bg-[#0f0f0f] p-12 shadow-3xl animate-in zoom-in h-full relative overflow-hidden border-t-[10px] border-t-[#1D546C]/20 font-black uppercase">
                  <h3 className="text-3xl font-black text-white mb-12 flex items-center gap-5 tracking-tighter underline decoration-[#1D546C] underline-offset-[12px] decoration-4 leading-none uppercase"><Trophy className="text-yellow-500" size={32}/> Global Rankings</h3>
                  <div className="h-[300px] w-full mb-16 bg-black/40 p-8 rounded-[40px] border border-white/5 shadow-inner"><ResponsiveContainer width="100%" height="100%"><BarChart data={staffChartData}><CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" vertical={false} /><XAxis dataKey="name" tick={{fill: '#444', fontSize: 10, fontWeight: '900'}} axisLine={false} tickLine={false} /><YAxis hide /><Tooltip contentStyle={{backgroundColor: '#050505', borderColor: '#1D546C', borderRadius: '20px'}} cursor={{fill: '#1D546C', opacity: 0.1}} /><Bar dataKey="score" fill="#eab308" radius={[10, 10, 0, 0]} /></BarChart></ResponsiveContainer></div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-black uppercase">{leaderboard.map((u, idx) => (<div key={u._id} className={`flex items-center justify-between p-6 rounded-[32px] border transition-all ${u._id === profile?._id ? 'border-[#1D546C] bg-[#1D546C]/10 scale-[1.01]' : 'border-[#222] bg-[#111]'}`}><div className="flex items-center gap-6 font-black uppercase"><span className={`text-3xl font-black w-12 text-center ${idx === 0 ? 'text-yellow-500' : idx === 1 ? 'text-gray-400' : idx === 2 ? 'text-orange-700' : 'text-[#1a1a1a]'}`}>{idx + 1}</span><div className="h-12 w-12 rounded-[22px] bg-black border border-[#333] overflow-hidden flex-shrink-0 relative p-1">{u.photo ? <img src={`http://localhost:5000${u.photo}`} className="h-full w-full object-cover rounded-[18px]" alt="user" /> : <div className="h-full w-full flex items-center justify-center font-black text-xl text-gray-700 bg-[#0a0a0a]">{u.name[0]}</div>}</div><div><p className="font-black text-white text-lg tracking-tight leading-none mb-1 font-black uppercase">{u.name}</p><p className="text-[9px] text-gray-500 tracking-[0.25em] italic opacity-50 leading-none font-black uppercase">{u.designation || 'Team Member'}</p></div></div><div className="text-3xl font-black text-[#1D546C] tabular-nums pr-4 border-l border-white/5 pl-8 tracking-tighter leading-none font-black">{u.score}</div></div>))}</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-3 animate-in fade-in slide-in-from-bottom-10 duration-800 pb-24 relative overflow-hidden font-black uppercase">
              {tasks.length === 0 && (<div className="col-span-full py-52 rounded-[80px] border-4 border-dashed border-[#1a1a1a] bg-[#0a0a0a]/40 flex flex-col items-center justify-center text-center opacity-40 uppercase"><div className="h-32 w-32 rounded-full bg-[#111] flex items-center justify-center text-gray-800 mb-10 border border-[#222] shadow-inner font-black uppercase"><Check size={64}/></div><h3 className="text-4xl font-black text-gray-700 tracking-[0.5em] font-black uppercase">No Active Tasks</h3></div>)}
              {tasks.map((task) => {
                const metrics = getTaskStatusMetrics(task);
                return (
                  <div key={task._id} className="group relative rounded-[50px] border border-[#1A3D64] bg-[#0f0f0f] p-10 shadow-3xl hover:-translate-y-4 hover:border-[#1D546C] transition-all duration-600 ring-1 ring-white/5 overflow-hidden flex flex-col h-full border-t-[10px] border-t-[#1D546C]/20 hover:border-t-[#1D546C] font-black uppercase">
                      <div className="flex justify-between items-start mb-8 leading-none font-black uppercase">
                        <div className="flex flex-col gap-2 font-black uppercase">
                          
                          {/* NEW: DUAL ASSIGNMENT DISPLAY (FROM -> TO) */}
                          <div className="flex gap-2 text-[8px] text-gray-500 tracking-widest italic font-black items-center mb-1">
                              <span className="flex items-center gap-1"><User size={10} className="text-blue-500"/> {task.assignedBy?.name || 'ADMIN'}</span>
                              <ArrowRight size={8} className="text-gray-600"/>
                              <span className="flex items-center gap-1"><User size={10} className="text-green-500"/> ME</span>
                          </div>

                          <h3 className="text-3xl text-white leading-none tracking-tighter group-hover:text-[#1D546C] transition-colors font-black uppercase">{task.title}</h3>
                        </div>
                        <div className={`h-2.5 w-2.5 rounded-full ${task.priority === 'Emergency' ? 'bg-red-500 animate-ping shadow-[0_0_15px_red]' : 'bg-[#1D546C]'}`}></div>
                      </div>

                      <div className="flex items-center gap-2 mb-6 font-black uppercase">
                        <span className={`px-3 py-1 rounded-full text-[9px] border leading-none font-black uppercase ${
                            task.priority === 'Emergency' ? 'bg-red-500/20 border-red-500 text-red-500 animate-pulse' :
                            task.priority === 'High' ? 'bg-orange-500/20 border-orange-500 text-orange-500' :
                            'bg-[#1D546C]/20 border-[#1D546C] text-[#1D546C]'
                        }`}>
                            {task.priority} URGENCY
                        </span>
                      </div>

                      <div className={`mb-6 flex items-center gap-3 w-fit px-4 py-2 rounded-xl border tabular-nums tracking-widest text-[10px] leading-none font-black uppercase ${metrics.colorClass}`}>
                        <Clock size={14} />
                        <span>{metrics.display}</span>
                      </div>

                      <p className="text-base text-gray-500 leading-relaxed mb-6 line-clamp-3 font-bold tracking-tight opacity-70 italic group-hover:opacity-100 transition-opacity normal-case font-black">"{task.description}"</p>
                      
                      <div className="mb-6 bg-black/40 rounded-2xl p-4 border border-white/5 shadow-inner font-black uppercase">
                        <div className="flex items-center gap-3 mb-4 font-black uppercase">
                            <input 
                              type="text" 
                              placeholder="Write a message..." 
                              value={commentInputs[task._id] || ''}
                              onChange={(e) => setCommentInputs(prev => ({...prev, [task._id]: e.target.value}))}
                              onKeyPress={(e) => e.key === 'Enter' && handleAddComment(task._id)}
                              className="flex-1 bg-transparent border-b border-[#333] text-[10px] font-bold text-gray-300 outline-none focus:border-[#1D546C] py-1 normal-case leading-none font-black uppercase"
                            />
                            <button onClick={() => handleAddComment(task._id)} className="text-[#1D546C] hover:text-white transition-colors p-1 active:scale-90 font-black uppercase"><Send size={14}/></button>
                        </div>
                        <div className="max-h-24 overflow-y-auto custom-scrollbar space-y-3 font-black uppercase">
                            {task.comments?.length > 0 ? (
                                task.comments.slice().reverse().map((c, i) => (
                                    <div key={i} className={`text-[9px] border-l-2 pl-2 py-1 ${c.role === 'Chair' ? 'border-blue-500 bg-blue-500/5 shadow-[0_0_10px_rgba(59,130,246,0.1)]' : 'border-[#1D546C] bg-[#1D546C]/5'}`}>
                                        <div className="flex justify-between items-center mb-1 leading-none font-black uppercase">
                                            <span className={c.role === 'Chair' ? 'text-blue-400' : 'text-[#1D546C]'}>
                                                {c.role === 'Chair' ? `${c.userName || 'Boss'} ` : 'YOU'}
                                            </span>
                                            <span className="text-gray-600 italic font-medium tabular-nums opacity-50 font-mono">{new Date(c.createdAt).toLocaleTimeString()}</span>
                                        </div>
                                        <p className="text-gray-400 font-bold leading-tight tracking-tight normal-case font-black opacity-80 font-black uppercase">"{c.text}"</p>
                                    </div>
                                ))
                            ) : (
                                <p className="text-[8px] text-gray-700 font-black uppercase tracking-[0.2em] text-center py-2 italic leading-none font-black uppercase">No messages yet</p>
                            )}
                        </div>
                      </div>

                      <div className="mt-auto font-black uppercase">
                        <div className="flex gap-4 bg-[#050505] p-2.5 rounded-[28px] border border-[#222] mb-10 shadow-inner ring-1 ring-white/5 font-black uppercase">
                          {['Pending', 'In Progress', 'Completed'].map((s) => (<button key={s} onClick={() => handleStatusUpdate(task._id, s)} className={`flex-1 rounded-[22px] py-5 text-[11px] uppercase tracking-tighter transition-all duration-500 transform active:scale-90 ${task.status === s ? 'bg-[#1D546C] text-white shadow-[0_15px_30px_rgba(29,84,108,0.5)] scale-105' : 'text-gray-700 hover:text-white hover:bg-[#1a1a1a] font-black'}`}>{s === 'In Progress' ? 'Active' : s}</button>))}
                        </div>
                        <div className="pt-8 border-t border-[#222] flex justify-between items-center text-[10px] font-black text-gray-600 uppercase tracking-[0.25em] leading-none font-black uppercase"><span className="flex items-center gap-3 font-black uppercase"><User size={16} className="text-[#1D546C] opacity-60"/> {task.assignedBy?.name || 'Chair'}</span><span className="flex items-center gap-3 font-black uppercase"><Calendar size={16} className="text-[#1D546C] opacity-60"/> {new Date(task.deadline).toLocaleDateString()}</span></div>
                      </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Announcements Modal */}
      {selectedBriefing && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/90 backdrop-blur-xl p-6 font-black uppercase">
            <div className="bg-[#0a0a0a] border border-[#1D546C]/40 p-8 rounded-[40px] max-w-xl w-full relative shadow-[0_0_100px_rgba(29,84,108,0.3)] animate-in zoom-in duration-300 uppercase font-black">
                <button onClick={() => setSelectedBriefing(null)} className="absolute top-6 right-6 p-2 bg-white/5 hover:bg-white/10 rounded-full text-gray-500 hover:text-white transition-all font-black"><X size={24}/></button>
                <div className="flex items-center gap-5 mb-8 font-black uppercase"><div className="h-14 w-14 rounded-2xl bg-yellow-500/10 flex items-center justify-center text-yellow-500 border border-yellow-500/20 shadow-lg font-black"><Megaphone size={28} /></div>
                    <div><h3 className="text-3xl text-white tracking-tighter leading-none underline decoration-yellow-500/20 decoration-2 underline-offset-8 uppercase font-black uppercase">{selectedBriefing.title}</h3><p className="text-[10px] text-gray-500 uppercase tracking-[0.3em] mt-2 italic font-black uppercase">ANNOUNCEMENT LOG</p></div></div>
                <div className="bg-[#050505] p-8 rounded-[30px] border border-white/5 shadow-inner mb-8 font-black uppercase"><p className="text-xl text-gray-300 leading-relaxed italic opacity-90 tracking-tight normal-case font-black uppercase">"{selectedBriefing.message}"</p></div>
                <div className="flex items-center justify-between pt-6 border-t border-white/5 font-black uppercase font-black uppercase"><div className="flex items-center gap-3 font-black uppercase"><div className="h-8 w-8 rounded-full bg-[#1D546C]/20 flex items-center justify-center text-[#1D546C] font-black uppercase"><User size={16}/></div><span className="text-[11px] text-gray-400 tracking-widest leading-none font-black uppercase">From: {selectedBriefing.assignedBy?.name || 'Chair'}</span></div>
                    <div className="text-right leading-none tabular-nums font-black uppercase"><span className="text-xs text-[#1D546C] tracking-tighter font-black uppercase">{new Date(selectedBriefing.createdAt).toLocaleString()}</span></div></div>
            </div>
        </div>
      )}

      {/* Sync Log (Toast) */}
      {toast.show && (
        <div className="fixed bottom-12 right-12 z-[110] bg-[#0a0a0a]/95 backdrop-blur-xl border-[3.5px] border-[#1D546C] p-8 rounded-[40px] shadow-[0_0_100px_rgba(29,84,108,0.7)] flex items-center gap-8 animate-in slide-in-from-right-32 duration-600 font-black uppercase">
            <div className="h-16 w-16 rounded-[28px] bg-[#1D546C] flex items-center justify-center text-white shadow-lg transform rotate-12 font-black uppercase"><ClipboardList size={32}/></div>
            <div><h4 className="text-white text-2xl mb-1 tracking-tighter leading-none underline decoration-[#1D546C] decoration-4 font-black uppercase">Update Received</h4><p className="text-gray-400 text-[10px] tracking-[0.15em] italic opacity-80 font-black uppercase">{toast.message}</p></div>
            <button onClick={() => setToast((p) => ({ ...p, show: false }))} className="text-gray-700 hover:text-white p-3 hover:bg-white/10 rounded-2xl ml-6 transition-all active:scale-75 font-black uppercase font-black uppercase"><X size={24}/></button>
        </div>
      )}

      <div className="hidden"><Activity/><Layers/><ShieldCheck/><Cpu/><Zap/><Terminal/><Server/><Database/><Search/><Settings/><Package/><HardDrive/><Link/><Wind/><Sun/><Moon/><Navigation/><LifeBuoy/><Sunrise/><Sunset/><Moon/><Sun/><CloudLightning/><FileCode/><TermIcon/><DbIcon/><StorageIcon/><Network/><ProcIcon/><Send/><ArrowRight/></div>
    </div>
  );
};

export default EmployeeDashboard;