import { Select, Space, Button, Tag } from 'antd';
import { SwapOutlined, ReloadOutlined } from '@ant-design/icons';
import { useApp } from '../store/AppContext';
import { PLATE_STATUS_LABELS } from '../types';

const { Option } = Select;

export default function VersionSelector() {
  const {
    currentPlateVersions,
    selectedBaseVersion,
    selectedCompareVersion,
    selectBaseVersion,
    selectCompareVersion,
    runComparison,
    comparisonViewMode,
    setComparisonViewMode,
  } = useApp();

  const handleSwap = () => {
    const baseId = selectedBaseVersion?.id;
    const compareId = selectedCompareVersion?.id;
    if (baseId && compareId) {
      selectBaseVersion(compareId);
      selectCompareVersion(baseId);
    }
  };

  return (
    <div
      style={{
        padding: '12px 16px',
        background: '#fff',
        borderBottom: '1px solid #f0f0f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
      }}
    >
      <Space size="middle" wrap>
        <Space size="small">
          <span style={{ color: '#8c8c8c', fontSize: 13 }}>基线版本:</span>
          <Select
            style={{ width: 200 }}
            size="small"
            value={selectedBaseVersion?.id}
            onChange={selectBaseVersion}
          >
            {currentPlateVersions.map((v) => (
              <Option key={v.id} value={v.id}>
                <Space size="small">
                  <span>V{v.versionNumber}</span>
                  <span style={{ color: '#262626' }}>{v.versionName}</span>
                  {v.isBaseline && <Tag color="blue" style={{ margin: 0, fontSize: 10 }}>基线</Tag>}
                </Space>
              </Option>
            ))}
          </Select>
        </Space>

        <Button
          type="text"
          icon={<SwapOutlined />}
          onClick={handleSwap}
          size="small"
          title="交换版本"
        />

        <Space size="small">
          <span style={{ color: '#8c8c8c', fontSize: 13 }}>对比版本:</span>
          <Select
            style={{ width: 200 }}
            size="small"
            value={selectedCompareVersion?.id}
            onChange={selectCompareVersion}
          >
            {currentPlateVersions.map((v) => (
              <Option key={v.id} value={v.id}>
                <Space size="small">
                  <span>V{v.versionNumber}</span>
                  <span style={{ color: '#262626' }}>{v.versionName}</span>
                  {v.isBaseline && <Tag color="blue" style={{ margin: 0, fontSize: 10 }}>基线</Tag>}
                </Space>
              </Option>
            ))}
          </Select>
        </Space>

        <Button
          type="primary"
          icon={<ReloadOutlined />}
          onClick={runComparison}
          size="small"
        >
          执行比对
        </Button>
      </Space>

      <Space size="small">
        <span style={{ color: '#8c8c8c', fontSize: 13 }}>视图模式:</span>
        <Button.Group size="small">
          <Button
            type={comparisonViewMode === 'split' ? 'primary' : 'default'}
            onClick={() => setComparisonViewMode('split')}
          >
            双栏
          </Button>
          <Button
            type={comparisonViewMode === 'overlay' ? 'primary' : 'default'}
            onClick={() => setComparisonViewMode('overlay')}
          >
            叠加
          </Button>
        </Button.Group>
      </Space>
    </div>
  );
}
