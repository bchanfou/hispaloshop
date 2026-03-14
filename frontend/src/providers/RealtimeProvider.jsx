/**
 * RealtimeProvider - Gestión de WebSocket y notificaciones en tiempo real
 * Escucha eventos del servidor y actualiza UI
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api';
import { getToken } from '../lib/auth';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const RealtimeContext = createContext(null);

export function RealtimeProvider({ children }) {
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Connect WebSocket if user is already logged in at app startup
  useEffect(() => {
    if (getToken()) {
      api.connectWebSocket();
    }
  }, []);

  // Manejar mensajes WebSocket
  useEffect(() => {
    const handleNotification = (payload) => {
      // Mostrar toast
      toast(payload.title, {
        description: payload.body,
        duration: 5000,
      });

      // Actualizar contador
      if (!payload.read) {
        setUnreadCount(prev => prev + 1);
      }

      // Invalidar cache de notificaciones
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    };

    const handleMessage = (payload) => {
      // Nuevo mensaje de HI o chat
      queryClient.invalidateQueries({ queryKey: ['hi', 'conversations'] });
      queryClient.invalidateQueries({ queryKey: ['hi', 'conversation'] });
    };

    const handleOrderUpdate = (payload) => {
      // Actualizar estado de pedido
      queryClient.invalidateQueries({ 
        queryKey: ['order', payload.orderId] 
      });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      
      toast.success(`Pedido #${payload.orderId}: ${payload.status}`);
    };

    const handleNewFollower = (payload) => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
      toast.success(`${payload.followerName} ahora te sigue`);
    };

    const handleStoryView = (payload) => {
      // Actualizar stats de story
      queryClient.invalidateQueries({ 
        queryKey: ['story', payload.storyId, 'views'] 
      });
    };

    const handlePriceDrop = (payload) => {
      toast(`${payload.productName} bajó de precio`, {
        description: `Antes: €${payload.oldPrice} → Ahora: €${payload.newPrice}`,
        action: {
          label: 'Ver',
          onClick: () => window.location.href = `/products/${payload.productId}`,
        },
      });
    };

    const handleConnected = () => {
      setIsConnected(true);
    };

    const handleDisconnected = () => {
      setIsConnected(false);
    };

    // Subscribirse a eventos
    const unsubscribers = [
      api.on('connected', handleConnected),
      api.on('disconnected', handleDisconnected),
      api.on('notification', handleNotification),
      api.on('message', handleMessage),
      api.on('order_update', handleOrderUpdate),
      api.on('new_follower', handleNewFollower),
      api.on('story_view', handleStoryView),
      api.on('price_drop', handlePriceDrop),
    ];

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [queryClient]);

  // Enviar typing indicator
  const sendTyping = useCallback((conversationId, isTyping) => {
    api.send('typing', { conversationId, isTyping });
  }, []);

  // Enviar mensaje chat
  const sendChatMessage = useCallback((conversationId, message) => {
    api.send('chat_message', { conversationId, message });
  }, []);

  // Marcar notificaciones como leídas
  const clearUnreadCount = useCallback(() => {
    setUnreadCount(0);
  }, []);

  const value = {
    isConnected,
    unreadCount,
    clearUnreadCount,
    sendTyping,
    sendChatMessage,
  };

  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime() {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtime must be used within RealtimeProvider');
  }
  return context;
}

export default RealtimeProvider;
