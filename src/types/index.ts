export type DefectType = 'scratch' | 'mold' | 'bright_spot' | 'scan_defect';

export type Severity = 'mild' | 'moderate' | 'severe';

export type AnnotationShape = 'rectangle' | 'circle' | 'polygon';

export type ReviewStatus = 'pending' | 'reviewed' | 'rejected';

export type PlateStatus = 'active' | 'archived';

export type UserRole = 'annotator' | 'reviewer' | 'admin';

export type DetectionStatus = 'idle' | 'running' | 'completed' | 'failed';

export type ModificationReason =
  | 'false_positive'
  | 'false_negative'
  | 'incorrect_type'
  | 'incorrect_boundary'
  | 'merged'
  | 'split'
  | 'other';

export type ToolType = 'select' | 'rectangle' | 'circle' | 'polygon' | 'merge' | 'split';

export interface Point {
  x: number;
  y: number;
}

export interface User {
  id: string;
  name: string;
  avatar?: string;
  role: UserRole;
}

export interface ReviewRecord {
  id: string;
  annotationId: string;
  reviewerId: string;
  reviewerName: string;
  status: ReviewStatus;
  comment: string;
  reviewedAt: string;
}

export interface HistoryEntry {
  id: string;
  annotationId: string;
  action: 'create' | 'update' | 'delete' | 'review';
  userId: string;
  userName: string;
  timestamp: string;
  beforeData?: Partial<Annotation>;
  afterData?: Partial<Annotation>;
  reviewRecords?: ReviewRecord[];
  description: string;
}

export interface FilterOptions {
  defectTypes: DefectType[];
  severities: Severity[];
  reviewStatuses: ReviewStatus[];
  keyword: string;
  confidenceMin?: number;
  confidenceMax?: number;
  isAutoDetected?: boolean | null;
}

export interface ModificationRecord {
  id: string;
  annotationId: string;
  reason: ModificationReason;
  description: string;
  modifiedBy: string;
  modifiedByName: string;
  modifiedAt: string;
  beforeData?: Partial<Annotation>;
  afterData?: Partial<Annotation>;
}

export interface DetectionResult {
  plateId: string;
  status: DetectionStatus;
  progress: number;
  totalDetected: number;
  startedAt?: string;
  completedAt?: string;
  errorMessage?: string;
}

export interface DetectionStatistics {
  totalCount: number;
  autoDetectedCount: number;
  manualAddedCount: number;
  manualCorrectedCount: number;
  falsePositiveCount: number;
  falseNegativeCount: number;
  avgConfidence: number;
  highConfidenceCount: number;
  mediumConfidenceCount: number;
  lowConfidenceCount: number;
  reviewedCount: number;
  pendingReviewCount: number;
  passCount: number;
  rejectCount: number;
  defectTypeStats: Record<DefectType, number>;
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
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  lastModifiedBy: string;
  lastModifiedByName: string;
  confidence: number;
  isAutoDetected: boolean;
  autoDetectType?: DefectType;
  autoConfidence?: number;
  modificationReason?: ModificationReason;
  modificationNote?: string;
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
  thumbnailUrl: string;
  width: number;
  height: number;
  status: PlateStatus;
  description: string;
  createdAt: string;
  updatedAt: string;
}

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

export const SEVERITY_COLORS: Record<Severity, string> = {
  mild: 'blue',
  moderate: 'orange',
  severe: 'red',
};

export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  pending: '待复核',
  reviewed: '已通过',
  rejected: '已驳回',
};

export const REVIEW_STATUS_COLORS: Record<ReviewStatus, string> = {
  pending: 'orange',
  reviewed: 'green',
  rejected: 'red',
};

export const PLATE_STATUS_LABELS: Record<PlateStatus, string> = {
  active: '整理中',
  archived: '已归档',
};

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  annotator: '标注员',
  reviewer: '复核员',
  admin: '管理员',
};

export const MODIFICATION_REASON_LABELS: Record<ModificationReason, string> = {
  false_positive: '误检（假阳性）',
  false_negative: '漏检（假阴性）',
  incorrect_type: '类型错误',
  incorrect_boundary: '边界不准确',
  merged: '合并标注',
  split: '拆分标注',
  other: '其他原因',
};

