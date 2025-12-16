
import React from 'react';
import { Transaction, ShopSettings } from '../types';

interface ReceiptProps {
  transaction: Transaction | null;
  settings: ShopSettings;
}

const Receipt: React.FC<ReceiptProps> = ({ transaction, settings }) => {
  if (!transaction) return null;

  const formatMoney = (amount: number) => {
    return amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const totalPaid = transaction.payments.reduce((acc, p) => acc + p.amount, 0);
  const change = totalPaid - transaction.total;

  return (
    <>
      <style>
        {`
          @media print {
            body * {
              visibility: hidden;
            }
            #printable-receipt, #printable-receipt * {
              visibility: visible;
            }
            #printable-receipt {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              margin: 0;
              padding: 0;
              background: white;
            }
            @page {
              size: auto;
              margin: 0mm;
            }
            html, body {
              height: auto;
              overflow: visible;
            }
          }
        `}
      </style>
      <div id="printable-receipt" className="hidden print:block font-mono text-[12px] leading-snug p-2 bg-white text-black w-[78mm] mx-auto pb-10">
        <div className="text-center mb-4">
          <h2 className="text-lg font-bold uppercase tracking-wider">{settings.name}</h2>
          <p className="text-xs">{settings.address}</p>
          <p className="text-xs">Tel: {settings.phone}</p>
          {settings.receiptFooter && <p className="text-xs italic mt-1">{settings.receiptFooter}</p>}
        </div>
        
        <div className="border-b border-black border-dashed my-2"></div>
        
        <div className="flex justify-between text-xs mb-1">
          <span>Trans: #{transaction.id.slice(-6)}</span>
          <span>{new Date(transaction.date).toLocaleDateString()}</span>
        </div>
        <div className="flex justify-between text-xs mb-1">
          <span>Cashier: {transaction.cashierName}</span>
          <span>{new Date(transaction.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
        </div>
        
        <div className="border-b border-black border-dashed my-2"></div>

        <table className="w-full text-left mb-2 table-fixed">
          <thead>
            <tr className="uppercase border-b border-black text-xs">
              <th className="w-[50%] py-1">Item</th>
              <th className="w-[20%] text-center py-1">Qty</th>
              <th className="w-[30%] text-right py-1">Total</th>
            </tr>
          </thead>
          <tbody>
            {transaction.items.map((item, idx) => {
              // Calculate display quantity based on total and unit price to handle packs/cartons correctly
              const displayQty = item.unitPrice > 0 ? Math.round(item.total / item.unitPrice) : 0;
              
              return (
                <tr key={idx} className="align-top">
                  <td className="py-1 pr-1 break-words">
                      {item.name}
                      {item.unitName && item.unitName !== 'Single' && <div className="text-[10px] italic">({item.unitName})</div>}
                  </td>
                  <td className="text-center py-1">{displayQty}</td>
                  <td className="text-right py-1">{formatMoney(item.total)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        
        <div className="border-b border-black border-dashed my-2"></div>
        
        <div className="flex justify-between font-bold text-sm">
          <span>Subtotal:</span>
          <span>{settings.currency}{formatMoney(transaction.subtotal)}</span>
        </div>
        <div className="flex justify-between text-base font-extrabold mt-2 border-t border-black border-double pt-1">
          <span>TOTAL:</span>
          <span>{settings.currency}{formatMoney(transaction.total)}</span>
        </div>

        <div className="mt-4 mb-2">
          <h4 className="font-bold underline text-xs mb-1">Payment Method:</h4>
          {transaction.payments.map((p, i) => (
              <div key={i} className="mb-1">
                  <div className="flex justify-between text-xs">
                      <span>{p.method}</span>
                      <span>{settings.currency}{formatMoney(p.amount)}</span>
                  </div>
                  {p.method === 'TRANSFER' && (
                      <div className="text-[10px] text-gray-600 pl-2">
                          {p.bankName} (Ref: {p.reference})
                      </div>
                  )}
              </div>
          ))}
          {change > 0 && (
              <div className="flex justify-between text-xs font-bold mt-1 border-t border-black border-dashed pt-1">
                  <span>Change:</span>
                  <span>{settings.currency}{formatMoney(change)}</span>
              </div>
          )}
        </div>
        
        <div className="text-center mt-6 text-xs">
          <p>Thank you for your patronage!</p>
          <p className="mt-1 text-[10px] text-gray-500">ShelfMaster Nova System</p>
        </div>
        
        <div className="text-center mt-2 text-[10px]">
          .
        </div>
      </div>
    </>
  );
};

export default Receipt;
