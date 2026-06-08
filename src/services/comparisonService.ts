import { v4 as uuidv4 } from 'uuid';
import type {
  Annotation,
  DefectType,
  DiffItem,
  DiffType,
  DiffSummary,
  ComparisonResult,
  Severity,
} from '../types';
import { DEFECT_TYPE_LABELS } from '../types';

const POSITION_THRESHOLD = 30;

function getAnnotationCenter(ann: Annotation): { x: number; y: number } {
  if (ann.shape === 'rectangle') {
    return { x: ann.x + ann.width / 2, y: ann.y + ann.height / 2 };
  }
  if (ann.shape === 'circle') {
    return { x: ann.x, y: ann.y };
  }
  if (ann.shape === 'polygon') {
    const xs = ann.points.map((p) => p.x);
    const ys = ann.points.map((p) => p.y);
    return {
      x: (Math.min(...xs) + Math.max(...xs)) / 2,
      y: (Math.min(...ys) + Math.max(...ys)) / 2,
    };
  }
  return { x: 0, y: 0 };
}

function getDistance(p1: { x: number; y: number }, p2: { x: number; y: number }): number {
  return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
}

export function compareAnnotations(
  baseAnnotations: Annotation[],
  compareAnnotations: Annotation[],
  plateId: string,
  baseVersionId: string,
  compareVersionId: string,
  userId: string,
  userName: string
): ComparisonResult {
  const diffItems: DiffItem[] = [];
  const matchedNew = new Set<string>();

  for (const baseAnn of baseAnnotations) {
    const baseCenter = getAnnotationCenter(baseAnn);
    let bestMatch: Annotation | null = null;
    let bestDistance = Infinity;

    for (const compareAnn of compareAnnotations) {
      if (matchedNew.has(compareAnn.id)) continue;
      const compareCenter = getAnnotationCenter(compareAnn);
      const distance = getDistance(baseCenter, compareCenter);
      if (distance < bestDistance && distance < POSITION_THRESHOLD * 3) {
        bestMatch = compareAnn;
        bestDistance = distance;
      }
    }

    if (bestMatch) {
      matchedNew.add(bestMatch.id);
      const bestMatchAnn = bestMatch;
      const isMoved = bestDistance > POSITION_THRESHOLD;
      const isTypeChanged = baseAnn.defectType !== bestMatchAnn.defectType;

      if (isMoved && isTypeChanged) {
        diffItems.push({
          id: uuidv4(),
          diffType: 'type_changed',
          oldAnnotationId: baseAnn.id,
          newAnnotationId: bestMatchAnn.id,
          oldAnnotation: baseAnn,
          newAnnotation: bestMatchAnn,
          positionOffset: {
            dx: getAnnotationCenter(bestMatchAnn).x - baseCenter.x,
            dy: getAnnotationCenter(bestMatchAnn).y - baseCenter.y,
            distance: bestDistance,
          },
          oldType: baseAnn.defectType,
          newType: bestMatchAnn.defectType,
          severity: baseAnn.severity,
          confidence: Math.min(baseAnn.confidence, bestMatchAnn.confidence),
          description: `缺陷类型从${DEFECT_TYPE_LABELS[baseAnn.defectType]}变更为${DEFECT_TYPE_LABELS[bestMatchAnn.defectType]}，位置偏移${bestDistance.toFixed(1)}像素`,
        });
      } else if (isMoved) {
        diffItems.push({
          id: uuidv4(),
          diffType: 'moved',
          oldAnnotationId: baseAnn.id,
          newAnnotationId: bestMatchAnn.id,
          oldAnnotation: baseAnn,
          newAnnotation: bestMatchAnn,
          positionOffset: {
            dx: getAnnotationCenter(bestMatchAnn).x - baseCenter.x,
            dy: getAnnotationCenter(bestMatchAnn).y - baseCenter.y,
            distance: bestDistance,
          },
          oldType: baseAnn.defectType,
          newType: bestMatchAnn.defectType,
          severity: baseAnn.severity,
          confidence: Math.min(baseAnn.confidence, bestMatchAnn.confidence),
          description: `位置偏移${bestDistance.toFixed(1)}像素`,
        });
      } else if (isTypeChanged) {
        diffItems.push({
          id: uuidv4(),
          diffType: 'type_changed',
          oldAnnotationId: baseAnn.id,
          newAnnotationId: bestMatchAnn.id,
          oldAnnotation: baseAnn,
          newAnnotation: bestMatchAnn,
          oldType: baseAnn.defectType,
          newType: bestMatchAnn.defectType,
          severity: baseAnn.severity,
          confidence: Math.min(baseAnn.confidence, bestMatchAnn.confidence),
          description: `缺陷类型从${DEFECT_TYPE_LABELS[baseAnn.defectType]}变更为${DEFECT_TYPE_LABELS[bestMatchAnn.defectType]}`,
        });
      } else {
        diffItems.push({
          id: uuidv4(),
          diffType: 'unchanged',
          oldAnnotationId: baseAnn.id,
          newAnnotationId: bestMatchAnn.id,
          oldAnnotation: baseAnn,
          newAnnotation: bestMatchAnn,
          oldType: baseAnn.defectType,
          newType: bestMatchAnn.defectType,
          severity: baseAnn.severity,
          confidence: Math.min(baseAnn.confidence, bestMatchAnn.confidence),
          description: '无明显变化',
        });
      }
    } else {
      diffItems.push({
        id: uuidv4(),
        diffType: 'removed',
        oldAnnotationId: baseAnn.id,
        oldAnnotation: baseAnn,
        oldType: baseAnn.defectType,
        severity: baseAnn.severity,
        confidence: baseAnn.confidence,
        description: `${DEFECT_TYPE_LABELS[baseAnn.defectType]}缺陷已消失`,
      });
    }
  }

  for (const compareAnn of compareAnnotations) {
    if (matchedNew.has(compareAnn.id)) continue;
    diffItems.push({
      id: uuidv4(),
      diffType: 'added',
      newAnnotationId: compareAnn.id,
      newAnnotation: compareAnn,
      newType: compareAnn.defectType,
      severity: compareAnn.severity,
      confidence: compareAnn.confidence,
      description: `新增${DEFECT_TYPE_LABELS[compareAnn.defectType]}缺陷`,
    });
  }

  const summary = generateSummary(diffItems);

  return {
    id: uuidv4(),
    plateId,
    baseVersionId,
    compareVersionId,
    diffItems,
    summary,
    comparedAt: new Date().toISOString(),
    comparedBy: userId,
    comparedByName: userName,
  };
}

