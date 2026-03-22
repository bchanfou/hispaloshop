// @ts-nocheck
import React, { createContext, useContext, useReducer } from 'react';

// ── State types ──────────────────────────────────────────────

interface VideoState {
  url: string | null;
  file: File | null;
  duration: number;
  trimStart: number;
  trimEnd: number;
}

interface PlaybackState {
  playing: boolean;
  currentTime: number;
  speed: number;
  muted: boolean;
  volume: number;
}

interface FilterState {
  activeFilter: string;
  intensity: number;
  adjustments: Record<string, number>;
}

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

interface OverlaysState {
  textOverlays: TextOverlay[];
}

interface CoverState {
  coverIndex: number;
  customCoverUrl: string | null;
}

interface TaggedProduct {
  id: string;
  name: string;
  price: number;
  image?: string;
}

interface DetailsState {
  caption: string;
  location: string;
  privacy: 'public' | 'followers';
  taggedProducts: TaggedProduct[];
}

interface PublishingState {
  isPublishing: boolean;
  progress: number;
}

interface ReelEditorState {
  video: VideoState;
  playback: PlaybackState;
  filter: FilterState;
  overlays: OverlaysState;
  cover: CoverState;
  details: DetailsState;
  publishing: PublishingState;
}

// ── Actions ──────────────────────────────────────────────────

type ReelAction =
  | { type: 'SET_VIDEO'; url: string; file: File; duration: number }
  | { type: 'SET_TRIM'; trimStart: number; trimEnd: number }
  | { type: 'SET_SPEED'; speed: number }
  | { type: 'SET_MUTED'; muted: boolean }
  | { type: 'SET_VOLUME'; volume: number }
  | { type: 'SET_FILTER'; activeFilter: string }
  | { type: 'SET_INTENSITY'; intensity: number }
  | { type: 'SET_ADJUSTMENT'; key: string; value: number }
  | { type: 'ADD_TEXT'; overlay: TextOverlay }
  | { type: 'UPDATE_TEXT'; id: string; changes: Partial<TextOverlay> }
  | { type: 'REMOVE_TEXT'; id: string }
  | { type: 'MOVE_TEXT'; id: string; x: number; y: number }
  | { type: 'SET_COVER'; coverIndex?: number; customCoverUrl?: string }
  | { type: 'SET_CAPTION'; caption: string }
  | { type: 'SET_LOCATION'; location: string }
  | { type: 'SET_PRIVACY'; privacy: 'public' | 'followers' }
  | { type: 'ADD_PRODUCT'; product: TaggedProduct }
  | { type: 'REMOVE_PRODUCT'; productId: string }
  | { type: 'SET_PUBLISHING'; isPublishing: boolean; progress?: number }
  | { type: 'RESET' };

// ── Initial state ────────────────────────────────────────────

const initialState: ReelEditorState = {
  video: {
    url: null,
    file: null,
    duration: 0,
    trimStart: 0,
    trimEnd: 0,
  },
  playback: {
    playing: false,
    currentTime: 0,
    speed: 1,
    muted: false,
    volume: 1,
  },
  filter: {
    activeFilter: 'none',
    intensity: 100,
    adjustments: {},
  },
  overlays: {
    textOverlays: [],
  },
  cover: {
    coverIndex: 0,
    customCoverUrl: null,
  },
  details: {
    caption: '',
    location: '',
    privacy: 'public',
    taggedProducts: [],
  },
  publishing: {
    isPublishing: false,
    progress: 0,
  },
};

// ── Reducer ──────────────────────────────────────────────────

function reelReducer(state: ReelEditorState, action: ReelAction): ReelEditorState {
  switch (action.type) {
    case 'SET_VIDEO':
      return {
        ...state,
        video: {
          url: action.url,
          file: action.file,
          duration: action.duration,
          trimStart: 0,
          trimEnd: action.duration,
        },
      };

    case 'SET_TRIM':
      return {
        ...state,
        video: { ...state.video, trimStart: action.trimStart, trimEnd: action.trimEnd },
      };

    case 'SET_SPEED':
      return {
        ...state,
        playback: { ...state.playback, speed: action.speed },
      };

    case 'SET_MUTED':
      return {
        ...state,
        playback: { ...state.playback, muted: action.muted },
      };

    case 'SET_VOLUME':
      return {
        ...state,
        playback: { ...state.playback, volume: action.volume },
      };

    case 'SET_FILTER':
      return {
        ...state,
        filter: { ...state.filter, activeFilter: action.activeFilter },
      };

    case 'SET_INTENSITY':
      return {
        ...state,
        filter: { ...state.filter, intensity: action.intensity },
      };

    case 'SET_ADJUSTMENT':
      return {
        ...state,
        filter: {
          ...state.filter,
          adjustments: { ...state.filter.adjustments, [action.key]: action.value },
        },
      };

    case 'ADD_TEXT':
      return {
        ...state,
        overlays: {
          ...state.overlays,
          textOverlays: [...state.overlays.textOverlays, action.overlay],
        },
      };

    case 'UPDATE_TEXT':
      return {
        ...state,
        overlays: {
          ...state.overlays,
          textOverlays: state.overlays.textOverlays.map(t =>
            t.id === action.id ? { ...t, ...action.changes } : t
          ),
        },
      };

    case 'REMOVE_TEXT':
      return {
        ...state,
        overlays: {
          ...state.overlays,
          textOverlays: state.overlays.textOverlays.filter(t => t.id !== action.id),
        },
      };

    case 'MOVE_TEXT':
      return {
        ...state,
        overlays: {
          ...state.overlays,
          textOverlays: state.overlays.textOverlays.map(t =>
            t.id === action.id ? { ...t, x: action.x, y: action.y } : t
          ),
        },
      };

    case 'SET_COVER':
      return {
        ...state,
        cover: {
          coverIndex: action.coverIndex ?? state.cover.coverIndex,
          customCoverUrl: action.customCoverUrl ?? state.cover.customCoverUrl,
        },
      };

    case 'SET_CAPTION':
      return {
        ...state,
        details: { ...state.details, caption: action.caption },
      };

    case 'SET_LOCATION':
      return {
        ...state,
        details: { ...state.details, location: action.location },
      };

    case 'SET_PRIVACY':
      return {
        ...state,
        details: { ...state.details, privacy: action.privacy },
      };

    case 'ADD_PRODUCT':
      return {
        ...state,
        details: {
          ...state.details,
          taggedProducts: [...state.details.taggedProducts, action.product],
        },
      };

    case 'REMOVE_PRODUCT':
      return {
        ...state,
        details: {
          ...state.details,
          taggedProducts: state.details.taggedProducts.filter(p => p.id !== action.productId),
        },
      };

    case 'SET_PUBLISHING':
      return {
        ...state,
        publishing: {
          isPublishing: action.isPublishing,
          progress: action.progress ?? state.publishing.progress,
        },
      };

    case 'RESET':
      return initialState;

    default:
      return state;
  }
}

// ── Context ──────────────────────────────────────────────────

const ReelEditorContext = createContext<{
  state: ReelEditorState;
  dispatch: React.Dispatch<ReelAction>;
} | null>(null);

export function ReelEditorProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reelReducer, initialState);
  return (
    <ReelEditorContext.Provider value={{ state, dispatch }}>
      {children}
    </ReelEditorContext.Provider>
  );
}

export function useReelEditor() {
  const ctx = useContext(ReelEditorContext);
  if (!ctx) throw new Error('useReelEditor must be used within ReelEditorProvider');
  return ctx;
}
