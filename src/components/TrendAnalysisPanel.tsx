import { useState, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { Card, Row, Col, Statistic, Select, Space } from 'antd';
import {
  LineChartOutlined,
  BarChartOutlined,
  RiseOutlined,
  FallOutlined,
} from '@ant-design/icons';
import { useApp } from '../store/AppContext';
import { DEFECT_TYPE_LABELS, DEFECT_TYPE_COLORS } from '../types';
import type { DefectType } from '../types';

const { Option } = Select;

export default function TrendAnalysisPanel() {
  const { trendStatistics, selectedPlate, currentPlateVersions } = useApp();
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');
  const [selectedTypes, setSelectedTypes] = useState<DefectType[]>([
    'scratch',
    'mold',
    'bright_spot',
    'scan_defect',
  ]);

  const totalStats = useMemo(() => {
    if (trendStatistics.length === 0) {
      return { total: 0, avg: 0, trend: 0 };
    }
    const latest = trendStatistics[trendStatistics.length - 1].totalDefects;
    const earliest = trendStatistics[0].totalDefects;
    const avg = Math.round(
      trendStatistics.reduce((sum, s) => sum + s.totalDefects, 0) / trendStatistics.length
    );
    return {
      total: latest,
      avg,
      trend: latest - earliest,
    };
  }, [trendStatistics]);

  const lineOption = useMemo(() => {
    const dates = trendStatistics.map((s) => s.date);

    const series = [
      {
        name: '缺陷总数',
        type: chartType,
        data: trendStatistics.map((s) => s.totalDefects),
        smooth: true,
        lineStyle: { width: 3 },
        itemStyle: { color: '#1890ff' },
      },
      {
        name: '新增缺陷',
        type: chartType,
        data: trendStatistics.map((s) => s.addedDefects),
        smooth: true,
        lineStyle: { width: 2, type: 'dashed' },
        itemStyle: { color: '#52c41a' },
      },
      {
        name: '消失缺陷',
        type: chartType,
        data: trendStatistics.map((s) => s.removedDefects),
        smooth: true,
        lineStyle: { width: 2, type: 'dashed' },
        itemStyle: { color: '#ff4d4f' },
      },
    ];

    return {
      tooltip: {
        trigger: 'axis',
      },
      legend: {
        data: ['缺陷总数', '新增缺陷', '消失缺陷'],
        bottom: 0,
        itemWidth: 12,
        itemHeight: 12,
        textStyle: { fontSize: 11 },
      },
      grid: {
        left: 40,
        right: 20,
        top: 20,
        bottom: 40,
      },
      xAxis: {
        type: 'category',
        data: dates,
        axisLabel: { fontSize: 11 },
      },
      yAxis: {
        type: 'value',
        axisLabel: { fontSize: 11 },
      },
      series,
    };
  }, [trendStatistics, chartType]);

  const typeOption = useMemo(() => {
    const dates = trendStatistics.map((s) => s.date);
    const types = selectedTypes;

    const series = types.map((type) => ({
      name: DEFECT_TYPE_LABELS[type],
      type: chartType,
      stack: chartType === 'bar' ? 'total' : undefined,
      data: trendStatistics.map((s) => s.byType[type]),
      smooth: true,
      itemStyle: { color: DEFECT_TYPE_COLORS[type] },
    }));

    return {
      tooltip: {
        trigger: 'axis',
      },
      legend: {
        data: types.map((t) => DEFECT_TYPE_LABELS[t]),
        bottom: 0,
        itemWidth: 12,
        itemHeight: 12,
        textStyle: { fontSize: 11 },
      },
      grid: {
        left: 40,
        right: 20,
        top: 20,
        bottom: 40,
      },
      xAxis: {
        type: 'category',
        data: dates,
        axisLabel: { fontSize: 11 },
      },
      yAxis: {
        type: 'value',
        axisLabel: { fontSize: 11 },
      },
      series,
    };
  }, [trendStatistics, chartType, selectedTypes]);

  return (
    <div style={{ padding: 16, height: '100%', overflow: 'auto' }}>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 14, fontWeight: 500 }}>
          <LineChartOutlined style={{ marginRight: 4 }} />
          缺陷变化趋势分析
        </div>
        <Space size="small">
          <Select
            mode="multiple"
            size="small"
            placeholder="缺陷类型"
            value={selectedTypes}
            onChange={setSelectedTypes}
            style={{ minWidth: 200 }}
          >
            {(['scratch', 'mold', 'bright_spot', 'scan_defect'] as DefectType[]).map((type) => (
              <Option key={type} value={type}>
                {DEFECT_TYPE_LABELS[type]}
              </Option>
            ))}
          </Select>
          <Select
            size="small"
            value={chartType}
            onChange={setChartType}
            style={{ width: 100 }}
          >
            <Option value="line">折线图</Option>
            <Option value="bar">柱状图</Option>
          </Select>
        </Space>
      </div>

      <Row gutter={12} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Card size="small" style={{ textAlign: 'center' }}>
            <Statistic
              title="当前缺陷总数"
              value={totalStats.total}
              valueStyle={{ fontSize: 22 }}
              prefix={<BarChartOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small" style={{ textAlign: 'center' }}>
            <Statistic
              title="月均缺陷数"
              value={totalStats.avg}
              valueStyle={{ fontSize: 22, color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small" style={{ textAlign: 'center' }}>
            <Statistic
              title="累计变化"
              value={totalStats.trend}
              valueStyle={{
                fontSize: 22,
                color: totalStats.trend >= 0 ? '#ff4d4f' : '#52c41a',
              }}
              prefix={totalStats.trend >= 0 ? <RiseOutlined /> : <FallOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Card size="small" title="总体变化趋势" style={{ marginBottom: 16 }}>
        <ReactECharts option={lineOption} style={{ height: 240 }} />
      </Card>

      <Card size="small" title="按缺陷类型分布趋势">
        <ReactECharts option={typeOption} style={{ height: 240 }} />
      </Card>

      <Card size="small" title="版本概览" style={{ marginTop: 16 }}>
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          {currentPlateVersions.map((v, index) => (
            <div
              key={v.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 12px',
                background: index === 0 ? '#e6f7ff' : '#fafafa',
                borderRadius: 4,
                fontSize: 12,
              }}
            >
              <Space size="small">
                <span style={{ fontWeight: 500 }}>V{v.versionNumber}</span>
                <span style={{ color: '#595959' }}>{v.versionName}</span>
                {v.isBaseline && <span style={{ color: '#1890ff', fontSize: 11 }}>基线</span>}
              </Space>
              <Space size="middle">
                <span style={{ color: '#8c8c8c' }}>{v.scanDate}</span>
                <span style={{ color: '#faad14' }}>{v.annotationCount} 个缺陷</span>
              </Space>
            </div>
          ))}
        </Space>
      </Card>
    </div>
  );
}
