import { useRef, useEffect, useState } from 'react';
import { Stage, Layer, Image, Rect, Circle, Line, Text } from 'react-konva';
import useImage from 'use-image';
import { useApp } from '../store/AppContext';
import { DEFECT_TYPE_COLORS, DIFF_TYPE_COLORS } from '../types';
import type { Annotation, DiffItem } from '../types';

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

function AnnotationShape({
  annotation,
  color,
  isSelected,
  strokeWidth = 2,
  opacity = 1,
}: {
  annotation: Annotation;
  color: string;
  isSelected?: boolean;
  strokeWidth?: number;
  opacity?: number;
}) {
  const sw = isSelected ? strokeWidth + 1 : strokeWidth;

  if (annotation.shape === 'rectangle') {
    return (
      <Rect
        x={annotation.x}
        y={annotation.y}
        width={annotation.width}
        height={annotation.height}
        stroke={color}
        strokeWidth={sw}
        opacity={opacity}
        dash={isSelected ? undefined : [5, 3]}
      />
    );
  }

  if (annotation.shape === 'circle') {
    return (
      <Circle
        x={annotation.x}
        y={annotation.y}
        radius={annotation.radius}
        stroke={color}
        strokeWidth={sw}
        opacity={opacity}
        dash={isSelected ? undefined : [5, 3]}
      />
    );
  }

  if (annotation.shape === 'polygon') {
    const flatPoints = annotation.points.flatMap((p) => [p.x, p.y]);
    return (
      <Line
        points={flatPoints}
        stroke={color}
        strokeWidth={sw}
        closed
        opacity={opacity}
        dash={isSelected ? undefined : [5, 3]}
      />
    );
  }

  return null;
}

