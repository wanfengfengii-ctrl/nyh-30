import { useState, useMemo } from 'react';
import {
  Card,
  List,
  Tag,
  Button,
  Space,
  Checkbox,
  Divider,
  message,
  Select,
  Progress,
  Tooltip,
  Empty,
  Popconfirm,
  Badge,
} from 'antd';
import {
  CloudUploadOutlined,
  SafetyCertificateOutlined,
  DeleteOutlined,
  DownloadOutlined,
  ExperimentOutlined,
  RobotOutlined,
  FileSearchOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { useApp } from '../store/AppContext';
import type { DefectType, ReviewStatus } from '../types';
import {
  DEFECT_TYPE_LABELS,
  DEFECT_TYPE_COLORS,
  REVIEW_STATUS_LABELS,
  REVIEW_STATUS_COLORS,
} from '../types';
import { runAutoDetection } from '../services/detectionService';

export default function BatchProcessingPanel() {
  const { plateAnnotations, batchReview, batchDeleteAnnotations, selectedPlate, batchAddAnnotations } = useApp();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);
  const [filterType, setFilterType] = useState<'all' | 'auto' | 'manual'>('all');
  const [filterStatus, setFilterStatus] = useState<ReviewStatus | 'all'>('all');

  const filteredAnnotations = useMemo(() => {
    return plateAnnotations.filter((ann) => {
      if (filterType === 'auto' && !ann.isAutoDetected) return false;
      if (filterType === 'manual' && ann.isAutoDetected) return false;
      if (filterStatus !== 'all' && ann.reviewStatus !== filterStatus) return false;
      return true;
    });
  }, [plateAnnotations, filterType, filterStatus]);

  const allSelected = selectedIds.length > 0 && selectedIds.length === filteredAnnotations.length;

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredAnnotations.map((a) => a.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectItem = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds([...selectedIds, id]);
    } else {
      setSelectedIds(selectedIds.filter((i) => i !== id));
    }
  };

  const handleBatchReview = async (status: ReviewStatus) => {
    if (selectedIds.length === 0) {
      message.warning('请先选择要批量复核的标注');
      return;
    }

    setBatchProcessing(true);
    setBatchProgress(0);

    for (let i = 0; i < selectedIds.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      setBatchProgress(Math.round(((i + 1) / selectedIds.length) * 100));
    }

    batchReview(selectedIds, status, '批量复核');
    message.success(`已批量${status === 'reviewed' ? '通过' : '驳回'} ${selectedIds.length} 条标注`);
    setSelectedIds([]);
    setBatchProcessing(false);
    setBatchProgress(0);
  };

  const handleBatchDelete = () => {
    if (selectedIds.length === 0) {
      message.warning('请先选择要删除的标注');
      return;
    }

    batchDeleteAnnotations(selectedIds);
    message.success(`已批量删除 ${selectedIds.length} 条标注`);
    setSelectedIds([]);
  };

  const handleBatchDetect = async () => {
    if (!selectedPlate) {
      message.warning('请先选择一张底片');
      return;
    }

    setBatchProcessing(true);
    setBatchProgress(0);

    try {
      const results = await runAutoDetection({
        plateId: selectedPlate.id,
        imageWidth: selectedPlate.width,
        imageHeight: selectedPlate.height,
        onProgress: (p) => setBatchProgress(p),
      });

      batchAddAnnotations(results);
      message.success(`批量检测完成，新增 ${results.length} 个缺陷`);
    } catch (error) {
      message.error('批量检测失败');
    } finally {
      setBatchProcessing(false);
      setBatchProgress(0);
    }
  };

  const handleExport = () => {
    if (plateAnnotations.length === 0) {
      message.warning('暂无标注数据可导出');
      return;
    }

    const dataStr = JSON.stringify(plateAnnotations, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `annotations_${selectedPlate?.id || 'export'}.json`;
    a.click();
    URL.revokeObjectURL(url);
    message.success('标注数据已导出');
  };

  return (
    <Card
      size="small"
      title={
        <Space>
          <ExperimentOutlined />
          <span>批量处理</span>
          {selectedIds.length > 0 && (
            <Tag color="blue" style={{ margin: 0 }}>
              已选 {selectedIds.length}
            </Tag>
          )}
        </Space>
      }
      style={{ height: '100%' }}
      styles={{ body: { padding: 0, height: 'calc(100% - 46px)', display: 'flex', flexDirection: 'column' } }}
    >
      {batchProcessing && (
        <div style={{ padding: '8px 12px', background: '#e6f7ff', borderBottom: '1px solid #91d5ff' }}>
          <Progress percent={batchProgress} size="small" status="active" />
        </div>
      )}

      <div style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0' }}>
        <Space size={4} wrap>
          <Button
            size="small"
            icon={<SafetyCertificateOutlined />}
            onClick={() => handleBatchReview('reviewed')}
            disabled={selectedIds.length === 0 || batchProcessing}
          >
            批量通过
          </Button>
          <Button
            size="small"
            danger
            icon={<CloseCircleOutlined />}
            onClick={() => handleBatchReview('rejected')}
            disabled={selectedIds.length === 0 || batchProcessing}
          >
            批量驳回
          </Button>
          <Popconfirm
            title="确认删除"
            description={`确定要删除选中的 ${selectedIds.length} 条标注吗？`}
            onConfirm={handleBatchDelete}
            okText="删除"
            okType="danger"
          >
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              disabled={selectedIds.length === 0 || batchProcessing}
            >
              批量删除
            </Button>
          </Popconfirm>
          <Divider type="vertical" style={{ height: 22 }} />
          <Tooltip title="对当前底片重新执行AI检测">
            <Button
              size="small"
              icon={<RobotOutlined />}
              onClick={handleBatchDetect}
              disabled={batchProcessing || !selectedPlate}
            >
              重新检测
            </Button>
          </Tooltip>
          <Tooltip title="导出标注数据">
            <Button
              size="small"
              icon={<DownloadOutlined />}
              onClick={handleExport}
              disabled={batchProcessing}
            >
              导出
            </Button>
          </Tooltip>
        </Space>
      </div>

      <div style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0', background: '#fafafa' }}>
        <Space size="small">
          <Checkbox
            checked={allSelected}
            onChange={(e) => handleSelectAll(e.target.checked)}
            disabled={filteredAnnotations.length === 0}
          >
            <span style={{ fontSize: 12 }}>全选</span>
          </Checkbox>
          <Select
            size="small"
            value={filterType}
            onChange={setFilterType}
            style={{ width: 80 }}
            options={[
              { value: 'all', label: '全部' },
              { value: 'auto', label: 'AI检测' },
              { value: 'manual', label: '人工' },
            ]}
          />
          <Select
            size="small"
            value={filterStatus}
            onChange={setFilterStatus}
            style={{ width: 90 }}
            options={[
              { value: 'all', label: '全部状态' },
              { value: 'pending', label: '待复核' },
              { value: 'reviewed', label: '已通过' },
              { value: 'rejected', label: '已驳回' },
            ]}
          />
        </Space>
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        {filteredAnnotations.length === 0 ? (
          <Empty description="暂无标注" style={{ marginTop: 40 }} />
        ) : (
          <List
            size="small"
            dataSource={filteredAnnotations}
            renderItem={(item) => (
              <List.Item
                style={{ padding: '8px 12px', cursor: 'pointer' }}
                onClick={() => handleSelectItem(item.id, !selectedIds.includes(item.id))}
              >
                <Space style={{ width: '100%' }}>
                  <Checkbox
                    checked={selectedIds.includes(item.id)}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => handleSelectItem(item.id, e.target.checked)}
                  />
                  <Space direction="vertical" size={0} style={{ flex: 1, minWidth: 0 }}>
                    <Space size={4}>
                      <span
                        style={{
                          display: 'inline-block',
                          width: 8,
                          height: 8,
                          background: DEFECT_TYPE_COLORS[item.defectType as DefectType],
                          borderRadius: 2,
                        }}
                      />
                      <span style={{ fontSize: 12, fontWeight: 500 }}>
                        {DEFECT_TYPE_LABELS[item.defectType as DefectType]}
                      </span>
                      {item.isAutoDetected && (
                        <Badge
                          count="AI"
                          style={{ backgroundColor: '#1890ff', fontSize: 10, padding: '0 4px' }}
                        />
                      )}
                    </Space>
                    <div style={{ fontSize: 11, color: '#8c8c8c' }}>
                      {item.description || '无描述'}
                    </div>
                  </Space>
                  <Tag
                    color={REVIEW_STATUS_COLORS[item.reviewStatus]}
                    style={{ margin: 0, fontSize: 10 }}
                  >
                    {REVIEW_STATUS_LABELS[item.reviewStatus]}
                  </Tag>
                </Space>
              </List.Item>
            )}
          />
        )}
      </div>

      <div style={{ padding: '6px 12px', borderTop: '1px solid #f0f0f0', background: '#fafafa', fontSize: 11, color: '#8c8c8c' }}>
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <span>共 {filteredAnnotations.length} 条</span>
          <span>
            <FileSearchOutlined style={{ marginRight: 4 }} />
            AI: {filteredAnnotations.filter((a) => a.isAutoDetected).length} · 
            人工: {filteredAnnotations.filter((a) => !a.isAutoDetected).length}
          </span>
        </Space>
      </div>
    </Card>
  );
}
