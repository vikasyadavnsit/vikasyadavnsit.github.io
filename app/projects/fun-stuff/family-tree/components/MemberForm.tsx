'use client';
import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, Upload, User } from 'lucide-react';
import type { Member } from '../types';

interface Props {
  member?: Member;
  onSave: (m: Member) => void;
  onClose: () => void;
}

function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const MAX = 400;
        let { width, height } = img;
        if (width > MAX || height > MAX) {
          const ratio = Math.min(MAX / width, MAX / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function MemberForm({ member, onSave, onClose }: Props) {
  const [name, setName] = useState(member?.name ?? '');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>(member?.gender ?? 'other');
  const [dateOfBirth, setDateOfBirth] = useState(member?.dateOfBirth ?? '');
  const [dateOfDeath, setDateOfDeath] = useState(member?.dateOfDeath ?? '');
  const [bio, setBio] = useState(member?.bio ?? '');
  const [photo, setPhoto] = useState(member?.photo ?? '');
  const [photoLoading, setPhotoLoading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoLoading(true);
    try {
      const compressed = await compressImage(file);
      setPhoto(compressed);
    } catch {
      // ignore compression errors
    } finally {
      setPhotoLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) { setError('Name is required.'); return; }
    const saved: Member = {
      id: member?.id ?? crypto.randomUUID(),
      name: trimmed,
      gender,
      ...(dateOfBirth && { dateOfBirth }),
      ...(dateOfDeath && { dateOfDeath }),
      ...(bio.trim() && { bio: bio.trim() }),
      ...(photo && { photo }),
    };
    onSave(saved);
  }

  const genderColors: Record<string, string> = {
    male: 'bg-blue-500 text-white',
    female: 'bg-pink-500 text-white',
    other: 'bg-zinc-500 text-white',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="relative bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <h3 className="text-white font-semibold mb-5">{member ? 'Edit Member' : 'Add Member'}</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Photo */}
          <div className="flex items-center gap-4">
            <div
              onClick={() => fileRef.current?.click()}
              className="w-16 h-16 rounded-full border-2 border-dashed border-zinc-600 flex items-center justify-center cursor-pointer hover:border-green-500 transition-colors overflow-hidden flex-shrink-0"
            >
              {photo ? (
                <img src={photo} alt="preview" className="w-full h-full object-cover" />
              ) : (
                <User className="w-6 h-6 text-zinc-500" />
              )}
            </div>
            <div>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-2 text-sm text-zinc-300 hover:text-white transition-colors"
              >
                <Upload className="w-4 h-4" />
                {photoLoading ? 'Processing...' : photo ? 'Change photo' : 'Upload photo'}
              </button>
              {photo && (
                <button
                  type="button"
                  onClick={() => setPhoto('')}
                  className="text-xs text-red-400 hover:text-red-300 mt-1"
                >
                  Remove photo
                </button>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">
              Full Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(''); }}
              placeholder="e.g. John Smith"
              className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-green-500 text-sm"
              autoFocus={!member}
            />
            {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
          </div>

          {/* Gender */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Gender</label>
            <div className="flex gap-2">
              {(['male', 'female', 'other'] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGender(g)}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors capitalize ${
                    gender === g ? genderColors[g] : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Date of Birth</label>
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-green-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Date of Death</label>
              <input
                type="date"
                value={dateOfDeath}
                onChange={(e) => setDateOfDeath(e.target.value)}
                className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-green-500 text-sm"
              />
            </div>
          </div>

          {/* Bio */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="A short description..."
              rows={3}
              className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-green-500 text-sm resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-xl border border-zinc-700 text-zinc-300 hover:bg-zinc-800 transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 rounded-xl bg-green-500 hover:bg-green-600 text-white font-medium transition-colors text-sm"
            >
              {member ? 'Save Changes' : 'Add Member'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
