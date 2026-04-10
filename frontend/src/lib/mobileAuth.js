/**
 * Mobile Auth Utilities
 * Handles OAuth flows for hybrid mobile apps (Capacitor, Ionic, Cordova)
 * and provides fallbacks for web browsers.
 */

import { getApiUrl } from '../utils/api';

const API_BASE_URL = getApiUrl();

/**
 * Detect if running in a Capacitor/Cordova hybrid app
 */
export function isHybridApp() {
  if (typeof window === 'undefined') return false;
  
  // Check for Capacitor
  const hasCapacitor = window.Capacitor !== undefined || 
                       window.capacitor !== undefined ||
                       (window.androidBridge !== undefined) ||
                       (window.webkit && window.webkit.messageHandlers);
  
  // Check for Cordova
  const hasCordova = window.cordova !== undefined || 
                     window.Cordova !== undefined;
  
  return hasCapacitor || hasCordova;
}

/**
 * Detect platform
 */
export function getPlatform() {
  if (typeof window === 'undefined') return 'web';
  
  const userAgent = navigator.userAgent || navigator.vendor || window.opera || '';
  
  if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) {
    return 'ios';
  }
  if (/Android/.test(userAgent)) {
    return 'android';
  }
  return 'web';
}

/**
 * Open OAuth URL using appropriate method for platform
 * - Web: Redirect current window
 * - Hybrid iOS/Android: Use InAppBrowser or system browser with deep link callback
 */
export async function openOAuthUrl(url, options = {}) {
  const { onSuccess, onError, onCancel } = options;
  const platform = getPlatform();
  const isHybrid = isHybridApp();
  
  // For web, use standard redirect
  if (!isHybrid) {
    window.location.href = url;
    return;
  }
  
  // For hybrid apps, use InAppBrowser if available
  try {
    // Check for Capacitor Browser plugin
    if (window.Capacitor?.Plugins?.Browser) {
      const { Browser } = window.Capacitor.Plugins;
      
      // Add deep link callback URL
      const callbackUrl = 'hispaloshop://auth/callback';
      const urlWithCallback = new URL(url);
      urlWithCallback.searchParams.set('redirect_uri', callbackUrl);
      
      // Listen for browser finished event
      Browser.addListener('browserFinished', () => {
        onCancel?.();
      });
      
      await Browser.open({ url: urlWithCallback.toString() });
      return;
    }
    
    // Check for Cordova InAppBrowser
    if (window.cordova?.InAppBrowser) {
      const ref = window.cordova.InAppBrowser.open(
        url,
        '_blank',
        'location=yes,hidenavigationbuttons=no,toolbarcolor=#1C1C1C,clearcache=no,clearsessioncache=no'
      );
      
      ref.addEventListener('loadstart', (event) => {
        const url = event.url;
        
        // Check for success callback
        if (url.includes('hispaloshop://auth/callback') || 
            url.includes('/auth/callback?token=')) {
          ref.close();
          
          // Extract token from URL
          const urlObj = new URL(url);
          const token = urlObj.searchParams.get('token');
          const error = urlObj.searchParams.get('error');
          
          if (token) {
            onSuccess?.({ token });
          } else if (error) {
            onError?.(new Error(error));
          }
        }
        
        // Check for cancel
        if (url.includes('auth/callback?error=access_denied') ||
            url.includes('auth/callback?error=cancelled')) {
          ref.close();
          onCancel?.();
        }
      });
      
      ref.addEventListener('exit', () => {
        onCancel?.();
      });
      
      return;
    }
    
    // Fallback: Try to use system browser with custom URL scheme
    if (platform === 'ios' || platform === 'android') {
      // Add deep link callback
      const urlWithCallback = new URL(url);
      urlWithCallback.searchParams.set('redirect_uri', 'hispaloshop://auth/callback');
      
      window.location.href = urlWithCallback.toString();
      return;
    }
    
    // Final fallback: standard redirect
    window.location.href = url;
    
  } catch (error) {
    console.error('[mobileAuth] Error opening OAuth:', error);
    // Fallback to standard redirect
    window.location.href = url;
  }
}

/**
 * Handle deep link callback for OAuth
 * Call this from your deep link handler (e.g., App component)
 */
