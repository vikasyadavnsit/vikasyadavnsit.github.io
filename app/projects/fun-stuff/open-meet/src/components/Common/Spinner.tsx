interface SpinnerProps {
  size?: number
  className?: string
}

export function Spinner({ size = 24, className = '' }: SpinnerProps) {
  return (
    <svg
      className={`animate-spin text-blue-500 ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
    >
      <circle cx="12" cy="12" r="10" strokeOpacity={0.25} />
      <path d="M12 2a10 10 0 0 1 10 10" />
    </svg>
  )
}
