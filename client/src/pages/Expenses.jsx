import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { IndianRupee, Plus, CheckCircle, AlertCircle, Trash2, Calendar } from 'lucide-react';

const Expenses = () => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [livestockTypes, setLivestockTypes] = useState([]);
  const [deleteModalId, setDeleteModalId] = useState(null);

  const [formData, setFormData] = useState({
    livestockType: '',
    category: 'Feed',
    amount: '',
    notes: '',
  });

  const fetchData = async () => {
    try {
      const [expensesRes, livestockRes] = await Promise.all([
        api.get('/expenses'),
        api.get('/livestock')
      ]);
      setExpenses(expensesRes.data);
      
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
      await api.post('/expenses', {
        ...formData,
        amount: Number(formData.amount)
      });
      showToast('Expense added successfully!', 'success');
      setFormData({ ...formData, amount: '', notes: '' });
      fetchData();
    } catch (err) {
      showToast('Failed to add expense.', 'error');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModalId) return;
    try {
      await api.delete(`/expenses/${deleteModalId}`);
      showToast('Expense deleted successfully', 'success');
      setDeleteModalId(null);
      fetchData();
    } catch (err) {
      showToast('Failed to delete expense', 'error');
    }
  };

  // Group expenses month-wise with date ranges and totals
  const groupedExpenses = React.useMemo(() => {
    const groups = {};

    expenses.forEach((item) => {
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

      groups[key].totalAmount += Number(item.amount) || 0;
      groups[key].items.push(item);
    });

    return Object.values(groups).sort((a, b) => b.key.localeCompare(a.key));
  }, [expenses]);

  return (
    <div className="space-y-8 pb-8 relative">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center space-x-2 px-4 py-3 rounded-lg shadow-lg text-white animate-in slide-in-from-top-2 fade-in duration-300 ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-500'}`}>
          {toast.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          <span className="font-medium">{toast.message}</span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Expenses</h1>
          <p className="text-gray-500 mt-1">Log and track farm expenditures.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Form Section */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-orange-50 to-red-50 rounded-bl-full -z-10"></div>
            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
              <Plus className="w-5 h-5 mr-2 text-orange-500" /> Add Expense
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category / Type</label>
                <select 
                  value={formData.livestockType}
                  onChange={(e) => setFormData({...formData, livestockType: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select 
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                >
                  <option value="Feed">Feed & Fodder</option>
                  <option value="Vet">Veterinary</option>
                  <option value="Pesticide">Pesticide & Fertilizer (Crops)</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Other">Other</option>
                </select>
                {formData.category === 'Feed' && (
                  <div className="mt-2 p-2.5 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start space-x-2 animate-in fade-in duration-200">
                    <span className="text-base leading-none">🌾</span>
                    <div>
                      <span className="font-bold">Using own farm-grown crops (e.g. Grass, Corn, Maize)?</span>
                      <p className="text-[11px] text-amber-800 mt-0.5">
                        Log internal crop feeding in <Link to="/inventory" className="underline font-extrabold text-emerald-800 hover:text-emerald-900">Inventory & Own Crop Usage</Link> to track how much feed cost your farm is saving!
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
                <input 
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea 
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                  placeholder="Optional details..."
                  rows="2"
                ></textarea>
              </div>

              <button 
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-orange-400 to-red-500 hover:from-orange-500 hover:to-red-600 text-white rounded-xl font-medium shadow-md transition-all transform hover:-translate-y-0.5"
              >
                Log Expense
              </button>
            </form>
          </div>
        </div>

        {/* List Section */}
        <div className="lg:col-span-2 min-w-0">
          <div className="bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 md:p-6 shadow-sm border border-gray-100 min-h-[500px]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 pb-2 border-b border-gray-100 gap-2">
              <h3 className="text-lg sm:text-xl font-bold text-gray-900">Recent Expenses</h3>
              {expenses.length > 0 && (
                <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-3 py-1 rounded-full w-fit">
                  {groupedExpenses.length} {groupedExpenses.length === 1 ? 'Month' : 'Months'}
                </span>
              )}
            </div>
            
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500"></div>
              </div>
            ) : expenses.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <IndianRupee className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>No expenses recorded yet.</p>
              </div>
            ) : (
              <div className="space-y-4 sm:space-y-6 max-h-[650px] overflow-y-auto overflow-x-hidden pr-0 sm:pr-1">
                {groupedExpenses.map((group) => (
                  <div key={group.key} className="bg-gray-50/70 rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-5 border border-gray-200/80 shadow-xs space-y-3">
                    {/* Month Summary Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-gray-200 gap-2.5 sm:gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                          <span className="font-bold text-gray-900 text-base sm:text-lg">{group.monthLabel}</span>
                          <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-gray-200 text-gray-700">
                            {group.items.length} {group.items.length === 1 ? 'entry' : 'entries'}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-1 text-xs text-gray-500 font-medium mt-1">
                          <Calendar size={13} className="text-orange-500 flex-shrink-0" />
                          <span>Dated: From <strong className="text-gray-700">{group.startDateStr}</strong> - To <strong className="text-gray-700">{group.endDateStr}</strong></span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-2 bg-white px-3 py-1.5 rounded-xl border border-gray-200/80 shadow-xs self-stretch sm:self-auto">
                        <span className="text-xs text-gray-500 font-medium">Month Total:</span>
                        <span className="text-base sm:text-lg font-bold text-red-600">
                          -₹{group.totalAmount.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Expense Items in this month */}
                    <div className="space-y-2.5 sm:space-y-3 pt-1">
                      {group.items.map((expense) => (
                        <div 
                          key={expense._id} 
                          className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-3.5 rounded-xl bg-white border border-gray-100 hover:shadow-md transition-all gap-2 sm:gap-3"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="font-bold text-gray-900 text-sm sm:text-base">{expense.livestockType}</span>
                              <span className="text-[11px] sm:text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full font-medium">{expense.category}</span>
                            </div>
                            <p className="text-xs sm:text-sm text-gray-500 mt-1 break-words">{expense.notes || 'No notes'}</p>
                            <p className="text-[11px] sm:text-xs text-gray-400 mt-0.5">{new Date(expense.date).toLocaleDateString()}</p>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100 flex-shrink-0">
                            <div className="text-base sm:text-lg font-bold text-red-600">
                              -₹{expense.amount.toFixed(2)}
                            </div>
                            <button 
                              onClick={() => setDeleteModalId(expense._id)} 
                              className="text-gray-400 hover:text-red-500 p-1.5 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0" 
                              title="Delete Expense"
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
              <h3 className="text-xl font-bold">Delete Expense</h3>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this expense? This action cannot be undone.
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

export default Expenses;
