import { useState, useEffect } from 'react';
import {
  Card,
  List,
  Tag,
  Button,
  Form,
  Select,
  Input,
  Space,
  Popconfirm,
  message,
  Divider,
  Badge,
  Tooltip,
  Tabs,
  Avatar,
  Typography,
  Progress,
  Alert,
} from 'antd';
import {
  DeleteOutlined,
  CheckOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  FileTextOutlined,
  UserOutlined,
  UndoOutlined,
  RedoOutlined,
  RobotOutlined,
  SafetyCertificateOutlined,
  EditOutlined,
  ExperimentOutlined,
} from '@ant-design/icons';
import { useApp } from '../store/AppContext';
import FilterPanel from './FilterPanel';
import ReviewPanel from './ReviewPanel';
import AnnotationHistoryPanel from './AnnotationHistoryPanel';
import type { Annotation, DefectType, Severity, ReviewStatus, ModificationReason } from '../types';
import {
  DEFECT_TYPE_LABELS,
  DEFECT_TYPE_COLORS,
  SEVERITY_LABELS,
  SEVERITY_COLORS,
  REVIEW_STATUS_LABELS,
  REVIEW_STATUS_COLORS,
  MODIFICATION_REASON_LABELS,
} from '../types';
import { getConfidenceColor, getConfidenceLabel } from '../services/detectionService';

const { TextArea } = Input;
const { Text } = Typography;

