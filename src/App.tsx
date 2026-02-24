import React, { useState, useEffect } from 'react';
import { Plus, MapPin, Clock, Camera, Trash2, Bus, Utensils, Landmark, MoreHorizontal, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Trip, TravelEntry, Category } from './types';

const CATEGORIES: { label: Category; icon: any; color: string }[] = [
  { label: '交通', icon: Bus, color: 'bg-blue-100 text-blue-600' },
  { label: '吃吃', icon: Utensils, color: 'bg-orange-100 text-orange-600' },
  { label: '景點', icon: Landmark, color: 'bg-emerald-100 text-emerald-600' },
  { label: '其他', icon: MoreHorizontal, color: 'bg-stone-100 text-stone-600' },
];

export default function App() {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [entries, setEntries] = useState<TravelEntry[]>([]);
  const [currentDay, setCurrentDay] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [formData, setFormData] = useState({
    time: '', location: '', category: '景點' as Category, content: '', image_url: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [tripRes, entriesRes] = await Promise.all([fetch('/api/trip'), fetch('/api/entries')]);
      setTrip(await tripRes.json());
      setEntries(await entriesRes.json());
    } catch (e) { console.error(e); } finally { setIsLoading(false); }
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
    const res = await fetch('/api/entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...formData, day: currentDay }),
    });
    const { id } = await res.json();
    setEntries([...entries, { ...formData, day: currentDay, id }].sort((a, b) => a.time.localeCompare(b.time)));
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
      reader.onloadend = () => setFormData({ ...formData, image_url: reader.result as string });
      reader.readAsDataURL(file);
    }
  };

  if (isLoading) return <div className="flex items-center justify-center min-h-screen text-stone-400">載入中...</div>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 pb-24">
      <header className="mb-12 space-y-6">
        <input
          type="text"
          value={trip?.name || ''}
          onChange={(e) => updateTripName(e.target.value)}
          className="w-full text-4xl font-bold bg-transparent border-none focus:ring-0 text-stone-800"
          placeholder="行程名稱..."
        />
        <div className="flex gap-2 p-1 bg-stone-200/50 rounded-xl w-fit">
          {[1, 2, 3].map((day) => (
            <button key={day} onClick={() => setCurrentDay(day)} className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${currentDay === day ? 'bg-white shadow-sm' : 'text-stone-500'}`}>Day {day}</button>
          ))}
        </div>
      </header>

      <main className="relative">
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-stone-200" />
        <div className="space-y-12">
          {entries.filter(e => e.day === currentDay).map((entry) => (
            <motion.div key={entry.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="relative pl-12">
              <div className="absolute left-0 top-1.5 w-8 h-8 flex items-center justify-center">
                <div className={`w-3 h-3 rounded-full border-2 border-white ring-2 ring-stone-200 ${CATEGORIES.find(c => c.label === entry.category)?.color.split(' ')[0]}`} />
              </div>
              <div className="glass-card rounded-2xl overflow-hidden">
                {entry.image_url && <img src={entry.image_url} className="aspect-[3/2] w-full object-cover" />}
                <div className="p-5 space-y-3">
                  <div className="flex justify-between">
                    <div>
                      <div className="text-xs font-semibold text-stone-400 uppercase">{entry.time} • {entry.category}</div>
                      <h3 className="text-xl font-bold text-stone-800 flex items-center gap-2"><MapPin size={18} />{entry.location}</h3>
                    </div>
                    <button onClick={() => deleteEntry(entry.id)} className="text-stone-300 hover:text-red-500"><Trash2 size={18} /></button>
                  </div>
                  <p className="text-stone-600">{entry.content}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </main>

      <button onClick={() => setIsModalOpen(true)} className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-stone-900 text-white px-8 py-4 rounded-full shadow-xl flex items-center gap-2 font-bold">
        <Plus size={20} />新增內容
      </button>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
            <motion.div initial={{ y: 100 }} animate={{ y: 0 }} className="relative w-full max-w-lg bg-white rounded-3xl p-6 space-y-6">
              <h2 className="text-xl font-bold">新增行程</h2>
              <form onSubmit={handleAddEntry} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <input type="time" required value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} className="p-3 bg-stone-50 rounded-xl border" />
                  <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value as Category})} className="p-3 bg-stone-50 rounded-xl border">
                    {CATEGORIES.map(c => <option key={c.label} value={c.label}>{c.label}</option>)}
                  </select>
                </div>
                <input type="text" placeholder="地點" required value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} className="w-full p-3 bg-stone-50 rounded-xl border" />
                <textarea placeholder="內容" value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} className="w-full p-3 bg-stone-50 rounded-xl border" />
                <input type="file" accept="image/*" onChange={handleImageUpload} className="text-sm" />
                <button type="submit" className="w-full bg-stone-900 text-white py-4 rounded-xl font-bold">儲存</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
