import React, { useState, useEffect } from 'react';
import { User, Shift, ShopSettings } from '../types';
import { StorageService } from '../services/storageService';
import { Clock, CheckCircle, ArrowLeft, History, LogOut, RefreshCw, AlertTriangle } from 'lucide-react';

interface ShiftManagementProps {
    user: User;
    settings: ShopSettings;
    onBack: () => void;
}

const ShiftManagement: React.FC<ShiftManagementProps> = ({ user, settings, onBack }) => {
    const [activeShift, setActiveShift] = useState<Shift | undefined>(undefined);
    const [history, setHistory] = useState<Shift[]>([]);
    const [startCash, setStartCash] = useState('');
    const [endCash, setEndCash] = useState('');
    const [notes, setNotes] = useState('');
    const [viewHistory, setViewHistory] = useState(false);

    useEffect(() => {
        loadData();
    }, [user.id]);

    const loadData = async () => {
        const shifts = await StorageService.getShifts();
        // Strict check: active shift is one without endTime
        const current = shifts.find(s => s.userId === user.id && !s.endTime);
        setActiveShift(current);
        
        // Filter history
        const hist = shifts.filter(s => !!s.endTime).sort((a,b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
        // If cashier, only show their own history
        const displayHist = user.role === 'ADMIN' ? hist : hist.filter(h => h.userId === user.id);
        setHistory(displayHist);
    };

    const handleStartShift = async (e: React.FormEvent) => {
        e.preventDefault();
        const amount = parseFloat(startCash);
        if (isNaN(amount) || amount < 0) {
            alert("Please enter a valid starting cash amount");
            return;
        }
        await StorageService.startShift(user.id, user.name, amount);
        await loadData();
        setStartCash('');
    };

    const handleEndShift = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // 1. Re-fetch active shift directly from storage to ensure we have the absolute latest state
        const shifts = await StorageService.getShifts();
        const currentFresh = shifts.find(s => s.userId === user.id && !s.endTime);
        
        if (!currentFresh) {
            alert("System Error: No active shift found in database for this user. The shift might have been closed already.");
            await loadData();
            return;
        }

        // 2. Validate Input
        const amount = parseFloat(endCash);
        if (isNaN(amount) || amount < 0) {
            alert("Please enter a valid closing cash amount (Actual Count).");
            return;
        }
        
        // 3. Prepare Stats
        const expected = currentFresh.expectedCash || 0;
        const diff = amount - expected;
        const isShortage = diff < 0;
        
        const confirmMsg = `
CONFIRM SHIFT CLOSURE
--------------------------------
Cashier: ${user.name}
Expected Cash: ${settings.currency}${expected.toLocaleString()}
Actual Count:  ${settings.currency}${amount.toLocaleString()}
--------------------------------
Difference:    ${settings.currency}${diff.toLocaleString()} ${isShortage ? '(SHORTAGE)' : diff > 0 ? '(SURPLUS)' : '(PERFECT)'}

Are you sure you want to close this shift?
        `.trim();
        
        if (window.confirm(confirmMsg)) {
            try {
                await StorageService.endShift(currentFresh.id, amount, notes);
                
                alert("Shift Closed Successfully.");
                
                setEndCash('');
                setNotes('');
                await loadData();
            } catch (err) {
                console.error(err);
                alert("Failed to close shift. Please try again.");
            }
        }
    };

    const formatMoney = (val: number) => val.toLocaleString('en-NG', { minimumFractionDigits: 2 });

    return (
        <div className="bg-white rounded-lg shadow-sm h-full flex flex-col">
            <div className="p-6 border-b flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full"><ArrowLeft /></button>
                    <h2 className="text-xl font-bold">Shift Management</h2>
                </div>
                <div className="flex gap-2">
                    <button onClick={loadData} className="text-gray-500 hover:text-blue-600 p-2" title="Refresh Data">
                        <RefreshCw className="w-4 h-4" />
                    </button>
                    <button onClick={() => setViewHistory(!viewHistory)} className="text-blue-600 flex items-center gap-2 text-sm font-bold bg-blue-50 px-3 py-2 rounded-lg hover:bg-blue-100">
                        <History className="w-4 h-4" /> {viewHistory ? 'Current Shift' : 'History'}
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
                {viewHistory ? (
                    <div className="space-y-4">
                        <h3 className="font-bold text-gray-700 mb-4">Shift History ({history.length})</h3>
                        <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="p-3">Date</th>
                                    <th className="p-3">Cashier</th>
                                    <th className="p-3 text-right">Start Cash</th>
                                    <th className="p-3 text-right">Exp. Cash</th>
                                    <th className="p-3 text-right">End Cash</th>
                                    <th className="p-3 text-right">Diff</th>
                                    <th className="p-3">Notes</th>
                                </tr>
                            </thead>
                            <tbody>
                                {history.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="p-8 text-center text-gray-400 italic">No closed shifts history found.</td>
                                    </tr>
                                ) : history.map(shift => (
                                    <tr key={shift.id} className="border-b hover:bg-gray-50">
                                        <td className="p-3">
                                            <div>{new Date(shift.startTime).toLocaleDateString()}</div>
                                            <div className="text-xs text-gray-500">{new Date(shift.startTime).toLocaleTimeString()} - {shift.endTime ? new Date(shift.endTime).toLocaleTimeString() : 'Active'}</div>
                                        </td>
                                        <td className="p-3 font-medium">{shift.userName}</td>
                                        <td className="p-3 text-right">{formatMoney(shift.startCash)}</td>
                                        <td className="p-3 text-right">{formatMoney(shift.expectedCash || 0)}</td>
                                        <td className="p-3 text-right">{formatMoney(shift.endCash || 0)}</td>
                                        <td className={`p-3 text-right font-bold ${(shift.difference || 0) < 0 ? 'text-red-600' : (shift.difference || 0) > 0 ? 'text-green-600' : 'text-gray-600'}`}>
                                            {formatMoney(shift.difference || 0)}
                                        </td>
                                        <td className="p-3 text-gray-500 italic truncate max-w-xs">{shift.notes || '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        </div>
                    </div>
                ) : (
                    <div className="max-w-xl mx-auto">
                        {!activeShift ? (
                            <div className="bg-gray-50 p-8 rounded-lg border-2 border-dashed border-gray-300 text-center animate-in fade-in zoom-in duration-300">
                                <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                                <h3 className="text-xl font-bold text-gray-800 mb-2">Start New Shift</h3>
                                <p className="text-gray-500 mb-6">Enter the amount of cash currently in the drawer to begin tracking.</p>
                                
                                <form onSubmit={handleStartShift} className="text-left max-w-sm mx-auto">
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Opening Cash Amount</label>
                                    <div className="relative mb-4">
                                        <div className="absolute left-3 top-3 text-gray-400 font-bold">{settings.currency}</div>
                                        <input 
                                            type="number" 
                                            value={startCash}
                                            onChange={e => setStartCash(e.target.value)}
                                            className="w-full pl-8 pr-4 py-3 border rounded-lg text-lg font-bold focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                                            placeholder="0.00"
                                            required
                                            min="0"
                                            step="0.01"
                                        />
                                    </div>
                                    <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20">
                                        Start Shift
                                    </button>
                                </form>
                            </div>
                        ) : (
                            <div className="bg-white border rounded-2xl shadow-sm overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
                                <div className="bg-green-50 p-6 border-b border-green-100 flex items-center justify-between">
                                    <div>
                                        <h3 className="text-lg font-bold text-green-800 flex items-center gap-2">
                                            <CheckCircle className="w-5 h-5" /> Shift Active
                                        </h3>
                                        <p className="text-sm text-green-700 mt-1">Started: {new Date(activeShift.startTime).toLocaleString()}</p>
                                        <p className="text-xs text-green-600 font-mono mt-1">ID: {activeShift.id.slice(-6)}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-green-600 uppercase font-bold">Opening Cash</p>
                                        <p className="text-xl font-bold text-green-800">{settings.currency}{formatMoney(activeShift.startCash)}</p>
                                    </div>
                                </div>
                                
                                <div className="p-6">
                                    <div className="mb-8 p-4 bg-blue-50 rounded-xl border border-blue-100 flex justify-between items-center">
                                        <div>
                                            <p className="text-sm text-gray-600 font-bold">Expected Cash in Drawer</p>
                                            <p className="text-xs text-gray-500">Opening + Cash Sales</p>
                                        </div>
                                        <div className="text-3xl font-extrabold text-blue-600">
                                            {settings.currency}{formatMoney(activeShift.expectedCash || 0)}
                                        </div>
                                    </div>

                                    <div className="border-t border-gray-100 pt-6">
                                        <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                                            <LogOut className="w-4 h-4 text-gray-500" /> End Shift & Reconcile
                                        </h4>
                                        
                                        <form onSubmit={handleEndShift} className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Actual Cash Counted</label>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-3 text-gray-400 font-bold">{settings.currency}</span>
                                                    <input 
                                                        type="number" 
                                                        value={endCash}
                                                        onChange={e => setEndCash(e.target.value)}
                                                        className="w-full border border-gray-200 pl-8 pr-3 py-3 rounded-xl font-bold text-lg bg-white text-gray-900 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all"
                                                        placeholder="0.00"
                                                        min="0"
                                                        step="0.01"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Notes / Discrepancy Reason</label>
                                                <textarea 
                                                    value={notes}
                                                    onChange={e => setNotes(e.target.value)}
                                                    className="w-full border border-gray-200 p-3 rounded-xl bg-white text-gray-900 focus:ring-2 focus:ring-gray-200 outline-none transition-all"
                                                    placeholder="Explain any shortages or surpluses..."
                                                    rows={2}
                                                />
                                            </div>
                                            <button type="submit" className="w-full bg-red-600 text-white py-4 rounded-xl font-bold hover:bg-red-700 shadow-lg shadow-red-500/20 transition-all active:scale-[0.98]">
                                                Close Shift
                                            </button>
                                        </form>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ShiftManagement;