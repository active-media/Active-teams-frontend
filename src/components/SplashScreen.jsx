import React, { useEffect, useState } from "react";
import "./SplashScreen.css";

export default function SplashScreen({ onFinish }) {
  const [fadeOut, setFadeOut] = useState(false);
  const [textPhase, setTextPhase] = useState(0);
  const [particlesVisible, setParticlesVisible] = useState(false);
  const [crossVisible, setCrossVisible] = useState(false);

  useEffect(() => {
    const crossTimer = setTimeout(() => setCrossVisible(true), 300);
    const textTimer1 = setTimeout(() => setTextPhase(1), 1200);
    const textTimer2 = setTimeout(() => setTextPhase(2), 2000);
    const particlesTimer = setTimeout(() => setParticlesVisible(true), 2800);
    const fadeTimer = setTimeout(() => setFadeOut(true), 4500);
    const finishTimer = setTimeout(() => onFinish(), 5500);

    return () => {
      clearTimeout(crossTimer);
      clearTimeout(textTimer1);
      clearTimeout(textTimer2);
      clearTimeout(particlesTimer);
      clearTimeout(fadeTimer);
      clearTimeout(finishTimer);
    };
  }, [onFinish]);

  return (
    <div className="splash-container" style={{ opacity: fadeOut ? 0 : 1 }}>
      {/* Animated Background Gradient */}
      <div className="background-gradient"></div>
      
      {/* Geometric Patterns */}
      <div className="geometric-bg">
        <div className="geo-circle geo-1"></div>
        <div className="geo-circle geo-2"></div>
        <div className="geo-circle geo-3"></div>
        <div className="geo-triangle geo-tri-1"></div>
        <div className="geo-triangle geo-tri-2"></div>
      </div>

      {/* Floating Particles */}
      {particlesVisible && (
        <div className="particles-container">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="particle"
              style={{
                '--delay': `${i * 0.2}s`,
                '--x': `${Math.random() * 100}%`,
                '--y': `${Math.random() * 100}%`,
                '--size': `${2 + Math.random() * 4}px`,
                '--duration': `${3 + Math.random() * 4}s`,
              }}
            ></div>
          ))}
        </div>
      )}

      {/* Main Content */}
      <div className="main-content">
        {/* Modern Cross Design */}
        <div className={`cross-container ${crossVisible ? 'visible' : ''}`}>
          <div className="cross-modern">
            <div className="cross-glow-ring"></div>
            <div className="cross-vertical"></div>
            <div className="cross-horizontal"></div>
            <div className="cross-center-dot"></div>
          </div>
        </div>

        {/* Typography */}
        <div className="typography-container">
          <div className="brand-container">
            <h1 className={`brand-text active-text ${textPhase >= 1 ? 'visible' : ''}`}>
              ACTIVE
            </h1>
            <h1 className={`brand-text church-text ${textPhase >= 2 ? 'visible' : ''}`}>
              CHURCH
            </h1>
          </div>
          
          <div className="tagline-container">
            <div className={`tagline-line ${textPhase >= 2 ? 'visible' : ''}`}></div>
            <p className={`tagline ${textPhase >= 2 ? 'visible' : ''}`}>
              Faith in Action
            </p>
            <div className={`tagline-line ${textPhase >= 2 ? 'visible' : ''}`}></div>
          </div>
        </div>

        {/* Elegant Light Rays */}
        <div className="modern-rays">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="modern-ray"
              style={{
                '--angle': `${i * 45}deg`,
                '--delay': `${i * 0.1}s`,
              }}
            ></div>
          ))}
        </div>
      </div>
    </div>
  );
}