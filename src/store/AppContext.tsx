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
  DetectionResult,
  ModificationRecord,
  ModificationReason,
  DetectionStatistics,
  PlateVersion,
  ComparisonResult,
  DiffItem,
  DiffType,
  ApprovalRecord,
  ApprovalStatus,
  VersionChangeHistory,
  FinalConclusion,
  FinalConclusionStatus,
  TrendStatistics,
  ComparisonViewMode,
} from '../types';
import { MOCK_USERS } from '../types';
import { initialState, State, DEFAULT_FILTERS } from './mockData';
import { v4 as uuidv4 } from 'uuid';
import { compareAnnotations } from '../services/comparisonService';

type Action =
  | { type: 'SET_CURRENT_USER'; payload: User }
  | { type: 'SELECT_PLATE'; payload: string | null }
  | { type: 'SELECT_ANNOTATION'; payload: string | null }
  | { type: 'SELECT_MULTIPLE_ANNOTATIONS'; payload: string[] }
  | { type: 'ADD_PLATE'; payload: Omit<Plate, 'id' | 'createdAt' | 'updatedAt' | 'status'> }
  | { type: 'UPDATE_PLATE'; payload: { id: string; data: Partial<Plate> } }
  | { type: 'DELETE_PLATE'; payload: string }
  | { type: 'ADD_RECT_ANNOTATION'; payload: Omit<RectangleAnnotation, 'id' | 'createdAt' | 'updatedAt' | 'reviewStatus' | 'createdBy' | 'createdByName' | 'lastModifiedBy' | 'lastModifiedByName' | 'confidence' | 'isAutoDetected'> & { confidence?: number; isAutoDetected?: boolean } }
  | { type: 'ADD_CIRCLE_ANNOTATION'; payload: Omit<CircleAnnotation, 'id' | 'createdAt' | 'updatedAt' | 'reviewStatus' | 'createdBy' | 'createdByName' | 'lastModifiedBy' | 'lastModifiedByName' | 'confidence' | 'isAutoDetected'> & { confidence?: number; isAutoDetected?: boolean } }
  | { type: 'ADD_POLYGON_ANNOTATION'; payload: Omit<PolygonAnnotation, 'id' | 'createdAt' | 'updatedAt' | 'reviewStatus' | 'createdBy' | 'createdByName' | 'lastModifiedBy' | 'lastModifiedByName' | 'confidence' | 'isAutoDetected'> & { confidence?: number; isAutoDetected?: boolean } }
  | { type: 'BATCH_ADD_ANNOTATIONS'; payload: Annotation[] }
  | { type: 'UPDATE_ANNOTATION'; payload: { id: string; data: Partial<Annotation>; description?: string; modificationReason?: ModificationReason; modificationNote?: string } }
  | { type: 'DELETE_ANNOTATION'; payload: string }
  | { type: 'BATCH_DELETE_ANNOTATIONS'; payload: string[] }
  | { type: 'MOVE_ANNOTATION'; payload: { id: string; x: number; y: number } }
  | { type: 'RESIZE_RECT_ANNOTATION'; payload: { id: string; x?: number; y?: number; width?: number; height?: number } }
  | { type: 'RESIZE_CIRCLE_ANNOTATION'; payload: { id: string; x?: number; y?: number; radius?: number } }
  | { type: 'MERGE_ANNOTATIONS'; payload: { annotationIds: string[]; mergedData: Partial<Annotation> } }
  | { type: 'SPLIT_ANNOTATION'; payload: { annotationId: string; newAnnotations: Partial<Annotation>[] } }
  | { type: 'ADD_REVIEW'; payload: { annotationId: string; status: ReviewStatus; comment: string } }
  | { type: 'BATCH_REVIEW'; payload: { annotationIds: string[]; status: ReviewStatus; comment: string } }
  | { type: 'SET_DETECTION_RESULT'; payload: DetectionResult }
  | { type: 'UPDATE_DETECTION_PROGRESS'; payload: { plateId: string; progress: number } }
  | { type: 'ADD_MODIFICATION_RECORD'; payload: Omit<ModificationRecord, 'id' | 'modifiedAt'> }
  | { type: 'SET_CONFIDENCE_THRESHOLD'; payload: number }
  | { type: 'SET_FILTERS'; payload: Partial<FilterOptions> }
  | { type: 'RESET_FILTERS' }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'SELECT_BASE_VERSION'; payload: string | null }
  | { type: 'SELECT_COMPARE_VERSION'; payload: string | null }
  | { type: 'SELECT_DIFF_ITEM'; payload: string | null }
  | { type: 'SET_COMPARISON_VIEW_MODE'; payload: ComparisonViewMode }
  | { type: 'TOGGLE_SHOW_UNCHANGED'; payload: boolean }
  | { type: 'ADD_COMPARISON'; payload: ComparisonResult }
  | { type: 'ADD_APPROVAL_RECORD'; payload: ApprovalRecord }
  | { type: 'BATCH_APPROVE'; payload: { diffItemIds: string[]; comparisonId: string; status: ApprovalStatus; comment: string; newDefectType?: DefectType; newSeverity?: Severity } }
  | { type: 'ADD_VERSION_CHANGE_HISTORY'; payload: Omit<VersionChangeHistory, 'id' | 'timestamp'> }
  | { type: 'ADD_FINAL_CONCLUSION'; payload: Omit<FinalConclusion, 'id' | 'createdAt' | 'updatedAt'> }
  | { type: 'UPDATE_FINAL_CONCLUSION'; payload: { id: string; data: Partial<FinalConclusion> } }
  | { type: 'ARCHIVE_FINAL_CONCLUSION'; payload: string };

