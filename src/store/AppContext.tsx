import { createContext, useContext, useReducer, ReactNode, useMemo } from 'react';
import type {
  Plate,
  Annotation,
  RectangleAnnotation,
  CircleAnnotation,
  PolygonAnnotation,
  Point,
  ReviewRecord,
  HistoryEntry,
  FilterOptions,
  User,
  ReviewStatus,
  DefectType,
  Severity,
} from '../types';
import { MOCK_USERS } from '../types';
import { initialState, State } from './mockData';
import { v4 as uuidv4 } from 'uuid';

type Action =
  | { type: 'SET_CURRENT_USER'; payload: User }
  | { type: 'SELECT_PLATE'; payload: string | null }
  | { type: 'SELECT_ANNOTATION'; payload: string | null }
  | { type: 'ADD_PLATE'; payload: Omit<Plate, 'id' | 'createdAt' | 'updatedAt' | 'status'> }
  | { type: 'UPDATE_PLATE'; payload: { id: string; data: Partial<Plate> } }
  | { type: 'DELETE_PLATE'; payload: string }
  | { type: 'ADD_RECT_ANNOTATION'; payload: Omit<RectangleAnnotation, 'id' | 'createdAt' | 'updatedAt' | 'reviewStatus' | 'createdBy' | 'createdByName' | 'lastModifiedBy' | 'lastModifiedByName'> }
  | { type: 'ADD_CIRCLE_ANNOTATION'; payload: Omit<CircleAnnotation, 'id' | 'createdAt' | 'updatedAt' | 'reviewStatus' | 'createdBy' | 'createdByName' | 'lastModifiedBy' | 'lastModifiedByName'> }
  | { type: 'ADD_POLYGON_ANNOTATION'; payload: Omit<PolygonAnnotation, 'id' | 'createdAt' | 'updatedAt' | 'reviewStatus' | 'createdBy' | 'createdByName' | 'lastModifiedBy' | 'lastModifiedByName'> }
  | { type: 'UPDATE_ANNOTATION'; payload: { id: string; data: Partial<Annotation>; description?: string } }
  | { type: 'DELETE_ANNOTATION'; payload: string }
  | { type: 'MOVE_ANNOTATION'; payload: { id: string; x: number; y: number } }
  | { type: 'RESIZE_RECT_ANNOTATION'; payload: { id: string; x?: number; y?: number; width?: number; height?: number } }
  | { type: 'RESIZE_CIRCLE_ANNOTATION'; payload: { id: string; x?: number; y?: number; radius?: number } }
  | { type: 'ADD_REVIEW'; payload: { annotationId: string; status: ReviewStatus; comment: string } }
  | { type: 'SET_FILTERS'; payload: Partial<FilterOptions> }
  | { type: 'RESET_FILTERS' }
  | { type: 'UNDO' }
  | { type: 'REDO' };

function addHistoryEntry(
  state: State,
  annotationId: string,
  action: HistoryEntry['action'],
  description: string,
  beforeData?: Partial<Annotation>,
  afterData?: Partial<Annotation>
): HistoryEntry {
  return {
    id: uuidv4(),
    annotationId,
    action,
    userId: state.currentUser.id,
    userName: state.currentUser.name,
    timestamp: new Date().toISOString(),
    beforeData,
    afterData,
    description,
  };
}

