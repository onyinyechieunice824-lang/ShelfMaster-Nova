
import React, { useState } from 'react';
import { Lock, User as UserIcon, ArrowRight, Store, CreditCard, ShieldCheck, ShoppingCart, ChevronLeft } from 'lucide-react';
import { StorageService } from '../services/storageService';
import { User, UserRole } from '../types';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
        const user = await StorageService.login(username, pin);
        
        // Strict Role Check for UI Consistency
        if (selectedRole && user.role !== selectedRole) {
            setError(`This account is not authorized for ${selectedRole === UserRole.ADMIN ? 'Admin' : 'Cashier'} access.`);
            setLoading(false);
            return;
        }

        onLogin(user);
    } catch (err) {
        setError('Invalid credentials or connection error');
    } finally {
        setLoading(false);
    }
  };

  const themeColors = selectedRole === UserRole.ADMIN 
    ? {
        bg: 'from-indigo-600 to-purple-600',
        text: 'text-indigo-600',
        ring: 'focus:ring-indigo-500',
        border: 'focus:border-indigo-500',
        lightBg: 'bg-indigo-50',
        shadow: 'shadow-indigo-500/30'
      }
    : {
        bg: 'from-emerald-500 to-teal-600',
        text: 'text-emerald-600',
        ring: 'focus:ring-emerald-500',
        border: 'focus:border-emerald-500',
        lightBg: 'bg-emerald-50',
        shadow: 'shadow-emerald-500/30'
      };

  const resetSelection = () => {
      setSelectedRole(null);
      setUsername('');
      setPin('');
      setError('');
  };

  return (
    <div className="min-h-screen w-full flex bg-slate-50 relative overflow-hidden">
      
      {/* Background patterns for mobile */}
      <div className="absolute inset-0 z-0 lg:hidden">
         <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900"></div>
         <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
      </div>

      {/* Left Side (Desktop Only) */}
      <div className="hidden lg:flex w-[55%] relative overflow-hidden bg-slate-900 text-white flex-col justify-between p-16">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-700 via-indigo-700 to-purple-800 z-0"></div>
        
        {/* Decorative Circles */}
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-blue-500/20 blur-[120px] mix-blend-overlay"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-purple-500/20 blur-[120px] mix-blend-overlay"></div>
        
        <div className="relative z-10">
            <div className="flex items-center gap-3 mb-12">
                <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/20 shadow-xl">
                    <Store className="w-8 h-8 text-blue-200" />
                </div>
                <span className="text-3xl font-bold tracking-tight text-white">ShelfMaster <span className="text-blue-200">Nova</span></span>
            </div>

            <div className="space-y-8 max-w-lg">
                <h1 className="text-6xl font-extrabold leading-[1.1] tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-blue-200">
                    Master Your <br/> Shelf. <br/> Master Your Sales.
                </h1>
                <p className="text-lg text-blue-100/80 leading-relaxed font-medium">
                    The next-generation retail OS. Real-time inventory tracking, AI-driven analytics, and seamless sales processing.
                </p>
                
                <div className="flex gap-4 pt-4">
                    <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-5 py-3 rounded-2xl backdrop-blur-sm">
                        <div className="p-2 bg-blue-500/20 rounded-lg">
                            <CreditCard className="w-5 h-5 text-blue-300" />
                        </div>
                        <div className="text-sm">
                            <div className="font-bold text-white">Smart POS</div>
                            <div className="text-blue-200 text-xs">Offline capable</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* Right Side (Form) */}
      <div className="w-full lg:w-[45%] flex items-center justify-center p-6 relative z-10">
         <div className="w-full max-w-[480px] bg-white/95 lg:bg-white/80 backdrop-blur-2xl p-8 md:p-10 rounded-[2.5rem] shadow-[0_8px_40px_-12px_rgba(0,0,0,0.1)] border border-white/50 relative transition-all duration-500">
            
            {!selectedRole ? (
                // ROLE SELECTION VIEW
                <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="text-center mb-10">
                        <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">Select Access Level</h2>
                        <p className="text-slate-500 mt-2 font-medium">Choose your role to continue.</p>
                    </div>
                    
                    <div className="space-y-4">
                        <button 
                            onClick={() => setSelectedRole(UserRole.ADMIN)}
                            className="w-full group relative overflow-hidden bg-white hover:bg-indigo-50 border-2 border-slate-100 hover:border-indigo-200 p-6 rounded-3xl text-left transition-all duration-300 shadow-sm hover:shadow-xl hover:shadow-indigo-500/10 hover:-translate-y-1"
                        >
                            <div className="flex items-center gap-6">
                                <div className="w-16 h-16 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                    <ShieldCheck className="w-8 h-8" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-slate-800 group-hover:text-indigo-700">Admin Portal</h3>
                                    <p className="text-sm text-slate-500 font-medium mt-1">Management, Reports & Settings</p>
                                </div>
                                <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0">
                                    <ArrowRight className="w-6 h-6 text-indigo-400" />
                                </div>
                            </div>
                        </button>

                        <button 
                            onClick={() => setSelectedRole(UserRole.CASHIER)}
                            className="w-full group relative overflow-hidden bg-white hover:bg-emerald-50 border-2 border-slate-100 hover:border-emerald-200 p-6 rounded-3xl text-left transition-all duration-300 shadow-sm hover:shadow-xl hover:shadow-emerald-500/10 hover:-translate-y-1"
                        >
                            <div className="flex items-center gap-6">
                                <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                    <ShoppingCart className="w-8 h-8" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-slate-800 group-hover:text-emerald-700">Cashier Terminal</h3>
                                    <p className="text-sm text-slate-500 font-medium mt-1">POS, Sales & Shift Tracking</p>
                                </div>
                                <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0">
                                    <ArrowRight className="w-6 h-6 text-emerald-400" />
                                </div>
                            </div>
                        </button>
                    </div>
                </div>
            ) : (
                // LOGIN FORM VIEW
                <div className="animate-in fade-in slide-in-from-right-8 duration-300">
                    <button 
                        onClick={resetSelection}
                        className="flex items-center gap-2 text-slate-400 hover:text-slate-600 mb-6 font-bold text-sm transition-colors"
                    >
                        <ChevronLeft className="w-4 h-4" /> Back to Role Select
                    </button>

                    <div className="text-center mb-8">
                        <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr ${themeColors.bg} shadow-lg ${themeColors.shadow} mb-6 text-white transform rotate-3 hover:rotate-6 transition-transform`}>
                            {selectedRole === UserRole.ADMIN ? <ShieldCheck className="w-7 h-7" /> : <ShoppingCart className="w-7 h-7" />}
                        </div>
                        <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">
                            {selectedRole === UserRole.ADMIN ? 'Admin Access' : 'Cashier Login'}
                        </h2>
                        <p className="text-slate-500 mt-2 font-medium">Enter your credentials.</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        {error && (
                            <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 animate-in fade-in slide-in-from-top-2 border border-red-100 shadow-sm">
                                <Lock className="w-4 h-4" /> {error}
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Username</label>
                            <div className="relative group">
                                <div className={`absolute left-0 top-0 bottom-0 w-12 flex items-center justify-center text-slate-400 group-focus-within:${themeColors.text} transition-colors`}>
                                    <UserIcon className="w-5 h-5" />
                                </div>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className={`w-full pl-12 pr-4 py-4 ${themeColors.lightBg} border border-slate-200 rounded-2xl focus:ring-4 ${themeColors.ring}/10 ${themeColors.border} outline-none transition-all font-bold text-slate-800 placeholder:font-normal`}
                                    placeholder="Enter username"
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Access PIN</label>
                            <div className="relative group">
                                <div className={`absolute left-0 top-0 bottom-0 w-12 flex items-center justify-center text-slate-400 group-focus-within:${themeColors.text} transition-colors`}>
                                    <Lock className="w-5 h-5" />
                                </div>
                                <input
                                    type="password"
                                    value={pin}
                                    onChange={(e) => setPin(e.target.value)}
                                    className={`w-full pl-12 pr-4 py-4 ${themeColors.lightBg} border border-slate-200 rounded-2xl focus:ring-4 ${themeColors.ring}/10 ${themeColors.border} outline-none transition-all font-mono tracking-[0.5em] text-lg text-slate-800`}
                                    placeholder="••••"
                                    maxLength={4}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full bg-gradient-to-r ${themeColors.bg} hover:opacity-90 text-white py-4 rounded-2xl font-bold text-lg shadow-xl ${themeColors.shadow} transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3 mt-4`}
                        >
                            {loading ? (
                                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                            ) : (
                                <>Sign In <ArrowRight className="w-5 h-5" /></>
                            )}
                        </button>
                    </form>
                </div>
            )}
         </div>
      </div>
    </div>
  );
};

export default Login;
