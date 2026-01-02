import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Lock, User, AlertCircle, X, Mail, ShieldCheck, ShieldAlert, CheckCircle2 } from 'lucide-react';
import logoImg from './assets/logoImg.jpg'; 
import ChairDashboard from './pages/ChairDashboard';
import EmployeeDashboard from './pages/EmployeeDashboard';
import api from './api/axiosConfig';

/**
 * ==================================================================================
 * AUSDAUER MASTER TERMINAL - CORE ACCESS ENGINE (VERSION 3.4.0 - CUSTOM POPUP)
 * ==================================================================================
 * PATCH LOG:
 * 1. CUSTOM MODALS: Replaced legacy alert() calls with professional UI popups.
 * 2. SPACE STRIPPER: Automatically removes formatting gaps from OTP input.
 * 3. IDENTITY SYNC: Fully maps user session data for dynamic dashboard sync.
 * ==================================================================================
 */

function App() {
  const [showPassword, setShowPassword] = useState(false);
  const [userRole, setUserRole] = useState(null); 
  const [email, setEmail] = useState(''); 
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // --- OTP & CUSTOM POPUP STATE ---
  const [showForgot, setShowForgot] = useState(false);
  const [otpStep, setOtpStep] = useState(1); 
  const [forgotEmail, setForgotEmail] = useState('');
  const [otpValue, setOtpValue] = useState('');
  
  // Custom Popup Config
  const [popup, setPopup] = useState({ show: false, title: '', message: '', type: 'error' });

  useEffect(() => {
    const role = localStorage.getItem('role');
    const token = localStorage.getItem('token');
    if (role && token) setUserRole(role);
  }, []);

  const triggerPopup = (title, message, type = 'error') => {
    setPopup({ show: true, title, message, type });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await api.post('/users/login', { email, password });
      const { role, token, name } = response.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('role', role);
      localStorage.setItem('userName', name);
      
      setUserRole(role);
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid Email or Password');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear(); 
    setUserRole(null);
  };

  const handleRequestOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const cleanEmail = forgotEmail.trim().toLowerCase();
      await api.post('/users/forgot-password', { email: cleanEmail });
      setOtpStep(2); 
      setOtpValue(''); 
      setLoading(false);
    } catch (err) {
      setLoading(false);
      // CUSTOM POPUP REPLACEMENT FOR ALERT
      triggerPopup("Identity Failure", err.response?.data?.message || "Email not found in database.", "error");
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // SPACE STRIPPER: Removes all formatting gaps
      const rawOTP = String(otpValue).replace(/\s+/g, ''); 
      const cleanEmail = forgotEmail.trim().toLowerCase();

      const response = await api.post('/users/verify-otp', { email: cleanEmail, otp: rawOTP });
      const { role, token, name } = response.data;

      localStorage.setItem('token', token);
      localStorage.setItem('role', role);
      localStorage.setItem('userName', name);
      
      setUserRole(role);
      setShowForgot(false);
      setOtpStep(1);
    } catch (err) {
      setLoading(false);
      // CUSTOM POPUP REPLACEMENT FOR ALERT
      triggerPopup("Security Mismatch", "The verification code is invalid or has expired.", "error");
    } finally {
      setLoading(false);
    }
  };

  const closeForgotModal = () => {
    setShowForgot(false);
    setOtpStep(1);
    setForgotEmail('');
    setOtpValue('');
  };

  const safeRole = userRole ? userRole.toLowerCase() : '';

  if (safeRole === 'chair') return <ChairDashboard onLogout={handleLogout} />;
  if (safeRole === 'employee') return <EmployeeDashboard onLogout={handleLogout} />;

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-[#000000] font-sans overflow-hidden selection:bg-[#1D546C] selection:text-white uppercase font-black relative">
      
      {/* MAIN LOGIN ENGINE */}
      <div className="w-full max-w-[380px] rounded-[40px] border-2 border-[#1A3D64] bg-[#1c1c1c] p-8 shadow-[0_0_50px_rgba(0,0,0,0.5)] z-10">
        <div className="mb-10 flex flex-col items-center">
          <div className="relative group">
            <div className="absolute -inset-4 rounded-full bg-[#1D546C]/20 blur-xl group-hover:bg-[#1D546C]/40 transition-all duration-500"></div>
            <div className="relative overflow-hidden rounded-2xl border border-[#1A3D64] shadow-2xl transition-transform duration-300 group-hover:scale-110">
              <img src={logoImg} alt="Logo" className="w-20 h-20 object-cover" />
            </div>
          </div>
          <div className="mt-4 text-center">
            <h1 className="text-2xl font-black italic tracking-widest text-white leading-none">AUSDAUER GROUPS</h1>
            <p className="text-[8px] text-[#1D546C] tracking-[0.4em] mt-2 italic">Task Manager</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-500/10 p-3 text-[10px] font-bold text-red-500 border border-red-500/20">
            <AlertCircle size={14} /> {error}
          </div>
        )}

        <form className="space-y-6" onSubmit={handleLogin}>
          <div className="relative group">
            <User className="absolute left-4 top-4 text-gray-600 group-focus-within:text-[#1D546C]" size={18} />
            <input type="email" placeholder="LINK EMAIL" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full rounded-xl border-2 border-[#1A3D64]/30 bg-[#111111] py-4 pl-12 pr-4 text-xs text-white placeholder-gray-700 outline-none focus:border-[#1D546C]" />
          </div>

          <div className="relative group">
            <Lock className="absolute left-4 top-4 text-gray-600 group-focus-within:text-[#1D546C]" size={18} />
            <input type={showPassword ? "text" : "password"} placeholder="SECURITY KEY" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full rounded-xl border-2 border-[#1A3D64]/30 bg-[#111111] py-4 pl-12 pr-4 text-xs text-white placeholder-gray-700 outline-none focus:border-[#1D546C]" />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-4 text-gray-600 hover:text-white">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
          </div>

          <div className="flex justify-end">
             <button type="button" onClick={() => setShowForgot(true)} className="text-[9px] font-black text-gray-600 hover:text-[#1D546C] transition-colors uppercase tracking-widest leading-none">Forget Password</button>
          </div>

          <button type="submit" disabled={loading} className="w-full rounded-2xl bg-[#1D546C] py-5 text-sm font-black uppercase tracking-[0.3em] text-white shadow-xl hover:bg-[#266e8c] active:scale-95 disabled:opacity-50">
            {loading ? 'SYNCING...' : 'INITIATE ACCESS'}
          </button>
        </form>
      </div>

      {/* FORGOT PASSWORD MODAL */}
      {showForgot && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-in fade-in duration-300">
           <div className="w-full max-w-sm rounded-[45px] border border-[#1A3D64] bg-[#1c1c1c] p-10 shadow-2xl relative ring-1 ring-white/5">
              <button onClick={closeForgotModal} className="absolute top-6 right-6 text-gray-600 hover:text-white"><X size={24}/></button>
              <div className="flex flex-col items-center mb-10 text-center">
                 <div className="h-16 w-16 rounded-full bg-[#1D546C]/20 flex items-center justify-center text-[#1D546C] mb-4 border-2 border-[#1D546C]">
                   {otpStep === 1 ? <Mail size={28}/> : <ShieldCheck size={28} className="animate-pulse" />}
                 </div>
                 <h3 className="text-2xl font-black text-white uppercase tracking-tighter leading-none">{otpStep === 1 ? 'Identity Reset' : 'Verify Code'}</h3>
                 <p className="text-[10px] text-gray-500 mt-4 uppercase tracking-widest font-bold">{otpStep === 1 ? 'Enter your registered link' : `Code sent to inbox`}</p>
              </div>

              {otpStep === 1 ? (
                <form onSubmit={handleRequestOTP} className="space-y-6">
                   <input type="email" placeholder="EMAIL ADDRESS" className="w-full rounded-2xl border border-[#333] bg-[#000] p-5 text-xs text-white outline-none focus:border-[#1D546C] text-center" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} required />
                   <button type="submit" disabled={loading} className="w-full rounded-2xl bg-[#1D546C] py-4 font-black text-xs text-white hover:bg-[#256681] transition-all uppercase tracking-[0.4em]">Transmit OTP</button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOTP} className="space-y-6">
                   <input type="text" placeholder="ENTER CODE" className="w-full rounded-2xl border border-[#333] bg-[#000] p-5 text-xl font-black text-white outline-none focus:border-[#1D546C] text-center tracking-[0.4em]" value={otpValue} onChange={(e) => setOtpValue(e.target.value)} required autoFocus />
                   <div className="flex gap-4">
                     <button type="button" onClick={() => setOtpStep(1)} className="flex-1 py-4 text-[9px] font-black text-gray-600 uppercase border border-[#333] rounded-2xl">Back</button>
                     <button type="submit" disabled={loading} className="flex-[2] rounded-2xl bg-green-600 py-4 font-black text-xs text-white uppercase tracking-[0.2em]">Authorize</button>
                   </div>
                </form>
              )}
           </div>
        </div>
      )}

      {/* --- CUSTOM SECURITY POPUP (REPLACES ALERTS) --- */}
      {popup.show && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/98 backdrop-blur-2xl p-8 animate-in fade-in duration-500 font-black uppercase">
            <div className={`bg-[#0a0a0a] border-2 ${popup.type === 'error' ? 'border-red-500 shadow-[0_0_100px_rgba(255,0,0,0.3)]' : 'border-green-500 shadow-[0_0_100px_rgba(34,197,94,0.3)]'} p-12 rounded-[50px] max-w-sm w-full text-center ring-1 ring-white/10`}>
                <div className="flex justify-center mb-10">
                  {popup.type === 'error' ? <ShieldAlert size={64} className="text-red-500 animate-bounce" /> : <CheckCircle2 size={64} className="text-green-500" />}
                </div>
                <h3 className="text-3xl text-white mb-6 tracking-tighter leading-none">{popup.title}</h3>
                <p className="text-gray-500 text-[11px] mb-12 font-bold leading-relaxed opacity-80 italic normal-case">"{popup.message}"</p>
                <button onClick={() => setPopup({ ...popup, show: false })} className={`w-full py-5 rounded-2xl font-black uppercase text-[11px] tracking-widest text-white transition-all active:scale-95 ${popup.type === 'error' ? 'bg-red-600 hover:bg-red-500' : 'bg-green-600 hover:bg-green-500'}`}>Acknowledge</button>
            </div>
        </div>
      )}
    </div>
  );
}

export default App;