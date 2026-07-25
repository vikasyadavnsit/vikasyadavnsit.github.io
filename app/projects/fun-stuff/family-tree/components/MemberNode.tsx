'use client';
import { User, Baby } from 'lucide-react';
import type { Member } from '../types';

interface Props {
  member: Member;
  isSelected: boolean;
  childrenCount: number;
  onClick: () => void;
  onMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void;
}

function calcAge(dob?: string, dod?: string): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  const end = dod ? new Date(dod) : new Date();
  let age = end.getFullYear() - birth.getFullYear();
  const m = end.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && end.getDate() < birth.getDate())) age--;
  return age >= 0 ? age : null;
}

const ringColor: Record<string, string> = {
  male: 'border-blue-400',
  female: 'border-pink-400',
  other: 'border-zinc-500',
};
const bgColor: Record<string, string> = {
  male: 'bg-blue-500/10',
  female: 'bg-pink-500/10',
  other: 'bg-zinc-700/30',
};
const avatarBg: Record<string, string> = {
  male: 'bg-blue-500/20 text-blue-400',
  female: 'bg-pink-500/20 text-pink-400',
  other: 'bg-zinc-700 text-zinc-400',
};

export default function MemberNode({ member, isSelected, childrenCount, onClick, onMouseDown }: Props) {
  const age = calcAge(member.dateOfBirth, member.dateOfDeath);
  const birthYear = member.dateOfBirth?.slice(0, 4);
  const deathYear = member.dateOfDeath?.slice(0, 4);
  const gender = member.gender ?? 'other';

  const yearLabel = birthYear
    ? deathYear
      ? `${birthYear} – ${deathYear}`
      : `b. ${birthYear}`
    : null;

  return (
    <div
      data-member-node="true"
      onClick={onClick}
      onMouseDown={onMouseDown}
      className={`w-full h-full rounded-2xl border-2 flex items-center gap-2 px-2.5 select-none transition-all duration-150
        ${bgColor[gender]} ${ringColor[gender]}
        ${isSelected
          ? 'shadow-[0_0_0_3px_rgba(134,239,172,0.45)] scale-[1.04]'
          : 'hover:scale-[1.03] hover:shadow-lg'
        }
      `}
      style={{ cursor: 'grab' }}
    >
      {/* Avatar / Photo */}
      <div className="flex-shrink-0">
        {member.photo ? (
          <img
            src={member.photo}
            alt={member.name}
            className={`w-9 h-9 rounded-full object-cover border-2 ${ringColor[gender]}`}
          />
        ) : (
          <div className={`w-9 h-9 rounded-full border-2 ${ringColor[gender]} ${avatarBg[gender]} flex items-center justify-center`}>
            <User className="w-4 h-4" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <p className="text-white text-[11px] font-bold leading-tight truncate">{member.name}</p>

        {yearLabel && (
          <p className="text-zinc-400 text-[9px] leading-none">{yearLabel}</p>
        )}

        {/* Badges row */}
        <div className="flex items-center gap-1 mt-0.5 flex-wrap">
          {age !== null && (
            <span className={`text-[8px] font-semibold px-1.5 py-0.5 rounded-full leading-none
              ${member.dateOfDeath
                ? 'bg-zinc-700/60 text-zinc-400'
                : 'bg-emerald-500/20 text-emerald-400'
              }`}>
              {member.dateOfDeath ? `†${age}y` : `${age}y`}
            </span>
          )}
          {childrenCount > 0 && (
            <span className="text-[8px] font-semibold px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 leading-none flex items-center gap-0.5">
              <Baby className="w-2.5 h-2.5" />
              {childrenCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
