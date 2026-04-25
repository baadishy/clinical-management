/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  History as HistoryIcon, 
  Settings as SettingsIcon, 
  PlusCircle, 
  CheckCircle2, 
  TrendingUp,
  LayoutDashboard,
  Calendar,
  X,
  Trash2,
  AlertTriangle,
  Download
} from 'lucide-react';

// Register Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(err => console.log('SW registration failed:', err));
  });
}
import { 
  ClinicType, 
  ServiceType, 
  PatientRecord, 
  AppSettings,
  DailyRecord
} from './types';
import { 
  CLINICS, 
  SERVICES 
} from './constants';
import { 
  getSettings, 
  saveSettings, 
  getCurrentDayPatients, 
  saveCurrentDayPatients,
  getHistory,
  saveToHistory,
  saveHistory,
  clearCurrentDayPatients
} from './utils/storage';
import { 
  RevenueChart, 
  ServiceDistributionChart, 
  MonthlyComparisonChart,
  ClinicComparisonChart
} from './components/Charts';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';

type View = 'dashboard' | 'history' | 'settings';

export default function App() {
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [settings, setSettings] = useState<AppSettings>(getSettings());
  const [history, setHistory] = useState<DailyRecord[]>(getHistory());
  const [selectedClinic, setSelectedClinic] = useState<ClinicType>('MINIA');
  const [showEndDayModal, setShowEndDayModal] = useState(false);
  const [tithe, setTithe] = useState<number>(0);
  const [serviceCounts, setServiceCounts] = useState<Record<ServiceType, number>>({
    CHECKUP: 0,
    FOLLOWUP: 0,
    IUD_INSERTION: 0,
    IUD_REMOVAL: 0,
    CAPSULE_REMOVAL: 0,
    PREGNANCY_TEST: 0,
  });
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [confirmation, setConfirmation] = useState<{ message: string; onConfirm: () => void } | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);

  // Handle PWA Install prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstallBtn(false);
    }
    setDeferredPrompt(null);
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const confirmAction = (message: string, onConfirm: () => void) => {
    setConfirmation({ message, onConfirm });
  };

  // Load initial data
  useEffect(() => {
    setPatients(getCurrentDayPatients());
    setHistory(getHistory());
  }, []);

  // Persist patients on change
  useEffect(() => {
    saveCurrentDayPatients(patients);
  }, [patients]);

  const addPatient = (service: ServiceType) => {
    confirmAction(`هل أنت متأكد من إضافة مريضة لخدمة ${SERVICES[service]}؟`, () => {
      const newPatient: PatientRecord = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        clinic: selectedClinic,
        service,
        price: settings.prices[selectedClinic][service],
      };
      setPatients([...patients, newPatient]);
      showToast('تم إضافة المريضة بنجاح');
    });
  };

  const addBatchPatients = () => {
    const newPatients: PatientRecord[] = [];
    Object.entries(serviceCounts).forEach(([service, count]) => {
      if (count > 0) {
        for (let i = 0; i < count; i++) {
          newPatients.push({
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            clinic: selectedClinic,
            service: service as ServiceType,
            price: settings.prices[selectedClinic][service as ServiceType],
          });
        }
      }
    });

    if (newPatients.length === 0) {
      showToast('يرجى تحديد عدد المريضات أولاً', 'error');
      return;
    }

    confirmAction(`هل أنت متأكد من إضافة ${newPatients.length} مريضة للعيادة؟`, () => {
      setPatients([...patients, ...newPatients]);
      setServiceCounts({
        CHECKUP: 0,
        FOLLOWUP: 0,
        IUD_INSERTION: 0,
        IUD_REMOVAL: 0,
        CAPSULE_REMOVAL: 0,
        PREGNANCY_TEST: 0,
      });
      showToast(`تم إضافة ${newPatients.length} مريضة بنجاح`);
    });
  };

  const deletePatient = (id: string) => {
    confirmAction('هل أنت متأكد من حذف هذه المريضة من قائمة اليوم؟', () => {
      setPatients(patients.filter(p => p.id !== id));
      showToast('تم حذف المريضة بنجاح');
    });
  };

  const dailyStats = useMemo(() => {
    const totalRevenue = patients.reduce((acc, p) => acc + p.price, 0);
    const count = patients.length;
    return { totalRevenue, count };
  }, [patients]);

  const [showSummaryScreen, setShowSummaryScreen] = useState<DailyRecord | null>(null);

  const handleEndDay = () => {
    confirmAction('هل أنت متأكد من إنهاء اليوم؟ سيتم ترحيل جميع البيانات إلى السجل التاريخي وتصفير قائمة اليوم.', () => {
      const today = new Date().toISOString().split('T')[0];
      
      const patientsByService: Record<ServiceType, number> = {} as any;
      const revenueByService: Record<ServiceType, number> = {} as any;
      const patientsByClinic: Record<ClinicType, number> = {} as any;
      const revenueByClinic: Record<ClinicType, number> = {} as any;
      
      Object.keys(SERVICES).forEach((key) => {
        const s = key as ServiceType;
        const servicePatients = patients.filter(p => p.service === s);
        patientsByService[s] = servicePatients.length;
        revenueByService[s] = servicePatients.reduce((acc, p) => acc + p.price, 0);
      });

      Object.keys(CLINICS).forEach((key) => {
        const c = key as ClinicType;
        const clinicPatients = patients.filter(p => p.clinic === c);
        patientsByClinic[c] = clinicPatients.length;
        revenueByClinic[c] = clinicPatients.reduce((acc, p) => acc + p.price, 0);
      });

      const totalGrossRevenue = patients.reduce((acc, p) => acc + p.price, 0);

      const record: DailyRecord = {
        id: crypto.randomUUID(),
        date: today,
        clinic: 'BOTH',
        totalPatients: patients.length,
        patientsByService,
        revenueByService,
        patientsByClinic,
        revenueByClinic,
        allPatients: [...patients],
        totalGrossRevenue,
        tithe,
        totalNetRevenue: totalGrossRevenue - tithe,
        isLocked: true
      };

      saveToHistory(record);
      const updatedHistory = getHistory();
      setHistory(updatedHistory);
      clearCurrentDayPatients();
      setPatients([]);
      setTithe(0);
      setShowEndDayModal(false);
      setShowSummaryScreen(record);
      showToast('تم إنهاء اليوم وحفظ البيانات بنجاح');
    });
  };

  const deleteRecord = (id: string, onSuccess?: () => void) => {
    confirmAction('هل أنت متأكد من حذف هذا السجل نهائياً؟ لا يمكن التراجع عن هذا الإجراء.', () => {
      const updatedHistory = history.filter(r => r.id !== id);
      setHistory(updatedHistory);
      saveHistory(updatedHistory);
      if (onSuccess) onSuccess();
      showToast('تم حذف السجل بنجاح');
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100 leading-relaxed" dir="rtl">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 px-4 py-3 md:py-4 md:px-8 shadow-sm shadow-slate-200/50">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
              <TrendingUp size={20} className="md:w-6 md:h-6" />
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-bold tracking-tight text-slate-900">نظام إدارة العيادات</h1>
              <p className="text-[10px] md:text-xs text-slate-500 font-semibold uppercase tracking-wider hidden sm:block">Clinic Management Dashboard</p>
            </div>
          </div>

          <nav className="hidden md:flex gap-2 bg-slate-100 p-1.5 rounded-2xl">
            <NavButton 
              active={activeView === 'dashboard'} 
              onClick={() => setActiveView('dashboard')}
              icon={<LayoutDashboard size={18} />}
              label="الرئيسية"
            />
            <NavButton 
              active={activeView === 'history'} 
              onClick={() => setActiveView('history')}
              icon={<HistoryIcon size={18} />}
              label="السجل"
            />
            <NavButton 
              active={activeView === 'settings'} 
              onClick={() => setActiveView('settings')}
              icon={<SettingsIcon size={18} />}
              label="الإعدادات"
            />
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-8 pb-32 md:pb-20">
        <AnimatePresence mode="wait">
          {showSummaryScreen && (
            <PostDaySummary 
              record={showSummaryScreen} 
              history={history} 
              onClose={() => {
                setShowSummaryScreen(null);
                setActiveView('history');
              }} 
            />
          )}

          {activeView === 'dashboard' && !showSummaryScreen && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {showInstallBtn && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleInstallClick}
                    className="md:col-span-1 bg-indigo-600 rounded-2xl p-6 shadow-lg shadow-indigo-200 cursor-pointer flex flex-col justify-between group overflow-hidden relative"
                  >
                    <div className="absolute -right-4 -top-4 text-white/10 group-hover:rotate-12 transition-transform">
                      <Download size={100} />
                    </div>
                    <div className="relative z-10">
                      <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-white mb-3">
                        <Download size={20} />
                      </div>
                      <h3 className="text-white font-black text-lg">تثبيت التطبيق</h3>
                      <p className="text-indigo-100 text-xs font-bold mt-1">اضغط للتثبيت على هاتفك</p>
                    </div>
                    <div className="relative z-10 w-fit mt-4 px-4 py-2 bg-white text-indigo-600 text-xs font-black rounded-lg group-hover:bg-indigo-50 transition-colors">
                      تثبيت الآن
                    </div>
                  </motion.div>
                )}
                <StatCard 
                  label="إجمالي إيرادات اليوم" 
                  value={`${dailyStats.totalRevenue} ج.م`} 
                  subLabel="Gross revenue today"
                  icon={<TrendingUp className="text-emerald-600" />}
                  color="emerald"
                />
                <StatCard 
                  label="عدد المريضات" 
                  value={dailyStats.count.toString()} 
                  subLabel="Patients count"
                  icon={<Users className="text-indigo-600" />}
                  color="indigo"
                />
                <div className={`bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center ${showInstallBtn ? 'md:col-span-1' : ''}`}>
                  <button 
                    onClick={() => setShowEndDayModal(true)}
                    disabled={patients.length === 0}
                    className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-slate-900/10 active:scale-[0.98]"
                  >
                    <CheckCircle2 size={20} />
                    إنهاء وحفظ اليوم
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left: Add Patient */}
                <section className="space-y-6">
                  <div className="flex items-center justify-between border-r-4 border-indigo-600 pr-3">
                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                       إضافة مريضة جديدة
                    </h2>
                  </div>

                  <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-8">
                    {/* Clinic Selection */}
                    <div>
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">اختر العيادة</p>
                      <div className="grid grid-cols-2 gap-4">
                        {Object.entries(CLINICS).map(([key, config]) => (
                          <button
                            key={key}
                            onClick={() => setSelectedClinic(key as ClinicType)}
                            className={`p-5 rounded-2xl border transition-all flex flex-col gap-3 items-start text-right relative overflow-hidden ${
                              selectedClinic === key 
                                ? 'border-indigo-600 bg-indigo-50 shadow-md shadow-indigo-100' 
                                : 'border-slate-100 hover:border-slate-200 bg-white'
                            }`}
                          >
                            <div 
                              className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold"
                              style={{ backgroundColor: `${config.color}15`, color: config.color }}
                            >
                              {config.initial}
                            </div>
                            <div>
                              <p className={`font-bold text-sm ${selectedClinic === key ? 'text-indigo-700' : 'text-slate-700'}`}>
                                {config.label}
                              </p>
                              <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">{config.subLabel}</p>
                            </div>
                            {selectedClinic === key && (
                               <div className="absolute top-3 left-3 text-indigo-600">
                                 <CheckCircle2 size={20} />
                               </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Service Selection */}
                    <div>
                      <div className="flex justify-between items-center mb-6">
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">أدخل عدد المريضات لكل خدمة</p>
                        {Object.values(serviceCounts).some(c => c > 0) && (
                          <button 
                            onClick={() => setServiceCounts({
                              CHECKUP: 0, FOLLOWUP: 0, IUD_INSERTION: 0, IUD_REMOVAL: 0, CAPSULE_REMOVAL: 0, PREGNANCY_TEST: 0
                            })}
                            className="text-[10px] font-black text-red-500 hover:underline"
                          >
                            تصفير الكل
                          </button>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {Object.entries(SERVICES).map(([key, label]) => (
                          <div
                            key={key}
                            className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-4 ${
                              serviceCounts[key as ServiceType] > 0 
                                ? 'bg-indigo-50 border-indigo-200' 
                                : 'bg-slate-50 border-slate-100'
                            }`}
                          >
                            <div className="flex-1">
                              <p className="text-sm font-black text-slate-700">{label}</p>
                              <p className="text-[10px] text-slate-400 font-bold tracking-widest">{settings.prices[selectedClinic][key as ServiceType]} EGP</p>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={() => setServiceCounts(prev => ({...prev, [key]: Math.max(0, Number(prev[key as ServiceType]) - 1)}))}
                                className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-600 transition-all font-black"
                              >
                                -
                              </button>
                              <input 
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={serviceCounts[key as ServiceType] === 0 ? '' : serviceCounts[key as ServiceType]}
                                onChange={(e) => {
                                  const val = e.target.value.replace(/\D/g, '');
                                  setServiceCounts(prev => ({...prev, [key]: val === '' ? 0 : parseInt(val)}));
                                }}
                                onFocus={(e) => e.target.select()}
                                className="w-12 bg-transparent text-center font-black text-lg focus:outline-none"
                                placeholder="0"
                              />
                              <button 
                                onClick={() => setServiceCounts(prev => ({...prev, [key]: Number(prev[key as ServiceType]) + 1}))}
                                className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-600 transition-all font-black"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      <button 
                        onClick={addBatchPatients}
                        disabled={!Object.values(serviceCounts).some(c => c > 0)}
                        className="w-full mt-8 py-5 bg-indigo-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-[0.98] disabled:opacity-50 disabled:grayscale disabled:shadow-none flex items-center justify-center gap-3"
                      >
                        <PlusCircle size={24} />
                        إضافة المريضات المحددة
                      </button>
                      <p className="text-center text-[10px] text-slate-400 font-bold mt-4">
                        سيتم إضافة المريضات لـ <span className="text-indigo-600 underline">{CLINICS[selectedClinic].label}</span> بناءً على الأعداد المدخلة أعلاه
                      </p>
                    </div>
                  </div>
                </section>

                {/* Right: Daily List */}
                <section className="space-y-6">
                  <div className="flex items-center justify-between border-r-4 border-[#378ADD] pr-3">
                    <h2 className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
                      مرضى اليوم ({patients.length})
                    </h2>
                    {patients.length > 0 && (
                      <button 
                        onClick={() => {
                          confirmAction("هل أنتِ متأكدة من مسح جميع بيانات اليوم؟ لا يمكن استرجاع هذه البيانات بعد الحذف.", () => {
                            setPatients([]);
                            showToast('تم مسح قائمة اليوم بالكامل');
                          });
                        }}
                        className="text-xs text-red-500 font-bold hover:underline bg-red-50 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors"
                      >
                        إفراغ القائمة
                      </button>
                    )}
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[460px] flex flex-col">
                    <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">المعاملات الأخيرة</span>
                      <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] font-bold rounded-full">{patients.length} مرضى</span>
                    </div>
                    {patients.length === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-slate-300 space-y-4">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
                          <Users size={32} />
                        </div>
                        <div>
                          <p className="font-bold text-slate-400 italic">لا معاملات اليوم</p>
                        </div>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
                        {[...patients].reverse().map((p) => (
                          <motion.div 
                            layout
                            key={p.id} 
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="p-5 flex items-center justify-between hover:bg-slate-50 transition-colors group"
                          >
                            <div className="flex items-center gap-4">
                              <div 
                                className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs italic"
                                style={{ backgroundColor: `${CLINICS[p.clinic].color}15`, color: CLINICS[p.clinic].color }}
                              >
                                {CLINICS[p.clinic].initial}
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-slate-900">{SERVICES[p.service]}</p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                  {CLINICS[p.clinic].label} • {new Date(p.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-6">
                              <p className="text-sm font-bold text-slate-900">+{p.price}</p>
                              <button 
                                onClick={() => deletePatient(p.id)}
                                className="w-8 h-8 rounded-lg bg-slate-100 text-slate-400 md:opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center hover:bg-red-50 hover:text-red-600"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                </section>
              </div>
            </motion.div>
          )}

          {activeView === 'history' && (
            <HistoryView history={history} onDelete={deleteRecord} confirmAction={confirmAction} showToast={showToast} />
          )}

          {activeView === 'settings' && (
            <SettingsView settings={settings} onSave={setSettings} confirmAction={confirmAction} showToast={showToast} />
          )}
        </AnimatePresence>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 px-6 py-3 flex justify-around md:hidden backdrop-blur-lg bg-white/90">
        <MobileNavButton 
          active={activeView === 'dashboard'} 
          onClick={() => setActiveView('dashboard')}
          icon={<LayoutDashboard size={22} />}
          label="الرئيسية"
        />
        <MobileNavButton 
          active={activeView === 'history'} 
          onClick={() => setActiveView('history')}
          icon={<HistoryIcon size={22} />}
          label="السجل"
        />
        <MobileNavButton 
          active={activeView === 'settings'} 
          onClick={() => setActiveView('settings')}
          icon={<SettingsIcon size={22} />}
          label="الإعدادات"
        />
      </nav>

      {/* End Day Modal */}
      <AnimatePresence>
        {showEndDayModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowEndDayModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative bg-white w-full max-w-lg rounded-[2rem] p-6 md:p-10 shadow-2xl space-y-6 md:space-y-8"
            >
              <div className="text-center space-y-2 md:space-y-3">
                <div className="w-16 h-16 md:w-20 md:h-20 bg-[#FEE2E2] rounded-3xl flex items-center justify-center mx-auto text-[#EF4444] rotate-3 shadow-lg shadow-red-500/10">
                  <TrendingUp size={30} className="md:w-9 md:h-9" />
                </div>
                <h2 className="text-xl md:text-2xl font-black text-[#0F172A]">ملخص إيرادات اليوم</h2>
                <p className="text-slate-500 text-xs md:text-sm font-medium">مراجعة وتأكيد البيانات قبل الإغلاق النهائي</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">إجمالي الإيرادات</p>
                  <p className="text-2xl font-black text-[#1D9E75]">{dailyStats.totalRevenue} ج.م</p>
                </div>
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">عدد المريضات</p>
                  <p className="text-2xl font-black text-[#378ADD]">{dailyStats.count}</p>
                </div>
              </div>

              <div className="space-y-4">
                <label className="block text-sm font-black text-[#0F172A]">
                  قيمة العشور المستقطعة (ج.م):
                </label>
                <input 
                  type="number" 
                  value={tithe || ''}
                  onChange={(e) => setTithe(e.target.value === '' ? 0 : Number(e.target.value))}
                  onWheel={(e) => e.target instanceof HTMLInputElement && e.target.blur()}
                  onFocus={(e) => e.target.select()}
                  className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-[#1D9E75] focus:outline-none focus:bg-white transition-all text-2xl font-black text-center"
                  placeholder="0"
                />
              </div>

              <div className="bg-[#4f46e5]/5 p-6 rounded-2xl border border-[#4f46e5]/10 flex justify-between items-center ring-4 ring-[#4f46e5]/5">
                <p className="font-black text-slate-900">الصافي النهائي:</p>
                <p className="text-3xl font-black text-indigo-600">{dailyStats.totalRevenue - tithe} ج.م</p>
              </div>

              <div className="flex gap-4 pt-2">
                <button 
                  onClick={() => setShowEndDayModal(false)}
                  className="flex-1 py-4 bg-slate-50 text-slate-500 rounded-2xl font-black hover:bg-slate-100 transition-colors"
                >
                  تعديل
                </button>
                <button 
                  onClick={handleEndDay}
                  className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 transition-all hover:shadow-xl hover:shadow-indigo-600/20 active:scale-[0.98]"
                >
                  تأكيد وحفظ البيانات
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={`fixed bottom-24 left-1/2 -translate-x-1/2 px-6 py-3 rounded-2xl shadow-2xl z-[100] flex items-center gap-3 border ${
              toast.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-red-50 border-red-100 text-red-700'
            }`}
          >
            <CheckCircle2 size={20} />
            <span className="font-bold">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmation && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setConfirmation(null)}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl space-y-6 text-center"
            >
              <div className="w-20 h-20 bg-amber-50 rounded-3xl flex items-center justify-center mx-auto text-amber-500">
                <AlertTriangle size={40} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black text-slate-900">تأكيد الإجراء</h3>
                <p className="text-slate-500 font-medium">{confirmation.message}</p>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    confirmation.onConfirm();
                    setConfirmation(null);
                  }}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl shadow-lg shadow-indigo-600/20 transition-all active:scale-95"
                >
                  تأكيد
                </button>
                <button
                  onClick={() => setConfirmation(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black py-4 rounded-2xl transition-all"
                >
                  إلغاء
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all font-black text-sm ${
        active 
          ? 'bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200' 
          : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/50'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function MobileNavButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 transition-all ${
        active ? 'text-indigo-600' : 'text-slate-400'
      }`}
    >
      <div className={`p-2 rounded-xl transition-all ${active ? 'bg-indigo-50' : ''}`}>
        {icon}
      </div>
      <span className="text-[10px] font-bold">{label}</span>
    </button>
  );
}

function StatCard({ label, value, subLabel, icon, color }: { label: string; value: string; subLabel: string; icon: React.ReactNode; color: 'emerald' | 'indigo' }) {
  const colorClass = color === 'emerald' ? 'border-b-emerald-500' : 'border-b-indigo-500';
  return (
    <div className={`bg-white p-6 rounded-2xl border border-slate-200 shadow-sm border-b-4 ${colorClass} space-y-4 hover:shadow-md transition-shadow`}>
      <div className="flex justify-between items-start">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
        <div className="p-2 rounded-lg bg-slate-50">
          {icon}
        </div>
      </div>
      <div>
        <h3 className="text-3xl font-black text-slate-900">{value}</h3>
        <p className="text-xs text-slate-400 font-bold mt-1 tracking-tight">{subLabel}</p>
      </div>
    </div>
  );
}

function SettingsView({ 
  settings, 
  onSave, 
  confirmAction, 
  showToast 
}: { 
  settings: AppSettings; 
  onSave: (s: AppSettings) => void;
  confirmAction: (message: string, onConfirm: () => void) => void;
  showToast: (message: string, type?: 'success' | 'error') => void;
}) {
  const [localPrices, setLocalPrices] = useState(settings.prices);
  const [activeClinic, setActiveClinic] = useState<ClinicType>('MINIA');

  const save = () => {
    const updated = { prices: localPrices };
    confirmAction('هل أنت متأكد من حفظ التغييرات في أسعار الخدمات لكلا العيادتين؟', () => {
      onSave(updated);
      saveSettings(updated);
      showToast('تم حفظ لوائح الأسعار بنجاح');
    });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-8 max-w-2xl mx-auto"
    >
      <div className="space-y-2 border-r-4 border-indigo-600 pr-4">
        <h2 className="text-2xl font-black text-slate-900">إعدادات العيادة</h2>
        <p className="text-slate-500 font-medium">تحكمي في أسعار الخدمات لكل عيادة بشكل مستقل</p>
      </div>

      <div className="flex bg-slate-100 p-1.5 rounded-2xl">
        {Object.entries(CLINICS).map(([key, config]) => (
          <button 
            key={key}
            onClick={() => setActiveClinic(key as ClinicType)}
            className={`flex-1 py-3 px-4 rounded-xl font-black text-sm transition-all flex items-center justify-center gap-2 ${activeClinic === key ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
          >
            <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px]" style={{ backgroundColor: `${config.color}15`, color: config.color }}>
              {config.initial}
            </div>
            {config.label}
          </button>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="p-8 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
           <h3 className="font-black flex items-center gap-3 text-slate-700">
            <SettingsIcon size={22} className="text-indigo-600" />
            أسعار {CLINICS[activeClinic].label} (ج.م)
           </h3>
           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{CLINICS[activeClinic].subLabel}</span>
        </div>
        <div className="p-8 space-y-6">
          {Object.entries(SERVICES).map(([key, label]) => (
            <div key={key} className="flex items-center gap-6 group">
              <label className="flex-1 font-black text-sm text-slate-600">{label}</label>
              <input 
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={localPrices[activeClinic][key as ServiceType] === 0 ? '' : localPrices[activeClinic][key as ServiceType]}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  const numVal = val === '' ? 0 : Number(val);
                  setLocalPrices({
                    ...localPrices,
                    [activeClinic]: {
                      ...localPrices[activeClinic],
                      [key]: numVal
                    }
                  });
                }}
                onFocus={(e) => e.target.select()}
                className="w-40 p-4 bg-slate-50 border-2 border-transparent group-hover:border-slate-100 focus:bg-white focus:border-indigo-600 focus:outline-none rounded-2xl text-center font-black transition-all text-xl"
                placeholder="0"
              />
            </div>
          ))}
        </div>
        <div className="p-8 bg-slate-50 flex justify-end">
          <button 
            onClick={save}
            className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-black hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10 active:scale-[0.98]"
          >
            حفظ جميع التغييرات
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function HistoryView({ 
  history, 
  onDelete, 
  confirmAction, 
  showToast 
}: { 
  history: DailyRecord[]; 
  onDelete: (id: string, onSuccess?: () => void) => void;
  confirmAction: (message: string, onConfirm: () => void) => void;
  showToast: (message: string, type?: 'success' | 'error') => void;
}) {
  const [selectedRecord, setSelectedRecord] = useState<DailyRecord | null>(null);
  const [activeTab, setActiveTab] = useState<'list' | 'analytics'>('list');

  const monthlyStats = useMemo(() => {
    if (history.length === 0) return null;
    const currentMonth = new Date().toISOString().substring(0, 7);
    const lastMonthDate = new Date();
    lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
    const lastMonth = lastMonthDate.toISOString().substring(0, 7);

    const calc = (month: string) => {
      const records = history.filter(h => h.date.startsWith(month));
      return {
        revenue: records.reduce((acc, r) => acc + r.totalNetRevenue, 0),
        patients: records.reduce((acc, r) => acc + r.totalPatients, 0)
      };
    };

    const current = calc(currentMonth);
    const previous = calc(lastMonth);

    const growth = previous.revenue > 0 
      ? ((current.revenue - previous.revenue) / previous.revenue) * 100 
      : 0;

    return { current, previous, growth };
  }, [history]);

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-8"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-200 pb-8">
        <div className="space-y-2 border-r-4 border-[#EF9F27] pr-4">
          <h2 className="text-2xl font-black text-[#0F172A]">الإحصائيات والسجل التاريخي</h2>
          <p className="text-slate-500 font-medium">تابعي نمو العيادة وحللي البيانات المالية بدقة</p>
        </div>

        <div className="flex bg-slate-100 p-1.5 rounded-2xl">
          <button 
            onClick={() => setActiveTab('list')}
            className={`px-8 py-3 rounded-xl font-black text-sm transition-all ${activeTab === 'list' ? 'bg-white text-indigo-600 shadow-lg shadow-indigo-500/5' : 'text-slate-500 hover:text-slate-700'}`}
          >
            سجل الأيام
          </button>
          <button 
            onClick={() => setActiveTab('analytics')}
            className={`px-8 py-3 rounded-xl font-black text-sm transition-all ${activeTab === 'analytics' ? 'bg-white text-emerald-600 shadow-lg shadow-emerald-500/5' : 'text-slate-500 hover:text-slate-700'}`}
          >
            التحليلات والمقارنات
          </button>
        </div>
      </div>

      {history.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-slate-100 rounded-[2.5rem] p-32 text-center space-y-6">
          <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-100">
            <HistoryIcon size={64} />
          </div>
          <div className="space-y-1">
            <p className="text-slate-400 font-black text-lg">لا يوجد تاريخ مسجل</p>
            <p className="text-sm text-slate-300">ابدئي بإنهاء يومك الأول لتظهر البيانات هنا</p>
          </div>
        </div>
      ) : activeTab === 'list' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-1 space-y-4 max-h-[700px] overflow-y-auto pr-3 scrollbar-thin scrollbar-thumb-slate-200">
             {history.sort((a, b) => b.date.localeCompare(a.date)).map((record) => (
                <button
                  key={record.id}
                  onClick={() => setSelectedRecord(record)}
                  className={`w-full p-6 border text-right rounded-3xl transition-all shadow-sm flex items-center justify-between group relative overflow-hidden ${
                    selectedRecord?.id === record.id 
                      ? 'bg-white border-indigo-600 ring-4 ring-indigo-500/5 shadow-xl shadow-indigo-500/5' 
                      : 'bg-white border-slate-100 hover:border-slate-200'
                  }`}
                >
                  <div className="space-y-2">
                    <p className="text-sm font-black text-slate-900">{new Date(record.date).toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                    <div className="flex gap-2">
                       <span className="text-[10px] bg-slate-50 px-2.5 py-1 rounded-lg text-slate-500 font-black">{record.totalPatients} مريضة</span>
                       <span className="text-[10px] bg-emerald-50 px-2.5 py-1 rounded-lg text-emerald-600 font-black">ج.م {record.totalNetRevenue}</span>
                    </div>
                  </div>
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center transition-all ${selectedRecord?.id === record.id ? 'bg-indigo-600 text-white rotate-12' : 'bg-slate-50 text-slate-300'}`}>
                    <Calendar size={20} />
                  </div>
                </button>
             ))}
          </div>

          <div className="lg:col-span-2">
             <AnimatePresence mode="wait">
               {selectedRecord ? (
                <motion.div 
                  key={selectedRecord.id}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="bg-white border border-slate-100 rounded-[2.5rem] p-5 md:p-10 shadow-sm space-y-8 md:space-y-10"
                >
                    <div className="flex justify-between items-start border-b border-slate-50 pb-6 md:pb-8">
                      <div>
                        <h3 className="text-xl md:text-2xl font-black text-[#0F172A]">{new Date(selectedRecord.date).toLocaleDateString('ar-EG', { dateStyle: 'full' })}</h3>
                        <p className="text-slate-400 font-bold text-[10px] md:text-sm mt-1 uppercase tracking-widest flex items-center gap-2">
                          <CheckCircle2 size={14} className="text-green-500" />
                          سجل رقم: #{selectedRecord.id.substring(0, 8)}
                        </p>
                      </div>
                      <button
                        onClick={() => onDelete(selectedRecord.id, () => setSelectedRecord(null))}
                        className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-all flex items-center gap-2 font-black text-xs"
                      >
                        <Trash2 size={16} />
                        حذف السجل
                      </button>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                      <SummaryItem label="إجمالي الدخل" value={`${selectedRecord.totalGrossRevenue} ج.م`} color="slate" />
                      <SummaryItem label="قيمة العشور" value={`${selectedRecord.tithe} ج.م`} color="red" />
                      <SummaryItem label="الصافي النهائي" value={`${selectedRecord.totalNetRevenue} ج.م`} color="green" />
                      <SummaryItem label="عدد المريضات" value={selectedRecord.totalPatients.toString()} color="blue" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">إيرادات العيادات</p>
                        <div className="space-y-2">
                          {Object.entries(CLINICS).map(([key, config]) => (
                            <div key={key} className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100">
                              <span className="text-sm font-bold text-slate-600">{config.label}</span>
                              <span className="font-black text-indigo-600">{selectedRecord.revenueByClinic?.[key as ClinicType] || 0} ج.م</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">توزيع المريضات</p>
                        <div className="space-y-2">
                          {Object.entries(CLINICS).map(([key, config]) => (
                            <div key={key} className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100">
                              <span className="text-sm font-bold text-slate-600">{config.label}</span>
                              <span className="font-black text-emerald-600">{selectedRecord.patientsByClinic?.[key as ClinicType] || 0} مريضة</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div className="space-y-6">
                      <h4 className="font-black text-sm text-slate-400 uppercase tracking-[0.2em] flex items-center gap-3">
                        <div className="w-2 h-2 bg-[#378ADD] rounded-full animate-pulse" />
                        توزيع الخدمات
                      </h4>
                      <div className="space-y-3">
                        {Object.entries(SERVICES).map(([key, label]) => {
                          const sType = key as ServiceType;
                          const count = selectedRecord.patientsByService[sType] || 0;
                          const revenue = selectedRecord.revenueByService[sType] || 0;
                          if (count === 0) return null;
                          return (
                            <div key={key} className="p-4 bg-slate-50 rounded-2xl flex justify-between items-center group hover:bg-slate-100 transition-all border border-transparent hover:border-slate-200">
                              <div>
                                <p className="text-xs font-black text-[#1E293B]">{label}</p>
                                <p className="text-[10px] text-slate-500 font-bold">{count} حالات مسجلة</p>
                              </div>
                              <span className="text-lg font-black text-[#1D9E75]">{revenue} <span className="text-[10px] opacity-60">ج.م</span></span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    
                    <div className="space-y-6">
                       <h4 className="font-black text-sm text-slate-400 uppercase tracking-[0.2em] flex items-center gap-3">
                        <div className="w-2 h-2 bg-[#EF9F27] rounded-full animate-pulse" />
                        التحليل البياني
                      </h4>
                      <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                        <div className="aspect-square max-w-[240px] mx-auto overflow-visible">
                           <ServiceDistributionChart record={selectedRecord} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {selectedRecord.allPatients && selectedRecord.allPatients.length > 0 && (
                    <div className="space-y-6 pt-6 border-t border-slate-100">
                       <h4 className="font-black text-sm text-slate-400 uppercase tracking-[0.2em] flex items-center gap-3">
                        <div className="w-2 h-2 bg-indigo-500 rounded-full" />
                        قائمة المريضات التفصيلية
                      </h4>
                      <div className="bg-slate-50 rounded-[2rem] overflow-hidden border border-slate-100">
                        <table className="w-full text-right text-sm">
                          <thead className="bg-slate-100 text-slate-500 uppercase tracking-widest text-[10px]">
                            <tr>
                              <th className="px-6 py-4 font-black">العيادة</th>
                              <th className="px-6 py-4 font-black">الخدمة</th>
                              <th className="px-6 py-4 font-black">الوقت</th>
                              <th className="px-6 py-4 font-black text-left">السعر</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {selectedRecord.allPatients.map((p, idx) => (
                              <tr key={p.id} className="hover:bg-white transition-colors">
                                <td className="px-6 py-4 font-bold text-slate-700">{CLINICS[p.clinic].label}</td>
                                <td className="px-6 py-4 font-black text-slate-900">{SERVICES[p.service]}</td>
                                <td className="px-6 py-4 text-slate-500">{new Date(p.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</td>
                                <td className="px-6 py-4 font-black text-indigo-600 text-left">{p.price} ج.م</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </motion.div>
               ) : (
                <div className="h-[500px] flex items-center justify-center border-2 border-dashed border-slate-100 rounded-[2.5rem] p-12 text-slate-300 bg-slate-50/30">
                  <div className="text-center space-y-4">
                    <HistoryIcon size={64} className="mx-auto opacity-10" />
                    <p className="font-black italic text-lg opacity-40">اختاري يوماً من القائمة لاستعراض التفاصيل المالية</p>
                  </div>
                </div>
               )}
             </AnimatePresence>
          </div>
        </div>
      ) : (
        /* Analytics View */
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-10"
        >
          {monthlyStats && (
            <div className="bg-white p-10 border border-slate-200 rounded-[2.5rem] shadow-sm space-y-10">
              <div className="flex justify-between items-start">
                <div className="space-y-2 border-r-4 border-[#D4537E] pr-5">
                  <h3 className="text-2xl font-black text-[#0F172A]">ملخص أداء الشهر الحالي</h3>
                  <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">إحصائيات {new Date().toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })}</p>
                </div>
                {monthlyStats.growth !== 0 && (
                  <div className={`px-6 py-3 rounded-2xl text-base font-black flex items-center gap-3 shadow-lg ${monthlyStats.growth > 0 ? 'bg-emerald-600 text-white shadow-emerald-500/20' : 'bg-slate-900 text-white shadow-slate-900/20'}`}>
                    <TrendingUp size={20} className={monthlyStats.growth < 0 ? 'rotate-180' : ''} />
                    {monthlyStats.growth > 0 ? '+' : ''}{monthlyStats.growth.toFixed(1)}% نمو
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-1 grid grid-cols-1 gap-4">
                  <div className="p-8 bg-[#F8FAFC] rounded-3xl space-y-3 border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">إجمالي صافي الربح</p>
                    <p className="text-4xl font-black text-[#1D9E75]">{monthlyStats.current.revenue} <span className="text-sm">ج.م</span></p>
                  </div>
                  <div className="p-8 bg-[#F8FAFC] rounded-3xl space-y-3 border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">إجمالي الحالات المعالجة</p>
                    <p className="text-4xl font-black text-[#378ADD]">{monthlyStats.current.patients}</p>
                  </div>
                </div>
                <div className="lg:col-span-2 p-8 bg-slate-50 border border-slate-100 rounded-[2rem]">
                   <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 border-b border-slate-200 pb-4">مقارنة الإيرادات الشهرية</h4>
                  <div className="h-[240px]">
                    <MonthlyComparisonChart history={history} />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div className="bg-white p-10 border border-slate-200 rounded-[2.5rem] shadow-sm space-y-10">
              <h3 className="text-xl font-black text-[#0F172A] border-r-4 border-[#1D9E75] pr-5">اتجاه الإيرادات (آخر 7 أيام)</h3>
              <div className="h-[360px]">
                <RevenueChart history={history} />
              </div>
            </div>

            <div className="bg-white p-10 border border-slate-200 rounded-[2.5rem] shadow-sm space-y-10">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-black text-[#0F172A] border-r-4 border-indigo-600 pr-5">مقارنة العيادات</h3>
                {history.length > 0 && (() => {
                  const stats = history.reduce((acc, r) => {
                    if (r.revenueByClinic) {
                      acc.MINIA += r.revenueByClinic.MINIA || 0;
                      acc.BENI_AHMED += r.revenueByClinic.BENI_AHMED || 0;
                    }
                    return acc;
                  }, { MINIA: 0, BENI_AHMED: 0 });
                  const better = stats.MINIA > stats.BENI_AHMED ? 'عيادة المنيا' : 'عيادة بني أحمد';
                  const diff = Math.abs(stats.MINIA - stats.BENI_AHMED);
                  return (
                    <div className="px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-xl text-xs font-black text-indigo-700">
                      الأفضل أداءً: {better} (بفرق {diff} ج.م)
                    </div>
                  );
                })()}
              </div>
              <div className="h-[360px]">
                <ClinicComparisonChart history={history} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="lg:col-span-1 bg-white p-10 border border-slate-200 rounded-[2.5rem] shadow-sm space-y-8 flex flex-col items-center justify-center text-center relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-[#1D9E75]/10 transition-colors" />
              <div className="w-24 h-24 bg-slate-50 rounded-[2rem] flex items-center justify-center text-slate-200 mb-6 group-hover:scale-110 transition-transform duration-500">
                <CheckCircle2 size={56} />
              </div>
              <div className="space-y-4 relative z-10">
                <h3 className="text-2xl font-black text-[#0F172A]">البيانات آمنة تماماً</h3>
                <p className="text-slate-400 font-medium leading-relaxed">تطبيقك يعمل بتقنية Offline-First، جميع بياناتك مخزنة محلياً ولن تُشارك أبداً عبر الإنترنت.</p>
              </div>
              <button 
                onClick={() => {
                  confirmAction("تحذير: سيتم مسح كافة البيانات المسجلة نهائياً من هذا المتصفح. هل تريد الاستمرار؟", () => {
                    localStorage.clear();
                    window.location.reload();
                  });
                }}
                className="mt-8 px-8 py-3 text-xs text-red-500 font-black rounded-xl hover:bg-red-50 hover:text-red-700 transition-all border border-transparent hover:border-red-100"
              >
                تصفير كافة البيانات (خطر)
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

function PostDaySummary({ 
  record, 
  history, 
  onClose 
}: { 
  record: DailyRecord; 
  history: DailyRecord[]; 
  onClose: () => void;
}) {
  const recentDays = useMemo(() => {
    return [...history].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 7).reverse();
  }, [history]);

  const avgRevenue = useMemo(() => {
    if (history.length === 0) return 0;
    return history.reduce((acc, r) => acc + r.totalGrossRevenue, 0) / history.length;
  }, [history]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-5xl mx-auto space-y-8 py-4 px-2"
    >
      <div className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-2xl shadow-indigo-100 border border-indigo-50 relative overflow-hidden text-right">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-3xl opacity-50 -mr-32 -mt-32" />
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8 text-center md:text-right">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-full text-xs font-black mb-2 animate-bounce">
              <CheckCircle2 size={14} />
               تم حفظ السجل بنجاح
            </div>
            <h2 className="text-4xl font-black text-slate-900 leading-normal">ملخص يوم {new Date(record.date).toLocaleDateString('ar-EG', { weekday: 'long' })}</h2>
            <p className="text-slate-500 font-bold text-lg">{new Date(record.date).toLocaleDateString('ar-EG', { dateStyle: 'long' })}</p>
          </div>
          
          <button 
            onClick={onClose}
            className="px-10 py-5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl shadow-xl shadow-indigo-600/30 transition-all active:scale-95 flex items-center gap-3 text-lg"
          >
            الذهاب للسجل التاريخي
            <Calendar size={24} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
          <div className="bg-slate-50 p-8 rounded-[2rem] text-center border-b-4 border-indigo-500">
            <p className="text-slate-500 font-black text-sm mb-2 uppercase tracking-widest">إجمالي الإيرادات</p>
            <h3 className="text-4xl font-black text-slate-900">{record.totalGrossRevenue} <span className="text-xl text-slate-400">ج.م</span></h3>
          </div>
          <div className="bg-slate-50 p-8 rounded-[2rem] text-center border-b-4 border-emerald-500">
            <p className="text-slate-500 font-black text-sm mb-2 uppercase tracking-widest">الصافي النهائي</p>
            <h3 className="text-4xl font-black text-emerald-600">{record.totalNetRevenue} <span className="text-xl text-emerald-400">ج.م</span></h3>
          </div>
          <div className="bg-slate-50 p-8 rounded-[2rem] text-center border-b-4 border-blue-500">
            <p className="text-slate-500 font-black text-sm mb-2 uppercase tracking-widest">إجمالي الحالات</p>
            <h3 className="text-4xl font-black text-blue-600">{record.totalPatients} <span className="text-xl text-blue-400">مريضة</span></h3>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 text-right">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100">
          <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2 justify-end">
            تحليل الأداء (آخر ٧ أيام)
            <TrendingUp className="text-indigo-600" />
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={recentDays}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(d) => new Date(d).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' })}
                  tick={{ fontSize: 10, fontWeight: 'bold' }}
                />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  labelStyle={{ fontWeight: 'black', marginBottom: '4px' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="totalGrossRevenue" 
                  stroke="#4f46e5" 
                  strokeWidth={4}
                  fillOpacity={1} 
                  fill="url(#colorRev)" 
                  name="الإيراد"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 flex flex-col justify-center">
          <h3 className="text-xl font-black text-slate-900 mb-8">مقارنة مع المتوسط التاريخي</h3>
          <div className="space-y-10">
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm font-black">
                <span className="text-slate-500">إيراد اليوم</span>
                <span className="text-slate-900">{record.totalGrossRevenue} ج.م</span>
              </div>
              <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min((record.totalGrossRevenue / (avgRevenue || 1)) * 50, 100)}%` }}
                  className={`h-full rounded-full ${record.totalGrossRevenue >= avgRevenue ? 'bg-emerald-500' : 'bg-amber-500'}`}
                />
              </div>
              <div className="flex justify-between items-center text-[10px] font-bold text-slate-400">
                <span>المتوسط: {avgRevenue.toFixed(0)} ج.م</span>
                <span>{((record.totalGrossRevenue / (avgRevenue || 1)) * 100).toFixed(0)}% من المتوسط</span>
              </div>
            </div>

            <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex items-center gap-4 flex-row-reverse">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl ${record.totalGrossRevenue >= avgRevenue ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                {record.totalGrossRevenue >= avgRevenue ? '🔥' : '📉'}
              </div>
              <div>
                <p className="font-black text-slate-900">
                  {record.totalGrossRevenue >= avgRevenue ? 'يوم استثنائي!' : 'تحت المتوسط المعتاد'}
                </p>
                <p className="text-slate-500 text-sm font-medium">
                  {record.totalGrossRevenue >= avgRevenue 
                    ? `لقد حققت أرباحاً أعلى بنسبة ${(((record.totalGrossRevenue - avgRevenue) / (avgRevenue || 1)) * 100).toFixed(0)}% من المعتاد اليوم.`
                    : `إيراد اليوم أقل بنسبة ${(((avgRevenue - record.totalGrossRevenue) / (avgRevenue || 1)) * 100).toFixed(0)}% من المتوسط.`
                  }
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function SummaryItem({ label, value, color }: { label: string; value: string; color: string }) {
  const colors: any = {
    green: 'bg-emerald-50 text-emerald-700 border-emerald-100 ring-4 ring-emerald-500/5',
    blue: 'bg-indigo-50 text-indigo-700 border-indigo-100 ring-4 ring-indigo-500/5',
    red: 'bg-orange-50 text-orange-700 border-orange-100 ring-4 ring-orange-500/5',
    slate: 'bg-slate-50 text-slate-700 border-slate-100 ring-4 ring-slate-500/5'
  };
  return (
    <div className={`p-6 rounded-[1.5rem] border ${colors[color] || colors.slate} space-y-2`}>
      <p className="text-[10px] font-black uppercase opacity-50 tracking-[0.2em]">{label}</p>
      <p className="text-lg font-black truncate">{value}</p>
    </div>
  );
}
