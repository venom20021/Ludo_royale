export default function Card({ children, className = '', glow = false, glowColor = 'yellow', padding = true, onClick }) {
  const glowStyles = {
    yellow: 'shadow-[0_0_20px_rgba(241,196,15,0.15)] border-yellow-500/20',
    blue: 'shadow-[0_0_20px_rgba(52,152,219,0.15)] border-blue-500/20',
    green: 'shadow-[0_0_20px_rgba(46,204,113,0.15)] border-green-500/20',
    purple: 'shadow-[0_0_20px_rgba(88,51,239,0.15)] border-purple-500/20',
    red: 'shadow-[0_0_20px_rgba(231,76,60,0.15)] border-red-500/20',
  };

  return (
    <div
      onClick={onClick}
      className={`
        rounded-card bg-surface border border-white/5 shadow-card
        ${glow ? glowStyles[glowColor] : ''}
        ${padding ? 'p-5' : ''}
        ${onClick ? 'cursor-pointer hover:bg-surface-hover transition-all duration-200' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
}