function addHistoryEntry(
  state: State,
  annotationId: string,
  action: HistoryEntry['action'],
  description: string,
  beforeData?: Partial<Annotation>,
  afterData?: Partial<Annotation>,
  reviewRecords?: ReviewRecord[]
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
    reviewRecords,
    description,
  };
}

function reducer(state: State, action: Action): State {
  const now = new Date().toISOString();

  switch (action.type) {
    case 'SET_CURRENT_USER':
      return { ...state, currentUser: action.payload };

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

    case 'SELECT_PLATE':
      return { 
        ...state, 
        selectedPlateId: action.payload, 
        selectedAnnotationId: null, 
        selectedAnnotationIds: [],
        filters: { ...DEFAULT_FILTERS },
      };

    case 'SELECT_ANNOTATION':
      return { ...state, selectedAnnotationId: action.payload, selectedAnnotationIds: action.payload ? [action.payload] : [] };

    case 'SELECT_MULTIPLE_ANNOTATIONS':
      return { ...state, selectedAnnotationIds: action.payload, selectedAnnotationId: action.payload.length === 1 ? action.payload[0] : null };

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
        confidence: action.payload.confidence ?? 1.0,
        isAutoDetected: action.payload.isAutoDetected ?? false,
      };
      const historyEntry = addHistoryEntry(
        state,
        newAnnotation.id,
        'create',
        `创建${newAnnotation.shape === 'rectangle' ? '矩形' : newAnnotation.shape === 'circle' ? '圆形' : '多边形'}标注`,
        undefined,
        newAnnotation as Partial<Annotation>
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
        confidence: action.payload.confidence ?? 1.0,
        isAutoDetected: action.payload.isAutoDetected ?? false,
      };
      const historyEntry = addHistoryEntry(
        state,
        newAnnotation.id,
        'create',
        '创建圆形标注',
        undefined,
        newAnnotation as Partial<Annotation>
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
        confidence: action.payload.confidence ?? 1.0,
        isAutoDetected: action.payload.isAutoDetected ?? false,
      };
      const historyEntry = addHistoryEntry(
        state,
        newAnnotation.id,
        'create',
        '创建多边形标注',
        undefined,
        newAnnotation as Partial<Annotation>
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
        selectedAnnotationIds: state.selectedAnnotationIds.filter((id) => id !== action.payload),
      };
    }

    case 'BATCH_DELETE_ANNOTATIONS': {
      const { payload: annotationIds } = action;
      const oldAnnotations = state.annotations.filter((a) => annotationIds.includes(a.id));
      if (oldAnnotations.length === 0) return state;

      const historyEntries = oldAnnotations.map((ann) =>
        addHistoryEntry(state, ann.id, 'delete', '批量删除标注', ann)
      );

      return {
        ...state,
        annotations: state.annotations.filter((a) => !annotationIds.includes(a.id)),
        history: [...state.history, ...historyEntries],
        historyUndoStack: [...state.historyUndoStack, historyEntries],
        historyRedoStack: [],
        selectedAnnotationId: null,
        selectedAnnotationIds: [],
      };
    }

    case 'BATCH_ADD_ANNOTATIONS': {
      const { payload: newAnnotations } = action;
      const historyEntries = newAnnotations.map((ann) =>
        addHistoryEntry(state, ann.id, 'create', '批量添加自动检测标注', undefined, ann as Partial<Annotation>)
      );

      return {
        ...state,
        annotations: [...state.annotations, ...newAnnotations],
        history: [...state.history, ...historyEntries],
        historyUndoStack: [...state.historyUndoStack, historyEntries],
        historyRedoStack: [],
      };
    }

    case 'MERGE_ANNOTATIONS': {
      const { annotationIds, mergedData } = action.payload;
      const annotationsToMerge = state.annotations.filter((a) => annotationIds.includes(a.id));
      if (annotationsToMerge.length < 2) return state;

      const plateId = annotationsToMerge[0].plateId;
      const defectType = (mergedData.defectType as DefectType) || annotationsToMerge[0].defectType;
      const severity = (mergedData.severity as Severity) || annotationsToMerge[0].severity;

      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      let allPoints: Point[] = [];

      annotationsToMerge.forEach((ann) => {
        if (ann.shape === 'rectangle') {
          minX = Math.min(minX, ann.x);
          minY = Math.min(minY, ann.y);
          maxX = Math.max(maxX, ann.x + ann.width);
          maxY = Math.max(maxY, ann.y + ann.height);
        } else if (ann.shape === 'circle') {
          minX = Math.min(minX, ann.x - ann.radius);
          minY = Math.min(minY, ann.y - ann.radius);
          maxX = Math.max(maxX, ann.x + ann.radius);
          maxY = Math.max(maxY, ann.y + ann.radius);
        } else if (ann.shape === 'polygon') {
          ann.points.forEach((p) => {
            minX = Math.min(minX, p.x);
            minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x);
            maxY = Math.max(maxY, p.y);
          });
          allPoints = [...allPoints, ...ann.points];
        }
      });

      const mergedAnnotation: RectangleAnnotation = {
        id: uuidv4(),
        plateId,
        shape: 'rectangle',
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
        defectType,
        severity,
        description: mergedData.description || '合并标注',
        suggestion: mergedData.suggestion || '',
        reviewStatus: 'pending',
        createdBy: state.currentUser.id,
        createdByName: state.currentUser.name,
        lastModifiedBy: state.currentUser.id,
        lastModifiedByName: state.currentUser.name,
        createdAt: now,
        updatedAt: now,
        confidence: 1.0,
        isAutoDetected: false,
        modificationReason: 'merged',
        modificationNote: `合并了 ${annotationIds.length} 个标注`,
      };

      const deleteHistoryEntries = annotationsToMerge.map((ann) =>
        addHistoryEntry(state, ann.id, 'delete', '合并标注-删除原标注', ann)
      );
      const createHistoryEntry = addHistoryEntry(
        state,
        mergedAnnotation.id,
        'create',
        `合并 ${annotationIds.length} 个标注`,
        undefined,
        mergedAnnotation as Partial<Annotation>
      );

      const modificationRecord: ModificationRecord = {
        id: uuidv4(),
        annotationId: mergedAnnotation.id,
        reason: 'merged',
        description: `合并了 ${annotationIds.length} 个标注`,
        modifiedBy: state.currentUser.id,
        modifiedByName: state.currentUser.name,
        modifiedAt: now,
      };

      return {
        ...state,
        annotations: [
          ...state.annotations.filter((a) => !annotationIds.includes(a.id)),
          mergedAnnotation as Annotation,
        ],
        history: [...state.history, ...deleteHistoryEntries, createHistoryEntry],
        historyUndoStack: [...state.historyUndoStack, [...deleteHistoryEntries, createHistoryEntry]],
        historyRedoStack: [],
        modificationRecords: [...state.modificationRecords, modificationRecord],
        selectedAnnotationId: mergedAnnotation.id,
        selectedAnnotationIds: [mergedAnnotation.id],
      };
    }

    case 'SPLIT_ANNOTATION': {
      const { annotationId, newAnnotations } = action.payload;
      const originalAnnotation = state.annotations.find((a) => a.id === annotationId);
      if (!originalAnnotation) return state;

      const createdAnnotations: Annotation[] = newAnnotations.map((data, index) => {
        const baseAnn = {
          id: uuidv4(),
          plateId: originalAnnotation.plateId,
          defectType: (data.defectType as DefectType) || originalAnnotation.defectType,
          severity: (data.severity as Severity) || originalAnnotation.severity,
          description: data.description || `拆分标注 ${index + 1}`,
          suggestion: data.suggestion || '',
          reviewStatus: 'pending' as ReviewStatus,
          createdBy: state.currentUser.id,
          createdByName: state.currentUser.name,
          lastModifiedBy: state.currentUser.id,
          lastModifiedByName: state.currentUser.name,
          createdAt: now,
          updatedAt: now,
          confidence: 1.0,
          isAutoDetected: false,
          modificationReason: 'split' as ModificationReason,
          modificationNote: `从标注 ${annotationId} 拆分`,
        };

        if (data.shape === 'rectangle') {
          return { ...baseAnn, shape: 'rectangle', x: data.x || 0, y: data.y || 0, width: data.width || 50, height: data.height || 50 } as RectangleAnnotation;
        } else if (data.shape === 'circle') {
          return { ...baseAnn, shape: 'circle', x: data.x || 0, y: data.y || 0, radius: data.radius || 25 } as CircleAnnotation;
        } else {
          return { ...baseAnn, shape: 'polygon', points: (data as any).points || [] } as PolygonAnnotation;
        }
      });

      const deleteHistoryEntry = addHistoryEntry(
        state,
        annotationId,
        'delete',
        '拆分标注-删除原标注',
        originalAnnotation
      );
      const createHistoryEntries = createdAnnotations.map((ann) =>
        addHistoryEntry(state, ann.id, 'create', `拆分标注-新建`, undefined, ann as Partial<Annotation>)
      );

      const modificationRecord: ModificationRecord = {
        id: uuidv4(),
        annotationId: annotationId,
        reason: 'split',
        description: `拆分为 ${newAnnotations.length} 个标注`,
        modifiedBy: state.currentUser.id,
        modifiedByName: state.currentUser.name,
        modifiedAt: now,
      };

      return {
        ...state,
        annotations: [
          ...state.annotations.filter((a) => a.id !== annotationId),
          ...createdAnnotations,
        ],
        history: [...state.history, deleteHistoryEntry, ...createHistoryEntries],
        historyUndoStack: [...state.historyUndoStack, [deleteHistoryEntry, ...createHistoryEntries]],
        historyRedoStack: [],
        modificationRecords: [...state.modificationRecords, modificationRecord],
        selectedAnnotationId: createdAnnotations[0]?.id || null,
        selectedAnnotationIds: createdAnnotations.map((a) => a.id),
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

    case 'BATCH_REVIEW': {
      const { annotationIds, status, comment } = action.payload;
      const targetAnnotations = state.annotations.filter((a) => annotationIds.includes(a.id));
      if (targetAnnotations.length === 0) return state;

      const reviewRecords: ReviewRecord[] = targetAnnotations.map((ann) => ({
        id: uuidv4(),
        annotationId: ann.id,
        reviewerId: state.currentUser.id,
        reviewerName: state.currentUser.name,
        status,
        comment,
        reviewedAt: now,
      }));

      const newAnnotations = state.annotations.map((a) => {
        if (annotationIds.includes(a.id)) {
          return {
            ...a,
            reviewStatus: status,
            lastModifiedBy: state.currentUser.id,
            lastModifiedByName: state.currentUser.name,
            updatedAt: now,
          } as Annotation;
        }
        return a;
      });

      const historyEntries = targetAnnotations.map((ann) => {
        const statusLabel = status === 'reviewed' ? '批量复核通过' : status === 'rejected' ? '批量复核驳回' : '批量重置为待复核';
        return addHistoryEntry(
          state,
          ann.id,
          'review',
          statusLabel,
          { reviewStatus: ann.reviewStatus },
          { reviewStatus: status }
        );
      });

      return {
        ...state,
        reviewRecords: [...state.reviewRecords, ...reviewRecords],
        annotations: newAnnotations,
        history: [...state.history, ...historyEntries],
        historyUndoStack: [...state.historyUndoStack, historyEntries],
        historyRedoStack: [],
      };
    }

    case 'SET_DETECTION_RESULT': {
      const existingIndex = state.detectionResults.findIndex((d) => d.plateId === action.payload.plateId);
      let newDetectionResults;
      if (existingIndex >= 0) {
        newDetectionResults = [...state.detectionResults];
        newDetectionResults[existingIndex] = action.payload;
      } else {
        newDetectionResults = [...state.detectionResults, action.payload];
      }
      return { ...state, detectionResults: newDetectionResults };
    }

    case 'UPDATE_DETECTION_PROGRESS': {
      const { plateId, progress } = action.payload;
      return {
        ...state,
        detectionResults: state.detectionResults.map((d) =>
          d.plateId === plateId ? { ...d, progress } : d
        ),
      };
    }

    case 'ADD_MODIFICATION_RECORD': {
      const newRecord: ModificationRecord = {
        ...action.payload,
        id: uuidv4(),
        modifiedAt: now,
      };
      return { ...state, modificationRecords: [...state.modificationRecords, newRecord] };
    }

    case 'SET_CONFIDENCE_THRESHOLD':
      return { ...state, confidenceThreshold: action.payload };

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

    case 'SELECT_BASE_VERSION':
      return { ...state, selectedBaseVersionId: action.payload, selectedDiffItemId: null };

    case 'SELECT_COMPARE_VERSION':
      return { ...state, selectedCompareVersionId: action.payload, selectedDiffItemId: null };

    case 'SELECT_DIFF_ITEM':
      return { ...state, selectedDiffItemId: action.payload };

    case 'SET_COMPARISON_VIEW_MODE':
      return { ...state, comparisonViewMode: action.payload };

    case 'TOGGLE_SHOW_UNCHANGED':
      return { ...state, showUnchanged: action.payload };

    case 'ADD_COMPARISON': {
      const existingIndex = state.comparisons.findIndex(
        (c) =>
          c.baseVersionId === action.payload.baseVersionId &&
          c.compareVersionId === action.payload.compareVersionId
      );
      let newComparisons;
      if (existingIndex >= 0) {
        newComparisons = [...state.comparisons];
        newComparisons[existingIndex] = action.payload;
      } else {
        newComparisons = [...state.comparisons, action.payload];
      }
      return { ...state, comparisons: newComparisons };
    }

    case 'ADD_APPROVAL_RECORD': {
      const existingIndex = state.approvalRecords.findIndex(
        (r) => r.diffItemId === action.payload.diffItemId && r.approverId === action.payload.approverId
      );
      let newRecords;
      if (existingIndex >= 0) {
        newRecords = [...state.approvalRecords];
        newRecords[existingIndex] = action.payload;
      } else {
        newRecords = [...state.approvalRecords, action.payload];
      }
      return { ...state, approvalRecords: newRecords };
    }

    case 'BATCH_APPROVE': {
      const { diffItemIds, comparisonId, status, comment, newDefectType, newSeverity } = action.payload;
      const newRecords: ApprovalRecord[] = diffItemIds.map((diffItemId) => ({
        id: uuidv4(),
        diffItemId,
        comparisonId,
        approverId: state.currentUser.id,
        approverName: state.currentUser.name,
        status,
        comment,
        newDefectType,
        newSeverity,
        createdAt: now,
      }));
      const filteredExisting = state.approvalRecords.filter(
        (r) => !(diffItemIds.includes(r.diffItemId) && r.approverId === state.currentUser.id)
      );
      return { ...state, approvalRecords: [...filteredExisting, ...newRecords] };
    }

    case 'ADD_VERSION_CHANGE_HISTORY': {
      const newEntry: VersionChangeHistory = {
        ...action.payload,
        id: uuidv4(),
        timestamp: now,
      };
      return { ...state, versionChangeHistory: [...state.versionChangeHistory, newEntry] };
    }

    case 'ADD_FINAL_CONCLUSION': {
      const newConclusion: FinalConclusion = {
        ...action.payload,
        id: uuidv4(),
        createdAt: now,
        updatedAt: now,
      };
      return { ...state, finalConclusions: [...state.finalConclusions, newConclusion] };
    }

    case 'UPDATE_FINAL_CONCLUSION': {
      return {
        ...state,
        finalConclusions: state.finalConclusions.map((c) =>
          c.id === action.payload.id ? { ...c, ...action.payload.data, updatedAt: now } : c
        ),
      };
    }

    case 'ARCHIVE_FINAL_CONCLUSION': {
      return {
        ...state,
        finalConclusions: state.finalConclusions.map((c) =>
          c.id === action.payload ? { ...c, status: 'archived', updatedAt: now } : c
        ),
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
  selectedAnnotationIds: string[];
  plateAnnotations: Annotation[];
  filteredAnnotations: Annotation[];
  annotationReviews: ReviewRecord[];
  annotationHistory: HistoryEntry[];
  annotationModifications: ModificationRecord[];
  currentDetectionResult: DetectionResult | null;
  confidenceThreshold: number;
  canUndo: boolean;
  canRedo: boolean;
  allUsers: User[];
  setCurrentUser: (user: User) => void;
  setFilters: (filters: Partial<FilterOptions>) => void;
  resetFilters: () => void;
  addReview: (annotationId: string, status: ReviewStatus, comment: string) => void;
  batchReview: (annotationIds: string[], status: ReviewStatus, comment: string) => void;
  undo: () => void;
  redo: () => void;
  selectMultipleAnnotations: (ids: string[]) => void;
  mergeAnnotations: (annotationIds: string[], mergedData: Partial<Annotation>) => void;
  splitAnnotation: (annotationId: string, newAnnotations: Partial<Annotation>[]) => void;
  batchDeleteAnnotations: (annotationIds: string[]) => void;
  setDetectionResult: (result: DetectionResult) => void;
  updateDetectionProgress: (plateId: string, progress: number) => void;
  setConfidenceThreshold: (threshold: number) => void;
  addModificationRecord: (record: Omit<ModificationRecord, 'id' | 'modifiedAt'>) => void;
  getPlateStatistics: (plateId: string) => {
    total: number;
    byType: Record<DefectType, number>;
    bySeverity: Record<Severity, number>;
    byReviewStatus: Record<ReviewStatus, number>;
  };
  getDetectionStatistics: (plateId?: string) => DetectionStatistics;
  batchAddAnnotations: (annotations: Annotation[]) => void;
  plateVersions: PlateVersion[];
  currentPlateVersions: PlateVersion[];
  selectedBaseVersion: PlateVersion | null;
  selectedCompareVersion: PlateVersion | null;
  selectedDiffItem: DiffItem | null;
  baseVersionAnnotations: Annotation[];
  compareVersionAnnotations: Annotation[];
  currentComparison: ComparisonResult | null;
  comparisonViewMode: ComparisonViewMode;
  showUnchanged: boolean;
  filteredDiffItems: DiffItem[];
  approvalRecords: ApprovalRecord[];
  diffItemApprovals: ApprovalRecord[];
  versionChangeHistory: VersionChangeHistory[];
  finalConclusions: FinalConclusion[];
  plateFinalConclusions: FinalConclusion[];
  trendStatistics: TrendStatistics[];
  selectBaseVersion: (versionId: string | null) => void;
  selectCompareVersion: (versionId: string | null) => void;
  selectDiffItem: (diffItemId: string | null) => void;
  setComparisonViewMode: (mode: ComparisonViewMode) => void;
  setShowUnchanged: (show: boolean) => void;
  runComparison: () => void;
  addApprovalRecord: (record: Omit<ApprovalRecord, 'id' | 'createdAt'>) => void;
  batchApprove: (diffItemIds: string[], comparisonId: string, status: ApprovalStatus, comment: string, newDefectType?: DefectType, newSeverity?: Severity) => void;
  addVersionChangeHistory: (entry: Omit<VersionChangeHistory, 'id' | 'timestamp'>) => void;
  addFinalConclusion: (conclusion: Omit<FinalConclusion, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateFinalConclusion: (id: string, data: Partial<FinalConclusion>) => void;
  archiveFinalConclusion: (id: string) => void;
  getDiffItemApprovalStatus: (diffItemId: string) => ApprovalStatus | null;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const selectedPlate = state.plates.find((p) => p.id === state.selectedPlateId) || null;
  const selectedAnnotation = state.annotations.find(
    (a) => a.id === state.selectedAnnotationId && a.plateId === state.selectedPlateId
  ) || null;
  const selectedAnnotationIds = state.selectedAnnotationIds;
  const plateAnnotations = state.annotations.filter((a) => a.plateId === state.selectedPlateId);
  const confidenceThreshold = state.confidenceThreshold;

  const currentDetectionResult = useMemo(() => {
    if (!state.selectedPlateId) return null;
    return state.detectionResults.find((d) => d.plateId === state.selectedPlateId) || null;
  }, [state.selectedPlateId, state.detectionResults]);

  const filteredAnnotations = useMemo(() => {
    const { defectTypes, severities, reviewStatuses, keyword, confidenceMin, confidenceMax, isAutoDetected } = state.filters;
    return plateAnnotations.filter((ann) => {
      if (defectTypes.length > 0 && !defectTypes.includes(ann.defectType)) return false;
      if (severities.length > 0 && !severities.includes(ann.severity)) return false;
      if (reviewStatuses.length > 0 && !reviewStatuses.includes(ann.reviewStatus)) return false;
      if (confidenceMin !== undefined && ann.confidence < confidenceMin) return false;
      if (confidenceMax !== undefined && ann.confidence > confidenceMax) return false;
      if (isAutoDetected !== null && isAutoDetected !== undefined && ann.isAutoDetected !== isAutoDetected) return false;
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

  const annotationModifications = useMemo(() => {
    if (!selectedAnnotation) return [];
    return state.modificationRecords
      .filter((m) => m.annotationId === selectedAnnotation.id)
      .sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime());
  }, [selectedAnnotation, state.modificationRecords]);

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

  const batchReview = (annotationIds: string[], status: ReviewStatus, comment: string) => {
    dispatch({ type: 'BATCH_REVIEW', payload: { annotationIds, status, comment } });
  };

  const undo = () => {
    dispatch({ type: 'UNDO' });
  };

  const redo = () => {
    dispatch({ type: 'REDO' });
  };

  const selectMultipleAnnotations = (ids: string[]) => {
    dispatch({ type: 'SELECT_MULTIPLE_ANNOTATIONS', payload: ids });
  };

  const mergeAnnotations = (annotationIds: string[], mergedData: Partial<Annotation>) => {
    dispatch({ type: 'MERGE_ANNOTATIONS', payload: { annotationIds, mergedData } });
  };

  const splitAnnotation = (annotationId: string, newAnnotations: Partial<Annotation>[]) => {
    dispatch({ type: 'SPLIT_ANNOTATION', payload: { annotationId, newAnnotations } });
  };

  const batchDeleteAnnotations = (annotationIds: string[]) => {
    dispatch({ type: 'BATCH_DELETE_ANNOTATIONS', payload: annotationIds });
  };

  const setDetectionResult = (result: DetectionResult) => {
    dispatch({ type: 'SET_DETECTION_RESULT', payload: result });
  };

  const updateDetectionProgress = (plateId: string, progress: number) => {
    dispatch({ type: 'UPDATE_DETECTION_PROGRESS', payload: { plateId, progress } });
  };

  const setConfidenceThreshold = (threshold: number) => {
    dispatch({ type: 'SET_CONFIDENCE_THRESHOLD', payload: threshold });
  };

  const addModificationRecord = (record: Omit<ModificationRecord, 'id' | 'modifiedAt'>) => {
    dispatch({ type: 'ADD_MODIFICATION_RECORD', payload: record });
  };

  const batchAddAnnotations = (annotations: Annotation[]) => {
    dispatch({ type: 'BATCH_ADD_ANNOTATIONS', payload: annotations });
  };

  const plateVersions = state.plateVersions;
  const currentPlateVersions = useMemo(() => {
    if (!state.selectedPlateId) return [];
    return state.plateVersions
      .filter((v) => v.plateId === state.selectedPlateId)
      .sort((a, b) => a.versionNumber - b.versionNumber);
  }, [state.plateVersions, state.selectedPlateId]);

  const selectedBaseVersion = useMemo(() => {
    return state.plateVersions.find((v) => v.id === state.selectedBaseVersionId) || null;
  }, [state.plateVersions, state.selectedBaseVersionId]);

  const selectedCompareVersion = useMemo(() => {
    return state.plateVersions.find((v) => v.id === state.selectedCompareVersionId) || null;
  }, [state.plateVersions, state.selectedCompareVersionId]);

  const baseVersionAnnotations = useMemo(() => {
    if (!state.selectedBaseVersionId) return [];
    return state.versionAnnotations[state.selectedBaseVersionId] || [];
  }, [state.versionAnnotations, state.selectedBaseVersionId]);

  const compareVersionAnnotations = useMemo(() => {
    if (!state.selectedCompareVersionId) return [];
    return state.versionAnnotations[state.selectedCompareVersionId] || [];
  }, [state.versionAnnotations, state.selectedCompareVersionId]);

  const currentComparison = useMemo(() => {
    if (!state.selectedBaseVersionId || !state.selectedCompareVersionId) return null;
    return (
      state.comparisons.find(
        (c) =>
          c.baseVersionId === state.selectedBaseVersionId &&
          c.compareVersionId === state.selectedCompareVersionId
      ) || null
    );
  }, [state.comparisons, state.selectedBaseVersionId, state.selectedCompareVersionId]);

  const selectedDiffItem = useMemo(() => {
    if (!state.selectedDiffItemId || !currentComparison) return null;
    return currentComparison.diffItems.find((d) => d.id === state.selectedDiffItemId) || null;
  }, [state.selectedDiffItemId, currentComparison]);

  const comparisonViewMode = state.comparisonViewMode;
  const showUnchanged = state.showUnchanged;

  const filteredDiffItems = useMemo(() => {
    if (!currentComparison) return [];
    if (state.showUnchanged) return currentComparison.diffItems;
    return currentComparison.diffItems.filter((d) => d.diffType !== 'unchanged');
  }, [currentComparison, state.showUnchanged]);

  const approvalRecords = state.approvalRecords;

  const diffItemApprovals = useMemo(() => {
    if (!state.selectedDiffItemId) return [];
    return state.approvalRecords
      .filter((r) => r.diffItemId === state.selectedDiffItemId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [state.approvalRecords, state.selectedDiffItemId]);

  const versionChangeHistory = state.versionChangeHistory;

  const finalConclusions = state.finalConclusions;

  const plateFinalConclusions = useMemo(() => {
    if (!state.selectedPlateId) return [];
    return state.finalConclusions
      .filter((c) => c.plateId === state.selectedPlateId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [state.finalConclusions, state.selectedPlateId]);

  const trendStatistics = state.trendStatistics;

  const selectBaseVersion = (versionId: string | null) => {
    dispatch({ type: 'SELECT_BASE_VERSION', payload: versionId });
  };

  const selectCompareVersion = (versionId: string | null) => {
    dispatch({ type: 'SELECT_COMPARE_VERSION', payload: versionId });
  };

  const selectDiffItem = (diffItemId: string | null) => {
    dispatch({ type: 'SELECT_DIFF_ITEM', payload: diffItemId });
  };

  const setComparisonViewMode = (mode: ComparisonViewMode) => {
    dispatch({ type: 'SET_COMPARISON_VIEW_MODE', payload: mode });
  };

  const setShowUnchanged = (show: boolean) => {
    dispatch({ type: 'TOGGLE_SHOW_UNCHANGED', payload: show });
  };

  const runComparison = () => {
    if (!state.selectedPlateId || !state.selectedBaseVersionId || !state.selectedCompareVersionId) return;
    const baseAnns = state.versionAnnotations[state.selectedBaseVersionId] || [];
    const compareAnns = state.versionAnnotations[state.selectedCompareVersionId] || [];
    const result = compareAnnotations(
      baseAnns,
      compareAnns,
      state.selectedPlateId,
      state.selectedBaseVersionId,
      state.selectedCompareVersionId,
      state.currentUser.id,
      state.currentUser.name
    );
    dispatch({ type: 'ADD_COMPARISON', payload: result });
    dispatch({
      type: 'ADD_VERSION_CHANGE_HISTORY',
      payload: {
        plateId: state.selectedPlateId,
        versionId: state.selectedBaseVersionId,
        action: 'compare',
        userId: state.currentUser.id,
        userName: state.currentUser.name,
        description: `与 ${selectedCompareVersion?.versionName || '未知版本'} 进行比对`,
        details: { compareVersionId: state.selectedCompareVersionId, diffCount: result.summary.totalDiffCount },
      },
    });
  };

  const addApprovalRecord = (record: Omit<ApprovalRecord, 'id' | 'createdAt'>) => {
    const newRecord: ApprovalRecord = {
      ...record,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_APPROVAL_RECORD', payload: newRecord });
  };

  const batchApprove = (
    diffItemIds: string[],
    comparisonId: string,
    status: ApprovalStatus,
    comment: string,
    newDefectType?: DefectType,
    newSeverity?: Severity
  ) => {
    dispatch({
      type: 'BATCH_APPROVE',
      payload: { diffItemIds, comparisonId, status, comment, newDefectType, newSeverity },
    });
  };

  const addVersionChangeHistory = (entry: Omit<VersionChangeHistory, 'id' | 'timestamp'>) => {
    dispatch({ type: 'ADD_VERSION_CHANGE_HISTORY', payload: entry });
  };

  const addFinalConclusion = (conclusion: Omit<FinalConclusion, 'id' | 'createdAt' | 'updatedAt'>) => {
    dispatch({ type: 'ADD_FINAL_CONCLUSION', payload: conclusion });
  };

  const updateFinalConclusion = (id: string, data: Partial<FinalConclusion>) => {
    dispatch({ type: 'UPDATE_FINAL_CONCLUSION', payload: { id, data } });
  };

  const archiveFinalConclusion = (id: string) => {
    dispatch({ type: 'ARCHIVE_FINAL_CONCLUSION', payload: id });
  };

  const getDiffItemApprovalStatus = (diffItemId: string): ApprovalStatus | null => {
    const approvals = state.approvalRecords.filter((r) => r.diffItemId === diffItemId);
    if (approvals.length === 0) return null;
    const approved = approvals.filter((r) => r.status === 'approved').length;
    const rejected = approvals.filter((r) => r.status === 'rejected').length;
    if (rejected > 0) return 'rejected';
    if (approved >= 2) return 'approved';
    return 'pending';
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

  const getDetectionStatistics = (plateId?: string): DetectionStatistics => {
    const anns = plateId ? state.annotations.filter((a) => a.plateId === plateId) : state.annotations;

    const totalCount = anns.length;
    const autoDetectedCount = anns.filter((a) => a.isAutoDetected).length;
    const manualAddedCount = anns.filter((a) => !a.isAutoDetected).length;
    const manualCorrectedCount = anns.filter((a) => a.isAutoDetected && a.modificationReason).length;

    const falsePositiveCount = anns.filter(
      (a) => a.isAutoDetected && a.modificationReason === 'false_positive'
    ).length;
    const falseNegativeCount = anns.filter(
      (a) => a.modificationReason === 'false_negative'
    ).length;

    const autoAnns = anns.filter((a) => a.isAutoDetected);
    const avgConfidence = autoAnns.length > 0
      ? autoAnns.reduce((sum, a) => sum + a.confidence, 0) / autoAnns.length
      : 0;

    const highConfidenceCount = anns.filter((a) => a.confidence >= 0.8).length;
    const mediumConfidenceCount = anns.filter((a) => a.confidence >= 0.5 && a.confidence < 0.8).length;
    const lowConfidenceCount = anns.filter((a) => a.confidence < 0.5).length;

    const reviewedCount = anns.filter((a) => a.reviewStatus !== 'pending').length;
    const pendingReviewCount = anns.filter((a) => a.reviewStatus === 'pending').length;
    const passCount = anns.filter((a) => a.reviewStatus === 'reviewed').length;
    const rejectCount = anns.filter((a) => a.reviewStatus === 'rejected').length;

    const defectTypeStats = {
      scratch: anns.filter((a) => a.defectType === 'scratch').length,
      mold: anns.filter((a) => a.defectType === 'mold').length,
      bright_spot: anns.filter((a) => a.defectType === 'bright_spot').length,
      scan_defect: anns.filter((a) => a.defectType === 'scan_defect').length,
    };

    return {
      totalCount,
      autoDetectedCount,
      manualAddedCount,
      manualCorrectedCount,
      falsePositiveCount,
      falseNegativeCount,
      avgConfidence,
      highConfidenceCount,
      mediumConfidenceCount,
      lowConfidenceCount,
      reviewedCount,
      pendingReviewCount,
      passCount,
      rejectCount,
      defectTypeStats,
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
        selectedAnnotationIds,
        plateAnnotations,
        filteredAnnotations,
        annotationReviews,
        annotationHistory,
        annotationModifications,
        currentDetectionResult,
        confidenceThreshold,
        canUndo,
        canRedo,
        allUsers: MOCK_USERS,
        setCurrentUser,
        setFilters,
        resetFilters,
        addReview,
        batchReview,
        undo,
        redo,
        selectMultipleAnnotations,
        mergeAnnotations,
        splitAnnotation,
        batchDeleteAnnotations,
        setDetectionResult,
        updateDetectionProgress,
        setConfidenceThreshold,
        addModificationRecord,
        getPlateStatistics,
        getDetectionStatistics,
        batchAddAnnotations,
        plateVersions,
        currentPlateVersions,
        selectedBaseVersion,
        selectedCompareVersion,
        selectedDiffItem,
        baseVersionAnnotations,
        compareVersionAnnotations,
        currentComparison,
        comparisonViewMode,
        showUnchanged,
        filteredDiffItems,
        approvalRecords,
        diffItemApprovals,
        versionChangeHistory,
        finalConclusions,
        plateFinalConclusions,
        trendStatistics,
        selectBaseVersion,
        selectCompareVersion,
        selectDiffItem,
        setComparisonViewMode,
        setShowUnchanged,
        runComparison,
        addApprovalRecord,
        batchApprove,
        addVersionChangeHistory,
        addFinalConclusion,
        updateFinalConclusion,
        archiveFinalConclusion,
        getDiffItemApprovalStatus,
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
