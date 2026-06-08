import { v4 as uuidv4 } from 'uuid';
import type { Annotation, DefectType, RectangleAnnotation, CircleAnnotation, PolygonAnnotation, Point } from '../types';

interface DetectionOptions {
  plateId: string;
  imageWidth?: number;
  imageHeight?: number;
  confidenceThreshold?: number;
  detectTypes?: DefectType[];
  onProgress?: (progress: number) => void;
}

function randomInRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randomInt(min: number, max: number): number {
  return Math.floor(randomInRange(min, max + 1));
}

function generateScratchAnnotation(plateId: string, imageWidth: number, imageHeight: number): RectangleAnnotation {
  const width = randomInRange(30, 120);
  const height = randomInRange(5, 20);
  const x = randomInRange(0, imageWidth - width);
  const y = randomInRange(0, imageHeight - height);
  const confidence = randomInRange(0.6, 0.98);
  const severity = confidence > 0.85 ? 'severe' : confidence > 0.7 ? 'moderate' : 'mild';

  return {
    id: uuidv4(),
    plateId,
    shape: 'rectangle',
    x,
    y,
    width,
    height,
    defectType: 'scratch',
    severity,
    description: `自动检测到的划痕缺陷，置信度 ${(confidence * 100).toFixed(1)}%`,
    suggestion: '',
    reviewStatus: 'pending',
    createdBy: 'ai-system',
    createdByName: 'AI自动检测',
    lastModifiedBy: 'ai-system',
    lastModifiedByName: 'AI自动检测',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    confidence,
    isAutoDetected: true,
    autoDetectType: 'scratch',
    autoConfidence: confidence,
  };
}

function generateMoldAnnotation(plateId: string, imageWidth: number, imageHeight: number): CircleAnnotation {
  const radius = randomInRange(10, 40);
  const x = randomInRange(radius, imageWidth - radius);
  const y = randomInRange(radius, imageHeight - radius);
  const confidence = randomInRange(0.5, 0.9);
  const severity = confidence > 0.8 ? 'severe' : confidence > 0.65 ? 'moderate' : 'mild';

  return {
    id: uuidv4(),
    plateId,
    shape: 'circle',
    x,
    y,
    radius,
    defectType: 'mold',
    severity,
    description: `自动检测到的霉斑缺陷，置信度 ${(confidence * 100).toFixed(1)}%`,
    suggestion: '',
    reviewStatus: 'pending',
    createdBy: 'ai-system',
    createdByName: 'AI自动检测',
    lastModifiedBy: 'ai-system',
    lastModifiedByName: 'AI自动检测',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    confidence,
    isAutoDetected: true,
    autoDetectType: 'mold',
    autoConfidence: confidence,
  };
}

function generateBrightSpotAnnotation(plateId: string, imageWidth: number, imageHeight: number): CircleAnnotation {
  const radius = randomInRange(3, 15);
  const x = randomInRange(radius, imageWidth - radius);
  const y = randomInRange(radius, imageHeight - radius);
  const confidence = randomInRange(0.4, 0.85);
  const severity = confidence > 0.75 ? 'moderate' : 'mild';

  return {
    id: uuidv4(),
    plateId,
    shape: 'circle',
    x,
    y,
    radius,
    defectType: 'bright_spot',
    severity,
    description: `自动检测到的亮点污染，置信度 ${(confidence * 100).toFixed(1)}%`,
    suggestion: '',
    reviewStatus: 'pending',
    createdBy: 'ai-system',
    createdByName: 'AI自动检测',
    lastModifiedBy: 'ai-system',
    lastModifiedByName: 'AI自动检测',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    confidence,
    isAutoDetected: true,
    autoDetectType: 'bright_spot',
    autoConfidence: confidence,
  };
}

function generateScanDefectAnnotation(plateId: string, imageWidth: number, imageHeight: number): RectangleAnnotation {
  const width = randomInRange(80, 200);
  const height = randomInRange(10, 40);
  const x = randomInRange(0, imageWidth - width);
  const y = randomInRange(0, imageHeight - height);
  const confidence = randomInRange(0.55, 0.92);
  const severity = confidence > 0.8 ? 'severe' : confidence > 0.65 ? 'moderate' : 'mild';

  return {
    id: uuidv4(),
    plateId,
    shape: 'rectangle',
    x,
    y,
    width,
    height,
    defectType: 'scan_defect',
    severity,
    description: `自动检测到的扫描缺陷，置信度 ${(confidence * 100).toFixed(1)}%`,
    suggestion: '',
    reviewStatus: 'pending',
    createdBy: 'ai-system',
    createdByName: 'AI自动检测',
    lastModifiedBy: 'ai-system',
    lastModifiedByName: 'AI自动检测',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    confidence,
    isAutoDetected: true,
    autoDetectType: 'scan_defect',
    autoConfidence: confidence,
  };
}

