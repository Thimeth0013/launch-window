import { useState, useEffect } from 'react';

const Countdown = ({ targetDate }) => {
  const [timeLeft, setTimeLeft] = useState('loading'); // Changed from null to 'loading'

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

    // Calculate immediately
    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  // Show loading state while calculating
  if (timeLeft === 'loading') {
    return (
      <div className="text-3xl font-bold text-[#18BBF7] tracking-widest animate-pulse">
        CALCULATING...
      </div>
    );
  }

  // Show launched state if countdown complete
  if (!timeLeft) {
    return (
      <div className="text-3xl font-bold text-green-500 tracking-widest">
        LAUNCHED
      </div>
    );
  }

  const pad = (n) => n.toString().padStart(2, '0');

  return (
    <div className="grid grid-flow-col gap-5 text-center auto-cols-max">
      {/* Days */}
      <div className="flex flex-col p-2 bg-neutral rounded-box text-neutral-content">
        <span className="countdown font-mono text-3xl md:text-6xl">
          <span style={{ "--value": timeLeft.days }}>
            {pad(timeLeft.days)}
          </span>
        </span>
        days
      </div>

      {/* Hours */}
      <div className="flex flex-col p-2 bg-neutral rounded-box text-neutral-content">
        <span className="countdown font-mono text-3xl md:text-6xl">
          <span style={{ "--value": timeLeft.hours }}>
            {pad(timeLeft.hours)}
          </span>
        </span>
        hours
      </div>

      {/* Minutes */}
      <div className="flex flex-col p-2 bg-neutral rounded-box text-neutral-content">
        <span className="countdown font-mono text-3xl md:text-6xl">
          <span style={{ "--value": timeLeft.minutes }}>
            {pad(timeLeft.minutes)}
          </span>
        </span>
        min
      </div>

      {/* Seconds */}
      <div className="flex flex-col p-2 bg-neutral rounded-box text-neutral-content">
        <span className="countdown font-mono text-3xl md:text-6xl">
          <span style={{ "--value": timeLeft.seconds }}>
            {pad(timeLeft.seconds)}
          </span>
        </span>
        sec
      </div>
    </div>
  );
};

export default Countdown;