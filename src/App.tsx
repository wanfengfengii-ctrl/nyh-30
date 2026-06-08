import { useState } from 'react';
import { Layout, Tabs, Avatar, Dropdown, Space, Tag } from 'antd';
import {
  FileImageOutlined,
  BarChartOutlined,
  UserOutlined,
  UndoOutlined,
  RedoOutlined,
  RobotOutlined,
  ExperimentOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';
import { AppProvider, useApp } from './store/AppContext';
import PlateList from './components/PlateList';
import AnnotationCanvas from './components/AnnotationCanvas';
import AnnotationDetailPanel from './components/AnnotationDetailPanel';
import StatisticsPanel from './components/StatisticsPanel';
import AutoDetectionPanel from './components/AutoDetectionPanel';
import DetectionStatisticsPanel from './components/DetectionStatisticsPanel';
import BatchProcessingPanel from './components/BatchProcessingPanel';
import type { DefectType, User } from './types';
import { USER_ROLE_LABELS } from './types';

const { Header, Sider, Content } = Layout;

function App() {
  const [activeTab, setActiveTab] = useState('detail');
  const [defaultDefectType, setDefaultDefectType] = useState<DefectType>('scratch');
  const { currentUser, allUsers, setCurrentUser, canUndo, canRedo, undo, redo } = useApp();

  const handleUserChange = (user: User) => {
    setCurrentUser(user);
  };

  const userMenuItems = allUsers.map((user) => ({
    key: user.id,
    label: (
      <Space size="small">
        <Avatar size="small" icon={<UserOutlined />} style={{ backgroundColor: '#1890ff' }}>
          {user.name.charAt(0)}
        </Avatar>
        <span>{user.name}</span>
        <Tag color="blue" style={{ margin: 0, fontSize: 10 }}>
          {USER_ROLE_LABELS[user.role]}
        </Tag>
      </Space>
    ),
    onClick: () => handleUserChange(user),
  }));

  const tabItems = [
    {
      key: 'detail',
      label: (
        <span>
          <FileImageOutlined />
          缺陷详情
        </span>
      ),
      children: (
        <div style={{ height: 'calc(100vh - 100px)', overflow: 'hidden' }}>
          <AnnotationDetailPanel />
        </div>
      ),
    },
    {
      key: 'detection',
      label: (
        <span>
          <RobotOutlined />
          AI检测
        </span>
      ),
      children: (
        <div style={{ height: 'calc(100vh - 100px)', overflow: 'hidden' }}>
          <AutoDetectionPanel />
        </div>
      ),
    },
    {
      key: 'batch',
      label: (
        <span>
          <AppstoreOutlined />
          批量处理
        </span>
      ),
      children: (
        <div style={{ height: 'calc(100vh - 100px)', overflow: 'hidden' }}>
          <BatchProcessingPanel />
        </div>
      ),
    },
    {
      key: 'stats',
      label: (
        <span>
          <BarChartOutlined />
          统计分析
        </span>
      ),
      children: (
        <div style={{ height: 'calc(100vh - 100px)', overflow: 'hidden' }}>
          <DetectionStatisticsPanel />
        </div>
      ),
    },
  ];

  return (
    <Layout style={{ height: '100vh', overflow: 'hidden', minWidth: 1200 }}>
      <Header
        style={{
          background: '#001529',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          height: 56,
          lineHeight: '56px',
          flexShrink: 0,
        }}
      >
        <Space>
          <FileImageOutlined style={{ fontSize: 20 }} />
          <h2 style={{ color: '#fff', margin: 0, fontSize: 18, fontWeight: 500 }}>
            星图底片智能缺陷检测系统
          </h2>
          <span style={{ marginLeft: 12, color: '#8c8c8c', fontSize: 12 }}>
            AI自动检测 · 人工校正 · 复核追踪
          </span>
        </Space>

        <Space size="middle">
          <Space size="small">
            <button
              onClick={undo}
              disabled={!canUndo}
              style={{
                background: 'transparent',
                border: 'none',
                color: canUndo ? '#fff' : '#8c8c8c',
                cursor: canUndo ? 'pointer' : 'not-allowed',
                fontSize: 16,
                padding: '4px 8px',
                borderRadius: 4,
              }}
              title="撤销 (Ctrl+Z)"
            >
              <UndoOutlined />
            </button>
            <button
              onClick={redo}
              disabled={!canRedo}
              style={{
                background: 'transparent',
                border: 'none',
                color: canRedo ? '#fff' : '#8c8c8c',
                cursor: canRedo ? 'pointer' : 'not-allowed',
                fontSize: 16,
                padding: '4px 8px',
                borderRadius: 4,
              }}
              title="恢复 (Ctrl+Y)"
            >
              <RedoOutlined />
            </button>
          </Space>

          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <Space style={{ cursor: 'pointer', color: '#fff' }}>
              <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#1890ff' }}>
                {currentUser.name.charAt(0)}
              </Avatar>
              <span style={{ fontSize: 14 }}>{currentUser.name}</span>
              <Tag color="blue" style={{ margin: 0, fontSize: 10 }}>
                {USER_ROLE_LABELS[currentUser.role]}
              </Tag>
            </Space>
          </Dropdown>
        </Space>
      </Header>

      <Layout style={{ height: 'calc(100vh - 56px)', minHeight: 0 }}>
        <Sider
          width={280}
          theme="light"
          style={{ borderRight: '1px solid #f0f0f0', flexShrink: 0 }}
        >
          <PlateList />
        </Sider>

        <Content
          style={{
            background: '#f5f5f5',
            overflow: 'hidden',
            minWidth: 0,
            flex: 1,
            display: 'flex',
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <AnnotationCanvas
              defaultDefectType={defaultDefectType}
              onDefectTypeChange={setDefaultDefectType}
            />
          </div>
        </Content>

        <Sider
          width={340}
          theme="light"
          style={{ borderLeft: '1px solid #f0f0f0', flexShrink: 0 }}
        >
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={tabItems as any}
            size="small"
            style={{ height: '100%' }}
          />
        </Sider>
      </Layout>
    </Layout>
  );
}

export default function WrappedApp() {
  return (
    <AppProvider>
      <App />
    </AppProvider>
  );
}
