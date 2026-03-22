import React, { useEffect, useState } from 'react';
import './SplashScreen.css';

interface SplashScreenProps {
  onFinish: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const [phase, setPhase] = useState<'enter' | 'show' | 'exit'>('enter');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('show'), 100);
    const t2 = setTimeout(() => setPhase('exit'), 2800);
    const t3 = setTimeout(() => onFinish(), 3500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onFinish]);

  return (
    <div className={`splash-screen splash-${phase}`}>
      <div className="splash-bg-glow" />

      <div className="splash-content">
        {/* Animated equalizer bars */}
        <div className="splash-equalizer">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="eq-bar" style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>

        {/* App name with gradient */}
        <h1 className="splash-title">
          <span className="splash-letter" style={{ animationDelay: '0.1s' }}>A</span>
          <span className="splash-letter" style={{ animationDelay: '0.15s' }}>u</span>
          <span className="splash-letter" style={{ animationDelay: '0.2s' }}>d</span>
          <span className="splash-letter" style={{ animationDelay: '0.25s' }}>y</span>
          <span className="splash-letter" style={{ animationDelay: '0.3s' }}>n</span>
          <span className="splash-letter" style={{ animationDelay: '0.35s' }}>o</span>
          <span className="splash-letter" style={{ animationDelay: '0.4s' }}>x</span>
        </h1>

        {/* Tagline */}
        <p className="splash-tagline">Your Music, Your Way</p>

        {/* Spinning vinyl / disc */}
        <div className="splash-disc-container">
          <div className="splash-disc">
            <div className="disc-inner" />
            <div className="disc-shine" />
          </div>
        </div>

        {/* Developer credit */}
        <p className="splash-credit">
          Developed by <span className="splash-dev-name">Kaarthik Dass Arora</span>
        </p>
      </div>

      {/* Floating music notes */}
      <div className="splash-notes">
        {['♪', '♫', '♬', '♩', '♪', '♫'].map((note, i) => (
          <span
            key={i}
            className="floating-note"
            style={{
              left: `${15 + i * 14}%`,
              animationDelay: `${i * 0.3}s`,
              fontSize: `${18 + (i % 3) * 8}px`,
            }}
          >
            {note}
          </span>
        ))}
      </div>
    </div>
  );
};

export default SplashScreen;
