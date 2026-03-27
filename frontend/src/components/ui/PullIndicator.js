import { motion } from 'framer-motion';

const PullIndicator = ({ progress, isRefreshing }) => {
  // Arc length: fills proportionally to pull progress
  const circumference = 2 * Math.PI * 7; // r=7
  const arcLength = isRefreshing ? circumference * 0.75 : progress * circumference * 0.75;

  return (
    <motion.div
      initial={{ y: -60, opacity: 0 }}
      animate={{
        y: isRefreshing ? 0 : Math.min(progress * 60 - 60, 0),
        opacity: isRefreshing ? 1 : Math.min(progress * 1.5, 1),
      }}
      transition={
        isRefreshing
          ? { type: 'spring', stiffness: 300, damping: 20, mass: 0.8 }
          : { type: 'tween', duration: 0 }
      }
      style={{
        position: 'absolute',
        top: 12,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 36,
        height: 36,
        borderRadius: '50%',
        background: '#0c0a09',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.05)',
      }}
    >
      <motion.svg
        width="18"
        height="18"
        viewBox="0 0 18 18"
        animate={isRefreshing ? { rotate: 360 } : { rotate: progress * 270 }}
        transition={
          isRefreshing
            ? { repeat: Infinity, duration: 0.7, ease: 'linear' }
            : { type: 'tween', duration: 0 }
        }
      >
        <circle
          cx="9" cy="9" r="7"
          fill="none"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="2"
        />
        <circle
          cx="9" cy="9" r="7"
          fill="none"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - arcLength}
          style={{ transition: isRefreshing ? 'none' : 'stroke-dashoffset 0.05s ease-out' }}
        />
      </motion.svg>
    </motion.div>
  );
};

export default PullIndicator;
