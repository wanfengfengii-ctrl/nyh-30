import { useState } from 'react';
import { Layout, Tabs } from 'antd';
import {
  DiffOutlined,
  CheckSquareOutlined,
  HistoryOutlined,
  LineChartOutlined,
} from '@ant-design/icons';
import VersionSelector from './VersionSelector';
import ComparisonCanvas from './ComparisonCanvas';
import DiffListPanel from './DiffListPanel';
import ApprovalPanel from './ApprovalPanel';
import VersionHistoryPanel from './VersionHistoryPanel';
import TrendAnalysisPanel from './TrendAnalysisPanel';

const { Content } = Layout;

export default function ComparisonModule() {
  const [activeTab, setActiveTab] = useState('diffs');
  const [rightTab, setRightTab] = useState('approval');

  const rightTabItems = [
    {
      key: 'approval',
      label: (
        <span>
          <CheckSquareOutlined />
          协同审定
        </span>
      ),
    },
    {
      key: 'history',
      label: (
        <span>
          <HistoryOutlined />
          版本历史
        </span>
      ),
    },
  ];

  return (
    <Layout style={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <VersionSelector />

      <Layout style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'row' }}>
        <Layout.Sider
          width={320}
          theme="light"
          style={{
            borderRight: '1px solid #f0f0f0',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            size="small"
            style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
            items={[
              {
                key: 'diffs',
                label: (
                  <span>
                    <DiffOutlined />
                    差异列表
                  </span>
                ),
                children: (
                  <div style={{ height: 'calc(100% - 40px)', overflow: 'hidden' }}>
                    <DiffListPanel />
                  </div>
                ),
              },
              {
                key: 'trend',
                label: (
                  <span>
                    <LineChartOutlined />
                    趋势分析
                  </span>
                ),
                children: (
                  <div style={{ height: 'calc(100% - 40px)', overflow: 'hidden' }}>
                    <TrendAnalysisPanel />
                  </div>
                ),
              },
            ]}
          />
        </Layout.Sider>

        <Layout.Content
          style={{
            background: '#fff',
            overflow: 'hidden',
            minWidth: 0,
            flex: 1,
            display: 'flex',
          }}
        >
          <ComparisonCanvas />
        </Layout.Content>

        <Layout.Sider
          width={300}
          theme="light"
          style={{
            borderLeft: '1px solid #f0f0f0',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Tabs
            activeKey={rightTab}
            onChange={setRightTab}
            size="small"
            style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
            items={rightTabItems}
          />
          <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
            {rightTab === 'approval' && <ApprovalPanel />}
            {rightTab === 'history' && <VersionHistoryPanel />}
          </div>
        </Layout.Sider>
      </Layout>
    </Layout>
  );
}
