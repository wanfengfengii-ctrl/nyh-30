import { Button, Dropdown, message, Space } from 'antd';
import {
  ExportOutlined,
  FileTextOutlined,
  FileExcelOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import { useApp } from '../store/AppContext';
import {
  DEFECT_TYPE_LABELS,
  SEVERITY_LABELS,
  REVIEW_STATUS_LABELS,
} from '../types';
import type { Annotation, Plate, DefectType, Severity, ReviewStatus } from '../types';

export default function ExportPanel() {
  const { state, selectedPlate, plateAnnotations, getPlateStatistics } = useApp();

  const exportCurrentPlateReport = (format: 'json' | 'csv') => {
    if (!selectedPlate) {
      message.warning('请先选择一张底片');
      return;
    }
    const report = generatePlateReport(selectedPlate, plateAnnotations);
    downloadFile(report, `${selectedPlate.code}_标注报告`, format);
    message.success(`已导出 ${selectedPlate.code} 标注报告`);
  };

  const exportAllPlatesSummary = (format: 'json' | 'csv') => {
    const summary = generateAllPlatesSummary(state.plates, state.annotations);
    downloadFile(summary, '底片缺陷统计摘要', format);
    message.success('已导出所有底片缺陷统计摘要');
  };

  const plateMenuItems = [
    {
      key: 'json',
      icon: <FileTextOutlined />,
      label: '导出 JSON 格式',
      onClick: () => exportCurrentPlateReport('json'),
    },
    {
      key: 'csv',
      icon: <FileExcelOutlined />,
      label: '导出 CSV 格式',
      onClick: () => exportCurrentPlateReport('csv'),
    },
  ];

  const summaryMenuItems = [
    {
      key: 'json',
      icon: <FileTextOutlined />,
      label: '导出 JSON 格式',
      onClick: () => exportAllPlatesSummary('json'),
    },
    {
      key: 'csv',
      icon: <FileExcelOutlined />,
      label: '导出 CSV 格式',
      onClick: () => exportAllPlatesSummary('csv'),
    },
  ];

  return (
    <Space direction="vertical" size="small" style={{ width: '100%' }}>
      <Dropdown menu={{ items: plateMenuItems }} placement="bottomRight">
        <Button icon={<ExportOutlined />} block disabled={!selectedPlate}>
          导出当前底片标注报告
        </Button>
      </Dropdown>
      <Dropdown menu={{ items: summaryMenuItems }} placement="bottomRight">
        <Button icon={<BarChartOutlined />} block type="primary">
          导出全部底片统计摘要
        </Button>
      </Dropdown>
    </Space>
  );
}

function generatePlateReport(plate: Plate, annotations: Annotation[]) {
  return {
    plate: {
      code: plate.code,
      name: plate.name,
      scanDate: plate.scanDate,
      description: plate.description,
      status: plate.status,
    },
    exportTime: new Date().toISOString(),
    totalAnnotations: annotations.length,
    annotations: annotations.map((ann) => ({
      id: ann.id,
      shape: ann.shape,
      defectType: DEFECT_TYPE_LABELS[ann.defectType],
      severity: SEVERITY_LABELS[ann.severity],
      description: ann.description,
      suggestion: ann.suggestion,
      reviewStatus: REVIEW_STATUS_LABELS[ann.reviewStatus],
      createdBy: ann.createdByName,
      createdAt: ann.createdAt,
      lastModifiedBy: ann.lastModifiedByName,
      updatedAt: ann.updatedAt,
      position: ann.shape === 'rectangle'
        ? { x: ann.x, y: ann.y, width: ann.width, height: ann.height }
        : ann.shape === 'circle'
        ? { x: ann.x, y: ann.y, radius: ann.radius }
        : { points: ann.points },
    })),
  };
}

function generateAllPlatesSummary(plates: Plate[], annotations: Annotation[]) {
  const plateStats = plates.map((plate) => {
    const plateAnns = annotations.filter((a) => a.plateId === plate.id);
    const byType: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};
    const byReviewStatus: Record<string, number> = {};

    plateAnns.forEach((ann) => {
      byType[DEFECT_TYPE_LABELS[ann.defectType]] = (byType[DEFECT_TYPE_LABELS[ann.defectType]] || 0) + 1;
      bySeverity[SEVERITY_LABELS[ann.severity]] = (bySeverity[SEVERITY_LABELS[ann.severity]] || 0) + 1;
      byReviewStatus[REVIEW_STATUS_LABELS[ann.reviewStatus]] = (byReviewStatus[REVIEW_STATUS_LABELS[ann.reviewStatus]] || 0) + 1;
    });

    return {
      plateCode: plate.code,
      plateName: plate.name,
      scanDate: plate.scanDate,
      status: plate.status,
      totalDefects: plateAnns.length,
      byType,
      bySeverity,
      byReviewStatus,
    };
  });

  const totalByType: Record<string, number> = {};
  const totalBySeverity: Record<string, number> = {};
  const totalByReviewStatus: Record<string, number> = {};

  annotations.forEach((ann) => {
    totalByType[DEFECT_TYPE_LABELS[ann.defectType]] = (totalByType[DEFECT_TYPE_LABELS[ann.defectType]] || 0) + 1;
    totalBySeverity[SEVERITY_LABELS[ann.severity]] = (totalBySeverity[SEVERITY_LABELS[ann.severity]] || 0) + 1;
    totalByReviewStatus[REVIEW_STATUS_LABELS[ann.reviewStatus]] = (totalByReviewStatus[REVIEW_STATUS_LABELS[ann.reviewStatus]] || 0) + 1;
  });

  return {
    exportTime: new Date().toISOString(),
    totalPlates: plates.length,
    totalAnnotations: annotations.length,
    summary: {
      byType: totalByType,
      bySeverity: totalBySeverity,
      byReviewStatus: totalByReviewStatus,
    },
    plates: plateStats,
  };
}

