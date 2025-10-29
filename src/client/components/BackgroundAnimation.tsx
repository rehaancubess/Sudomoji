import React, { useEffect, useState, useCallback } from 'react';

interface FloatingElement {
  id: string;
  value: string;
  x: number;
  y: number;
  animationDuration: number;
  delay: number;
}

interface SparkleEffect {
  id: string;
  x: number;
  y: number;
  animationDuration: number;
  delay: number;
}

interface BackgroundAnimationProps {
  children: React.ReactNode;
}

const BackgroundAnimation: React.FC<BackgroundAnimationProps> = ({ children }) => {
  const [floatingNumbers, setFloatingNumbers] = useState<FloatingElement[]>([]);
  const [sparkles, setSparkles] = useState<SparkleEffect[]>([]);
  const [isReducedMotion, setIsReducedMotion] = useState(false);

  // Check for reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setIsReducedMotion(mediaQuery.matches);
    
    const handleChange = (e: MediaQueryListEvent) => {
      setIsReducedMotion(e.matches);
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Get responsive element count based on screen size
  const getElementCount = useCallback(() => {
    const width = window.innerWidth;
    if (width < 480) return { numbers: 4, sparkles: 6 }; // Mobile
    if (width < 768) return { numbers: 6, sparkles: 8 }; // Tablet
    return { numbers: 8, sparkles: 12 }; // Desktop
  }, []);

  useEffect(() => {
    if (isReducedMotion) return; // Skip animations if reduced motion is preferred

    const { numbers: numberCount, sparkles: sparkleCount } = getElementCount();
    // Create floating numbers
    const numbers = ['1', '2', '4', '5'];
    const floatingElements: FloatingElement[] = [];
    
    for (let i = 0; i < numberCount; i++) {
      floatingElements.push({
        id: `float-${i}`,
        value: numbers[Math.floor(Math.random() * numbers.length)],
        x: Math.random() * 100,
        y: Math.random() * 100,
        animationDuration: 8 + Math.random() * 4, // 8-12 seconds
        delay: Math.random() * 8, // 0-8 second delay
      });
    }
    
    setFloatingNumbers(floatingElements);

    // Create sparkle effects
    const sparkleElements: SparkleEffect[] = [];
    
    for (let i = 0; i < sparkleCount; i++) {
      sparkleElements.push({
        id: `sparkle-${i}`,
        x: Math.random() * 100,
        y: Math.random() * 100,
        animationDuration: 2 + Math.random() * 2, // 2-4 seconds
        delay: Math.random() * 4, // 0-4 second delay
      });
    }
    
    setSparkles(sparkleElements);

    // Handle window resize for responsive updates
    const handleResize = () => {
      const newCounts = getElementCount();
      
      // Update floating numbers if count changed
      if (newCounts.numbers !== floatingElements.length) {
        const updatedNumbers: FloatingElement[] = [];
        for (let i = 0; i < newCounts.numbers; i++) {
          updatedNumbers.push({
            id: `float-${i}`,
            value: numbers[Math.floor(Math.random() * numbers.length)],
            x: Math.random() * 100,
            y: Math.random() * 100,
            animationDuration: 8 + Math.random() * 4,
            delay: Math.random() * 8,
          });
        }
        setFloatingNumbers(updatedNumbers);
      }
      
      // Update sparkles if count changed
      if (newCounts.sparkles !== sparkleElements.length) {
        const updatedSparkles: SparkleEffect[] = [];
        for (let i = 0; i < newCounts.sparkles; i++) {
          updatedSparkles.push({
            id: `sparkle-${i}`,
            x: Math.random() * 100,
            y: Math.random() * 100,
            animationDuration: 2 + Math.random() * 2,
            delay: Math.random() * 4,
          });
        }
        setSparkles(updatedSparkles);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isReducedMotion, getElementCount]);

  return (
    <div className="game-background">
      {/* Floating Numbers - only render if motion is not reduced */}
      {!isReducedMotion && floatingNumbers.map((element) => (
        <div
          key={element.id}
          className="floating-number animate-float-up"
          style={{
            left: `${element.x}%`,
            animationDuration: `${element.animationDuration}s`,
            animationDelay: `${element.delay}s`,
          }}
        >
          {element.value}
        </div>
      ))}

      {/* Sparkle Effects - only render if motion is not reduced */}
      {!isReducedMotion && sparkles.map((sparkle) => (
        <div
          key={sparkle.id}
          className="sparkle-effect animate-sparkle"
          style={{
            left: `${sparkle.x}%`,
            top: `${sparkle.y}%`,
            animationDuration: `${sparkle.animationDuration}s`,
            animationDelay: `${sparkle.delay}s`,
          }}
        />
      ))}

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

export default BackgroundAnimation;