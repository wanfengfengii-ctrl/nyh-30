import { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Image as KonvaImage, Rect, Circle, Line, Transformer, Text } from 'react-konva';
import type Konva from 'konva';
import useImage from 'use-image';
import { Button, Space, Tooltip, Select, Divider, Modal, Form, Input, message, Popconfirm } from 'antd';
import {
  SelectOutlined,
  BgColorsOutlined,
  BorderOutlined,
  ScissorOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
  ReloadOutlined,
  UndoOutlined,
  RedoOutlined,
  MergeCellsOutlined,
  SplitCellsOutlined,
  RobotOutlined,
  SafetyCertificateOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
} from '@ant-design/icons';
import { useApp } from '../store/AppContext';
import type { ToolType, Annotation, DefectType, Point } from '../types';
import { DEFECT_TYPE_COLORS, DEFECT_TYPE_LABELS } from '../types';
import { getConfidenceColor } from '../services/detectionService';

interface AnnotationCanvasProps {
  defaultDefectType: DefectType;
  onDefectTypeChange: (type: DefectType) => void;
}

export default function AnnotationCanvas({ defaultDefectType, onDefectTypeChange }: AnnotationCanvasProps) {
  const {
    selectedPlate,
    selectedAnnotation,
    selectedAnnotationIds,
    plateAnnotations,
    dispatch,
    canUndo,
    canRedo,
    undo,
    redo,
    selectMultipleAnnotations,
    mergeAnnotations,
    splitAnnotation,
    confidenceThreshold,
  } = useApp();
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

  const [showConfidence, setShowConfidence] = useState(true);
  const [showAutoBadge, setShowAutoBadge] = useState(true);
  const [mergeModalVisible, setMergeModalVisible] = useState(false);
  const [splitModalVisible, setSplitModalVisible] = useState(false);
  const [mergeForm] = Form.useForm();
  const [splitForm] = Form.useForm();

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
    if (selectedAnnotationIds.length > 0 && trRef.current) {
      const nodes = selectedAnnotationIds
        .map((id) => shapeRefs.current[id])
        .filter((node): node is Konva.Node => !!node);
      if (nodes.length > 0) {
        trRef.current.nodes(nodes);
        trRef.current.getLayer()?.batchDraw();
      }
    } else if (trRef.current) {
      trRef.current.nodes([]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [selectedAnnotationIds]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (canUndo) undo();
      }

      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        if (canRedo) redo();
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedAnnotation) {
          e.preventDefault();
          dispatch({ type: 'DELETE_ANNOTATION', payload: selectedAnnotation.id });
        }
      }

      if (e.key === 'Escape') {
        setTool('select');
        setIsPolygonDrawing(false);
        setPolygonPoints([]);
        dispatch({ type: 'SELECT_ANNOTATION', payload: null });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canUndo, canRedo, undo, redo, selectedAnnotation]);

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
    if (tool === 'select' || tool === 'merge') {
      const isMultiSelect = e.evt.shiftKey || e.evt.ctrlKey || e.evt.metaKey;

      if (isMultiSelect) {
        const newSelected = selectedAnnotationIds.includes(annotationId)
          ? selectedAnnotationIds.filter((id) => id !== annotationId)
          : [...selectedAnnotationIds, annotationId];
        selectMultipleAnnotations(newSelected);
      } else {
        selectMultipleAnnotations([annotationId]);
      }

      if (tool === 'merge' && selectedAnnotationIds.length >= 1) {
        // 当选择了至少一个标注且使用合并工具时，提示用户确认
      }
    }
  };

  const handleMerge = () => {
    if (selectedAnnotationIds.length < 2) {
      message.warning('请至少选择 2 个标注进行合并（按住 Shift 或 Ctrl 多选）');
      return;
    }
    setMergeModalVisible(true);
    mergeForm.setFieldsValue({
      defectType: defaultDefectType,
      description: `合并 ${selectedAnnotationIds.length} 个标注`,
    });
  };

  const handleMergeConfirm = () => {
    mergeForm.validateFields().then((values) => {
      mergeAnnotations(selectedAnnotationIds, values);
      setMergeModalVisible(false);
      setTool('select');
      message.success('标注合并成功');
    });
  };

  const handleSplit = () => {
    if (!selectedAnnotation || selectedAnnotationIds.length !== 1) {
      message.warning('请选择 1 个标注进行拆分');
      return;
    }
    setSplitModalVisible(true);
    splitForm.setFieldsValue({
      splitCount: 2,
    });
  };

  const handleSplitConfirm = () => {
    splitForm.validateFields().then((values) => {
      if (!selectedAnnotation) return;

      const newAnnotations: Partial<Annotation>[] = [];
      const splitCount = values.splitCount || 2;

      if (selectedAnnotation.shape === 'rectangle') {
        const partWidth = selectedAnnotation.width / splitCount;
        for (let i = 0; i < splitCount; i++) {
          newAnnotations.push({
            shape: 'rectangle',
            x: selectedAnnotation.x + i * partWidth,
            y: selectedAnnotation.y,
            width: partWidth,
            height: selectedAnnotation.height,
            defectType: selectedAnnotation.defectType,
            severity: selectedAnnotation.severity,
            description: `拆分标注 ${i + 1}`,
          });
        }
      } else if (selectedAnnotation.shape === 'circle') {
        const angleStep = (Math.PI * 2) / splitCount;
        for (let i = 0; i < splitCount; i++) {
          const angle = i * angleStep;
          const offsetX = Math.cos(angle) * (selectedAnnotation.radius * 0.5);
          const offsetY = Math.sin(angle) * (selectedAnnotation.radius * 0.5);
          newAnnotations.push({
            shape: 'circle',
            x: selectedAnnotation.x + offsetX,
            y: selectedAnnotation.y + offsetY,
            radius: selectedAnnotation.radius * 0.6,
            defectType: selectedAnnotation.defectType,
            severity: selectedAnnotation.severity,
            description: `拆分标注 ${i + 1}`,
          });
        }
      } else {
        for (let i = 0; i < splitCount; i++) {
          newAnnotations.push({
            shape: 'circle',
            x: selectedAnnotation.points?.[0]?.x || 0 + i * 20,
            y: selectedAnnotation.points?.[0]?.y || 0,
            radius: 15,
            defectType: selectedAnnotation.defectType,
            severity: selectedAnnotation.severity,
            description: `拆分标注 ${i + 1}`,
          });
        }
      }

      splitAnnotation(selectedAnnotation.id, newAnnotations);
      setSplitModalVisible(false);
      setTool('select');
      message.success(`标注已拆分为 ${splitCount} 个`);
    });
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

  const getAnnotationPosition = (ann: Annotation) => {
    if (ann.shape === 'rectangle') {
      return { x: ann.x, y: ann.y, centerX: ann.x + ann.width / 2, centerY: ann.y + ann.height / 2 };
    } else if (ann.shape === 'circle') {
      return { x: ann.x - ann.radius, y: ann.y - ann.radius, centerX: ann.x, centerY: ann.y };
    } else {
      const xs = ann.points.map((p) => p.x);
      const ys = ann.points.map((p) => p.y);
      const minX = Math.min(...xs);
      const minY = Math.min(...ys);
      const maxX = Math.max(...xs);
      const maxY = Math.max(...ys);
      return { x: minX, y: minY, centerX: (minX + maxX) / 2, centerY: (minY + maxY) / 2 };
    }
  };

  const renderAnnotation = (ann: Annotation) => {
    const color = DEFECT_TYPE_COLORS[ann.defectType];
    const isSelected = selectedAnnotationIds.includes(ann.id);
    const strokeWidth = isSelected ? 3 / scale : 2 / scale;
    const dash = ann.isAutoDetected && showAutoBadge ? [4 / scale, 2 / scale] : undefined;

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
      dash,
    };

    const pos = getAnnotationPosition(ann);

    return (
      <>
        {ann.shape === 'rectangle' && (
          <Rect
            {...commonProps}
            x={ann.x}
            y={ann.y}
            width={ann.width}
            height={ann.height}
          />
        )}

        {ann.shape === 'circle' && (
          <Circle
            {...commonProps}
            x={ann.x}
            y={ann.y}
            radius={ann.radius}
          />
        )}

        {ann.shape === 'polygon' && (
          <Line
            {...commonProps}
            points={ann.points.flatMap((p) => [p.x, p.y])}
            closed={true}
          />
        )}

        {showConfidence && (
          <Text
            x={pos.x}
            y={pos.y - 18 / scale}
            text={`${(ann.confidence * 100).toFixed(0)}%`}
            fontSize={12 / scale}
            fill={getConfidenceColor(ann.confidence)}
            fontStyle="bold"
          />
        )}

        {showAutoBadge && ann.isAutoDetected && (
          <Text
            x={pos.x + (ann.shape === 'rectangle' ? ann.width : 0) + 4 / scale}
            y={pos.y}
            text="AI"
            fontSize={10 / scale}
            fill="#fff"
            fontStyle="bold"
            padding={3 / scale}
            align="center"
          />
        )}
      </>
    );
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
        <Space size={4}>
          <Tooltip title="选择/移动（按住Shift多选）">
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

          <Divider type="vertical" style={{ height: 24 }} />

          <Tooltip title={`合并标注（已选 ${selectedAnnotationIds.length} 个）`}>
            <Button
              icon={<MergeCellsOutlined />}
              size="small"
              onClick={handleMerge}
              disabled={selectedAnnotationIds.length < 2}
              type={tool === 'merge' ? 'primary' : 'default'}
            />
          </Tooltip>
          <Tooltip title="拆分标注">
            <Button
              icon={<SplitCellsOutlined />}
              size="small"
              onClick={handleSplit}
              disabled={selectedAnnotationIds.length !== 1}
              type={tool === 'split' ? 'primary' : 'default'}
            />
          </Tooltip>

          <Divider type="vertical" style={{ height: 24 }} />

          <Tooltip title={showConfidence ? '隐藏置信度' : '显示置信度'}>
            <Button
              icon={showConfidence ? <EyeOutlined /> : <EyeInvisibleOutlined />}
              size="small"
              onClick={() => setShowConfidence(!showConfidence)}
              type={showConfidence ? 'primary' : 'default'}
            />
          </Tooltip>
          <Tooltip title={showAutoBadge ? '隐藏AI标记' : '显示AI标记'}>
            <Button
              icon={<RobotOutlined />}
              size="small"
              onClick={() => setShowAutoBadge(!showAutoBadge)}
              type={showAutoBadge ? 'primary' : 'default'}
            />
          </Tooltip>

          <Divider type="vertical" style={{ height: 24 }} />

          <Tooltip title="撤销 (Ctrl+Z)">
            <Button
              icon={<UndoOutlined />}
              size="small"
              onClick={undo}
              disabled={!canUndo}
            />
          </Tooltip>
          <Tooltip title="恢复 (Ctrl+Y)">
            <Button
              icon={<RedoOutlined />}
              size="small"
              onClick={redo}
              disabled={!canRedo}
            />
          </Tooltip>
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

            {selectedAnnotationIds.length > 0 && tool === 'select' && (
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

      <Modal
        title="合并标注"
        open={mergeModalVisible}
        onOk={handleMergeConfirm}
        onCancel={() => setMergeModalVisible(false)}
        okText="确认合并"
        cancelText="取消"
        width={400}
      >
        <Form form={mergeForm} layout="vertical">
          <div style={{ marginBottom: 12, fontSize: 12, color: '#666' }}>
            将合并 {selectedAnnotationIds.length} 个标注为一个新的矩形标注
          </div>
          <Form.Item label="缺陷类型" name="defectType">
            <Select
              options={Object.entries(DEFECT_TYPE_LABELS).map(([value, label]) => ({
                value,
                label,
              }))}
            />
          </Form.Item>
          <Form.Item label="描述" name="description">
            <Input.TextArea rows={2} placeholder="请输入描述" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="拆分标注"
        open={splitModalVisible}
        onOk={handleSplitConfirm}
        onCancel={() => setSplitModalVisible(false)}
        okText="确认拆分"
        cancelText="取消"
        width={400}
      >
        <Form form={splitForm} layout="vertical">
          <div style={{ marginBottom: 12, fontSize: 12, color: '#666' }}>
            将当前标注拆分为多个子标注（均匀分布）
          </div>
          <Form.Item label="拆分数量" name="splitCount" rules={[{ required: true, message: '请输入拆分数量' }]}>
            <Input type="number" min={2} max={10} placeholder="2-10" />
          </Form.Item>
          <div style={{ fontSize: 11, color: '#999' }}>
            提示：拆分后可在画布上调整每个子标注的位置和大小
          </div>
        </Form>
      </Modal>
    </div>
  );
}