function downloadFile(data: any, filename: string, format: 'json' | 'csv') {
  let content: string;
  let mimeType: string;
  let extension: string;

  if (format === 'json') {
    content = JSON.stringify(data, null, 2);
    mimeType = 'application/json';
    extension = 'json';
  } else {
    content = convertToCSV(data);
    mimeType = 'text/csv;charset=utf-8;';
    extension = 'csv';
  }

  const blob = new Blob(['\uFEFF' + content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.${extension}`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function convertToCSV(data: any): string {
  if (data.plates && Array.isArray(data.plates)) {
    const headers = ['底片编号', '底片名称', '扫描日期', '状态', '缺陷总数', '划痕', '霉斑', '亮点污染', '扫描缺陷', '轻微', '中等', '严重', '待复核', '已通过', '已驳回'];
    const rows = data.plates.map((p: any) => [
      p.plateCode,
      p.plateName,
      p.scanDate,
      p.status,
      p.totalDefects,
      p.byType['划痕'] || 0,
      p.byType['霉斑'] || 0,
      p.byType['亮点污染'] || 0,
      p.byType['扫描缺陷'] || 0,
      p.bySeverity['轻微'] || 0,
      p.bySeverity['中等'] || 0,
      p.bySeverity['严重'] || 0,
      p.byReviewStatus['待复核'] || 0,
      p.byReviewStatus['已通过'] || 0,
      p.byReviewStatus['已驳回'] || 0,
    ]);
    return [headers.join(','), ...rows.map((r: any[]) => r.join(','))].join('\n');
  }

  if (data.annotations && Array.isArray(data.annotations)) {
    const headers = ['ID', '形状', '缺陷类型', '严重程度', '描述', '处理建议', '复核状态', '创建人', '创建时间', '最后修改人', '更新时间'];
    const rows = data.annotations.map((a: any) => [
      a.id,
      a.shape,
      a.defectType,
      a.severity,
      `"${a.description.replace(/"/g, '""')}"`,
      `"${a.suggestion.replace(/"/g, '""')}"`,
      a.reviewStatus,
      a.createdBy,
      a.createdAt,
      a.lastModifiedBy,
      a.updatedAt,
    ]);
    return [headers.join(','), ...rows.map((r: any[]) => r.join(','))].join('\n');
  }

  return JSON.stringify(data, null, 2);
}
