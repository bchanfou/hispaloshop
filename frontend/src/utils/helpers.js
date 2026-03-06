/**
 * Helper functions for Hispaloshop
 */

/**
 * Sanitize image URLs — fix malformed URLs and normalize paths.
 * Handles: missing protocol colon (https// → https://), relative paths, placeholder URLs.
 */
export const sanitizeImageUrl = (url) => {
  if (!url || typeof url !== 'string') return null;
  // Fix missing colon: https// → https://
  if (url.startsWith('https//')) return 'https://' + url.slice(7);
  if (url.startsWith('http//')) return 'http://' + url.slice(6);
  // Full URLs are fine
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  // Protocol-relative URLs
  if (url.startsWith('//')) return 'https:' + url;
  // Local upload paths
  if (url.startsWith('/uploads/')) return '/api' + url;
  // Anything else — return as-is
  return url;
};

// Country code to flag emoji mapping
export const getCountryFlag = (countryCode) => {
  const countryFlags = {
    'ES': '🇪🇸',
    'FR': '🇫🇷',
    'DE': '🇩🇪',
    'IT': '🇮🇹',
    'PT': '🇵🇹',
    'US': '🇺🇸',
    'GB': '🇬🇧',
    'MX': '🇲🇽',
    'MA': '🇲🇦', // Morocco
    'GR': '🇬🇷', // Greece
    'TR': '🇹🇷', // Turkey
    'EG': '🇪🇬', // Egypt
    'TN': '🇹🇳', // Tunisia
    'JP': '🇯🇵',
    'CN': '🇨🇳',
    'IN': '🇮🇳',
    'BR': '🇧🇷',
    'AR': '🇦🇷',
    'CL': '🇨🇱',
    'PE': '🇵🇪',
    'AU': '🇦🇺',
    'NZ': '🇳🇿',
  };
  
  return countryFlags[countryCode] || '🌍';
};

// Ingredient to emoji mapping (common food ingredients)
export const getIngredientEmoji = (ingredient) => {
  const normalizedIngredient = ingredient.toLowerCase().trim();
  
  const emojiMap = {
    // Oils
    'olive oil': '🫒',
    'oil': '🫒',
    'sunflower oil': '🌻',
    'coconut oil': '🥥',
    
    // Herbs & Spices
    'rosemary': '🌿',
    'thyme': '🌿',
    'basil': '🌿',
    'oregano': '🌿',
    'parsley': '🌿',
    'mint': '🌿',
    'sage': '🌿',
    'bay leaf': '🍃',
    'pepper': '🌶️',
    'chili': '🌶️',
    'paprika': '🌶️',
    'garlic': '🧄',
    'onion': '🧅',
    
    // Salts & Minerals
    'salt': '🧂',
    'sea salt': '🧂',
    
    // Nuts & Seeds
    'almond': '🌰',
    'walnut': '🌰',
    'hazelnut': '🌰',
    'pistachio': '🥜',
    'peanut': '🥜',
    'sesame': '🌾',
    
    // Fruits
    'lemon': '🍋',
    'orange': '🍊',
    'apple': '🍎',
    'tomato': '🍅',
    'olive': '🫒',
    'grape': '🍇',
    'fig': '🌰',
    'date': '🌴',
    
    // Grains & Flours
    'wheat': '🌾',
    'flour': '🌾',
    'rice': '🍚',
    'corn': '🌽',
    'oat': '🌾',
    'barley': '🌾',
    
    // Dairy
    'milk': '🥛',
    'cheese': '🧀',
    'butter': '🧈',
    'cream': '🥛',
    
    // Sweeteners
    'honey': '🍯',
    'sugar': '🍬',
    
    // Vegetables
    'carrot': '🥕',
    'potato': '🥔',
    'cucumber': '🥒',
    'eggplant': '🍆',
    'bell pepper': '??',
    'spinach': '🥬',
    
    // Proteins
    'egg': '🥚',
    'chicken': '🍗',
    'beef': '🥩',
    'fish': '🐟',
    'tuna': '🐟',
    'salmon': '🐟',
    'shrimp': '🦐',
    
    // Others
    'vinegar': '🧴',
    'wine': '🍷',
    'yeast': '🍞',
    'water': '💧',
  };
  
  // Try to match the ingredient
  for (const [key, emoji] of Object.entries(emojiMap)) {
    if (normalizedIngredient.includes(key)) {
      return emoji;
    }
  }
  
  // Default emoji for unknown ingredients
  return '🥘';
};
