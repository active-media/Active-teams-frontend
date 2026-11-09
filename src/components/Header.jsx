
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
  const [isLoopReset, setIsLoopReset] = useState(false);

  useEffect(() => {
    if (isPaused) return undefined;

    const timer = window.setInterval(() => {
      setActiveSlide((current) => {
        const next = current + 1;
        if (
          next === sections.length &&
          window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ) {
          return 0;
        }
        return next;
      });
    }, 8000);

    return () => window.clearInterval(timer);
  }, [isPaused, sections.length]);

  const handleTrackTransitionEnd = (event) => {
    if (
      event.target !== event.currentTarget ||
      event.propertyName !== "transform" ||
      activeSlide !== sections.length
    ) {
      return;
    }

    setIsLoopReset(true);
    setActiveSlide(0);
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => setIsLoopReset(false));
    });
  };

  const indicatorSlide = activeSlide % sections.length;

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
        onTransitionEnd={handleTrackTransitionEnd}
        style={{
          transform: `translateX(-${activeSlide * 100}%)`,
          transition: isLoopReset ? "none" : undefined,
        }}
      >
        {sections.map((section, index) => (
          <div
            key={section.image}
            className={styles.slide}
            aria-hidden={index !== activeSlide}
          >
            <img className={styles.slideImage} src={section.image} alt="" draggable="false" />
          </div>
        ))}
        <div
          key="loop-clone"
          className={styles.slide}
          aria-hidden="true"
        >
          <img className={styles.slideImage} src={sections[0].image} alt="" draggable="false" />
        </div>
      </div>

      <div className={styles.dots}>
        {sections.map((section, index) => (
          <button
            key={section.image}
            type="button"
            className={`${styles.dot} ${index === indicatorSlide ? styles.dotActive : ""}`}
            onClick={() => setActiveSlide(index)}
            aria-label={`Show slide ${index + 1}`}
            aria-current={index === indicatorSlide ? "true" : undefined}
          />
        ))}
      </div>
    </main>
  );
}