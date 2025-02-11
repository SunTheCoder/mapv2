'use client';
import { useState, useId } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Tooltip({ text, children, className = "" }) {
  const [isVisible, setIsVisible] = useState(false);
  const tooltipId = useId();

  return (
    <div 
      className={`relative inline-flex ${className}`}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
      role="tooltip"
      aria-describedby={tooltipId}
    >
      <div 
        aria-label={text}
        role="button"
        tabIndex={0}
        className="inline-flex"
      >
        {children}
      </div>
      <AnimatePresence>
        {isVisible && (
          <motion.div
            id={tooltipId}
            role="tooltip"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute z-50 px-2 py-1 text-sm text-white bg-gray-900 rounded-md whitespace-nowrap"
            style={{ 
              top: "50%",
              right: "100%",
              transform: "translateY(-50%)",
              width: 'max-content',
              marginRight: "8px"
            }}
          >
            {text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
} 