/**
 * Sistema de caché offline para posts y feed
 * Usa localStorage como fallback y indexedDB si está disponible
 */

import { getApiUrl } from '../utils/api';

const CACHE_VERSION = 'v1';
const CACHE_PREFIX = `hispaloshop_${CACHE_VERSION}_`;
const MAX_CACHE_AGE = 24 * 60 * 60 * 1000; // 24 horas
const MAX_ITEMS = 100;

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  url: string;
}

interface CachedFeedItem {
  id: string;
  type: string;
  caption?: string;
  image_url?: string;
  video_url?: string;
  user_name?: string;
  user_profile_image?: string;
  likes_count?: number;
  comments_count?: number;
  created_at?: string;
}

class OfflineCache {
  private storage: Storage;
  private memoryCache: Map<string, CacheEntry<any>>;

  constructor() {
    this.storage = localStorage;
    this.memoryCache = new Map();
  }

  private getKey(url: string): string {
    return `${CACHE_PREFIX}${btoa(url)}`;
  }

  /**
   * Guarda datos en caché
   */
  set<T>(url: string, data: T): void {
    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        url
      };

      // Guardar en memoria
      this.memoryCache.set(url, entry);

      // Guardar en localStorage (con manejo de quota exceeded)
      const key = this.getKey(url);
      const serialized = JSON.stringify(entry);
      
      try {
        this.storage.setItem(key, serialized);
      } catch (e) {
        // Si excede quota, limpiar caché vieja
        if (e instanceof DOMException && e.name === 'QuotaExceededError') {
          this.cleanup();
          try {
            this.storage.setItem(key, serialized);
          } catch {
            // Si aún falla, solo usar memoria
          }
        }
      }
    } catch (error) {
      console.warn('[OfflineCache] Error saving to cache:', error);
    }
  }

  /**
   * Obtiene datos de caché
   */
  get<T>(url: string): T | null {
    // Primero intentar memoria
    const memoryEntry = this.memoryCache.get(url);
    if (memoryEntry && !this.isExpired(memoryEntry)) {
      return memoryEntry.data;
    }

    // Luego localStorage
    try {
      const key = this.getKey(url);
      const serialized = this.storage.getItem(key);
      
      if (!serialized) return null;

      const entry: CacheEntry<T> = JSON.parse(serialized);
      
      if (this.isExpired(entry)) {
        this.remove(url);
        return null;
      }

      // Actualizar memoria
      this.memoryCache.set(url, entry);
      
      return entry.data;
    } catch (error) {
      console.warn('[OfflineCache] Error reading from cache:', error);
      return null;
    }
  }

  /**
   * Verifica si la entrada está expirada
   */
  private isExpired<T>(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.timestamp > MAX_CACHE_AGE;
  }

  /**
   * Elimina una entrada del caché
   */
  remove(url: string): void {
    this.memoryCache.delete(url);
    try {
      this.storage.removeItem(this.getKey(url));
    } catch {
      // Ignorar errores
    }
  }

  /**
   * Limpia caché expirado y mantiene solo los items más recientes
   */
  cleanup(): void {
    try {
      const keys: { key: string; timestamp: number }[] = [];
      
      // Recopilar todas las entradas válidas
      for (let i = 0; i < this.storage.length; i++) {
        const key = this.storage.key(i);
        if (key?.startsWith(CACHE_PREFIX)) {
          try {
            const entry = JSON.parse(this.storage.getItem(key) || '');
            if (!this.isExpired(entry)) {
              keys.push({ key, timestamp: entry.timestamp });
            } else {
              this.storage.removeItem(key);
            }
          } catch {
            this.storage.removeItem(key);
          }
        }
      }

      // Si hay más de MAX_ITEMS, eliminar los más viejos
      if (keys.length > MAX_ITEMS) {
        keys.sort((a, b) => b.timestamp - a.timestamp);
        const toRemove = keys.slice(MAX_ITEMS);
        toRemove.forEach(({ key }) => this.storage.removeItem(key));
      }
    } catch (error) {
      console.warn('[OfflineCache] Error during cleanup:', error);
    }
  }

  /**
   * Limpia todo el caché
   */
  clear(): void {
    this.memoryCache.clear();
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < this.storage.length; i++) {
        const key = this.storage.key(i);
        if (key?.startsWith(CACHE_PREFIX)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => this.storage.removeItem(key));
    } catch (error) {
      console.warn('[OfflineCache] Error clearing cache:', error);
    }
  }

  /**
   * Guarda el feed actual para acceso offline
   */
  cacheFeed(feedType: 'forYou' | 'following', items: CachedFeedItem[]): void {
    const url = `${getApiUrl()}/feed/${feedType === 'forYou' ? 'foryou' : 'following'}`;
    this.set(url, {
      items,
      cachedAt: Date.now(),
      type: feedType
    });
  }

  /**
   * Obtiene el feed cacheado
   */
  getCachedFeed(feedType: 'forYou' | 'following'): { items: CachedFeedItem[]; cachedAt: number } | null {
    const url = `${getApiUrl()}/feed/${feedType === 'forYou' ? 'foryou' : 'following'}`;
    return this.get(url);
  }

  /**
   * Verifica si hay contenido cacheado disponible
   */
  hasCachedContent(): boolean {
    const forYou = this.getCachedFeed('forYou');
    const following = this.getCachedFeed('following');
    return !!(forYou?.items?.length || following?.items?.length);
  }

  /**
   * Obtiene estadísticas del caché
   */
  getStats(): { totalItems: number; memoryItems: number; oldestItem: Date | null } {
    let totalItems = 0;
    let oldestTimestamp = Infinity;

    for (let i = 0; i < this.storage.length; i++) {
      const key = this.storage.key(i);
      if (key?.startsWith(CACHE_PREFIX)) {
        totalItems++;
        try {
          const entry = JSON.parse(this.storage.getItem(key) || '');
          if (entry.timestamp < oldestTimestamp) {
            oldestTimestamp = entry.timestamp;
          }
        } catch {}
      }
    }

    return {
      totalItems,
      memoryItems: this.memoryCache.size,
      oldestItem: oldestTimestamp !== Infinity ? new Date(oldestTimestamp) : null
    };
  }
}

// Singleton instance
export const offlineCache = new OfflineCache();

export default offlineCache;
