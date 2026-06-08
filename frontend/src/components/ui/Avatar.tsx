interface AvatarProps {
  name?: string
  size?: number
  className?: string
}

const COLORS = [
  'bg-primary-500', 'bg-pink-500', 'bg-amber-500', 'bg-emerald-500',
  'bg-blue-500', 'bg-violet-500', 'bg-red-500', 'bg-teal-500',
]

function getInitials(name?: string) {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

function getColor(name?: string) {
  if (!name) return COLORS[0]
  let h = 0
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return COLORS[Math.abs(h) % COLORS.length]
}

export default function Avatar({ name, size = 40, className = '' }: AvatarProps) {
  const bg = getColor(name)
  return (
    <div
      className={`rounded-full text-white font-semibold flex items-center justify-center shrink-0 ${bg} ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {getInitials(name)}
    </div>
  )
}
