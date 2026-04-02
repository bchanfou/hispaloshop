import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Send, ArrowRight, Trash2, RotateCcw } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useLocale } from '../context/LocaleContext';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { firstToken } from '../utils/safe';
import apiClient from '../services/api/client';



// Pages where the AI chat should be hidden
const HIDDEN_ON_PATHS = ['/login', '/register', '/verify-email', '/forgot-password', '/reset-password'];

// Dashboard paths where AI chat should NOT auto-open (but still be accessible via button)
const DASHBOARD_PATHS = ['/customer', '/producer', '/admin', '/super-admin', '/influencer'];

// Suggestion chips - shopping-focused queries
const SUGGESTION_CHIPS = [
  { label: 'Vegan', query: 'Show me vegan products' },
  { label: 'Gluten-free', query: 'I need gluten-free options' },
  { label: 'Under €20', query: 'Products under 20 euros' },
  { label: 'Spanish origin', query: 'Products from Spain' },
  { label: 'High protein', query: 'High protein foods' },
  { label: 'No nuts', query: 'Products without nuts' },
];

/**
 * Removes ALL markdown formatting from text
 * Returns clean, plain text for conversational display
 */
const stripMarkdown = (text) => {
  if (!text) return '';
  return text
    // Remove headers (# ## ### etc)
    .replace(/^#{1,6}\s+/gm, '')
    // Remove bold/italic (**text**, *text*, __text__, _text_)
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    // Remove inline code `code`
    .replace(/`([^`]+)`/g, '$1')
    // Remove code blocks ```code```
    .replace(/```[\s\S]*?```/g, '')
    // Remove blockquotes
    .replace(/^>\s+/gm, '')
    // Remove horizontal rules
    .replace(/^[-*_]{3,}\s*$/gm, '')
    // Remove links [text](url) -> text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove images ![alt](url)
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '')
    // Remove bullet points (-, *, +)
    .replace(/^[\s]*[-*+]\s+/gm, '')
    // Remove numbered lists (1. 2. etc)
    .replace(/^[\s]*\d+\.\s+/gm, '')
    // Clean up extra whitespace
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

/**
 * Splits text into smaller conversational chunks (1-3 sentences each)
 * for a more natural, human-like chat experience
 */
const chunkMessage = (text) => {
  if (!text) return [];
  
  // Split by sentence endings (. ! ?) followed by space or newline
  const sentences = text.split(/(?<=[.!?])\s+/);
  const chunks = [];
  let currentChunk = '';
  
  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();
    if (!trimmedSentence) continue;
    
    // If adding this sentence keeps chunk under ~150 chars, add it
    // Otherwise, start a new chunk
    if (currentChunk && (currentChunk.length + trimmedSentence.length > 150)) {
      chunks.push(currentChunk.trim());
      currentChunk = trimmedSentence;
    } else {
      currentChunk = currentChunk ? `${currentChunk} ${trimmedSentence}` : trimmedSentence;
    }
  }
  
  // Push the last chunk if exists
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  // If text was too short to split, return as single chunk
  return chunks.length > 0 ? chunks : [text];
};

// Product Card Component - Editorial Style
function ChatProductCard({ product, onAddToCart, isAdding, convertAndFormatPrice, t, compact = false }) {
  if (compact) {
    // Compact version for mobile horizontal scroll
    return (
      <div 
        className="bg-stone-50 rounded-md border border-stone-200 overflow-hidden"
        data-testid={`chat-product-${product.product_id}`}
      >
        <Link to={`/products/${product.product_id}`}>
          <div className="aspect-square bg-white">
            <img
              src={product.images?.[0] || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=150'}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          </div>
        </Link>
        <div className="p-2">
          <h4 className="text-xs font-medium text-stone-950 line-clamp-1 mb-1">
            {product.name}
          </h4>
          <p className="text-sm font-semibold text-stone-950 mb-2">
            {convertAndFormatPrice(product.price, product.currency || 'EUR')}
          </p>
          <button
            onClick={() => onAddToCart(product)}
            disabled={isAdding}
            className="w-full px-3 py-1 bg-stone-950 hover:bg-stone-800 disabled:opacity-50 text-white text-xs rounded-full transition-colors"
            data-testid={`add-to-cart-${product.product_id}`}
          >
            {t('products.addToCart')}
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div 
      className="bg-stone-50 rounded-md border border-stone-200 overflow-hidden hover:shadow-card transition-shadow"
      data-testid={`chat-product-${product.product_id}`}
    >
      <Link to={`/products/${product.product_id}`}>
        <div className="aspect-square bg-white cursor-pointer relative group">
          <img
            src={product.images?.[0] || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300'}
            alt={product.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-stone-950/5 transition-colors flex items-center justify-center">
            <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/95 px-3 py-1 rounded-full text-xs font-medium text-stone-950 border border-stone-200">
              View Details
            </span>
          </div>
        </div>
      </Link>
      <div className="p-3">
        <Link to={`/products/${product.product_id}`}>
          <h4 className="text-sm font-medium text-stone-950 line-clamp-2 mb-1 hover:text-stone-600 transition-colors cursor-pointer tracking-[0.02em]">
            {product.name}
          </h4>
        </Link>
        <p className="text-stone-500 text-xs mb-2">
          {product.country_origin}
        </p>
        <p className="text-base font-semibold text-stone-950 mb-3">
          {convertAndFormatPrice(product.price, product.currency || 'EUR')}
        </p>
        {product.certifications?.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {product.certifications.slice(0, 2).map((cert, idx) => (
              <span 
                key={idx}
                className="text-xs bg-white text-stone-600 px-2 py-0.5 rounded border border-stone-200"
              >
                {cert}
              </span>
            ))}
          </div>
        )}
        <button
          onClick={() => onAddToCart(product)}
          disabled={isAdding}
          className="w-full bg-transparent border border-stone-200 text-stone-950 hover:border-stone-950 hover:bg-stone-950 hover:text-white rounded-full text-xs py-2 font-medium transition-all"
          data-testid={`add-to-cart-${product.product_id}`}
        >
          {t('products.addToCart')}
        </button>
      </div>
    </div>
  );
}

export default function AIAssistant({ forceOpen = false, onForceClose = null }) {
  const { user } = useAuth();
  const { addToCart, fetchCart } = useCart();
  const { language, t, convertAndFormatPrice } = useLocale();
  const { i18n } = useTranslation();
  const location = useLocation();
  
  // All hooks MUST be called before any conditional returns (React rules of hooks)
  const [isOpen, setIsOpenRaw] = useState(forceOpen);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isChunking, setIsChunking] = useState(false); // Track if AI is sending chunked messages
  const [sessionId, setSessionId] = useState(null);
  const [recommendedProducts, setRecommendedProducts] = useState([]);
  const [addingToCart, setAddingToCart] = useState(null);
  const [aiProfile, setAiProfile] = useState(null);
  const [hasShownGreeting, setHasShownGreeting] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // SESSION MEMORY: Track products recommended during this conversation
  // This memory is temporary and resets on page reload
  const [sessionMemory, setSessionMemory] = useState([]);
  
  // Sync with forceOpen prop
  useEffect(() => {
    if (forceOpen !== undefined) {
      setIsOpenRaw(forceOpen);
    }
  }, [forceOpen]);
  
  // Get current language for AI responses
  const currentLang = i18n.language || language || 'es';
  
  // Refs for scroll management
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const shouldAutoScroll = useRef(true); // Controls auto-scroll behavior
  
  // Don't render on auth pages to avoid blocking forms
  const isAuthPage = HIDDEN_ON_PATHS.some(path => location.pathname.startsWith(path));
  
  // Check if user is on a dashboard page (should not auto-open chat)
  const isDashboardPage = DASHBOARD_PATHS.some(path => location.pathname.startsWith(path));

  // Wrapper for setIsOpen that prevents opening on dashboard pages
  const setIsOpen = useCallback((value) => {
    // If closing and we have an onForceClose callback, call it
    if (value === false && onForceClose) {
      onForceClose();
      return;
    }
    // If trying to open and we're on a dashboard, don't allow auto-open
    // But allow manual open (when value is true from button click)
    if (value === true && DASHBOARD_PATHS.some(path => window.location.pathname.startsWith(path))) {
      // Check if this is from user click (not auto-open) - we allow that
      // Auto-opens come from useEffect, user clicks don't check this condition
      return;
    }
    setIsOpenRaw(value);
  }, [onForceClose]);

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fetch AI Profile when user logs in
  useEffect(() => {
    if (user) {
      fetchAiProfile();
    }
  }, [user]);

  // PRIORITY: Force close chat on dashboard pages - runs on every path change
  useEffect(() => {
    if (isDashboardPage) {
      setIsOpenRaw(false);
    }
  }, [isDashboardPage, location.pathname]);

  // Auto-open chat for first-time visitors (logged in users with no first_visit_completed)
  // But NOT on dashboard pages or mobile devices - setIsOpen wrapper handles the blocking
  useEffect(() => {
    if (user && aiProfile && !aiProfile.first_visit_completed && !hasShownGreeting && !isMobile) {
      setIsOpen(true);
      showFirstVisitGreeting();
    }
  }, [user, aiProfile, hasShownGreeting, setIsOpen, isMobile]);

  // Auto-open chat for first-time guests (not logged in, no localStorage flag)
  // But NOT on dashboard pages or mobile devices - setIsOpen wrapper handles the blocking
  useEffect(() => {
    const hasSeenChat = localStorage.getItem('hispaloshop_chat_seen');
    if (!user && !hasSeenChat && !hasShownGreeting && !isMobile) {
      // Small delay to let the page load first
      const timer = setTimeout(() => {
        setIsOpen(true);
        showGuestGreeting();
        localStorage.setItem('hispaloshop_chat_seen', 'true');
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [user, hasShownGreeting, setIsOpen, isMobile]);

  const fetchAiProfile = async () => {
    try {
      const data = await apiClient.get(`/ai/profile`);
      setAiProfile(data);
    } catch (error) {
      console.error('Error fetching AI profile:', error);
    }
  };

  const showFirstVisitGreeting = () => {
    if (hasShownGreeting) return;
    setHasShownGreeting(true);
    
    const userName = firstToken(user?.name, '');
    
    setMessages([{
      role: 'assistant',
      content: `${t('ai.greeting')}${userName ? `, ${userName}` : ''}!`,
      products: []
    }]);
    
    // Mark first visit as completed
    markFirstVisitCompleted();
  };

  const showGuestGreeting = () => {
    if (hasShownGreeting) return;
    setHasShownGreeting(true);
    
    // Get greeting based on current language
    const greetings = {
      es: '¡Hola! Soy David, tu asistente de compras personal. Puedo ayudarte a encontrar productos según tus preferencias dietéticas, alergias o cualquier necesidad específica. ¿En qué puedo ayudarte hoy?',
      en: 'Hello! I\'m David, your personal shopping assistant. I can help you find products based on your dietary preferences, allergies, or any specific needs. How can I help you today?',
      fr: 'Bonjour ! Je suis David, votre assistant d\'achat personnel. Je peux vous aider à trouver des produits selon vos préférences alimentaires, allergies ou besoins spécifiques. Comment puis-je vous aider aujourd\'hui ?',
      de: 'Hallo! Ich bin David, Ihr persönlicher Einkaufsassistent. Ich kann Ihnen helfen, Produkte nach Ihren Ernährungspräferenzen, Allergien oder spezifischen Bedürfnissen zu finden. Wie kann ich Ihnen heute helfen?',
      pt: 'Olá! Sou David, seu assistente de compras pessoal. Posso ajudá-lo a encontrar produtos de acordo com suas preferências alimentares, alergias ou necessidades específicas. Como posso ajudá-lo hoje?',
      ar: 'مرحباً! أنا David، مساعدك الشخصي للتسوق. يمكنني مساعدتك في العثور على منتجات تناسب تفضيلاتك الغذائية أو الحساسية أو أي احتياجات محددة. كيف يمكنني مساعدتك اليوم؟',
      hi: 'नमस्ते! मैं David हूं, आपका व्यक्तिगत शॉपिंग सहायक। मैं आपकी आहार प्राथमिकताओं, एलर्जी या किसी विशिष्ट जरूरत के आधार पर उत्पाद खोजने में मदद कर सकता हूं। आज मैं आपकी कैसे मदद कर सकता हूं?',
      zh: '你好！我是 David，你的个人购物助手。我可以帮助你根据饮食偏好、过敏或任何特定需求找到产品。今天我能为你做些什么？',
      ja: 'こんにちは！私は David、あなたの個人的なショッピングアシスタントです。食事の好み、アレルギー、または特定のニーズに基づいて商品を見つけるお手伝いができます。今日はどのようにお手伝いできますか？',
      ko: '안녕하세요! 저는 David, 당신의 개인 쇼핑 어시스턴트입니다. 식이 선호도, 알레르기 또는 특정 요구 사항에 따라 제품을 찾는 데 도움을 드릴 수 있습니다. 오늘 어떻게 도와드릴까요?',
      ru: 'Привет! Я David, ваш персональный помощник по покупкам. Я могу помочь вам найти продукты в соответствии с вашими диетическими предпочтениями, аллергиями или любыми конкретными потребностями. Чем могу помочь сегодня?'
    };
    
    const greeting = greetings[currentLang] || greetings['en'];
    
    setMessages([{
      role: 'assistant',
      content: greeting,
      products: []
    }]);
  };

  // Show greeting when chat opens and there are no messages
  useEffect(() => {
    if (isOpen && messages.length === 0 && !hasShownGreeting) {
      // Get greeting based on current language
      const greetings = {
        es: '¡Hola! Soy David, tu asistente de compras personal. Puedo ayudarte a encontrar productos según tus preferencias dietéticas, alergias o cualquier necesidad específica. ¿En qué puedo ayudarte hoy?',
        en: 'Hello! I\'m David, your personal shopping assistant. I can help you find products based on your dietary preferences, allergies, or any specific needs. How can I help you today?',
        fr: 'Bonjour ! Je suis David, votre assistant d\'achat personnel. Je peux vous aider à trouver des produits selon vos préférences alimentaires, allergies ou besoins spécifiques. Comment puis-je vous aider aujourd\'hui ?',
        de: 'Hallo! Ich bin David, Ihr persönlicher Einkaufsassistent. Ich kann Ihnen helfen, Produkte nach Ihren Ernährungspräferenzen, Allergien oder spezifischen Bedürfnissen zu finden. Wie kann ich Ihnen heute helfen?',
        pt: 'Olá! Sou David, seu assistente de compras pessoal. Posso ajudá-lo a encontrar produtos de acordo com suas preferências alimentares, alergias ou necessidades específicas. Como posso ajudá-lo hoje?',
        ar: 'مرحباً! أنا David، مساعدك الشخصي للتسوق. يمكنني مساعدتك في العثور على منتجات تناسب تفضيلاتك الغذائية أو الحساسية أو أي احتياجات محددة. كيف يمكنني مساعدتك اليوم؟',
        hi: 'नमस्ते! मैं David हूं, आपका व्यक्तिगत शॉपिंग सहायक। मैं आपकी आहार प्राथमिकताओं, एलर्जी या किसी विशिष्ट जरूरत के आधार पर उत्पाद खोजने में मदद कर सकता हूं। आज मैं आपकी कैसे मदद कर सकता हूं?',
        zh: '你好！我是 David，你的个人购物助手。我可以帮助你根据饮食偏好、过敏或任何特定需求找到产品。今天我能为你做些什么？',
        ja: 'こんにちは！私は David、あなたの個人的なショッピングアシスタントです。食事の好み、アレルギー、または特定のニーズに基づいて商品を見つけるお手伝いができます。今日はどのようにお手伝いできますか？',
        ko: '안녕하세요! 저는 David, 당신의 개인 쇼핑 어시스턴트입니다. 식이 선호도, 알레르기 또는 특정 요구 사항에 따라 제품을 찾는 데 도움을 드릴 수 있습니다. 오늘 어떻게 도와드릴까요?',
        ru: 'Привет! Я David, ваш персональный помощник по покупкам. Я могу помочь вам найти продукты в соответствии с вашими диетическими предпочтениями, аллергиями или любыми конкретными потребностями. Чем могу помочь сегодня?'
      };
      
      const greeting = greetings[currentLang] || greetings['en'];
      
      setMessages([{
        role: 'assistant',
        content: greeting,
        products: []
      }]);
      setHasShownGreeting(true);
    }
  }, [isOpen, messages.length, hasShownGreeting, currentLang]);

  // Update greeting message when language changes (if only one assistant message exists)
  useEffect(() => {
    const greetings = {
      es: '¡Hola! Soy David, tu asistente de compras personal. Puedo ayudarte a encontrar productos según tus preferencias dietéticas, alergias o cualquier necesidad específica. ¿En qué puedo ayudarte hoy?',
      en: 'Hello! I\'m David, your personal shopping assistant. I can help you find products based on your dietary preferences, allergies, or any specific needs. How can I help you today?',
      fr: 'Bonjour ! Je suis David, votre assistant d\'achat personnel. Je peux vous aider à trouver des produits selon vos préférences alimentaires, allergies ou besoins spécifiques. Comment puis-je vous aider aujourd\'hui ?',
      de: 'Hallo! Ich bin David, Ihr persönlicher Einkaufsassistent. Ich kann Ihnen helfen, Produkte nach Ihren Ernährungspräferenzen, Allergien oder spezifischen Bedürfnissen zu finden. Wie kann ich Ihnen heute helfen?',
      pt: 'Olá! Sou David, seu assistente de compras pessoal. Posso ajudá-lo a encontrar produtos de acordo com suas preferências alimentares, alergias ou necessidades específicas. Como posso ajudá-lo hoje?',
      ar: 'مرحباً! أنا David، مساعدك الشخصي للتسوق. يمكنني مساعدتك في العثور على منتجات تناسب تفضيلاتك الغذائية أو الحساسية أو أي احتياجات محددة. كيف يمكنني مساعدتك اليوم؟',
      hi: 'नमस्ते! मैं David हूं, आपका व्यक्तिगत शॉपिंग सहायक। मैं आपकी आहार प्राथमिकताओं, एलर्जी या किसी विशिष्ट जरूरत के आधार पर उत्पाद खोजने में मदद कर सकता हूं। आज मैं आपकी कैसे मदद कर सकता हूं?',
      zh: '你好！我是 David，你的个人购物助手。我可以帮助你根据饮食偏好、过敏或任何特定需求找到产品。今天我能为你做些什么？',
      ja: 'こんにちは！私は David、あなたの個人的なショッピングアシスタントです。食事の好み、アレルギー、または特定のニーズに基づいて商品を見つけるお手伝いができます。今日はどのようにお手伝いできますか？',
      ko: '안녕하세요! 저는 David, 당신의 개인 쇼핑 어시스턴트입니다. 식이 선호도, 알레르기 또는 특정 요구 사항에 따라 제품을 찾는 데 도움을 드릴 수 있습니다. 오늘 어떻게 도와드릴까요?',
      ru: 'Привет! Я David, ваш персональный помощник по покупкам. Я могу помочь вам найти продукты в соответствии с вашими диетическими предпочтениями, аллергиями или любыми конкретными потребностями. Чем могу помочь сегодня?'
    };
    
    // Only update if it's just the greeting message (first message, from assistant, no user messages yet)
    if (messages.length === 1 && messages[0].role === 'assistant') {
      // Check if current message is a known greeting in any language
      const allGreetings = Object.values(greetings);
      const isGreetingMessage = allGreetings.some(g => messages[0].content === g);
      
      if (isGreetingMessage) {
        const newGreeting = greetings[currentLang] || greetings['en'];
        if (messages[0].content !== newGreeting) {
          setMessages([{
            ...messages[0],
            content: newGreeting
          }]);
        }
      }
    }
  }, [currentLang, messages]);

  const markFirstVisitCompleted = async () => {
    try {
      await apiClient.post(`/ai/profile/mark-first-visit`, {});
    } catch (error) {
      console.error('Error marking first visit:', error);
    }
  };

  /**
   * SCROLL BEHAVIOR - Smooth scroll to bottom of chat
   * Only scrolls if user hasn't manually scrolled up
   */
  const scrollToBottom = useCallback(() => {
    if (shouldAutoScroll.current && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, []);

  /**
   * Detect if user has scrolled up (to pause auto-scroll)
   * Resume auto-scroll when user scrolls back to bottom
   */
  const handleScroll = useCallback((e) => {
    const container = e.target;
    const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 50;
    shouldAutoScroll.current = isAtBottom;
  }, []);

  // Auto-scroll when messages change (only if user is at bottom)
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Early return: Hide completely on auth pages to prevent form obstruction
  // This MUST be after all hooks to comply with React rules of hooks
  if (isAuthPage) {
    return null;
  }

  const handleAddToCart = async (product) => {
    if (!user) {
      toast.error('Please login to add items to cart');
      return;
    }
    
    setAddingToCart(product.product_id);
    const success = await addToCart(product.product_id, 1);
    if (success) {
      toast.success(`Added ${product.name} to cart!`);
    } else {
      toast.error('Failed to add to cart');
    }
    setAddingToCart(null);
  };

  const handleChipClick = (query) => {
    setInputMessage(query);
    setTimeout(() => {
      sendMessageWithContent(query);
    }, 100);
  };

  const sendMessageWithContent = async (content) => {
    if (!content.trim() || loading || isChunking) return;

    if (!user) {
      setMessages([...messages, {
        role: 'assistant',
        content: t('a_i_assistant.porFavorIniciaSesionParaUsarElAs', 'Por favor, inicia sesión para usar el asistente de compras.'),
        products: []
      }]);
      return;
    }

    setInputMessage('');
    // Enable auto-scroll when user sends a message
    shouldAutoScroll.current = true;
    setMessages(prev => [...prev, { role: 'user', content: content, products: [] }]);
    setLoading(true);

    try {
      const data = await apiClient.post(
        `/chat/message`,
        {
          message: content,
          session_id: sessionId,
          // Send session memory so backend can execute cart actions
          session_memory: sessionMemory,
          // Send user's preferred language for AI responses
          language: currentLang
        }
      );

      setSessionId(data.session_id);

      const newProducts = data.recommended_products || [];

      // UPDATE SESSION MEMORY: Track all products recommended in this conversation
      // Each product gets a position index (1-based) for "first", "last", etc. commands
      if (newProducts.length > 0) {
        const newMemoryItems = newProducts.map((p, index) => ({
          product_id: p.product_id,
          name: p.name,
          variant_id: p.variants?.[0]?.variant_id || null,
          pack_id: p.variants?.[0]?.packs?.[0]?.pack_id || null,
          position: sessionMemory.length + index + 1
        }));
        setSessionMemory(prev => [...prev, ...newMemoryItems]);
      }

      // If a cart action was executed, refresh the cart
      if (data.cart_action?.success) {
        fetchCart();
        toast.success(data.cart_action.message);
      }

      // Clean response - remove ALL markdown formatting
      const cleanResponse = stripMarkdown(data.response);
      
      // Split into chunks for natural conversation feel
      const chunks = chunkMessage(cleanResponse);
      
      setLoading(false);
      
      // Send chunks sequentially with delays for human-like feel
      if (chunks.length > 1) {
        setIsChunking(true);
        
        for (let i = 0; i < chunks.length; i++) {
          // Add each chunk as a separate message with a delay
          await new Promise(resolve => setTimeout(resolve, i === 0 ? 0 : 400));
          
          setMessages(prev => [
            ...prev,
            { 
              role: 'assistant', 
              content: chunks[i],
              // Only attach products to the last chunk
              products: i === chunks.length - 1 ? newProducts : []
            }
          ]);
        }
        
        setIsChunking(false);
      } else {
        // Single message, no chunking needed
        setMessages(prev => [
          ...prev,
          { 
            role: 'assistant', 
            content: cleanResponse,
            products: newProducts
          }
        ]);
      }
      
      if (newProducts.length > 0) {
        setRecommendedProducts(newProducts);
      }
    } catch (error) {
      console.error('Chat error:', error);
      setLoading(false);
      setIsChunking(false);
      setMessages(prev => [
        ...prev,
        { 
          role: 'assistant',
          content: error.message || t('a_i_assistant.loSientoHaOcurridoUnErrorPorFav', 'Lo siento, ha ocurrido un error. Por favor, inténtalo de nuevo.'),
          products: []
        }
      ]);
    }
  };

  const sendMessage = async () => {
    await sendMessageWithContent(inputMessage);
  };

  // Clear conversation and start fresh
  const clearConversation = async () => {
    // Reset all state
    setMessages([]);
    setSessionId(null);
    setSessionMemory([]);
    setRecommendedProducts([]);
    setHasShownGreeting(false);
    
    // No server endpoint exists to delete chat sessions in legacy API.
    // We reset locally and keep subsequent requests in a fresh session context.
    
    // Show fresh greeting
    const greetings = {
      es: '¡Conversación reiniciada! ¿En qué puedo ayudarte?',
      en: 'Conversation cleared! How can I help you?',
      fr: 'Conversation effacée ! Comment puis-je vous aider ?',
      de: 'Gespräch gelöscht! Wie kann ich Ihnen helfen?',
      pt: 'Conversa apagada! Como posso ajudá-lo?',
    };
    
    const greeting = greetings[currentLang] || greetings['en'];
    
    setMessages([{
      role: 'assistant',
      content: greeting,
      products: []
    }]);
    setHasShownGreeting(true);
    
    toast.success(t('ai.conversationCleared', 'Conversación borrada'));
  };

  // David Logo — D monogram, stone-950
  const HispaloLogo = ({ size = 40 }) => (
    <div
      className="rounded-full bg-stone-950 flex items-center justify-center flex-shrink-0"
      style={{ width: size, height: size }}
    >
      <span className="text-white font-semibold" style={{ fontSize: size * 0.32 }}>
        D
      </span>
    </div>
  );

  // Get personalized greeting for welcome screen
  const getPersonalizedWelcome = () => {
    if (aiProfile?.diet?.length > 0 || aiProfile?.allergies?.length > 0) {
      return `Recuerdo tus preferencias. ¿Qué te gustaría encontrar hoy?`;
    }
    return `Cuéntame qué buscas. Puedo ayudarte con productos veganos, sin gluten, o según tu dieta.`;
  };

  // If using forceOpen mode, don't render the floating button (UnifiedFloatingIsland handles it)
  if (forceOpen && !isOpen) {
    return null;
  }

  // If not using forceOpen mode and chat is closed, don't render anything
  // The UnifiedFloatingIsland handles all floating buttons now
  if (!isOpen && !forceOpen) {
    return null;
  }

  return (
    <>
      {/* Shopping Assistant Panel - Compact Design */}
      {isOpen && (
        <div
          className={`fixed z-50 bg-white shadow-2xl flex overflow-hidden
            ${isMobile 
              ? 'inset-0 rounded-none flex-col' 
              : 'bottom-6 left-6 rounded-2xl border border-stone-200'
            }`}
          style={isMobile ? {} : { 
            width: recommendedProducts.length > 0 ? '720px' : '360px',
            height: '520px',
            maxWidth: 'calc(100vw - 48px)',
            transition: 'width 0.3s ease-in-out'
          }}
          data-testid="ai-chat-window"
        >
          {/* Mobile: Products at TOP if there are recommendations */}
          {isMobile && recommendedProducts.length > 0 && (
            <div className="border-b border-stone-200 bg-stone-50">
              {/* Products Header */}
              <div className="p-3 border-b border-stone-100 bg-white flex items-center justify-between">
                <h4 className="text-sm font-medium text-stone-950 tracking-[0.02em]">
                  Recomendados
                </h4>
                <span className="text-xs text-stone-500 bg-stone-100 px-2 py-1 rounded-full">
                  {recommendedProducts.length} productos
                </span>
              </div>

              {/* Products Horizontal Scroll */}
              <div className="p-2 overflow-x-auto">
                <div className="flex gap-2" style={{ minWidth: 'max-content' }} data-testid="mobile-recommended-products">
                  {recommendedProducts.slice(0, 6).map((product) => (
                    <div key={product.product_id} className="w-36 flex-shrink-0">
                      <ChatProductCard
                        product={product}
                        onAddToCart={handleAddToCart}
                        isAdding={addingToCart === product.product_id}
                        convertAndFormatPrice={convertAndFormatPrice}
                        t={t}
                        compact={true}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {/* Chat Panel - Full width on mobile, fixed on desktop */}
          <div className={`flex flex-col bg-white ${isMobile ? 'flex-1 w-full min-h-0' : ''}`} style={isMobile ? {} : { width: '360px', minWidth: '360px' }}>
            {/* Header - Clean minimal style */}
            <div className="flex items-center justify-between p-3 border-b border-stone-100">
              <div className="flex items-center space-x-2.5">
                <HispaloLogo size={isMobile ? 26 : 30} />
                <div>
                  <h3 className="text-sm font-semibold text-stone-950" data-testid="chat-title">
                    David
                  </h3>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {/* Clear conversation button */}
                {messages.length > 1 && (
                  <button
                    onClick={clearConversation}
                    className="text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-full p-2 transition-colors"
                    data-testid="clear-chat-button"
                    title={t('ai.clearConversation', 'Borrar conversación')}
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-full p-2 transition-colors"
                  data-testid="close-chat-button"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Messages Area - Clean white background */}
            <div 
              className="flex-1 overflow-y-auto p-3 space-y-3 bg-stone-50" 
              data-testid="chat-messages"
              onScroll={handleScroll}
              ref={chatContainerRef}
            >
              {messages.length === 0 && (
                <div className="text-center py-6">
                  <div className="mx-auto w-12 h-12 mb-4">
                    <HispaloLogo size={48} />
                  </div>
                  <h4 className="text-base font-medium text-stone-950 mb-2">
                    {user ? `Hola${user.name ? `, ${user.name.split(' ')[0]}` : ''}` : 'Bienvenido'}
                  </h4>
                  <p className="text-sm text-stone-500 mb-6 leading-relaxed px-4">
                    {user ? getPersonalizedWelcome() : t('a_i_assistant.iniciaSesionParaUnaExperienciaPerso', 'Inicia sesión para una experiencia personalizada.')}
                  </p>
                  
                  {/* Suggestion Chips */}
                  <div className="space-y-3">
                    <p className="text-xs text-stone-500 uppercase tracking-wider">{t('a_i_assistant.busquedasRapidas', 'Búsquedas rápidas')}</p>
                    <div className="flex flex-wrap gap-2 justify-center px-2">
                      {SUGGESTION_CHIPS.slice(0, 3).map((chip) => (
                        <button
                          key={chip.label}
                          onClick={() => handleChipClick(chip.query)}
                          className="text-xs bg-white text-stone-600 px-4 py-2 rounded-full border border-stone-200 hover:border-stone-950 hover:text-stone-950 transition-colors"
                        >
                          {chip.label}
                        </button>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-2 justify-center px-2">
                      {SUGGESTION_CHIPS.slice(3, 6).map((chip) => (
                        <button
                          key={chip.label}
                          onClick={() => handleChipClick(chip.query)}
                          className="text-xs bg-white text-stone-600 px-4 py-2 rounded-full border border-stone-200 hover:border-stone-950 hover:text-stone-950 transition-colors"
                        >
                          {chip.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  data-testid={`chat-message-${msg.role}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="flex-shrink-0 mr-2 mt-1">
                      <HispaloLogo size={24} />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-3xl px-4 py-3 text-sm ${
                      msg.role === 'user'
                        ? 'bg-stone-950 text-white rounded-br-md'
                        : 'bg-white text-stone-900 border border-stone-100 shadow-sm rounded-bl-md'
                    }`}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}
              
              {/* Loading indicator - shows during API call or chunking */}
              {(loading || isChunking) && (
                <div className="flex justify-start items-end gap-2">
                  <HispaloLogo size={24} />
                  <div className="bg-white border border-stone-100 shadow-sm rounded-3xl rounded-bl-md px-4 py-3">
                    <div className="flex items-center gap-1">
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce"
                          style={{ animationDelay: `${i * 0.15}s` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {/* Scroll anchor - always at bottom */}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area - Editorial Style */}
            <div className="p-3 md:p-4 border-t border-stone-200 bg-white">
              <div className="flex space-x-2">
                <input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder={t('ai.placeholder')}
                  className="flex-1 bg-stone-50 border border-stone-200 rounded-full px-3 md:px-4 py-2 md:py-2.5 text-sm text-stone-950 placeholder:text-stone-500 focus:outline-none focus:border-stone-950 transition-colors"
                  disabled={loading || isChunking}
                  data-testid="chat-input"
                />
                <button
                  onClick={sendMessage}
                  disabled={loading || isChunking || !inputMessage.trim()}
                  className="bg-stone-950 hover:bg-stone-800 disabled:bg-stone-300 text-white rounded-full p-2 md:p-2.5 transition-colors"
                  data-testid="send-message-button"
                >
                  <ArrowRight className="w-5 h-5 stroke-[1.5]" />
                </button>
              </div>
              <p className="text-xs text-stone-500 text-center mt-2 hidden md:block">
                Recomendaciones basadas en certificados de producto.
              </p>
            </div>
          </div>

          {/* Product Recommendations Panel - Hidden on mobile, shown on desktop */}
          {recommendedProducts.length > 0 && !isMobile && (
            <div className="border-l border-stone-200 bg-stone-50 flex flex-col" style={{ width: '380px' }}>
              {/* Products Header */}
              <div className="p-4 border-b border-stone-200 bg-white">
                <div className="flex items-center justify-between">
                  <h4 className="text-base font-medium text-stone-950 tracking-[0.02em]">
                    Recomendados
                  </h4>
                  <span className="text-xs text-stone-500 bg-stone-50 px-2 py-1 rounded border border-stone-200">
                    {recommendedProducts.length} productos
                  </span>
                </div>
              </div>

              {/* Products Grid */}
              <div className="flex-1 overflow-y-auto p-3">
                <div className="grid grid-cols-2 gap-3" data-testid="recommended-products-grid">
                  {recommendedProducts.slice(0, 6).map((product) => (
                    <ChatProductCard
                      key={product.product_id}
                      product={product}
                      onAddToCart={handleAddToCart}
                      isAdding={addingToCart === product.product_id}
                      convertAndFormatPrice={convertAndFormatPrice}
                      t={t}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
