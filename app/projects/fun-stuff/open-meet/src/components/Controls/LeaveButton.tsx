interface LeaveButtonProps {
  onLeave: () => void
}

export function LeaveButton({ onLeave }: LeaveButtonProps) {
  return (
    <button
      onClick={onLeave}
      className="px-4 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-medium transition-all text-sm"
      title="Leave meeting"
    >
      Leave
    </button>
  )
}
