export type DefectType = 'scratch' | 'mold' | 'bright_spot' | 'scan_defect';

export type Severity = 'mild' | 'moderate' | 'severe';

export type AnnotationShape = 'rectangle' | 'circle' | 'polygon';

export type ReviewStatus = 'pending' | 'reviewed';

export type PlateStatus = 'active' | 'archived';

export interface Point {
  x: number;
  y: number;
}

export interface BaseAnnotation {
  id: string;
  plateId: string;
  shape: AnnotationShape;
  defectType: DefectType;
  severity: Severity;
  description: string;
  suggestion: string;
  reviewStatus: ReviewStatus;
  createdAt: string;
  updatedAt: string;
}

export interface RectangleAnnotation extends BaseAnnotation {
  shape: 'rectangle';
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CircleAnnotation extends BaseAnnotation {
  shape: 'circle';
  x: number;
  y: number;
  radius: number;
}

export interface PolygonAnnotation extends BaseAnnotation {
  shape: 'polygon';
  points: Point[];
}

export type Annotation = RectangleAnnotation | CircleAnnotation | PolygonAnnotation;

export interface Plate {
  id: string;
  code: string;
  name: string;
  scanDate: string;
  imageUrl: string;
  status: PlateStatus;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export type ToolType = 'select' | 'rectangle' | 'circle' | 'polygon';

export const DEFECT_TYPE_LABELS: Record<DefectType, string> = {
  scratch: '划痕',
  mold: '霉斑',
  bright_spot: '亮点污染',
  scan_defect: '扫描缺陷',
};

export const DEFECT_TYPE_COLORS: Record<DefectType, string> = {
  scratch: '#ff4d4f',
  mold: '#52c41a',
  bright_spot: '#faad14',
  scan_defect: '#1890ff',
};

export const SEVERITY_LABELS: Record<Severity, string> = {
  mild: '轻微',
  moderate: '中等',
  severe: '严重',
};

export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  pending: '待复核',
  reviewed: '已复核',
};

export const PLATE_STATUS_LABELS: Record<PlateStatus, string> = {
  active: '整理中',
  archived: '已归档',
};
