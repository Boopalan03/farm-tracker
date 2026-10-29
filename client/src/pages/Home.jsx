import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { 
  IndianRupee, TrendingUp, TrendingDown, Activity, Package, Briefcase, Plus, 
  Download, X, Mail, CheckCircle, Calendar, Filter, ChevronLeft, ChevronRight, 
  RotateCcw, SlidersHorizontal, ArrowRight, Sparkles, Sprout
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const getWeatherInfo = (code) => {
  if (code === 0) return { desc: 'Clear sky', icon: '☀️' };
  if (code >= 1 && code <= 3) return { desc: 'Partly cloudy', icon: '⛅' };
  if (code >= 45 && code <= 48) return { desc: 'Fog', icon: '🌫️' };
  if (code >= 51 && code <= 67) return { desc: 'Rain', icon: '🌧️' };
  if (code >= 71 && code <= 77) return { desc: 'Snow', icon: '❄️' };
  if (code >= 95) return { desc: 'Thunderstorm', icon: '⛈️' };
  return { desc: 'Unknown', icon: '☁️' };
};

const Home = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Financial Filter States
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'month' | 'year' | 'custom'
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedYear, setSelectedYear] = useState(() => String(new Date().getFullYear()));
  const [customRangeStart, setCustomRangeStart] = useState('');
  const [customRangeEnd, setCustomRangeEnd] = useState('');
  const [filterLoading, setFilterLoading] = useState(false);

  const [showReportModal, setShowReportModal] = useState(false);
  const [reportRange, setReportRange] = useState('monthly');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [emailingPDF, setEmailingPDF] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [selectedCategories, setSelectedCategories] = useState([]);

  const [weather, setWeather] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState('');

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const savedPrefs = localStorage.getItem('farm_preferences');
        if (savedPrefs) {
          const prefs = JSON.parse(savedPrefs);
          if (prefs.weatherAlerts && prefs.weatherLocation) {
            setWeatherLoading(true);
            const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(prefs.weatherLocation)}&count=1`);
            const geoData = await geoRes.json();
            
            if (geoData.results && geoData.results.length > 0) {
              const { latitude, longitude, name, country } = geoData.results[0];
              const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`);
              const weatherData = await weatherRes.json();
              
              setWeather({
                location: `${name}, ${country || ''}`,
                temperature: weatherData.current_weather.temperature,
                windspeed: weatherData.current_weather.windspeed,
                code: weatherData.current_weather.weathercode
              });
            } else {
              setWeatherError('Weather location not found');
            }
          }
        }
      } catch (err) {
        setWeatherError('Failed to load weather');
      } finally {
        setWeatherLoading(false);
      }
    };
    
    fetchWeather();
  }, []);

  const fetchDashboard = async (mode = filterMode, monthVal = selectedMonth, yearVal = selectedYear, startVal = customRangeStart, endVal = customRangeEnd, isInitial = false) => {
    try {
      if (isInitial) {
        setLoading(true);
      } else {
        setFilterLoading(true);
      }

      const params = {};
      if (mode === 'month' && monthVal) {
        params.filterType = 'month';
        params.month = monthVal;
      } else if (mode === 'year' && yearVal) {
        params.filterType = 'year';
        params.year = yearVal;
      } else if (mode === 'custom') {
        params.filterType = 'custom';
        if (startVal) params.startDate = startVal;
        if (endVal) params.endDate = endVal;
      } else {
        params.filterType = 'all';
      }

      const response = await api.get('/dashboard/summary', { params });
      setData(response.data);
      setError('');
    } catch (err) {
      console.error(err);
      setError('Failed to load dashboard data.');
    } finally {
      setLoading(false);
      setFilterLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard('all', selectedMonth, selectedYear, customRangeStart, customRangeEnd, true);
  }, []);

  useEffect(() => {
    if (filterMode === 'all') {
      fetchDashboard('all');
    } else if (filterMode === 'month') {
      fetchDashboard('month', selectedMonth);
    } else if (filterMode === 'year') {
      fetchDashboard('year', selectedMonth, selectedYear);
    } else if (filterMode === 'custom') {
      if (customRangeStart && customRangeEnd) {
        fetchDashboard('custom', selectedMonth, selectedYear, customRangeStart, customRangeEnd);
      }
    }
  }, [filterMode, selectedMonth, selectedYear]);

  const handleMonthStep = (step) => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + step, 1);
    const nextY = d.getFullYear();
    const nextM = String(d.getMonth() + 1).padStart(2, '0');
    setSelectedMonth(`${nextY}-${nextM}`);
  };

  const handlePresetCustom = (days) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);

    const format = (d) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const sStr = format(start);
    const eStr = format(end);
    setCustomRangeStart(sStr);
    setCustomRangeEnd(eStr);
    fetchDashboard('custom', selectedMonth, selectedYear, sStr, eStr);
  };

  const handleApplyCustom = () => {
    if (!customRangeStart || !customRangeEnd) {
      alert('Please select both a Start Date and an End Date.');
      return;
    }
    fetchDashboard('custom', selectedMonth, selectedYear, customRangeStart, customRangeEnd);
  };

  const handleResetFilter = () => {
    setFilterMode('all');
  };

  const getFilterDescription = () => {
    if (filterMode === 'all') {
      return {
        tag: 'All Time',
        details: 'Showing farm lifetime totals',
        isFiltered: false,
      };
    }
    if (filterMode === 'month') {
      const [y, m] = selectedMonth.split('-');
      const dateObj = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
      const monthName = dateObj.toLocaleString('en-US', { month: 'long', year: 'numeric' });
      const lastDay = new Date(parseInt(y, 10), parseInt(m, 10), 0).getDate();
      return {
        tag: monthName,
        details: `From 01/${m}/${y} to ${String(lastDay).padStart(2, '0')}/${m}/${y}`,
        isFiltered: true,
      };
    }
    if (filterMode === 'year') {
      return {
        tag: `Year ${selectedYear}`,
        details: `From 01/01/${selectedYear} to 31/12/${selectedYear}`,
        isFiltered: true,
      };
    }
    if (filterMode === 'custom') {
      const formatDisplay = (dStr) => {
        if (!dStr) return '...';
        const [y, m, d] = dStr.split('-');
        return `${d}/${m}/${y}`;
      };
      if (customRangeStart && customRangeEnd) {
        return {
          tag: 'Custom Period',
          details: `From ${formatDisplay(customRangeStart)} to ${formatDisplay(customRangeEnd)}`,
          isFiltered: true,
        };
      }
      return {
        tag: 'Custom Period',
        details: 'Select Start and End Date',
        isFiltered: true,
      };
    }
    return { tag: 'All Time', details: '', isFiltered: false };
  };

  const activeFilterInfo = getFilterDescription();
  const currentYearNum = new Date().getFullYear();
  const availableYearsList = [currentYearNum, currentYearNum - 1, currentYearNum - 2, currentYearNum - 3, currentYearNum - 4];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-500 p-6 rounded-2xl shadow-sm border border-red-100 flex items-center justify-center min-h-[200px]">
        <p className="text-lg font-medium">{error}</p>
      </div>
    );
  }

  const livestockTypes = data ? Object.keys(data.summary || {}) : [];

  const handleOpenModal = () => {
    setSelectedCategories(livestockTypes);
    setShowReportModal(true);
  };

  const generatePDF = async () => {
    setGeneratingPDF(true);
    try {
      const [salesRes, expensesRes] = await Promise.all([
        api.get('/sales'),
        api.get('/expenses')
      ]);

      const salesData = salesRes.data;
      const expensesData = expensesRes.data;

      const end = customEnd && reportRange === 'custom' ? new Date(customEnd) : new Date();
      let start = new Date();

      if (reportRange === 'weekly') {
        start.setDate(end.getDate() - 7);
      } else if (reportRange === 'monthly') {
        start.setMonth(end.getMonth() - 1);
      } else if (reportRange === '3months') {
        start.setMonth(end.getMonth() - 3);
      } else if (reportRange === '6months') {
        start.setMonth(end.getMonth() - 6);
      } else if (reportRange === '1year') {
        start.setFullYear(end.getFullYear() - 1);
      } else if (reportRange === 'custom' && customStart) {
        start = new Date(customStart);
      }
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);

      const filteredSales = salesData.filter(s =>
        new Date(s.date) >= start &&
        new Date(s.date) <= end &&
        selectedCategories.includes(s.livestockType)
      );
      const filteredExpenses = expensesData.filter(e =>
        new Date(e.date) >= start &&
        new Date(e.date) <= end &&
        selectedCategories.includes(e.livestockType)
      );

      const totalRev = filteredSales.reduce((acc, curr) => acc + curr.amountReceived, 0);
      const totalExp = filteredExpenses.reduce((acc, curr) => acc + curr.amount, 0);
      const netProfit = totalRev - totalExp;

      const doc = new jsPDF();
      doc.setFontSize(22);
      doc.text(`${data.farmName || 'Farm'} - Financial Report`, 14, 20);

      doc.setFontSize(11);
      doc.text(`Report Period: ${start.toLocaleDateString()} to ${end.toLocaleDateString()}`, 14, 30);

      doc.setFontSize(14);
      doc.text('Summary', 14, 45);

      autoTable(doc, {
        startY: 50,
        head: [['Total Revenue (Rs)', 'Total Expenses (Rs)', 'Net Profit (Rs)']],
        body: [[totalRev.toFixed(2), totalExp.toFixed(2), netProfit.toFixed(2)]],
        theme: 'grid',
        headStyles: { fillColor: [16, 185, 129] }
      });

      doc.text('Sales', 14, doc.lastAutoTable.finalY + 15);
      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 20,
        head: [['Date', 'Category', 'Type', 'Quantity', 'Amount (Rs)']],
        body: filteredSales.map(s => [
          new Date(s.date).toLocaleDateString(),
          s.livestockType || '-',
          s.saleType || '-',
          s.quantitySold || '0',
          (s.amountReceived || 0).toFixed(2)
        ]),
        theme: 'striped'
      });

      doc.text('Expenses', 14, doc.lastAutoTable.finalY + 15);
      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 20,
        head: [['Date', 'Category', 'Expense Type', 'Amount (Rs)']],
        body: filteredExpenses.map(e => [
          new Date(e.date).toLocaleDateString(),
          e.livestockType || '-',
          e.category || '-',
          (e.amount || 0).toFixed(2)
        ]),
        theme: 'striped'
      });

      doc.save(`${data.farmName || 'Farm'}_Report.pdf`);
      setShowReportModal(false);
    } catch (err) {
      console.error(err);
      alert('Failed to generate report.');
    } finally {
      setGeneratingPDF(false);
    }
  };

  const handleEmailPDF = async () => {
    setEmailingPDF(true);
    try {
      const [salesRes, expensesRes] = await Promise.all([
        api.get('/sales'),
        api.get('/expenses')
      ]);

      const salesData = salesRes.data;
      const expensesData = expensesRes.data;

      const end = customEnd && reportRange === 'custom' ? new Date(customEnd) : new Date();
      let start = new Date();

      if (reportRange === 'weekly') {
        start.setDate(end.getDate() - 7);
      } else if (reportRange === 'monthly') {
        start.setMonth(end.getMonth() - 1);
      } else if (reportRange === '3months') {
        start.setMonth(end.getMonth() - 3);
      } else if (reportRange === '6months') {
        start.setMonth(end.getMonth() - 6);
      } else if (reportRange === '1year') {
        start.setFullYear(end.getFullYear() - 1);
      } else if (reportRange === 'custom' && customStart) {
        start = new Date(customStart);
      }
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);

      const filteredSales = salesData.filter(s =>
        new Date(s.date) >= start &&
        new Date(s.date) <= end &&
        selectedCategories.includes(s.livestockType)
      );
      const filteredExpenses = expensesData.filter(e =>
        new Date(e.date) >= start &&
        new Date(e.date) <= end &&
        selectedCategories.includes(e.livestockType)
      );

      const totalRev = filteredSales.reduce((acc, curr) => acc + curr.amountReceived, 0);
      const totalExp = filteredExpenses.reduce((acc, curr) => acc + curr.amount, 0);
      const netProfit = totalRev - totalExp;

      const doc = new jsPDF();
      doc.setFontSize(22);
      doc.text(`${data.farmName || 'Farm'} - Monthly Financial Report`, 14, 20);

      doc.setFontSize(11);
      doc.text(`Report Period: ${start.toLocaleDateString()} to ${end.toLocaleDateString()}`, 14, 30);
      doc.text(`Generated by: FarmTracker System (noreply@farmtracker.com)`, 14, 37);

      doc.setFontSize(14);
      doc.text('Summary', 14, 49);

      autoTable(doc, {
        startY: 54,
        head: [['Total Revenue (Rs)', 'Total Expenses (Rs)', 'Net Profit (Rs)']],
        body: [[totalRev.toFixed(2), totalExp.toFixed(2), netProfit.toFixed(2)]],
        theme: 'grid',
        headStyles: { fillColor: [16, 185, 129] }
      });

      doc.text('Sales', 14, doc.lastAutoTable.finalY + 15);
      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 20,
        head: [['Date', 'Category', 'Type', 'Quantity', 'Amount (Rs)']],
        body: filteredSales.map(s => [
          new Date(s.date).toLocaleDateString(),
          s.livestockType || '-',
          s.saleType || '-',
          s.quantitySold || '0',
          (s.amountReceived || 0).toFixed(2)
        ]),
        theme: 'striped'
      });

      doc.text('Expenses', 14, doc.lastAutoTable.finalY + 15);
      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 20,
        head: [['Date', 'Category', 'Expense Type', 'Amount (Rs)']],
        body: filteredExpenses.map(e => [
          new Date(e.date).toLocaleDateString(),
          e.livestockType || '-',
          e.category || '-',
          (e.amount || 0).toFixed(2)
        ]),
        theme: 'striped'
      });

      const pdfBase64 = doc.output('datauristring').split(',')[1];
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      const monthName = monthNames[end.getMonth()];

      const res = await api.post('/dashboard/send-monthly-report', {
        pdfBase64,
        month: monthName,
        year: end.getFullYear(),
        summary: {
          totalRevenue: totalRev,
          totalExpenses: totalExp,
          netProfit
        }
      });

      setToastMessage(res.data.message || `Monthly report sent to your email from noreply@farmtracker.com`);
      setTimeout(() => setToastMessage(''), 6000);
      setShowReportModal(false);
    } catch (err) {
      console.error(err);
      alert('Failed to email report: ' + (err.response?.data?.message || err.message));
    } finally {
      setEmailingPDF(false);
    }
  };

  const { 
    totalOverallExpenses = 0, 
    totalOverallRevenue = 0, 
    totalOverallProfit = 0, 
    summary = {}, 
    farmName = '' 
  } = data || {};

  const StatCard = ({ title, amount, icon: Icon, colorClass, gradientClass, badgeText, loading }) => (
    <div className={`relative overflow-hidden rounded-3xl p-6 shadow-sm border border-white/40 transform hover:-translate-y-1 transition-all duration-300 ${gradientClass}`}>
      <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-white/10 blur-xl pointer-events-none"></div>
      <div className="relative z-10 flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center space-x-2 mb-1 flex-wrap gap-y-1">
            <p className="text-white/80 text-xs sm:text-sm font-semibold uppercase tracking-wider">{title}</p>
            {badgeText && (
              <span className="text-[10px] bg-black/25 text-white/95 px-2 py-0.5 rounded-full font-semibold backdrop-blur-xs">
                {badgeText}
              </span>
            )}
          </div>
          {loading ? (
            <div className="flex items-center space-x-2 h-9 mt-1">
              <div className="w-5 h-5 border-2 border-white/60 border-t-white rounded-full animate-spin"></div>
              <span className="text-sm font-medium text-white/80">Updating...</span>
            </div>
          ) : (
            <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-1">
              ₹{Number(amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
          )}
        </div>
        <div className={`p-3 rounded-2xl flex-shrink-0 ${colorClass}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 pb-8 relative">
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 flex items-center space-x-2 px-4 py-3 rounded-xl shadow-lg text-white bg-emerald-600 animate-in slide-in-from-top-2 duration-300">
          <CheckCircle size={20} className="flex-shrink-0" />
          <span className="font-medium text-sm">{toastMessage}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
            {farmName ? `${farmName}'s Overview` : 'Overview'}
          </h1>
          <p className="text-gray-500 mt-1 text-sm sm:text-base">Here's your farm's financial summary.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          {/* Weather Temperature badge in front of Email Monthly Report */}
          {weatherLoading ? (
            <div className="flex items-center space-x-1.5 bg-white px-3 py-2 rounded-xl border border-gray-200 shadow-xs text-xs text-gray-500 font-medium">
              <div className="animate-spin rounded-full h-3 w-3 border-t-2 border-b-2 border-cyan-500"></div>
              <span>...</span>
            </div>
          ) : weather && weather.temperature !== undefined ? (
            <div 
              title={weather.location ? `${weather.location} • ${getWeatherInfo(weather.code).desc}` : 'Local Temperature'}
              className="flex items-center space-x-1.5 bg-white px-3 py-2 rounded-xl border border-gray-200 shadow-xs text-sm font-bold text-gray-800 transition-all hover:bg-gray-50"
            >
              <span className="text-base leading-none">{getWeatherInfo(weather.code).icon}</span>
              <span className="text-cyan-700 font-extrabold">{weather.temperature}°C</span>
            </div>
          ) : null}

          <button
            onClick={() => {
              setReportRange('monthly');
              handleOpenModal();
            }}
            className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl transition-colors shadow-sm text-sm font-medium"
          >
            <Mail size={18} />
            <span>Email Monthly Report</span>
          </button>
          <button
            onClick={handleOpenModal}
            className="flex items-center space-x-2 bg-blue-500 hover:bg-blue-600 text-white px-3.5 py-2 rounded-xl transition-colors shadow-sm text-sm font-medium"
          >
            <Download size={18} />
            <span className="hidden sm:inline">Download Report</span>
          </button>
        </div>
      </div>

      {/* Financial Performance Filter Bar */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 shadow-sm border border-gray-100/90 transition-all">
        {/* Header Row: Title & Filter Mode Switcher */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center text-white shadow-sm flex-shrink-0">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base sm:text-lg font-bold text-gray-900">Financial Summary Filter</h3>
                {activeFilterInfo.isFiltered && (
                  <span className="inline-flex items-center text-[11px] font-semibold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full">
                    {activeFilterInfo.tag}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                {activeFilterInfo.details}
              </p>
            </div>
          </div>

          {/* Mode Selector Tabs */}
          <div className="flex items-center p-1 bg-gray-100/80 rounded-2xl flex-wrap gap-1">
            <button
              onClick={() => setFilterMode('all')}
              className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                filterMode === 'all'
                  ? 'bg-white text-emerald-700 shadow-sm font-semibold'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
              }`}
            >
              <span>🌐 All Time</span>
            </button>

            <button
              onClick={() => setFilterMode('month')}
              className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                filterMode === 'month'
                  ? 'bg-white text-emerald-700 shadow-sm font-semibold'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
              }`}
            >
              <Calendar className="w-4 h-4 text-emerald-600" />
              <span>Month Wise</span>
            </button>

            <button
              onClick={() => setFilterMode('year')}
              className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                filterMode === 'year'
                  ? 'bg-white text-emerald-700 shadow-sm font-semibold'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
              }`}
            >
              <span>📆 Year Wise</span>
            </button>

            <button
              onClick={() => setFilterMode('custom')}
              className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                filterMode === 'custom'
                  ? 'bg-white text-emerald-700 shadow-sm font-semibold'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
              }`}
            >
              <Filter className="w-4 h-4 text-blue-600" />
              <span>Custom Range</span>
            </button>
          </div>
        </div>

        {/* Sub-Controls: Month Wise Mode */}
        {filterMode === 'month' && (
          <div className="pt-4 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="flex items-center space-x-2 flex-wrap gap-y-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mr-1">Select Month:</span>
              <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl p-1 shadow-xs">
                <button
                  onClick={() => handleMonthStep(-1)}
                  title="Previous Month"
                  className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-600 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-transparent text-sm font-bold text-gray-800 px-2 py-0.5 focus:outline-none cursor-pointer"
                />
                <button
                  onClick={() => handleMonthStep(1)}
                  title="Next Month"
                  className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-600 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Quick Month Chips */}
              <div className="flex items-center space-x-1.5 ml-0 sm:ml-2">
                <button
                  onClick={() => {
                    const now = new Date();
                    setSelectedMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
                  }}
                  className="text-xs bg-gray-100 hover:bg-emerald-50 hover:text-emerald-700 px-2.5 py-1.5 rounded-lg font-medium text-gray-600 transition-colors"
                >
                  This Month
                </button>
                <button
                  onClick={() => {
                    const now = new Date();
                    now.setMonth(now.getMonth() - 1);
                    setSelectedMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
                  }}
                  className="text-xs bg-gray-100 hover:bg-emerald-50 hover:text-emerald-700 px-2.5 py-1.5 rounded-lg font-medium text-gray-600 transition-colors"
                >
                  Last Month
                </button>
              </div>
            </div>

            <div className="flex items-center space-x-3 self-end md:self-auto">
              <span className="text-xs text-gray-500 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100 flex items-center space-x-1.5 font-medium">
                <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                <span>{activeFilterInfo.details}</span>
              </span>
              <button
                onClick={handleResetFilter}
                className="text-xs font-semibold text-gray-500 hover:text-red-600 transition-colors flex items-center space-x-1"
                title="Reset to All Time"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            </div>
          </div>
        )}

        {/* Sub-Controls: Year Wise Mode */}
        {filterMode === 'year' && (
          <div className="pt-4 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="flex items-center space-x-2 flex-wrap gap-y-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mr-1">Select Year:</span>
              <div className="flex items-center space-x-1.5">
                {availableYearsList.map((y) => (
                  <button
                    key={y}
                    onClick={() => setSelectedYear(String(y))}
                    className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                      selectedYear === String(y)
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {y}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center space-x-3 self-end md:self-auto">
              <span className="text-xs text-gray-500 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100 flex items-center space-x-1.5 font-medium">
                <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                <span>{activeFilterInfo.details}</span>
              </span>
              <button
                onClick={handleResetFilter}
                className="text-xs font-semibold text-gray-500 hover:text-red-600 transition-colors flex items-center space-x-1"
                title="Reset to All Time"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            </div>
          </div>
        )}

        {/* Sub-Controls: Custom Range Mode */}
        {filterMode === 'custom' && (
          <div className="pt-4 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center space-x-1.5">
                  <span className="text-xs font-medium text-gray-600">From:</span>
                  <input
                    type="date"
                    value={customRangeStart}
                    onChange={(e) => setCustomRangeStart(e.target.value)}
                    className="text-xs sm:text-sm border border-gray-200 rounded-xl px-3 py-1.5 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="text-xs font-medium text-gray-600">To:</span>
                  <input
                    type="date"
                    value={customRangeEnd}
                    onChange={(e) => setCustomRangeEnd(e.target.value)}
                    className="text-xs sm:text-sm border border-gray-200 rounded-xl px-3 py-1.5 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <button
                  onClick={handleApplyCustom}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-semibold transition-colors shadow-xs"
                >
                  Apply Range
                </button>
              </div>

              {/* Quick Presets */}
              <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                <span className="text-xs text-gray-400 mr-1">Presets:</span>
                <button
                  onClick={() => handlePresetCustom(7)}
                  className="text-xs bg-gray-100 hover:bg-emerald-50 hover:text-emerald-700 px-2.5 py-1 rounded-lg font-medium text-gray-600 transition-colors"
                >
                  7 Days
                </button>
                <button
                  onClick={() => handlePresetCustom(30)}
                  className="text-xs bg-gray-100 hover:bg-emerald-50 hover:text-emerald-700 px-2.5 py-1 rounded-lg font-medium text-gray-600 transition-colors"
                >
                  30 Days
                </button>
                <button
                  onClick={() => handlePresetCustom(90)}
                  className="text-xs bg-gray-100 hover:bg-emerald-50 hover:text-emerald-700 px-2.5 py-1 rounded-lg font-medium text-gray-600 transition-colors"
                >
                  90 Days
                </button>
                <button
                  onClick={handleResetFilter}
                  className="text-xs text-gray-500 hover:text-red-600 font-semibold transition-colors ml-2 flex items-center space-x-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset</span>
                </button>
              </div>
            </div>
            {customRangeStart && customRangeEnd && (
              <p className="text-xs text-emerald-700 font-medium">
                Active Filter: {activeFilterInfo.details}
              </p>
            )}
          </div>
        )}

        {/* Sub-Controls: All Time Mode Note */}
        {filterMode === 'all' && (
          <div className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-gray-500 gap-2">
            <span>✨ Showing cumulative financial summary for all recorded sales and expenses.</span>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setFilterMode('month')}
                className="text-emerald-600 hover:underline font-semibold"
              >
                View by Month →
              </button>
              <span>•</span>
              <button
                onClick={() => setFilterMode('year')}
                className="text-emerald-600 hover:underline font-semibold"
              >
                View by Year →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Top Level Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Total Revenue"
          amount={totalOverallRevenue}
          icon={TrendingUp}
          colorClass="bg-white/20"
          gradientClass="bg-gradient-to-br from-emerald-500 to-teal-600"
          badgeText={activeFilterInfo.isFiltered ? activeFilterInfo.tag : null}
          loading={filterLoading}
        />
        <StatCard
          title="Total Expenses"
          amount={totalOverallExpenses}
          icon={TrendingDown}
          colorClass="bg-white/20"
          gradientClass="bg-gradient-to-br from-orange-400 to-red-500"
          badgeText={activeFilterInfo.isFiltered ? activeFilterInfo.tag : null}
          loading={filterLoading}
        />
        <StatCard
          title="Net Profit"
          amount={totalOverallProfit}
          icon={IndianRupee}
          colorClass="bg-white/20"
          gradientClass={totalOverallProfit >= 0 ? "bg-gradient-to-br from-blue-500 to-indigo-600" : "bg-gradient-to-br from-rose-600 to-red-700"}
          badgeText={activeFilterInfo.isFiltered ? activeFilterInfo.tag : null}
          loading={filterLoading}
        />
      </div>

      {/* Own Farm Crop Feed Savings Highlight */}
      {data?.totalFeedSavings > 0 && (
        <div className="bg-gradient-to-r from-amber-500/10 via-emerald-500/10 to-teal-500/10 border border-emerald-200/80 rounded-2xl sm:rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in duration-300">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
              <Sparkles size={24} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="font-bold text-gray-900 text-base sm:text-lg">
                  Own Crop Feed Savings: <span className="text-emerald-700">₹{Number(data.totalFeedSavings).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </h4>
                <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border border-amber-200">
                  Cost Saved
                </span>
              </div>
              <p className="text-xs sm:text-sm text-gray-600 mt-0.5">
                You fed your cattle & livestock farm-grown crops across {data.totalCropUsageLogs || 0} feeding events instead of purchasing commercial feed.
              </p>
            </div>
          </div>
          <Link
            to="/inventory"
            className="inline-flex items-center space-x-1.5 text-xs sm:text-sm font-bold text-emerald-700 hover:text-emerald-800 bg-white hover:bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-200 shadow-xs transition-colors flex-shrink-0"
          >
            <Sprout size={15} />
            <span>View Feeding Logs</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-10 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Breakdown by Category</h2>
          {activeFilterInfo.isFiltered && (
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
              Reflecting performance for <strong className="text-emerald-700 font-semibold">{activeFilterInfo.tag}</strong> ({activeFilterInfo.details})
            </p>
          )}
        </div>
        {activeFilterInfo.isFiltered && (
          <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold px-3 py-1 rounded-full w-fit">
            Filtered View
          </span>
        )}
      </div>

      {/* Breakdown Cards */}
      {livestockTypes.length === 0 ? (
        <div className="bg-gray-50 rounded-3xl p-12 text-center border border-dashed border-gray-200 mt-6">
          <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No items found</h3>
          <p className="text-gray-500 mb-6">You haven't added any items to your inventory yet.</p>
          <Link
            to="/inventory"
            className="inline-flex items-center space-x-2 bg-emerald-500 text-white px-6 py-2.5 rounded-lg hover:bg-emerald-600 transition-colors font-medium"
          >
            <Plus size={20} />
            <span>Add Item</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {livestockTypes.map((type) => {
            const stats = summary[type];
            return (
              <div key={type} className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-300">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="bg-emerald-50 p-3 rounded-xl">
                    <Package className="w-6 h-6 text-emerald-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">{type}s</h3>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 rounded-xl bg-emerald-50/50 border border-emerald-100">
                    <span className="text-emerald-700 text-sm font-bold">Total Head Count</span>
                    <span className="text-emerald-900 font-bold text-lg">{stats.totalCount}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-xl bg-gray-50/50 border border-gray-100">
                    <span className="text-gray-500 text-sm font-medium">Revenue</span>
                    <span className="text-gray-900 font-semibold">₹{stats.totalRevenue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-xl bg-gray-50/50 border border-gray-100">
                    <span className="text-gray-500 text-sm font-medium">Expenses</span>
                    <span className="text-gray-900 font-semibold">₹{stats.totalExpenses.toLocaleString()}</span>
                  </div>
                  <div className={`flex justify-between items-center p-3 rounded-xl border ${stats.netProfit >= 0 ? 'bg-emerald-50/50 border-emerald-100' : 'bg-red-50/50 border-red-100'}`}>
                    <span className={`text-sm font-bold ${stats.netProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>Profit</span>
                    <span className={`font-bold ${stats.netProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                      ₹{stats.netProfit.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && createPortal(
        <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">Download Report</h3>
              <button onClick={() => setShowReportModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Time Range</label>
                <select
                  value={reportRange}
                  onChange={(e) => setReportRange(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="weekly">Past Week</option>
                  <option value="monthly">Past Month</option>
                  <option value="3months">Past 3 Months</option>
                  <option value="6months">Past 6 Months</option>
                  <option value="1year">Past 1 Year</option>
                  <option value="custom">Custom Date Range</option>
                </select>
              </div>

              {livestockTypes.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Include Categories</label>
                  <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto p-2 border border-gray-200 rounded-xl bg-gray-50/50">
                    {livestockTypes.map(type => (
                      <label key={type} className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedCategories.includes(type)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedCategories([...selectedCategories, type]);
                            } else {
                              setSelectedCategories(selectedCategories.filter(c => c !== type));
                            }
                          }}
                          className="rounded text-blue-500 focus:ring-blue-500 w-4 h-4"
                        />
                        <span className="text-sm text-gray-700 truncate">{type}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {reportRange === 'custom' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={customStart}
                      onChange={(e) => setCustomStart(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                    <input
                      type="date"
                      value={customEnd}
                      onChange={(e) => setCustomEnd(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>
              )}

              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex items-center space-x-2 text-xs text-emerald-800">
                <Mail size={16} className="text-emerald-600 flex-shrink-0" />
                <span>Monthly reports are sent to your registered email from <strong>noreply@farmtracker.com</strong> with the PDF attached.</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <button
                  onClick={generatePDF}
                  disabled={generatingPDF || emailingPDF || (reportRange === 'custom' && (!customStart || !customEnd)) || selectedCategories.length === 0}
                  className="py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-medium transition-all flex items-center justify-center disabled:opacity-70 text-sm"
                >
                  {generatingPDF ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-gray-700 mr-2"></div>
                  ) : (
                    <Download size={18} className="mr-2" />
                  )}
                  <span>{generatingPDF ? 'Generating...' : 'Download PDF'}</span>
                </button>

                <button
                  onClick={handleEmailPDF}
                  disabled={generatingPDF || emailingPDF || (reportRange === 'custom' && (!customStart || !customEnd)) || selectedCategories.length === 0}
                  className="py-3 px-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl font-medium shadow-md transition-all flex items-center justify-center disabled:opacity-70 text-sm"
                >
                  {emailingPDF ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                  ) : (
                    <Mail size={18} className="mr-2" />
                  )}
                  <span>{emailingPDF ? 'Sending Email...' : 'Email Report (No-Reply)'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default Home;
