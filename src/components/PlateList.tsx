import { useState } from 'react';
import { List, Button, Modal, Form, Input, DatePicker, Tag, Space, Popconfirm, message, Tooltip } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, FileImageOutlined, InboxOutlined, FolderOpenOutlined } from '@ant-design/icons';
import { useApp } from '../store/AppContext';
import type { Plate } from '../types';
import { PLATE_STATUS_LABELS } from '../types';
import dayjs from 'dayjs';

export default function PlateList() {
  const { state, dispatch, plateAnnotations } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlate, setEditingPlate] = useState<Plate | null>(null);
  const [form] = Form.useForm();

  const openAdd = () => {
    setEditingPlate(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const openEdit = (plate: Plate) => {
    setEditingPlate(plate);
    form.setFieldsValue({
      code: plate.code,
      name: plate.name,
      scanDate: dayjs(plate.scanDate),
      imageUrl: plate.imageUrl,
      description: plate.description,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = () => {
    form.validateFields().then((values) => {
      const scanDateStr = values.scanDate.format('YYYY-MM-DD');
      const today = dayjs();
      if (values.scanDate.isAfter(today)) {
        message.error('扫描日期不能晚于当前日期');
        return;
      }

      const codeExists = state.plates.some(
        (p) => p.code === values.code && p.id !== editingPlate?.id
      );
      if (codeExists) {
        message.error('底片编号不能重复');
        return;
      }

      if (editingPlate) {
        dispatch({
          type: 'UPDATE_PLATE',
          payload: {
            id: editingPlate.id,
            data: {
              code: values.code,
              name: values.name,
              scanDate: scanDateStr,
              imageUrl: values.imageUrl,
              description: values.description,
            },
          },
        });
        message.success('底片信息已更新');
      } else {
        dispatch({
          type: 'ADD_PLATE',
          payload: {
            code: values.code,
            name: values.name,
            scanDate: scanDateStr,
            imageUrl: values.imageUrl,
            description: values.description,
          },
        });
        message.success('底片已添加');
      }
      setIsModalOpen(false);
    });
  };

  const handleDelete = (plate: Plate) => {
    const annCount = state.annotations.filter((a) => a.plateId === plate.id).length;
    Modal.confirm({
      title: '确认删除底片？',
      content: (
        <div>
          <p>确定要删除底片 <strong>{plate.code} - {plate.name}</strong> 吗？</p>
          <p style={{ color: '#ff4d4f' }}>
            ⚠️ 此操作将同时删除该底片下的 {annCount} 条标注记录，且不可恢复。
          </p>
        </div>
      ),
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => {
        dispatch({ type: 'DELETE_PLATE', payload: plate.id });
        message.success('底片已删除');
      },
    });
  };

  const handleSelectPlate = (plateId: string) => {
    dispatch({ type: 'SELECT_PLATE', payload: plateId });
  };

  const getAnnotationCount = (plateId: string) => {
    return state.annotations.filter((a) => a.plateId === plateId).length;
  };

  const hasPendingAnnotations = (plateId: string) => {
    return state.annotations.some((a) => a.plateId === plateId && a.reviewStatus === 'pending');
  };

  const toggleArchive = (plate: Plate) => {
    if (plate.status === 'active') {
      if (hasPendingAnnotations(plate.id)) {
        message.error('存在未复核的标注，无法归档');
        return;
      }
      dispatch({ type: 'UPDATE_PLATE', payload: { id: plate.id, data: { status: 'archived' } } });
      message.success('底片已归档');
    } else {
      dispatch({ type: 'UPDATE_PLATE', payload: { id: plate.id, data: { status: 'active' } } });
      message.success('底片已取消归档');
    }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: 12, borderBottom: '1px solid #f0f0f0' }}>
        <Button type="primary" icon={<PlusOutlined />} block onClick={openAdd}>
          新增底片
        </Button>
      </div>

      <List
        style={{ flex: 1, overflow: 'auto' }}
        dataSource={state.plates}
        renderItem={(plate) => (
          <List.Item
          key={plate.id}
          style={{
            cursor: 'pointer',
            padding: '12px 16px',
            background: state.selectedPlateId === plate.id ? '#e6f4ff' : undefined,
            borderLeft: state.selectedPlateId === plate.id ? '3px solid #1677ff' : '3px solid transparent',
          }}
          onClick={() => handleSelectPlate(plate.id)}
          actions={[
            <Tooltip title={plate.status === 'archived' ? '取消归档' : '归档'}>
              {plate.status === 'archived' ? (
                <FolderOpenOutlined
                style={{ color: '#8c8c8c' }}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleArchive(plate);
                }}
                />
              ) : (
                <InboxOutlined
                style={{ color: '#52c41a' }}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleArchive(plate);
                }}
                />
              )}
            </Tooltip>,
            <Tooltip title="编辑">
              <EditOutlined
              style={{ color: '#1890ff' }}
              onClick={(e) => {
                e.stopPropagation();
                openEdit(plate);
              }}
              />
            </Tooltip>,
            <Popconfirm
            title="删除底片"
            description="删除将同时删除所有标注，确定吗？"
            onConfirm={(e) => {
              e?.stopPropagation();
              handleDelete(plate);
            }}
            onCancel={(e) => e?.stopPropagation()}
            okText="删除"
            okType="danger"
            >
              <DeleteOutlined
              style={{ color: '#ff4d4f' }}
              onClick={(e) => e.stopPropagation()}
              />
            </Popconfirm>,
          ]}
          >
            <List.Item.Meta
            avatar={<FileImageOutlined style={{ fontSize: 24, color: '#8c8c8c' }} />}
            title={
              <Space>
                <span style={{ fontWeight: 500 }}>{plate.code}</span>
                <Tag color={plate.status === 'archived' ? 'default' : 'blue'}>
                  {PLATE_STATUS_LABELS[plate.status]}
                </Tag>
              </Space>
            }
            description={
              <div>
                <div style={{ fontSize: 12, color: '#595959', marginBottom: 4 }}>{plate.name}</div>
                <div style={{ fontSize: 12, color: '#8c8c8c' }}>
                  标注: {getAnnotationCount(plate.id)} 条
                  {hasPendingAnnotations(plate.id) && (
                    <Tag color="orange" style={{ marginLeft: 8 }}>待复核</Tag>
                  )}
                </div>
              </div>
            }
            />
          </List.Item>
        )}
        />

      <Modal
      title={editingPlate ? '编辑底片' : '新增底片'}
      open={isModalOpen}
      onOk={handleSubmit}
      onCancel={() => setIsModalOpen(false)}
      okText="保存"
      cancelText="取消"
      width={480}
      >
        <Form form={form} layout="vertical">
          <Form.Item
          name="code"
          label="底片编号"
          rules={[{ required: true, message: '请输入底片编号' }]}
          >
            <Input placeholder="如：AP-001" />
          </Form.Item>
          <Form.Item
          name="name"
          label="底片名称"
          rules={[{ required: true, message: '请输入底片名称' }]}
          >
            <Input placeholder="如：猎户座天区底片" />
          </Form.Item>
          <Form.Item
          name="scanDate"
          label="扫描日期"
          rules={[{ required: true, message: '请选择扫描日期' }]}
          >
            <DatePicker style={{ width: '100%' }} disabledDate={(current) => current && current > dayjs().endOf('day')} />
          </Form.Item>
          <Form.Item
          name="imageUrl"
          label="图像链接"
          rules={[{ required: true, message: '请输入图像链接' }]}
          >
            <Input placeholder="https://..." />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} placeholder="底片描述信息" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
