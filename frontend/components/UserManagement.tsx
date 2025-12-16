import React, { useState, useEffect } from 'react';
import { User, UserRole, ShopSettings, Transaction, AuditLog } from '../types';
import { StorageService } from '../services/storageService';
import { ArrowLeft, UserPlus, Shield, User as UserIcon, Trash2, Ban, CheckCircle, Activity, DollarSign, Lock } from 'lucide-react';

interface UserManagementProps {
    currentUser: User;
    settings: ShopSettings;
    onBack: () => void;
}

const UserManagement: React.FC<UserManagementProps> = ({ currentUser, settings, onBack }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isAdding, setIsAdding] = useState(false);
    
    // Form State
    const [newUser, setNewUser] = useState<Partial<User>>({ role: UserRole.CASHIER });
    
    // Selected user for details
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const [fetchedUsers, fetchedTxs] = await Promise.all([
            StorageService.getUsers(),
            StorageService.getTransactions()
        ]);
        setUsers(fetchedUsers);
        setTransactions(fetchedTxs);
        
        // Default select first cashier
        if (!selectedUserId && fetchedUsers.length > 0) {
            const firstCashier = fetchedUsers.find(u => u.role === UserRole.CASHIER);
            if (firstCashier) setSelectedUserId(firstCashier.id);
        }
    };

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newUser.name || !newUser.username || !newUser.pin) {
            alert("Please fill all fields");
            return;
        }

        try {
            await StorageService.saveUser({
                ...newUser,
                id: StorageService.generateId(),
                role: newUser.role || UserRole.CASHIER
            });
            
            // Log Action
            const log: AuditLog = {
                id: StorageService.generateId(),
                date: new Date().toISOString(),
                userId: currentUser.id,
                userName: currentUser.name,
                action: 'USER_MGMT',
                severity: 'HIGH',
                details: `Created new user: ${newUser.username} (${newUser.role})`
            };
            await StorageService.logAudit(log);

            await loadData();
            setIsAdding(false);
            setNewUser({ role: UserRole.CASHIER, name: '', username: '', pin: '' });
        } catch (error) {
            alert("Error creating user. Username might be taken.");
        }
    };

    const handleDeleteUser = async (userToDelete: User) => {
        if (userToDelete.id === currentUser.id) {
            alert("You cannot delete yourself.");
            return;
        }

        if (confirm(`Are you sure you want to PERMANENTLY DELETE ${userToDelete.name}? This cannot be undone.`)) {
            await StorageService.deleteUser(userToDelete.id);
            
            // Log Action
            const log: AuditLog = {
                id: StorageService.generateId(),
                date: new Date().toISOString(),
                userId: currentUser.id,
                userName: currentUser.name,
                action: 'USER_MGMT',
                severity: 'HIGH',
                details: `Deleted user: ${userToDelete.username}`
            };
            await StorageService.logAudit(log);
            
            if (selectedUserId === userToDelete.id) setSelectedUserId(null);
            await loadData();
        }
    };

    const handleToggleSuspension = async (targetUser: User) => {
        if (targetUser.id === currentUser.id) return;

        const newStatus = !targetUser.isSuspended;
        const action = newStatus ? "SUSPEND" : "ACTIVATE";

        if (confirm(`Are you sure you want to ${action} ${targetUser.name}?`)) {
            await StorageService.toggleUserSuspension(targetUser.id, newStatus);
            
            // Log Action
            const log: AuditLog = {
                id: StorageService.generateId(),
                date: new Date().toISOString(),
                userId: currentUser.id,
                userName: currentUser.name,
                action: 'USER_MGMT',
                severity: 'MEDIUM',
                details: `${newStatus ? 'Suspended' : 'Re-activated'} user: ${targetUser.username}`
            };
            await StorageService.logAudit(log);

            await loadData();
        }
    };

    // --- Stats Calculation ---
    const selectedUser = users.find(u => u.id === selectedUserId);
    const userTxs = transactions.filter(t => t.cashierId === selectedUserId);
    
    // Today's Stats
    const todayStr = new Date().toISOString().split('T')[0];
    const todayTxs = userTxs.filter(t => t.date.startsWith(todayStr));
    const todayRevenue = todayTxs.reduce((acc, t) => acc + t.total, 0);

    // All Time Stats
    const totalRevenue = userTxs.reduce((acc, t) => acc + t.total, 0);
    const totalSalesCount = userTxs.length;

    return (
        <div className="flex h-full gap-6">
            {/* Left Column: User List */}
            <div className="w-1/3 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
                <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div className="flex items-center gap-3">
                        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full text-gray-500"><ArrowLeft className="w-5 h-5"/></button>
                        <h2 className="text-lg font-bold text-gray-800">Team Members</h2>
                    </div>
                    <button onClick={() => setIsAdding(true)} className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20">
                        <UserPlus className="w-5 h-5" />
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {users.map(u => (
                        <div 
                            key={u.id}
                            onClick={() => setSelectedUserId(u.id)}
                            className={`p-4 rounded-xl border cursor-pointer transition-all ${
                                selectedUserId === u.id 
                                ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-200' 
                                : 'bg-white border-gray-100 hover:border-blue-100 hover:bg-gray-50'
                            }`}
                        >
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                                        u.role === UserRole.ADMIN ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'
                                    }`}>
                                        {u.role === UserRole.ADMIN ? <Shield className="w-5 h-5" /> : <UserIcon className="w-5 h-5" />}
                                    </div>
                                    <div>
                                        <div className="font-bold text-gray-900">{u.name}</div>
                                        <div className="text-xs text-gray-500">@{u.username} • {u.role}</div>
                                    </div>
                                </div>
                                {u.isSuspended && (
                                    <span className="bg-red-100 text-red-600 text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1">
                                        <Lock className="w-3 h-3" /> SUSPENDED
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Right Column: Details & Actions */}
            <div className="flex-1 flex flex-col gap-6">
                
                {isAdding ? (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 flex flex-col items-center justify-center h-full animate-in fade-in duration-300">
                        <h3 className="text-2xl font-bold text-gray-900 mb-6">Create New User</h3>
                        <form onSubmit={handleAddUser} className="w-full max-w-md space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Full Name</label>
                                <input className="w-full border p-3 rounded-xl bg-gray-50" value={newUser.name || ''} onChange={e => setNewUser({...newUser, name: e.target.value})} placeholder="e.g. Sarah Johnson" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Username (Login ID)</label>
                                <input className="w-full border p-3 rounded-xl bg-gray-50" value={newUser.username || ''} onChange={e => setNewUser({...newUser, username: e.target.value})} placeholder="e.g. sarah" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Role</label>
                                    <select className="w-full border p-3 rounded-xl bg-gray-50" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value as UserRole})}>
                                        <option value={UserRole.CASHIER}>Cashier</option>
                                        <option value={UserRole.ADMIN}>Admin</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Access PIN</label>
                                    <input type="number" className="w-full border p-3 rounded-xl bg-gray-50" value={newUser.pin || ''} onChange={e => setNewUser({...newUser, pin: e.target.value})} placeholder="4-digit PIN" />
                                </div>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setIsAdding(false)} className="flex-1 py-3 border border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-50">Cancel</button>
                                <button type="submit" className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/20">Create User</button>
                            </div>
                        </form>
                    </div>
                ) : selectedUser ? (
                    <>
                        {/* Stats Dashboard for Selected User */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h3 className="text-2xl font-bold text-gray-900">{selectedUser.name}</h3>
                                    <p className="text-gray-500 text-sm">Employee ID: #{selectedUser.id.slice(-6)}</p>
                                </div>
                                <div className="flex gap-2">
                                    {selectedUser.id !== currentUser.id && (
                                        <>
                                            <button 
                                                onClick={() => handleToggleSuspension(selectedUser)}
                                                className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 border ${
                                                    selectedUser.isSuspended 
                                                    ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' 
                                                    : 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100'
                                                }`}
                                            >
                                                {selectedUser.isSuspended ? <CheckCircle className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                                                {selectedUser.isSuspended ? 'Re-Activate' : 'Suspend Access'}
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteUser(selectedUser)}
                                                className="px-4 py-2 bg-red-50 text-red-600 rounded-lg font-bold text-sm border border-red-200 hover:bg-red-100 flex items-center gap-2"
                                            >
                                                <Trash2 className="w-4 h-4" /> Delete
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-6">
                                <div className="p-5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl text-white shadow-lg shadow-blue-500/20">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="p-2 bg-white/20 rounded-lg"><DollarSign className="w-5 h-5"/></div>
                                        <span className="text-xs font-bold bg-white/20 px-2 py-1 rounded">TODAY</span>
                                    </div>
                                    <div className="text-3xl font-extrabold">{settings.currency}{todayRevenue.toLocaleString()}</div>
                                    <p className="text-blue-100 text-sm mt-1">Sales Revenue</p>
                                </div>

                                <div className="p-5 bg-white border border-gray-200 rounded-2xl">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg"><Activity className="w-5 h-5"/></div>
                                        <span className="text-xs font-bold bg-gray-100 px-2 py-1 rounded text-gray-500">LIFETIME</span>
                                    </div>
                                    <div className="text-3xl font-extrabold text-gray-900">{totalSalesCount}</div>
                                    <p className="text-gray-500 text-sm mt-1">Total Transactions</p>
                                </div>

                                <div className="p-5 bg-white border border-gray-200 rounded-2xl">
                                     <div className="flex justify-between items-start mb-4">
                                        <div className="p-2 bg-purple-100 text-purple-600 rounded-lg"><DollarSign className="w-5 h-5"/></div>
                                        <span className="text-xs font-bold bg-gray-100 px-2 py-1 rounded text-gray-500">LIFETIME</span>
                                    </div>
                                    <div className="text-3xl font-extrabold text-gray-900">{settings.currency}{totalRevenue.toLocaleString()}</div>
                                    <p className="text-gray-500 text-sm mt-1">Total Generated</p>
                                </div>
                            </div>
                        </div>

                        {/* Recent Activity List */}
                        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 overflow-hidden flex flex-col">
                            <h4 className="font-bold text-gray-800 mb-4">Recent Transactions</h4>
                            <div className="overflow-y-auto flex-1">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="p-3 rounded-l-lg">Time</th>
                                            <th className="p-3">Receipt</th>
                                            <th className="p-3">Items</th>
                                            <th className="p-3 text-right rounded-r-lg">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {userTxs.slice(0, 20).map(t => (
                                            <tr key={t.id} className="border-b hover:bg-gray-50">
                                                <td className="p-3 text-gray-500">{new Date(t.date).toLocaleString()}</td>
                                                <td className="p-3 font-mono text-xs">{t.id.slice(-6)}</td>
                                                <td className="p-3">{t.items.length} items</td>
                                                <td className="p-3 text-right font-bold">{settings.currency}{t.total.toLocaleString()}</td>
                                            </tr>
                                        ))}
                                        {userTxs.length === 0 && (
                                            <tr>
                                                <td colSpan={4} className="p-8 text-center text-gray-400">No activity recorded yet.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex items-center justify-center h-full text-gray-400">
                        <p>Select a user to view details or create a new one.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default UserManagement;