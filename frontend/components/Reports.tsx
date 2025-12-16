import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { StorageService } from '../services/storageService';
import { analyzeSalesWithGemini } from '../services/geminiService';
import { Transaction, Product, ShopSettings } from '../types';
import { Sparkles, TrendingUp, AlertTriangle, DollarSign, ArrowLeft, Printer, Search, Calendar, CreditCard, Banknote, Landmark } from 'lucide-react';
import { Receipt } from './Receipt';

const Reports: React.FC<{ settings: ShopSettings; onBack: () => void }> = ({ settings, onBack }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [aiInsight, setAiInsight] = useState<string>('');
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [printingTx, setPrintingTx] = useState<Transaction | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Date Filtering State (Default to current month)
  const date = new Date();
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
  const today = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(firstDay);
  const [endDate, setEndDate] = useState(today);

  useEffect(() => {
    const loadData = async () => {
        setTransactions(await StorageService.getTransactions());
        setProducts(await StorageService.getProducts());
    };
    loadData();
  }, []);

  const formatMoney = (amount: number) => {
    return amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // --- FILTERING ---
  const filteredByDate = transactions.filter(t => {
      const tDate = t.date.split('T')[0];
      return tDate >= startDate && tDate <= endDate;
  });

  // --- METRICS CALCULATION (Based on Filtered Data) ---
  const totalRevenue = filteredByDate.reduce((acc, t) => acc + t.total, 0);
  
  const totalProfit = filteredByDate.reduce((acc, t) => {
    const cost = t.items.reduce((itemAcc, item) => {
      const product = products.find(p => p.id === item.productId);
      return itemAcc + (product ? product.costPrice * item.quantity : 0);
    }, 0);
    return acc + (t.subtotal - cost); // Profit logic
  }, 0);

  const lowStockCount = products.filter(p => p.quantity <= p.minStock).length;

  // --- PAYMENT METHOD AGGREGATION ---
  const paymentStats = filteredByDate.reduce((acc, t) => {
      t.payments.forEach(p => {
          if (!acc[p.method]) {
              acc[p.method] = { count: 0, total: 0 };
          }
          acc[p.method].count += 1;
          acc[p.method].total += p.amount;
      });
      return acc;
  }, {} as Record<string, { count: number, total: number }>);

  // Convert for rendering
  const paymentData = Object.keys(paymentStats).map(method => ({
      method,
      ...paymentStats[method]
  }));

  // Chart Data Preparation
  const salesByDate = filteredByDate.reduce((acc, t) => {
    const date = t.date.split('T')[0];
    acc[date] = (acc[date] || 0) + t.total;
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.keys(salesByDate).map(date => ({
    date,
    sales: salesByDate[date]
  })).sort((a, b) => a.date.localeCompare(b.date));

  const handleAiAnalysis = async () => {
    setIsLoadingAi(true);
    const insight = await analyzeSalesWithGemini(filteredByDate, products);
    setAiInsight(insight);
    setIsLoadingAi(false);
  };

  const handlePrint = (tx: Transaction) => {
    setPrintingTx(tx);
    setTimeout(() => {
        window.print();
    }, 100);
  };

  // List filter (Search + Date)
  const displayTransactions = filteredByDate
    .filter(t => 
        t.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
        t.cashierName.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 50);

  const getPaymentIcon = (method: string) => {
      switch(method) {
          case 'CASH': return <Banknote className="w-5 h-5 text-green-600"/>;
          case 'CARD': return <CreditCard className="w-5 h-5 text-blue-600"/>;
          case 'TRANSFER': return <Landmark className="w-5 h-5 text-purple-600"/>;
          default: return <DollarSign className="w-5 h-5 text-gray-600"/>;
      }
  };

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      {/* Header & Date Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 rounded-full hover:bg-white shadow-sm transition-colors text-gray-700">
                <ArrowLeft className="w-6 h-6" />
            </button>
            <h2 className="text-2xl font-bold text-gray-800">Business Analytics</h2>
          </div>
          
          <div className="flex items-center gap-2 bg-white p-2 rounded-xl shadow-sm border border-gray-100">
              <Calendar className="w-5 h-5 text-gray-400 ml-2" />
              <div className="flex items-center gap-2">
                  <input 
                    type="date" 
                    value={startDate} 
                    onChange={e => setStartDate(e.target.value)}
                    className="text-sm font-bold text-gray-700 bg-transparent outline-none cursor-pointer"
                  />
                  <span className="text-gray-300">-</span>
                  <input 
                    type="date" 
                    value={endDate} 
                    onChange={e => setEndDate(e.target.value)}
                    className="text-sm font-bold text-gray-700 bg-transparent outline-none cursor-pointer"
                  />
              </div>
          </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-green-500">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500">Revenue (Selected Period)</p>
              <h3 className="text-2xl font-bold">{settings.currency}{formatMoney(totalRevenue)}</h3>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-blue-500">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500">Profit (Estimated)</p>
              <h3 className="text-2xl font-bold text-blue-600">{settings.currency}{formatMoney(totalProfit)}</h3>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-red-500">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500">Low Stock Alerts</p>
              <h3 className="text-2xl font-bold text-red-600">{lowStockCount}</h3>
            </div>
            <div className="bg-red-100 p-3 rounded-full">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sales Trend Chart */}
          <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-bold mb-4">Sales Trend</h3>
            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="sales" stroke="#2563eb" strokeWidth={2} />
                </LineChart>
                </ResponsiveContainer>
            </div>
          </div>

          {/* Payment Methods Breakdown */}
          <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow-sm flex flex-col">
              <h3 className="text-lg font-bold mb-4">Payment Methods</h3>
              <div className="flex-1 space-y-4">
                  {paymentData.length === 0 ? (
                      <div className="text-center text-gray-400 py-10">No payments in period</div>
                  ) : (
                      paymentData.map((data) => (
                          <div key={data.method} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                              <div className="flex items-center gap-3">
                                  <div className="p-2 bg-white rounded-lg shadow-sm">
                                      {getPaymentIcon(data.method)}
                                  </div>
                                  <div>
                                      <div className="font-bold text-gray-800">{data.method}</div>
                                      <div className="text-xs text-gray-500">{data.count} transactions</div>
                                  </div>
                              </div>
                              <div className="text-right">
                                  <div className="font-bold text-gray-900">{settings.currency}{formatMoney(data.total)}</div>
                                  <div className="text-xs text-gray-500">
                                      {((data.total / (totalRevenue || 1)) * 100).toFixed(1)}%
                                  </div>
                              </div>
                          </div>
                      ))
                  )}
              </div>
          </div>
      </div>

      {/* AI Section */}
      <div className="bg-white p-6 rounded-lg shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              AI Insights
            </h3>
            <button 
              onClick={handleAiAnalysis}
              disabled={isLoadingAi}
              className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
            >
              {isLoadingAi ? 'Analyzing...' : 'Generate Report'}
            </button>
          </div>
          
          <div className="bg-purple-50 rounded-lg p-4 text-sm text-gray-700 leading-relaxed border border-purple-100 min-h-[100px]">
            {aiInsight ? (
              <div className="whitespace-pre-line">{aiInsight}</div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 py-4">
                <p>Click "Generate Report" to ask Gemini to analyze sales performance and inventory health for the selected period.</p>
              </div>
            )}
          </div>
      </div>

      {/* Recent Transactions List */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold">Transactions ({displayTransactions.length})</h3>
            <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input 
                    type="text" 
                    placeholder="Search ID..." 
                    className="pl-9 pr-4 py-2 border rounded text-sm bg-white text-gray-900"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>
        </div>
        
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
                <thead>
                    <tr className="bg-gray-50 border-b">
                        <th className="p-3">Time</th>
                        <th className="p-3">Receipt #</th>
                        <th className="p-3">Cashier</th>
                        <th className="p-3">Payment</th>
                        <th className="p-3 text-right">Total</th>
                        <th className="p-3 text-center">Action</th>
                    </tr>
                </thead>
                <tbody>
                    {displayTransactions.map(t => (
                        <tr key={t.id} className="border-b hover:bg-gray-50">
                            <td className="p-3">{new Date(t.date).toLocaleString()}</td>
                            <td className="p-3 font-mono text-xs">{t.id.slice(-6)}</td>
                            <td className="p-3">{t.cashierName}</td>
                            <td className="p-3">
                                <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                                    {t.payments.map(p => p.method).join('+')}
                                </span>
                            </td>
                            <td className="p-3 text-right font-bold">{settings.currency}{formatMoney(t.total)}</td>
                            <td className="p-3 text-center">
                                <button 
                                    onClick={() => handlePrint(t)} 
                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                    title="Reprint Receipt"
                                >
                                    <Printer className="w-4 h-4" />
                                </button>
                            </td>
                        </tr>
                    ))}
                    {displayTransactions.length === 0 && (
                        <tr>
                            <td colSpan={6} className="p-8 text-center text-gray-400">No transactions found in selected period</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>

      {/* Hidden Receipt Component for Printing */}
      <Receipt transaction={printingTx} settings={settings} />
    </div>
  );
};

export default Reports;