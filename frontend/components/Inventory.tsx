import React, { useState, useEffect, useRef } from 'react';
import { Product, ShopSettings, Batch, ProductUnit, PriceHistory, User } from '../types'; 
import { StorageService } from '../services/storageService';
import { Plus, Edit, Trash2, Save, X, RefreshCw, ScanBarcode, Search, Camera, ArrowLeft, Calendar, Package, TrendingUp, Calculator } from 'lucide-react';
import BarcodeScanner from './BarcodeScanner';

const Inventory: React.FC<{ settings: ShopSettings; onBack: () => void; user?: User }> = ({ settings, onBack, user }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Partial<Product>>({});
  const [searchQuery, setSearchQuery] = useState('');
  
  const [scanTarget, setScanTarget] = useState<'MAIN' | { type: 'UNIT', index: number } | null>(null);
  
  const [modalTab, setModalTab] = useState<'DETAILS' | 'BATCHES' | 'UNITS' | 'HISTORY'>('DETAILS');

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
      setProducts(await StorageService.getProducts());
  };

  const formatMoney = (amount: number) => {
    return amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.barcode.includes(searchQuery)
  );

  const handleSave = async () => {
    if (!currentProduct.name || !currentProduct.barcode || currentProduct.sellingPrice === undefined) {
      alert("Name, Barcode, and Selling Price are required.");
      return;
    }

    const existing = products.find(p => p.barcode === currentProduct.barcode && p.id !== currentProduct.id);
    if (existing) {
        alert(`Barcode '${currentProduct.barcode}' is already in use by '${existing.name}'.`);
        return;
    }

    // Validate Units
    if (currentProduct.units && currentProduct.units.length > 0) {
        for (const u of currentProduct.units) {
            if (!u.name.trim()) {
                alert("All units must have a name (e.g., Carton).");
                return;
            }
            if (u.multiplier <= 1) {
                alert(`Multiplier for unit '${u.name}' should be greater than 1.`);
                return;
            }
        }
    }

    let totalQty = currentProduct.quantity || 0;
    if (currentProduct.batches && currentProduct.batches.length > 0) {
        totalQty = currentProduct.batches.reduce((acc, b) => acc + b.quantity, 0);
    }

    let priceHistory = currentProduct.priceHistory || [];
    if (currentProduct.id) {
        const oldProduct = products.find(p => p.id === currentProduct.id);
        if (oldProduct && oldProduct.sellingPrice !== Number(currentProduct.sellingPrice)) {
            priceHistory.unshift({
                date: new Date().toISOString(),
                oldPrice: oldProduct.sellingPrice,
                newPrice: Number(currentProduct.sellingPrice),
                changedBy: user?.name || 'Unknown'
            });
        }
    }

    const product: Product = {
      id: currentProduct.id || StorageService.generateId(),
      name: currentProduct.name,
      barcode: currentProduct.barcode,
      category: currentProduct.category || 'General',
      costPrice: Number(currentProduct.costPrice) || 0,
      sellingPrice: Number(currentProduct.sellingPrice) || 0,
      quantity: Number(totalQty),
      minStock: Number(currentProduct.minStock) || 5,
      lastUpdated: new Date().toISOString(),
      batches: currentProduct.batches || [],
      units: currentProduct.units || [],
      priceHistory: priceHistory
    };

    await StorageService.saveProduct(product, user); 
    await loadProducts();
    setIsEditing(false);
    setCurrentProduct({});
  };

  const handleDelete = async (id: string) => {
      if(confirm("Are you sure?")) {
          await StorageService.deleteProduct(id, user);
          await loadProducts();
      }
  };

  const handleInventoryScan = (code: string) => {
      const existing = products.find(p => p.barcode === code && p.id !== currentProduct.id);
      const existingUnit = products.find(p => p.units?.some(u => u.barcode === code) && p.id !== currentProduct.id);

      if (existing) {
          alert(`Warning: Barcode '${code}' is already assigned to '${existing.name}'`);
      } else if (existingUnit) {
          alert(`Warning: Barcode '${code}' is already assigned to a unit in '${existingUnit.name}'`);
      }

      if (scanTarget === 'MAIN') {
          setCurrentProduct(prev => ({ ...prev, barcode: code }));
      } else if (scanTarget && typeof scanTarget === 'object' && scanTarget.type === 'UNIT') {
          const updatedUnits = [...(currentProduct.units || [])];
          if (updatedUnits[scanTarget.index]) {
              updatedUnits[scanTarget.index].barcode = code;
              setCurrentProduct(prev => ({ ...prev, units: updatedUnits }));
          }
      }
      setScanTarget(null);
  };

  const addBatch = () => {
      const newBatch: Batch = {
          id: StorageService.generateId(),
          batchNumber: '',
          expiryDate: new Date().toISOString().split('T')[0],
          quantity: 0
      };
      setCurrentProduct({
          ...currentProduct,
          batches: [...(currentProduct.batches || []), newBatch]
      });
  };

  const updateBatch = (index: number, field: keyof Batch, value: any) => {
      const updated = [...(currentProduct.batches || [])];
      updated[index] = { ...updated[index], [field]: value };
      setCurrentProduct({ ...currentProduct, batches: updated });
  };

  const removeBatch = (index: number) => {
      const updated = [...(currentProduct.batches || [])];
      updated.splice(index, 1);
      setCurrentProduct({ ...currentProduct, batches: updated });
  };

  const addUnit = () => {
      const newUnit: ProductUnit = {
          name: '',
          multiplier: 6,
          barcode: '',
          price: 0
      };
      setCurrentProduct({
          ...currentProduct,
          units: [...(currentProduct.units || []), newUnit]
      });
  };

  const updateUnit = (index: number, field: keyof ProductUnit, value: any) => {
      const updated = [...(currentProduct.units || [])];
      updated[index] = { ...updated[index], [field]: value };
      setCurrentProduct({ ...currentProduct, units: updated });
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm h-full flex flex-col relative overflow-hidden border border-gray-100">
      {/* Scanner Overlay */}
      {scanTarget && (
          <BarcodeScanner 
            onScan={handleInventoryScan} 
            onClose={() => setScanTarget(null)}
            continuous={false}
          />
      )}

      <div className="p-6 border-b border-gray-100 flex justify-between items-center gap-4 bg-white z-10">
        <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"><ArrowLeft className="w-5 h-5" /></button>
            <h2 className="text-2xl font-bold tracking-tight text-gray-900">Inventory</h2>
        </div>
        <div className="flex gap-3">
            <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input 
                    type="text" 
                    placeholder="Search products..." 
                    className="pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none w-64 text-sm bg-white text-gray-900 placeholder-gray-400 focus:bg-white transition-colors"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                />
            </div>
            <button onClick={() => { setCurrentProduct({batches:[], units:[], priceHistory: []}); setIsEditing(true); setModalTab('DETAILS'); }} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl flex gap-2 items-center font-bold text-sm shadow-lg shadow-blue-200 transition-all active:scale-95">
                <Plus className="w-4 h-4" /> Add Product
            </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              <th className="p-5 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">Product Name</th>
              <th className="p-5 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">Barcode</th>
              <th className="p-5 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200 text-right">Price</th>
              <th className="p-5 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200 text-right">Stock</th>
              <th className="p-5 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200 text-center">Expiry</th>
              <th className="p-5 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredProducts.map(p => {
                const earliestExpiry = p.batches && p.batches.length > 0 
                    ? p.batches.sort((a,b) => a.expiryDate.localeCompare(b.expiryDate))[0].expiryDate 
                    : null;
                
                return (
                  <tr key={p.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="p-5">
                        <div className="font-bold text-gray-800">{p.name}</div>
                        {p.units && p.units.length > 0 && (
                            <div className="text-xs text-purple-600 flex flex-wrap gap-1 mt-1 font-medium">
                                {p.units.map(u => <span key={u.name} className="bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100">{u.name} (x{u.multiplier})</span>)}
                            </div>
                        )}
                    </td>
                    <td className="p-5 text-gray-500 font-mono text-xs">{p.barcode}</td>
                    <td className="p-5 text-right font-bold text-blue-600">{settings.currency}{formatMoney(p.sellingPrice)}</td>
                    <td className="p-5 text-right">
                        <span className={`font-bold px-2 py-1 rounded ${p.quantity <= p.minStock ? 'bg-red-100 text-red-600' : 'text-gray-700'}`}>
                            {p.quantity}
                        </span>
                    </td>
                    <td className="p-5 text-center text-xs">
                        {earliestExpiry ? (
                             <span className={`px-2 py-1 rounded font-medium ${new Date(earliestExpiry) < new Date() ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>
                                 {earliestExpiry}
                             </span>
                        ) : <span className="text-gray-300">-</span>}
                    </td>
                    <td className="p-5">
                        <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => { setCurrentProduct(p); setIsEditing(true); setModalTab('DETAILS'); }} className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"><Edit className="w-4 h-4" /></button>
                            <button onClick={() => handleDelete(p.id)} className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                        </div>
                    </td>
                  </tr>
                );
            })}
          </tbody>
        </table>
      </div>

      {isEditing && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl p-0 shadow-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-xl font-bold text-gray-900">{currentProduct.id ? 'Edit Product' : 'Add New Product'}</h3>
              <button onClick={() => setIsEditing(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><X className="w-5 h-5 text-gray-500" /></button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-100 px-6 pt-2">
                {['DETAILS', 'BATCHES', 'UNITS', 'HISTORY'].map((tab) => (
                    <button 
                        key={tab}
                        onClick={() => setModalTab(tab as any)} 
                        className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${
                            modalTab === tab 
                            ? 'border-blue-600 text-blue-600' 
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        {tab === 'DETAILS' ? 'Basic Info' : tab.charAt(0) + tab.slice(1).toLowerCase()}
                    </button>
                ))}
            </div>
            
            <div className="p-8 overflow-y-auto flex-1">
                {modalTab === 'DETAILS' && (
                    <div className="grid grid-cols-2 gap-6">
                    <div className="col-span-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 block">Product Name</label>
                        <input className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 placeholder-gray-400 focus:bg-white transition-colors" value={currentProduct.name || ''} onChange={e => setCurrentProduct({...currentProduct, name: e.target.value})} placeholder="e.g. Coca Cola" />
                    </div>
                    <div className="col-span-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 block">Barcode</label>
                        <div className="flex gap-2">
                            <input className="w-full border border-gray-200 rounded-xl p-3 font-mono text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 placeholder-gray-400 focus:bg-white transition-colors" value={currentProduct.barcode || ''} onChange={e => setCurrentProduct({...currentProduct, barcode: e.target.value})} placeholder="Scan or type..." />
                            <button 
                                type="button"
                                className="bg-blue-50 text-blue-600 px-4 rounded-xl hover:bg-blue-100 flex items-center gap-2 font-bold text-xs border border-blue-100 transition-colors"
                                onClick={() => setScanTarget('MAIN')}
                            >
                                <ScanBarcode className="w-4 h-4" /> Scan
                            </button>
                            <button className="bg-gray-50 px-3 rounded-xl hover:bg-gray-100 border border-gray-200 transition-colors" title="Generate Random" onClick={() => setCurrentProduct({...currentProduct, barcode: Math.floor(Math.random()*1000000000).toString()})}><RefreshCw className="w-4 h-4 text-gray-500"/></button>
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 block">Cost Price</label>
                        <input type="number" className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 placeholder-gray-400 focus:bg-white transition-colors" value={currentProduct.costPrice || ''} onChange={e => setCurrentProduct({...currentProduct, costPrice: Number(e.target.value)})} />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 block">Selling Price</label>
                        <input type="number" className="w-full border border-gray-200 rounded-xl p-3 font-bold text-blue-600 focus:ring-2 focus:ring-blue-500 outline-none bg-white placeholder-gray-400 focus:bg-white transition-colors" value={currentProduct.sellingPrice || ''} onChange={e => setCurrentProduct({...currentProduct, sellingPrice: Number(e.target.value)})} />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 block">Low Stock Alert</label>
                        <input type="number" className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 placeholder-gray-400 focus:bg-white transition-colors" value={currentProduct.minStock || ''} onChange={e => setCurrentProduct({...currentProduct, minStock: Number(e.target.value)})} />
                    </div>
                    </div>
                )}

                {modalTab === 'BATCHES' && (
                    <div className="space-y-4">
                        <div className="bg-blue-50 p-4 rounded-xl text-sm text-blue-700 border border-blue-100 flex gap-3">
                            <Package className="w-5 h-5 shrink-0" />
                            <p>Adding batches will automatically update total stock quantity. FIFO (First-In-First-Out) logic is used for sales deduction.</p>
                        </div>
                        {currentProduct.batches?.map((batch, idx) => (
                            <div key={idx} className="flex gap-3 items-end border border-gray-200 p-4 rounded-xl bg-gray-50/50">
                                <div className="flex-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase">Batch #</label>
                                    <input className="w-full border border-gray-200 rounded-lg p-2 text-sm bg-white text-gray-900 placeholder-gray-400" value={batch.batchNumber} onChange={e => updateBatch(idx, 'batchNumber', e.target.value)} />
                                </div>
                                <div className="flex-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase">Expiry Date</label>
                                    <input type="date" className="w-full border border-gray-200 rounded-lg p-2 text-sm bg-white text-gray-900 placeholder-gray-400" value={batch.expiryDate} onChange={e => updateBatch(idx, 'expiryDate', e.target.value)} />
                                </div>
                                <div className="w-24">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase">Qty</label>
                                    <input type="number" className="w-full border border-gray-200 rounded-lg p-2 font-bold text-sm bg-white text-gray-900 placeholder-gray-400" value={batch.quantity} onChange={e => updateBatch(idx, 'quantity', Number(e.target.value))} />
                                </div>
                                <button onClick={() => removeBatch(idx)} className="text-red-400 hover:text-red-600 p-2 bg-white border border-gray-200 rounded-lg hover:border-red-200"><Trash2 className="w-4 h-4" /></button>
                            </div>
                        ))}
                        <button onClick={addBatch} className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-blue-400 hover:text-blue-500 font-bold text-sm flex items-center justify-center gap-2 transition-colors">
                            <Plus className="w-4 h-4"/> Add New Batch
                        </button>
                        
                        {(!currentProduct.batches || currentProduct.batches.length === 0) && (
                            <div className="mt-6 pt-6 border-t border-gray-100">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 block">Simple Quantity (No Batching)</label>
                                <input type="number" className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none font-bold bg-white text-gray-900 placeholder-gray-400 focus:bg-white transition-colors" value={currentProduct.quantity || ''} onChange={e => setCurrentProduct({...currentProduct, quantity: Number(e.target.value)})} />
                            </div>
                        )}
                    </div>
                )}

                {modalTab === 'UNITS' && (
                    <div className="space-y-4">
                        <div className="bg-purple-50 p-4 rounded-xl text-sm text-purple-700 border border-purple-100">
                            <h4 className="font-bold flex items-center gap-2 mb-1">
                                <Package className="w-4 h-4" /> Unit & Pack Management
                            </h4>
                            <p>Define alternative selling units (e.g., Cartons, Packs). The <strong>multiplier</strong> is how many single items are in this unit.</p>
                        </div>
                        {currentProduct.units?.map((unit, idx) => (
                            <div key={idx} className="border border-gray-200 p-4 rounded-xl bg-gray-50/50 grid grid-cols-2 gap-4 relative group">
                                <button onClick={() => {
                                     const u = [...(currentProduct.units || [])];
                                     u.splice(idx, 1);
                                     setCurrentProduct({...currentProduct, units: u});
                                }} className="absolute top-2 right-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-4 h-4"/></button>
                                
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Unit Name</label>
                                    <input className="w-full border border-gray-200 rounded-lg p-2 text-sm bg-white text-gray-900 placeholder-gray-400" value={unit.name} onChange={e => updateUnit(idx, 'name', e.target.value)} placeholder="e.g. Carton" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Multiplier (Quantity in Unit)</label>
                                    <input type="number" className="w-full border border-gray-200 rounded-lg p-2 text-sm bg-white text-gray-900 placeholder-gray-400" value={unit.multiplier} onChange={e => updateUnit(idx, 'multiplier', Number(e.target.value))} placeholder="12" />
                                </div>
                                <div className="col-span-2">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Unit Barcode</label>
                                    <div className="flex gap-2">
                                        <input className="w-full border border-gray-200 rounded-lg p-2 font-mono text-sm bg-white text-gray-900 placeholder-gray-400" value={unit.barcode} onChange={e => updateUnit(idx, 'barcode', e.target.value)} placeholder="Scan code..." />
                                        <button 
                                            type="button"
                                            className="bg-purple-100 text-purple-600 px-3 rounded-lg hover:bg-purple-200 flex items-center gap-1 font-bold text-xs"
                                            onClick={() => setScanTarget({ type: 'UNIT', index: idx })}
                                        >
                                            <ScanBarcode className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Unit Price (Override)</label>
                                    <div className="flex gap-2">
                                        <input type="number" className="w-full border border-gray-200 rounded-lg p-2 text-sm bg-white text-gray-900 placeholder-gray-400" value={unit.price} onChange={e => updateUnit(idx, 'price', Number(e.target.value))} />
                                        <button 
                                            onClick={() => updateUnit(idx, 'price', (currentProduct.sellingPrice || 0) * unit.multiplier)}
                                            className="bg-gray-200 text-gray-600 p-2 rounded-lg hover:bg-gray-300"
                                            title="Auto-calculate based on base price"
                                        >
                                            <Calculator className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                <div className="col-span-2 text-xs text-gray-500 italic flex items-center gap-1">
                                    <TrendingUp className="w-3 h-3" />
                                    <span>Conversion: 1 <strong>{unit.name || 'Unit'}</strong> = <strong>{unit.multiplier}</strong> x {currentProduct.name || 'Item'}</span>
                                    {unit.price > 0 && <span>(@ {settings.currency}{formatMoney(unit.price)})</span>}
                                </div>
                            </div>
                        ))}
                        <button onClick={addUnit} className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-purple-400 hover:text-purple-600 font-bold text-sm flex items-center justify-center gap-2 transition-colors">
                            <Package className="w-4 h-4"/> Add Unit Type
                        </button>
                    </div>
                )}

                {modalTab === 'HISTORY' && (
                    <div className="space-y-4">
                        {(!currentProduct.priceHistory || currentProduct.priceHistory.length === 0) ? (
                            <div className="text-center py-12 text-gray-400">
                                <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                <p>No price changes recorded yet.</p>
                            </div>
                        ) : (
                            <div className="border border-gray-100 rounded-xl overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50">
                                        <tr className="text-left">
                                            <th className="py-3 px-4 font-bold text-gray-500 text-xs uppercase">Date</th>
                                            <th className="py-3 px-4 font-bold text-gray-500 text-xs uppercase">Old</th>
                                            <th className="py-3 px-4 font-bold text-gray-500 text-xs uppercase">New</th>
                                            <th className="py-3 px-4 font-bold text-gray-500 text-xs uppercase">User</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {currentProduct.priceHistory.map((h, i) => (
                                            <tr key={i}>
                                                <td className="py-3 px-4 text-gray-600">{new Date(h.date).toLocaleDateString()}</td>
                                                <td className="py-3 px-4 text-gray-400 line-through">{settings.currency}{h.oldPrice}</td>
                                                <td className="py-3 px-4 font-bold text-blue-600">{settings.currency}{h.newPrice}</td>
                                                <td className="py-3 px-4 text-xs bg-gray-50 text-gray-500 font-mono">{h.changedBy}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
              <button onClick={() => setIsEditing(false)} className="px-6 py-3 border border-gray-300 rounded-xl font-bold text-gray-600 hover:bg-white transition-colors">Cancel</button>
              <button onClick={handleSave} className="px-8 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 flex items-center gap-2 font-bold shadow-lg shadow-blue-200 transition-transform active:scale-95">
                <Save className="w-4 h-4" /> Save Product
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;