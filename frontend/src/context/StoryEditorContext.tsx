// @ts-nocheck
import React, { createContext, useContext, useReducer, useCallback } from 'react';

// State shape
interface TextOverlay {
  id: string;
  text: string;
  x: number;
  y: number;
  font: string;
  color: string;
  size: number;
  style: 'clean' | 'box' | 'outline';
}

interface StickerOverlay {
  id: string;
  type: 'emoji' | 'product' | 'location' | 'mention' | 'link' | 'poll';
  content: string;
  x: number;
  y: number;
  data?: any;
}

interface DrawPath {
  points: { x: number; y: number }[];
  color: string;
  width: number;
}

interface StoryEditorState {
  // Media
  mediaType: 'image' | 'video' | 'color' | null;
  mediaUrl: string | null;
  selectedBg: string;

  // Overlays
  textOverlays: TextOverlay[];
  stickerOverlays: StickerOverlay[];
  drawPaths: DrawPath[];

  // Active tool
  activeTool: 'none' | 'text' | 'sticker' | 'draw' | 'product';
  activeOverlayId: string | null;

  // Text tool state
  editingText: { font: string; color: string; size: number; style: string };

  // Draw tool state
  drawColor: string;
  drawWidth: number;
  isDrawing: boolean;

  // Filter
  filterIndex: number;
  filterIntensity: number;

  // History
  history: any[];
  historyIndex: number;

  // Publishing
  privacy: 'public' | 'followers';
  isPublishing: boolean;
  uploadProgress: number;
}

type StoryAction =
  | { type: 'SET_MEDIA'; mediaType: string; mediaUrl: string }
  | { type: 'SET_BG'; bg: string }
  | { type: 'SET_TOOL'; tool: string }
  | { type: 'ADD_TEXT'; overlay: TextOverlay }
  | { type: 'UPDATE_TEXT'; id: string; changes: Partial<TextOverlay> }
  | { type: 'REMOVE_TEXT'; id: string }
  | { type: 'ADD_STICKER'; overlay: StickerOverlay }
  | { type: 'UPDATE_STICKER'; id: string; changes: Partial<StickerOverlay> }
  | { type: 'REMOVE_STICKER'; id: string }
  | { type: 'ADD_DRAW_PATH'; path: DrawPath }
  | { type: 'SET_DRAW_COLOR'; color: string }
  | { type: 'SET_DRAW_WIDTH'; width: number }
  | { type: 'SET_DRAWING'; isDrawing: boolean }
  | { type: 'MOVE_OVERLAY'; id: string; x: number; y: number }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'SET_FILTER'; filterIndex: number; intensity?: number }
  | { type: 'SET_PRIVACY'; privacy: string }
  | { type: 'SET_PUBLISHING'; isPublishing: boolean; progress?: number }
  | { type: 'RESET' };

const initialState: StoryEditorState = {
  mediaType: null,
  mediaUrl: null,
  selectedBg: '#0c0a09',
  textOverlays: [],
  stickerOverlays: [],
  drawPaths: [],
  activeTool: 'none',
  activeOverlayId: null,
  editingText: { font: 'system-ui, sans-serif', color: '#ffffff', size: 24, style: 'clean' },
  drawColor: '#ffffff',
  drawWidth: 3,
  isDrawing: false,
  filterIndex: 0,
  filterIntensity: 100,
  history: [],
  historyIndex: -1,
  privacy: 'public',
  isPublishing: false,
  uploadProgress: 0,
};

function storyReducer(state: StoryEditorState, action: StoryAction): StoryEditorState {
  switch (action.type) {
    case 'SET_MEDIA':
      return { ...state, mediaType: action.mediaType, mediaUrl: action.mediaUrl };
    case 'SET_BG':
      return { ...state, selectedBg: action.bg, mediaType: 'color', mediaUrl: null };
    case 'SET_TOOL':
      return { ...state, activeTool: action.tool, activeOverlayId: null };
    case 'ADD_TEXT':
      return { ...state, textOverlays: [...state.textOverlays, action.overlay] };
    case 'UPDATE_TEXT':
      return { ...state, textOverlays: state.textOverlays.map(t => t.id === action.id ? { ...t, ...action.changes } : t) };
    case 'REMOVE_TEXT':
      return { ...state, textOverlays: state.textOverlays.filter(t => t.id !== action.id) };
    case 'ADD_STICKER':
      return { ...state, stickerOverlays: [...state.stickerOverlays, action.overlay] };
    case 'UPDATE_STICKER':
      return { ...state, stickerOverlays: state.stickerOverlays.map(s => s.id === action.id ? { ...s, ...action.changes } : s) };
    case 'REMOVE_STICKER':
      return { ...state, stickerOverlays: state.stickerOverlays.filter(s => s.id !== action.id) };
    case 'ADD_DRAW_PATH':
      return { ...state, drawPaths: [...state.drawPaths, action.path] };
    case 'SET_DRAW_COLOR':
      return { ...state, drawColor: action.color };
    case 'SET_DRAW_WIDTH':
      return { ...state, drawWidth: action.width };
    case 'SET_DRAWING':
      return { ...state, isDrawing: action.isDrawing };
    case 'MOVE_OVERLAY': {
      const inText = state.textOverlays.find(t => t.id === action.id);
      if (inText) return { ...state, textOverlays: state.textOverlays.map(t => t.id === action.id ? { ...t, x: action.x, y: action.y } : t) };
      return { ...state, stickerOverlays: state.stickerOverlays.map(s => s.id === action.id ? { ...s, x: action.x, y: action.y } : s) };
    }
    case 'UNDO':
      if (state.historyIndex <= 0) return state;
      return { ...state, ...state.history[state.historyIndex - 1], historyIndex: state.historyIndex - 1 };
    case 'REDO':
      if (state.historyIndex >= state.history.length - 1) return state;
      return { ...state, ...state.history[state.historyIndex + 1], historyIndex: state.historyIndex + 1 };
    case 'SET_FILTER':
      return { ...state, filterIndex: action.filterIndex, filterIntensity: action.intensity ?? state.filterIntensity };
    case 'SET_PRIVACY':
      return { ...state, privacy: action.privacy };
    case 'SET_PUBLISHING':
      return { ...state, isPublishing: action.isPublishing, uploadProgress: action.progress ?? state.uploadProgress };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

const StoryEditorContext = createContext<{
  state: StoryEditorState;
  dispatch: React.Dispatch<StoryAction>;
} | null>(null);

export function StoryEditorProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(storyReducer, initialState);
  return (
    <StoryEditorContext.Provider value={{ state, dispatch }}>
      {children}
    </StoryEditorContext.Provider>
  );
}

export function useStoryEditor() {
  const ctx = useContext(StoryEditorContext);
  if (!ctx) throw new Error('useStoryEditor must be used within StoryEditorProvider');
  return ctx;
}
