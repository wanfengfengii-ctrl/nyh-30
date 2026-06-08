import { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Image as KonvaImage, Rect, Circle, Line, Transformer } from 'react-konva';
import type Konva from 'konva';
import useImage from 'use-image';
import { Button, Space, Tooltip, Select } from 'antd';
import {
  SelectOutlined,
  BgColorsOutlined,
  BorderOutlined,
  ScissorOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useApp } from '../store/AppContext';
import type { ToolType, Annotation, DefectType, Point } from '../types';
import { DEFECT_TYPE_COLORS, DEFECT_TYPE_LABELS } from '../types';

interface AnnotationCanvasProps {
  defaultDefectType: DefectType;
  onDefectTypeChange: (type: DefectType) => void;
}

export default function AnnotationCanvas({ defaultDefectType, onDefectTypeChange }: AnnotationCanvasProps) {
  const { selectedPlate, selectedAnnotation, plateAnnotations, dispatch } = useApp();
  const [image] = useImage(selectedPlate?.imageUrl || '', 'anonymous');

  const containerRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });

  const [tool, setTool] = useState<ToolType>('select');
  const [scale, setScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState({ x: 0, y: 0 });
  const [drawEnd, setDrawEnd] = useState({ x: 0, y: 0 });

  const [polygonPoints, setPolygonPoints] = useState<Point[]>([]);
  const [isPolygonDrawing, setIsPolygonDrawing] = useState(false);

  const stageRef = useRef<Konva.Stage>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const shapeRefs = useRef<Record<string, Konva.Node>>({});

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setStageSize({ width: rect.width, height: rect.height });
      }
    };

    updateSize();

    const resizeObserver = new ResizeObserver(updateSize);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    window.addEventListener('resize', updateSize);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, []);

  useEffect(() => {
    if (image && selectedPlate && stageSize.width > 0 && stageSize.height > 0) {
      const ratio = Math.min(stageSize.width / image.width, stageSize.height / image.height);
      const initialScale = ratio * 0.8;
      setScale(initialScale);
      setStagePos({
        x: (stageSize.width - image.width * initialScale) / 2,
        y: (stageSize.height - image.height * initialScale) / 2,
      });
    }
  }, [image, selectedPlate, stageSize]);

  useEffect(() => {
    if (selectedAnnotation && trRef.current && shapeRefs.current[selectedAnnotation.id]) {
      trRef.current.nodes([shapeRefs.current[selectedAnnotation.id]]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [selectedAnnotation]);

  const getPointerPosition = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = stageRef.current;
    if (!stage) return { x: 0, y: 0 };
    const pos = stage.getPointerPosition() || { x: 0, y: 0 };
    return {
      x: (pos.x - stagePos.x) / scale,
      y: (pos.y - stagePos.y) / scale,
    };
  };

  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;

    const oldScale = scale;
    const pointer = stage.getPointerPosition() || { x: 0, y: 0 };

    const mousePointTo = {
      x: (pointer.x - stagePos.x) / oldScale,
      y: (pointer.y - stagePos.y) / oldScale,
    };

    const delta = e.evt.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.1, Math.min(10, oldScale * delta));

    setScale(newScale);
    setStagePos({
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    });
  };

  const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (e.target !== e.target.getStage()) {
      if (tool === 'select') {
        return;
      }
    }

    if (tool === 'select') {
      if (e.target === e.target.getStage()) {
        dispatch({ type: 'SELECT_ANNOTATION', payload: null });
        setIsDragging(true);
        setDragStart({
          x: e.evt.clientX - stagePos.x,
          y: e.evt.clientY - stagePos.y,
        });
      }
      return;
    }

    const pos = getPointerPosition(e);

    if (tool === 'rectangle') {
      setIsDrawing(true);
      setDrawStart(pos);
      setDrawEnd(pos);
    } else if (tool === 'circle') {
      setIsDrawing(true);
      setDrawStart(pos);
      setDrawEnd(pos);
    } else if (tool === 'polygon') {
      if (!isPolygonDrawing) {
        setIsPolygonDrawing(true);
        setPolygonPoints([pos]);
      } else {
        setPolygonPoints([...polygonPoints, pos]);
      }
    }
  };

  const handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (isDragging) {
      setStagePos({
        x: e.evt.clientX - dragStart.x,
        y: e.evt.clientY - dragStart.y,
      });
      return;
    }

    if (isDrawing && (tool === 'rectangle' || tool === 'circle')) {
      const pos = getPointerPosition(e);
      setDrawEnd(pos);
    }
  };

  const handleMouseUp = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (isDragging) {
      setIsDragging(false);
      return;
    }

    if (!isDrawing) return;

    if (tool === 'rectangle') {
      const x = Math.min(drawStart.x, drawEnd.x);
      const y = Math.min(drawStart.y, drawEnd.y);
      const width = Math.abs(drawEnd.x - drawStart.x);
      const height = Math.abs(drawEnd.y - drawStart.y);

      if (width > 5 && height > 5) {
        dispatch({
          type: 'ADD_RECT_ANNOTATION',
          payload: {
            plateId: selectedPlate!.id,
            shape: 'rectangle',
            x,
            y,
            width,
            height,
            defectType: defaultDefectType,
            severity: 'moderate',
            description: '',
            suggestion: '',
          },
        });
      }
      setIsDrawing(false);
      setTool('select');
    } else if (tool === 'circle') {
      const dx = drawEnd.x - drawStart.x;
      const dy = drawEnd.y - drawStart.y;
      const radius = Math.sqrt(dx * dx + dy * dy);

      if (radius > 5) {
        dispatch({
          type: 'ADD_CIRCLE_ANNOTATION',
          payload: {
            plateId: selectedPlate!.id,
            shape: 'circle',
            x: drawStart.x,
            y: drawStart.y,
            radius,
            defectType: defaultDefectType,
            severity: 'moderate',
            description: '',
            suggestion: '',
          },
        });
      }
      setIsDrawing(false);
      setTool('select');
    }
  };

  const handleDoubleClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (tool === 'polygon' && isPolygonDrawing && polygonPoints.length >= 3) {
      dispatch({
        type: 'ADD_POLYGON_ANNOTATION',
        payload: {
          plateId: selectedPlate!.id,
          shape: 'polygon',
          points: polygonPoints,
          defectType: defaultDefectType,
          severity: 'moderate',
          description: '',
          suggestion: '',
        },
      });
      setIsPolygonDrawing(false);
      setPolygonPoints([]);
      setTool('select');
    }
  };

  const handleShapeClick = (e: Konva.KonvaEventObject<MouseEvent>, annotationId: string) => {
    e.cancelBubble = true;
    if (tool === 'select') {
      dispatch({ type: 'SELECT_ANNOTATION', payload: annotationId });
    }
  };

  const handleTransformEnd = (e: Konva.KonvaEventObject<Event>) => {
    const node = e.target;
    const id = node.id();

    if (selectedAnnotation?.shape === 'rectangle') {
      const rectNode = node as Konva.Rect;
      const scaleX = rectNode.scaleX();
      const scaleY = rectNode.scaleY();
      rectNode.scaleX(1);
      rectNode.scaleY(1);

      dispatch({
        type: 'RESIZE_RECT_ANNOTATION',
        payload: {
          id,
          x: rectNode.x(),
          y: rectNode.y(),
          width: Math.max(5, rectNode.width() * scaleX),
          height: Math.max(5, rectNode.height() * scaleY),
        },
      });
    } else if (selectedAnnotation?.shape === 'circle') {
      const circleNode = node as Konva.Circle;
      const scaleX = circleNode.scaleX();
      circleNode.scaleX(1);
      circleNode.scaleY(1);

      dispatch({
        type: 'RESIZE_CIRCLE_ANNOTATION',
        payload: {
          id,
          x: circleNode.x(),
          y: circleNode.y(),
          radius: Math.max(5, circleNode.radius() * scaleX),
        },
      });
    }
  };

  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    const node = e.target;
    const id = node.id();

    if (selectedAnnotation?.shape === 'rectangle') {
      dispatch({
        type: 'RESIZE_RECT_ANNOTATION',
        payload: { id, x: node.x(), y: node.y() },
      });
    } else if (selectedAnnotation?.shape === 'circle') {
      dispatch({
        type: 'RESIZE_CIRCLE_ANNOTATION',
        payload: { id, x: node.x(), y: node.y() },
      });
    } else if (selectedAnnotation?.shape === 'polygon') {
      const ann = plateAnnotations.find((a) => a.id === id);
      if (ann && ann.shape === 'polygon') {
        const dx = node.x();
        const dy = node.y();
        const newPoints = ann.points.map((p) => ({
          x: p.x + dx,
          y: p.y + dy,
        }));
        dispatch({
          type: 'UPDATE_ANNOTATION',
          payload: { id, data: { points: newPoints } },
        });
        node.position({ x: 0, y: 0 });
      }
    }
  };

  const handleZoomIn = () => {
    setScale((s) => Math.min(10, s * 1.2));
  };

  const handleZoomOut = () => {
    setScale((s) => Math.max(0.1, s / 1.2));
  };

  const handleResetView = () => {
    if (image && stageSize.width > 0 && stageSize.height > 0) {
      const ratio = Math.min(stageSize.width / image.width, stageSize.height / image.height);
      const initialScale = ratio * 0.8;
      setScale(initialScale);
      setStagePos({
        x: (stageSize.width - image.width * initialScale) / 2,
        y: (stageSize.height - image.height * initialScale) / 2,
      });
    }
  };

  const cancelPolygonDrawing = () => {
    setIsPolygonDrawing(false);
    setPolygonPoints([]);
    setTool('select');
  };

  const renderAnnotation = (ann: Annotation) => {
    const color = DEFECT_TYPE_COLORS[ann.defectType];
    const isSelected = selectedAnnotation?.id === ann.id;
    const strokeWidth = isSelected ? 3 / scale : 2 / scale;

    const commonProps = {
      id: ann.id,
      key: ann.id,
      stroke: color,
      strokeWidth,
      fill: `${color}22`,
      draggable: tool === 'select',
      onClick: (e: Konva.KonvaEventObject<MouseEvent>) => handleShapeClick(e, ann.id),
      onTap: (e: Konva.KonvaEventObject<Event>) => handleShapeClick(e as any, ann.id),
      onDragEnd: handleDragEnd,
      onTransformEnd: handleTransformEnd,
      ref: (node: Konva.Node | null) => {
        if (node) shapeRefs.current[ann.id] = node;
      },
    };

    if (ann.shape === 'rectangle') {
      return (
        <Rect
          {...commonProps}
          x={ann.x}
          y={ann.y}
          width={ann.width}
          height={ann.height}
        />
      );
    }

    if (ann.shape === 'circle') {
      return (
        <Circle
          {...commonProps}
          x={ann.x}
          y={ann.y}
          radius={ann.radius}
        />
      );
    }

    if (ann.shape === 'polygon') {
      const flatPoints = ann.points.flatMap((p) => [p.x, p.y]);
      return (
        <Line
          {...commonProps}
          points={flatPoints}
          closed={true}
        />
      );
    }

    return null;
  };

  if (!selectedPlate) {
    return (
      <div
        ref={containerRef}
        style={{
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#999',
          background: '#f5f5f5',
        }}
      >
        请从左侧选择一张底片
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#f5f5f5' }}>
      <div style={{
        padding: '8px 12px',
        background: '#fff',
        borderBottom: '1px solid #f0f0f0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0,
      }}>
        <Space>
          <Tooltip title="选择/移动">
            <Button
              type={tool === 'select' ? 'primary' : 'default'}
              icon={<SelectOutlined />}
              onClick={() => setTool('select')}
              size="small"
            />
          </Tooltip>
          <Tooltip title="矩形标注">
            <Button
              type={tool === 'rectangle' ? 'primary' : 'default'}
              icon={<BgColorsOutlined />}
              onClick={() => { setTool('rectangle'); setIsPolygonDrawing(false); setPolygonPoints([]); }}
              size="small"
            />
          </Tooltip>
          <Tooltip title="圆形标注">
            <Button
              type={tool === 'circle' ? 'primary' : 'default'}
              icon={<BorderOutlined />}
              onClick={() => { setTool('circle'); setIsPolygonDrawing(false); setPolygonPoints([]); }}
              size="small"
            />
          </Tooltip>
          <Tooltip title="多边形标注（双击完成）">
            <Button
              type={tool === 'polygon' ? 'primary' : 'default'}
              icon={<ScissorOutlined />}
              onClick={() => setTool('polygon')}
              size="small"
            />
          </Tooltip>

          {isPolygonDrawing && (
            <Button type="link" size="small" danger onClick={cancelPolygonDrawing}>
              取消多边形
            </Button>
          )}
        </Space>

        <Space size="small">
          <Select
            size="small"
            value={defaultDefectType}
            onChange={onDefectTypeChange}
            style={{ width: 120 }}
            options={Object.entries(DEFECT_TYPE_LABELS).map(([value, label]) => ({ value, label }))}
          />
          <Tooltip title="放大">
            <Button icon={<ZoomInOutlined />} size="small" onClick={handleZoomIn} />
          </Tooltip>
          <Tooltip title="缩小">
            <Button icon={<ZoomOutOutlined />} size="small" onClick={handleZoomOut} />
          </Tooltip>
          <Tooltip title="重置视图">
            <Button icon={<ReloadOutlined />} size="small" onClick={handleResetView} />
          </Tooltip>
          <span style={{ fontSize: 12, color: '#666', minWidth: 60 }}>
            {(scale * 100).toFixed(0)}%
          </span>
        </Space>
      </div>

      <div ref={containerRef} style={{ flex: 1, position: 'relative', overflow: 'hidden', background: '#e0e0e0' }}>
        <Stage
          ref={stageRef}
          width={stageSize.width}
          height={stageSize.height}
          scaleX={scale}
          scaleY={scale}
          x={stagePos.x}
          y={stagePos.y}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onDblClick={handleDoubleClick}
          style={{ background: '#e0e0e0' }}
        >
          <Layer>
            {image && <KonvaImage image={image} />}

            {plateAnnotations.map(renderAnnotation)}

            {isDrawing && tool === 'rectangle' && (
              <Rect
                x={Math.min(drawStart.x, drawEnd.x)}
                y={Math.min(drawStart.y, drawEnd.y)}
                width={Math.abs(drawEnd.x - drawStart.x)}
                height={Math.abs(drawEnd.y - drawStart.y)}
                stroke={DEFECT_TYPE_COLORS[defaultDefectType]}
                strokeWidth={2 / scale}
                dash={[5 / scale, 5 / scale]}
                fill={`${DEFECT_TYPE_COLORS[defaultDefectType]}22`}
              />
            )}

            {isDrawing && tool === 'circle' && (
              <Circle
                x={drawStart.x}
                y={drawStart.y}
                radius={Math.sqrt(
                  Math.pow(drawEnd.x - drawStart.x, 2) + Math.pow(drawEnd.y - drawStart.y, 2)
                )}
                stroke={DEFECT_TYPE_COLORS[defaultDefectType]}
                strokeWidth={2 / scale}
                dash={[5 / scale, 5 / scale]}
                fill={`${DEFECT_TYPE_COLORS[defaultDefectType]}22`}
              />
            )}

            {isPolygonDrawing && polygonPoints.length > 0 && (
              <>
                <Line
                  points={polygonPoints.flatMap((p) => [p.x, p.y])}
                  stroke={DEFECT_TYPE_COLORS[defaultDefectType]}
                  strokeWidth={2 / scale}
                  dash={[5 / scale, 5 / scale]}
                />
                {polygonPoints.map((p, i) => (
                  <Circle
                    key={i}
                    x={p.x}
                    y={p.y}
                    radius={3 / scale}
                    fill={DEFECT_TYPE_COLORS[defaultDefectType]}
                  />
                ))}
              </>
            )}

            {selectedAnnotation && tool === 'select' && (
              <Transformer
                ref={trRef}
                boundBoxFunc={(oldBox, newBox) => {
                  if (newBox.width < 5 || newBox.height < 5) {
                    return oldBox;
                  }
                  return newBox;
                }}
              />
            )}
          </Layer>
        </Stage>
      </div>
    </div>
  );
}
