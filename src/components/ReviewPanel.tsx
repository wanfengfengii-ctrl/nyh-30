import { useState } from 'react';
import {
  Card,
  List,
  Tag,
  Button,
  Form,
  Input,
  Space,
  Avatar,
  Divider,
  message,
  Tooltip,
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  UserOutlined,
  MessageOutlined,
  AuditOutlined,
} from '@ant-design/icons';
import { useApp } from '../store/AppContext';
import type { ReviewStatus, ReviewRecord } from '../types';
import { REVIEW_STATUS_LABELS, REVIEW_STATUS_COLORS } from '../types';

const { TextArea } = Input;

export default function ReviewPanel() {
  const { selectedAnnotation, annotationReviews, currentUser, addReview, canUndo } = useApp();
  const [form] = Form.useForm();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitReview = async (status: ReviewStatus) => {
    if (!selectedAnnotation) return;

    try {
      const values = await form.validateFields();
      setIsSubmitting(true);

      if (selectedAnnotation.severity === 'severe' && !selectedAnnotation.suggestion.trim() && status === 'reviewed') {
        message.error('严重缺陷必须填写处理建议才能复核通过');
        setIsSubmitting(false);
        return;
      }

      addReview(selectedAnnotation.id, status, values.comment || '');
      message.success(status === 'reviewed' ? '复核通过' : '已驳回');
      form.resetFields(['comment']);
    } catch {
      // validation failed
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReviewAll = () => {
    // This would be handled at a higher level
    message.info('批量复核功能请在缺陷列表中操作');
  };

  if (!selectedAnnotation) {
    return (
      <Card
        size="small"
        title={
          <Space>
            <AuditOutlined />
            <span>复核记录</span>
          </Space>
        }
        style={{ height: '100%' }}
        styles={{ body: { padding: 0, height: 'calc(100% - 46px)', overflow: 'auto' } }}
      >
        <div style={{ padding: 20, textAlign: 'center', color: '#999' }}>
          请选择一个标注查看复核记录
        </div>
      </Card>
    );
  }

  return (
    <Card
      size="small"
      title={
        <Space>
          <AuditOutlined />
          <span>复核记录</span>
          <Tag color={REVIEW_STATUS_COLORS[selectedAnnotation.reviewStatus]} style={{ margin: 0 }}>
            {REVIEW_STATUS_LABELS[selectedAnnotation.reviewStatus]}
          </Tag>
        </Space>
      }
      style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
      styles={{ body: { padding: 0, flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' } }}
    >
      <div style={{ flex: 1, overflow: 'auto' }}>
        {annotationReviews.length === 0 ? (
          <div style={{ padding: 20, textAlign: 'center', color: '#999' }}>
            暂无复核记录
          </div>
        ) : (
          <List
            size="small"
            dataSource={annotationReviews}
            renderItem={(record) => (
              <ReviewRecordItem record={record} />
            )}
          />
        )}
      </div>

      <Divider style={{ margin: 0 }} />

      <div style={{ padding: 12, background: '#fafafa' }}>
        <Form form={form} layout="vertical">
          <Form.Item label="复核意见" name="comment">
            <TextArea
              rows={3}
              placeholder="请输入复核意见..."
              maxLength={500}
              showCount
            />
          </Form.Item>
          <Space wrap>
            <Tooltip title="标记为复核通过">
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                onClick={() => handleSubmitReview('reviewed')}
                loading={isSubmitting}
                disabled={selectedAnnotation.reviewStatus === 'reviewed'}
              >
                通过
              </Button>
            </Tooltip>
            <Tooltip title="驳回并要求修改">
              <Button
                danger
                icon={<CloseCircleOutlined />}
                onClick={() => handleSubmitReview('rejected')}
                loading={isSubmitting}
                disabled={selectedAnnotation.reviewStatus === 'rejected'}
              >
                驳回
              </Button>
            </Tooltip>
            {selectedAnnotation.reviewStatus !== 'pending' && (
              <Tooltip title="重置为待复核状态">
                <Button
                  icon={<ClockCircleOutlined />}
                  onClick={() => handleSubmitReview('pending')}
                  loading={isSubmitting}
                >
                  重置
                </Button>
              </Tooltip>
            )}
          </Space>
          <div style={{ marginTop: 8, fontSize: 12, color: '#8c8c8c' }}>
            当前用户: <Tag color="blue" style={{ margin: 0 }}>{currentUser.name}</Tag>
          </div>
        </Form>
      </div>
    </Card>
  );
}

function ReviewRecordItem({ record }: { record: ReviewRecord }) {
  const statusColor = record.status === 'reviewed' ? 'green' : record.status === 'rejected' ? 'red' : 'orange';
  const statusIcon = record.status === 'reviewed'
    ? <CheckCircleOutlined style={{ color: '#52c41a' }} />
    : record.status === 'rejected'
    ? <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
    : <ClockCircleOutlined style={{ color: '#faad14' }} />;

  return (
    <List.Item style={{ padding: '12px 16px' }}>
      <List.Item.Meta
        avatar={
          <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#1890ff' }}>
            {record.reviewerName.charAt(0)}
          </Avatar>
        }
        title={
          <Space size="small">
            <span style={{ fontSize: 13, fontWeight: 500 }}>{record.reviewerName}</span>
            <Tag color={statusColor} icon={statusIcon} style={{ margin: 0 }}>
              {REVIEW_STATUS_LABELS[record.status]}
            </Tag>
          </Space>
        }
        description={
          <div>
            {record.comment && (
              <div style={{ fontSize: 12, color: '#595959', marginBottom: 4 }}>
                <MessageOutlined style={{ marginRight: 4 }} />
                {record.comment}
              </div>
            )}
            <div style={{ fontSize: 11, color: '#8c8c8c' }}>
              {new Date(record.reviewedAt).toLocaleString('zh-CN')}
            </div>
          </div>
        }
      />
    </List.Item>
  );
}
