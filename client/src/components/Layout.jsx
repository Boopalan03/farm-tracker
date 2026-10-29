import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, LayoutDashboard, Package, IndianRupee, Activity, User, Settings, LogOut, Menu, X, Wrench } from 'lucide-react';
import ClickSpark from './ClickSpark';

const Layout = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsSettingsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const [bgIndex, setBgIndex] = useState(0);
  const backgroundImages = [
    '/images/bg1.jpg',
    '/images/bg2.png',
    '/images/bg3.jpg',
    '/images/bg4.png'
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setBgIndex((prev) => (prev + 1) % backgroundImages.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const navItems = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Inventory', path: '/inventory', icon: Package },
    { name: 'Expenses', path: '/expenses', icon: IndianRupee },
    { name: 'Sales', path: '/sales', icon: Activity },
    { name: 'Maintenance', path: '/maintenance', icon: Wrench },
  ];

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Background Slider */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        {backgroundImages.map((img, index) => (
          <div
            key={img}
            className={`absolute inset-0 z-0 transition-opacity duration-1000 ease-in-out ${
              index === bgIndex ? 'opacity-100' : 'opacity-0'
            }`}
            style={{
              backgroundImage: `url(${img})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
        ))}
        {/* Light overlay to ensure the dashboard content remains perfectly readable */}
        <div className="absolute inset-0 bg-gray-50/85 z-10" />
      </div>

      <div className="relative z-10 flex flex-col flex-1 min-h-screen w-full min-w-0 overflow-x-hidden">
        {/* Top Navbar */}
        <header className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-40 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl md:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-500 to-teal-600">
                FarmTracker
              </h1>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-1 lg:space-x-4">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200 ${
                      isActive 
                        ? 'bg-emerald-50 text-emerald-600 font-medium' 
                        : 'text-gray-500 hover:bg-gray-50 hover:text-emerald-500'
                    }`}
                  >
                    <Icon size={18} className={isActive ? 'text-emerald-500' : 'text-gray-400'} />
                    <span className="hidden lg:block">{item.name}</span>
                  </Link>
                );
              })}
              
              {/* Settings Dropdown */}
              <div className="relative ml-2" ref={dropdownRef}>
                <button 
                  onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200 ${
                    isSettingsOpen 
                      ? 'bg-emerald-50 text-emerald-600 font-medium' 
                      : 'text-gray-500 hover:bg-gray-50 hover:text-emerald-500'
                  }`}
                >
                  <Settings size={18} className={isSettingsOpen ? 'text-emerald-500' : 'text-gray-400'} />
                  <span className="hidden lg:block">Settings</span>
                </button>

                {isSettingsOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg py-1 border border-gray-100 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <Link
                      to="/profile"
                      onClick={() => setIsSettingsOpen(false)}
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
                    >
                      <User size={16} className="mr-2" /> Profile
                    </Link>
                    <Link
                      to="/settings"
                      onClick={() => setIsSettingsOpen(false)}
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
                    >
                      <Settings size={16} className="mr-2" /> App Settings
                    </Link>
                    <button
                      onClick={() => {
                        setIsSettingsOpen(false);
                        handleLogout();
                      }}
                      className="flex w-full items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors text-left"
                    >
                      <LogOut size={16} className="mr-2" /> Logout
                    </button>
                  </div>
                )}
              </div>
            </nav>

            {/* Mobile menu button */}
            <div className="flex items-center md:hidden">
              <button 
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
                className="text-gray-600 hover:text-emerald-600 transition"
              >
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>
        
        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white shadow-lg absolute w-full z-40">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 shadow-xl">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center space-x-3 px-3 py-3 rounded-lg transition-all duration-200 ${
                      isActive 
                        ? 'bg-emerald-50 text-emerald-600 font-medium' 
                        : 'text-gray-500 hover:bg-gray-50 hover:text-emerald-500'
                    }`}
                  >
                    <Icon size={20} className={isActive ? 'text-emerald-500' : 'text-gray-400'} />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
              
              {/* Mobile Settings Section */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Settings</p>
                <Link
                  to="/profile"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center space-x-3 px-3 py-3 rounded-lg text-gray-500 hover:bg-gray-50 hover:text-emerald-500 transition-all duration-200"
                >
                  <User size={20} className="text-gray-400" />
                  <span>Profile</span>
                </Link>
                <Link
                  to="/settings"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center space-x-3 px-3 py-3 rounded-lg text-gray-500 hover:bg-gray-50 hover:text-emerald-500 transition-all duration-200"
                >
                  <Settings size={20} className="text-gray-400" />
                  <span>App Settings</span>
                </Link>
                <button 
                  onClick={handleLogout}
                  className="flex items-center space-x-3 px-3 py-3 w-full text-left rounded-lg text-red-500 hover:bg-red-50 transition-colors duration-200"
                >
                  <LogOut size={20} />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <ClickSpark sparkColor="#10b981" sparkSize={10} sparkRadius={20} sparkCount={10} duration={500} className="flex-1 flex flex-col w-full min-w-0">
        <main className="flex-1 p-3 sm:p-4 md:p-6 lg:p-8 w-full max-w-7xl mx-auto min-w-0">
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Outlet />
          </div>
        </main>
      </ClickSpark>
      </div>
    </div>
  );
};

export default Layout;
