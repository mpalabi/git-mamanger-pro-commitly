import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SplitTextConfig } from '../../types';

interface SplitTextProps {
  text: string;
  config?: Partial<SplitTextConfig>;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
  children?: React.ReactNode;
}

export const SplitText: React.FC<SplitTextProps> = ({
  text,
  config = {},
  className = '',
  as: Component = 'span',
  children
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLElement>(null);

  const {
    type = 'words',
    stagger = 0.1,
    duration = 0.6,
    ease = 'easeOut'
  } = config;

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  const splitText = (text: string, type: 'chars' | 'words' | 'lines') => {
    switch (type) {
      case 'chars':
        return text.split('').filter(char => char !== ' ');
      case 'words':
        return text.split(' ');
      case 'lines':
        return text.split('\n');
      default:
        return [text];
    }
  };

  const elements = splitText(text, type);

  return (
    <Component className={className}>
      <AnimatePresence>
        {isVisible && (
          <>
            {elements.map((element, index) => (
              <motion.span
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration,
                  delay: index * stagger,
                  ease: ease as any
                }}
                className="inline-block"
              >
                {element}
                {type === 'words' && index < elements.length - 1 && ' '}
              </motion.span>
            ))}
            {children}
          </>
        )}
      </AnimatePresence>
    </Component>
  );
};

// Preset configurations for common use cases
export const SplitTextPresets = {
  title: {
    type: 'words' as const,
    stagger: 0.1,
    duration: 0.8,
    ease: 'easeOut'
  },
  subtitle: {
    type: 'words' as const,
    stagger: 0.05,
    duration: 0.6,
    ease: 'easeOut'
  },
  paragraph: {
    type: 'words' as const,
    stagger: 0.02,
    duration: 0.4,
    ease: 'easeOut'
  },
  code: {
    type: 'chars' as const,
    stagger: 0.01,
    duration: 0.3,
    ease: 'easeOut'
  }
};
