import { createContext, useContext, useReducer, ReactNode } from 'react';
import type { Plate, Annotation, RectangleAnnotation, CircleAnnotation, PolygonAnnotation, Point } from '../types';
import { initialState, State } from './mockData';
import { v4 as uuidv4 } from 'uuid';

type Action =
  | { type: 'SELECT_PLATE'; payload: string | null }
  | { type: 'SELECT_ANNOTATION'; payload: string | null }
  | { type: 'ADD_PLATE'; payload: Omit<Plate, 'id' | 'createdAt' | 'updatedAt' | 'status'> }
  | { type: 'UPDATE_PLATE'; payload: { id: string; data: Partial<Plate> } }
  | { type: 'DELETE_PLATE'; payload: string }
  | { type: 'ADD_RECT_ANNOTATION'; payload: Omit<RectangleAnnotation, 'id' | 'createdAt' | 'updatedAt' | 'reviewStatus'> }
  | { type: 'ADD_CIRCLE_ANNOTATION'; payload: Omit<CircleAnnotation, 'id' | 'createdAt' | 'updatedAt' | 'reviewStatus'> }
  | { type: 'ADD_POLYGON_ANNOTATION'; payload: Omit<PolygonAnnotation, 'id' | 'createdAt' | 'updatedAt' | 'reviewStatus'> }
  | { type: 'UPDATE_ANNOTATION'; payload: { id: string; data: Partial<Annotation> } }
  | { type: 'DELETE_ANNOTATION'; payload: string }
  | { type: 'MOVE_ANNOTATION'; payload: { id: string; x: number; y: number } }
  | { type: 'RESIZE_RECT_ANNOTATION'; payload: { id: string; x?: number; y?: number; width?: number; height?: number } }
  | { type: 'RESIZE_CIRCLE_ANNOTATION'; payload: { id: string; x?: number; y?: number; radius?: number } };

function reducer(state: State, action: Action): State {
  const now = new Date().toISOString();

  switch (action.type) {
    case 'SELECT_PLATE':
      return { ...state, selectedPlateId: action.payload, selectedAnnotationId: null };

    case 'SELECT_ANNOTATION':
      return { ...state, selectedAnnotationId: action.payload };

    case 'ADD_PLATE': {
      const newPlate: Plate = {
        ...action.payload,
        id: uuidv4(),
        status: 'active',
        createdAt: now,
        updatedAt: now,
      };
      return { ...state, plates: [...state.plates, newPlate], selectedPlateId: newPlate.id };
    }

    case 'UPDATE_PLATE':
      return {
        ...state,
        plates: state.plates.map((p) =>
          p.id === action.payload.id ? { ...p, ...action.payload.data, updatedAt: now } : p
        ),
      };

    case 'DELETE_PLATE':
      return {
        ...state,
        plates: state.plates.filter((p) => p.id !== action.payload),
        annotations: state.annotations.filter((a) => a.plateId !== action.payload),
        selectedPlateId: state.selectedPlateId === action.payload ? null : state.selectedPlateId,
        selectedAnnotationId: null,
      };

    case 'ADD_RECT_ANNOTATION': {
      const newAnnotation: RectangleAnnotation = {
        ...action.payload,
        id: uuidv4(),
        reviewStatus: 'pending',
        createdAt: now,
        updatedAt: now,
      };
      return {
        ...state,
        annotations: [...state.annotations, newAnnotation as Annotation],
        selectedAnnotationId: newAnnotation.id,
      };
    }

    case 'ADD_CIRCLE_ANNOTATION': {
      const newAnnotation: CircleAnnotation = {
        ...action.payload,
        id: uuidv4(),
        reviewStatus: 'pending',
        createdAt: now,
        updatedAt: now,
      };
      return {
        ...state,
        annotations: [...state.annotations, newAnnotation as Annotation],
        selectedAnnotationId: newAnnotation.id,
      };
    }

    case 'ADD_POLYGON_ANNOTATION': {
      const newAnnotation: PolygonAnnotation = {
        ...action.payload,
        id: uuidv4(),
        reviewStatus: 'pending',
        createdAt: now,
        updatedAt: now,
      };
      return {
        ...state,
        annotations: [...state.annotations, newAnnotation as Annotation],
        selectedAnnotationId: newAnnotation.id,
      };
    }

    case 'UPDATE_ANNOTATION':
      return {
        ...state,
        annotations: state.annotations.map((a) =>
          a.id === action.payload.id ? ({ ...a, ...action.payload.data, updatedAt: now } as Annotation) : a
        ),
      };

    case 'DELETE_ANNOTATION':
      return {
        ...state,
        annotations: state.annotations.filter((a) => a.id !== action.payload),
        selectedAnnotationId: state.selectedAnnotationId === action.payload ? null : state.selectedAnnotationId,
      };

    case 'MOVE_ANNOTATION': {
      const ann = state.annotations.find((a) => a.id === action.payload.id);
      if (!ann) return state;

      const dx = action.payload.x;
      const dy = action.payload.y;

      if (ann.shape === 'polygon') {
        const newPoints: Point[] = ann.points.map((p) => ({ x: p.x + dx, y: p.y + dy }));
        return {
          ...state,
          annotations: state.annotations.map((a) =>
            a.id === action.payload.id ? ({ ...a, points: newPoints, updatedAt: now } as Annotation) : a
          ),
        };
      }

      return {
        ...state,
        annotations: state.annotations.map((a) =>
          a.id === action.payload.id
            ? ({ ...a, x: (a as any).x + dx, y: (a as any).y + dy, updatedAt: now } as Annotation)
            : a
        ),
      };
    }

    case 'RESIZE_RECT_ANNOTATION':
      return {
        ...state,
        annotations: state.annotations.map((a) =>
          a.id === action.payload.id
            ? ({
                ...a,
                x: action.payload.x !== undefined ? action.payload.x : (a as any).x,
                y: action.payload.y !== undefined ? action.payload.y : (a as any).y,
                width: action.payload.width !== undefined ? action.payload.width : (a as any).width,
                height: action.payload.height !== undefined ? action.payload.height : (a as any).height,
                updatedAt: now,
              } as Annotation)
            : a
        ),
      };

    case 'RESIZE_CIRCLE_ANNOTATION':
      return {
        ...state,
        annotations: state.annotations.map((a) =>
          a.id === action.payload.id
            ? ({
                ...a,
                x: action.payload.x !== undefined ? action.payload.x : (a as any).x,
                y: action.payload.y !== undefined ? action.payload.y : (a as any).y,
                radius: action.payload.radius !== undefined ? action.payload.radius : (a as any).radius,
                updatedAt: now,
              } as Annotation)
            : a
        ),
      };

    default:
      return state;
  }
}

interface AppContextType {
  state: State;
  dispatch: React.Dispatch<Action>;
  selectedPlate: Plate | null;
  selectedAnnotation: Annotation | null;
  plateAnnotations: Annotation[];
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const selectedPlate = state.plates.find((p) => p.id === state.selectedPlateId) || null;
  const selectedAnnotation = state.annotations.find((a) => a.id === state.selectedAnnotationId) || null;
  const plateAnnotations = state.annotations.filter((a) => a.plateId === state.selectedPlateId);

  return (
    <AppContext.Provider value={{ state, dispatch, selectedPlate, selectedAnnotation, plateAnnotations }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
