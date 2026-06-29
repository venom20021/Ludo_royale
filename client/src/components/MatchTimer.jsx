import { useState, useEffect } from 'react';

const TURN_TIMEOUT = 30;

export default function MatchTimer({ turnStartTime, turnNumber, gamePhase }) {
  const [remainingSeconds, setRemainingSeconds] = useState(TURN_TIMEOUT);

  useEffect(() => {
    if (!turnStartTime || gamePhase !== 'playing') {
      setRemainingSeconds(TURN_TIMEOUT);
      return;
    }
    const updateTimer = () => {
      const elapsed = (Date.now() - turnStartTime) / 1000;
      setRemainingSeconds(Math.max(0, TURN_TIMEOUT - elapsed));
    };
    updateTimer();
    const interval = setInterval(updateTimer, 200);
    return () => clearInterval(interval);
  }, [turnStartTime, gamePhase, turnNumber]);

  if (gamePhase !== 'playing') return null;

  const timerColor = remainingSeconds > 10 ? '#2ecc71' : remainingSeconds > 5 ? '#f1c40f' : '#ff6b6b';

  return (
    <div className="w-full max-w-[500px] mt-3">
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-200"
            style={{
              width: `${Math.max(0, (remainingSeconds / TURN_TIMEOUT) * 100)}%`,
              background: `linear-gradient(90deg, ${timerColor}, ${timerColor}88)`,
              boxShadow: remainingSeconds < 5 ? `0 0 12px ${timerColor}66` : 'none',
            }}
          />
        </div>
        <span
          className="font-display text-sm min-w-[30px] text-center transition-colors duration-300"
          style={{ color: timerColor }}
        >
          {Math.ceil(remainingSeconds)}s
        </span>
      </div>
    </div>
  );
}
