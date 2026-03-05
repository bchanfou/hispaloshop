import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { 
  MessageCircle, Send, X, User, Store, Search, 
  ChevronLeft, Loader2, Instagram, Twitter, Youtube,
  Globe, MapPin, Users, Star, Package, ExternalLink,
  Check, CheckCheck, Trash2, Bell, BellOff, Image, Paperclip
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';

import { API } from '../utils/api';
const WS_URL = typeof window !== 'undefined'
  ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`
  : '';
// Request notification permission
const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return false;
  }
  
  if (Notification.permission === 'granted') {
    return true;
  }
  
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  
  return false;
};

// Show desktop notification
const showNotification = (title, body, icon) => {
  if (Notification.permission === 'granted') {
    const notification = new Notification(title, {
      body,
      icon: icon || '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'chat-message',
      renotify: true
    });
    
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
    
    // Auto close after 5 seconds
    setTimeout(() => notification.close(), 5000);
  }
};

function formatTime(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;
  
  if (diff < 60000) return 'ahora';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

function formatFollowers(followers) {
  if (!followers) return '0';
  // Handle string values like "10K", "1M"
  if (typeof followers === 'string') {
    return followers;
  }
  if (followers >= 1000000) {
    return (followers / 1000000).toFixed(1) + 'M';
  }
  if (followers >= 1000) {
    return (followers / 1000).toFixed(1) + 'K';
  }
  return followers.toString();
}

// Tab component for switching between sections
function DirectoryTab({ active, onClick, icon: Icon, label, count }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium border-b-2 transition-all ${
        active 
          ? 'border-[#1C1C1C] text-[#1C1C1C] bg-stone-50' 
          : 'border-transparent text-[#7A7A7A] hover:text-[#1C1C1C] hover:bg-stone-50'
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
      {count > 0 && (
        <span className={`px-1.5 py-0.5 rounded-full text-xs ${
          active ? 'bg-[#1C1C1C] text-white' : 'bg-stone-200 text-stone-600'
        }`}>
          {count}
        </span>
      )}
    </button>
  );
}

// Influencer Profile Card
function InfluencerCard({ influencer, onClick }) {
  const socialMedia = influencer.social_media || {};
  
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-4 hover:bg-stone-50 transition-colors border-b border-stone-100 text-left"
      data-testid={`influencer-card-${influencer.influencer_id}`}
    >
      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-white font-bold flex-shrink-0 overflow-hidden">
        {influencer.profile_image ? (
          <img src={influencer.profile_image} alt={influencer.full_name} className="w-full h-full object-cover" />
        ) : (
          influencer.full_name?.[0]?.toUpperCase() || 'I'
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-[#1C1C1C] truncate">{influencer.full_name}</p>
        <p className="text-xs text-[#7A7A7A] truncate">{influencer.niche || 'Influencer'}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-[#7A7A7A] flex items-center gap-1">
            <Users className="w-3 h-3" />
            {formatFollowers(influencer.followers)}
          </span>
          {socialMedia.instagram && (
            <Instagram className="w-3 h-3 text-pink-500" />
          )}
          {socialMedia.tiktok && (
            <span className="text-xs">📱</span>
          )}
        </div>
      </div>
      <ChevronLeft className="w-4 h-4 text-[#7A7A7A] rotate-180" />
    </button>
  );
}

// Producer/Store Card
function ProducerCard({ producer, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-4 hover:bg-stone-50 transition-colors border-b border-stone-100 text-left"
      data-testid={`producer-card-${producer.store_id}`}
    >
      <div className="w-12 h-12 rounded-lg bg-stone-100 flex items-center justify-center flex-shrink-0 overflow-hidden border border-stone-200">
        {producer.logo ? (
          <img src={producer.logo} alt={producer.name} className="w-full h-full object-cover" />
        ) : (
          <Store className="w-6 h-6 text-[#7A7A7A]" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-[#1C1C1C] truncate">{producer.name}</p>
        {producer.location && (
          <p className="text-xs text-[#7A7A7A] truncate flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {producer.location}
          </p>
        )}
        <div className="flex items-center gap-3 mt-1">
          <span className="text-xs text-[#7A7A7A] flex items-center gap-1">
            <Users className="w-3 h-3" />
            {producer.follower_count || 0}
          </span>
          <span className="text-xs text-[#7A7A7A] flex items-center gap-1">
            <Package className="w-3 h-3" />
            {producer.product_count || 0}
          </span>
        </div>
      </div>
      <ChevronLeft className="w-4 h-4 text-[#7A7A7A] rotate-180" />
    </button>
  );
}

// Influencer Profile Detail View
function InfluencerProfile({ influencer, onBack, onStartChat }) {
  const socialMedia = influencer.social_media || {};
  
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header with back button */}
      <div className="flex items-center gap-3 p-4 border-b border-stone-200 bg-white">
        <button onClick={onBack} className="p-1 hover:bg-stone-100 rounded-full">
          <ChevronLeft className="w-5 h-5 text-[#1C1C1C]" />
        </button>
        <span className="font-medium text-[#1C1C1C]">Perfil de Influencer</span>
      </div>
      
      {/* Profile Content */}
      <div className="flex-1 overflow-y-auto p-4 bg-stone-50">
        {/* Profile Header */}
        <div className="text-center mb-6">
          <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-white text-2xl font-bold overflow-hidden mb-3">
            {influencer.profile_image ? (
              <img src={influencer.profile_image} alt={influencer.full_name} className="w-full h-full object-cover" />
            ) : (
              influencer.full_name?.[0]?.toUpperCase() || 'I'
            )}
          </div>
          <h3 className="font-semibold text-lg text-[#1C1C1C]">{influencer.full_name}</h3>
          {influencer.niche && (
            <p className="text-sm text-[#7A7A7A] mt-1">{influencer.niche}</p>
          )}
        </div>
        
        {/* Stats */}
        <div className="bg-white rounded-lg border border-stone-200 p-4 mb-4">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-xl font-bold text-[#1C1C1C]">{formatFollowers(influencer.followers)}</p>
              <p className="text-xs text-[#7A7A7A]">Seguidores</p>
            </div>
            <div>
              <p className="text-xl font-bold text-[#1C1C1C]">€{(influencer.total_sales_generated || 0).toFixed(0)}</p>
              <p className="text-xs text-[#7A7A7A]">Ventas generadas</p>
            </div>
          </div>
        </div>
        
        {/* Social Media Links */}
        {(socialMedia.instagram || socialMedia.tiktok || socialMedia.youtube || socialMedia.twitter) && (
          <div className="bg-white rounded-lg border border-stone-200 p-4 mb-4">
            <h4 className="font-medium text-[#1C1C1C] mb-3">Redes Sociales</h4>
            <div className="space-y-2">
              {socialMedia.instagram && (
                <a 
                  href={socialMedia.instagram.startsWith('http') ? socialMedia.instagram : `https://instagram.com/${socialMedia.instagram}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-stone-50 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center">
                    <Instagram className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-sm text-[#1C1C1C] flex-1">Instagram</span>
                  <ExternalLink className="w-4 h-4 text-[#7A7A7A]" />
                </a>
              )}
              {socialMedia.tiktok && (
                <a 
                  href={socialMedia.tiktok.startsWith('http') ? socialMedia.tiktok : `https://tiktok.com/@${socialMedia.tiktok}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-stone-50 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center">
                    <span className="text-white text-sm">📱</span>
                  </div>
                  <span className="text-sm text-[#1C1C1C] flex-1">TikTok</span>
                  <ExternalLink className="w-4 h-4 text-[#7A7A7A]" />
                </a>
              )}
              {socialMedia.youtube && (
                <a 
                  href={socialMedia.youtube.startsWith('http') ? socialMedia.youtube : `https://youtube.com/@${socialMedia.youtube}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-stone-50 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center">
                    <Youtube className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-sm text-[#1C1C1C] flex-1">YouTube</span>
                  <ExternalLink className="w-4 h-4 text-[#7A7A7A]" />
                </a>
              )}
              {socialMedia.twitter && (
                <a 
                  href={socialMedia.twitter.startsWith('http') ? socialMedia.twitter : `https://twitter.com/${socialMedia.twitter}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-stone-50 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center">
                    <Twitter className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-sm text-[#1C1C1C] flex-1">X (Twitter)</span>
                  <ExternalLink className="w-4 h-4 text-[#7A7A7A]" />
                </a>
              )}
            </div>
          </div>
        )}
        
        {/* Discount Code */}
        {influencer.discount_code && (
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border border-purple-200 p-4 mb-4">
            <h4 className="font-medium text-[#1C1C1C] mb-2">Código de descuento</h4>
            <div className="bg-white rounded-lg p-3 text-center border border-purple-100">
              <p className="font-mono font-bold text-lg text-purple-600">{influencer.discount_code}</p>
              {influencer.discount_value && (
                <p className="text-xs text-[#7A7A7A] mt-1">{influencer.discount_value}% de descuento</p>
              )}
            </div>
          </div>
        )}
        
        {/* Contact Button */}
        <Button 
          onClick={onStartChat}
          className="w-full bg-[#1C1C1C] hover:bg-[#2C2C2C]"
        >
          <MessageCircle className="w-4 h-4 mr-2" />
          Enviar mensaje
        </Button>
      </div>
    </div>
  );
}

// Producer Profile Detail View
function ProducerProfile({ producer, onBack, onStartChat }) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header with back button */}
      <div className="flex items-center gap-3 p-4 border-b border-stone-200 bg-white">
        <button onClick={onBack} className="p-1 hover:bg-stone-100 rounded-full">
          <ChevronLeft className="w-5 h-5 text-[#1C1C1C]" />
        </button>
        <span className="font-medium text-[#1C1C1C]">Perfil de Productor</span>
      </div>
      
      {/* Profile Content */}
      <div className="flex-1 overflow-y-auto p-4 bg-stone-50">
        {/* Profile Header */}
        <div className="text-center mb-6">
          <div className="w-20 h-20 mx-auto rounded-xl bg-stone-100 flex items-center justify-center overflow-hidden border-2 border-stone-200 mb-3">
            {producer.logo ? (
              <img src={producer.logo} alt={producer.name} className="w-full h-full object-cover" />
            ) : (
              <Store className="w-8 h-8 text-[#7A7A7A]" />
            )}
          </div>
          <h3 className="font-semibold text-lg text-[#1C1C1C]">{producer.name}</h3>
          {producer.tagline && (
            <p className="text-sm text-[#7A7A7A] mt-1 italic">"{producer.tagline}"</p>
          )}
          {producer.location && (
            <p className="text-xs text-[#7A7A7A] mt-2 flex items-center justify-center gap-1">
              <MapPin className="w-3 h-3" />
              {producer.location}
            </p>
          )}
        </div>
        
        {/* Stats */}
        <div className="bg-white rounded-lg border border-stone-200 p-4 mb-4">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-xl font-bold text-[#1C1C1C]">{producer.product_count || 0}</p>
              <p className="text-xs text-[#7A7A7A]">Productos</p>
            </div>
            <div>
              <p className="text-xl font-bold text-[#1C1C1C]">{producer.follower_count || 0}</p>
              <p className="text-xs text-[#7A7A7A]">Seguidores</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 text-amber-500 fill-current" />
                <span className="text-xl font-bold text-[#1C1C1C]">{producer.avg_rating?.toFixed(1) || '0.0'}</span>
              </div>
              <p className="text-xs text-[#7A7A7A]">({producer.review_count || 0})</p>
            </div>
          </div>
        </div>
        
        {/* Story */}
        {producer.story && (
          <div className="bg-white rounded-lg border border-stone-200 p-4 mb-4">
            <h4 className="font-medium text-[#1C1C1C] mb-2">Nuestra Historia</h4>
            <p className="text-sm text-[#7A7A7A] leading-relaxed">{producer.story}</p>
          </div>
        )}
        
        {/* Social & Contact */}
        {(producer.social_instagram || producer.social_facebook || producer.website) && (
          <div className="bg-white rounded-lg border border-stone-200 p-4 mb-4">
            <h4 className="font-medium text-[#1C1C1C] mb-3">Enlaces</h4>
            <div className="space-y-2">
              {producer.social_instagram && (
                <a 
                  href={producer.social_instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-stone-50 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center">
                    <Instagram className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-sm text-[#1C1C1C] flex-1">Instagram</span>
                  <ExternalLink className="w-4 h-4 text-[#7A7A7A]" />
                </a>
              )}
              {producer.social_facebook && (
                <a 
                  href={producer.social_facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-stone-50 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                    <span className="text-white text-sm font-bold">f</span>
                  </div>
                  <span className="text-sm text-[#1C1C1C] flex-1">Facebook</span>
                  <ExternalLink className="w-4 h-4 text-[#7A7A7A]" />
                </a>
              )}
              {producer.website && (
                <a 
                  href={producer.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-stone-50 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-stone-800 flex items-center justify-center">
                    <Globe className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-sm text-[#1C1C1C] flex-1">Sitio web</span>
                  <ExternalLink className="w-4 h-4 text-[#7A7A7A]" />
                </a>
              )}
            </div>
          </div>
        )}
        
        {/* View Store & Contact Buttons */}
        <div className="space-y-2">
          {producer.slug && (
            <a href={`/store/${producer.slug}`} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="w-full border-[#1C1C1C] text-[#1C1C1C]">
                <Store className="w-4 h-4 mr-2" />
                Ver tienda
              </Button>
            </a>
          )}
          <Button 
            onClick={onStartChat}
            className="w-full bg-[#1C1C1C] hover:bg-[#2C2C2C]"
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            Enviar mensaje
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function InternalChat({ userType, isEmbedded = false, onClose = null, initialChatUserId = null }) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(isEmbedded);
  const [activeTab, setActiveTab] = useState('messages'); // 'messages' | 'directory'
  const [directoryType, setDirectoryType] = useState('influencers'); // 'influencers' | 'producers'
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [deletingConversation, setDeletingConversation] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  
  // Directory state
  const [influencers, setInfluencers] = useState([]);
  const [producers, setProducers] = useState([]);
  const [selectedInfluencer, setSelectedInfluencer] = useState(null);
  const [selectedProducer, setSelectedProducer] = useState(null);
  const [loadingDirectory, setLoadingDirectory] = useState(false);
  
  const messagesEndRef = useRef(null);
  const pollInterval = useRef(null);
  const imageInputRef = useRef(null);

  // Handle image selection
  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error('La imagen no puede superar 5MB');
        return;
      }
      if (!file.type.startsWith('image/')) {
        toast.error('Solo se permiten archivos de imagen');
        return;
      }
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Clear selected image
  const clearSelectedImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  };

  // Send message with optional image
  const sendMessageWithImage = async () => {
    if ((!newMessage.trim() && !selectedImage) || !activeConversation) return;
    
    setSendingMessage(true);
    try {
      let imageUrl = null;
      
      // Upload image if selected
      if (selectedImage) {
        setUploadingImage(true);
        const formData = new FormData();
        formData.append('file', selectedImage);
        formData.append('conversation_id', activeConversation.conversation_id);
        
        const uploadRes = await axios.post(
          `${API}/internal-chat/upload-image`,
          formData,
          { 
            withCredentials: true,
            headers: { 'Content-Type': 'multipart/form-data' }
          }
        );
        imageUrl = uploadRes.data.image_url;
        setUploadingImage(false);
      }
      
      // Send message
      const res = await axios.post(
        `${API}/internal-chat/messages`,
        { 
          conversation_id: activeConversation.conversation_id,
          content: newMessage || (imageUrl ? '📷 Imagen' : ''),
          image_url: imageUrl
        },
        { withCredentials: true }
      );
      
      setMessages(prev => [...prev, res.data]);
      setNewMessage('');
      clearSelectedImage();
      fetchConversations();
    } catch (err) {
      console.error('Error sending message:', err);
      toast.error('Error al enviar mensaje');
    } finally {
      setSendingMessage(false);
      setUploadingImage(false);
    }
  };

  // Initialize notification permission
  useEffect(() => {
    const checkPermission = async () => {
      if ('Notification' in window && Notification.permission === 'granted') {
        setNotificationsEnabled(true);
      }
    };
    checkPermission();
  }, []);

  // Toggle notifications
  const toggleNotifications = async () => {
    if (notificationsEnabled) {
      setNotificationsEnabled(false);
      toast.success('Notificaciones desactivadas');
    } else {
      const granted = await requestNotificationPermission();
      setNotificationsEnabled(granted);
      if (granted) {
        toast.success('Notificaciones activadas');
        showNotification('Hispaloshop', 'Recibirás notificaciones de nuevos mensajes', '/favicon.ico');
      } else {
        toast.error('No se pudo activar las notificaciones');
      }
    }
  };

  // Typing indicator state
  const [typingUser, setTypingUser] = useState(null);
  const typingTimeoutRef = useRef(null);
  const lastTypingRef = useRef(0);

  // Send typing indicator (debounced)
  const sendTypingIndicator = useCallback(() => {
    if (!wsRef.current || !activeConversation) return;
    
    const now = Date.now();
    // Only send typing indicator every 2 seconds
    if (now - lastTypingRef.current > 2000) {
      lastTypingRef.current = now;
      wsRef.current.send(JSON.stringify({
        type: 'typing',
        conversation_id: activeConversation.conversation_id
      }));
    }
  }, [activeConversation]);

  // Delete conversation
  const deleteConversation = async (conversationId) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta conversación?')) return;
    
    setDeletingConversation(conversationId);
    try {
      await axios.delete(`${API}/internal-chat/conversations/${conversationId}`, { withCredentials: true });
      setConversations(prev => prev.filter(c => c.conversation_id !== conversationId));
      if (activeConversation?.conversation_id === conversationId) {
        setActiveConversation(null);
        setMessages([]);
      }
      toast.success('Conversación eliminada');
    } catch (err) {
      console.error('Error deleting conversation:', err);
      toast.error('Error al eliminar conversación');
    } finally {
      setDeletingConversation(null);
    }
  };

  // Handle close
  const handleClose = () => {
    setIsOpen(false);
    if (onClose) onClose();
  };

  useEffect(() => {
    if ((isOpen || isEmbedded) && user) {
      fetchConversations();
      fetchDirectory();
      pollInterval.current = setInterval(fetchConversations, 10000);
    }
    return () => {
      if (pollInterval.current) clearInterval(pollInterval.current);
    };
  }, [isOpen, isEmbedded, user]);

  // Auto-start conversation when initialChatUserId is set
  useEffect(() => {
    if (initialChatUserId && user && (isOpen || isEmbedded)) {
      startConversationWith(initialChatUserId);
    }
  }, [initialChatUserId, user, isOpen, isEmbedded]);

  // WebSocket connection
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  const connectWebSocket = useCallback(() => {
    if (!user || wsRef.current?.readyState === WebSocket.OPEN) return;

    const wsUrl = `${WS_URL}/ws/chat/${user.user_id}`;
    console.log('[WS] Connecting to:', wsUrl);

    try {
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('[WS] Connected');
        // Send ping every 30 seconds to keep connection alive
        const pingInterval = setInterval(() => {
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'ping' }));
          }
        }, 30000);
        wsRef.current.pingInterval = pingInterval;
      };

      wsRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('[WS] Message received:', data.type);

        if (data.type === 'new_message') {
          // Add new message to current conversation
          if (activeConversation?.conversation_id === data.conversation_id) {
            setMessages(prev => [...prev, data.message]);
            // Mark as read since we're viewing this conversation
            wsRef.current?.send(JSON.stringify({
              type: 'read',
              conversation_id: data.conversation_id
            }));
          } else {
            // Show desktop notification for messages in other conversations
            if (notificationsEnabled && data.message?.sender_id !== user?.user_id) {
              showNotification(
                data.message?.sender_name || 'Nuevo mensaje',
                data.message?.content?.substring(0, 100) || 'Tienes un nuevo mensaje',
                null
              );
            }
          }
          // Refresh conversations list
          fetchConversations();
        } else if (data.type === 'message_read' || data.type === 'messages_read') {
          // Update message status
          setMessages(prev => prev.map(m => 
            m.conversation_id === data.conversation_id ? { ...m, status: 'read' } : m
          ));
        } else if (data.type === 'typing') {
          // Show typing indicator
          if (activeConversation?.conversation_id === data.conversation_id) {
            setTypingUser(data.user_name);
            // Clear typing indicator after 3 seconds
            if (typingTimeoutRef.current) {
              clearTimeout(typingTimeoutRef.current);
            }
            typingTimeoutRef.current = setTimeout(() => {
              setTypingUser(null);
            }, 3000);
          }
        }
      };

      wsRef.current.onclose = () => {
        console.log('[WS] Disconnected');
        if (wsRef.current?.pingInterval) {
          clearInterval(wsRef.current.pingInterval);
        }
        // Reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          if (isOpen || isEmbedded) {
            connectWebSocket();
          }
        }, 3000);
      };

      wsRef.current.onerror = (error) => {
        console.error('[WS] Error:', error);
      };
    } catch (err) {
      console.error('[WS] Connection error:', err);
    }
  }, [user, isOpen, isEmbedded, activeConversation]);

  useEffect(() => {
    if ((isOpen || isEmbedded) && user) {
      connectWebSocket();
    }

    return () => {
      if (wsRef.current) {
        if (wsRef.current.pingInterval) {
          clearInterval(wsRef.current.pingInterval);
        }
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [isOpen, isEmbedded, user, connectWebSocket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchDirectory = async () => {
    setLoadingDirectory(true);
    try {
      const [infRes, prodRes] = await Promise.all([
        axios.get(`${API}/directory/influencers`),
        axios.get(`${API}/directory/producers`)
      ]);
      setInfluencers(infRes.data || []);
      setProducers(prodRes.data || []);
    } catch (err) {
      console.error('Error fetching directory:', err);
    } finally {
      setLoadingDirectory(false);
    }
  };

  const fetchInfluencerProfile = async (influencerId) => {
    try {
      const res = await axios.get(`${API}/directory/influencers/${influencerId}`);
      setSelectedInfluencer(res.data);
    } catch (err) {
      console.error('Error fetching influencer profile:', err);
      toast.error('Error al cargar perfil');
    }
  };

  const fetchProducerProfile = async (storeId) => {
    try {
      const res = await axios.get(`${API}/directory/producers/${storeId}`);
      setSelectedProducer(res.data);
    } catch (err) {
      console.error('Error fetching producer profile:', err);
      toast.error('Error al cargar perfil');
    }
  };

  const fetchConversations = async () => {
    try {
      const res = await axios.get(`${API}/internal-chat/conversations`, { withCredentials: true });
      setConversations(res.data || []);
    } catch (err) {
      console.error('Error fetching conversations:', err);
    }
  };

  const fetchMessages = async (conversationId) => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/internal-chat/conversations/${conversationId}/messages`, { withCredentials: true });
      setMessages(res.data || []);
      // Mark as read via WebSocket
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'read',
          conversation_id: conversationId
        }));
      }
      fetchConversations();
    } catch (err) {
      console.error('Error fetching messages:', err);
      toast.error('Error al cargar mensajes');
    } finally {
      setLoading(false);
    }
  };

  const openConversation = (conv) => {
    setActiveConversation(conv);
    fetchMessages(conv.conversation_id);
    setActiveTab('messages');
  };

  const startConversationWith = async (userId) => {
    if (!user) {
      toast.error('Debes iniciar sesion');
      return;
    }
    try {
      const res = await axios.post(
        `${API}/internal-chat/start-conversation`,
        { other_user_id: userId },
        { withCredentials: true }
      );
      
      const conversationId = res.data.conversation_id;
      
      await fetchConversations();
      const convs = await axios.get(`${API}/internal-chat/conversations`, { withCredentials: true });
      const newConv = convs.data.find(c => c.conversation_id === conversationId);
      
      if (newConv) {
        setActiveConversation(newConv);
        fetchMessages(conversationId);
      }
      
      setActiveTab('messages');
      setSelectedInfluencer(null);
      setSelectedProducer(null);
      
      if (res.data.is_new) {
        toast.success('Conversacion iniciada');
      }
    } catch (err) {
      console.error('Error starting conversation:', err);
      if (err.response?.status === 401) {
        toast.error('Debes iniciar sesion');
      } else {
        toast.error(err.response?.data?.detail || 'Error al iniciar conversacion');
      }
    }
  };

  const sendMessage = async () => {
    // Use the new function that supports images
    await sendMessageWithImage();
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const totalUnread = conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0);
  const normalizedSearch = searchQuery.trim().toLowerCase();

  // Filter by search
  const filteredInfluencers = influencers.filter(inf => 
    !normalizedSearch || 
    inf.full_name?.toLowerCase().includes(normalizedSearch) ||
    inf.niche?.toLowerCase().includes(normalizedSearch)
  );

  const filteredProducers = producers.filter(prod => 
    !normalizedSearch || 
    prod.name?.toLowerCase().includes(normalizedSearch) ||
    prod.location?.toLowerCase().includes(normalizedSearch)
  );

  const filteredConversations = [...conversations]
    .filter((conv) =>
      !normalizedSearch ||
      conv.other_user_name?.toLowerCase().includes(normalizedSearch) ||
      (typeof conv.last_message === 'string'
        ? conv.last_message.toLowerCase().includes(normalizedSearch)
        : conv.last_message?.content?.toLowerCase().includes(normalizedSearch))
    )
    .sort((a, b) => {
      const unreadA = a.unread_count || 0;
      const unreadB = b.unread_count || 0;
      if ((unreadA > 0) !== (unreadB > 0)) return unreadB - unreadA;
      const timeA = new Date(a.last_message?.created_at || a.updated_at || 0).getTime();
      const timeB = new Date(b.last_message?.created_at || b.updated_at || 0).getTime();
      return timeB - timeA;
    });

  // If embedded mode and not open, return null
  if (isEmbedded && !isOpen) {
    return null;
  }

  // When embedded, the UnifiedFloatingIsland handles the button
  // When not embedded and not open, don't render anything
  if (!isOpen && !isEmbedded) {
    return null;
  }

  // When embedded but not open, return null (island handles the button)
  if (isEmbedded && !isOpen) {
    return null;
  }

  return (
    <div className={`${isEmbedded ? 'flex flex-col h-full' : 'fixed bottom-24 right-6 z-40 w-[400px] max-w-[calc(100vw-48px)] h-[550px]'} bg-white rounded-2xl shadow-2xl border border-stone-200 flex flex-col`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-stone-200 bg-[#1C1C1C] rounded-t-2xl">
        <div className="flex items-center gap-3">
          {activeConversation && activeTab === 'messages' ? (
            <button 
              onClick={() => {
                setActiveConversation(null);
                setActiveTab('messages');
              }}
              className="p-1 hover:bg-white/10 rounded-full"
            >
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>
          ) : null}
          <div>
            <h3 className="font-semibold text-white">
              {activeConversation && activeTab === 'messages'
                ? activeConversation.other_user_name
                : activeTab === 'messages'
                  ? 'Chats'
                  : 'Directorio'}
            </h3>
            <p className="text-xs text-white/70">
              {activeConversation && activeTab === 'messages' 
                ? (['producer', 'importer'].includes(activeConversation.other_user_type) ? (activeConversation.other_user_type === 'importer' ? 'Importador' : 'Productor') : 'Influencer')
                : 'Influencers y Productores/Importadores'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Notification toggle button */}
          <button
            onClick={toggleNotifications}
            className={`p-2 rounded-full transition-colors ${
              notificationsEnabled 
                ? 'bg-green-500/20 hover:bg-green-500/30' 
                : 'hover:bg-white/10'
            }`}
            title={notificationsEnabled ? 'Notificaciones activadas' : 'Activar notificaciones'}
          >
            {notificationsEnabled ? (
              <Bell className="w-5 h-5 text-green-400" />
            ) : (
              <BellOff className="w-5 h-5 text-white/60" />
            )}
          </button>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {/* Tab Navigation - Only show when not in a conversation or profile */}
      {!activeConversation && !selectedInfluencer && !selectedProducer && (
        <div className="flex border-b border-stone-200 bg-white">
          <DirectoryTab
            active={activeTab === 'messages'}
            onClick={() => setActiveTab('messages')}
            icon={MessageCircle}
            label="Chats"
            count={totalUnread}
          />
          <DirectoryTab
            active={activeTab === 'directory'}
            onClick={() => setActiveTab('directory')}
            icon={Search}
            label="Directorio"
            count={influencers.length + producers.length}
          />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Influencer Profile View */}
        {selectedInfluencer ? (
          <InfluencerProfile 
            influencer={selectedInfluencer}
            onBack={() => setSelectedInfluencer(null)}
            onStartChat={() => startConversationWith(selectedInfluencer.user_id)}
          />
        ) : selectedProducer ? (
          <ProducerProfile 
            producer={selectedProducer}
            onBack={() => setSelectedProducer(null)}
            onStartChat={() => startConversationWith(selectedProducer.producer_id)}
          />
        ) : activeConversation && activeTab === 'messages' ? (
          /* Active Conversation */
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F5F5F0] min-h-0">
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-[#7A7A7A]" />
                </div>
              ) : messages.length === 0 ? (
                <p className="text-center text-[#7A7A7A] text-sm py-8">
                  No hay mensajes. ¡Empieza la conversación!
                </p>
              ) : (
                messages.map((msg) => {
                  const isOwn = msg.sender_id === user?.user_id;
                  
                  // Message status indicator
                  const StatusIcon = () => {
                    if (!isOwn) return null;
                    
                    if (msg.status === 'read') {
                      return <CheckCheck className="w-3.5 h-3.5 text-blue-300" />;
                    } else if (msg.status === 'delivered') {
                      return <CheckCheck className="w-3.5 h-3.5 text-white/70" />;
                    } else {
                      return <Check className="w-3.5 h-3.5 text-white/70" />;
                    }
                  };
                  
                  return (
                    <div
                      key={msg.message_id}
                      className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                          isOwn
                            ? 'bg-[#2D5A27] rounded-br-md'
                            : 'bg-white rounded-bl-md border border-stone-200'
                        }`}
                      >
                        {/* Image if present */}
                        {msg.image_url && (
                          <div className="mb-2">
                            <img 
                              src={msg.image_url} 
                              alt="Imagen adjunta" 
                              className="max-w-full rounded-lg max-h-48 object-cover cursor-pointer hover:opacity-90"
                              onClick={() => window.open(msg.image_url, '_blank')}
                            />
                          </div>
                        )}
                        {msg.content && msg.content !== '📷 Imagen' && (
                          <p className={`text-sm ${isOwn ? 'text-white' : 'text-[#1A1A1A]'}`}>{msg.content}</p>
                        )}
                        <div className={`flex items-center justify-end gap-1 mt-1`}>
                          <span className={`text-xs ${isOwn ? 'text-white/80' : 'text-[#9CA3AF]'}`}>
                            {formatTime(msg.created_at)}
                          </span>
                          <StatusIcon />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              
              {/* Typing indicator */}
              {typingUser && (
                <div className="flex items-center gap-2 px-4 py-2">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-[#7A7A7A] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-[#7A7A7A] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-[#7A7A7A] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-xs text-[#7A7A7A] italic">{typingUser} está escribiendo...</span>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
            
            {/* Image Preview */}
            {imagePreview && (
              <div className="px-4 py-2 bg-stone-50 border-t border-stone-200">
                <div className="relative inline-block">
                  <img 
                    src={imagePreview} 
                    alt="Preview" 
                    className="h-20 rounded-lg object-cover"
                  />
                  <button
                    onClick={clearSelectedImage}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}
            
            {/* Message Input */}
            <div className="p-4 border-t border-stone-200 bg-white">
              {/* Hidden file input */}
              <input
                type="file"
                ref={imageInputRef}
                onChange={handleImageSelect}
                accept="image/*"
                className="hidden"
              />
              
              <div className="flex items-center gap-2">
                {/* Attach image button */}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={sendingMessage || uploadingImage}
                  className="text-[#7A7A7A] hover:text-[#1C1C1C] hover:bg-stone-100"
                  title="Adjuntar imagen"
                >
                  <Image className="w-5 h-5" />
                </Button>
                
                <Input
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value);
                    sendTypingIndicator();
                  }}
                  onKeyPress={handleKeyPress}
                  placeholder="Escribe un mensaje..."
                  disabled={sendingMessage}
                  className="flex-1 bg-white text-[#1A1A1A] border-stone-200 placeholder:text-[#9CA3AF]"
                />
                <Button
                  onClick={sendMessage}
                  disabled={sendingMessage || (!newMessage.trim() && !selectedImage)}
                  size="icon"
                  className="bg-[#2D5A27] hover:bg-[#1F4A1A]"
                >
                  {sendingMessage ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </>
        ) : (
          /* Directory Lists */
          <>
            {/* Search */}
            <div className="p-3 border-b border-stone-100 bg-white">
              {activeTab === 'directory' && (
                <div className="mb-2 inline-flex rounded-full border border-stone-200 bg-stone-50 p-0.5">
                  <button
                    onClick={() => setDirectoryType('influencers')}
                    className={`px-3 py-1 text-xs rounded-full ${directoryType === 'influencers' ? 'bg-white text-[#1C1C1C] shadow-sm' : 'text-[#7A7A7A]'}`}
                  >
                    Influencers
                  </button>
                  <button
                    onClick={() => setDirectoryType('producers')}
                    className={`px-3 py-1 text-xs rounded-full ${directoryType === 'producers' ? 'bg-white text-[#1C1C1C] shadow-sm' : 'text-[#7A7A7A]'}`}
                  >
                    Productores/Import.
                  </button>
                </div>
              )}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7A7A7A]" />
                <Input
                  placeholder={activeTab === 'messages' ? 'Buscar chats...' : directoryType === 'influencers' ? 'Buscar influencers...' : 'Buscar productores o importadores...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-stone-50 border-stone-200"
                />
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {activeTab === 'directory' && loadingDirectory ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-[#7A7A7A]" />
                </div>
              ) : activeTab === 'directory' && directoryType === 'influencers' ? (
                /* Influencers List */
                filteredInfluencers.length > 0 ? (
                  filteredInfluencers.map((inf) => (
                    <InfluencerCard 
                      key={inf.influencer_id} 
                      influencer={inf}
                      onClick={() => startConversationWith(inf.user_id || inf.influencer_id)}
                    />
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center p-4">
                    <User className="w-12 h-12 text-[#DED7CE] mb-4" />
                    <p className="text-[#7A7A7A] text-sm">No hay influencers disponibles</p>
                  </div>
                )
              ) : activeTab === 'directory' && directoryType === 'producers' ? (
                /* Producers List */
                filteredProducers.length > 0 ? (
                  filteredProducers.map((prod) => (
                    <ProducerCard 
                      key={prod.store_id} 
                      producer={prod}
                      onClick={() => startConversationWith(prod.producer_id || prod.user_id || prod.store_id)}
                    />
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center p-4">
                    <Store className="w-12 h-12 text-[#DED7CE] mb-4" />
                    <p className="text-[#7A7A7A] text-sm">No hay productores o importadores disponibles</p>
                  </div>
                )
              ) : (
                /* Conversations List */
                filteredConversations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center p-4">
                    <MessageCircle className="w-12 h-12 text-[#DED7CE] mb-4" />
                    <p className="text-[#7A7A7A] text-sm mb-2">No tienes conversaciones</p>
                    <p className="text-[#7A7A7A] text-xs">Usa Directorio para iniciar un chat</p>
                  </div>
                ) : (
                  filteredConversations.map((conv) => (
                    <div
                      key={conv.conversation_id}
                      className="group relative flex items-center gap-3 p-4 hover:bg-stone-50 transition-colors border-b border-stone-100"
                    >
                      <button
                        onClick={() => openConversation(conv)}
                        className="flex-1 flex items-center gap-3 text-left"
                      >
                        {/* Avatar with unread indicator */}
                        <div className="relative flex-shrink-0">
                          <div className="w-12 h-12 rounded-full bg-stone-200 flex items-center justify-center">
                            {['producer', 'importer'].includes(conv.other_user_type) ? (
                              <Store className="w-6 h-6 text-[#7A7A7A]" />
                            ) : (
                              <User className="w-6 h-6 text-[#7A7A7A]" />
                            )}
                          </div>
                          {/* Red dot for unread messages */}
                          {conv.unread_count > 0 && (
                            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full border-2 border-white flex items-center justify-center">
                              <span className="text-[10px] text-white font-bold">
                                {conv.unread_count > 9 ? '9+' : conv.unread_count}
                              </span>
                            </span>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <p className={`font-medium truncate ${conv.unread_count > 0 ? 'text-[#1C1C1C] font-semibold' : 'text-[#1C1C1C]'}`}>
                                {conv.other_user_name}
                              </p>
                              {/* Red dot next to name for emphasis */}
                              {conv.unread_count > 0 && (
                                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                              )}
                            </div>
                            {(conv.last_message?.created_at || conv.updated_at) && (
                              <span className={`text-xs flex-shrink-0 ${conv.unread_count > 0 ? 'text-red-500 font-medium' : 'text-[#7A7A7A]'}`}>
                                {formatTime(conv.last_message?.created_at || conv.updated_at)}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[#7A7A7A] mb-1">
                            {conv.other_user_role === 'producer' ? 'Productor' : 
                             conv.other_user_role === 'importer' ? 'Importador' : 
                             conv.other_user_role === 'influencer' ? 'Influencer' : 'Usuario'}
                          </p>
                          {conv.last_message && (
                            <p className={`text-sm truncate ${conv.unread_count > 0 ? 'text-[#1C1C1C] font-medium' : 'text-[#7A7A7A]'}`}>
                              {typeof conv.last_message === 'string' 
                                ? conv.last_message 
                                : conv.last_message?.content || ''}
                            </p>
                          )}
                        </div>
                      </button>
                      
                      {/* Delete button - visible on hover */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteConversation(conv.conversation_id);
                        }}
                        disabled={deletingConversation === conv.conversation_id}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-full hover:bg-red-50 text-[#7A7A7A] hover:text-red-500"
                        title="Eliminar conversación"
                      >
                        {deletingConversation === conv.conversation_id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  ))
                )
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}




