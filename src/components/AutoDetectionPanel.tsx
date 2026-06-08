import { useState } from 'react';
import {
  Card,
  Button,
  Progress,
  Slider,
  Checkbox,
  Space,
  Tag,
  Statistic,
  Row,
  Col,
  Divider,
  message,
  Tooltip,
  Alert,
} from 'antd';
import {
  ScanOutlined,
  ThunderboltOutlined,
  SafetyCertificateOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  RobotOutlined,
} from '@ant-design/icons';
import { useApp } from '../store/AppContext';
import { runAutoDetection, getConfidenceColor, getConfidenceLabel } from '../services/detectionService';
import type { DefectType } from '../types';
import { DEFECT_TYPE_LABELS, DEFECT_TYPE_COLORS, DETECTION_STATUS_LABELS } from '../types';

export default function AutoDetectionPanel() {
  const {
    selectedPlate,
    currentDetectionResult,
    confidenceThreshold,
    setConfidenceThreshold,
    setDetectionResult,
    updateDetectionProgress,
    batchAddAnnotations,
    getDetectionStatistics,
    plateAnnotations,
  } = useApp();

  const [isDetecting, setIsDetecting] = useState(false);
  const [detectTypes, setDetectTypes] = useState<DefectType[]>(['scratch', 'mold', 'bright_spot', 'scan_defect']);
  const [showLowConfidence, setShowLowConfidence] = useState(true);

  const stats = getDetectionStatistics(selectedPlate?.id);

  const handleStartDetection = async () => {
    if (!selectedPlate) return;
    if (detectTypes.length === 0) {
      message.warning('请至少选择一种缺陷类型');
      return;
    }

    setIsDetecting(true);
    const startTime = new Date().toISOString();

    setDetectionResult({
      plateId: selectedPlate.id,
      status: 'running',
      progress: 0,
      totalDetected: 0,
      startedAt: startTime,
    });

    try {
      const results = await runAutoDetection({
        plateId: selectedPlate.id,
        imageWidth: 800,
        imageHeight: 600,
        confidenceThreshold: showLowConfidence ? 0 : confidenceThreshold,
        detectTypes,
        onProgress: (progress) => {
          updateDetectionProgress(selectedPlate.id, progress);
        },
      });

      if (results.length > 0) {
        batchAddAnnotations(results);
      }

      setDetectionResult({
        plateId: selectedPlate.id,
        status: 'completed',
        progress: 100,
        totalDetected: results.length,
        startedAt: startTime,
        completedAt: new Date().toISOString(),
      });

      message.success(`检测完成，共发现 ${results.length} 个缺陷`);
    } catch (error) {
      setDetectionResult({
        plateId: selectedPlate.id,
        status: 'failed',
        progress: 0,
        totalDetected: 0,
        startedAt: startTime,
        errorMessage: '检测过程中发生错误',
      });
      message.error('检测失败，请重试');
    } finally {
      setIsDetecting(false);
    }
  };

  const handleDetectTypeChange = (checkedValues: DefectType[]) => {
    setDetectTypes(checkedValues);
  };

  if (!selectedPlate) {
    return (
      <Card size="small" title={<Space><RobotOutlined />智能检测</Space>}>
        <div style={{ textAlign: 'center', color: '#999', padding: '20px 0' }}>
          请选择一张底片
        </div>
      </Card>
    );
  }

  const autoCount = plateAnnotations.filter((a) => a.isAutoDetected).length;
  const manualCount = plateAnnotations.filter((a) => !a.isAutoDetected).length;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Card
        size="small"
        title={
          <Space>
            <RobotOutlined style={{ color: '#1890ff' }} />
            <span>智能缺陷检测</span>
            {currentDetectionResult && (
              <Tag color={currentDetectionResult.status === 'running' ? 'processing' : currentDetectionResult.status === 'completed' ? 'green' : 'default'}>
                {DETECTION_STATUS_LABELS[currentDetectionResult.status]}
              </Tag>
            )}
          </Space>
        }
        style={{ flexShrink: 0 }}
      >
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          <Button
            type="primary"
            icon={<ScanOutlined />}
            block
            loading={isDetecting}
            onClick={handleStartDetection}
          >
            {isDetecting ? '检测中...' : '开始智能检测'}
          </Button>

          {currentDetectionResult?.status === 'running' && (
            <Progress percent={Math.round(currentDetectionResult.progress)} status="active" size="small" />
          )}

          <div style={{ fontSize: 12, color: '#666' }}>
            <Space wrap>
              <span>当前底片:</span>
              <Tag color="blue" style={{ margin: 0 }}>{selectedPlate.code}</Tag>
              <span>已有标注:</span>
              <Tag color="green" style={{ margin: 0 }}>{plateAnnotations.length} 个</Tag>
            </Space>
          </div>
        </Space>
      </Card>

      <Card
        size="small"
        title={<Space><SafetyCertificateOutlined />检测设置</Space>}
        style={{ flexShrink: 0, marginTop: 8 }}
      >
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          <div>
            <div style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>检测缺陷类型:</div>
            <Checkbox.Group
              value={detectTypes}
              onChange={handleDetectTypeChange as any}
              style={{ display: 'flex', flexDirection: 'column', gap: 4 }}
            >
              {Object.entries(DEFECT_TYPE_LABELS).map(([key, label]) => (
                <Checkbox key={key} value={key}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <span
                      style={{
                        display: 'inline-block',
                        width: 8,
                        height: 8,
                        background: DEFECT_TYPE_COLORS[key as DefectType],
                        borderRadius: 2,
                      }}
                    />
                    {label}
                  </span>
                </Checkbox>
              ))}
            </Checkbox.Group>
          </div>

          <Divider style={{ margin: '8px 0' }} />

          <div>
            <div style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>
              置信度阈值: <Tag color={getConfidenceColor(confidenceThreshold)} style={{ margin: 0 }}>{(confidenceThreshold * 100).toFixed(0)}%</Tag>
            </div>
            <Slider
              min={0}
              max={1}
              step={0.05}
              value={confidenceThreshold}
              onChange={setConfidenceThreshold}
              tooltip={{ formatter: (value) => `${((value || 0) * 100).toFixed(0)}%` }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#999' }}>
              <span>低</span>
              <span>中</span>
              <span>高</span>
            </div>
          </div>

          <Checkbox checked={showLowConfidence} onChange={(e) => setShowLowConfidence(e.target.checked)}>
            <span style={{ fontSize: 12 }}>显示低置信度结果（供人工审核）</span>
          </Checkbox>
        </Space>
      </Card>

      <Card
        size="small"
        title={<Space><ThunderboltOutlined />检测统计</Space>}
        style={{ flexShrink: 0, marginTop: 8 }}
      >
        <Row gutter={[8, 8]}>
          <Col span={12}>
            <Statistic
              title="自动检测"
              value={stats.autoDetectedCount}
              valueStyle={{ fontSize: 16 }}
              prefix={<RobotOutlined style={{ color: '#1890ff', fontSize: 14 }} />}
            />
          </Col>
          <Col span={12}>
            <Statistic
              title="人工添加"
              value={stats.manualAddedCount}
              valueStyle={{ fontSize: 16 }}
              prefix={<SafetyCertificateOutlined style={{ color: '#52c41a', fontSize: 14 }} />}
            />
          </Col>
          <Col span={12}>
            <Statistic
              title="平均置信度"
              value={stats.avgConfidence}
              precision={2}
              valueStyle={{ fontSize: 16, color: getConfidenceColor(stats.avgConfidence) }}
              suffix="%"
              formatter={(value) => `${(Number(value) * 100).toFixed(1)}`}
            />
          </Col>
          <Col span={12}>
            <Statistic
              title="复核通过率"
              value={stats.reviewedCount > 0 ? stats.passCount / stats.reviewedCount : 0}
              precision={2}
              valueStyle={{ fontSize: 16, color: '#52c41a' }}
              suffix="%"
              formatter={(value) => `${(Number(value) * 100).toFixed(1)}`}
            />
          </Col>
        </Row>
      </Card>

      <Card
        size="small"
        title={<Space><ExclamationCircleOutlined />误检漏检分析</Space>}
        style={{ flexShrink: 0, marginTop: 8 }}
      >
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space>
              <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
              <span style={{ fontSize: 12 }}>误检（假阳性）</span>
            </Space>
            <Tag color="red" style={{ margin: 0 }}>{stats.falsePositiveCount} 个</Tag>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space>
              <ExclamationCircleOutlined style={{ color: '#faad14' }} />
              <span style={{ fontSize: 12 }}>漏检（假阴性）</span>
            </Space>
            <Tag color="orange" style={{ margin: 0 }}>{stats.falseNegativeCount} 个</Tag>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space>
              <CheckCircleOutlined style={{ color: '#52c41a' }} />
              <span style={{ fontSize: 12 }}>人工修正</span>
            </Space>
            <Tag color="green" style={{ margin: 0 }}>{stats.manualCorrectedCount} 个</Tag>
          </div>
        </Space>
      </Card>

      <Alert
        message="检测说明"
        description={
          <div style={{ fontSize: 12 }}>
            <p style={{ margin: 0 }}>• 智能检测基于图像特征自动识别缺陷</p>
            <p style={{ margin: '4px 0 0 0' }}>• 高置信度结果可直接使用，低置信度建议人工复核</p>
            <p style={{ margin: '4px 0 0 0' }}>• 检测结果可在画布上进行编辑和校正</p>
          </div>
        }
        type="info"
        showIcon
        style={{ flexShrink: 0, marginTop: 8 }}
      />
    </div>
  );
}