export default function AnnotationDetailPanel() {
  const {
    selectedPlate,
    selectedAnnotation,
    plateAnnotations,
    filteredAnnotations,
    dispatch,
    canUndo,
    canRedo,
    undo,
    redo,
    addReview,
    currentUser,
  } = useApp();
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState('detail');

  useEffect(() => {
    if (selectedAnnotation) {
      form.setFieldsValue({
        defectType: selectedAnnotation.defectType,
        severity: selectedAnnotation.severity,
        description: selectedAnnotation.description,
        suggestion: selectedAnnotation.suggestion,
      });
    } else {
      form.resetFields();
    }
  }, [selectedAnnotation, form]);

  const handleSelectAnnotation = (id: string) => {
    dispatch({ type: 'SELECT_ANNOTATION', payload: id });
  };

  const handleValuesChange = (_: any, allValues: any) => {
    if (!selectedAnnotation) return;

    dispatch({
      type: 'UPDATE_ANNOTATION',
      payload: {
        id: selectedAnnotation.id,
        data: allValues,
        description: '更新标注属性',
      },
    });
  };

  const handleDelete = () => {
    if (!selectedAnnotation) return;
    dispatch({ type: 'DELETE_ANNOTATION', payload: selectedAnnotation.id });
    message.success('标注已删除');
  };

  const handleToggleReview = () => {
    if (!selectedAnnotation) return;

    if (selectedAnnotation.severity === 'severe' && !selectedAnnotation.suggestion.trim()) {
      message.error('严重缺陷必须填写处理建议才能复核');
      return;
    }

    const newStatus: ReviewStatus = selectedAnnotation.reviewStatus === 'pending' ? 'reviewed' : 'pending';
    
    addReview(selectedAnnotation.id, newStatus, newStatus === 'reviewed' ? '快速复核通过' : '取消复核');
    message.success(newStatus === 'reviewed' ? '已标记为已复核' : '已取消复核');
  };

  const handleReviewAll = () => {
    const pendingAnns = plateAnnotations.filter((a) => a.reviewStatus === 'pending');
    const severeWithoutSuggestion = pendingAnns.filter(
      (a) => a.severity === 'severe' && !a.suggestion.trim()
    );

    if (severeWithoutSuggestion.length > 0) {
      message.error(`有 ${severeWithoutSuggestion.length} 条严重缺陷未填写处理建议，无法全部复核`);
      return;
    }

    pendingAnns.forEach((a) => {
      dispatch({
        type: 'UPDATE_ANNOTATION',
        payload: { id: a.id, data: { reviewStatus: 'reviewed' }, description: '批量复核通过' },
      });
    });
    message.success(`已复核 ${pendingAnns.length} 条标注`);
  };

  const handleUndo = () => {
    undo();
    message.info('已撤销');
  };

  const handleRedo = () => {
    redo();
    message.info('已恢复');
  };

  const pendingCount = plateAnnotations.filter((a) => a.reviewStatus === 'pending').length;
  const reviewedCount = plateAnnotations.filter((a) => a.reviewStatus === 'reviewed').length;
  const rejectedCount = plateAnnotations.filter((a) => a.reviewStatus === 'rejected').length;

  const displayAnnotations = filteredAnnotations;

  const tabItems = [
    {
      key: 'detail',
      label: (
        <span>
          <FileTextOutlined />
          详情
        </span>
      ),
      children: <DetailContent selectedAnnotation={selectedAnnotation} form={form} handleValuesChange={handleValuesChange} handleToggleReview={handleToggleReview} handleDelete={handleDelete} />,
    },
    {
      key: 'review',
      label: (
        <span>
          <CheckOutlined />
          复核
        </span>
      ),
      children: <ReviewPanel />,
    },
    {
      key: 'history',
      label: (
        <span>
          <ClockCircleOutlined />
          历史
        </span>
      ),
      children: <AnnotationHistoryPanel />,
    },
  ];

  if (!selectedPlate) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
        请选择一张底片
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Card
        size="small"
        title={
          <Space>
            <FileTextOutlined />
            <span>缺陷列表</span>
            <Badge count={displayAnnotations.length} size="small" />
            {displayAnnotations.length !== plateAnnotations.length && (
              <Tag color="blue" style={{ margin: 0, fontSize: 11 }}>
                已筛选
              </Tag>
            )}
          </Space>
        }
        extra={
          <Space size="small">
            <Tooltip title="撤销">
              <Button
                type="text"
                size="small"
                icon={<UndoOutlined />}
                onClick={handleUndo}
                disabled={!canUndo}
              />
            </Tooltip>
            <Tooltip title="恢复">
              <Button
                type="text"
                size="small"
                icon={<RedoOutlined />}
                onClick={handleRedo}
                disabled={!canRedo}
              />
            </Tooltip>
            {plateAnnotations.length > 0 && (
              <Tooltip title="全部复核">
                <Button type="link" size="small" onClick={handleReviewAll} disabled={pendingCount === 0}>
                  全部复核
                </Button>
              </Tooltip>
            )}
          </Space>
        }
        style={{ borderBottom: '1px solid #f0f0f0', flexShrink: 0 }}
        styles={{ body: { padding: 0 } }}
      >
        <div style={{ padding: '8px 12px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Tag color="orange">待复核: {pendingCount}</Tag>
          <Tag color="green">已通过: {reviewedCount}</Tag>
          <Tag color="red">已驳回: {rejectedCount}</Tag>
        </div>
        <div style={{ maxHeight: 180, overflow: 'auto' }}>
          {displayAnnotations.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', color: '#999' }}>
              {plateAnnotations.length === 0 ? '暂无标注，请在画布上绘制' : '没有符合筛选条件的标注'}
            </div>
          ) : (
            <List
              size="small"
              dataSource={displayAnnotations}
              renderItem={(ann, index) => (
                <List.Item
                  key={ann.id}
                  style={{
                    cursor: 'pointer',
                    padding: '8px 12px',
                    background: selectedAnnotation?.id === ann.id ? '#e6f4ff' : undefined,
                    borderLeft: selectedAnnotation?.id === ann.id ? '3px solid #1677ff' : '3px solid transparent',
                  }}
                  onClick={() => handleSelectAnnotation(ann.id)}
                >
                  <List.Item.Meta
                    avatar={
                      <div
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: 2,
                          background: DEFECT_TYPE_COLORS[ann.defectType],
                        }}
                      />
                    }
                    title={
                      <Space size="small">
                        <span style={{ fontSize: 13 }}>
                          #{index + 1} {DEFECT_TYPE_LABELS[ann.defectType]}
                        </span>
                        <Tag color={REVIEW_STATUS_COLORS[ann.reviewStatus]} style={{ margin: 0, fontSize: 10, padding: '0 4px' }}>
                          {REVIEW_STATUS_LABELS[ann.reviewStatus]}
                        </Tag>
                      </Space>
                    }
                    description={
                      <Space size="small">
                        <Tag color={SEVERITY_COLORS[ann.severity]} style={{ margin: 0, fontSize: 10, padding: '0 4px' }}>
                          {SEVERITY_LABELS[ann.severity]}
                        </Tag>
                        <span style={{ fontSize: 11, color: '#8c8c8c' }}>
                          {ann.createdByName}
                        </span>
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          )}
        </div>
      </Card>

      <div style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0', flexShrink: 0 }}>
        <FilterPanel />
      </div>

      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          size="small"
          style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
          items={[
            {
              key: 'detail',
              label: <span><FileTextOutlined />详情</span>,
              children: (
                <div style={{ overflow: 'auto', height: 'calc(100% - 40px)' }}>
                  <DetailContent
                    selectedAnnotation={selectedAnnotation}
                    form={form}
                    handleValuesChange={handleValuesChange}
                    handleToggleReview={handleToggleReview}
                    handleDelete={handleDelete}
                  />
                </div>
              ),
            },
            {
              key: 'review',
              label: <span><CheckOutlined />复核</span>,
              children: (
                <div style={{ height: 'calc(100% - 40px)', overflow: 'hidden' }}>
                  <ReviewPanel />
                </div>
              ),
            },
            {
              key: 'history',
              label: <span><ClockCircleOutlined />历史</span>,
              children: (
                <div style={{ height: 'calc(100% - 40px)', overflow: 'hidden' }}>
                  <AnnotationHistoryPanel />
                </div>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}

interface DetailContentProps {
  selectedAnnotation: Annotation | null;
  form: any;
  handleValuesChange: (changedValues: any, allValues: any) => void;
  handleToggleReview: () => void;
  handleDelete: () => void;
}

function DetailContent({ selectedAnnotation, form, handleValuesChange, handleToggleReview, handleDelete }: DetailContentProps) {
  if (!selectedAnnotation) {
    return (
      <div style={{ textAlign: 'center', color: '#999', padding: '20px 0' }}>
        请选择一个标注查看详情
      </div>
    );
  }

  return (
    <div style={{ padding: 12, overflow: 'auto', height: '100%' }}>
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          defectType: selectedAnnotation.defectType,
          severity: selectedAnnotation.severity,
          description: selectedAnnotation.description,
          suggestion: selectedAnnotation.suggestion,
          reviewStatus: selectedAnnotation.reviewStatus,
          modificationReason: selectedAnnotation.modificationReason,
          modificationNote: selectedAnnotation.modificationNote,
        }}
        onValuesChange={handleValuesChange}
        fields={[
          { name: 'defectType', value: selectedAnnotation.defectType },
          { name: 'severity', value: selectedAnnotation.severity },
          { name: 'description', value: selectedAnnotation.description },
          { name: 'suggestion', value: selectedAnnotation.suggestion },
          { name: 'modificationReason', value: selectedAnnotation.modificationReason },
          { name: 'modificationNote', value: selectedAnnotation.modificationNote },
        ]}
      >
        <Form.Item label="缺陷类型" name="defectType">
          <Select
            options={Object.entries(DEFECT_TYPE_LABELS).map(([value, label]) => ({
              value: value as DefectType,
              label: (
                <Space>
                  <span
                    style={{
                      display: 'inline-block',
                      width: 8,
                      height: 8,
                      background: DEFECT_TYPE_COLORS[value as DefectType],
                      borderRadius: 2,
                    }}
                  />
                  {label}
                </Space>
              ),
            }))}
          />
        </Form.Item>

        <Form.Item label="严重程度" name="severity">
          <Select
            options={Object.entries(SEVERITY_LABELS).map(([value, label]) => ({
              value: value as Severity,
              label,
            }))}
          />
        </Form.Item>

        {selectedAnnotation.isAutoDetected && (
          <Alert
            message={
              <Space>
                <RobotOutlined />
                <span>AI自动检测生成</span>
                <Tag color={getConfidenceColor(selectedAnnotation.confidence)}>
                  置信度 {(selectedAnnotation.confidence * 100).toFixed(1)}%
                </Tag>
              </Space>
            }
            type="info"
            showIcon={false}
            style={{ marginBottom: 12 }}
          />
        )}

        {selectedAnnotation.isAutoDetected && selectedAnnotation.autoConfidence !== undefined && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>
              AI检测置信度: {getConfidenceLabel(selectedAnnotation.confidence)}
            </div>
            <Progress
              percent={Math.round(selectedAnnotation.confidence * 100)}
              size="small"
              strokeColor={getConfidenceColor(selectedAnnotation.confidence)}
            />
          </div>
        )}

        {selectedAnnotation.isAutoDetected && selectedAnnotation.autoDetectType && (
          <div style={{ marginBottom: 12, padding: '8px 12px', background: '#f5f5f5', borderRadius: 4, fontSize: 12 }}>
            <div style={{ color: '#666', marginBottom: 4 }}>AI原始检测类型</div>
            <Tag color={DEFECT_TYPE_COLORS[selectedAnnotation.autoDetectType]}>
              {DEFECT_TYPE_LABELS[selectedAnnotation.autoDetectType]}
            </Tag>
          </div>
        )}

        {selectedAnnotation.modificationReason && (
          <Alert
            message={
              <Space direction="vertical" size={2}>
                <Space>
                  <EditOutlined />
                  <span>人工修订原因: {MODIFICATION_REASON_LABELS[selectedAnnotation.modificationReason]}</span>
                </Space>
                {selectedAnnotation.modificationNote && (
                  <span style={{ fontSize: 11, color: '#666', marginLeft: 18 }}>
                    备注: {selectedAnnotation.modificationNote}
                  </span>
                )}
              </Space>
            }
            type="warning"
            showIcon={false}
            style={{ marginBottom: 12 }}
          />
        )}

        {selectedAnnotation.severity === 'severe' && !selectedAnnotation.suggestion.trim() && (
          <div style={{
            padding: '8px 12px',
            background: '#fff2f0',
            border: '1px solid #ffccc7',
            borderRadius: 4,
            marginBottom: 12,
            fontSize: 12,
            color: '#cf1322',
          }}>
            <ExclamationCircleOutlined style={{ marginRight: 6 }} />
            严重缺陷必须填写处理建议
          </div>
        )}

        <Form.Item label="描述说明" name="description">
          <TextArea rows={3} placeholder="请输入缺陷描述" maxLength={200} showCount />
        </Form.Item>

        <Form.Item
          label="处理建议"
          name="suggestion"
          rules={[
            { required: selectedAnnotation.severity === 'severe', message: '严重缺陷必须填写处理建议' },
          ]}
        >
          <TextArea rows={3} placeholder="请输入处理建议" maxLength={200} showCount />
        </Form.Item>

        <Divider style={{ margin: '12px 0' }} />

        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8, color: '#262626' }}>
          <EditOutlined style={{ marginRight: 4 }} />
          人工修订记录
        </div>

        <Form.Item label="修订原因" name="modificationReason">
          <Select
            placeholder="请选择修订原因"
            allowClear
            options={Object.entries(MODIFICATION_REASON_LABELS).map(([value, label]) => ({
              value: value as ModificationReason,
              label,
            }))}
          />
        </Form.Item>

        <Form.Item label="修订备注" name="modificationNote">
          <TextArea rows={2} placeholder="请输入修订备注说明" maxLength={200} showCount />
        </Form.Item>

        <Divider style={{ margin: '12px 0' }} />

        <Space wrap>
          <Button
            type={selectedAnnotation.reviewStatus === 'reviewed' ? 'default' : 'primary'}
            icon={selectedAnnotation.reviewStatus === 'reviewed' ? <CheckOutlined /> : <ClockCircleOutlined />}
            onClick={handleToggleReview}
          >
            {selectedAnnotation.reviewStatus === 'reviewed' ? '取消复核' : '标记已复核'}
          </Button>

          <Popconfirm
            title="确认删除"
            description="确定要删除这条标注吗？"
            onConfirm={handleDelete}
            okText="删除"
            okType="danger"
          >
            <Button danger icon={<DeleteOutlined />}>
              删除标注
            </Button>
          </Popconfirm>
        </Space>

        <Divider style={{ margin: '12px 0' }} />

        <div style={{ fontSize: 12, color: '#8c8c8c' }}>
          <Space direction="vertical" size={4} style={{ width: '100%' }}>
            <div>形状: {selectedAnnotation.shape === 'rectangle' ? '矩形' : selectedAnnotation.shape === 'circle' ? '圆形' : '多边形'}</div>
            <div>
              状态: <Tag color={REVIEW_STATUS_COLORS[selectedAnnotation.reviewStatus]} style={{ margin: 0, fontSize: 10 }}>{REVIEW_STATUS_LABELS[selectedAnnotation.reviewStatus]}</Tag>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <UserOutlined />
              <span>创建人: {selectedAnnotation.createdByName}</span>
            </div>
            <div>创建时间: {new Date(selectedAnnotation.createdAt).toLocaleString('zh-CN')}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <UserOutlined />
              <span>最后修改: {selectedAnnotation.lastModifiedByName}</span>
            </div>
            <div>更新时间: {new Date(selectedAnnotation.updatedAt).toLocaleString('zh-CN')}</div>
          </Space>
        </div>
      </Form>
    </div>
  );
}
