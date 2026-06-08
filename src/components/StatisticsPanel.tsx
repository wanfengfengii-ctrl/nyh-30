import ReactECharts from 'echarts-for-react';
import { Card, Row, Col, Statistic, Tag, Divider, List, Avatar, Space } from 'antd';
import {
  BgColorsOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  FileImageOutlined,
  UserOutlined,
  BarChartOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import { useApp } from '../store/AppContext';
import ExportPanel from './ExportPanel';
import {
  DEFECT_TYPE_LABELS,
  DEFECT_TYPE_COLORS,
  SEVERITY_LABELS,
  REVIEW_STATUS_LABELS,
  REVIEW_STATUS_COLORS,
} from '../types';
import type { DefectType, Severity, ReviewStatus } from '../types';

export default function StatisticsPanel() {
  const { state, plateAnnotations, selectedPlate, getPlateStatistics, allUsers } = useApp();

  const totalPlates = state.plates.length;
  const archivedPlates = state.plates.filter((p) => p.status === 'archived').length;
  const totalAnnotations = state.annotations.length;
  const pendingAnnotations = state.annotations.filter((a) => a.reviewStatus === 'pending').length;
  const reviewedAnnotations = state.annotations.filter((a) => a.reviewStatus === 'reviewed').length;
  const rejectedAnnotations = state.annotations.filter((a) => a.reviewStatus === 'rejected').length;

  const defectTypeCount: Record<DefectType, number> = {
    scratch: 0,
    mold: 0,
    bright_spot: 0,
    scan_defect: 0,
  };

  const severityCount: Record<Severity, number> = {
    mild: 0,
    moderate: 0,
    severe: 0,
  };

  const reviewStatusCount: Record<ReviewStatus, number> = {
    pending: 0,
    reviewed: 0,
    rejected: 0,
  };

  plateAnnotations.forEach((ann) => {
    defectTypeCount[ann.defectType]++;
    severityCount[ann.severity]++;
    reviewStatusCount[ann.reviewStatus]++;
  });

  const userAnnotationCount: Record<string, number> = {};
  state.annotations.forEach((ann) => {
    userAnnotationCount[ann.createdByName] = (userAnnotationCount[ann.createdByName] || 0) + 1;
  });

  const pieOption = {
    tooltip: { trigger: 'item' },
    legend: {
      bottom: 0,
      left: 'center',
      icon: 'circle',
      textStyle: { fontSize: 11 },
    },
    series: [
      {
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 4,
          borderColor: '#fff',
          borderWidth: 2,
        },
        label: { show: false },
        emphasis: {
          label: {
            show: true,
            fontSize: 14,
            fontWeight: 'bold',
          },
        },
        labelLine: { show: false },
        data: Object.entries(defectTypeCount).map(([key, value]) => ({
          value,
          name: DEFECT_TYPE_LABELS[key as DefectType],
          itemStyle: { color: DEFECT_TYPE_COLORS[key as DefectType] },
        })),
      },
    ],
  };

  const barOption = {
    tooltip: { trigger: 'axis' },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '10%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: Object.values(SEVERITY_LABELS),
      axisLabel: { fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      axisLabel: { fontSize: 11 },
    },
    series: [
      {
        type: 'bar',
        data: Object.values(severityCount),
        itemStyle: {
          color: function (params: any) {
            const colors = ['#52c41a', '#faad14', '#ff4d4f'];
            return colors[params.dataIndex];
          },
          borderRadius: [4, 4, 0, 0],
        },
        barWidth: '40%',
      },
    ],
  };

  const reviewBarOption = {
    tooltip: { trigger: 'axis' },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '10%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: Object.values(REVIEW_STATUS_LABELS),
      axisLabel: { fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      axisLabel: { fontSize: 11 },
    },
    series: [
      {
        type: 'bar',
        data: Object.values(reviewStatusCount),
        itemStyle: {
          color: function (params: any) {
            const colors = ['#faad14', '#52c41a', '#ff4d4f'];
            return colors[params.dataIndex];
          },
          borderRadius: [4, 4, 0, 0],
        },
        barWidth: '40%',
      },
    ],
  };

  return (
    <div style={{ padding: 16, overflow: 'auto', height: '100%' }}>
      <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
        <Col span={12}>
          <Card size="small">
            <Statistic
              title="底片总数"
              value={totalPlates}
              prefix={<FileImageOutlined style={{ color: '#1890ff' }} />}
              valueStyle={{ fontSize: 20 }}
            />
            <div style={{ marginTop: 4, fontSize: 12, color: '#8c8c8c' }}>
              已归档: {archivedPlates} 张
            </div>
          </Card>
        </Col>
        <Col span={12}>
          <Card size="small">
            <Statistic
              title="标注总数"
              value={totalAnnotations}
              prefix={<BgColorsOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ fontSize: 20 }}
            />
            <div style={{ marginTop: 4, fontSize: 12, color: '#8c8c8c' }}>
              待复核: {pendingAnnotations} 条
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
        <Col span={8}>
          <Card size="small" style={{ textAlign: 'center' }}>
            <ClockCircleOutlined style={{ fontSize: 24, color: '#faad14' }} />
            <div style={{ fontSize: 18, fontWeight: 'bold', marginTop: 4 }}>{pendingAnnotations}</div>
            <div style={{ fontSize: 11, color: '#8c8c8c' }}>待复核</div>
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small" style={{ textAlign: 'center' }}>
            <CheckCircleOutlined style={{ fontSize: 24, color: '#52c41a' }} />
            <div style={{ fontSize: 18, fontWeight: 'bold', marginTop: 4 }}>{reviewedAnnotations}</div>
            <div style={{ fontSize: 11, color: '#8c8c8c' }}>已通过</div>
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small" style={{ textAlign: 'center' }}>
            <CloseCircleOutlined style={{ fontSize: 24, color: '#ff4d4f' }} />
            <div style={{ fontSize: 18, fontWeight: 'bold', marginTop: 4 }}>{rejectedAnnotations}</div>
            <div style={{ fontSize: 11, color: '#8c8c8c' }}>已驳回</div>
          </Card>
        </Col>
      </Row>

      <Card
        size="small"
        title={
          <span style={{ fontSize: 13 }}>
            {selectedPlate ? `${selectedPlate.code} - 缺陷类型分布` : '当前底片缺陷分布'}
          </span>
        }
        style={{ marginBottom: 12 }}
      >
        <ReactECharts option={pieOption} style={{ height: 200 }} notMerge={true} lazyUpdate={true} />
      </Card>

      <Card
        size="small"
        title={<span style={{ fontSize: 13 }}>严重程度分布</span>}
        style={{ marginBottom: 12 }}
      >
        <ReactECharts option={barOption} style={{ height: 180 }} notMerge={true} lazyUpdate={true} />
      </Card>

      <Card
        size="small"
        title={<span style={{ fontSize: 13 }}>复核状态分布</span>}
        style={{ marginBottom: 12 }}
      >
        <ReactECharts option={reviewBarOption} style={{ height: 180 }} notMerge={true} lazyUpdate={true} />
      </Card>

      <Card size="small" title={<span style={{ fontSize: 13 }}>标注员贡献</span>} style={{ marginBottom: 12 }}>
        <List
          size="small"
          dataSource={allUsers}
          renderItem={(user) => {
            const count = userAnnotationCount[user.name] || 0;
            return (
              <List.Item>
                <List.Item.Meta
                  avatar={
                    <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#1890ff' }}>
                      {user.name.charAt(0)}
                    </Avatar>
                  }
                  title={
                    <Space size="small">
                      <span style={{ fontSize: 12 }}>{user.name}</span>
                      <Tag color="blue" style={{ margin: 0, fontSize: 10 }}>
                        {user.role === 'annotator' ? '标注员' : user.role === 'reviewer' ? '复核员' : '管理员'}
                      </Tag>
                    </Space>
                  }
                  description={
                    <span style={{ fontSize: 11, color: '#8c8c8c' }}>
                      标注: {count} 条
                    </span>
                  }
                />
              </List.Item>
            );
          }}
        />
      </Card>

      <Card size="small" title={<span style={{ fontSize: 13 }}>缺陷类型说明</span>} style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {Object.entries(DEFECT_TYPE_LABELS).map(([key, label]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  display: 'inline-block',
                  width: 12,
                  height: 12,
                  background: DEFECT_TYPE_COLORS[key as DefectType],
                  borderRadius: 2,
                }}
              />
              <span style={{ fontSize: 12, flex: 1 }}>{label}</span>
              <Tag color="blue" style={{ margin: 0 }}>
                {defectTypeCount[key as DefectType]} 条
              </Tag>
            </div>
          ))}
        </div>
      </Card>

      <Card size="small" title={<span style={{ fontSize: 13 }}>数据导出</span>}>
        <ExportPanel />
      </Card>
    </div>
  );
}
