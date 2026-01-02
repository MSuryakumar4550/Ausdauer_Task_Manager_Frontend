import React, { 
  useState, 
  useEffect, 
  useRef 
} from 'react';
import { 
  Users, LogOut, Plus, Clock, Trash2, Edit3, Upload, RefreshCw, 
  Calendar, X, ChevronDown, CheckCircle, AlertOctagon, Send, 
  BatteryCharging, BatteryFull, BatteryLow, Minus, Check, Target, 
  Activity, Bell, Megaphone, RotateCcw, ShieldCheck, Loader2, Database, Layout, ListChecks, FileText, Save, LayoutList, User, ArrowRight, Inbox, CheckSquare
} from 'lucide-react';
import logoImg from '../assets/logoImg.jpg';
import api from '../api/axiosConfig';
import io from 'socket.io-client';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid 
} from 'recharts';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import TimeKeeper from 'react-timekeeper'; 

/**
 * ==================================================================================
 * AUSDAUER COMMAND TERMINAL - MASTER HUB (VERSION 26.1 - CRASH FIX & STATUS)
 * ==================================================================================
 * FIX LOG:
 * 1. CRASH FIXED: Resolved 'totalCount is not defined' error in getWorkloadMetrics.
 * 2. STATUS ADDED: Task cards now explicitly show "COMPLETED", "IN PROGRESS", etc.
 * 3. TEAM VISIBLE: Team section now loads correctly without errors.
 * 4. LOGIC: All 620+ lines of functionality preserved.
 * ==================================================================================
 */

const socket = io.connect("https://ausdauer-task-manager-backend.onrender.com");

