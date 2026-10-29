import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Settings as SettingsIcon, Bell, CloudRain, Database, ShieldAlert, Globe, Save, Download, AlertTriangle, MapPin, Mail, Check } from 'lucide-react';
import api from '../utils/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const Settings = () => {
  const [saving, setSaving] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [emailingMonthlyReport, setEmailingMonthlyReport] = useState(false);
  const [message, setMessage] = useState('');
  const [profileFarmName, setProfileFarmName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const fileInputRef = useRef(null);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteModalConfig, setDeleteModalConfig] = useState({ type: '', title: '', description: '', confirmText: '' });
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get('/auth/me');
        setProfileFarmName(res.data.farmName || '');
        setProfileEmail(res.data.email || '');
        if (res.data.monthlyReportEnabled !== undefined) {
          setPreferences(prev => ({ ...prev, monthlyReports: res.data.monthlyReportEnabled }));
        }
      } catch (err) {
        console.error('Failed to load profile');
      }
    };
    fetchProfile();
  }, []);
  
  const [preferences, setPreferences] = useState(() => {
    const saved = localStorage.getItem('farm_preferences');
    return saved ? JSON.parse(saved) : {
      currency: 'INR',
      weightUnit: 'kg',
      volumeUnit: 'liters',
      lowStockAlerts: true,
      monthlyReports: true,
      weatherAlerts: false,
      weatherLocation: ''
    };
  });

  const handleChange = (key, value) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          // Reverse geocode via BigDataCloud client API (free, open, no token required)
          const res = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
          );
          const data = await res.json();
          const place = data.city || data.locality || data.principalSubdivision || data.countryName;
          if (place) {
            handleChange('weatherLocation', place);
          } else {
            handleChange('weatherLocation', `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`);
          }
        } catch (err) {
          console.error(err);
          alert('Could not detect city name. Please enter your location manually.');
        } finally {
          setDetectingLocation(false);
        }
      },
      (err) => {
        console.error(err);
        setDetectingLocation(false);
        alert('Location access was denied or unavailable. Please enter your location manually.');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    // Save to localStorage
    localStorage.setItem('farm_preferences', JSON.stringify(preferences));
    
    // Persist monthly report setting to database profile
    try {
      await api.put('/auth/profile', {
        monthlyReportEnabled: !!preferences.monthlyReports
      });
      setMessage('Settings saved successfully!');
    } catch (err) {
      console.error('Failed to sync settings with server:', err);
      setMessage('Settings saved locally.');
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleExportBackup = async () => {
    try {
      const [salesRes, expRes, invRes] = await Promise.all([
        api.get('/sales'),
        api.get('/expenses'),
        api.get('/livestock')
      ]);
      const data = {
        sales: salesRes.data,
        expenses: expRes.data,
        inventory: invRes.data,
        settings: preferences
      };
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'farm_backup.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Failed to export backup data.');
    }
  };

  const handleExportPDF = async () => {
    try {
      setSaving(true);
      const [salesRes, expRes, invRes] = await Promise.all([
        api.get('/sales'),
        api.get('/expenses'),
        api.get('/livestock')
      ]);

      const doc = new jsPDF();
      doc.setFontSize(22);
      doc.text('Farm Complete Backup Report', 14, 20);
      
      doc.setFontSize(11);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);

      // Inventory
      doc.setFontSize(14);
      doc.text('Livestock Inventory', 14, 45);
      autoTable(doc, {
        startY: 50,
        head: [['Type', 'Total Count', 'Categories']],
        body: invRes.data.map(item => {
          let catString = '';
          if (item.categories) {
            catString = Object.entries(item.categories).map(([k,v]) => `${k}: ${v}`).join(', ');
          }
          return [item.livestockType || '-', item.totalCount, catString];
        }),
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] }
      });

      // Sales
      doc.text('Sales History', 14, doc.lastAutoTable.finalY + 15);
      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 20,
        head: [['Date', 'Category', 'Type', 'Quantity', 'Amount']],
        body: salesRes.data.map(s => [
          new Date(s.date).toLocaleDateString(),
          s.livestockType || '-',
          s.saleType || '-',
          s.quantitySold || '0',
          (s.amountReceived || 0).toFixed(2)
        ]),
        theme: 'striped',
        headStyles: { fillColor: [16, 185, 129] }
      });

      // Expenses
      doc.text('Expenses History', 14, doc.lastAutoTable.finalY + 15);
      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 20,
        head: [['Date', 'Category', 'Expense Type', 'Amount']],
        body: expRes.data.map(e => [
          new Date(e.date).toLocaleDateString(),
          e.livestockType || '-',
          e.category || '-',
          (e.amount || 0).toFixed(2)
        ]),
        theme: 'striped',
        headStyles: { fillColor: [239, 68, 68] }
      });

      doc.save('farm_full_backup.pdf');
    } catch (err) {
      console.error(err);
      alert('Failed to generate PDF backup.');
    } finally {
      setSaving(false);
    }
  };

  const handleSendMonthlyReportNow = async () => {
    try {
      setEmailingMonthlyReport(true);
      const [salesRes, expRes, invRes] = await Promise.all([
        api.get('/sales'),
        api.get('/expenses'),
        api.get('/livestock')
      ]);

      const now = new Date();
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      const currentMonth = monthNames[now.getMonth()];
      const currentYear = now.getFullYear();

      const startOfMonth = new Date(currentYear, now.getMonth(), 1);
      const endOfMonth = new Date(currentYear, now.getMonth() + 1, 0, 23, 59, 59);

      const monthlySales = salesRes.data.filter(s => new Date(s.date) >= startOfMonth && new Date(s.date) <= endOfMonth);
      const monthlyExpenses = expRes.data.filter(e => new Date(e.date) >= startOfMonth && new Date(e.date) <= endOfMonth);

      const totalRev = monthlySales.reduce((acc, s) => acc + (s.amountReceived || 0), 0);
      const totalExp = monthlyExpenses.reduce((acc, e) => acc + (e.amount || 0), 0);
      const netProfit = totalRev - totalExp;

      const doc = new jsPDF();
      doc.setFontSize(22);
      doc.text(`${profileFarmName || 'Farm'} - Monthly Financial Report`, 14, 20);

      doc.setFontSize(11);
      doc.text(`Period: ${currentMonth} ${currentYear} (${startOfMonth.toLocaleDateString()} - ${endOfMonth.toLocaleDateString()})`, 14, 30);
      doc.text(`Generated by: FarmTracker System (noreply@farmtracker.com)`, 14, 37);

      doc.setFontSize(14);
      doc.text('Monthly Financial Summary', 14, 49);
      autoTable(doc, {
        startY: 54,
        head: [['Total Revenue (Rs)', 'Total Expenses (Rs)', 'Net Profit (Rs)']],
        body: [[totalRev.toFixed(2), totalExp.toFixed(2), netProfit.toFixed(2)]],
        theme: 'grid',
        headStyles: { fillColor: [16, 185, 129] }
      });

      doc.text('Current Livestock Inventory', 14, doc.lastAutoTable.finalY + 15);
      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 20,
        head: [['Item / Livestock', 'Total Count', 'Category Breakdown']],
        body: invRes.data.map(item => {
          let catString = '';
          if (item.categories) {
            catString = Object.entries(item.categories).map(([k,v]) => `${k}: ${v}`).join(', ');
          }
          return [item.livestockType || '-', item.totalCount, catString];
        }),
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] }
      });

      doc.text('Monthly Sales', 14, doc.lastAutoTable.finalY + 15);
      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 20,
        head: [['Date', 'Category', 'Sale Type', 'Quantity', 'Amount (Rs)']],
        body: monthlySales.map(s => [
          new Date(s.date).toLocaleDateString(),
          s.livestockType || '-',
          s.saleType || '-',
          s.quantitySold || '0',
          (s.amountReceived || 0).toFixed(2)
        ]),
        theme: 'striped'
      });

      doc.text('Monthly Expenses', 14, doc.lastAutoTable.finalY + 15);
      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 20,
        head: [['Date', 'Category', 'Expense Type', 'Amount (Rs)']],
        body: monthlyExpenses.map(e => [
          new Date(e.date).toLocaleDateString(),
          e.livestockType || '-',
          e.category || '-',
          (e.amount || 0).toFixed(2)
        ]),
        theme: 'striped'
      });

      const pdfBase64 = doc.output('datauristring').split(',')[1];
      const res = await api.post('/dashboard/send-monthly-report', {
        pdfBase64,
        month: currentMonth,
        year: currentYear,
        summary: { totalRevenue: totalRev, totalExpenses: totalExp, netProfit }
      });

      setMessage(res.data.message || `Monthly report sent to ${profileEmail} from noreply@farmtracker.com!`);
      setTimeout(() => setMessage(''), 6000);
    } catch (err) {
      console.error(err);
      alert('Failed to send monthly report email: ' + (err.response?.data?.message || err.message));
    } finally {
      setEmailingMonthlyReport(false);
    }
  };

  const handleResetData = () => {
    setDeleteModalConfig({
      type: 'reset',
      title: 'Reset All Farm Data',
      description: 'This action cannot be undone. All farm data will be permanently removed.',
      confirmText: 'Reset',
    });
    setDeleteConfirmInput('');
    setShowDeleteModal(true);
  };

  const handleImportJSON = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        setSaving(true);
        const data = JSON.parse(event.target.result);
        await api.post('/dashboard/import', data);
        if (data.settings) {
          localStorage.setItem('farm_preferences', JSON.stringify(data.settings));
          setPreferences(data.settings);
        }
        setMessage('Backup imported successfully!');
        setTimeout(() => setMessage(''), 3000);
      } catch (err) {
        console.error(err);
        alert('Failed to import backup. Please ensure the file is valid JSON.');
      } finally {
        setSaving(false);
        e.target.value = ''; // reset
      }
    };
    reader.readAsText(file);
  };

  const handleDeleteAccount = () => {
    setDeleteModalConfig({
      type: 'account',
      title: 'Delete Account',
      description: 'This action cannot be undone. Your account and all farm data will be permanently removed.',
      confirmText: profileFarmName || 'DELETE',
    });
    setDeleteConfirmInput('');
    setShowDeleteModal(true);
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 sm:space-y-8 pb-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">App Settings</h1>
        <p className="text-gray-500 mt-1 text-sm sm:text-base">Configure your farm tracking preferences and system settings.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Integrations */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm border border-gray-100">
          <div className="flex items-center space-x-3 mb-4 sm:mb-6 pb-3 sm:pb-4 border-b border-gray-100">
            <div className="bg-indigo-50 p-2 rounded-xl text-indigo-500 flex-shrink-0">
              <CloudRain size={24} />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">Farm Integrations</h2>
          </div>
          
          <div className="border border-gray-100 rounded-2xl overflow-hidden transition-all">
            <label className="flex items-center justify-between gap-3 p-3 sm:p-4 hover:bg-gray-50 cursor-pointer transition-colors">
              <div className="flex-1 min-w-0 pr-2">
                <p className="font-semibold text-gray-900 text-sm sm:text-base">Weather API Integration</p>
                <p className="text-xs sm:text-sm text-gray-500 break-words mt-0.5">Enable local weather tracking for crop and livestock management.</p>
              </div>
              <div className={`w-12 h-6 flex-shrink-0 rounded-full transition-colors relative ${preferences.weatherAlerts ? 'bg-emerald-500' : 'bg-gray-300'}`}>
                <input type="checkbox" className="sr-only" checked={preferences.weatherAlerts} onChange={(e) => handleChange('weatherAlerts', e.target.checked)} />
                <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${preferences.weatherAlerts ? 'transform translate-x-6' : ''}`}></div>
              </div>
            </label>

            {preferences.weatherAlerts && (
              <div className="p-3 sm:p-4 border-t border-gray-100 bg-gray-50 animate-in slide-in-from-top-2">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs sm:text-sm font-medium text-gray-700">
                    Farm Location (City or Region)
                  </label>
                  <button
                    type="button"
                    onClick={handleUseCurrentLocation}
                    disabled={detectingLocation}
                    className="inline-flex items-center text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors disabled:opacity-50"
                  >
                    {detectingLocation ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border-t-2 border-b-2 border-emerald-600 mr-1.5"></div>
                        <span>Detecting...</span>
                      </>
                    ) : (
                      <>
                        <MapPin size={13} className="mr-1 text-emerald-500" />
                        <span>Use my current location</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="relative">
                  <input 
                    type="text"
                    value={preferences.weatherLocation || ''}
                    onChange={(e) => handleChange('weatherLocation', e.target.value)}
                    className="w-full px-3 sm:px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none pr-10 bg-white"
                    placeholder="e.g., Coimbatore, Madurai, Salem, Trichy"
                  />
                  <button
                    type="button"
                    onClick={handleUseCurrentLocation}
                    disabled={detectingLocation}
                    title="Detect current location"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-emerald-600 transition-colors p-1"
                  >
                    <MapPin size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Monthly Email Reports */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm border border-gray-100">
          <div className="flex items-center space-x-3 mb-4 sm:mb-6 pb-3 sm:pb-4 border-b border-gray-100">
            <div className="bg-emerald-50 p-2 rounded-xl text-emerald-600 flex-shrink-0">
              <Mail size={24} />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">Monthly Farm Email Reports</h2>
              <p className="text-xs sm:text-sm text-gray-500">Automated financial and herd performance reports sent via noreply email.</p>
            </div>
          </div>
          
          <div className="border border-gray-100 rounded-2xl overflow-hidden transition-all mb-4">
            <label className="flex items-center justify-between gap-3 p-3 sm:p-4 hover:bg-gray-50 cursor-pointer transition-colors">
              <div className="flex-1 min-w-0 pr-2">
                <div className="flex items-center space-x-2">
                  <p className="font-semibold text-gray-900 text-sm sm:text-base">Monthly Automated PDF Dispatch</p>
                  <span className="hidden sm:inline-block text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    1st of month @ 8:00 AM
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-gray-500 break-words mt-1">
                  When enabled, automatically generates and sends the comprehensive monthly report PDF to <strong>{profileEmail || 'your email'}</strong> on the <strong>1st of every month at 8:00 AM</strong> from <strong>noreply@farmtracker.com</strong>.
                </p>
              </div>
              <div className={`w-12 h-6 flex-shrink-0 rounded-full transition-colors relative ${preferences.monthlyReports ? 'bg-emerald-500' : 'bg-gray-300'}`}>
                <input type="checkbox" className="sr-only" checked={preferences.monthlyReports} onChange={(e) => handleChange('monthlyReports', e.target.checked)} />
                <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${preferences.monthlyReports ? 'transform translate-x-6' : ''}`}></div>
              </div>
            </label>
          </div>

          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="text-xs sm:text-sm text-gray-600">
              <p className="font-medium text-gray-800">Need this month's accounting report immediately?</p>
              <p className="text-xs text-gray-500 mt-0.5">Generates the latest accounting & livestock PDF and emails it from noreply@farmtracker.com.</p>
            </div>
            <button
              type="button"
              onClick={handleSendMonthlyReportNow}
              disabled={emailingMonthlyReport}
              className="flex items-center justify-center space-x-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-medium transition-colors shadow-sm disabled:opacity-50 w-full sm:w-auto flex-shrink-0"
            >
              {emailingMonthlyReport ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                  <span>Generating & Sending...</span>
                </>
              ) : (
                <>
                  <Mail size={16} className="mr-1.5" />
                  <span>Send This Month's Report Now</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm border border-red-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-50 rounded-bl-full -z-10 opacity-50"></div>
          <div className="flex items-center space-x-3 mb-3 sm:mb-4">
            <ShieldAlert size={24} className="text-red-500 flex-shrink-0" />
            <h2 className="text-lg sm:text-xl font-bold text-red-600">Danger Zone</h2>
          </div>
          <p className="text-gray-600 mb-4 sm:mb-6 text-xs sm:text-sm">These actions are permanent and cannot be undone.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <button 
              type="button" 
              onClick={handleExportBackup}
              className="flex items-center justify-center px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors text-xs sm:text-sm font-medium w-full"
            >
              <Download size={16} className="mr-2 flex-shrink-0" />
              <span>Export Farm Backup (JSON)</span>
            </button>
            <input 
              type="file" 
              accept=".json" 
              ref={fileInputRef} 
              className="hidden" 
              onChange={handleImportJSON} 
            />
            <button 
              type="button" 
              onClick={() => fileInputRef.current.click()}
              className="flex items-center justify-center px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors text-xs sm:text-sm font-medium w-full"
            >
              <Download size={16} className="mr-2 flex-shrink-0 transform rotate-180" />
              <span>Import Farm Backup (JSON)</span>
            </button>
            <button 
              type="button" 
              onClick={handleExportPDF}
              className="flex items-center justify-center px-4 py-2.5 border border-blue-200 bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 transition-colors text-xs sm:text-sm font-medium w-full"
            >
              <Download size={16} className="mr-2 flex-shrink-0" />
              <span>Download All Data as PDF</span>
            </button>
            <button 
              type="button" 
              onClick={handleResetData}
              className="flex items-center justify-center px-4 py-2.5 bg-orange-100 text-orange-600 rounded-xl hover:bg-orange-200 transition-colors text-xs sm:text-sm font-medium w-full"
            >
              <span>Reset All Farm Data</span>
            </button>
            <button 
              type="button" 
              onClick={handleDeleteAccount}
              className="flex items-center justify-center px-4 py-2.5 bg-red-100 text-red-600 rounded-xl hover:bg-red-200 transition-colors text-xs sm:text-sm font-medium w-full"
            >
              <span>Delete Account</span>
            </button>
          </div>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row justify-end items-center gap-3">
          {message && <span className="text-emerald-600 font-medium text-sm animate-in fade-in text-center">{message}</span>}
          <button
            type="submit"
            disabled={saving}
            className="flex items-center justify-center w-full sm:w-auto px-8 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-md transition-all font-medium disabled:opacity-70 text-sm sm:text-base"
          >
            {saving ? (
              <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-2"></div>
            ) : (
              <Save size={18} className="mr-2" />
            )}
            Save Settings
          </button>
        </div>
      </form>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && createPortal(
        <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="flex items-center space-x-3 mb-4">
              <AlertTriangle className="text-red-500 w-8 h-8" />
              <h3 className="text-2xl font-bold text-red-600">{deleteModalConfig.title}</h3>
            </div>
            <p className="text-gray-600 mb-6">{deleteModalConfig.description}</p>
            
            <div className="mb-6">
              <p className="text-sm text-gray-700 mb-2">
                Please type <span className="bg-gray-100 font-bold px-2 py-1 rounded">{deleteModalConfig.confirmText}</span> to confirm.
              </p>
              <input
                type="text"
                value={deleteConfirmInput}
                onChange={(e) => setDeleteConfirmInput(e.target.value)}
                placeholder={deleteModalConfig.confirmText}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none"
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-6 py-2.5 text-gray-600 font-medium hover:bg-gray-50 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (deleteConfirmInput !== deleteModalConfig.confirmText) {
                    alert('Text does not match. Action cancelled.');
                    return;
                  }
                  
                  if (deleteModalConfig.type === 'reset') {
                    try {
                      setSaving(true);
                      await api.delete('/dashboard/reset');
                      setMessage('All farm data has been wiped.');
                      setTimeout(() => setMessage(''), 4000);
                    } catch (err) {
                      console.error(err);
                      alert('Failed to reset all data.');
                    } finally {
                      setSaving(false);
                      setShowDeleteModal(false);
                    }
                  } else if (deleteModalConfig.type === 'account') {
                    try {
                      setSaving(true);
                      await api.delete('/auth/account');
                      localStorage.removeItem('token');
                      localStorage.removeItem('farm_preferences');
                      window.location.href = '/login';
                    } catch (err) {
                      console.error(err);
                      alert('Failed to delete account.');
                      setSaving(false);
                      setShowDeleteModal(false);
                    }
                  }
                }}
                disabled={deleteConfirmInput !== deleteModalConfig.confirmText || saving}
                className="px-6 py-2.5 bg-red-400 text-white font-medium hover:bg-red-500 rounded-xl transition-colors disabled:opacity-50"
              >
                {saving ? 'Processing...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default Settings;
