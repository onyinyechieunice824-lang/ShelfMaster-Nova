
import React, { useState, useEffect } from 'react';
import { Customer, ShopSettings } from '../types';
import { StorageService } from '../services/storageService';
import { Users, Search, Plus, Edit, Trash2, Save, X, ArrowLeft, Phone, Mail } from 'lucide-react';

interface CustomerManagerProps {
    settings: ShopSettings;
    onBack: () => void;
}

const CustomerManager: React.FC<CustomerManagerProps> = ({ settings, onBack }) => {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [currentCustomer, setCurrentCustomer] = useState<Partial<Customer>>({});

    useEffect(() => {
        const load = async () => {
            setCustomers(await StorageService.getCustomers());
        }
        load();
    }, []);

    const filtered = customers.filter(c => 
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        c.phone.includes(searchQuery)
    );

    const handleSave = async () => {
        if (!currentCustomer.name || !currentCustomer.phone) {
            alert("Name and Phone are required");
            return;
        }

        const customer: Customer = {
            id: currentCustomer.id || StorageService.generateId(),
            name: currentCustomer.name,
            phone: currentCustomer.phone,
            email: currentCustomer.email || '',
            address: currentCustomer.address || '',
            balance: currentCustomer.balance || 0,
            lastVisit: currentCustomer.lastVisit || new Date().toISOString()
        };

        await StorageService.saveCustomer(customer);
        setCustomers(await StorageService.getCustomers());
        setIsEditing(false);
        setCurrentCustomer({});
    };

    return (
        <div className="bg-white rounded-lg shadow-sm h-full flex flex-col">
            <div className="p-6 border-b flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full"><ArrowLeft /></button>
                    <h2 className="text-xl font-bold">Customers</h2>
                </div>
                <div className="flex gap-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <input 
                            type="text" 
                            placeholder="Search name or phone..." 
                            className="pl-9 pr-4 py-2 border rounded-lg bg-white text-gray-900"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <button onClick={() => { setCurrentCustomer({}); setIsEditing(true); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex gap-2 items-center">
                        <Plus className="w-4 h-4" /> Add Customer
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
                <table className="w-full text-left">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="p-3">Name</th>
                            <th className="p-3">Contact</th>
                            <th className="p-3 text-right">Balance</th>
                            <th className="p-3">Last Visit</th>
                            <th className="p-3 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map(c => (
                            <tr key={c.id} className="border-b hover:bg-gray-50">
                                <td className="p-3 font-medium">{c.name}</td>
                                <td className="p-3 text-sm text-gray-600">
                                    <div className="flex items-center gap-1"><Phone className="w-3 h-3"/> {c.phone}</div>
                                    {c.email && <div className="flex items-center gap-1"><Mail className="w-3 h-3"/> {c.email}</div>}
                                </td>
                                <td className={`p-3 text-right font-bold ${c.balance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                    {settings.currency}{c.balance.toLocaleString()}
                                </td>
                                <td className="p-3 text-sm text-gray-500">{new Date(c.lastVisit).toLocaleDateString()}</td>
                                <td className="p-3 flex justify-center gap-2">
                                    <button onClick={() => { setCurrentCustomer(c); setIsEditing(true); }} className="p-2 text-blue-600 bg-blue-50 rounded"><Edit className="w-4 h-4" /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {isEditing && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg w-full max-w-md">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold">{currentCustomer.id ? 'Edit Customer' : 'Add New Customer'}</h3>
                            <button onClick={() => setIsEditing(false)}><X /></button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold mb-1">Name</label>
                                <input className="w-full border rounded p-2 bg-white text-gray-900" value={currentCustomer.name || ''} onChange={e => setCurrentCustomer({...currentCustomer, name: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-1">Phone (WhatsApp)</label>
                                <input className="w-full border rounded p-2 bg-white text-gray-900" value={currentCustomer.phone || ''} onChange={e => setCurrentCustomer({...currentCustomer, phone: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-1">Email (Optional)</label>
                                <input className="w-full border rounded p-2 bg-white text-gray-900" value={currentCustomer.email || ''} onChange={e => setCurrentCustomer({...currentCustomer, email: e.target.value})} />
                            </div>
                             <div>
                                <label className="block text-sm font-bold mb-1">Address (Optional)</label>
                                <input className="w-full border rounded p-2 bg-white text-gray-900" value={currentCustomer.address || ''} onChange={e => setCurrentCustomer({...currentCustomer, address: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-1">Balance (Negative = Debt)</label>
                                <input type="number" className="w-full border rounded p-2 bg-white text-gray-900" value={currentCustomer.balance || 0} onChange={e => setCurrentCustomer({...currentCustomer, balance: Number(e.target.value)})} />
                            </div>
                            <button onClick={handleSave} className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold mt-4">Save Customer</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomerManager;
