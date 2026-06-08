import { useState } from 'react';
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
} from 'antd';
import {
  DeleteOutlined,
  CheckOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { useApp } from '../store/AppContext';
import type { Annotation, DefectType, Severity, ReviewStatus } from '../types';
import {
  DEFECT_TYPE_LABELS,
  DEFECT_TYPE_COLORS,
  SEVERITY_LABELS,
  REVIEW_STATUS_LABELS,
} from '../types';

const { TextArea } = Input;

export default function AnnotationDetailPanel() {
  const { selectedPlate, selectedAnnotation, plateAnnotations, dispatch } = useApp();
  const [form] = Form.useForm();

  const handleSelectAnnotation = (id: string) => {
    dispatch({ type: 'SELECT_ANNOTATION', payload: id });
  };

  const handleValuesChange = (_: any, allValues: any) => {
    if (!selectedAnnotation) return;

    if (allValues.severity === 'severe' && !allValues.suggestion?.trim()) {
      return;
    }

    dispatch({
      type: 'UPDATE_ANNOTATION',
      payload: {
        id: selectedAnnotation.id,
        data: allValues,
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
    dispatch({
      type: 'UPDATE_ANNOTATION',
      payload: {
        id: selectedAnnotation.id,
        data: { reviewStatus: newStatus },
      },
    });
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
        payload: { id: a.id, data: { reviewStatus: 'reviewed' } },
      });
    });
    message.success(`已复核 ${pendingAnns.length} 条标注`);
  };

  const pendingCount = plateAnnotations.filter((a) => a.reviewStatus === 'pending').length;
  const reviewedCount = plateAnnotations.filter((a) => a.reviewStatus === 'reviewed').length;

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
            <Badge count={plateAnnotations.length} size="small" />
          </Space>
        }
        extra={
          plateAnnotations.length > 0 && (
            <Tooltip title="全部复核">
              <Button type="link" size="small" onClick={handleReviewAll} disabled={pendingCount === 0}>
                全部复核
              </Button>
            </Tooltip>
          )
        }
        style={{ borderBottom: '1px solid #f0f0f0' }}
        styles={{ body: { padding: 0 } }}
      >
        <div style={{ padding: '8px 12px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Tag color="orange">待复核: {pendingCount}</Tag>
          <Tag color="green">已复核: {reviewedCount}</Tag>
        </div>
        <div style={{ maxHeight: 200, overflow: 'auto' }}>
          {plateAnnotations.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', color: '#999' }}>
              暂无标注，请在画布上绘制
            </div>
          ) : (
            <List
              size="small"
              dataSource={plateAnnotations}
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
                        {ann.reviewStatus === 'pending' ? (
                          <ClockCircleOutlined style={{ color: '#faad14', fontSize: 12 }} />
                        ) : (
                          <CheckOutlined style={{ color: '#52c41a', fontSize: 12 }} />
                        )}
                      </Space>
                    }
                    description={
                      <Tag color={ann.severity === 'severe' ? 'red' : ann.severity === 'moderate' ? 'orange' : 'blue'}>
                        {SEVERITY_LABELS[ann.severity]}
                      </Tag>
                    }
                  />
                </List.Item>
              )}
            />
          )}
        </div>
      </Card>

      <Card
        size="small"
        title="缺陷详情"
        style={{ flex: 1, overflow: 'auto', border: 'none', borderRadius: 0 }}
        styles={{ body: { padding: 16 } }}
      >
        {!selectedAnnotation ? (
          <div style={{ textAlign: 'center', color: '#999', padding: '20px 0' }}>
            请选择一个标注查看详情
          </div>
        ) : (
          <Form
            form={form}
            layout="vertical"
            initialValues={{
              defectType: selectedAnnotation.defectType,
              severity: selectedAnnotation.severity,
              description: selectedAnnotation.description,
              suggestion: selectedAnnotation.suggestion,
              reviewStatus: selectedAnnotation.reviewStatus,
            }}
            onValuesChange={handleValuesChange}
            fields={[
              { name: 'defectType', value: selectedAnnotation.defectType },
              { name: 'severity', value: selectedAnnotation.severity },
              { name: 'description', value: selectedAnnotation.description },
              { name: 'suggestion', value: selectedAnnotation.suggestion },
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
              <div>形状: {selectedAnnotation.shape === 'rectangle' ? '矩形' : selectedAnnotation.shape === 'circle' ? '圆形' : '多边形'}</div>
              <div>状态: {REVIEW_STATUS_LABELS[selectedAnnotation.reviewStatus]}</div>
              <div>创建时间: {new Date(selectedAnnotation.createdAt).toLocaleString('zh-CN')}</div>
            </div>
          </Form>
        )}
      </Card>
    </div>
  );
}