// --- COMPONENT: COMPACT COMMENT INPUT ---
const TaskCommentInput = ({ taskId, onSend, isSyncing }) => {
  const [localText, setLocalText] = useState('');
  const handleSend = () => {
    if (!localText.trim() || isSyncing) return;
    onSend(taskId, localText);
    setLocalText(''); 
  };
  return (
    <div className="flex items-center gap-3 mb-3 font-black uppercase">
      <input 
        type="text" 
        placeholder="Type a comment..." 
        value={localText}
        disabled={isSyncing}
        onChange={(e) => setLocalText(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && handleSend()}
        className="flex-1 bg-transparent border-b border-[#111] text-[10px] font-black text-blue-400 outline-none focus:border-[#1D546C] py-1.5 transition-all placeholder:text-gray-800 normal-case disabled:opacity-50"
      />
      <button onClick={handleSend} disabled={isSyncing} className="bg-[#1D546C]/10 text-[#1D546C] p-2 rounded-full hover:bg-[#1D546C] hover:text-white transition-all font-black uppercase active:scale-90">
        {isSyncing ? <Loader2 size={12} className="animate-spin" /> : <Send size={12}/>}
      </button>
    </div>
  );
};

const ChairDashboard = ({ onLogout }) => {
  // STATE REPOSITORY
  const [activeTab, setActiveTab] = useState('myTasks'); 
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [chairProfile, setChairProfile] = useState(null);
  
  // PERSONAL NOTES STATE
  const [personalNote, setPersonalNote] = useState(localStorage.getItem('chair_personal_note') || '');
  const [isSavingNote, setIsSavingNote] = useState(false);

  // MODAL & UX STATES
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showAnnounceModal, setShowAnnounceModal] = useState(false);
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [modalConfig, setModalConfig] = useState({ show: false, type: '', title: '', message: '', targetId: null, theme: 'danger' });
  const [successModal, setSuccessModal] = useState({ show: false, title: '', message: '' });
  
  // SYSTEM INTEGRITY STATES
  const [isSyncing, setIsSyncing] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  // FORM DATA STATES
  const [newTask, setNewTask] = useState({ title: '', description: '', assignedTo: '', priority: 'Medium', deadline: new Date() });
  const [selectedTime, setSelectedTime] = useState('12:00 PM');
  const [newAnnouncement, setNewAnnouncement] = useState({ title: '', message: '' });
  const [newEmployee, setNewEmployee] = useState({ name: '', email: '', password: '', role: 'Employee', designation: '', mobile: '', photo: null });
  const [editingScoreId, setEditingScoreId] = useState(null);
  const [tempScore, setTempScore] = useState(0);

  const datePickerRef = useRef(null);

  // --- FAIL-SAFE INITIALIZATION ---
  useEffect(() => {
    const startTerminal = async () => {
      setIsInitializing(true);
      await fetchData();
      setIsInitializing(false);
    };
    startTerminal();
    
    socket.on("task_update", fetchData);
    socket.on("announcement_update", fetchAnnouncements);
    return () => { 
      socket.off("task_update"); 
      socket.off("announcement_update"); 
    };
  }, []);

  const fetchData = async () => {
    try {
      const meRes = await api.get('/users/me');
      if (!meRes.data || !meRes.data._id) throw new Error("Invalid Session");
      setChairProfile(meRes.data); 

      const taskRes = await api.get('/tasks');
      setTasks(Array.isArray(taskRes.data) ? taskRes.data : []);

      const empRes = await api.get('/users/leaderboard');
      // ENSURE EMPLOYEES ARRAY IS VALID
      setEmployees(Array.isArray(empRes.data) ? empRes.data : []);
      
      await fetchAnnouncements();
    } catch (err) { 
        console.error("TERMINAL CRASH PREVENTED: Auth failure.");
        localStorage.clear();
        onLogout(); 
    }
  };

  const fetchAnnouncements = async () => {
    try {
      const res = await api.get('/announcements');
      setAnnouncements(Array.isArray(res.data) ? res.data : []);
    } catch (err) { console.error("Broadcast Offline"); }
  };

  // --- NOTE SAVING LOGIC ---
  const handleSaveNote = () => {
      setIsSavingNote(true);
      localStorage.setItem('chair_personal_note', personalNote);
      setTimeout(() => setIsSavingNote(false), 800);
  };

  // --- ACTIONS ---
  const handleCreateTask = async () => {
    if (!newTask.title || !newTask.assignedTo) return alert("Please fill in all task details");
    setIsSyncing(true);
    try {
      const datePart = newTask.deadline.toISOString().split('T')[0];
      const mergedDeadline = new Date(`${datePart} ${selectedTime}`);
      
      await api.post('/tasks', { ...newTask, deadline: mergedDeadline });
      setShowTaskModal(false);
      setNewTask({ title: '', description: '', assignedTo: '', priority: 'Medium', deadline: new Date() });
      await fetchData();
      setSuccessModal({ show: true, title: 'Task Created', message: 'The task has been successfully assigned.' });
    } catch (err) { alert("Authorization Denied"); }
    finally { setIsSyncing(false); }
  };

  const handleCreateAnnouncement = async () => {
    if (!newAnnouncement.title) return alert("Heading Required");
    setIsSyncing(true);
    try {
      await api.post('/announcements', newAnnouncement);
      setShowAnnounceModal(false);
      setNewAnnouncement({ title: '', message: '' });
      await fetchAnnouncements();
      setSuccessModal({ show: true, title: 'Announcement Posted', message: 'Message sent to all users.' });
    } catch (err) {}
    finally { setIsSyncing(false); }
  };

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    setIsSyncing(true);
    try {
      const formData = new FormData();
      Object.keys(newEmployee).forEach(key => { if (newEmployee[key]) formData.append(key, newEmployee[key]); });
      await api.post('/users', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setShowEmployeeModal(false);
      setNewEmployee({ name: '', email: '', password: '', role: 'Employee', designation: '', mobile: '', photo: null });
      await fetchData(); 
    } catch (err) {}
    finally { setIsSyncing(false); }
  };

  const executeModalAction = async () => {
    setIsSyncing(true);
    try {
        if (modalConfig.type === 'DELETE_EMPLOYEE') await api.delete(`/users/${modalConfig.targetId}`);
        if (modalConfig.type === 'DELETE_TASK') await api.delete(`/tasks/${modalConfig.targetId}`);
        if (modalConfig.type === 'DELETE_ANNOUNCEMENT') await api.delete(`/announcements/${modalConfig.targetId}`);
        if (modalConfig.type === 'RESET_SCORES') await api.put('/users/reset-scores'); 
        
        await fetchData();
        setSuccessModal({ show: true, title: 'Action Completed', message: 'Changes saved successfully.' });
    } catch (err) { alert("Action Failed"); }
    finally { 
        setIsSyncing(false);
        setModalConfig({ ...modalConfig, show: false }); 
    }
  };

  const handleAddComment = async (taskId, text) => {
    setIsSyncing(true);
    try { await api.post(`/tasks/${taskId}/comments`, { text }); await fetchData(); } catch (err) {}
    finally { setIsSyncing(false); }
  };

  const saveScore = async (id) => {
    setIsSyncing(true);
    try { await api.put(`/users/score/${id}`, { score: tempScore }); setEditingScoreId(null); await fetchData(); } catch (err) {}
    finally { setIsSyncing(false); }
  };

  // --- FIXED: WORKLOAD METRICS LOGIC (No more crash) ---
  const getWorkloadMetrics = (employeeId) => {
    const totalTasks = tasks.filter(t => t.assignedTo?._id === employeeId).length;
    const completedTasks = tasks.filter(t => t.assignedTo?._id === employeeId && t.status === 'Completed').length;
    const activeCount = totalTasks - completedTasks;
    
    // Percentage for progress bar (inverse logic: more active tasks = higher bar)
    // Capped at 100% for 5 tasks
    const loadPercentage = Math.min((activeCount / 5) * 100, 100);
    
    let status = 'Available';
    let color = 'bg-green-500';
    let textColor = 'text-green-500';
    let icon = <BatteryCharging size={12}/>;

    if (activeCount >= 5) {
        status = 'Overloaded';
        color = 'bg-red-500';
        textColor = 'text-red-500';
        icon = <BatteryFull size={12}/>;
    } else if (activeCount >= 3) {
        status = 'Busy';
        color = 'bg-orange-500';
        textColor = 'text-orange-500';
        icon = <BatteryLow size={12}/>;
    } else if (totalTasks > 0 && activeCount === 0) {
        status = 'All Clear';
        color = 'bg-blue-500';
        textColor = 'text-blue-500';
        icon = <CheckSquare size={12}/>;
    }

    return { activeCount, totalTasks, completedTasks, loadPercentage, status, color, textColor, icon };
  };

  // --- RENDERING GUARD ---
  if (isInitializing) {
    return (
      <div className="h-screen w-full bg-black flex flex-col items-center justify-center font-black text-blue-500 uppercase tracking-[0.5em]">
        <Loader2 className="animate-spin mb-4" size={32} />
        <span className="text-xs">Loading System...</span>
      </div>
    );
  }

  // CRITICAL GUARD
  if (!chairProfile) {
    return <div className="h-screen w-full bg-black flex items-center justify-center font-black text-gray-500 uppercase tracking-widest"><RefreshCw className="animate-spin mr-4"/> Connection Lost...</div>;
  }

  // --- COMPACT TASK CARD ---
  const TaskCard = ({ task }) => (
    <div className={`flex flex-col rounded-[25px] border bg-[#0f0f0f] p-5 hover:border-[#1D546C] transition-all relative overflow-hidden border-t-[6px] shadow-lg ${task.status === 'Completed' ? 'border-green-500/30' : 'border-[#1A3D64]'}`}>
      <div className="flex justify-between items-start mb-4 gap-4 font-black uppercase">
        <div className="flex gap-4 items-center">
          <div className={`h-8 w-1 rounded-full ${task.status === 'Completed' ? 'bg-green-500' : 'bg-[#1D546C]'}`}></div>
          <div><h3 className="text-lg text-white tracking-tighter leading-none">{task.title}</h3>
            
            {/* DUAL ASSIGNMENT DISPLAY (FROM -> TO) */}
            <div className="flex gap-2 mt-2 text-[8px] text-gray-500 tracking-widest italic font-black items-center">
              <span className="flex items-center gap-1"><User size={10} className="text-blue-500"/> {task.assignedBy?.name || 'ADMIN'}</span>
              <ArrowRight size={8} className="text-gray-600"/>
              <span className="flex items-center gap-1"><Users size={10} className="text-green-500"/> {task.assignedTo?.name || 'UNKNOWN'}</span>
              <span className="ml-2 flex items-center gap-1 font-mono text-gray-400"><Clock size={10}/> {new Date(task.deadline).toLocaleString()}</span>
            </div>

          </div>
        </div>
        <button onClick={() => setModalConfig({ show: true, type: 'DELETE_TASK', targetId: task._id, title: 'Delete Task?', message: 'Remove this task?', theme: 'danger' })} className="p-2 rounded-lg bg-[#111] border border-[#333] text-gray-700 hover:text-red-500 transition-all active:scale-75 font-black"><Trash2 size={12}/></button>
      </div>

      {/* --- EXPLICIT STATUS BADGE (FEATURE ADDED) --- */}
      <div className="flex items-center gap-2 mb-4">
        <span className={`px-3 py-1 rounded-full text-[9px] border font-black uppercase ${
            task.status === 'Completed' ? 'bg-green-900/40 border-green-500 text-green-400' :
            task.status === 'In Progress' ? 'bg-blue-900/40 border-blue-500 text-blue-400' :
            'bg-yellow-900/40 border-yellow-500 text-yellow-400'
        }`}>
            {task.status || 'PENDING'}
        </span>
      </div>

      <p className="text-xs text-gray-400 mb-4 font-bold italic normal-case tracking-tight font-black line-clamp-2">"{task.description}"</p>
      <div className="bg-[#050505] rounded-[20px] p-4 border border-[#222]">
        <TaskCommentInput taskId={task._id} onSend={handleAddComment} isSyncing={isSyncing} />
        <div className="max-h-24 overflow-y-auto space-y-2 pr-2 custom-scrollbar font-black uppercase">
            {(task.comments || []).slice().reverse().map((c, i) => (
                <div key={i} className={`text-[9px] border-l-2 pl-3 py-1.5 ${c.role === 'Chair' ? 'border-blue-500 bg-blue-500/5' : 'border-green-500 bg-green-500/5'}`}>
                    <div className="flex justify-between items-center mb-1 font-black uppercase"><span className={c.role === 'Chair' ? 'text-blue-400' : 'text-green-400'}>{c.userName}</span><span className="text-gray-700">{new Date(c.createdAt).toLocaleTimeString()}</span></div>
                    <p className="text-gray-300 normal-case font-bold line-clamp-1">"{c.text}"</p>
                </div>
            ))}
        </div>
      </div>
    </div>
  );

  // --- TEAM FILTER LOGIC ---
  // Show everyone who is NOT the current logged-in Chair
  const visibleTeam = employees.filter(e => e._id !== chairProfile?._id);

  return (
    <div className="min-h-screen w-full bg-[#050505] font-sans text-white pb-10 overflow-x-hidden uppercase font-black">
      
      {/* NAVBAR */}
      <nav className="flex items-center justify-between border-b border-[#1A3D64] bg-[#0a0a0a]/90 px-6 py-3 sticky top-0 z-40 backdrop-blur-xl h-[60px]">
        <div className="flex items-center gap-3">
          <div className="rounded-lg border border-[#1D546C] p-1 shadow-[0_0_10px_#1D546C] font-black"><img src={logoImg} alt="Logo" className="h-6 w-6 rounded-md" /></div>
          <h1 className="text-base italic tracking-widest font-black">AUSDAUER GROUPS</h1>
        </div>
        <div className="flex bg-[#111] p-1 rounded-lg border border-[#1A3D64] font-black gap-1 overflow-x-auto max-w-[60vw]">
          {[
            { id: 'myTasks', label: 'My Tasks', icon: <Target size={12}/> }, 
            { id: 'overview', label: 'All Tasks', icon: <ListChecks size={12}/> }, 
            { id: 'team', label: 'Team', icon: <Activity size={12}/> }, 
            { id: 'announcements', label: 'Announcements', icon: <Bell size={12}/> },
            { id: 'notes', label: 'My Notes', icon: <FileText size={12}/> }
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-4 py-1.5 text-[9px] rounded-md transition-all uppercase font-black whitespace-nowrap ${activeTab === tab.id ? 'bg-[#1D546C] text-white shadow-md' : 'text-gray-600 hover:text-white'}`}>
                <span className="flex items-center gap-2">{tab.icon} {tab.label}</span>
            </button>
          ))}
        </div>
        <button onClick={onLogout} className="flex items-center gap-2 rounded-lg border border-red-900/30 bg-red-900/10 px-3 py-1.5 text-[9px] text-red-500 hover:bg-red-500 hover:text-white transition-all font-black uppercase"><LogOut size={12} /> Exit</button>
      </nav>

      <div className="p-4 md:p-6 max-w-6xl mx-auto font-black uppercase">
        
        {/* VIEW: MY TASKS */}
        {activeTab === 'myTasks' && (
          <div className="animate-in slide-in-from-bottom duration-500 font-black">
            <div className="mb-8 flex justify-between items-end border-b border-white/5 pb-6">
              <div><h2 className="text-3xl font-black text-white tracking-tighter uppercase">My Tasks</h2><p className="text-blue-500 mt-1 text-[9px] tracking-[0.3em] italic uppercase font-black">Tasks assigned to you</p></div>
              <button onClick={() => setShowTaskModal(true)} className="flex items-center gap-2 rounded-xl bg-white text-black px-5 py-2.5 text-xs font-black hover:scale-105 transition-all shadow-lg uppercase"><Plus size={14} /> New Task</button>
            </div>
            
            {/* EMPTY STATE HANDLING */}
            {tasks.filter(t => t.assignedTo?._id === chairProfile?._id).length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 font-black">
                    {tasks.filter(t => t.assignedTo?._id === chairProfile?._id).map(t => <TaskCard key={t._id} task={t} />)}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-20 opacity-50">
                    <div className="h-20 w-20 rounded-full bg-[#111] border border-[#222] flex items-center justify-center text-gray-700 mb-6 shadow-inner"><Inbox size={40}/></div>
                    <h3 className="text-xl font-black text-gray-500 tracking-[0.3em] uppercase">No Assigned Tasks</h3>
                    <p className="text-[10px] text-gray-600 mt-2 uppercase tracking-wider">You are currently clear of directives</p>
                </div>
            )}
          </div>
        )}

        {/* VIEW: ALL TASKS */}
        {activeTab === 'overview' && (
          <div className="animate-in slide-in-from-bottom duration-500 font-black">
            <div className="mb-8 flex flex-col border-b border-white/5 pb-6">
              <h2 className="text-3xl font-black text-white tracking-tighter uppercase">All Tasks</h2>
              <p className="text-gray-600 mt-1 text-[9px] tracking-[0.3em] italic uppercase font-black">View all active and completed tasks</p>
            </div>
            
            {/* EMPTY STATE HANDLING */}
            {tasks.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 font-black">
                  {tasks.map(t => <TaskCard key={t._id} task={t} />)}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-20 opacity-50">
                    <div className="h-20 w-20 rounded-full bg-[#111] border border-[#222] flex items-center justify-center text-gray-700 mb-6 shadow-inner"><ListChecks size={40}/></div>
                    <h3 className="text-xl font-black text-gray-500 tracking-[0.3em] uppercase">No Global Tasks</h3>
                    <p className="text-[10px] text-gray-600 mt-2 uppercase tracking-wider">Operations Log is Empty</p>
                </div>
            )}
          </div>
        )}

        {/* VIEW: TEAM MEMBERS */}
        {activeTab === 'team' && (
          <div className="animate-in slide-in-from-bottom duration-500 font-black">
            <div className="mb-8 flex justify-between items-center font-black">
              <div><h2 className="text-3xl text-white tracking-tighter font-black uppercase">Team Members</h2><p className="text-gray-600 text-[9px] tracking-[0.3em] italic mt-1 font-black uppercase">Manage Members & Scores</p></div>
              <div className="flex gap-2">
                 <button onClick={() => setModalConfig({ show: true, type: 'RESET_SCORES', title: 'Reset Scores?', message: 'Reset all points to zero?', theme: 'danger' })} className="flex items-center gap-2 rounded-lg border border-red-500/40 px-4 py-2 text-[9px] text-red-500 font-black hover:bg-red-500 hover:text-white transition-all uppercase"><RotateCcw size={12} /> Reset</button>
                 <button onClick={() => setShowEmployeeModal(true)} className="flex items-center gap-2 rounded-lg bg-[#1D546C] px-4 py-2 text-[9px] text-white font-black hover:invert transition-all shadow-md uppercase"><Plus size={12} /> Add</button>
              </div>
            </div>
            
            <div className="mb-10 h-[250px] rounded-[30px] border border-[#1A3D64] bg-[#0f0f0f] p-6 shadow-xl font-black">
                {visibleTeam && visibleTeam.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    {/* FIXED: Filter only Employees for chart, exclude Chair */}
                    <BarChart data={employees.filter(e => e.role?.toLowerCase() === 'employee')}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" vertical={false} />
                        <XAxis dataKey="name" tick={{fill: '#444', fontSize: 9}} axisLine={false} />
                        <YAxis tick={{fill: '#444', fontSize: 9}} axisLine={false} />
                        <Tooltip contentStyle={{backgroundColor: '#000', border: '1px solid #1D546C', borderRadius: '8px', fontSize: '10px'}} />
                        <Bar dataKey="score" fill="#1D546C" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-gray-600 text-xs">NO DATA AVAILABLE</div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 font-black">
              {visibleTeam.map(emp => {
                const metrics = getWorkloadMetrics(emp._id);
                return (
                    <div key={emp._id} className={`relative rounded-[30px] border ${emp._id === chairProfile?._id ? 'border-blue-500 shadow-blue-900/20' : 'border-[#1A3D64]'} bg-[#0f0f0f] p-6 flex flex-col items-center gap-4 group border-t-[6px] shadow-xl hover:border-[#1D546C] transition-all`}>
                        <div className={`h-16 w-16 rounded-full border-2 ${metrics.status === 'Overloaded' ? 'border-red-500' : metrics.status === 'All Clear' ? 'border-blue-500' : 'border-[#1D546C]'} overflow-hidden p-0.5 shadow-glow-blue`}>
                            {emp.photo ? <img src={`http://localhost:5000${emp.photo}`} className="h-full w-full object-cover rounded-full font-black" alt="" /> : <span className="flex h-full w-full items-center justify-center text-3xl font-black text-gray-700 uppercase">{emp.name[0]}</span>}
                        </div>
                        <div className="text-center w-full font-black">
                            <h3 className="text-base text-white uppercase mb-1">{emp.name} {emp._id === chairProfile?._id && "(YOU)"}</h3>
                            <p className="text-[8px] tracking-[0.2em] mb-4 italic text-gray-500 uppercase font-black">{emp.designation || 'MEMBER'}</p>
                            
                            {/* SCORE EDITING: ONLY FOR EMPLOYEES (NOT CHAIR) */}
                            {emp.role?.toLowerCase() === 'employee' && (
                              <div className="w-full mb-4 font-black uppercase">
                                {editingScoreId === emp._id ? (
                                    <div className="flex items-center justify-between bg-[#0a0a0a] border border-[#1D546C] rounded-[15px] p-1.5 animate-in zoom-in font-black">
                                      <button onClick={() => setTempScore(prev => Number(prev) - 10)} className="p-1.5 text-red-500 font-black"><Minus size={14}/></button>
                                      <input type="number" autoFocus className="bg-transparent text-white text-center text-lg outline-none w-12 font-black tabular-nums" value={tempScore} onChange={e => setTempScore(e.target.value)} />
                                      <button onClick={() => setTempScore(prev => Number(prev) + 10)} className="p-1.5 text-green-500 font-black"><Plus size={14}/></button>
                                      <button onClick={() => saveScore(emp._id)} className="bg-[#1D546C] p-1.5 rounded-lg text-white font-black active:scale-90"><Check size={14}/></button>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between bg-[#050505] p-3 rounded-[20px] border border-[#222] hover:border-blue-500 transition-all cursor-pointer group/score" onClick={() => { setEditingScoreId(emp._id); setTempScore(emp.score); }}>
                                      <div className="flex flex-col items-start leading-none font-black"><span className="text-[8px] text-gray-600 tracking-widest mb-1 opacity-50 uppercase italic font-black">Points</span><span className="text-lg text-white tabular-nums tracking-tighter font-black">{emp.score}</span></div>
                                      <div className="p-2 bg-[#111] rounded-lg text-gray-600 font-black"><Edit3 size={14}/></div>
                                    </div>
                                )}
                              </div>
                            )}

                            {/* WORKLOAD METRICS */}
                            <div className="bg-[#050505] rounded-[20px] p-3 border border-[#222] w-full flex flex-col gap-2 font-black uppercase">
                                <div className="flex justify-between items-center w-full">
                                    <div className={`p-1.5 px-3 rounded-full ${metrics.color} text-white shadow-md text-[8px] tracking-widest`}>
                                        {metrics.status}
                                    </div>
                                    <div className="text-gray-500 text-[8px]">{metrics.activeCount} Pending</div>
                                </div>
                                <div className="w-full h-1 bg-[#111] rounded-full overflow-hidden shadow-inner"><div className={`h-full ${metrics.color} transition-all duration-1000`} style={{width: `${metrics.loadPercentage}%`}}></div></div>
                            </div>
                        </div>
                        {emp._id !== chairProfile?._id && (
                            <button onClick={() => setModalConfig({ show: true, type: 'DELETE_EMPLOYEE', targetId: emp._id, title: 'Remove Member?', message: 'Confirm removal?', theme: 'danger' })} className="absolute top-6 right-6 text-gray-800 hover:text-red-500 active:scale-50 transition-all opacity-20 group-hover:opacity-100"><Trash2 size={16} /></button>
                        )}
                    </div>
                );
              })}
            </div>
          </div>
        )}

        {/* --- ANNOUNCEMENTS --- */}
        {activeTab === 'announcements' && (
          <div className="animate-in slide-in-from-bottom duration-500 font-black">
            <div className="mb-10 flex justify-between items-center border-b border-white/5 pb-8">
                <h2 className="text-3xl font-black text-white tracking-tighter uppercase">Announcements</h2>
                <button onClick={() => setShowAnnounceModal(true)} className="flex items-center gap-2 rounded-[20px] bg-[#1D546C] px-6 py-2.5 text-xs text-white font-black hover:scale-105 active:scale-95 shadow-xl transition-all font-black uppercase tracking-widest"><Plus size={14} /> Post New</button>
            </div>
            <div className="grid gap-6 font-black uppercase">
               {announcements.map((ann) => (
                  <div key={ann._id} className="relative rounded-[40px] border-l-[8px] border-l-[#1D546C] bg-[#0f0f0f] p-8 shadow-xl overflow-hidden font-black">
                    <button onClick={() => setModalConfig({ show: true, type: 'DELETE_ANNOUNCEMENT', targetId: ann._id, title: 'Delete Post?', message: 'Remove announcement?', theme: 'danger' })} className="absolute top-8 right-8 text-gray-800 hover:text-red-500 opacity-100 transition-all cursor-pointer z-50 p-2 rounded-full bg-[#111] hover:bg-red-500/20"><Trash2 size={18}/></button>
                    <h3 className="text-2xl font-black text-white mb-4 tracking-tighter underline decoration-[#1D546C] decoration-4 underline-offset-[6px] italic uppercase font-black">{ann.title}</h3>
                    <p className="text-gray-400 text-xs leading-relaxed font-bold italic normal-case font-black uppercase opacity-90 tracking-tight">"{ann.message}"</p>
                    <div className="mt-6 pt-4 border-t border-white/5 text-[9px] text-gray-700 font-black flex items-center gap-2 italic tracking-widest"><Clock size={12}/> POSTED: {new Date(ann.createdAt).toLocaleString()}</div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* --- MY NOTES --- */}
        {activeTab === 'notes' && (
            <div className="animate-in slide-in-from-bottom duration-500 font-black h-full flex flex-col">
                <div className="mb-8 flex justify-between items-center border-b border-white/5 pb-6">
                    <div><h2 className="text-3xl font-black text-white tracking-tighter uppercase">My Notes</h2><p className="text-gray-600 mt-1 text-[9px] tracking-[0.3em] italic uppercase font-black">Private Scratchpad</p></div>
                    <div className="flex items-center gap-2 text-[#1D546C] font-black uppercase tracking-widest text-[9px]">
                        {isSavingNote ? <><RefreshCw className="animate-spin" size={12}/> SAVING...</> : <><Save size={12}/> SAVED</>}
                    </div>
                </div>
                <div className="flex-1 bg-[#0f0f0f] rounded-[40px] border border-[#1A3D64] p-6 shadow-inner relative overflow-hidden">
                    <textarea 
                        className="w-full h-[500px] bg-transparent text-gray-300 font-mono text-sm leading-relaxed outline-none resize-none p-2 placeholder:text-gray-800"
                        placeholder="// Write your personal notes here..."
                        value={personalNote}
                       onChange={(e) => { 
                      const val = e.target.value; 
                      setPersonalNote(val); 
                      localStorage.setItem('chair_personal_note', val); // Saves the latest character immediately
                      setIsSavingNote(true);
                      setTimeout(() => setIsSavingNote(false), 800);
                  }}
                    />
                    <div className="absolute bottom-6 right-6 opacity-20 pointer-events-none"><FileText size={80}/></div>
                </div>
            </div>
        )}

      </div>

      {/* --- COMPACT MODALS --- */}
      {showTaskModal && (
        <div className="fixed inset-0 z-[100] bg-black/99 backdrop-blur-3xl flex items-center justify-center p-4 animate-in fade-in duration-300 font-black uppercase">
            <div className="w-full max-w-4xl rounded-[50px] border border-[#1D546C]/40 bg-[#0a0a0a] p-10 flex flex-col lg:flex-row gap-10 shadow-4xl relative">
                <button onClick={() => setShowTaskModal(false)} className="absolute top-6 right-6 text-gray-600 hover:text-white p-2 bg-[#111] rounded-full transition-all font-black"><X size={20}/></button>
                <div className="hidden lg:flex flex-col items-center justify-center bg-[#050505] p-6 rounded-[40px] border border-[#111] shadow-2xl font-black">
                   <p className="text-[9px] tracking-[0.5em] mb-6 text-blue-500 font-black uppercase animate-pulse">Set Time</p>
                   <div className="scale-100 hover:scale-110 transition-transform duration-500" style={{ filter: 'invert(1) hue-rotate(180deg) brightness(1.5)' }}>
                      <TimeKeeper time={selectedTime} onChange={(t) => setSelectedTime(t.formatted12)} />
                   </div>
                   <div className="mt-8 text-3xl font-black tracking-tighter text-white font-mono uppercase">{selectedTime}</div>
                </div>
                <div className="flex-1 space-y-6 font-black">
                   <h2 className="text-3xl text-white tracking-tighter uppercase font-black">Create Task</h2>
                   <input placeholder="Task Title..." className="w-full rounded-[20px] bg-[#050505] border border-[#222] p-4 text-sm text-white outline-none focus:border-[#1D546C] shadow-inner font-black uppercase" onChange={e => setNewTask({...newTask, title: e.target.value})} />
                   <textarea placeholder="Task Description..." className="w-full rounded-[25px] bg-[#050505] border border-[#222] p-4 text-sm text-white outline-none focus:border-[#1D546C] h-32 resize-none normal-case shadow-inner font-black italic" onChange={e => setNewTask({...newTask, description: e.target.value})} />
                   <div className="relative w-full rounded-[20px] bg-[#050505] border border-[#222] p-4 flex items-center gap-3 cursor-pointer hover:border-[#1D546C] transition-all group">
                        <Calendar size={18} className="text-[#1D546C] group-hover:text-white transition-colors" />
                        <div className="flex-1">
                            <DatePicker 
                                selected={newTask.deadline} 
                                onChange={(date) => setNewTask({...newTask, deadline: date})} 
                                className="bg-transparent text-white font-black text-xs w-full outline-none placeholder:text-gray-600" 
                                wrapperClassName="w-full"
                                placeholderText="Select Due Date"
                                onKeyDown={(e) => e.preventDefault()} 
                            />
                        </div>
                        <ChevronDown size={16} className="text-gray-600 group-hover:text-white transition-colors"/>
                   </div>

                   <div className="grid grid-cols-2 gap-4 uppercase font-black">
                       <select className="w-full rounded-[20px] bg-[#050505] border border-[#222] p-4 text-[10px] text-white outline-none focus:border-[#1D546C] cursor-pointer appearance-none shadow-xl uppercase font-black" onChange={e => setNewTask({...newTask, assignedTo: e.target.value})}>
                          <option value="">Select Member</option>{employees.map(e => <option key={e._id} value={e._id}>{e.name} ({e.role})</option>)}
                       </select>
                       <select className="w-full rounded-[20px] bg-[#050505] border border-[#222] p-4 text-[10px] text-white outline-none focus:border-[#1D546C] cursor-pointer appearance-none shadow-xl uppercase font-black" onChange={e => setNewTask({...newTask, priority: e.target.value})}>
                          <option>Low</option><option>Medium</option><option>High</option><option>Emergency</option>
                       </select>
                   </div>
                   <button onClick={handleCreateTask} disabled={isSyncing} className="w-full rounded-[25px] bg-[#1D546C] py-4 font-black text-sm uppercase text-white hover:bg-white hover:text-black transition-all shadow-4xl flex items-center justify-center gap-3">
                      {isSyncing ? <RefreshCw className="animate-spin" size={18} /> : "Create Task"}
                   </button>
                </div>
            </div>
        </div>
      )}

      {showAnnounceModal && (
        <div className="fixed inset-0 z-[110] overflow-y-auto bg-black/99 backdrop-blur-3xl animate-in fade-in duration-300 font-black uppercase">
          <div className="flex min-h-full items-center justify-center p-4 font-black uppercase">
            <div className="w-full max-w-2xl rounded-[50px] border border-[#1D546C] bg-[#0a0a0a] p-10 shadow-4xl relative ring-1 ring-white/10 font-black uppercase font-black">
                <button onClick={() => setShowAnnounceModal(false)} className="absolute top-8 right-8 text-gray-600 hover:text-white p-2 font-black uppercase"><X size={20}/></button>
                <h2 className="mb-8 text-3xl text-white tracking-tighter underline decoration-[#1D546C] decoration-[6px] underline-offset-[10px] font-black uppercase">Post Announcement</h2>
                <div className="space-y-6 font-black uppercase">
                    <input placeholder="Subject..." className="w-full rounded-[20px] bg-[#050505] border border-[#222] p-4 text-sm text-white outline-none focus:border-[#1D546C] font-black uppercase shadow-inner" onChange={e => setNewAnnouncement({...newAnnouncement, title: e.target.value})} />
                    <textarea placeholder="Message..." className="w-full rounded-[25px] bg-[#050505] border border-[#222] p-4 text-sm text-white outline-none focus:border-[#1D546C] h-32 resize-none normal-case font-black uppercase shadow-inner" onChange={e => setNewAnnouncement({...newAnnouncement, message: e.target.value})} />
                    <button onClick={handleCreateAnnouncement} className="w-full rounded-[25px] bg-[#1D546C] py-4 font-black text-sm uppercase text-white hover:bg-[#256681] active:scale-95 transition-all shadow-4xl font-black uppercase tracking-[0.2em]">
                        {isSyncing ? <RefreshCw className="animate-spin mx-auto" size={18} /> : "Post Now"}
                    </button>
                </div>
            </div>
          </div>
        </div>
      )}

      {showEmployeeModal && (
        <div className="fixed inset-0 z-[110] overflow-y-auto bg-black/99 backdrop-blur-3xl animate-in fade-in duration-300 font-black uppercase font-black uppercase font-black uppercase">
          <div className="flex min-h-full items-center justify-center p-4 font-black uppercase">
            <div className="w-full max-w-3xl rounded-[50px] border border-[#1D546C] bg-[#0a0a0a] p-10 shadow-4xl relative ring-1 ring-white/10 font-black">
                <button onClick={() => setShowEmployeeModal(false)} className="absolute top-8 right-8 text-gray-500 hover:text-white font-black uppercase"><X size={20}/></button>
                <h2 className="mb-8 text-3xl text-white tracking-tighter underline decoration-[#1D546C] decoration-[6px] underline-offset-[10px] font-black uppercase">Add Member</h2>
                <form onSubmit={handleAddEmployee} className="grid grid-cols-1 md:grid-cols-2 gap-8 font-black uppercase font-black">
                   <div className="flex flex-col gap-6 font-black uppercase font-black uppercase">
                      <div className="flex gap-2 p-1.5 bg-[#050505] rounded-[20px] border border-[#222] font-black uppercase">
                        {['Employee', 'Chair'].map(r => ( <button key={r} type="button" onClick={() => setNewEmployee({...newEmployee, role: r})} className={`flex-1 py-3 rounded-[15px] text-[9px] tracking-[0.2em] font-black transition-all ${newEmployee.role === r ? 'bg-[#1D546C] text-white shadow-2xl' : 'text-gray-600'}`}>{r === 'Chair' ? 'CHAIR' : 'MEMBER'}</button> ))}
                      </div>
                      <label className="group block aspect-square w-full rounded-[40px] border-4 border-dashed border-[#222] flex flex-col items-center justify-center text-gray-600 hover:border-[#1D546C] cursor-pointer transition-all relative overflow-hidden font-black uppercase">
                         {newEmployee.photo ? <img src={URL.createObjectURL(newEmployee.photo)} className="absolute inset-0 h-full w-full object-cover" /> : <><Upload size={32} className="mb-3 group-hover:scale-110"/><span className="text-[9px] tracking-[0.4em] font-black uppercase">Upload Photo</span></>}
                         <input type="file" className="hidden" onChange={e => setNewEmployee({...newEmployee, photo: e.target.files[0]})} />
                      </label>
                   </div>
                   <div className="space-y-3 font-black uppercase">
                      <div className="space-y-1"><label className="text-[8px] text-gray-600 uppercase ml-2 font-black">Full Name</label><input required placeholder="Name" className="w-full rounded-[15px] bg-[#050505] border border-[#222] p-3 text-xs text-white font-black uppercase outline-none focus:border-[#1D546C]" onChange={e => setNewEmployee({...newEmployee, name: e.target.value})} /></div>
                      <div className="space-y-1"><label className="text-[8px] text-gray-600 uppercase ml-2 font-black">Job Title</label><input required placeholder="Designation" className="w-full rounded-[15px] bg-[#050505] border border-[#222] p-3 text-xs text-white font-black uppercase outline-none focus:border-[#1D546C]" onChange={e => setNewEmployee({...newEmployee, designation: e.target.value})} /></div>
                      <div className="space-y-1"><label className="text-[8px] text-gray-600 uppercase ml-2 font-black">Email</label><input required type="email" placeholder="Email" className="w-full rounded-[15px] bg-[#050505] border border-[#222] p-3 text-xs text-white font-black uppercase outline-none focus:border-[#1D546C]" onChange={e => setNewEmployee({...newEmployee, email: e.target.value})} /></div>
                      <div className="space-y-1"><label className="text-[8px] text-gray-600 uppercase ml-2 font-black">Phone</label><input required placeholder="Phone" className="w-full rounded-[15px] bg-[#050505] border border-[#222] p-3 text-xs text-white font-black uppercase outline-none focus:border-[#1D546C]" onChange={e => setNewEmployee({...newEmployee, mobile: e.target.value})} /></div>
                      <div className="space-y-1"><label className="text-[8px] text-gray-600 uppercase ml-2 font-black">Password</label><input required type="password" placeholder="Password" className="w-full rounded-[15px] bg-[#050505] border border-[#222] p-3 text-xs text-white font-black uppercase outline-none focus:border-[#1D546C]" onChange={e => setNewEmployee({...newEmployee, password: e.target.value})} /></div>
                      <button type="submit" className="w-full rounded-[25px] bg-green-600 py-4 font-black text-xs uppercase tracking-[0.3em] text-white hover:bg-green-500 active:scale-95 transition-all mt-3 shadow-3xl">
                          {isSyncing ? <RefreshCw className="animate-spin mx-auto" size={18} /> : "Save Member"}
                      </button>
                   </div>
                </form>
            </div>
          </div>
        </div>
      )}

      {/* ACTION MODAL */}
      {modalConfig.show && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/99 backdrop-blur-3xl p-6 font-black uppercase">
            <div className={`bg-[#0a0a0a] border-4 ${modalConfig.theme === 'danger' ? 'border-red-500 shadow-glow' : 'border-yellow-500'} p-10 rounded-[50px] max-w-md w-full text-center ring-1 ring-white/10 font-black uppercase font-black`}>
                <div className="flex justify-center mb-8 font-black uppercase"><AlertOctagon size={64} className={modalConfig.theme === 'danger' ? 'text-red-500 animate-pulse' : 'text-yellow-500'}/></div>
                <h3 className="text-3xl text-white mb-4 uppercase tracking-tighter leading-none font-black">{modalConfig.title}</h3>
                <p className="text-gray-500 text-xs mb-8 italic font-black uppercase">"{modalConfig.message}"</p>
                <div className="flex gap-4 font-black uppercase font-black uppercase"><button onClick={() => setModalConfig({ ...modalConfig, show: false })} className="flex-1 py-4 rounded-xl border-2 border-[#333] text-gray-600 hover:text-white transition-all font-black uppercase">Cancel</button><button onClick={executeModalAction} className={`flex-1 py-4 rounded-xl font-black uppercase text-[10px] tracking-[0.2em] text-white active:scale-95 shadow-2xl ${modalConfig.theme === 'danger' ? 'bg-red-600 hover:bg-red-500 shadow-red-900/30' : 'bg-yellow-600 hover:bg-yellow-500 shadow-yellow-900/30'}`}>
                {isSyncing ? <RefreshCw className="animate-spin mx-auto" size={16} /> : "Confirm"}
                </button></div>
            </div>
        </div>
      )}

      {successModal.show && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/99 backdrop-blur-3xl p-6 font-black uppercase">
            <div className="bg-[#0a0a0a] border border-[#1D546C] p-12 rounded-[60px] max-w-sm w-full text-center flex flex-col items-center shadow-4xl animate-in zoom-in">
                <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center mb-8 border-2 border-green-500/30 shadow-[0_0_20px_rgba(34,197,94,0.3)]"><CheckCircle className="text-green-500" size={40} /></div>
                <h3 className="text-2xl font-black text-white mb-4 tracking-tighter uppercase font-black uppercase">{successModal.title}</h3>
                <p className="text-gray-500 mb-8 text-xs italic uppercase font-black uppercase font-black">"{successModal.message}"</p>
                <button onClick={() => setSuccessModal({ ...successModal, show: false })} className="w-full bg-[#1D546C] py-4 rounded-[25px] font-black text-[10px] uppercase tracking-[0.4em] text-white active:scale-95 transition-all font-black uppercase font-black uppercase font-black uppercase">Okay</button>
            </div>
        </div>
      )}

      {/* ICON DATA BANK */}
      <div className="hidden font-black uppercase font-black uppercase font-black uppercase"><Activity/><Layout/><Database/><Bell/><ShieldCheck/><Edit3/><Trash2/><Plus/><Users/><Megaphone/><RotateCcw/><ChevronDown/><Calendar/><Clock/><Loader2/><X/><CheckCircle/><AlertOctagon/><Send/><LayoutList/></div>

    </div>
  );
};

export default ChairDashboard;