export const DETECTION_STATUS_LABELS: Record<DetectionStatus, string> = {
  idle: '空闲',
  running: '检测中',
  completed: '已完成',
  failed: '检测失败',
};

export type DiffType = 'added' | 'removed' | 'moved' | 'type_changed' | 'unchanged';

export type ComparisonViewMode = 'split' | 'overlay';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'merged';

export type FinalConclusionStatus = 'draft' | 'submitted' | 'archived';

export interface PlateVersion {
  id: string;
  plateId: string;
  versionNumber: number;
  versionName: string;
  scanDate: string;
  scanBatch: string;
  imageUrl: string;
  thumbnailUrl: string;
  width: number;
  height: number;
  annotationCount: number;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  description: string;
  isBaseline: boolean;
}

export interface DiffItem {
  id: string;
  diffType: DiffType;
  oldAnnotationId?: string;
  newAnnotationId?: string;
  oldAnnotation?: Annotation;
  newAnnotation?: Annotation;
  positionOffset?: { dx: number; dy: number; distance: number };
  oldType?: DefectType;
  newType?: DefectType;
  severity?: Severity;
  confidence?: number;
  description?: string;
}

export interface ComparisonResult {
  id: string;
  plateId: string;
  baseVersionId: string;
  compareVersionId: string;
  diffItems: DiffItem[];
  summary: DiffSummary;
  comparedAt: string;
  comparedBy: string;
  comparedByName: string;
}

export interface DiffSummary {
  totalDiffCount: number;
  addedCount: number;
  removedCount: number;
  movedCount: number;
  typeChangedCount: number;
  unchangedCount: number;
  byType: Record<DefectType, { added: number; removed: number; moved: number; typeChanged: number }>;
}

export interface ApprovalRecord {
  id: string;
  diffItemId: string;
  comparisonId: string;
  approverId: string;
  approverName: string;
  status: ApprovalStatus;
  comment: string;
  newDefectType?: DefectType;
  newSeverity?: Severity;
  createdAt: string;
}

export interface VersionChangeHistory {
  id: string;
  plateId: string;
  versionId: string;
  action: 'create' | 'update' | 'compare' | 'approve' | 'archive';
  userId: string;
  userName: string;
  timestamp: string;
  description: string;
  details?: Record<string, any>;
}

export interface FinalConclusion {
  id: string;
  plateId: string;
  versionIds: string[];
  title: string;
  content: string;
  status: FinalConclusionStatus;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  reviewerIds: string[];
  reviewerNames: string[];
  approvedCount: number;
  totalReviewers: number;
  attachments?: string[];
}

export interface TrendStatistics {
  date: string;
  totalDefects: number;
  addedDefects: number;
  removedDefects: number;
  byType: Record<DefectType, number>;
}

export const DIFF_TYPE_LABELS: Record<DiffType, string> = {
  added: '新增缺陷',
  removed: '消失缺陷',
  moved: '位置偏移',
  type_changed: '类型变更',
  unchanged: '无变化',
};

export const DIFF_TYPE_COLORS: Record<DiffType, string> = {
  added: '#52c41a',
  removed: '#ff4d4f',
  moved: '#faad14',
  type_changed: '#1890ff',
  unchanged: '#8c8c8c',
};

export const APPROVAL_STATUS_LABELS: Record<ApprovalStatus, string> = {
  pending: '待审定',
  approved: '已确认',
  rejected: '已驳回',
  merged: '已合并',
};

export const APPROVAL_STATUS_COLORS: Record<ApprovalStatus, string> = {
  pending: 'orange',
  approved: 'green',
  rejected: 'red',
  merged: 'blue',
};

export const FINAL_CONCLUSION_STATUS_LABELS: Record<FinalConclusionStatus, string> = {
  draft: '草稿',
  submitted: '已提交',
  archived: '已归档',
};

export const MOCK_USERS: User[] = [
  { id: 'user-1', name: '张标注', role: 'annotator' },
  { id: 'user-2', name: '李复核', role: 'reviewer' },
  { id: 'user-3', name: '王管理', role: 'admin' },
  { id: 'user-4', name: '赵标注', role: 'annotator' },
  { id: 'user-5', name: '陈研究员', role: 'reviewer' },
];
