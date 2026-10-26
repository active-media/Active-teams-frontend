
import styles from "../styles/Header.module.css";
import { useEffect, useState } from "react";

export default function Home() {
  const sections = [
    { image: "/image1.PNG" },
    { image: "/3.png" },
    { image: "/2.png" },
    { image: "/1.png" },
    // { image: "/newimage.jpg" }, 
  ];

  const [activeSlide, setActiveSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return undefined;

    const timer = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % sections.length);
    }, 8000);

    return () => window.clearInterval(timer);
  }, [isPaused, sections.length]);

  return (
    <main
      className={styles.slider}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setIsPaused(false);
        }
      }}
      aria-label="Active Teams highlights"
    >
      <div
        className={styles.slideTrack}
        style={{ transform: `translateX(-${activeSlide * 100}%)` }}
      >
        {sections.map((section, index) => (
          <div
            key={section.image}
            className={styles.slide}
            style={{ backgroundImage: `url(${section.image})` }}
            aria-hidden={index !== activeSlide}
          />
        ))}
      </div>

      <div className={styles.dots}>
        {sections.map((section, index) => (
          <button
            key={section.image}
            type="button"
            className={`${styles.dot} ${index === activeSlide ? styles.dotActive : ""}`}
            onClick={() => setActiveSlide(index)}
            aria-label={`Show slide ${index + 1}`}
            aria-current={index === activeSlide ? "true" : undefined}
          />
        ))}
      </div>
    </main>
  );
}