function generateSummary(diffItems: DiffItem[]): DiffSummary {
  let addedCount = 0;
  let removedCount = 0;
  let movedCount = 0;
  let typeChangedCount = 0;
  let unchangedCount = 0;

  const byType: Record<DefectType, { added: number; removed: number; moved: number; typeChanged: number }> = {
    scratch: { added: 0, removed: 0, moved: 0, typeChanged: 0 },
    mold: { added: 0, removed: 0, moved: 0, typeChanged: 0 },
    bright_spot: { added: 0, removed: 0, moved: 0, typeChanged: 0 },
    scan_defect: { added: 0, removed: 0, moved: 0, typeChanged: 0 },
  };

  for (const item of diffItems) {
    switch (item.diffType) {
      case 'added':
        addedCount++;
        if (item.newType) byType[item.newType].added++;
        break;
      case 'removed':
        removedCount++;
        if (item.oldType) byType[item.oldType].removed++;
        break;
      case 'moved':
        movedCount++;
        if (item.newType) byType[item.newType].moved++;
        break;
      case 'type_changed':
        typeChangedCount++;
        if (item.newType) byType[item.newType].typeChanged++;
        break;
      case 'unchanged':
        unchangedCount++;
        break;
    }
  }

  return {
    totalDiffCount: diffItems.length,
    addedCount,
    removedCount,
    movedCount,
    typeChangedCount,
    unchangedCount,
    byType,
  };
}

export function filterDiffItems(
  diffItems: DiffItem[],
  options: {
    diffTypes?: DiffType[];
    defectTypes?: DefectType[];
    severities?: Severity[];
    keyword?: string;
  }
): DiffItem[] {
  const { diffTypes, defectTypes, severities, keyword } = options;

  return diffItems.filter((item) => {
    if (diffTypes && diffTypes.length > 0 && !diffTypes.includes(item.diffType)) {
      return false;
    }

    if (defectTypes && defectTypes.length > 0) {
      const itemType = item.newType || item.oldType;
      if (!itemType || !defectTypes.includes(itemType)) {
        return false;
      }
    }

    if (severities && severities.length > 0) {
      if (!item.severity || !severities.includes(item.severity)) {
        return false;
      }
    }

    if (keyword) {
      const kw = keyword.toLowerCase();
      if (item.description && item.description.toLowerCase().includes(kw)) {
        return true;
      }
      if (item.oldAnnotation?.description.toLowerCase().includes(kw)) {
        return true;
      }
      if (item.newAnnotation?.description.toLowerCase().includes(kw)) {
        return true;
      }
      return false;
    }

    return true;
  });
}
