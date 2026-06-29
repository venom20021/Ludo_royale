export default function Avatar({ emoji, size = 'md', className = '', active = false }) {
  const sizes = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-14 h-14 text-xl',
    xl: 'w-20 h-20 text-3xl',
  };

  return (
    <div className={`relative inline-flex items-center justify-center ${sizes[size]} rounded-full bg-gradient-to-br from-white/10 to-white/5 border border-white/10 ${className}`}>
      <span>{emoji || '👤'}</span>
      {active && (
        <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-brand-dark rounded-full" />
      )}
    </div>
  );
}
