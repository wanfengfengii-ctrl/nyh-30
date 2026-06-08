import { useMemo } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Progress,
  List,
  Tag,
  Space,
  Divider,
  Empty,
  Tooltip,
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined,
  RobotOutlined,
  UserOutlined,
  SafetyCertificateOutlined,
  BarChartOutlined,
  FileSearchOutlined,
  ExperimentOutlined,
} from '@ant-design/icons';
import { useApp } from '../store/AppContext';
import type { DetectionStatistics } from '../types';
import { DEFECT_TYPE_LABELS, DEFECT_TYPE_COLORS } from '../types';
import { getConfidenceColor } from '../services/detectionService';

export default function DetectionStatisticsPanel() {
  const { plateAnnotations, getDetectionStatistics, selectedPlate } = useApp();

  const stats = useMemo<DetectionStatistics>(() => {
    return getDetectionStatistics(selectedPlate?.id);
  }, [plateAnnotations, getDetectionStatistics, selectedPlate]);

  if (plateAnnotations.length === 0) {
    return (
      <Card
        size="small"
        title={
          <Space>
            <BarChartOutlined />
            <span>检测统计分析</span>
          </Space>
        }
        style={{ height: '100%' }}
        styles={{ body: { padding: 0, height: 'calc(100% - 46px)', display: 'flex', alignItems: 'center', justifyContent: 'center' } }}
      >
        <Empty description="暂无标注数据" />
      </Card>
    );
  }

  const reviewRate = stats.totalCount > 0 ? (stats.reviewedCount / stats.totalCount) * 100 : 0;
  const passRate = stats.reviewedCount > 0 ? (stats.passCount / stats.reviewedCount) * 100 : 0;
  const autoAccuracy = stats.autoDetectedCount > 0 && stats.manualCorrectedCount > 0
    ? Math.max(0, 100 - (stats.manualCorrectedCount / stats.autoDetectedCount) * 100)
    : stats.autoDetectedCount > 0 ? 85 : 0;

  return (
    <Card
      size="small"
      title={
        <Space>
          <BarChartOutlined />
          <span>检测统计分析</span>
        </Space>
      }
      style={{ height: '100%' }}
      styles={{ body: { padding: 0, height: 'calc(100% - 46px)', overflow: 'auto' } }}
    >
      <div style={{ padding: 12 }}>
        <Row gutter={[8, 8]}>
          <Col span={12}>
            <Card size="small" style={{ textAlign: 'center' }}>
              <Statistic
                title={<span style={{ fontSize: 12 }}><FileSearchOutlined /> 总标注数</span>}
                value={stats.totalCount}
                valueStyle={{ fontSize: 20 }}
              />
            </Card>
          </Col>
          <Col span={12}>
            <Card size="small" style={{ textAlign: 'center' }}>
              <Statistic
                title={<span style={{ fontSize: 12 }}><RobotOutlined /> AI检测</span>}
                value={stats.autoDetectedCount}
                valueStyle={{ fontSize: 20, color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col span={12}>
            <Card size="small" style={{ textAlign: 'center' }}>
              <Statistic
                title={<span style={{ fontSize: 12 }}><UserOutlined /> 人工校正</span>}
                value={stats.manualCorrectedCount}
                valueStyle={{ fontSize: 20, color: '#fa8c16' }}
              />
            </Card>
          </Col>
          <Col span={12}>
            <Card size="small" style={{ textAlign: 'center' }}>
              <Statistic
                title={<span style={{ fontSize: 12 }}><SafetyCertificateOutlined /> 已复核</span>}
                value={stats.reviewedCount}
                valueStyle={{ fontSize: 20, color: '#52c41a' }}
              />
            </Card>
          </Col>
        </Row>

        <Divider style={{ margin: '12px 0' }} />

        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>
            <ExperimentOutlined style={{ marginRight: 4 }} />
            AI检测准确率
          </div>
          <Progress
            percent={Math.round(autoAccuracy)}
            status={autoAccuracy >= 80 ? 'success' : autoAccuracy >= 60 ? 'normal' : 'exception'}
            strokeColor={{ from: '#108ee9', to: '#87d068' }}
          />
          <div style={{ fontSize: 11, color: '#8c8c8c', marginTop: 4 }}>
            误检 {stats.falsePositiveCount} 个 · 漏检 {stats.falseNegativeCount} 个
          </div>
        </div>

        <Divider style={{ margin: '12px 0' }} />

        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>
            <CheckCircleOutlined style={{ marginRight: 4 }} />
            复核通过率
          </div>
          <Progress
            percent={Math.round(passRate)}
            status={passRate >= 80 ? 'success' : passRate >= 60 ? 'normal' : 'exception'}
          />
          <div style={{ fontSize: 11, color: '#8c8c8c', marginTop: 4 }}>
            通过 {stats.passCount} 个 · 驳回 {stats.rejectCount} 个 · 待复核 {stats.pendingReviewCount} 个
          </div>
        </div>

        <Divider style={{ margin: '12px 0' }} />

        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>
            <WarningOutlined style={{ marginRight: 4 }} />
            平均置信度
          </div>
          <Progress
            percent={Math.round(stats.avgConfidence * 100)}
            strokeColor={getConfidenceColor(stats.avgConfidence)}
          />
          <div style={{ fontSize: 11, color: '#8c8c8c', marginTop: 4 }}>
            高置信度 {(stats.highConfidenceCount)} 个 · 中 {(stats.mediumConfidenceCount)} 个 · 低 {(stats.lowConfidenceCount)} 个
          </div>
        </div>

        <Divider style={{ margin: '12px 0' }} />

        <div>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>
            缺陷类型分布
          </div>
          <List
            size="small"
            dataSource={Object.entries(stats.defectTypeStats)}
            renderItem={([type, count]) => {
              const percent = stats.totalCount > 0 ? Math.round((count / stats.totalCount) * 100) : 0;
              return (
                <List.Item>
                  <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                    <Space>
                      <span
                        style={{
                          display: 'inline-block',
                          width: 8,
                          height: 8,
                          background: DEFECT_TYPE_COLORS[type as keyof typeof DEFECT_TYPE_COLORS],
                          borderRadius: 2,
                        }}
                      />
                      <span style={{ fontSize: 12 }}>
                        {DEFECT_TYPE_LABELS[type as keyof typeof DEFECT_TYPE_LABELS]}
                      </span>
                    </Space>
                    <Space>
                      <Tag color={DEFECT_TYPE_COLORS[type as keyof typeof DEFECT_TYPE_COLORS]}>
                        {count}
                      </Tag>
                      <span style={{ fontSize: 11, color: '#8c8c8c', width: 30, textAlign: 'right' }}>
                        {percent}%
                      </span>
                    </Space>
                  </Space>
                </List.Item>
              );
            }}
          />
        </div>
      </div>
    </Card>
  );
}
