import React, { useState, useEffect } from 'react';
import { User, ShopSettings, UserRole, Branch } from '../types';
import { LayoutDashboard, ShoppingCart, Package, BarChart3, LogOut, Settings as SettingsIcon, ArrowLeft, Clock, Store, Smartphone, ShieldCheck, Zap, Users, Receipt, Plus, Trash2, Sun, Moon, MapPin, ExternalLink, AlertTriangle, Menu, ChevronRight, PieChart, Briefcase } from 'lucide-react';
import PosTerminal from './PosTerminal';
import Inventory from './Inventory';
import Reports from './Reports';
import ShiftManagement from './ShiftManagement';
import CustomerManager from './CustomerManager';
import AuditLogs from './AuditLogs';
import UserManagement from './UserManagement';
import { StorageService } from '../services/storageService';
import { INITIAL_SETTINGS } from '../constants';

interface LayoutProps {
  user: User;
  onLogout: () => void;
}

const Layout: React.FC<LayoutProps> = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'POS' | 'INVENTORY' | 'REPORTS' | 'SETTINGS' | 'SHIFTS' | 'MULTISHOP' | 'OWNER' | 'AUDIT' | 'AUTOMATION' | 'CUSTOMERS' | 'TEAM'>('POS');
  const [settings, setSettings] = useState<ShopSettings>(INITIAL_SETTINGS);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchLocation, setNewBranchLocation] = useState('');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  // Theme State
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof localStorage !== 'undefined') {
        return localStorage.getItem('theme') as 'light' | 'dark' || 'light';
    }
    return 'light';
  });

  // Apply Theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Load Settings
  useEffect(() => {
    const loadSettings = async () => {
        const s = await StorageService.getSettings();
        setSettings(s);
        setBranches(s.branches || []);
    };
    loadSettings();
  }, []);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const navItemClass = (tab: string) => 
    `group flex items-center justify-between w-full p-3 rounded-2xl mb-1 transition-all duration-300 font-medium relative overflow-hidden ${
      activeTab === tab 
      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-900/20' 
      : 'text-slate-400 hover:text-white hover:bg-white/5'
    }`;

  const NavItem = ({ id, icon: Icon, label }: { id: string, icon: any, label: string }) => (
    <button onClick={() => setActiveTab(id as any)} className={navItemClass(id)} title={isSidebarCollapsed ? label : ''}>
        <div className="flex items-center gap-3">
            <Icon className={`w-5 h-5 ${activeTab === id ? 'text-white' : 'text-slate-500 group-hover:text-blue-400 transition-colors'}`} />
            {!isSidebarCollapsed && <span className="text-sm tracking-wide">{label}</span>}
        </div>
        {activeTab === id && !isSidebarCollapsed && (
            <div className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]"></div>
        )}
    </button>
  );

  const SectionLabel = ({ label }: { label: string }) => (
      !isSidebarCollapsed ? (
        <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-2 px-3 mt-6">{label}</p>
      ) : (
        <div className="h-px w-8 bg-slate-800 mx-auto my-4"></div>
      )
  );

  const goHome = () => setActiveTab('POS');
  const handleTabChange = (tab: any) => setActiveTab(tab);

  const addBranch = () => {
    if (branches.length >= 5) {
        alert("Maximum limit of 5 branches reached for this project tier.");
        return;
    }
    if (!newBranchName || !newBranchLocation) {
        alert("Branch Name and Location are required.");
        return;
    }

    const newBranch: Branch = { 
        id: StorageService.generateId(), 
        name: newBranchName, 
        location: newBranchLocation, 
        manager: 'Pending' 
    };
    const updatedBranches = [...branches, newBranch];
    setBranches(updatedBranches);
    setSettings({...settings, branches: updatedBranches});
    StorageService.updateSettings({...settings, branches: updatedBranches});
    setNewBranchName('');
    setNewBranchLocation('');
  };

  const removeBranch = (branchId: string) => {
      if(!window.confirm("Are you sure you want to remove this branch? This cannot be undone.")) return;
      
      const updatedBranches = branches.filter(b => b.id !== branchId);
      setBranches(updatedBranches);
      setSettings({...settings, branches: updatedBranches});
      StorageService.updateSettings({...settings, branches: updatedBranches});
  };

  const openMap = (location: string) => {
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`, '_blank');
  };

  const renderContent = () => {
    switch(activeTab) {
      case 'POS': return <PosTerminal user={user} settings={settings} onBack={onLogout} onNavigate={handleTabChange} />;
      case 'INVENTORY': return <Inventory settings={settings} onBack={goHome} user={user} />;
      case 'REPORTS': return <Reports settings={settings} onBack={goHome} />;
      case 'SHIFTS': return <ShiftManagement user={user} settings={settings} onBack={goHome} />;
      case 'CUSTOMERS': return <CustomerManager settings={settings} onBack={goHome} />;
      case 'AUDIT': return <AuditLogs onBack={goHome} />;
      case 'TEAM': return <UserManagement onBack={goHome} currentUser={user} settings={settings} />;
      
      case 'SETTINGS': return (
        <div className="p-8 bg-white/90 backdrop-blur-md rounded-3xl shadow-sm h-full overflow-y-auto border border-white/50">
            <div className="flex items-center gap-4 mb-8 pb-4 border-b border-gray-100">
                <button onClick={goHome} className="p-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors">
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <h2 className="text-2xl font-bold tracking-tight text-gray-900">Shop Settings</h2>
            </div>
            <div className="max-w-xl space-y-6">
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Shop Name</label>
                    <input className="w-full bg-slate-50 border border-gray-200 px-4 py-3 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-gray-900 font-medium" value={settings.name} onChange={e => setSettings({...settings, name: e.target.value})} />
                </div>
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Address</label>
                    <input className="w-full bg-slate-50 border border-gray-200 px-4 py-3 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-gray-900 font-medium" value={settings.address} onChange={e => setSettings({...settings, address: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Currency Symbol</label>
                        <input className="w-full bg-slate-50 border border-gray-200 px-4 py-3 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-gray-900 font-medium" value={settings.currency} onChange={e => setSettings({...settings, currency: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Tax Rate (%)</label>
                        <input type="number" className="w-full bg-slate-50 border border-gray-200 px-4 py-3 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-gray-900 font-medium" value={settings.taxRate} onChange={e => setSettings({...settings, taxRate: Number(e.target.value)})} />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Receipt Footer</label>
                    <textarea className="w-full bg-slate-50 border border-gray-200 px-4 py-3 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-gray-900 font-medium" value={settings.receiptFooter} onChange={e => setSettings({...settings, receiptFooter: e.target.value})} />
                </div>
                <button 
                    onClick={() => { StorageService.updateSettings(settings); alert("Settings Saved!"); }}
                    className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition-transform active:scale-95 shadow-lg shadow-blue-500/30 w-full"
                >
                    Save Changes
                </button>
            </div>
        </div>
      );
      
      case 'MULTISHOP': return (
        <div className="p-8 bg-white/90 backdrop-blur-md rounded-3xl shadow-sm h-full overflow-y-auto border border-white/50">
             <div className="flex items-center gap-4 mb-8 pb-4 border-b border-gray-100">
                <button onClick={goHome} className="p-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors">
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <h2 className="text-2xl font-bold tracking-tight text-gray-900">Multi-Shop Management</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-gray-800">Branch Network</h3>
                        <span className={`text-xs font-bold px-3 py-1 rounded-full ${branches.length >= 5 ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                            {branches.length}/5 Branches
                        </span>
                    </div>

                    {branches.length >= 5 && (
                        <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-xl text-sm font-bold mb-4 flex items-center gap-2 animate-pulse">
                            <AlertTriangle className="w-4 h-4" /> Maximum limit reached.
                        </div>
                    )}
                    
                    <div className="space-y-3 mb-6 max-h-[400px] overflow-y-auto pr-2">
                        {branches.map(b => (
                            <div key={b.id} className="border border-gray-200 p-4 rounded-xl flex justify-between items-start bg-slate-50 hover:bg-white hover:shadow-md transition-all group">
                                <div>
                                    <div className="font-bold flex items-center gap-2 text-gray-800">
                                        <Store className="w-4 h-4 text-blue-600" />
                                        {b.name}
                                    </div>
                                    <div className="text-sm text-gray-600 mt-1 flex items-center gap-1 cursor-pointer hover:text-blue-600" onClick={() => openMap(b.location)}>
                                        <MapPin className="w-3 h-3" /> {b.location}
                                    </div>
                                    <div className="text-xs text-gray-400 mt-1 font-medium">Manager: {b.manager}</div>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <span className="bg-green-100 text-green-700 px-2 py-1 text-[10px] uppercase font-bold rounded-full">Online</span>
                                    <div className="flex gap-2">
                                        <button onClick={() => openMap(b.location)} className="text-gray-400 hover:text-blue-600 p-1 transition-colors" title="View on Map">
                                            <ExternalLink className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => removeBranch(b.id)} className="text-gray-400 hover:text-red-600 p-1 transition-colors" title="Remove Branch">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {branches.length === 0 && (
                            <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl">
                                <p className="text-gray-400 text-sm italic">No branches added yet.</p>
                            </div>
                        )}
                    </div>

                    <div className={`bg-slate-50 p-6 rounded-2xl border border-gray-200 ${branches.length >= 5 ? 'opacity-50 pointer-events-none' : ''}`}>
                        <h4 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <Plus className="w-4 h-4 text-blue-600" /> Add New Branch
                        </h4>
                        <div className="space-y-4">
                            <input 
                                className="border border-gray-300 p-3 rounded-xl w-full text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900" 
                                placeholder="Branch Name (e.g. Lekki Outlet)" 
                                value={newBranchName} 
                                onChange={e => setNewBranchName(e.target.value)}
                                disabled={branches.length >= 5}
                            />
                            <div className="relative">
                                <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                <input 
                                    className="border border-gray-300 pl-10 pr-3 py-3 rounded-xl w-full text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900" 
                                    placeholder="Location Address" 
                                    value={newBranchLocation} 
                                    onChange={e => setNewBranchLocation(e.target.value)}
                                    disabled={branches.length >= 5}
                                />
                            </div>
                            <button 
                                onClick={addBranch} 
                                disabled={branches.length >= 5}
                                className="bg-blue-600 text-white w-full py-3 rounded-xl font-bold text-sm disabled:opacity-50 hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20"
                            >
                                {branches.length >= 5 ? 'Limit Reached (Max 5)' : 'Add Branch'}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="p-8 text-center border border-white/10 rounded-3xl bg-slate-900 text-white flex flex-col justify-center items-center h-full min-h-[300px] shadow-2xl relative overflow-hidden group">
                    <div className="absolute inset-0 bg-blue-600/10 blur-3xl rounded-full transform scale-150 group-hover:bg-blue-600/20 transition-all duration-500"></div>
                    <div className="relative z-10">
                        <div className="bg-white/10 p-4 rounded-full inline-block mb-6 backdrop-blur-md shadow-glow">
                            <Store className="w-12 h-12 text-blue-300" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">Centralized Dashboard</h3>
                        <p className="text-slate-400 max-w-sm mx-auto mb-8 text-sm leading-relaxed">
                            Consolidated view of inventory transfers and sales across {branches.length + 1} locations.
                            All branches sync to the main cloud database automatically.
                        </p>
                        <button className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-3 rounded-xl text-sm font-bold hover:shadow-lg hover:shadow-blue-500/30 transition-all">
                            Sync Cloud Data
                        </button>
                    </div>
                </div>
            </div>
        </div>
      );
      case 'OWNER': return (
        <div className="p-6 bg-white/90 backdrop-blur-md rounded-3xl shadow-sm h-full overflow-y-auto flex flex-col items-center border border-white/50">
             <div className="w-full flex items-center gap-4 mb-6 pb-4 border-b border-gray-100">
                <button onClick={goHome} className="p-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors">
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <h2 className="text-2xl font-bold text-gray-900">Owner Mobile View Preview</h2>
            </div>
            
            {/* Mobile Simulation Frame */}
            <div className="border-[8px] border-slate-800 rounded-[40px] w-[340px] h-[650px] overflow-hidden bg-gray-50 shadow-2xl relative">
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-32 h-6 bg-slate-800 rounded-b-xl z-20"></div>
                <div className="p-5 pt-12 h-full overflow-y-auto scrollbar-hide">
                    <h3 className="font-bold text-xl mb-4 text-slate-800">Good Afternoon,<br/>Owner</h3>
                    <div className="grid grid-cols-2 gap-3 mb-6">
                        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                            <div className="text-xs text-gray-500 font-medium uppercase">Sales</div>
                            <div className="font-bold text-xl text-blue-600 mt-1">₦420k</div>
                        </div>
                        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                             <div className="text-xs text-gray-500 font-medium uppercase">Cash</div>
                            <div className="font-bold text-xl text-green-600 mt-1">₦150k</div>
                        </div>
                    </div>
                    <div className="bg-white p-4 rounded-2xl shadow-sm mb-6 border border-gray-100">
                        <div className="flex justify-between items-center mb-3">
                            <span className="font-bold text-sm text-slate-800">Active Alerts</span>
                            <span className="bg-red-50 text-red-600 text-[10px] font-bold px-2 py-1 rounded-full">2 NEW</span>
                        </div>
                        <div className="space-y-3">
                            <div className="flex items-center gap-3 text-xs bg-red-50/50 p-2 rounded-lg">
                                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                <span className="text-slate-600">Low Stock: Coca Cola (5 left)</span>
                            </div>
                            <div className="flex items-center gap-3 text-xs bg-orange-50/50 p-2 rounded-lg">
                                <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                                <span className="text-slate-600">Shift Variance: -₦500 (John)</span>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <button className="w-full bg-slate-900 text-white py-3 rounded-xl text-sm font-bold shadow-lg shadow-slate-900/10">Approve Refund #4492</button>
                        <button className="w-full bg-white border-2 border-slate-100 text-slate-600 py-3 rounded-xl text-sm font-bold">Lock Terminal</button>
                    </div>
                </div>
            </div>
            <p className="text-slate-400 mt-6 text-sm">Scan QR to open on real device (Requires Cloud Sync)</p>
        </div>
      );

      case 'AUTOMATION': return (
        <div className="p-8 bg-white/90 backdrop-blur-md rounded-3xl shadow-sm h-full overflow-y-auto border border-white/50">
             <div className="flex items-center gap-4 mb-8 pb-4 border-b border-gray-100">
                <button onClick={goHome} className="p-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors">
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <h2 className="text-2xl font-bold tracking-tight text-gray-900">Smart Automation (AI)</h2>
            </div>
             <div className="space-y-6">
                <div className="flex items-center justify-between p-6 border border-purple-100 rounded-2xl bg-purple-50/50 transition-all hover:bg-purple-50">
                    <div className="flex gap-5">
                        <div className="bg-purple-100 p-3 rounded-2xl h-14 w-14 flex items-center justify-center shadow-sm">
                            <Zap className="w-6 h-6 text-purple-600" />
                        </div>
                        <div>
                            <h3 className="font-bold text-purple-900 text-lg">Smart Reorder Suggestions</h3>
                            <p className="text-sm text-purple-700 mt-1 opacity-80">AI analyzes sales velocity to suggest restock dates.</p>
                        </div>
                    </div>
                    <div className="relative inline-block w-12 mr-2 align-middle select-none transition duration-200 ease-in">
                        <input type="checkbox" defaultChecked className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 border-purple-200 appearance-none cursor-pointer"/>
                        <label className="toggle-label block overflow-hidden h-6 rounded-full bg-purple-300 cursor-pointer"></label>
                    </div>
                </div>

                <div className="flex items-center justify-between p-6 border border-blue-100 rounded-2xl bg-blue-50/50 transition-all hover:bg-blue-50">
                    <div className="flex gap-5">
                        <div className="bg-blue-100 p-3 rounded-2xl h-14 w-14 flex items-center justify-center shadow-sm">
                            <BarChart3 className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <h3 className="font-bold text-blue-900 text-lg">Dead Stock Alerts</h3>
                            <p className="text-sm text-blue-700 mt-1 opacity-80">Identify products that haven't sold in 30 days.</p>
                        </div>
                    </div>
                    <button onClick={() => alert("Analysis started... Check Reports tab later.")} className="text-blue-600 font-bold text-sm bg-white px-4 py-2 rounded-xl border border-blue-200 hover:bg-blue-50 shadow-sm transition-all">Run Analysis</button>
                </div>

                 <div className="flex items-center justify-between p-6 border border-green-100 rounded-2xl bg-green-50/50 transition-all hover:bg-green-50">
                    <div className="flex gap-5">
                        <div className="bg-green-100 p-3 rounded-2xl h-14 w-14 flex items-center justify-center shadow-sm">
                            <Users className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                            <h3 className="font-bold text-green-900 text-lg">Automated Customer Retargeting</h3>
                            <p className="text-sm text-green-700 mt-1 opacity-80">Send WhatsApp promos to customers who haven't visited in 14 days.</p>
                        </div>
                    </div>
                    <button className="text-green-600 font-bold text-sm bg-white px-4 py-2 rounded-xl border border-green-200 hover:bg-green-50 shadow-sm transition-all">Configure</button>
                </div>
            </div>
        </div>
      );

      default: return null;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-900 relative selection:bg-blue-100 selection:text-blue-900">
      
      {/* Global Background Blobs matching Login aesthetics */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-100/50 rounded-full blur-[100px] pointer-events-none z-0"></div>
      <div className="absolute bottom-[-10%] left-[20%] w-[500px] h-[500px] bg-purple-100/50 rounded-full blur-[100px] pointer-events-none z-0"></div>

      {/* Sidebar - Dark & Colorful */}
      <aside className={`relative bg-slate-900 border-r border-slate-800 flex flex-col z-20 print:hidden transition-all duration-300 ${isSidebarCollapsed ? 'w-24' : 'w-72'} hidden md:flex shadow-2xl`}>
         
         {/* Sidebar Inner Gradients */}
         <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-900 to-indigo-950 z-0"></div>
         <div className="absolute top-[-10%] left-[-20%] w-[300px] h-[300px] bg-blue-500/10 rounded-full blur-[80px] z-0"></div>
         <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-purple-500/10 rounded-full blur-[80px] z-0"></div>

         <div className="relative z-10 flex flex-col h-full">
            {/* Header */}
            <div className="p-6 flex justify-between items-center">
                {!isSidebarCollapsed ? (
                    <div className="flex items-center gap-3">
                        <div className="bg-gradient-to-tr from-blue-500 to-indigo-600 p-2.5 rounded-xl shadow-lg shadow-blue-500/20">
                             <Store className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-extrabold text-white tracking-tight leading-none">ShelfMaster <span className="text-blue-400">Nova</span></h1>
                            <p className="text-[10px] text-blue-200/60 font-bold uppercase tracking-widest mt-0.5">Intelligent Retail OS</p>
                        </div>
                    </div>
                ) : (
                     <div className="bg-gradient-to-tr from-blue-500 to-indigo-600 p-3 rounded-xl shadow-lg shadow-blue-500/20 mx-auto">
                         <Store className="w-6 h-6 text-white" />
                    </div>
                )}
                 {!isSidebarCollapsed && (
                    <button onClick={() => setIsSidebarCollapsed(true)} className="text-slate-500 hover:text-white transition-colors bg-white/5 p-1.5 rounded-lg">
                        <Menu className="w-4 h-4" />
                    </button>
                 )}
            </div>

            {isSidebarCollapsed && (
                 <button onClick={() => setIsSidebarCollapsed(false)} className="mx-auto text-slate-500 hover:text-white mb-4 mt-2 bg-white/5 p-2 rounded-lg transition-colors">
                    <ChevronRight className="w-5 h-5" />
                </button>
            )}

            {/* Nav */}
            <nav className="flex-1 px-4 py-4 overflow-y-auto space-y-1 scrollbar-hide">
                  <SectionLabel label="Operations" />
                  <NavItem id="POS" icon={ShoppingCart} label="Terminal" />
                  <NavItem id="SHIFTS" icon={Clock} label="Shift Management" />
                  <NavItem id="INVENTORY" icon={Package} label="Inventory" />
                  <NavItem id="CUSTOMERS" icon={Users} label="Customers" />

                  {user.role === UserRole.ADMIN && (
                    <>
                      <SectionLabel label="Management" />
                      <NavItem id="TEAM" icon={Briefcase} label="Team & Access" />
                      <NavItem id="MULTISHOP" icon={Store} label="Multi-Shop" />
                      <NavItem id="REPORTS" icon={BarChart3} label="Analytics" />

                      <SectionLabel label="System" />
                      <NavItem id="AUTOMATION" icon={Zap} label="Automation AI" />
                      <NavItem id="AUDIT" icon={ShieldCheck} label="Audit Logs" />
                      <NavItem id="OWNER" icon={Smartphone} label="Mobile App" />
                      <NavItem id="SETTINGS" icon={SettingsIcon} label="Settings" />
                    </>
                  )}
            </nav>

            {/* User Footer */}
            <div className="p-4 mx-4 mb-6 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-sm mt-2">
                 {!isSidebarCollapsed ? (
                    <div className="flex items-center justify-between">
                        <div className="overflow-hidden">
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-0.5">Logged in as</p>
                            <p className="text-sm font-bold text-white truncate">{user.name}</p>
                        </div>
                        <button onClick={onLogout} className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white transition-colors" title="Logout">
                            <LogOut className="w-4 h-4" />
                        </button>
                    </div>
                 ) : (
                    <div className="flex justify-center">
                        <button onClick={onLogout} className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white transition-colors" title="Logout">
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>
                 )}
            </div>
         </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-6 overflow-hidden relative z-10">
        <div className="h-full max-w-[1600px] mx-auto animate-in fade-in duration-500">
            {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default Layout;