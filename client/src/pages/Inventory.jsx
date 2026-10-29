import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import api from '../utils/api';
import { 
  Package, Edit2, Save, X, Plus, Trash2, AlertTriangle, 
  Sprout, Trees, Activity, Calendar, ArrowRight, Search, 
  Filter, CheckCircle, AlertCircle, Clock, Sparkles, Check
} from 'lucide-react';

const Inventory = () => {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('inventory'); // 'inventory' | 'usage'
  const [toast, setToast] = useState(null);

  // Edit state
  const [editingType, setEditingType] = useState(null);
  const [editForm, setEditForm] = useState({ totalCount: 0, categories: {} });

  // Add state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLivestock, setNewLivestock] = useState({ name: '', selectedCategories: [] });
  const [customCategoryInput, setCustomCategoryInput] = useState('');

  // Delete state
  const [deletingType, setDeletingType] = useState(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');

  // Own Crop Usage state
  const [cropUsages, setCropUsages] = useState([]);
  const [cropUsageSummary, setCropUsageSummary] = useState({ totalRecords: 0, totalSavings: 0, byLivestock: {}, byCrop: {} });
  const [loadingUsage, setLoadingUsage] = useState(false);
  const [showUsageModal, setShowUsageModal] = useState(false);
  const [submittingUsage, setSubmittingUsage] = useState(false);
  const [deletingUsageId, setDeletingUsageId] = useState(null);
  const [usageFilterCrop, setUsageFilterCrop] = useState('All');
  const [usageFilterLivestock, setUsageFilterLivestock] = useState('All');
  const [usageSearchQuery, setUsageSearchQuery] = useState('');

  const [usageFormData, setUsageFormData] = useState({
    cropType: '',
    fedToLivestock: '',
    quantity: '',
    unit: 'kg',
    estimatedSavings: '',
    usageType: 'Livestock Feed / Fodder',
    notes: '',
    date: new Date().toISOString().split('T')[0],
    deductFromInventory: false
  });

  const plantTreeCategories = [
    'Saplings / Seedlings',
    'Growing / Vegetative',
    'Flowering',
    'Fruiting / Bearing',
    'Harvest Ready',
    'Nursery / Grafted',
    'Yield Producing'
  ];

  const livestockCategories = [
    'Milk Producing',
    'Egg Production',
    'Pregnant',
    'Calves',
    'Kids',
    'Chicks'
  ];

  const predefinedCategories = [...plantTreeCategories, ...livestockCategories];

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const response = await api.get('/livestock');
      setInventory(response.data);
    } catch (err) {
      setError('Failed to load inventory.');
    } finally {
      setLoading(false);
    }
  };

  const fetchCropUsages = async () => {
    try {
      setLoadingUsage(true);
      const [usageRes, summaryRes] = await Promise.all([
        api.get('/crop-usage'),
        api.get('/crop-usage/summary')
      ]);
      setCropUsages(usageRes.data);
      setCropUsageSummary(summaryRes.data);
    } catch (err) {
      console.error('Error fetching crop usages:', err);
    } finally {
      setLoadingUsage(false);
    }
  };

  useEffect(() => {
    fetchInventory();
    fetchCropUsages();
  }, []);

  // Classify items in DB into crops vs livestock
  const isCropItem = (item) => {
    const name = (item.livestockType || '').toLowerCase();
    const hasCropCat = Object.keys(item.categories || {}).some(cat => plantTreeCategories.includes(cat));
    const cropKeywords = ['tree', 'plant', 'crop', 'grass', 'fodder', 'corn', 'maize', 'hay', 'straw', 'paddy', 'wheat', 'silage', 'coconut', 'banana', 'vegetable', 'tomato', 'leaf', 'cane'];
    return hasCropCat || cropKeywords.some(kw => name.includes(kw));
  };

  const isLivestockItem = (item) => {
    const name = (item.livestockType || '').toLowerCase();
    const hasLiveCat = Object.keys(item.categories || {}).some(cat => livestockCategories.includes(cat));
    const liveKeywords = ['cow', 'cattle', 'hen', 'chicken', 'goat', 'sheep', 'buffalo', 'pig', 'duck', 'calf', 'heifer', 'bull'];
    return hasLiveCat || liveKeywords.some(kw => name.includes(kw));
  };

  // Grouped options for select dropdowns from DB
  const detectedCrops = useMemo(() => {
    const crops = inventory.filter(isCropItem).map(i => i.livestockType);
    return crops.length > 0 ? crops : inventory.map(i => i.livestockType);
  }, [inventory]);

  const detectedLivestock = useMemo(() => {
    const animals = inventory.filter(isLivestockItem).map(i => i.livestockType);
    return animals.length > 0 ? animals : inventory.map(i => i.livestockType);
  }, [inventory]);

  const allDbItemNames = useMemo(() => {
    return inventory.map(i => i.livestockType);
  }, [inventory]);

  // Open usage modal with smart defaults
  const openUsageModal = (prefillCrop = '', prefillLivestock = '') => {
    const defaultCrop = prefillCrop || detectedCrops[0] || allDbItemNames[0] || '';
    
    // Default livestock: prefer Cow if exists in DB, or prefillLivestock, or first detected
    let defaultLivestock = prefillLivestock;
    if (!defaultLivestock) {
      const cowItem = allDbItemNames.find(name => name.toLowerCase() === 'cow');
      defaultLivestock = cowItem || detectedLivestock[0] || allDbItemNames[0] || '';
    }

    setUsageFormData({
      cropType: defaultCrop,
      fedToLivestock: defaultLivestock,
      quantity: '',
      unit: 'kg',
      estimatedSavings: '',
      usageType: 'Livestock Feed / Fodder',
      notes: '',
      date: new Date().toISOString().split('T')[0],
      deductFromInventory: false
    });
    setShowUsageModal(true);
  };

  const handleEditClick = (type) => {
    const existing = inventory.find(item => item.livestockType === type);
    if (existing) {
      setEditForm({
        totalCount: existing.totalCount,
        categories: existing.categories || {}
      });
    } else {
      setEditForm({ totalCount: 0, categories: {} });
    }
    setEditingType(type);
  };

  const handleSave = async (type) => {
    try {
      await api.post('/livestock', {
        livestockType: type,
        totalCount: parseInt(editForm.totalCount) || 0,
        categories: editForm.categories
      });
      setEditingType(null);
      showToast('Inventory item updated!', 'success');
      fetchInventory();
    } catch (err) {
      alert('Failed to update inventory');
    }
  };

  const handleCategoryChange = (key, value) => {
    const newCategories = {
      ...editForm.categories,
      [key]: parseInt(value) || 0
    };
    
    const sum = Object.values(newCategories).reduce((acc, curr) => acc + curr, 0);

    setEditForm({
      ...editForm,
      categories: newCategories,
      totalCount: sum
    });
  };

  const handleAddLivestock = async () => {
    if (!newLivestock.name.trim()) {
      alert('Please enter an item name.');
      return;
    }
    const initialCategories = {};
    newLivestock.selectedCategories.forEach(cat => initialCategories[cat] = 0);
    
    try {
      await api.post('/livestock', {
        livestockType: newLivestock.name.trim(),
        totalCount: 0,
        categories: initialCategories
      });
      setShowAddForm(false);
      setNewLivestock({ name: '', selectedCategories: [] });
      showToast('Item added to inventory!', 'success');
      fetchInventory();
    } catch (err) {
      alert('Failed to add item');
    }
  };

  const toggleCategory = (cat) => {
    setNewLivestock(prev => ({
      ...prev,
      selectedCategories: prev.selectedCategories.includes(cat)
        ? prev.selectedCategories.filter(c => c !== cat)
        : [...prev.selectedCategories, cat]
    }));
  };

  const handleAddCustomCategory = () => {
    const trimmed = customCategoryInput.trim();
    if (!trimmed) return;
    if (!newLivestock.selectedCategories.includes(trimmed)) {
      setNewLivestock(prev => ({
        ...prev,
        selectedCategories: [...prev.selectedCategories, trimmed]
      }));
    }
    setCustomCategoryInput('');
  };

  const handleDeleteConfirm = async () => {
    try {
      await api.delete(`/livestock/${deletingType}`);
      setDeletingType(null);
      setDeleteConfirmation('');
      showToast('Item deleted successfully', 'success');
      fetchInventory();
      fetchCropUsages();
    } catch (err) {
      alert('Failed to delete item');
    }
  };

  const handleSaveCropUsage = async (e) => {
    e.preventDefault();
    if (!usageFormData.cropType.trim() || !usageFormData.fedToLivestock.trim() || !usageFormData.quantity) {
      showToast('Please specify crop, livestock, and quantity.', 'error');
      return;
    }

    try {
      setSubmittingUsage(true);
      await api.post('/crop-usage', {
        ...usageFormData,
        quantity: Number(usageFormData.quantity),
        estimatedSavings: Number(usageFormData.estimatedSavings) || 0
      });
      showToast(`Logged ${usageFormData.quantity} ${usageFormData.unit} of ${usageFormData.cropType} fed to ${usageFormData.fedToLivestock}!`, 'success');
      setShowUsageModal(false);
      fetchCropUsages();
      fetchInventory();
    } catch (err) {
      console.error('Save usage error:', err);
      showToast('Failed to log crop usage', 'error');
    } finally {
      setSubmittingUsage(false);
    }
  };

  const handleDeleteUsageConfirm = async () => {
    if (!deletingUsageId) return;
    try {
      await api.delete(`/crop-usage/${deletingUsageId}`);
      showToast('Crop usage log removed', 'success');
      setDeletingUsageId(null);
      fetchCropUsages();
    } catch (err) {
      console.error('Delete error:', err);
      showToast('Failed to delete usage log', 'error');
    }
  };

  // Filtered crop usages
  const filteredCropUsages = useMemo(() => {
    return cropUsages.filter(item => {
      const matchCrop = usageFilterCrop === 'All' || item.cropType === usageFilterCrop;
      const matchLivestock = usageFilterLivestock === 'All' || item.fedToLivestock === usageFilterLivestock;
      const matchSearch = !usageSearchQuery || 
        item.cropType.toLowerCase().includes(usageSearchQuery.toLowerCase()) ||
        item.fedToLivestock.toLowerCase().includes(usageSearchQuery.toLowerCase()) ||
        (item.notes && item.notes.toLowerCase().includes(usageSearchQuery.toLowerCase()));
      return matchCrop && matchLivestock && matchSearch;
    });
  }, [cropUsages, usageFilterCrop, usageFilterLivestock, usageSearchQuery]);

  if (loading && inventory.length === 0) {
    return (
      <div className="flex justify-center items-center h-full min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-8 relative">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[10000] flex items-center space-x-2 px-4 py-3 rounded-xl shadow-xl text-white animate-in slide-in-from-top-2 duration-300 ${
          toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-500'
        }`}>
          {toast.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          <span className="font-medium text-sm">{toast.message}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight flex items-center space-x-2.5">
            <span className="p-2 bg-emerald-100 text-emerald-800 rounded-2xl shadow-xs">
              <Package size={24} />
            </span>
            <span>Farm Inventory & Crops</span>
          </h1>
          <p className="text-gray-500 mt-1 text-sm sm:text-base">
            Track crops, plants, livestock, and monitor own crop feeding for cattle and animals.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          {/* Quick Log Crop Usage Button */}
          <button
            onClick={() => openUsageModal()}
            className="flex-1 sm:flex-initial flex items-center justify-center space-x-2 bg-gradient-to-r from-amber-500 to-emerald-600 hover:from-amber-600 hover:to-emerald-700 text-white px-4 py-2.5 rounded-xl transition-all shadow-sm font-semibold text-sm transform hover:-translate-y-0.5"
            title="Feed farm crops to Cow or any livestock in database"
          >
            <Sprout size={18} />
            <span>Log Own Crop Usage</span>
          </button>

          {!showAddForm && activeTab === 'inventory' && (
            <button 
              onClick={() => setShowAddForm(true)}
              className="flex-1 sm:flex-initial flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl transition-all shadow-sm font-semibold text-sm"
            >
              <Plus size={18} />
              <span>Add Item</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center space-x-2 border-b border-gray-200/90 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('inventory')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
            activeTab === 'inventory'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          <Package size={17} />
          <span>Inventory Items ({inventory.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('usage')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
            activeTab === 'usage'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          <Sprout size={17} />
          <span>Own Crop Usage & Fodder Feeding</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
            activeTab === 'usage' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-700'
          }`}>
            {cropUsages.length}
          </span>
          {cropUsageSummary.totalSavings > 0 && (
            <span className="hidden md:inline-flex text-[11px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold ml-1">
              ₹{cropUsageSummary.totalSavings.toLocaleString()} saved
            </span>
          )}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-500 p-4 rounded-xl border border-red-100">
          {error}
        </div>
      )}

      {/* TAB 1: INVENTORY ITEMS VIEW */}
      {activeTab === 'inventory' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {showAddForm && (
            <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm border border-emerald-200 mb-8 animate-in fade-in duration-300">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900">Add New Item</h3>
                <button onClick={() => setShowAddForm(false)} className="text-gray-400 hover:text-red-500 transition-colors">
                  <X size={24} />
                </button>
              </div>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Item Name</label>
                  <input 
                    type="text"
                    value={newLivestock.name}
                    onChange={(e) => setNewLivestock({...newLivestock, name: e.target.value})}
                    placeholder="e.g. Napier Grass, Corn, Coconut Tree, Tomato Plant, Cow, Hen..."
                    className="w-full max-w-md px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                  />
                </div>

                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-1">Select Statuses to Track</label>
                    <p className="text-xs text-gray-500 mb-3">Choose stages or categories you wish to monitor for this item.</p>
                  </div>

                  {/* Trees & Plants */}
                  <div className="bg-emerald-50/40 p-4 rounded-2xl border border-emerald-100">
                    <div className="flex items-center space-x-2 mb-3">
                      <Sprout className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Trees, Plants & Crops</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {plantTreeCategories.map(cat => (
                        <label 
                          key={cat} 
                          className={`flex items-center space-x-3 cursor-pointer p-3 rounded-xl border transition-all ${
                            newLivestock.selectedCategories.includes(cat) 
                              ? 'bg-emerald-50 border-emerald-400 shadow-xs' 
                              : 'bg-white border-gray-100 hover:bg-gray-50'
                          }`}
                        >
                          <input 
                            type="checkbox"
                            checked={newLivestock.selectedCategories.includes(cat)}
                            onChange={() => toggleCategory(cat)}
                            className="w-4 h-4 text-emerald-500 border-gray-300 rounded focus:ring-emerald-500"
                          />
                          <span className="text-xs sm:text-sm font-medium text-gray-700">{cat}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Livestock & Animals */}
                  <div className="bg-blue-50/40 p-4 rounded-2xl border border-blue-100">
                    <div className="flex items-center space-x-2 mb-3">
                      <Activity className="w-4 h-4 text-blue-600" />
                      <span className="text-xs font-bold text-blue-800 uppercase tracking-wider">Livestock & Animals</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {livestockCategories.map(cat => (
                        <label 
                          key={cat} 
                          className={`flex items-center space-x-3 cursor-pointer p-3 rounded-xl border transition-all ${
                            newLivestock.selectedCategories.includes(cat) 
                              ? 'bg-blue-50 border-blue-400 shadow-xs' 
                              : 'bg-white border-gray-100 hover:bg-gray-50'
                          }`}
                        >
                          <input 
                            type="checkbox"
                            checked={newLivestock.selectedCategories.includes(cat)}
                            onChange={() => toggleCategory(cat)}
                            className="w-4 h-4 text-emerald-500 border-gray-300 rounded focus:ring-emerald-500"
                          />
                          <span className="text-xs sm:text-sm font-medium text-gray-700">{cat}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Custom Status */}
                  <div className="p-4 rounded-2xl border border-gray-200 bg-gray-50/60">
                    <div className="flex items-center space-x-2 mb-2">
                      <Plus className="w-4 h-4 text-gray-600" />
                      <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">Add Custom Status</span>
                    </div>
                    <div className="flex gap-2 max-w-md">
                      <input 
                        type="text"
                        value={customCategoryInput}
                        onChange={(e) => setCustomCategoryInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddCustomCategory();
                          }
                        }}
                        placeholder="e.g. Pruned, Grafted, Seeds..."
                        className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                      />
                      <button
                        type="button"
                        onClick={handleAddCustomCategory}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium transition-colors"
                      >
                        Add
                      </button>
                    </div>
                    {newLivestock.selectedCategories.filter(c => !predefinedCategories.includes(c)).length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {newLivestock.selectedCategories.filter(c => !predefinedCategories.includes(c)).map(cat => (
                          <span key={cat} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                            {cat}
                            <button type="button" onClick={() => toggleCategory(cat)} className="ml-1.5 text-emerald-600 hover:text-emerald-900 font-bold">
                              &times;
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button 
                    onClick={handleAddLivestock}
                    disabled={!newLivestock.name.trim()}
                    className="bg-emerald-500 text-white px-6 py-2 rounded-xl hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm font-medium"
                  >
                    Save Item
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Inventory Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
            {inventory.length === 0 && !showAddForm ? (
              <div className="col-span-full bg-gray-50 rounded-3xl p-12 text-center border border-dashed border-gray-200">
                <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No items found</h3>
                <p className="text-gray-500 mb-6">Start by adding a crop or livestock category to track your inventory.</p>
                <button 
                  onClick={() => setShowAddForm(true)}
                  className="inline-flex items-center space-x-2 bg-emerald-500 text-white px-4 py-2 rounded-lg hover:bg-emerald-600 transition-colors"
                >
                  <Plus size={20} />
                  <span>Add Item</span>
                </button>
              </div>
            ) : (
              inventory.map((item) => {
                const type = item.livestockType;
                const isEditing = editingType === type;
                const isCrop = isCropItem(item);
                const isLive = isLivestockItem(item);

                return (
                  <div key={type} className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-300 relative overflow-hidden flex flex-col justify-between h-full">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-bl-full -z-10"></div>
                    
                    <div>
                      <div className="flex justify-between items-start mb-5">
                        <div className="flex items-center space-x-3">
                          <div className={`p-3 rounded-2xl ${isCrop ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                            {isCrop ? <Sprout className="w-6 h-6" /> : <Package className="w-6 h-6" />}
                          </div>
                          <div>
                            <div className="flex items-center space-x-1.5">
                              <h3 className="text-xl font-bold text-gray-900">{type}</h3>
                              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                isCrop ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-blue-50 text-blue-700 border border-blue-200'
                              }`}>
                                {isCrop ? 'Crop / Plant' : 'Livestock'}
                              </span>
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5">Managed item in database</p>
                          </div>
                        </div>

                        {!isEditing ? (
                          <div className="flex space-x-1">
                            <button onClick={() => handleEditClick(type)} className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Edit">
                              <Edit2 size={18} />
                            </button>
                            <button onClick={() => setDeletingType(type)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                              <Trash2 size={18} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex space-x-2">
                            <button onClick={() => handleSave(type)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Save">
                              <Save size={18} />
                            </button>
                            <button onClick={() => setEditingType(null)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Cancel">
                              <X size={18} />
                            </button>
                          </div>
                        )}
                      </div>

                      {isEditing ? (
                        <div className="space-y-4 animate-in fade-in duration-300 flex-1">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Total Count</label>
                            <input 
                              type="number"
                              min="0"
                              value={editForm.totalCount}
                              onChange={(e) => setEditForm({...editForm, totalCount: e.target.value})}
                              disabled={Object.keys(editForm.categories || {}).length > 0}
                              className={`w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none ${Object.keys(editForm.categories || {}).length > 0 ? 'bg-gray-100 cursor-not-allowed text-gray-500 font-bold' : ''}`}
                            />
                          </div>
                          <div className="pt-4 border-t border-gray-100">
                            <h4 className="text-sm font-medium text-gray-700 mb-3">Status Breakdown</h4>
                            
                            {Object.keys(editForm.categories || {}).length > 0 ? (
                              Object.keys(editForm.categories).map(cat => (
                                <div key={cat} className="flex justify-between items-center mb-2">
                                  <span className="text-sm text-gray-600">{cat}</span>
                                  <input 
                                    type="number" 
                                    min="0"
                                    value={editForm.categories[cat] || ''}
                                    onChange={(e) => handleCategoryChange(cat, e.target.value)}
                                    className="w-20 px-2 py-1 border border-gray-200 rounded text-right focus:ring-2 focus:ring-emerald-500 outline-none"
                                    placeholder="0"
                                  />
                                </div>
                              ))
                            ) : (
                              <p className="text-sm text-gray-400 italic">No categories selected for this item.</p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4 animate-in fade-in duration-300">
                          <div className="flex justify-between items-center p-4 rounded-2xl bg-emerald-500 text-white shadow-md shadow-emerald-200">
                            <span className="text-emerald-50 font-medium">Total Count</span>
                            <span className="text-3xl font-bold">{item.totalCount}</span>
                          </div>
                          
                          {Object.keys(item.categories || {}).length > 0 ? (
                            <div className="mt-4 space-y-2">
                              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Status Breakdown</h4>
                              {Object.entries(item.categories).map(([key, val]) => (
                                <div key={key} className="flex justify-between items-center p-2 rounded-lg bg-gray-50 border border-gray-100">
                                  <span className="text-sm text-gray-600">{key}</span>
                                  <span className="font-semibold text-gray-900">{val}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="mt-4 p-3.5 text-center rounded-xl border border-dashed border-gray-200 flex items-center justify-center">
                              <p className="text-xs text-gray-400">No status breakdown added.</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Quick Own Usage Feed Action Button */}
                    <div className="mt-5 pt-3.5 border-t border-gray-100">
                      {isCrop ? (
                        <button
                          onClick={() => openUsageModal(type, '')}
                          className="w-full flex items-center justify-center space-x-1.5 py-2 px-3 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl text-xs font-bold transition-colors border border-amber-200"
                        >
                          <Sprout size={14} className="text-amber-600" />
                          <span>Feed this crop to Cow / Livestock</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => openUsageModal('', type)}
                          className="w-full flex items-center justify-center space-x-1.5 py-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold transition-colors border border-emerald-200"
                        >
                          <Sprout size={14} className="text-emerald-600" />
                          <span>Feed Farm Crops to {type}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 2: OWN CROP USAGE & FODDER FEEDING VIEW */}
      {activeTab === 'usage' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-6">
            <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-sm border border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Feed Expenses Saved</p>
                <h3 className="text-xl sm:text-2xl font-extrabold text-emerald-600 mt-1">₹{cropUsageSummary.totalSavings.toLocaleString()}</h3>
                <p className="text-xs text-gray-400 mt-1">By using farm-grown crops</p>
              </div>
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                <Sparkles size={22} />
              </div>
            </div>

            <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-sm border border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Feed Logs Recorded</p>
                <h3 className="text-xl sm:text-2xl font-extrabold text-amber-600 mt-1">{cropUsages.length} Feedings</h3>
                <p className="text-xs text-gray-400 mt-1">Total internal usage events</p>
              </div>
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
                <Clock size={22} />
              </div>
            </div>

            <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-sm border border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Animals Fed</p>
                <h3 className="text-xl sm:text-2xl font-extrabold text-blue-600 mt-1">
                  {Object.keys(cropUsageSummary.byLivestock || {}).length} Livestock
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  {Object.keys(cropUsageSummary.byLivestock || {}).join(', ') || 'Cows, hens, etc.'}
                </p>
              </div>
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                <Activity size={22} />
              </div>
            </div>

            <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-sm border border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Crops Utilized</p>
                <h3 className="text-xl sm:text-2xl font-extrabold text-teal-600 mt-1">
                  {Object.keys(cropUsageSummary.byCrop || {}).length} Crop Types
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  {Object.keys(cropUsageSummary.byCrop || {}).join(', ') || 'Grass, corn, silage...'}
                </p>
              </div>
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center flex-shrink-0">
                <Sprout size={22} />
              </div>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 shadow-sm border border-gray-100 space-y-3.5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={usageSearchQuery}
                  onChange={(e) => setUsageSearchQuery(e.target.value)}
                  placeholder="Search by crop, livestock, or notes..."
                  className="w-full pl-10 pr-4 py-2 bg-gray-50/80 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center space-x-1.5 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-200 text-xs">
                  <span className="text-gray-500 font-medium">Crop:</span>
                  <select
                    value={usageFilterCrop}
                    onChange={(e) => setUsageFilterCrop(e.target.value)}
                    className="bg-transparent font-bold text-gray-800 outline-none cursor-pointer"
                  >
                    <option value="All">All Crops</option>
                    {allDbItemNames.map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center space-x-1.5 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-200 text-xs">
                  <span className="text-gray-500 font-medium">Livestock:</span>
                  <select
                    value={usageFilterLivestock}
                    onChange={(e) => setUsageFilterLivestock(e.target.value)}
                    className="bg-transparent font-bold text-gray-800 outline-none cursor-pointer"
                  >
                    <option value="All">All Livestock</option>
                    {allDbItemNames.map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Records List */}
          <div className="bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 shadow-sm border border-gray-100 min-h-[400px]">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4">
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-gray-900">Crop Usage & Fodder Feeding Logs</h3>
                <p className="text-xs text-gray-400 mt-0.5">Records of internal consumption of farm-grown feed and crops</p>
              </div>
              <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                {filteredCropUsages.length} {filteredCropUsages.length === 1 ? 'record' : 'records'}
              </span>
            </div>

            {loadingUsage ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500"></div>
              </div>
            ) : filteredCropUsages.length === 0 ? (
              <div className="text-center py-14 text-gray-400">
                <Sprout className="w-12 h-12 mx-auto mb-3 opacity-25 text-emerald-600" />
                <h4 className="text-base font-bold text-gray-700 mb-1">No Own Crop Usage Logged Yet</h4>
                <p className="text-sm text-gray-500 max-w-md mx-auto mb-5">
                  Feed your cows, hens, or other livestock with farm-grown fodder, grass, or maize and log it here to track feed cost savings!
                </p>
                <button
                  onClick={() => openUsageModal()}
                  className="inline-flex items-center space-x-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-sm transition-all shadow-sm"
                >
                  <Plus size={18} />
                  <span>Log First Crop Usage</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredCropUsages.map((usage) => (
                  <div
                    key={usage._id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 sm:p-4 rounded-xl bg-gray-50/70 border border-gray-200/80 hover:bg-white hover:shadow-md transition-all gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      {/* Flow Header: Crop -> Livestock */}
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="inline-flex items-center space-x-1 font-extrabold text-gray-900 text-base">
                          <span className="text-amber-600">🌾 {usage.cropType}</span>
                        </span>
                        
                        <ArrowRight size={14} className="text-gray-400 flex-shrink-0" />

                        <span className="inline-flex items-center space-x-1 font-extrabold text-emerald-800 text-base">
                          <span className="bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-lg text-xs font-bold">
                            🐄 {usage.fedToLivestock}
                          </span>
                        </span>

                        <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          {usage.quantity} {usage.unit}
                        </span>

                        <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-gray-200 text-gray-700">
                          {usage.usageType}
                        </span>
                      </div>

                      {/* Details row */}
                      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 mt-1">
                        <span className="flex items-center space-x-1">
                          <Calendar size={12} className="text-gray-400" />
                          <span>{new Date(usage.date).toLocaleDateString()}</span>
                        </span>

                        {usage.notes && (
                          <>
                            <span>•</span>
                            <span className="italic text-gray-600">"{usage.notes}"</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Savings and Action */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-200 flex-shrink-0">
                      {usage.estimatedSavings > 0 ? (
                        <div className="text-right">
                          <span className="text-sm sm:text-base font-extrabold text-emerald-700 block">
                            +₹{usage.estimatedSavings.toFixed(2)}
                          </span>
                          <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md">
                            Feed Cost Saved
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 font-medium bg-gray-100 px-2 py-1 rounded-md">
                          Internal Feed Transfer
                        </span>
                      )}

                      <button
                        onClick={() => setDeletingUsageId(usage._id)}
                        className="text-gray-400 hover:text-red-500 p-1.5 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                        title="Delete log"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: LOG OWN CROP USAGE (PORTAL) */}
      {showUsageModal && createPortal(
        <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-5">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center">
                  <Sprout size={22} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Log Own Crop Usage</h3>
                  <p className="text-xs text-gray-500">Record farm-grown crops & fodder fed to livestock.</p>
                </div>
              </div>
              <button onClick={() => setShowUsageModal(false)} className="text-gray-400 hover:text-gray-600 p-1">
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleSaveCropUsage} className="space-y-4">
              {/* Crop Source Selection */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  1. Crop / Plant Harvested (Source) *
                </label>
                <select
                  required
                  value={usageFormData.cropType}
                  onChange={(e) => setUsageFormData({...usageFormData, cropType: e.target.value})}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm bg-white"
                >
                  <option value="">-- Select Crop from DB --</option>
                  {detectedCrops.length > 0 && (
                    <optgroup label="🌱 Crops, Trees & Plants in DB">
                      {detectedCrops.map(item => (
                        <option key={`crop-${item}`} value={item}>
                          🌾 {item}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {allDbItemNames.filter(i => !detectedCrops.includes(i)).length > 0 && (
                    <optgroup label="📋 All Other Inventory Items in DB">
                      {allDbItemNames.filter(i => !detectedCrops.includes(i)).map(item => (
                        <option key={`other-crop-${item}`} value={item}>
                          📦 {item}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
                <p className="text-[11px] text-gray-400 mt-1">
                  Pulls directly from crops and plants currently registered in your database.
                </p>
              </div>

              {/* Fed To Livestock Selection */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  2. Fed To Livestock (Beneficiary / Cow) *
                </label>
                <select
                  required
                  value={usageFormData.fedToLivestock}
                  onChange={(e) => setUsageFormData({...usageFormData, fedToLivestock: e.target.value})}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm bg-white"
                >
                  <option value="">-- Select Livestock from DB --</option>
                  {detectedLivestock.length > 0 && (
                    <optgroup label="🐄 Livestock & Animals in DB">
                      {detectedLivestock.map(item => (
                        <option key={`live-${item}`} value={item}>
                          🐄 {item}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {allDbItemNames.filter(i => !detectedLivestock.includes(i)).length > 0 && (
                    <optgroup label="📋 All Other Items in DB">
                      {allDbItemNames.filter(i => !detectedLivestock.includes(i)).map(item => (
                        <option key={`other-live-${item}`} value={item}>
                          🐾 {item}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
                <p className="text-[11px] text-gray-400 mt-1">
                  Select Cow, Hen, Goat, or any animal/category present in your database.
                </p>
              </div>

              {/* Quantity and Unit */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Quantity Fed *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={usageFormData.quantity}
                    onChange={(e) => setUsageFormData({...usageFormData, quantity: e.target.value})}
                    placeholder="e.g. 50"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Unit *
                  </label>
                  <select
                    value={usageFormData.unit}
                    onChange={(e) => setUsageFormData({...usageFormData, unit: e.target.value})}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm bg-white"
                  >
                    <option value="kg">kg (Kilograms)</option>
                    <option value="bundles">bundles</option>
                    <option value="bags">bags</option>
                    <option value="tons">tons</option>
                    <option value="liters">liters</option>
                    <option value="crates">crates</option>
                    <option value="pieces">pieces</option>
                  </select>
                </div>
              </div>

              {/* Usage Purpose & Estimated Savings */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Usage Purpose
                  </label>
                  <select
                    value={usageFormData.usageType}
                    onChange={(e) => setUsageFormData({...usageFormData, usageType: e.target.value})}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm bg-white"
                  >
                    <option value="Livestock Feed / Fodder">Livestock Feed / Fodder</option>
                    <option value="Farm Mulching / Bedding">Farm Mulching / Bedding</option>
                    <option value="Compost / Organic Manure">Compost / Organic Manure</option>
                    <option value="Seed / Crop Propagation">Seed / Crop Propagation</option>
                    <option value="Domestic / Kitchen Use">Domestic / Kitchen Use</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Estimated Feed Savings (₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={usageFormData.estimatedSavings}
                      onChange={(e) => setUsageFormData({...usageFormData, estimatedSavings: e.target.value})}
                      placeholder="0.00"
                      className="w-full pl-7 pr-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                    />
                  </div>
                  <p className="text-[10px] text-emerald-600 mt-1 font-medium">Money saved vs buying outside feed</p>
                </div>
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Feeding / Usage Date
                </label>
                <input
                  type="date"
                  required
                  value={usageFormData.date}
                  onChange={(e) => setUsageFormData({...usageFormData, date: e.target.value})}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                />
              </div>

              {/* Deduct from Inventory Checkbox */}
              <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100">
                <label className="flex items-start space-x-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={usageFormData.deductFromInventory}
                    onChange={(e) => setUsageFormData({...usageFormData, deductFromInventory: e.target.checked})}
                    className="mt-0.5 w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                  />
                  <div className="text-xs">
                    <span className="font-semibold text-emerald-950">
                      Deduct {usageFormData.quantity || 'this quantity'} from {usageFormData.cropType || 'Crop'} inventory count
                    </span>
                    <p className="text-gray-500 text-[11px] mt-0.5">
                      Automatically reduces the total count of this crop in inventory. Leave unchecked if you only want to record usage history without altering stock count.
                    </p>
                  </div>
                </label>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  rows="2"
                  value={usageFormData.notes}
                  onChange={(e) => setUsageFormData({...usageFormData, notes: e.target.value})}
                  placeholder="e.g. Fresh green fodder given after milking, chopped maize stems..."
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm resize-none"
                ></textarea>
              </div>

              {/* Buttons */}
              <div className="pt-3 flex items-center justify-end space-x-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowUsageModal(false)}
                  className="px-4 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors font-medium text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingUsage}
                  className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl font-semibold shadow-md transition-all text-sm disabled:opacity-50"
                >
                  {submittingUsage ? 'Saving...' : 'Record Feeding Log'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL 2: DELETE INVENTORY ITEM (PORTAL) */}
      {deletingType && createPortal(
        <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="flex items-center space-x-3 text-red-600 mb-4">
              <AlertTriangle size={28} />
              <h3 className="text-xl font-bold">Delete {deletingType}</h3>
            </div>
            <p className="text-gray-600 mb-4 text-sm">
              This action cannot be undone. All counts, categories, sales, expenses, and crop usages for <span className="font-bold text-gray-900">{deletingType}</span> will be permanently removed.
            </p>
            <p className="text-xs text-gray-700 mb-2 font-medium">
              Please type <span className="font-bold bg-gray-100 px-2 py-0.5 rounded select-all">{deletingType}</span> to confirm.
            </p>
            <input 
              type="text"
              value={deleteConfirmation}
              onChange={(e) => setDeleteConfirmation(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl mb-6 focus:ring-2 focus:ring-red-500 outline-none text-sm"
              placeholder={deletingType}
            />
            <div className="flex space-x-3 justify-end">
              <button 
                onClick={() => {
                  setDeletingType(null);
                  setDeleteConfirmation('');
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors font-medium text-sm"
              >
                Cancel
              </button>
              <button 
                onClick={handleDeleteConfirm}
                disabled={deleteConfirmation !== deletingType}
                className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-sm flex items-center text-sm"
              >
                <Trash2 size={16} className="mr-1.5" />
                Delete
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL 3: DELETE CROP USAGE LOG (PORTAL) */}
      {deletingUsageId && createPortal(
        <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center space-x-3 text-red-600 mb-3">
              <AlertCircle size={26} />
              <h3 className="text-xl font-bold">Delete Feeding Record</h3>
            </div>
            <p className="text-gray-600 text-sm mb-6">
              Are you sure you want to remove this crop usage log? This will remove the recorded feed consumption from your reports.
            </p>
            <div className="flex space-x-3 justify-end">
              <button
                onClick={() => setDeletingUsageId(null)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors font-medium text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteUsageConfirm}
                className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-medium text-sm flex items-center"
              >
                <Trash2 size={16} className="mr-1.5" />
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

export default Inventory;