function SingleVersionCanvas({
  imageUrl,
  annotations,
  diffItems,
  width,
  height,
  title,
  isBase,
  selectedDiffId,
  onDiffClick,
  scale,
}: {
  imageUrl: string;
  annotations: Annotation[];
  diffItems: DiffItem[];
  width: number;
  height: number;
  title: string;
  isBase: boolean;
  selectedDiffId: string | null;
  onDiffClick: (diffItem: DiffItem) => void;
  scale: number;
}) {
  const [image] = useImage(imageUrl, 'anonymous');

  const getDiffForAnnotation = (annId: string): DiffItem | undefined => {
    return diffItems.find((d) =>
      isBase ? d.oldAnnotationId === annId : d.newAnnotationId === annId
    );
  };

  const handleAnnotationClick = (ann: Annotation) => {
    const diff = getDiffForAnnotation(ann.id);
    if (diff) {
      onDiffClick(diff);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div
        style={{
          padding: '8px 12px',
          background: isBase ? '#e6f7ff' : '#f6ffed',
          borderBottom: '1px solid #d9d9d9',
          fontWeight: 500,
          fontSize: 13,
        }}
      >
        {title}
        <span style={{ marginLeft: 8, color: '#8c8c8c', fontSize: 12, fontWeight: 'normal' }}>
          ({annotations.length} 个缺陷)
        </span>
      </div>
      <div style={{ flex: 1, overflow: 'auto', background: '#f5f5f5', position: 'relative' }}>
        {image && (
          <Stage width={width * scale} height={height * scale} scaleX={scale} scaleY={scale}>
            <Layer>
              <Image image={image} width={width} height={height} />
            </Layer>
            <Layer>
              {annotations.map((ann) => {
                const diff = getDiffForAnnotation(ann.id);
                const diffType = diff?.diffType || 'unchanged';
                const color = DIFF_TYPE_COLORS[diffType];
                const isSelected = diff?.id === selectedDiffId;

                return (
                  <g key={ann.id} onClick={() => handleAnnotationClick(ann)}>
                    <AnnotationShape
                      annotation={ann}
                      color={color}
                      isSelected={isSelected}
                      strokeWidth={2}
                    />
                    {isSelected && ann.description && (
                      <Text
                        x={(ann as any).x || 0}
                        y={((ann as any).y || 0) - 18}
                        text={ann.description.slice(0, 20)}
                        fontSize={12}
                        fill="#fff"
                        fontStyle="bold"
                        shadowColor="#000"
                        shadowBlur={2}
                      />
                    )}
                  </g>
                );
              })}
            </Layer>
          </Stage>
        )}
      </div>
    </div>
  );
}

export default function ComparisonCanvas() {
  const {
    selectedBaseVersion,
    selectedCompareVersion,
    baseVersionAnnotations,
    compareVersionAnnotations,
    currentComparison,
    selectedDiffItem,
    comparisonViewMode,
    selectDiffItem,
  } = useApp();

  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.6);
  const [overlayOpacity, setOverlayOpacity] = useState(0.5);

  useEffect(() => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.clientWidth;
      const containerHeight = containerRef.current.clientHeight;
      const imgWidth = selectedBaseVersion?.width || 1200;
      const imgHeight = selectedBaseVersion?.height || 900;

      if (comparisonViewMode === 'split') {
        const scaleX = (containerWidth / 2 - 20) / imgWidth;
        const scaleY = (containerHeight - 60) / imgHeight;
        setScale(Math.min(scaleX, scaleY, 1));
      } else {
        const scaleX = (containerWidth - 20) / imgWidth;
        const scaleY = (containerHeight - 60) / imgHeight;
        setScale(Math.min(scaleX, scaleY, 1));
      }
    }
  }, [selectedBaseVersion, comparisonViewMode]);

  const diffItems = currentComparison?.diffItems || [];

  const handleDiffClick = (diffItem: DiffItem) => {
    selectDiffItem(diffItem.id);
  };

  if (!selectedBaseVersion || !selectedCompareVersion) {
    return (
      <div
        style={{
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#8c8c8c',
        }}
      >
        请选择要对比的两个版本
      </div>
    );
  }

  if (comparisonViewMode === 'split') {
    return (
      <div
        ref={containerRef}
        style={{ display: 'flex', height: '100%', gap: 1, background: '#d9d9d9' }}
      >
        <div style={{ flex: 1, background: '#fff' }}>
          <SingleVersionCanvas
            imageUrl={selectedBaseVersion.imageUrl}
            annotations={baseVersionAnnotations}
            diffItems={diffItems}
            width={selectedBaseVersion.width}
            height={selectedBaseVersion.height}
            title={`基线版本 - ${selectedBaseVersion.versionName}`}
            isBase={true}
            selectedDiffId={selectedDiffItem?.id || null}
            onDiffClick={handleDiffClick}
            scale={scale}
          />
        </div>
        <div style={{ flex: 1, background: '#fff' }}>
          <SingleVersionCanvas
            imageUrl={selectedCompareVersion.imageUrl}
            annotations={compareVersionAnnotations}
            diffItems={diffItems}
            width={selectedCompareVersion.width}
            height={selectedCompareVersion.height}
            title={`对比版本 - ${selectedCompareVersion.versionName}`}
            isBase={false}
            selectedDiffId={selectedDiffItem?.id || null}
            onDiffClick={handleDiffClick}
            scale={scale}
          />
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{ height: '100%', position: 'relative' }}>
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          padding: '8px 12px',
          background: 'rgba(255,255,255,0.9)',
          borderBottom: '1px solid #d9d9d9',
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <span style={{ fontWeight: 500, fontSize: 13 }}>叠加对比视图</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
          <span style={{ color: '#8c8c8c' }}>对比版透明度:</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={overlayOpacity}
            onChange={(e) => setOverlayOpacity(parseFloat(e.target.value))}
            style={{ width: 100 }}
          />
          <span style={{ color: '#8c8c8c' }}>{Math.round(overlayOpacity * 100)}%</span>
        </div>
      </div>
      <div
        style={{
          width: '100%',
          height: '100%',
          paddingTop: 45,
          boxSizing: 'border-box',
          overflow: 'auto',
          background: '#f5f5f5',
          position: 'relative',
        }}
      >
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <Stage
            width={selectedBaseVersion.width * scale}
            height={selectedBaseVersion.height * scale}
            scaleX={scale}
            scaleY={scale}
            style={{ position: 'absolute', top: 0, left: 0 }}
          >
            <Layer>
              <Image
                image={useImage(selectedBaseVersion.imageUrl, 'anonymous')[0]}
                width={selectedBaseVersion.width}
                height={selectedBaseVersion.height}
              />
            </Layer>
            <Layer>
              {baseVersionAnnotations.map((ann) => (
                <AnnotationShape
                  key={ann.id}
                  annotation={ann}
                  color="#ff4d4f"
                  strokeWidth={2}
                  opacity={0.8}
                />
              ))}
            </Layer>
          </Stage>

          <Stage
            width={selectedCompareVersion.width * scale}
            height={selectedCompareVersion.height * scale}
            scaleX={scale}
            scaleY={scale}
            style={{ position: 'absolute', top: 0, left: 0 }}
          >
            <Layer opacity={overlayOpacity}>
              <Image
                image={useImage(selectedCompareVersion.imageUrl, 'anonymous')[0]}
                width={selectedCompareVersion.width}
                height={selectedCompareVersion.height}
              />
            </Layer>
            <Layer>
              {compareVersionAnnotations.map((ann) => {
                const diff = diffItems.find((d) => d.newAnnotationId === ann.id);
                const diffType = diff?.diffType || 'unchanged';
                const color = DIFF_TYPE_COLORS[diffType];
                const isSelected = diff?.id === selectedDiffItem?.id;
                return (
                  <g key={ann.id} onClick={() => diff && handleDiffClick(diff)}>
                    <AnnotationShape
                      annotation={ann}
                      color={color}
                      isSelected={isSelected}
                      strokeWidth={2}
                    />
                  </g>
                );
              })}
            </Layer>
          </Stage>

          <svg
            width={selectedBaseVersion.width * scale}
            height={selectedBaseVersion.height * scale}
            style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
          >
            {diffItems
              .filter((d) => d.diffType === 'moved' && d.oldAnnotation && d.newAnnotation)
              .map((d) => {
                const oldCenter = getAnnotationCenter(d.oldAnnotation!);
                const newCenter = getAnnotationCenter(d.newAnnotation!);
                return (
                  <line
                    key={`line-${d.id}`}
                    x1={oldCenter.x * scale}
                    y1={oldCenter.y * scale}
                    x2={newCenter.x * scale}
                    y2={newCenter.y * scale}
                    stroke="#faad14"
                    strokeWidth={2}
                    strokeDasharray="5,5"
                  />
                );
              })}
          </svg>
        </div>
      </div>
    </div>
  );
}
