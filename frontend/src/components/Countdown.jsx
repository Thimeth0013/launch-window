import { useState, useEffect } from 'react';

const Countdown = ({ targetDate }) => {
  const [timeLeft, setTimeLeft] = useState('loading');

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = new Date(targetDate) - new Date();
      if (difference > 0) {
        return {
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / (1000 * 60)) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        };
      }
      return null;
    };

    setTimeLeft(calculateTimeLeft());
    const timer = setInterval(() => setTimeLeft(calculateTimeLeft()), 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  if (timeLeft === 'loading') {
    return (
      <div className="text-xl font-black text-[#18BBF7] tracking-[0.4em] uppercase">
        T-MINUS [CALCULATING]
      </div>
    );
  }

  if (!timeLeft) {
    return (
      <div className="text-4xl font-black text-green-500 tracking-[0.2em] uppercase">
        LIFT OFF
      </div>
    );
  }

  const pad = (n) => n.toString().padStart(2, '0');

  const TimeUnit = ({ value, label, showSeparator = true }) => (
    <div className="flex items-baseline mt-4">
      <div className="flex flex-col items-center">
        <span className="font-mono text-4xl md:text-6xl font-black text-white leading-none tabular-nums">
          {pad(value)}
        </span>
        <span className="text-[10px] md:text-xs font-bold text-gray-400 tracking-[0.3em] uppercase mt-3">
          {label}
        </span>
      </div>
      {showSeparator && (
        <span className="text-3xl md:text-5xl font-bold text-[#18BBF7]/40 mx-2 md:mx-4 self-start mt-1">
          :
        </span>
      )}
    </div>
  );

  return (
    <div className="flex items-start">
      <TimeUnit value={timeLeft.days} label="DAYS" />
      <TimeUnit value={timeLeft.hours} label="HRS" />
      <TimeUnit value={timeLeft.minutes} label="MIN" />
      <TimeUnit value={timeLeft.seconds} label="SEC" showSeparator={false} />
    </div>
  );
};

export default Countdown;