export function handleDeepLink(url, options = {}) {
  const { onAuthSuccess, onAuthError } = options;
  
  if (!url) return false;
  
  // Check if this is an auth callback
  if (url.includes('hispaloshop://auth/callback') ||
      url.includes('/auth/callback')) {
    try {
      const urlObj = new URL(url);
      const token = urlObj.searchParams.get('token');
      const error = urlObj.searchParams.get('error');
      
      if (token) {
        onAuthSuccess?.({ token });
        return true;
      }
      
      if (error) {
        onAuthError?.(new Error(decodeURIComponent(error)));
        return true;
      }
    } catch (e) {
      console.error('[mobileAuth] Error parsing deep link:', e);
    }
  }
  
  return false;
}

/**
 * Initialize Apple Sign-In
 * Uses Sign in with Apple JS on web, or native plugin on hybrid apps
 */
export async function initAppleSignIn(options = {}) {
  const { onSuccess, onError } = options;
  const isHybrid = isHybridApp();
  const platform = getPlatform();
  
  try {
    // For hybrid iOS apps, use native Sign in with Apple
    if (isHybrid && platform === 'ios') {
      // Check for Capacitor Sign in with Apple plugin
      if (window.Capacitor?.Plugins?.SignInWithApple) {
        const { SignInWithApple } = window.Capacitor.Plugins;
        
        const result = await SignInWithApple.authorize({
          clientId: 'com.hispaloshop.app',
          scopes: 'email name',
          redirectURI: 'https://api.hispaloshop.com/api/auth/apple/callback',
        });
        
        // Send identity token/code to dedicated mobile verify endpoint.
        const response = await fetch(`${API_BASE_URL}/auth/apple/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: result.response.authorizationCode,
            id_token: result.response.identityToken,
          }),
        });
        
        const data = await response.json();
        
        if (data.token || data.session_token) {
          onSuccess?.(data);
        } else {
          onError?.(new Error('Apple sign in failed'));
        }
        return;
      }
    }
    
    // For web and Android, use Apple's JS SDK or OAuth flow
    // Fallback to redirect-based Apple OAuth
    const appleAuthUrl = `${API_BASE_URL}/auth/apple/url`;
    const response = await fetch(appleAuthUrl);
    const { auth_url } = await response.json();
    
    if (auth_url) {
      openOAuthUrl(auth_url, { onSuccess: onSuccess, onError });
    } else {
      throw new Error('Apple auth URL not available');
    }
    
  } catch (error) {
    console.error('[mobileAuth] Apple Sign-In error:', error);
    onError?.(error);
  }
}

/**
 * Initialize Google Sign-In with mobile support
 */
export async function initGoogleSignIn(options = {}) {
  const { onSuccess, onError, onCancel } = options;
  
  try {
    const response = await fetch(`${API_BASE_URL}/auth/google/url`);
    const data = await response.json();
    
    if (data.auth_url) {
      await openOAuthUrl(data.auth_url, { onSuccess, onError, onCancel });
    } else {
      throw new Error('Google auth URL not available');
    }
  } catch (error) {
    console.error('[mobileAuth] Google Sign-In error:', error);
    onError?.(error);
  }
}

/**
 * Setup deep link listener for the app
 * Call this once when the app initializes
 */
export function setupDeepLinkListener(options = {}) {
  const { onAuthSuccess, onAuthError } = options;
  
  if (typeof window === 'undefined') return;
  
  // Handle initial deep link (app opened via URL)
  const handleInitialUrl = () => {
    const url = window.location.href;
    handleDeepLink(url, { onAuthSuccess, onAuthError });
  };
  
  // Handle deep links while app is running
  const handleUrlChange = () => {
    const url = window.location.href;
    handleDeepLink(url, { onAuthSuccess, onAuthError });
  };
  
  // Listen for hash changes (used by some OAuth flows)
  window.addEventListener('hashchange', handleUrlChange);
  
  // For Capacitor, listen for appUrlOpen event
  if (window.Capacitor?.Plugins?.App) {
    const { App } = window.Capacitor.Plugins;
    App.addListener('appUrlOpen', (data) => {
      handleDeepLink(data.url, { onAuthSuccess, onAuthError });
    });
  }
  
  // Check initial URL
  handleInitialUrl();
  
  // Return cleanup function
  return () => {
    window.removeEventListener('hashchange', handleUrlChange);
  };
}

export default {
  isHybridApp,
  getPlatform,
  openOAuthUrl,
  handleDeepLink,
  initAppleSignIn,
  initGoogleSignIn,
  setupDeepLinkListener,
};