function generatePolygonMoldAnnotation(plateId: string, imageWidth: number, imageHeight: number): PolygonAnnotation {
  const centerX = randomInRange(50, imageWidth - 50);
  const centerY = randomInRange(50, imageHeight - 50);
  const numPoints = randomInt(5, 8);
  const points: Point[] = [];

  for (let i = 0; i < numPoints; i++) {
    const angle = (i / numPoints) * Math.PI * 2;
    const radius = randomInRange(15, 35);
    points.push({
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius,
    });
  }

  const confidence = randomInRange(0.5, 0.88);
  const severity = confidence > 0.75 ? 'severe' : confidence > 0.6 ? 'moderate' : 'mild';

  return {
    id: uuidv4(),
    plateId,
    shape: 'polygon',
    points,
    defectType: 'mold',
    severity,
    description: `自动检测到的不规则霉斑，置信度 ${(confidence * 100).toFixed(1)}%`,
    suggestion: '',
    reviewStatus: 'pending',
    createdBy: 'ai-system',
    createdByName: 'AI自动检测',
    lastModifiedBy: 'ai-system',
    lastModifiedByName: 'AI自动检测',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    confidence,
    isAutoDetected: true,
    autoDetectType: 'mold',
    autoConfidence: confidence,
  };
}

export async function runAutoDetection(options: DetectionOptions): Promise<Annotation[]> {
  const {
    plateId,
    imageWidth = 800,
    imageHeight = 600,
    confidenceThreshold = 0.5,
    detectTypes = ['scratch', 'mold', 'bright_spot', 'scan_defect'],
    onProgress,
  } = options;

  const annotations: Annotation[] = [];
  const totalSteps = 10;

  for (let step = 1; step <= totalSteps; step++) {
    await new Promise((resolve) => setTimeout(resolve, 150));

    const progress = (step / totalSteps) * 100;
    onProgress?.(progress);

    if (step === 3 && detectTypes.includes('scratch')) {
      const count = randomInt(1, 3);
      for (let i = 0; i < count; i++) {
        const ann = generateScratchAnnotation(plateId, imageWidth, imageHeight);
        if (ann.confidence >= confidenceThreshold) {
          annotations.push(ann);
        }
      }
    }

    if (step === 5 && detectTypes.includes('mold')) {
      const count = randomInt(1, 2);
      for (let i = 0; i < count; i++) {
        const usePolygon = Math.random() > 0.5;
        const ann = usePolygon
          ? generatePolygonMoldAnnotation(plateId, imageWidth, imageHeight)
          : generateMoldAnnotation(plateId, imageWidth, imageHeight);
        if (ann.confidence >= confidenceThreshold) {
          annotations.push(ann);
        }
      }
    }

    if (step === 7 && detectTypes.includes('bright_spot')) {
      const count = randomInt(2, 5);
      for (let i = 0; i < count; i++) {
        const ann = generateBrightSpotAnnotation(plateId, imageWidth, imageHeight);
        if (ann.confidence >= confidenceThreshold) {
          annotations.push(ann);
        }
      }
    }

    if (step === 9 && detectTypes.includes('scan_defect')) {
      const count = randomInt(0, 2);
      for (let i = 0; i < count; i++) {
        const ann = generateScanDefectAnnotation(plateId, imageWidth, imageHeight);
        if (ann.confidence >= confidenceThreshold) {
          annotations.push(ann);
        }
      }
    }
  }

  return annotations;
}

export function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.8) return '#52c41a';
  if (confidence >= 0.6) return '#faad14';
  return '#ff4d4f';
}

export function getConfidenceLabel(confidence: number): string {
  if (confidence >= 0.8) return '高置信度';
  if (confidence >= 0.6) return '中置信度';
  return '低置信度';
}