function reducer(state: State, action: Action): State {
  const now = new Date().toISOString();

  switch (action.type) {
    case 'SET_CURRENT_USER':
      return { ...state, currentUser: action.payload };

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

    case 'DELETE_PLATE': {
      const plateAnnotations = state.annotations.filter((a) => a.plateId === action.payload);
      const deletedAnnotationIds = plateAnnotations.map((a) => a.id);
      return {
        ...state,
        plates: state.plates.filter((p) => p.id !== action.payload),
        annotations: state.annotations.filter((a) => a.plateId !== action.payload),
        reviewRecords: state.reviewRecords.filter((r) => !deletedAnnotationIds.includes(r.annotationId)),
        history: state.history.filter((h) => h.annotationId !== action.payload && !deletedAnnotationIds.includes(h.annotationId)),
        selectedPlateId: state.selectedPlateId === action.payload ? null : state.selectedPlateId,
        selectedAnnotationId: null,
      };
    }

    case 'ADD_RECT_ANNOTATION': {
      const newAnnotation: RectangleAnnotation = {
        ...action.payload,
        id: uuidv4(),
        reviewStatus: 'pending',
        createdBy: state.currentUser.id,
        createdByName: state.currentUser.name,
        lastModifiedBy: state.currentUser.id,
        lastModifiedByName: state.currentUser.name,
        createdAt: now,
        updatedAt: now,
      };
      const historyEntry = addHistoryEntry(
        state,
        newAnnotation.id,
        'create',
        `创建${newAnnotation.shape === 'rectangle' ? '矩形' : newAnnotation.shape === 'circle' ? '圆形' : '多边形'}标注`
      );
      return {
        ...state,
        annotations: [...state.annotations, newAnnotation as Annotation],
        history: [...state.history, historyEntry],
        historyUndoStack: [...state.historyUndoStack, [historyEntry]],
        historyRedoStack: [],
        selectedAnnotationId: newAnnotation.id,
      };
    }

    case 'ADD_CIRCLE_ANNOTATION': {
      const newAnnotation: CircleAnnotation = {
        ...action.payload,
        id: uuidv4(),
        reviewStatus: 'pending',
        createdBy: state.currentUser.id,
        createdByName: state.currentUser.name,
        lastModifiedBy: state.currentUser.id,
        lastModifiedByName: state.currentUser.name,
        createdAt: now,
        updatedAt: now,
      };
      const historyEntry = addHistoryEntry(state, newAnnotation.id, 'create', '创建圆形标注');
      return {
        ...state,
        annotations: [...state.annotations, newAnnotation as Annotation],
        history: [...state.history, historyEntry],
        historyUndoStack: [...state.historyUndoStack, [historyEntry]],
        historyRedoStack: [],
        selectedAnnotationId: newAnnotation.id,
      };
    }

    case 'ADD_POLYGON_ANNOTATION': {
      const newAnnotation: PolygonAnnotation = {
        ...action.payload,
        id: uuidv4(),
        reviewStatus: 'pending',
        createdBy: state.currentUser.id,
        createdByName: state.currentUser.name,
        lastModifiedBy: state.currentUser.id,
        lastModifiedByName: state.currentUser.name,
        createdAt: now,
        updatedAt: now,
      };
      const historyEntry = addHistoryEntry(state, newAnnotation.id, 'create', '创建多边形标注');
      return {
        ...state,
        annotations: [...state.annotations, newAnnotation as Annotation],
        history: [...state.history, historyEntry],
        historyUndoStack: [...state.historyUndoStack, [historyEntry]],
        historyRedoStack: [],
        selectedAnnotationId: newAnnotation.id,
      };
    }

    case 'UPDATE_ANNOTATION': {
      const oldAnnotation = state.annotations.find((a) => a.id === action.payload.id);
      if (!oldAnnotation) return state;

      const beforeData: Partial<Annotation> = { ...oldAnnotation };
      const newAnnotations = state.annotations.map((a) =>
        a.id === action.payload.id
          ? ({
              ...a,
              ...action.payload.data,
              lastModifiedBy: state.currentUser.id,
              lastModifiedByName: state.currentUser.name,
              updatedAt: now,
            } as Annotation)
          : a
      );

      const description = action.payload.description || '更新标注信息';
      const historyEntry = addHistoryEntry(
        state,
        action.payload.id,
        'update',
        description,
        beforeData,
        action.payload.data
      );

      return {
        ...state,
        annotations: newAnnotations,
        history: [...state.history, historyEntry],
        historyUndoStack: [...state.historyUndoStack, [historyEntry]],
        historyRedoStack: [],
      };
    }

    case 'DELETE_ANNOTATION': {
      const oldAnnotation = state.annotations.find((a) => a.id === action.payload);
      if (!oldAnnotation) return state;

      const historyEntry = addHistoryEntry(state, action.payload, 'delete', '删除标注', oldAnnotation);

      return {
        ...state,
        annotations: state.annotations.filter((a) => a.id !== action.payload),
        history: [...state.history, historyEntry],
        historyUndoStack: [...state.historyUndoStack, [historyEntry]],
        historyRedoStack: [],
        selectedAnnotationId: state.selectedAnnotationId === action.payload ? null : state.selectedAnnotationId,
      };
    }

    case 'MOVE_ANNOTATION': {
      const ann = state.annotations.find((a) => a.id === action.payload.id);
      if (!ann) return state;

      const dx = action.payload.x;
      const dy = action.payload.y;
      const beforeData: Partial<Annotation> = { ...ann };

      let newAnn: Annotation;
      if (ann.shape === 'polygon') {
        const newPoints: Point[] = ann.points.map((p) => ({ x: p.x + dx, y: p.y + dy }));
        newAnn = { ...ann, points: newPoints, lastModifiedBy: state.currentUser.id, lastModifiedByName: state.currentUser.name, updatedAt: now } as Annotation;
      } else {
        newAnn = {
          ...ann,
          x: (ann as any).x + dx,
          y: (ann as any).y + dy,
          lastModifiedBy: state.currentUser.id,
          lastModifiedByName: state.currentUser.name,
          updatedAt: now,
        } as Annotation;
      }

      const historyEntry = addHistoryEntry(state, action.payload.id, 'update', '移动标注', beforeData, newAnn);

      return {
        ...state,
        annotations: state.annotations.map((a) => (a.id === action.payload.id ? newAnn : a)),
        history: [...state.history, historyEntry],
        historyUndoStack: [...state.historyUndoStack, [historyEntry]],
        historyRedoStack: [],
      };
    }

    case 'RESIZE_RECT_ANNOTATION': {
      const ann = state.annotations.find((a) => a.id === action.payload.id);
      if (!ann || ann.shape !== 'rectangle') return state;

      const beforeData: Partial<Annotation> = { ...ann };
      const newAnn: RectangleAnnotation = {
        ...ann,
        x: action.payload.x !== undefined ? action.payload.x : ann.x,
        y: action.payload.y !== undefined ? action.payload.y : ann.y,
        width: action.payload.width !== undefined ? action.payload.width : ann.width,
        height: action.payload.height !== undefined ? action.payload.height : ann.height,
        lastModifiedBy: state.currentUser.id,
        lastModifiedByName: state.currentUser.name,
        updatedAt: now,
      };

      const historyEntry = addHistoryEntry(state, action.payload.id, 'update', '调整标注大小', beforeData, newAnn);

      return {
        ...state,
        annotations: state.annotations.map((a) => (a.id === action.payload.id ? (newAnn as Annotation) : a)),
        history: [...state.history, historyEntry],
        historyUndoStack: [...state.historyUndoStack, [historyEntry]],
        historyRedoStack: [],
      };
    }

    case 'RESIZE_CIRCLE_ANNOTATION': {
      const ann = state.annotations.find((a) => a.id === action.payload.id);
      if (!ann || ann.shape !== 'circle') return state;

      const beforeData: Partial<Annotation> = { ...ann };
      const newAnn: CircleAnnotation = {
        ...ann,
        x: action.payload.x !== undefined ? action.payload.x : ann.x,
        y: action.payload.y !== undefined ? action.payload.y : ann.y,
        radius: action.payload.radius !== undefined ? action.payload.radius : ann.radius,
        lastModifiedBy: state.currentUser.id,
        lastModifiedByName: state.currentUser.name,
        updatedAt: now,
      };

      const historyEntry = addHistoryEntry(state, action.payload.id, 'update', '调整标注大小', beforeData, newAnn);

      return {
        ...state,
        annotations: state.annotations.map((a) => (a.id === action.payload.id ? (newAnn as Annotation) : a)),
        history: [...state.history, historyEntry],
        historyUndoStack: [...state.historyUndoStack, [historyEntry]],
        historyRedoStack: [],
      };
    }

    case 'ADD_REVIEW': {
      const { annotationId, status, comment } = action.payload;
      const oldAnnotation = state.annotations.find((a) => a.id === annotationId);
      if (!oldAnnotation) return state;

      const reviewRecord: ReviewRecord = {
        id: uuidv4(),
        annotationId,
        reviewerId: state.currentUser.id,
        reviewerName: state.currentUser.name,
        status,
        comment,
        reviewedAt: now,
      };

      const beforeData: Partial<Annotation> = { reviewStatus: oldAnnotation.reviewStatus };
      const newAnnotations = state.annotations.map((a) =>
        a.id === annotationId
          ? ({
              ...a,
              reviewStatus: status,
              lastModifiedBy: state.currentUser.id,
              lastModifiedByName: state.currentUser.name,
              updatedAt: now,
            } as Annotation)
          : a
      );

      const statusLabel = status === 'reviewed' ? '复核通过' : status === 'rejected' ? '复核驳回' : '重置为待复核';
      const historyEntry = addHistoryEntry(
        state,
        annotationId,
        'review',
        statusLabel,
        beforeData,
        { reviewStatus: status }
      );

      return {
        ...state,
        reviewRecords: [...state.reviewRecords, reviewRecord],
        annotations: newAnnotations,
        history: [...state.history, historyEntry],
        historyUndoStack: [...state.historyUndoStack, [historyEntry]],
        historyRedoStack: [],
      };
    }

    case 'SET_FILTERS':
      return {
        ...state,
        filters: { ...state.filters, ...action.payload },
      };

    case 'RESET_FILTERS':
      return {
        ...state,
        filters: {
          defectTypes: [],
          severities: [],
          reviewStatuses: [],
          keyword: '',
        },
      };

    case 'UNDO': {
      if (state.historyUndoStack.length === 0) return state;

      const lastUndoGroup = state.historyUndoStack[state.historyUndoStack.length - 1];
      const newUndoStack = state.historyUndoStack.slice(0, -1);

      let newAnnotations = [...state.annotations];
      let newHistory = state.history.filter((h) => !lastUndoGroup.some((g) => g.id === h.id));

      for (const entry of lastUndoGroup) {
        if (entry.action === 'create') {
          newAnnotations = newAnnotations.filter((a) => a.id !== entry.annotationId);
        } else if (entry.action === 'delete') {
          if (entry.beforeData) {
            newAnnotations.push(entry.beforeData as Annotation);
          }
        } else if (entry.action === 'update' || entry.action === 'review') {
          newAnnotations = newAnnotations.map((a) =>
            a.id === entry.annotationId
              ? ({ ...a, ...entry.beforeData, lastModifiedBy: state.currentUser.id, lastModifiedByName: state.currentUser.name, updatedAt: now } as Annotation)
              : a
          );
        }
      }

      return {
        ...state,
        annotations: newAnnotations,
        history: newHistory,
        historyUndoStack: newUndoStack,
        historyRedoStack: [...state.historyRedoStack, lastUndoGroup],
      };
    }

    case 'REDO': {
      if (state.historyRedoStack.length === 0) return state;

      const lastRedoGroup = state.historyRedoStack[state.historyRedoStack.length - 1];
      const newRedoStack = state.historyRedoStack.slice(0, -1);

      let newAnnotations = [...state.annotations];
      let newHistory = [...state.history, ...lastRedoGroup];

      for (const entry of lastRedoGroup) {
        if (entry.action === 'create') {
          const ann = state.annotations.find((a) => a.id === entry.annotationId);
          if (ann) {
            newAnnotations.push(ann);
          }
        } else if (entry.action === 'delete') {
          newAnnotations = newAnnotations.filter((a) => a.id !== entry.annotationId);
        } else if (entry.action === 'update' || entry.action === 'review') {
          newAnnotations = newAnnotations.map((a) =>
            a.id === entry.annotationId
              ? ({ ...a, ...entry.afterData, lastModifiedBy: state.currentUser.id, lastModifiedByName: state.currentUser.name, updatedAt: now } as Annotation)
              : a
          );
        }
      }

      return {
        ...state,
        annotations: newAnnotations,
        history: newHistory,
        historyUndoStack: [...state.historyUndoStack, lastRedoGroup],
        historyRedoStack: newRedoStack,
      };
    }

    default:
      return state;
  }
}

