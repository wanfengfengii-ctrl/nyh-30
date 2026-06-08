import { useState } from 'react';
import { Tabs, List, Tag, Space, Button, Modal, Input, Form, Select, Avatar, message, Card } from 'antd';
import {
  ClockCircleOutlined,
  FileTextOutlined,
  PlusOutlined,
  UserOutlined,
  SaveOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { useApp } from '../store/AppContext';
import {
  FINAL_CONCLUSION_STATUS_LABELS,
  PLATE_STATUS_LABELS,
} from '../types';
import type { FinalConclusionStatus } from '../types';

const { TabPane } = Tabs;
const { TextArea } = Input;
const { Option } = Select;

export default function VersionHistoryPanel() {
  const {
    versionChangeHistory,
    plateFinalConclusions,
    selectedPlate,
    currentPlateVersions,
    currentUser,
    addFinalConclusion,
    updateFinalConclusion,
    archiveFinalConclusion,
  } = useApp();

  const [conclusionModalVisible, setConclusionModalVisible] = useState(false);
  const [editingConclusion, setEditingConclusion] = useState<any>(null);
  const [form] = Form.useForm();

  const plateHistory = versionChangeHistory.filter(
    (h) => h.plateId === selectedPlate?.id
  );

  const handleNewConclusion = () => {
    setEditingConclusion(null);
    form.resetFields();
    form.setFieldsValue({
      title: '',
      content: '',
      versionIds: [],
      status: 'draft',
    });
    setConclusionModalVisible(true);
  };

  const handleEditConclusion = (conclusion: any) => {
    setEditingConclusion(conclusion);
    form.setFieldsValue({
      title: conclusion.title,
      content: conclusion.content,
      versionIds: conclusion.versionIds,
      status: conclusion.status,
    });
    setConclusionModalVisible(true);
  };

  const handleSaveConclusion = async () => {
    try {
      const values = await form.validateFields();

      if (editingConclusion) {
        updateFinalConclusion(editingConclusion.id, values);
        message.success('结论已更新');
      } else {
        addFinalConclusion({
          ...values,
          plateId: selectedPlate?.id || '',
          createdBy: currentUser.id,
          createdByName: currentUser.name,
          reviewerIds: [],
          reviewerNames: [],
          approvedCount: 0,
          totalReviewers: 0,
        });
        message.success('结论已创建');
      }

      setConclusionModalVisible(false);
    } catch (error) {
      // 表单验证失败
    }
  };

  const handleArchive = (id: string) => {
    Modal.confirm({
      title: '确认归档',
      content: '归档后将无法修改，确认要归档此结论吗？',
      onOk: () => {
        archiveFinalConclusion(id);
        message.success('已归档');
      },
    });
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'create':
        return <PlusOutlined style={{ color: '#52c41a' }} />;
      case 'compare':
        return <FileTextOutlined style={{ color: '#1890ff' }} />;
      case 'approve':
        return <SaveOutlined style={{ color: '#faad14' }} />;
      case 'archive':
        return <CheckCircleOutlined style={{ color: '#8c8c8c' }} />;
      default:
        return <ClockCircleOutlined style={{ color: '#8c8c8c' }} />;
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'create':
        return '创建版本';
      case 'compare':
        return '版本比对';
      case 'approve':
        return '审定操作';
      case 'archive':
        return '归档';
      default:
        return action;
    }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Tabs defaultActiveKey="history" size="small" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <TabPane tab="变更历史" key="history" style={{ flex: 1, overflow: 'auto', padding: 0 }}>
          <div style={{ padding: '8px 12px' }}>
            <Button
              type="dashed"
              size="small"
              icon={<PlusOutlined />}
              onClick={handleNewConclusion}
              style={{ marginBottom: 8, width: '100%' }}
            >
              新建最终结论
            </Button>
          </div>
          <List
            size="small"
            dataSource={plateHistory}
            locale={{ emptyText: '暂无变更历史' }}
            renderItem={(item) => (
              <List.Item style={{ padding: '8px 12px' }}>
                <List.Item.Meta
                  avatar={
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        background: '#f5f5f5',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {getActionIcon(item.action)}
                    </div>
                  }
                  title={
                    <Space size="small">
                      <span style={{ fontSize: 12, fontWeight: 500 }}>
                        {getActionLabel(item.action)}
                      </span>
                      <Tag style={{ margin: 0, fontSize: 10 }} color="blue">
                        {item.userName}
                      </Tag>
                    </Space>
                  }
                  description={
                    <div style={{ fontSize: 11, color: '#8c8c8c' }}>
                      <div>{item.description}</div>
                      <div style={{ marginTop: 2 }}>
                        {new Date(item.timestamp).toLocaleString()}
                      </div>
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        </TabPane>

        <TabPane tab="最终结论" key="conclusions" style={{ flex: 1, overflow: 'auto', padding: 0 }}>
          <div style={{ padding: '8px 12px' }}>
            <Button
              type="dashed"
              size="small"
              icon={<PlusOutlined />}
              onClick={handleNewConclusion}
              style={{ marginBottom: 8, width: '100%' }}
            >
              新建最终结论
            </Button>
          </div>
          <List
            size="small"
            dataSource={plateFinalConclusions}
            locale={{ emptyText: '暂无最终结论' }}
            renderItem={(item) => (
              <List.Item
                style={{ padding: '8px 12px', cursor: 'pointer' }}
                onClick={() => handleEditConclusion(item)}
              >
                <List.Item.Meta
                  title={
                    <Space size="small">
                      <span style={{ fontSize: 12, fontWeight: 500 }}>{item.title}</span>
                      <Tag
                        color={item.status === 'archived' ? 'default' : item.status === 'submitted' ? 'green' : 'orange'}
                        style={{ margin: 0, fontSize: 10 }}
                      >
                        {FINAL_CONCLUSION_STATUS_LABELS[item.status]}
                      </Tag>
                    </Space>
                  }
                  description={
                    <div style={{ fontSize: 11, color: '#8c8c8c' }}>
                      <div style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                      }}>
                        {item.content}
                      </div>
                      <div style={{ marginTop: 4, display: 'flex', justifyContent: 'space-between' }}>
                        <span>创建人: {item.createdByName}</span>
                        <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                      </div>
                      {item.status !== 'archived' && (
                        <div style={{ marginTop: 4, textAlign: 'right' }}>
                          <Button
                            size="small"
                            type="link"
                            icon={<CheckCircleOutlined />}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleArchive(item.id);
                            }}
                            style={{ padding: 0, height: 'auto', fontSize: 11 }}
                          >
                            归档
                          </Button>
                        </div>
                      )}
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        </TabPane>
      </Tabs>

      <Modal
        title={editingConclusion ? '编辑最终结论' : '新建最终结论'}
        open={conclusionModalVisible}
        onOk={handleSaveConclusion}
        onCancel={() => setConclusionModalVisible(false)}
        okText="保存"
        width={520}
      >
        <Form form={form} layout="vertical" size="small">
          <Form.Item
            label="标题"
            name="title"
            rules={[{ required: true, message: '请输入标题' }]}
          >
            <Input placeholder="请输入结论标题" />
          </Form.Item>
          <Form.Item
            label="关联版本"
            name="versionIds"
            rules={[{ required: true, message: '请选择关联版本' }]}
          >
            <Select mode="multiple" placeholder="请选择关联版本">
              {currentPlateVersions.map((v) => (
                <Option key={v.id} value={v.id}>
                  V{v.versionNumber} - {v.versionName}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            label="状态"
            name="status"
            rules={[{ required: true, message: '请选择状态' }]}
          >
            <Select>
              <Option value="draft">草稿</Option>
              <Option value="submitted">已提交</Option>
            </Select>
          </Form.Item>
          <Form.Item
            label="结论内容"
            name="content"
            rules={[{ required: true, message: '请输入结论内容' }]}
          >
            <TextArea rows={8} placeholder="请输入详细的比对结论..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
