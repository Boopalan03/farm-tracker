import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import api from '../utils/api';
import { 
  Wrench, Users, Plus, CheckCircle, AlertCircle, Trash2, Calendar, 
  Phone, Clock, Check, HardHat, Tractor, Droplets, Zap, Home, 
  ChevronRight, Filter, Search, X, IndianRupee, Briefcase, Sparkles
} from 'lucide-react';

const CATEGORIES = [
  { name: 'Labour / Worker Wage', icon: Users, color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  { name: 'Equipment & Machinery', icon: Tractor, color: 'bg-amber-100 text-amber-800 border-amber-200' },
  { name: 'Irrigation & Water System', icon: Droplets, color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { name: 'Electrical & Fencing', icon: Zap, color: 'bg-purple-100 text-purple-800 border-purple-200' },
  { name: 'Shed & Pen Upkeep', icon: Home, color: 'bg-rose-100 text-rose-800 border-rose-200' },
  { name: 'Field & Crop Care', icon: HardHat, color: 'bg-lime-100 text-lime-800 border-lime-200' },
  { name: 'Other Maintenance', icon: Wrench, color: 'bg-gray-100 text-gray-800 border-gray-200' },
];

const ROLES = [
  'Daily Labourer',
  'Permanent Worker',
  'Tractor Driver',
  'Harvester',
  'Feeder / Cattle Hand',
  'Electrician',
  'Plumber / Irrigation Specialist',
  'Mechanic / Service Tech',
  'General Farm Hand',
  'Vendor / Contractor'
];

const Maintenance = () => {
  const [records, setRecords] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Filter state
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('All');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showWorkersModal, setShowWorkersModal] = useState(false);
  const [deleteModalId, setDeleteModalId] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    category: 'Labour / Worker Wage',
    workerName: '',
    workerRole: 'Daily Labourer',
    workerPhone: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    status: 'Completed',
    notes: ''
  });

  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [maintenanceRes, workersRes] = await Promise.all([
        api.get('/maintenance'),
        api.get('/maintenance/workers')
      ]);
      setRecords(maintenanceRes.data);
      setWorkers(workersRes.data);
    } catch (err) {
      console.error(err);
      showToast('Failed to load maintenance records', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Pre-fill worker when selecting from existing workers
  const handleSelectExistingWorker = (worker) => {
    setFormData(prev => ({
      ...prev,
      workerName: worker.name,
      workerRole: worker.role || prev.workerRole,
      workerPhone: worker.phone || prev.workerPhone
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.amount || Number(formData.amount) <= 0) {
      showToast('Please enter a valid amount', 'error');
      return;
    }
    try {
      setSubmitting(true);
      await api.post('/maintenance', {
        ...formData,
        amount: Number(formData.amount)
      });
      showToast('Maintenance entry logged successfully!');
      setShowAddModal(false);
      setFormData({
        title: '',
        category: 'Labour / Worker Wage',
        workerName: '',
        workerRole: 'Daily Labourer',
        workerPhone: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        status: 'Completed',
        notes: ''
      });
      fetchData();
    } catch (err) {
      console.error(err);
      showToast('Failed to save record', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (record) => {
    const nextStatus = record.status === 'Completed' ? 'Pending' : 'Completed';
    try {
      await api.put(`/maintenance/${record._id}`, { status: nextStatus });
      showToast(`Status updated to ${nextStatus}`);
      fetchData();
    } catch (err) {
      console.error(err);
      showToast('Failed to update status', 'error');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModalId) return;
    try {
      await api.delete(`/maintenance/${deleteModalId}`);
      showToast('Record deleted successfully');
      setDeleteModalId(null);
      fetchData();
    } catch (err) {
      console.error(err);
      showToast('Failed to delete record', 'error');
    }
  };

  // Filtered records
  const filteredRecords = useMemo(() => {
    return records.filter(item => {
      const matchCategory = selectedCategoryFilter === 'All' || item.category === selectedCategoryFilter;
      const matchStatus = selectedStatusFilter === 'All' || item.status === selectedStatusFilter;
      const matchSearch = !searchQuery.trim() || 
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.workerName && item.workerName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.notes && item.notes.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchCategory && matchStatus && matchSearch;
    });
  }, [records, selectedCategoryFilter, selectedStatusFilter, searchQuery]);

  // Overall statistics
  const stats = useMemo(() => {
    const totalSpend = records.reduce((acc, curr) => acc + (curr.amount || 0), 0);
    const labourSpend = records
      .filter(r => r.category === 'Labour / Worker Wage')
      .reduce((acc, curr) => acc + (curr.amount || 0), 0);
    const machinerySpend = records
      .filter(r => r.category === 'Equipment & Machinery' || r.category === 'Irrigation & Water System')
      .reduce((acc, curr) => acc + (curr.amount || 0), 0);
    const pendingTasks = records.filter(r => r.status === 'Pending' || r.status === 'In Progress');
    const pendingAmount = pendingTasks.reduce((acc, curr) => acc + (curr.amount || 0), 0);

    return {
      totalSpend,
      labourSpend,
      machinerySpend,
      pendingCount: pendingTasks.length,
      pendingAmount,
      totalWorkers: workers.length
    };
  }, [records, workers]);

  // Month-wise grouping with date ranges and totals
  const groupedRecords = useMemo(() => {
    const groups = {};

    filteredRecords.forEach((item) => {
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
  }, [filteredRecords]);

  const getCategoryBadge = (catName) => {
    const found = CATEGORIES.find(c => c.name === catName) || CATEGORIES[6];
    const Icon = found.icon;
    return (
      <span className={`inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${found.color}`}>
        <Icon size={12} />
        <span>{found.name}</span>
      </span>
    );
  };

  return (
    <div className="space-y-8 pb-8 relative">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-4 right-4 z-50 flex items-center space-x-2 px-4 py-3 rounded-2xl shadow-xl transition-all animate-bounce ${
          toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-500 text-white'
        }`}>
          {toast.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          <span className="font-medium text-sm">{toast.message}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight flex items-center space-x-3">
            <span className="p-2 bg-gradient-to-tr from-amber-500 to-orange-500 text-white rounded-2xl shadow-sm">
              <Wrench size={24} />
            </span>
            <span>Farm Maintenance & Labour</span>
          </h1>
          <p className="text-gray-500 mt-1 text-sm sm:text-base">
            Track daily wages, workers, tractor & machinery repairs, and farm infrastructure upkeep.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowWorkersModal(true)}
            className="flex items-center space-x-2 px-4 py-2.5 bg-white hover:bg-gray-50 text-gray-700 rounded-xl border border-gray-200 transition-all font-medium text-sm shadow-xs"
          >
            <Users size={18} className="text-emerald-600" />
            <span>Workers ({workers.length})</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl transition-all font-semibold text-sm shadow-sm transform hover:-translate-y-0.5"
          >
            <Plus size={18} />
            <span>Log Maintenance / Wage</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-6">
        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Labour & Wages</p>
            <h3 className="text-xl sm:text-2xl font-extrabold text-emerald-600 mt-1">₹{stats.labourSpend.toLocaleString()}</h3>
            <p className="text-xs text-gray-400 mt-1">Worker wages & payouts</p>
          </div>
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
            <Users size={22} />
          </div>
        </div>

        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Equipment & Repairs</p>
            <h3 className="text-xl sm:text-2xl font-extrabold text-amber-600 mt-1">₹{stats.machinerySpend.toLocaleString()}</h3>
            <p className="text-xs text-gray-400 mt-1">Motors, tractors, pipes</p>
          </div>
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
            <Tractor size={22} />
          </div>
        </div>

        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Maintenance</p>
            <h3 className="text-xl sm:text-2xl font-extrabold text-gray-900 mt-1">₹{stats.totalSpend.toLocaleString()}</h3>
            <p className="text-xs text-gray-400 mt-1">{records.length} logged activities</p>
          </div>
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gray-50 text-gray-600 flex items-center justify-center flex-shrink-0">
            <Wrench size={22} />
          </div>
        </div>

        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Pending / In-Progress</p>
            <h3 className="text-xl sm:text-2xl font-extrabold text-purple-600 mt-1">{stats.pendingCount} Tasks</h3>
            <p className="text-xs text-gray-400 mt-1">₹{stats.pendingAmount.toLocaleString()} estimated</p>
          </div>
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0">
            <Clock size={22} />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 shadow-sm border border-gray-100 space-y-3.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by task, worker name, or notes..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50/80 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1 p-1 bg-gray-100/80 rounded-xl flex-wrap">
            {['All', 'Completed', 'Pending', 'In Progress'].map(st => (
              <button
                key={st}
                onClick={() => setSelectedStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  selectedStatusFilter === st
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-gray-100">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider mr-1">Category:</span>
          <button
            onClick={() => setSelectedCategoryFilter('All')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCategoryFilter === 'All'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All Categories
          </button>
          {CATEGORIES.map(cat => (
            <button
              key={cat.name}
              onClick={() => setSelectedCategoryFilter(cat.name)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center space-x-1.5 ${
                selectedCategoryFilter === cat.name
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span>{cat.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content: Grouped by Month */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 min-h-[400px]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 pb-2 border-b border-gray-100 gap-2">
          <h2 className="text-xl font-bold text-gray-900">Maintenance & Wage Records</h2>
          {filteredRecords.length > 0 && (
            <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-3 py-1 rounded-full w-fit">
              {groupedRecords.length} {groupedRecords.length === 1 ? 'Month Period' : 'Month Periods'} • {filteredRecords.length} records
            </span>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500"></div>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Wrench className="w-12 h-12 mx-auto mb-3 opacity-25" />
            <p className="text-base font-medium text-gray-600">No maintenance or wage records found.</p>
            <p className="text-xs text-gray-400 mt-1">Click "Log Maintenance / Wage" to add your first entry.</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-4 inline-flex items-center space-x-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl hover:bg-emerald-100 text-xs font-semibold transition-colors"
            >
              <Plus size={16} />
              <span>Log Now</span>
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {groupedRecords.map((group) => (
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
                      <Calendar size={13} className="text-amber-500 flex-shrink-0" />
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

                {/* Maintenance Items in this Month */}
                <div className="space-y-3 pt-1">
                  {group.items.map((item) => (
                    <div 
                      key={item._id} 
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-white border border-gray-100 hover:shadow-md transition-all gap-3"
                    >
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                          <span className="font-bold text-gray-900 text-base">{item.title}</span>
                          {getCategoryBadge(item.category)}
                          
                          {/* Status Badge with toggle */}
                          <button
                            onClick={() => handleToggleStatus(item)}
                            title="Click to toggle status"
                            className={`inline-flex items-center space-x-1 text-xs font-semibold px-2.5 py-0.5 rounded-full border transition-all cursor-pointer ${
                              item.status === 'Completed'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                : item.status === 'In Progress'
                                ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                                : 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
                            }`}
                          >
                            {item.status === 'Completed' ? <Check size={11} /> : <Clock size={11} />}
                            <span>{item.status}</span>
                          </button>
                        </div>

                        {/* Worker and Details */}
                        <div className="flex items-center space-x-3 text-xs text-gray-500 flex-wrap gap-y-1">
                          {item.workerName && (
                            <span className="flex items-center space-x-1 font-medium text-gray-700">
                              <Users size={13} className="text-emerald-600" />
                              <span>{item.workerName} ({item.workerRole || 'Staff'})</span>
                            </span>
                          )}

                          {item.workerPhone && (
                            <a href={`tel:${item.workerPhone}`} className="flex items-center space-x-1 text-emerald-600 hover:underline">
                              <Phone size={11} />
                              <span>{item.workerPhone}</span>
                            </a>
                          )}

                          <span>•</span>
                          <span>{new Date(item.date).toLocaleDateString()}</span>
                        </div>

                        {item.notes && (
                          <p className="text-xs text-gray-500 italic mt-0.5">Note: {item.notes}</p>
                        )}
                      </div>

                      {/* Amount and Action */}
                      <div className="flex items-center justify-between sm:justify-end space-x-4 border-t sm:border-t-0 pt-2 sm:pt-0">
                        <div className="text-right">
                          <span className="text-base sm:text-lg font-bold text-red-600 block">
                            -₹{Number(item.amount || 0).toFixed(2)}
                          </span>
                          <span className="text-[10px] text-gray-400 font-medium">Synced with Farm Expenses</span>
                        </div>

                        <button 
                          onClick={() => setDeleteModalId(item._id)} 
                          className="text-gray-400 hover:text-red-500 transition-colors p-1.5 hover:bg-red-50 rounded-lg" 
                          title="Delete Record"
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

      {/* Log Maintenance / Wage Modal */}
      {showAddModal && createPortal(
        <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-5">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center">
                  <Wrench size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Log Maintenance / Labour Wage</h3>
                  <p className="text-xs text-gray-500">Record payments to workers, servicing, and upkeep.</p>
                </div>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600 p-1">
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Task / Wage Title *
                </label>
                <input
                  type="text"
                  name="title"
                  required
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="e.g. Daily Weeding Wage, Tractor Oil Service, Drip Line Repair"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Category *
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm bg-white"
                  >
                    {CATEGORIES.map(c => (
                      <option key={c.name} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Amount Paid (₹) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
                    <input
                      type="number"
                      step="0.01"
                      name="amount"
                      required
                      value={formData.amount}
                      onChange={handleInputChange}
                      placeholder="0.00"
                      className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Worker Information Section */}
              <div className="bg-emerald-50/40 p-4 rounded-2xl border border-emerald-100 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    <Users size={16} className="text-emerald-700" />
                    <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Worker / Contractor Details</span>
                  </div>
                  {workers.length > 0 && (
                    <span className="text-[11px] text-emerald-600 font-medium">Select from regular staff below</span>
                  )}
                </div>

                {/* Quick Select Existing Worker */}
                {workers.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {workers.slice(0, 6).map(w => (
                      <button
                        type="button"
                        key={w.name}
                        onClick={() => handleSelectExistingWorker(w)}
                        className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                          formData.workerName === w.name
                            ? 'bg-emerald-600 text-white border-emerald-600 font-semibold'
                            : 'bg-white text-gray-700 border-gray-200 hover:bg-emerald-50'
                        }`}
                      >
                        {w.name}
                      </button>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Worker Name</label>
                    <input
                      type="text"
                      name="workerName"
                      value={formData.workerName}
                      onChange={handleInputChange}
                      placeholder="e.g. Murugan, Ramu"
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Worker Role</label>
                    <select
                      name="workerRole"
                      value={formData.workerRole}
                      onChange={handleInputChange}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm bg-white"
                    >
                      {ROLES.map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Worker Contact Phone (Optional)</label>
                  <input
                    type="tel"
                    name="workerPhone"
                    value={formData.workerPhone}
                    onChange={handleInputChange}
                    placeholder="e.g. 9876543210"
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Date *</label>
                  <input
                    type="date"
                    name="date"
                    required
                    value={formData.date}
                    onChange={handleInputChange}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Status *</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm bg-white"
                  >
                    <option value="Completed">Completed (Paid)</option>
                    <option value="Pending">Pending (Scheduled)</option>
                    <option value="In Progress">In Progress</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Notes / Spare Parts Used</label>
                <textarea
                  name="notes"
                  rows="2"
                  value={formData.notes}
                  onChange={handleInputChange}
                  placeholder="Additional details about hours worked, parts replaced, or vendor info..."
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm resize-none"
                ></textarea>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors font-medium text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl font-semibold shadow-md transition-all text-sm disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Record'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Workers Directory Modal */}
      {showWorkersModal && createPortal(
        <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-2xl w-full shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-5">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Users size={22} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Farm Workers & Staff Directory</h3>
                  <p className="text-xs text-gray-500">List of labourers, workers, and technicians employed on your farm.</p>
                </div>
              </div>
              <button onClick={() => setShowWorkersModal(false)} className="text-gray-400 hover:text-gray-600 p-1">
                <X size={22} />
              </button>
            </div>

            {workers.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Users className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p className="text-sm font-medium">No workers registered yet.</p>
                <p className="text-xs text-gray-400 mt-1">Workers will automatically appear here as you log wages.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {workers.map(worker => (
                  <div key={worker.name} className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 border border-gray-100 hover:bg-white hover:shadow-sm transition-all">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-gray-900 text-base">{worker.name}</span>
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-medium">
                          {worker.role}
                        </span>
                      </div>
                      <div className="flex items-center space-x-3 text-xs text-gray-500 mt-1">
                        {worker.phone && (
                          <span className="flex items-center space-x-1">
                            <Phone size={11} />
                            <span>{worker.phone}</span>
                          </span>
                        )}
                        <span>•</span>
                        <span>{worker.tasksCount} {worker.tasksCount === 1 ? 'task logged' : 'tasks logged'}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <div className="text-right">
                        <span className="text-xs text-gray-400 block">Total Paid</span>
                        <span className="text-sm font-bold text-gray-900">₹{worker.totalPaid.toLocaleString()}</span>
                      </div>

                      <button
                        onClick={() => {
                          setShowWorkersModal(false);
                          handleSelectExistingWorker(worker);
                          setShowAddModal(true);
                        }}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-colors"
                      >
                        Pay Wage
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalId && createPortal(
        <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center space-x-3 text-red-600 mb-4">
              <AlertCircle size={28} />
              <h3 className="text-xl font-bold">Delete Record</h3>
            </div>
            <p className="text-gray-600 text-sm mb-6">
              Are you sure you want to delete this maintenance entry? The corresponding expense sync will also be removed.
            </p>
            <div className="flex space-x-3 justify-end">
              <button 
                onClick={() => setDeleteModalId(null)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors font-medium text-sm"
              >
                Cancel
              </button>
              <button 
                onClick={handleDeleteConfirm}
                className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-medium text-sm flex items-center"
              >
                <Trash2 size={16} className="mr-2" />
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

export default Maintenance;
