// @ts-nocheck
import React, { createContext, useContext, useReducer } from 'react';

// ── State types ──────────────────────────────────────────────

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

interface TaggedProduct {
  id: string;
  name: string;
  price: number;
  image?: string;
}

interface PerImageFilterSettings {
  brightness: number;
  contrast: number;
  saturate: number;
  warmth: number;
  sharpness: number;
  shadows: number;
  highlights: number;
  vignette: number;
}

interface ImagesState {
  files: File[];
  previewUrls: string[];
  activeIndex: number;
}

interface FilterState {
  activeFilter: string;
  intensity: number;
  perImageSettings: Record<number, Partial<PerImageFilterSettings>>;
}

interface AdjustmentsState {
  brightness: number;
  contrast: number;
  saturate: number;
  warmth: number;
  sharpness: number;
  shadows: number;
  highlights: number;
  vignette: number;
}

interface OverlaysState {
  textOverlays: TextOverlay[];
}

interface CropState {
  aspectRatio: string;
}

interface DetailsState {
  caption: string;
  location: string;
  privacy: 'public' | 'followers';
  hideComments: boolean;
  hideLikes: boolean;
  taggedProducts: TaggedProduct[];
}

interface PublishingState {
  isPublishing: boolean;
  progress: number;
}

interface PostEditorState {
  images: ImagesState;
  filter: FilterState;
  adjustments: AdjustmentsState;
  overlays: OverlaysState;
  crop: CropState;
  details: DetailsState;
  step: number; // 0=upload, 1=edit, 2=details
  publishing: PublishingState;
}

// ── Actions ──────────────────────────────────────────────────

type PostAction =
  | { type: 'SET_FILES'; files: File[]; previewUrls: string[] }
  | { type: 'SET_ACTIVE_INDEX'; index: number }
  | { type: 'SET_FILTER'; activeFilter: string }
  | { type: 'SET_INTENSITY'; intensity: number }
  | { type: 'SET_ADJUSTMENT'; key: string; value: number }
  | { type: 'SET_PER_IMAGE'; index: number; settings: Partial<PerImageFilterSettings> }
  | { type: 'ADD_TEXT'; overlay: TextOverlay }
  | { type: 'UPDATE_TEXT'; id: string; changes: Partial<TextOverlay> }
  | { type: 'REMOVE_TEXT'; id: string }
  | { type: 'MOVE_TEXT'; id: string; x: number; y: number }
  | { type: 'SET_CROP'; aspectRatio: string }
  | { type: 'SET_CAPTION'; caption: string }
  | { type: 'SET_LOCATION'; location: string }
  | { type: 'SET_PRIVACY'; privacy: 'public' | 'followers' }
  | { type: 'SET_STEP'; step: number }
  | { type: 'ADD_PRODUCT'; product: TaggedProduct }
  | { type: 'REMOVE_PRODUCT'; productId: string }
  | { type: 'SET_PUBLISHING'; isPublishing: boolean; progress?: number }
  | { type: 'RESET' };

// ── Initial state ────────────────────────────────────────────

const initialState: PostEditorState = {
  images: {
    files: [],
    previewUrls: [],
    activeIndex: 0,
  },
  filter: {
    activeFilter: 'none',
    intensity: 100,
    perImageSettings: {},
  },
  adjustments: {
    brightness: 100,
    contrast: 100,
    saturate: 100,
    warmth: 0,
    sharpness: 0,
    shadows: 0,
    highlights: 0,
    vignette: 0,
  },
  overlays: {
    textOverlays: [],
  },
  crop: {
    aspectRatio: 'original',
  },
  details: {
    caption: '',
    location: '',
    privacy: 'public',
    hideComments: false,
    hideLikes: false,
    taggedProducts: [],
  },
  step: 0,
  publishing: {
    isPublishing: false,
    progress: 0,
  },
};

// ── Reducer ──────────────────────────────────────────────────

function postReducer(state: PostEditorState, action: PostAction): PostEditorState {
  switch (action.type) {
    case 'SET_FILES':
      return {
        ...state,
        images: {
          files: action.files,
          previewUrls: action.previewUrls,
          activeIndex: 0,
        },
        filter: { ...state.filter, perImageSettings: {} },
      };

    case 'SET_ACTIVE_INDEX':
      return {
        ...state,
        images: { ...state.images, activeIndex: action.index },
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
        adjustments: { ...state.adjustments, [action.key]: action.value },
      };

    case 'SET_PER_IMAGE':
      return {
        ...state,
        filter: {
          ...state.filter,
          perImageSettings: {
            ...state.filter.perImageSettings,
            [action.index]: {
              ...state.filter.perImageSettings[action.index],
              ...action.settings,
            },
          },
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

    case 'SET_CROP':
      return {
        ...state,
        crop: { aspectRatio: action.aspectRatio },
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

    case 'SET_STEP':
      return { ...state, step: action.step };

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

const PostEditorContext = createContext<{
  state: PostEditorState;
  dispatch: React.Dispatch<PostAction>;
} | null>(null);

export function PostEditorProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(postReducer, initialState);
  return (
    <PostEditorContext.Provider value={{ state, dispatch }}>
      {children}
    </PostEditorContext.Provider>
  );
}

export function usePostEditor() {
  const ctx = useContext(PostEditorContext);
  if (!ctx) throw new Error('usePostEditor must be used within PostEditorProvider');
  return ctx;
}
