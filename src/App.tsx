import { useState } from 'react';
import { Layout, Tabs } from 'antd';
import { FileImageOutlined, BarChartOutlined } from '@ant-design/icons';
import { AppProvider } from './store/AppContext';
import PlateList from './components/PlateList';
import AnnotationCanvas from './components/AnnotationCanvas';
import AnnotationDetailPanel from './components/AnnotationDetailPanel';
import StatisticsPanel from './components/StatisticsPanel';
import type { DefectType } from './types';

const { Header, Sider, Content } = Layout;

function App() {
  const [activeTab, setActiveTab] = useState('detail');
  const [defaultDefectType, setDefaultDefectType] = useState<DefectType>('scratch');

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
      key: 'stats',
      label: (
        <span>
          <BarChartOutlined />
          统计分析
        </span>
      ),
      children: (
        <div style={{ height: 'calc(100vh - 100px)', overflow: 'hidden' }}>
          <StatisticsPanel />
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
          padding: '0 24px',
          height: 56,
          lineHeight: '56px',
          flexShrink: 0,
        }}
      >
        <FileImageOutlined style={{ fontSize: 20, marginRight: 12 }} />
        <h2 style={{ color: '#fff', margin: 0, fontSize: 18, fontWeight: 500 }}>
          天文底片标注系统
        </h2>
        <span style={{ marginLeft: 12, color: '#8c8c8c', fontSize: 12 }}>
          老星图底片缺陷标注与整理工具
        </span>
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
          width={320}
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
