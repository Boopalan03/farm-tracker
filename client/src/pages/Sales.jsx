import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import api from '../utils/api';
import { Activity, Plus, CheckCircle, AlertCircle, Trash2, Calendar } from 'lucide-react';

const Sales = () => {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [livestockTypes, setLivestockTypes] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [deleteModalId, setDeleteModalId] = useState(null);

  const [formData, setFormData] = useState({
    livestockType: '',
    saleType: 'Animal Sale',
    soldCategory: '',
    quantitySold: '',
    amountReceived: '',
    notes: '',
  });

  const fetchData = async () => {
    try {
      const [salesRes, livestockRes] = await Promise.all([
        api.get('/sales'),
        api.get('/livestock')
      ]);
      setSales(salesRes.data);
      setInventory(livestockRes.data);
      
      const types = livestockRes.data.map(item => item.livestockType);
      setLivestockTypes(types);
      if (types.length > 0 && !formData.livestockType) {
        setFormData(prev => ({ ...prev, livestockType: types[0] }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const showToast = (message, type) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (livestockTypes.length === 0) {
      showToast('Please add items to inventory first.', 'error');
      return;
    }
    try {
      await api.post('/sales', {
        ...formData,
        quantitySold: Number(formData.quantitySold),
        amountReceived: Number(formData.amountReceived)
      });
      showToast('Sale logged successfully!', 'success');
      setFormData({ ...formData, quantitySold: '', amountReceived: '', soldCategory: '', notes: '' });
      fetchData();
    } catch (err) {
      showToast('Failed to log sale.', 'error');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModalId) return;
    try {
      await api.delete(`/sales/${deleteModalId}`);
      showToast('Sale deleted successfully', 'success');
      setDeleteModalId(null);
      fetchData();
    } catch (err) {
      showToast('Failed to delete sale', 'error');
    }
  };

  const selectedInventory = inventory.find(item => item.livestockType === formData.livestockType);
  const availableCategories = selectedInventory?.categories ? Object.keys(selectedInventory.categories) : [];

  // Group sales month-wise with date ranges and totals
  const groupedSales = React.useMemo(() => {
    const groups = {};

    sales.forEach((item) => {
      const d = new Date(item.date);
      const dateObj = isNaN(d.getTime()) ? new Date() : d;
      const year = dateObj.getFullYear();
      const monthIndex = dateObj.getMonth();
      const key = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;

      if (!groups[key]) {
        const startOfMonth = new Date(year, monthIndex, 1);
        const endOfMonth = new Date(year, monthIndex + 1, 0);

        const formatDate = (date) => {
          const dd = String(date.getDate()).padStart(2, '0');
          const mm = String(date.getMonth() + 1).padStart(2, '0');
          const yyyy = date.getFullYear();
          return `${dd}/${mm}/${yyyy}`;
        };

        const monthName = dateObj.toLocaleString('en-US', { month: 'long', year: 'numeric' });

        groups[key] = {
          key,
          year,
          monthIndex,
          monthLabel: monthName,
          startDateStr: formatDate(startOfMonth),
          endDateStr: formatDate(endOfMonth),
          totalAmount: 0,
          items: []
        };
      }

      groups[key].totalAmount += Number(item.amountReceived) || 0;
      groups[key].items.push(item);
    });

    return Object.values(groups).sort((a, b) => b.key.localeCompare(a.key));
  }, [sales]);

  return (
    <div className="space-y-8 pb-8 relative">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center space-x-2 px-4 py-3 rounded-lg shadow-lg text-white animate-in slide-in-from-top-2 fade-in duration-300 ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-500'}`}>
          {toast.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          <span className="font-medium">{toast.message}</span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Sales</h1>
          <p className="text-gray-500 mt-1">Record agricultural and livestock sales.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Form Section */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-bl-full -z-10"></div>
            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
              <Plus className="w-5 h-5 mr-2 text-blue-500" /> Add Sale
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category / Type</label>
                <select 
                  value={formData.livestockType}
                  onChange={(e) => setFormData({...formData, livestockType: e.target.value, soldCategory: ''})}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  disabled={livestockTypes.length === 0}
                >
                  {livestockTypes.length === 0 ? (
                    <option value="">No categories available</option>
                  ) : (
                    livestockTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sale Type</label>
                <select 
                  value={formData.saleType}
                  onChange={(e) => setFormData({...formData, saleType: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="Animal Sale">Whole Item / Animal Sale</option>
                  <option value="Product Sale">Byproduct Sale (Milk/Eggs/Crops/etc)</option>
                </select>
              </div>

              {formData.saleType === 'Animal Sale' && availableCategories.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Specific Category Sold</label>
                  <select 
                    value={formData.soldCategory}
                    onChange={(e) => setFormData({...formData, soldCategory: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="">Select a category...</option>
                    {availableCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity Sold</label>
                <input 
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={formData.quantitySold}
                  onChange={(e) => setFormData({...formData, quantitySold: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="0"
                />
              </div>

              {formData.saleType === 'Product Sale' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes (e.g., liters, kg, quality)</label>
                  <textarea 
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Optional details..."
                    rows="2"
                  ></textarea>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount Received (₹)</label>
                <input 
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={formData.amountReceived}
                  onChange={(e) => setFormData({...formData, amountReceived: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="0.00"
                />
              </div>

              <button 
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-xl font-medium shadow-md transition-all transform hover:-translate-y-0.5"
              >
                Log Sale
              </button>
            </form>
          </div>
        </div>

        {/* List Section */}
        <div className="lg:col-span-2 min-w-0">
          <div className="bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 md:p-6 shadow-sm border border-gray-100 min-h-[500px]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 pb-2 border-b border-gray-100 gap-2">
              <h3 className="text-lg sm:text-xl font-bold text-gray-900">Recent Sales</h3>
              {sales.length > 0 && (
                <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-3 py-1 rounded-full w-fit">
                  {groupedSales.length} {groupedSales.length === 1 ? 'Month' : 'Months'}
                </span>
              )}
            </div>
            
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : sales.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Activity className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>No sales recorded yet.</p>
              </div>
            ) : (
              <div className="space-y-4 sm:space-y-6 max-h-[650px] overflow-y-auto overflow-x-hidden pr-0 sm:pr-1">
                {groupedSales.map((group) => (
                  <div key={group.key} className="bg-gray-50/70 rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-5 border border-gray-200/80 shadow-xs space-y-3">
                    {/* Month Summary Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-gray-200 gap-2.5 sm:gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                          <span className="font-bold text-gray-900 text-base sm:text-lg">{group.monthLabel}</span>
                          <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-gray-200 text-gray-700">
                            {group.items.length} {group.items.length === 1 ? 'sale' : 'sales'}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-1 text-xs text-gray-500 font-medium mt-1">
                          <Calendar size={13} className="text-blue-500 flex-shrink-0" />
                          <span>Dated: From <strong className="text-gray-700">{group.startDateStr}</strong> - To <strong className="text-gray-700">{group.endDateStr}</strong></span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-2 bg-white px-3 py-1.5 rounded-xl border border-gray-200/80 shadow-xs self-stretch sm:self-auto">
                        <span className="text-xs text-gray-500 font-medium">Month Total:</span>
                        <span className="text-base sm:text-lg font-bold text-emerald-600">
                          +₹{group.totalAmount.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Sale Items in this month */}
                    <div className="space-y-2.5 sm:space-y-3 pt-1">
                      {group.items.map((sale) => (
                        <div 
                          key={sale._id} 
                          className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-3.5 rounded-xl bg-white border border-gray-100 hover:shadow-md transition-all gap-2 sm:gap-3"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="font-bold text-gray-900 text-sm sm:text-base">{sale.livestockType}</span>
                              <span className={`text-[11px] sm:text-xs px-2 py-0.5 rounded-full font-medium ${sale.saleType === 'Animal Sale' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                                {sale.saleType}
                              </span>
                              {sale.soldCategory && (
                                <span className="text-[11px] sm:text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 font-medium">
                                  {sale.soldCategory}
                                </span>
                              )}
                            </div>
                            <p className="text-xs sm:text-sm text-gray-500 mt-1 break-words">
                              Quantity: {sale.quantitySold} {sale.saleType === 'Product Sale' && sale.notes ? `- ${sale.notes}` : ''}
                            </p>
                            <p className="text-[11px] sm:text-xs text-gray-400 mt-0.5">{new Date(sale.date).toLocaleDateString()}</p>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100 flex-shrink-0">
                            <div className="text-base sm:text-lg font-bold text-emerald-600">
                              +₹{sale.amountReceived.toFixed(2)}
                            </div>
                            <button 
                              onClick={() => setDeleteModalId(sale._id)} 
                              className="text-gray-400 hover:text-red-500 p-1.5 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0" 
                              title="Delete Sale"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModalId && createPortal(
        <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="flex items-center space-x-3 text-red-600 mb-4">
              <AlertCircle size={28} />
              <h3 className="text-xl font-bold">Delete Sale</h3>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this sale? This action cannot be undone.
            </p>
            <div className="flex space-x-3 justify-end">
              <button 
                onClick={() => setDeleteModalId(null)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors font-medium"
              >
                Cancel
              </button>
              <button 
                onClick={handleDeleteConfirm}
                className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-medium shadow-sm flex items-center"
              >
                <Trash2 size={18} className="mr-2" />
                Delete
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default Sales;
