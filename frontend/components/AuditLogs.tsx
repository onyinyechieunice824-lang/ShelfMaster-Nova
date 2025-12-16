import React, { useState, useEffect } from 'react';
import { AuditLog } from '../types';
import { StorageService } from '../services/storageService';
import { ShieldCheck, ArrowLeft, Filter } from 'lucide-react';

interface AuditLogsProps {
    onBack: () => void;
}

const AuditLogs: React.FC<AuditLogsProps> = ({ onBack }) => {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [filter, setFilter] = useState('');

    useEffect(() => {
        const load = async () => {
            setLogs(await StorageService.getAuditLogs());
        }
        load();
    }, []);

    const filteredLogs = logs.filter(l => 
        l.details.toLowerCase().includes(filter.toLowerCase()) || 
        l.userName.toLowerCase().includes(filter.toLowerCase()) ||
        l.action.toLowerCase().includes(filter.toLowerCase())
    );

    return (
        <div className="bg-white rounded-lg shadow-sm h-full flex flex-col">
            <div className="p-6 border-b flex justify-between items-center">
                 <div className="flex items-center gap-3">
                    <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full"><ArrowLeft /></button>
                    <h2 className="text-xl font-bold">Security & Audit Logs</h2>
                </div>
                 <div className="relative">
                    <Filter className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <input 
                        type="text" 
                        placeholder="Filter logs..." 
                        className="pl-9 pr-4 py-2 border rounded-lg bg-white text-gray-900"
                        value={filter}
                        onChange={e => setFilter(e.target.value)}
                    />
                </div>
            </div>

            <div className="bg-yellow-50 p-3 text-xs text-yellow-800 text-center font-medium">
                System tracks high-value actions: Price Changes, Deletions, Shift operations.
            </div>

            <div className="flex-1 overflow-y-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="p-3">Time</th>
                            <th className="p-3">User</th>
                            <th className="p-3">Action</th>
                            <th className="p-3">Severity</th>
                            <th className="p-3">Details</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredLogs.map(log => (
                            <tr key={log.id} className="border-b hover:bg-gray-50">
                                <td className="p-3 text-gray-500 whitespace-nowrap">{new Date(log.date).toLocaleString()}</td>
                                <td className="p-3 font-bold">{log.userName}</td>
                                <td className="p-3">
                                    <span className="bg-gray-200 px-2 py-1 rounded text-xs font-mono">{log.action}</span>
                                </td>
                                <td className="p-3">
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                                        log.severity === 'HIGH' ? 'bg-red-100 text-red-600' : 
                                        log.severity === 'MEDIUM' ? 'bg-orange-100 text-orange-600' : 
                                        'bg-blue-100 text-blue-600'
                                    }`}>
                                        {log.severity}
                                    </span>
                                </td>
                                <td className="p-3 text-gray-700">{log.details}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AuditLogs;