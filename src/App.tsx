/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Plus, MapPin, Clock, Camera, Trash2, Bus, Utensils, Landmark, MoreHorizontal, X, Search, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Trip, TravelEntry, Category } from './types';
import { GoogleGenAI } from "@google/genai";

const CATEGORIES: { label: Category; icon: string; color: string }[] = [
  { label: '交通', icon: '🚙', color: 'bg-blue-50 text-blue-600 border-blue-200' },
  { label: '吃吃', icon: '🍽️', color: 'bg-orange-50 text-orange-600 border-orange-200' },
  { label: '景點', icon: '📷', color: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
  { label: '其他', icon: '✨', color: 'bg-stone-50 text-stone-600 border-stone-200' },
];

export default function App() {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [entries, setEntries] = useState<TravelEntry[]>([]);
  const [currentDay, setCurrentDay] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    time: '',
    location: '',
    category: '景點' as Category,
    content: '',
    image_url: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [tripRes, entriesRes] = await Promise.all([
        fetch('/api/trip'),
        fetch('/api/entries')
      ]);
      const tripData = await tripRes.json();
      const entriesData = await entriesRes.json();
      setTrip(tripData);
      setEntries(entriesData);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const searchLocation = async () => {
    if (!formData.location) return;
    setIsSearching(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `請幫我搜尋地點「${formData.location}」的詳細資訊，包含正確名稱和簡短描述。`,
        config: {
          tools: [{ googleMaps: {} }],
        },
      });

      const text = response.text || '';
      // Simple parsing of AI response - assuming it gives a name and description
      // In a real app, we'd use a more structured response or regex
      setFormData(prev => ({
        ...prev,
        location: text.split('\n')[0].replace(/[*#]/g, '').trim() || prev.location,
        content: text.split('\n').slice(1).join('\n').trim() || prev.content
      }));
    } catch (error) {
      console.error('AI Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const updateTripName = async (name: string) => {
    if (!trip) return;
    setTrip({ ...trip, name });
    await fetch('/api/trip', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
  };

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    const newEntry = { ...formData, day: currentDay };
    const res = await fetch('/api/entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newEntry),
    });
    const { id } = await res.json();
    setEntries([...entries, { ...newEntry, id }].sort((a, b) => a.time.localeCompare(b.time)));
    setIsModalOpen(false);
    setFormData({ time: '', location: '', category: '景點', content: '', image_url: '' });
  };

  const deleteEntry = async (id: number) => {
    await fetch(`/api/entries/${id}`, { method: 'DELETE' });
    setEntries(entries.filter(e => e.id !== id));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, image_url: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const filteredEntries = entries.filter(e => e.day === currentDay);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-stone-400 font-bold tracking-widest">LOADING...</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 pb-32">
      {/* Header */}
      <header className="mb-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-stone-900 rounded-2xl flex items-center justify-center text-white custom-shadow">
            <Landmark size={24} />
          </div>
          <input
            type="text"
            value={trip?.name || ''}
            onChange={(e) => updateTripName(e.target.value)}
            className="flex-1 text-3xl font-black bg-transparent border-none focus:ring-0 placeholder-stone-300 text-stone-800"
            placeholder="我的精彩旅行..."
          />
        </div>

        {/* Horizontal Scrolling Date Picker */}
        <div className="flex overflow-x-auto gap-3 pb-4 no-scrollbar">
          {[1, 2, 3, 4, 5, 6, 7].map((day) => (
            <button
              key={day}
              onClick={() => setCurrentDay(day)}
              className={`flex-shrink-0 w-20 py-5 rounded-2xl border-2 transition-all flex flex-col items-center gap-1 ${
                currentDay === day
                  ? 'bg-stone-900 border-stone-900 text-white custom-shadow scale-105'
                  : 'bg-white border-stone-200 text-stone-400 hover:border-stone-400'
              }`}
            >
              <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Day</span>
              <span className="text-2xl font-black">{day}</span>
            </button>
          ))}
        </div>
      </header>

      {/* Timeline */}
      <main className="relative">
        <div className="timeline-line" />
        
        <div className="space-y-4">
          {filteredEntries.length > 0 ? (
            filteredEntries.map((entry) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative pl-14"
              >
                {/* Timeline Dot */}
                <div className="absolute left-4 top-6 w-4 h-4 rounded-full border-4 border-[#F7F4EB] bg-stone-900 z-10" />

                <div className="glass-card overflow-hidden group">
                  {entry.image_url && (
                    <div className="aspect-[3/2] w-full overflow-hidden bg-stone-100 border-b border-stone-100">
                      <img
                        src={entry.image_url}
                        alt={entry.location}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}
                  <div className="p-5 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${CATEGORIES.find(c => c.label === entry.category)?.color}`}>
                            {CATEGORIES.find(c => c.label === entry.category)?.icon} {entry.category}
                          </span>
                          <span className="text-[10px] font-bold text-stone-400 uppercase tracking-tighter flex items-center gap-1">
                            <Clock size={10} /> {entry.time}
                          </span>
                        </div>
                        <h3 className="text-xl font-black text-stone-800 flex items-center gap-1.5">
                          <MapPin size={18} className="text-stone-400" />
                          {entry.location}
                        </h3>
                      </div>
                      <button
                        onClick={() => deleteEntry(entry.id)}
                        className="p-2 text-stone-200 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                    {entry.content && (
                      <p className="text-sm text-stone-600 leading-relaxed font-medium">
                        {entry.content}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="py-20 text-center space-y-4 pl-14">
              <div className="w-12 h-12 bg-white rounded-2xl border border-stone-200 flex items-center justify-center mx-auto text-stone-300 custom-shadow">
                <Plus size={24} />
              </div>
              <p className="text-stone-400 text-sm font-bold italic tracking-wide">這一天還沒有行程，快來新增吧！</p>
            </div>
          )}
        </div>
      </main>

      {/* Floating Action Button - Square with Rounded Corners */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-stone-900 text-white px-12 py-5 rounded-2xl shadow-2xl hover:bg-stone-800 transition-all flex items-center gap-2 font-black active:scale-95 z-40 custom-shadow tracking-widest"
      >
        <Plus size={24} />
        新增內容
      </button>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-stone-900/70 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="relative w-full max-w-lg bg-[#F7F4EB] rounded-[2rem] shadow-2xl overflow-hidden border border-stone-200"
            >
              <div className="p-6 border-b border-stone-200 flex items-center justify-between bg-white">
                <h2 className="text-2xl font-black text-stone-800 tracking-tight">新增行程內容</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-stone-100 rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleAddEntry} className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em]">時間</label>
                    <input
                      required
                      type="time"
                      value={formData.time}
                      onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                      className="w-full px-4 py-4 bg-white border border-stone-200 rounded-2xl focus:ring-2 focus:ring-stone-900 focus:border-transparent outline-none font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em]">分類</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value as Category })}
                      className="w-full px-4 py-4 bg-white border border-stone-200 rounded-2xl focus:ring-2 focus:ring-stone-900 focus:border-transparent outline-none appearance-none font-bold"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c.label} value={c.label}>{c.icon} {c.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em]">地點 (Google 雲端搜尋)</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <MapPin size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
                      <input
                        required
                        type="text"
                        placeholder="要去哪裡？"
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        className="w-full pl-12 pr-4 py-4 bg-white border border-stone-200 rounded-2xl focus:ring-2 focus:ring-stone-900 focus:border-transparent outline-none font-bold"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={searchLocation}
                      disabled={isSearching || !formData.location}
                      className="px-4 bg-stone-900 text-white rounded-2xl hover:bg-stone-800 transition-all disabled:opacity-50 flex items-center justify-center custom-shadow"
                    >
                      {isSearching ? <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" /> : <Sparkles size={20} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em]">內容描述</label>
                  <textarea
                    rows={2}
                    placeholder="寫點什麼吧..."
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    className="w-full px-4 py-4 bg-white border border-stone-200 rounded-2xl focus:ring-2 focus:ring-stone-900 focus:border-transparent outline-none resize-none font-medium"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em]">照片</label>
                  <div className="relative group">
                    {formData.image_url ? (
                      <div className="relative aspect-[3/2] rounded-2xl overflow-hidden border border-stone-200 custom-shadow">
                        <img src={formData.image_url} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, image_url: '' })}
                          className="absolute top-3 right-3 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center aspect-[3/2] border-2 border-dashed border-stone-200 bg-white rounded-2xl cursor-pointer hover:bg-stone-50 hover:border-stone-300 transition-all">
                        <Camera size={32} className="text-stone-300 mb-2" />
                        <span className="text-xs text-stone-400 font-black tracking-widest">點擊上傳照片</span>
                        <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                      </label>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-stone-900 text-white py-5 rounded-2xl font-black text-lg tracking-[0.2em] hover:bg-stone-800 transition-all active:scale-[0.98] custom-shadow"
                >
                  儲存行程
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
