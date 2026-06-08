import { Card, List, Tag, Timeline, Space, Typography } from 'antd';
import {
  HistoryOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  UserOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { useApp } from '../store/AppContext';
import type { HistoryEntry } from '../types';

const { Text } = Typography;

function getActionIcon(action: HistoryEntry['action']) {
  switch (action) {
    case 'create':
      return <PlusOutlined style={{ color: '#52c41a' }} />;
    case 'update':
      return <EditOutlined style={{ color: '#1890ff' }} />;
    case 'delete':
      return <DeleteOutlined style={{ color: '#ff4d4f' }} />;
    case 'review':
      return <CheckCircleOutlined style={{ color: '#722ed1' }} />;
    default:
      return <HistoryOutlined />;
  }
}

function getActionColor(action: HistoryEntry['action']) {
  switch (action) {
    case 'create':
      return 'green';
    case 'update':
      return 'blue';
    case 'delete':
      return 'red';
    case 'review':
      return 'purple';
    default:
      return 'default';
  }
}

function getActionLabel(action: HistoryEntry['action']) {
  switch (action) {
    case 'create':
      return '创建';
    case 'update':
      return '修改';
    case 'delete':
      return '删除';
    case 'review':
      return '复核';
    default:
      return '操作';
  }
}

export default function AnnotationHistoryPanel() {
  const { selectedAnnotation, annotationHistory } = useApp();

  if (!selectedAnnotation) {
    return (
      <Card
        size="small"
        title={
          <Space>
            <HistoryOutlined />
            <span>修改历史</span>
          </Space>
        }
        style={{ height: '100%' }}
        styles={{ body: { padding: 0, height: 'calc(100% - 46px)', overflow: 'auto' } }}
      >
        <div style={{ padding: 20, textAlign: 'center', color: '#999' }}>
          请选择一个标注查看历史
        </div>
      </Card>
    );
  }

  return (
    <Card
      size="small"
      title={
        <Space>
          <HistoryOutlined />
          <span>修改历史</span>
          <Tag color="blue" style={{ margin: 0 }}>
            {annotationHistory.length} 条记录
          </Tag>
        </Space>
      }
      style={{ height: '100%' }}
      styles={{ body: { padding: 0, height: 'calc(100% - 46px)', overflow: 'auto' } }}
    >
      {annotationHistory.length === 0 ? (
        <div style={{ padding: 20, textAlign: 'center', color: '#999' }}>
          暂无历史记录
        </div>
      ) : (
        <Timeline
          style={{ padding: '16px 20px', margin: 0 }}
          items={annotationHistory.map((entry) => ({
            color: getActionColor(entry.action),
            dot: getActionIcon(entry.action),
            children: (
              <div style={{ marginBottom: 8 }}>
                <Space size="small" style={{ marginBottom: 4 }}>
                  <Tag color={getActionColor(entry.action)} style={{ margin: 0 }}>
                    {getActionLabel(entry.action)}
                  </Tag>
                  <Text strong style={{ fontSize: 13 }}>
                    {entry.description}
                  </Text>
                </Space>
                <div style={{ fontSize: 12, color: '#8c8c8c', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <span>
                    <UserOutlined style={{ marginRight: 4 }} />
                    {entry.userName}
                  </span>
                  <span>
                    <ClockCircleOutlined style={{ marginRight: 4 }} />
                    {new Date(entry.timestamp).toLocaleString('zh-CN')}
                  </span>
                </div>
                {entry.beforeData && entry.afterData && (
                  <div
                    style={{
                      marginTop: 8,
                      padding: '8px 12px',
                      background: '#fafafa',
                      borderRadius: 4,
                      fontSize: 12,
                    }}
                  >
                    {Object.entries(entry.afterData).map(([key, value]) => {
                      const beforeVal = (entry.beforeData as any)?.[key];
                      const displayKey = getFieldLabel(key);
                      if (!displayKey) return null;
                      return (
                        <div key={key} style={{ marginBottom: 4 }}>
                          <Text type="secondary">{displayKey}:</Text>{' '}
                          {beforeVal !== undefined && (
                            <Text delete type="danger" style={{ marginRight: 8 }}>
                              {String(beforeVal)}
                            </Text>
                          )}
                          <Text type="success">{String(value)}</Text>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ),
          }))}
        />
      )}
    </Card>
  );
}

function getFieldLabel(key: string): string | null {
  const labels: Record<string, string> = {
    defectType: '缺陷类型',
    severity: '严重程度',
    description: '描述',
    suggestion: '处理建议',
    reviewStatus: '复核状态',
    x: 'X坐标',
    y: 'Y坐标',
    width: '宽度',
    height: '高度',
    radius: '半径',
  };
  return labels[key] || null;
}