interface AppContextType {
  state: State;
  dispatch: React.Dispatch<Action>;
  currentUser: User;
  selectedPlate: Plate | null;
  selectedAnnotation: Annotation | null;
  plateAnnotations: Annotation[];
  filteredAnnotations: Annotation[];
  annotationReviews: ReviewRecord[];
  annotationHistory: HistoryEntry[];
  canUndo: boolean;
  canRedo: boolean;
  allUsers: User[];
  setCurrentUser: (user: User) => void;
  setFilters: (filters: Partial<FilterOptions>) => void;
  resetFilters: () => void;
  addReview: (annotationId: string, status: ReviewStatus, comment: string) => void;
  undo: () => void;
  redo: () => void;
  getPlateStatistics: (plateId: string) => {
    total: number;
    byType: Record<DefectType, number>;
    bySeverity: Record<Severity, number>;
    byReviewStatus: Record<ReviewStatus, number>;
  };
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const selectedPlate = state.plates.find((p) => p.id === state.selectedPlateId) || null;
  const selectedAnnotation = state.annotations.find(
    (a) => a.id === state.selectedAnnotationId && a.plateId === state.selectedPlateId
  ) || null;
  const plateAnnotations = state.annotations.filter((a) => a.plateId === state.selectedPlateId);

  const filteredAnnotations = useMemo(() => {
    const { defectTypes, severities, reviewStatuses, keyword } = state.filters;
    return plateAnnotations.filter((ann) => {
      if (defectTypes.length > 0 && !defectTypes.includes(ann.defectType)) return false;
      if (severities.length > 0 && !severities.includes(ann.severity)) return false;
      if (reviewStatuses.length > 0 && !reviewStatuses.includes(ann.reviewStatus)) return false;
      if (keyword) {
        const kw = keyword.toLowerCase();
        return (
          ann.description.toLowerCase().includes(kw) ||
          ann.suggestion.toLowerCase().includes(kw) ||
          ann.createdByName.toLowerCase().includes(kw)
        );
      }
      return true;
    });
  }, [plateAnnotations, state.filters]);

