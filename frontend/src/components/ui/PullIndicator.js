import { motion } from 'framer-motion';

const PullIndicator = ({ progress, isRefreshing }) => {
  return (
    <motion.div
      initial={{ y: -60, opacity: 0 }}
      animate={{
        y: isRefreshing ? 0 : Math.min(progress * 60 - 60, 0),
        opacity: isRefreshing ? 1 : Math.min(progress * 1.5, 1),
      }}
      transition={
        isRefreshing
          ? { type: 'spring', stiffness: 300, damping: 25 }
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
        background: 'var(--hs-black)',
        boxShadow: 'var(--hs-shadow-sm)',
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
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="44"
          strokeDashoffset={isRefreshing ? 11 : 44 - (progress * 33)}
        />
      </motion.svg>
    </motion.div>
  );
};

export default PullIndicator;
