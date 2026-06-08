import { useState } from 'react';
import {
  Card,
  Button,
  Input,
  Select,
  Space,
  Tag,
  List,
  Avatar,
  Divider,
  Tooltip,
  Modal,
  message,
} from 'antd';
import {
  CheckOutlined,
  CloseOutlined,
  MergeOutlined,
  EditOutlined,
  UserOutlined,
  CommentOutlined,
  HistoryOutlined,
} from '@ant-design/icons';
import { useApp } from '../store/AppContext';
import {
  DIFF_TYPE_LABELS,
  DIFF_TYPE_COLORS,
  DEFECT_TYPE_LABELS,
  DEFECT_TYPE_COLORS,
  SEVERITY_LABELS,
  SEVERITY_COLORS,
  APPROVAL_STATUS_LABELS,
  APPROVAL_STATUS_COLORS,
} from '../types';
import type { ApprovalStatus, DefectType, Severity } from '../types';

const { TextArea } = Input;
const { Option } = Select;

export default function ApprovalPanel() {
  const {
    selectedDiffItem,
    selectedBaseVersion,
    selectedCompareVersion,
    diffItemApprovals,
    currentComparison,
    currentUser,
    addApprovalRecord,
    batchApprove,
    getDiffItemApprovalStatus,
    filteredDiffItems,
  } = useApp();

  const [comment, setComment] = useState('');
  const [newDefectType, setNewDefectType] = useState<DefectType | undefined>();
  const [newSeverity, setNewSeverity] = useState<Severity | undefined>();
  const [batchModalVisible, setBatchModalVisible] = useState(false);
  const [batchStatus, setBatchStatus] = useState<ApprovalStatus>('approved');
  const [batchComment, setBatchComment] = useState('');
  const [batchFilter, setBatchFilter] = useState<string>('all');

  const handleApprove = (status: ApprovalStatus) => {
    if (!selectedDiffItem || !currentComparison) return;

    addApprovalRecord({
      diffItemId: selectedDiffItem.id,
      comparisonId: currentComparison.id,
      approverId: currentUser.id,
      approverName: currentUser.name,
      status,
      comment,
      newDefectType,
      newSeverity,
    });

    message.success(`已${APPROVAL_STATUS_LABELS[status]}该差异`);
    setComment('');
    setNewDefectType(undefined);
    setNewSeverity(undefined);
  };

  const handleBatchApprove = () => {
    if (!currentComparison) return;

    let diffItemIds: string[];
    if (batchFilter === 'all') {
      diffItemIds = filteredDiffItems.map((d) => d.id);
    } else {
      diffItemIds = filteredDiffItems
        .filter((d) => d.diffType === batchFilter)
        .map((d) => d.id);
    }

    if (diffItemIds.length === 0) {
      message.warning('没有可批量处理的差异项');
      return;
    }

    batchApprove(diffItemIds, currentComparison.id, batchStatus, batchComment);
    message.success(`已批量${APPROVAL_STATUS_LABELS[batchStatus]} ${diffItemIds.length} 个差异项`);
    setBatchModalVisible(false);
    setBatchComment('');
  };

  const approvalStatus = selectedDiffItem
    ? getDiffItemApprovalStatus(selectedDiffItem.id)
    : null;

  if (!selectedDiffItem) {
    return (
      <div
        style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#8c8c8c',
          padding: 24,
        }}
      >
        <CommentOutlined style={{ fontSize: 48, marginBottom: 16, color: '#d9d9d9' }} />
        <p>请选择一个差异项进行审定</p>
        <Button
          type="primary"
          size="small"
          style={{ marginTop: 12 }}
          onClick={() => setBatchModalVisible(true)}
        >
          批量审定
        </Button>
      </div>
    );
  }

  const defectType = selectedDiffItem.newType || selectedDiffItem.oldType;
  const baseApproval = diffItemApprovals.find((a) => a.status !== 'pending');

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: 12, borderBottom: '1px solid #f0f0f0', background: '#fafafa' }}>
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Space size="small">
              <Tag color={DIFF_TYPE_COLORS[selectedDiffItem.diffType]}>
                {DIFF_TYPE_LABELS[selectedDiffItem.diffType]}
              </Tag>
              {defectType && (
                <Tag color={DEFECT_TYPE_COLORS[defectType]}>
                  {DEFECT_TYPE_LABELS[defectType]}
                </Tag>
              )}
              {selectedDiffItem.severity && (
                <Tag color={SEVERITY_COLORS[selectedDiffItem.severity]}>
                  {SEVERITY_LABELS[selectedDiffItem.severity]}
                </Tag>
              )}
            </Space>
            {approvalStatus && (
              <Tag color={APPROVAL_STATUS_COLORS[approvalStatus]}>
                {APPROVAL_STATUS_LABELS[approvalStatus]}
              </Tag>
            )}
          </div>
          <div style={{ fontSize: 13, color: '#595959' }}>
            {selectedDiffItem.description}
          </div>
          {selectedDiffItem.positionOffset && (
            <div style={{ fontSize: 12, color: '#8c8c8c' }}>
              位置偏移: X轴 {selectedDiffItem.positionOffset.dx.toFixed(1)}px, Y轴{' '}
              {selectedDiffItem.positionOffset.dy.toFixed(1)}px, 距离{' '}
              {selectedDiffItem.positionOffset.distance.toFixed(1)}px
            </div>
          )}
        </Space>
      </div>

      <div style={{ padding: 12, borderBottom: '1px solid #f0f0f0' }}>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>审定操作</div>
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <Select
              size="small"
              style={{ flex: 1 }}
              placeholder="重分类缺陷类型"
              value={newDefectType}
              onChange={setNewDefectType}
              allowClear
            >
              {(['scratch', 'mold', 'bright_spot', 'scan_defect'] as DefectType[]).map((type) => (
                <Option key={type} value={type}>
                  {DEFECT_TYPE_LABELS[type]}
                </Option>
              ))}
            </Select>
            <Select
              size="small"
              style={{ flex: 1 }}
              placeholder="调整严重程度"
              value={newSeverity}
              onChange={setNewSeverity}
              allowClear
            >
              {(['mild', 'moderate', 'severe'] as Severity[]).map((s) => (
                <Option key={s} value={s}>
                  {SEVERITY_LABELS[s]}
                </Option>
              ))}
            </Select>
          </div>
          <TextArea
            rows={3}
            placeholder="输入审定意见..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            size="small"
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <Button
              type="primary"
              size="small"
              icon={<CheckOutlined />}
              onClick={() => handleApprove('approved')}
              style={{ flex: 1 }}
            >
              确认
            </Button>
            <Button
              danger
              size="small"
              icon={<CloseOutlined />}
              onClick={() => handleApprove('rejected')}
              style={{ flex: 1 }}
            >
              驳回
            </Button>
            <Button
              size="small"
              icon={<MergeOutlined />}
              onClick={() => handleApprove('merged')}
              style={{ flex: 1 }}
            >
              合并
            </Button>
          </div>
          <Button
            size="small"
            type="dashed"
            onClick={() => setBatchModalVisible(true)}
            block
          >
            批量审定
          </Button>
        </Space>
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        <div style={{ padding: '12px 12px 8px' }}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>
            <HistoryOutlined style={{ marginRight: 4 }} />
            审定记录 ({diffItemApprovals.length})
          </div>
        </div>
        <List
          size="small"
          dataSource={diffItemApprovals}
          locale={{ emptyText: '暂无审定记录' }}
          renderItem={(record) => (
            <List.Item style={{ padding: '8px 12px' }}>
              <List.Item.Meta
                avatar={
                  <Avatar size="small" icon={<UserOutlined />} style={{ backgroundColor: '#1890ff' }}>
                    {record.approverName.charAt(0)}
                  </Avatar>
                }
                title={
                  <Space size="small">
                    <span style={{ fontSize: 12 }}>{record.approverName}</span>
                    <Tag color={APPROVAL_STATUS_COLORS[record.status]} style={{ margin: 0, fontSize: 10 }}>
                      {APPROVAL_STATUS_LABELS[record.status]}
                    </Tag>
                  </Space>
                }
                description={
                  <div>
                    {record.comment || <span style={{ color: '#bfbfbf' }}>无意见</span>}
                    {record.newDefectType && (
                      <div style={{ fontSize: 11, color: '#8c8c8c', marginTop: 2 }}>
                        重分类为: {DEFECT_TYPE_LABELS[record.newDefectType]}
                      </div>
                    )}
                    <div style={{ fontSize: 11, color: '#bfbfbf', marginTop: 2 }}>
                      {new Date(record.createdAt).toLocaleString()}
                    </div>
                  </div>
                }
              />
            </List.Item>
          )}
        />
      </div>

      <Modal
        title="批量审定"
        open={batchModalVisible}
        onOk={handleBatchApprove}
        onCancel={() => setBatchModalVisible(false)}
        okText="确认批量处理"
        width={420}
      >
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div>
            <div style={{ marginBottom: 6, fontSize: 13 }}>处理范围</div>
            <Select value={batchFilter} onChange={setBatchFilter} style={{ width: '100%' }} size="small">
              <Option value="all">全部差异项 ({filteredDiffItems.length})</Option>
              <Option value="added">
                新增缺陷 ({filteredDiffItems.filter((d) => d.diffType === 'added').length})
              </Option>
              <Option value="removed">
                消失缺陷 ({filteredDiffItems.filter((d) => d.diffType === 'removed').length})
              </Option>
              <Option value="moved">
                位置偏移 ({filteredDiffItems.filter((d) => d.diffType === 'moved').length})
              </Option>
              <Option value="type_changed">
                类型变更 ({filteredDiffItems.filter((d) => d.diffType === 'type_changed').length})
              </Option>
            </Select>
          </div>
          <div>
            <div style={{ marginBottom: 6, fontSize: 13 }}>审定状态</div>
            <Select value={batchStatus} onChange={setBatchStatus} style={{ width: '100%' }} size="small">
              <Option value="approved">确认</Option>
              <Option value="rejected">驳回</Option>
              <Option value="merged">合并</Option>
              <Option value="pending">待审定</Option>
            </Select>
          </div>
          <div>
            <div style={{ marginBottom: 6, fontSize: 13 }}>审定意见</div>
            <TextArea
              rows={3}
              placeholder="输入批量审定意见（可选）"
              value={batchComment}
              onChange={(e) => setBatchComment(e.target.value)}
              size="small"
            />
          </div>
        </Space>
      </Modal>
    </div>
  );
}