  const annotationReviews = useMemo(() => {
    if (!selectedAnnotation) return [];
    return state.reviewRecords
      .filter((r) => r.annotationId === selectedAnnotation.id)
      .sort((a, b) => new Date(b.reviewedAt).getTime() - new Date(a.reviewedAt).getTime());
  }, [selectedAnnotation, state.reviewRecords]);

  const annotationHistory = useMemo(() => {
    if (!selectedAnnotation) return [];
    return state.history
      .filter((h) => h.annotationId === selectedAnnotation.id)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [selectedAnnotation, state.history]);

  const canUndo = state.historyUndoStack.length > 0;
  const canRedo = state.historyRedoStack.length > 0;

  const setCurrentUser = (user: User) => {
    dispatch({ type: 'SET_CURRENT_USER', payload: user });
  };

  const setFilters = (filters: Partial<FilterOptions>) => {
    dispatch({ type: 'SET_FILTERS', payload: filters });
  };

  const resetFilters = () => {
    dispatch({ type: 'RESET_FILTERS' });
  };

  const addReview = (annotationId: string, status: ReviewStatus, comment: string) => {
    dispatch({ type: 'ADD_REVIEW', payload: { annotationId, status, comment } });
  };

  const undo = () => {
    dispatch({ type: 'UNDO' });
  };

  const redo = () => {
    dispatch({ type: 'REDO' });
  };

  const getPlateStatistics = (plateId: string) => {
    const anns = state.annotations.filter((a) => a.plateId === plateId);
    const byType: Record<DefectType, number> = {
      scratch: 0,
      mold: 0,
      bright_spot: 0,
      scan_defect: 0,
    };
    const bySeverity: Record<Severity, number> = {
      mild: 0,
      moderate: 0,
      severe: 0,
    };
    const byReviewStatus: Record<ReviewStatus, number> = {
      pending: 0,
      reviewed: 0,
      rejected: 0,
    };

    anns.forEach((ann) => {
      byType[ann.defectType]++;
      bySeverity[ann.severity]++;
      byReviewStatus[ann.reviewStatus]++;
    });

    return {
      total: anns.length,
      byType,
      bySeverity,
      byReviewStatus,
    };
  };

  return (
    <AppContext.Provider
      value={{
        state,
        dispatch,
        currentUser: state.currentUser,
        selectedPlate,
        selectedAnnotation,
        plateAnnotations,
        filteredAnnotations,
        annotationReviews,
        annotationHistory,
        canUndo,
        canRedo,
        allUsers: MOCK_USERS,
        setCurrentUser,
        setFilters,
        resetFilters,
        addReview,
        undo,
        redo,
        getPlateStatistics,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
