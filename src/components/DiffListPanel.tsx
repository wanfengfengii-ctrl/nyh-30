import { useState } from 'react';
import { List, Tag, Space, Button, Input, Select, Checkbox, Card, Statistic, Row, Col } from 'antd';
import {
  PlusOutlined,
  MinusOutlined,
  SwapOutlined,
  FormOutlined,
  CheckOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { useApp } from '../store/AppContext';
import {
  DIFF_TYPE_LABELS,
  DIFF_TYPE_COLORS,
  DEFECT_TYPE_LABELS,
  SEVERITY_LABELS,
  SEVERITY_COLORS,
  DEFECT_TYPE_COLORS,
} from '../types';
import type { DiffType, DefectType, Severity } from '../types';

const { Option } = Select;

export default function DiffListPanel() {
  const {
    filteredDiffItems,
    currentComparison,
    selectedDiffItem,
    selectDiffItem,
    showUnchanged,
    setShowUnchanged,
  } = useApp();

  const [searchText, setSearchText] = useState('');
  const [filterDiffTypes, setFilterDiffTypes] = useState<DiffType[]>([]);
  const [filterDefectTypes, setFilterDefectTypes] = useState<DefectType[]>([]);
  const [filterSeverities, setFilterSeverities] = useState<Severity[]>([]);

  const summary = currentComparison?.summary;

  const filteredItems = filteredDiffItems.filter((item) => {
    if (searchText) {
      const kw = searchText.toLowerCase();
      if (item.description?.toLowerCase().includes(kw)) return true;
      if (item.oldAnnotation?.description.toLowerCase().includes(kw)) return true;
      if (item.newAnnotation?.description.toLowerCase().includes(kw)) return true;
      return false;
    }
    if (filterDiffTypes.length > 0 && !filterDiffTypes.includes(item.diffType)) return false;
    if (filterDefectTypes.length > 0) {
      const itemType = item.newType || item.oldType;
      if (!itemType || !filterDefectTypes.includes(itemType)) return false;
    }
    if (filterSeverities.length > 0) {
      if (!item.severity || !filterSeverities.includes(item.severity)) return false;
    }
    return true;
  });

  const getDiffIcon = (diffType: DiffType) => {
    switch (diffType) {
      case 'added':
        return <PlusOutlined style={{ color: DIFF_TYPE_COLORS.added }} />;
      case 'removed':
        return <MinusOutlined style={{ color: DIFF_TYPE_COLORS.removed }} />;
      case 'moved':
        return <SwapOutlined style={{ color: DIFF_TYPE_COLORS.moved }} />;
      case 'type_changed':
        return <FormOutlined style={{ color: DIFF_TYPE_COLORS.type_changed }} />;
      default:
        return <CheckOutlined style={{ color: DIFF_TYPE_COLORS.unchanged }} />;
    }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {summary && (
        <div style={{ padding: 12, background: '#fafafa', borderBottom: '1px solid #f0f0f0' }}>
          <Row gutter={8}>
            <Col span={8}>
              <Statistic
                title="差异总数"
                value={summary.totalDiffCount}
                valueStyle={{ fontSize: 18 }}
              />
            </Col>
            <Col span={8}>
              <Statistic
                title="新增"
                value={summary.addedCount}
                valueStyle={{ color: DIFF_TYPE_COLORS.added, fontSize: 16 }}
                prefix={<PlusOutlined />}
              />
            </Col>
            <Col span={8}>
              <Statistic
                title="消失"
                value={summary.removedCount}
                valueStyle={{ color: DIFF_TYPE_COLORS.removed, fontSize: 16 }}
                prefix={<MinusOutlined />}
              />
            </Col>
          </Row>
          <Row gutter={8} style={{ marginTop: 8 }}>
            <Col span={8}>
              <Statistic
                title="位置偏移"
                value={summary.movedCount}
                valueStyle={{ color: DIFF_TYPE_COLORS.moved, fontSize: 14 }}
                prefix={<SwapOutlined />}
              />
            </Col>
            <Col span={8}>
              <Statistic
                title="类型变更"
                value={summary.typeChangedCount}
                valueStyle={{ color: DIFF_TYPE_COLORS.type_changed, fontSize: 14 }}
                prefix={<FormOutlined />}
              />
            </Col>
            <Col span={8}>
              <Statistic
                title="无变化"
                value={summary.unchangedCount}
                valueStyle={{ color: DIFF_TYPE_COLORS.unchanged, fontSize: 14 }}
                prefix={<CheckOutlined />}
              />
            </Col>
          </Row>
        </div>
      )}

      <div style={{ padding: 12, borderBottom: '1px solid #f0f0f0' }}>
        <Space direction="vertical" style={{ width: '100%' }} size="small">
          <Input
            placeholder="搜索缺陷描述..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            size="small"
            allowClear
          />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Select
              mode="multiple"
              placeholder="差异类型"
              size="small"
              style={{ minWidth: 120, flex: 1 }}
              value={filterDiffTypes}
              onChange={setFilterDiffTypes}
              allowClear
            >
              {(['added', 'removed', 'moved', 'type_changed', 'unchanged'] as DiffType[]).map(
                (type) => (
                  <Option key={type} value={type}>
                    {DIFF_TYPE_LABELS[type]}
                  </Option>
                )
              )}
            </Select>
            <Select
              mode="multiple"
              placeholder="缺陷类型"
              size="small"
              style={{ minWidth: 120, flex: 1 }}
              value={filterDefectTypes}
              onChange={setFilterDefectTypes}
              allowClear
            >
              {(['scratch', 'mold', 'bright_spot', 'scan_defect'] as DefectType[]).map((type) => (
                <Option key={type} value={type}>
                  {DEFECT_TYPE_LABELS[type]}
                </Option>
              ))}
            </Select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Checkbox checked={showUnchanged} onChange={(e) => setShowUnchanged(e.target.checked)}>
              显示无变化项
            </Checkbox>
            {filterDiffTypes.length > 0 || filterDefectTypes.length > 0 || searchText ? (
              <Button
                size="small"
                type="text"
                onClick={() => {
                  setFilterDiffTypes([]);
                  setFilterDefectTypes([]);
                  setFilterSeverities([]);
                  setSearchText('');
                }}
              >
                清除筛选
              </Button>
            ) : null}
          </div>
        </Space>
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        <List
          size="small"
          dataSource={filteredItems}
          locale={{ emptyText: '暂无差异数据' }}
          renderItem={(item) => {
            const defectType = item.newType || item.oldType;
            return (
              <List.Item
                onClick={() => selectDiffItem(item.id)}
                style={{
                  cursor: 'pointer',
                  background: selectedDiffItem?.id === item.id ? '#e6f7ff' : 'transparent',
                  padding: '8px 12px',
                }}
              >
                <List.Item.Meta
                  avatar={
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 6,
                        background: `${DIFF_TYPE_COLORS[item.diffType]}15`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {getDiffIcon(item.diffType)}
                    </div>
                  }
                  title={
                    <Space size="small">
                      <Tag color={DIFF_TYPE_COLORS[item.diffType]} style={{ margin: 0 }}>
                        {DIFF_TYPE_LABELS[item.diffType]}
                      </Tag>
                      {defectType && (
                        <Tag
                          color={DEFECT_TYPE_COLORS[defectType]}
                          style={{ margin: 0, fontSize: 11 }}
                        >
                          {DEFECT_TYPE_LABELS[defectType]}
                        </Tag>
                      )}
                      {item.severity && (
                        <Tag color={SEVERITY_COLORS[item.severity]} style={{ margin: 0, fontSize: 11 }}>
                          {SEVERITY_LABELS[item.severity]}
                        </Tag>
                      )}
                    </Space>
                  }
                  description={
                    <div style={{ fontSize: 12, color: '#595959' }}>
                      {item.description}
                      {item.positionOffset && (
                        <div style={{ marginTop: 2, color: '#8c8c8c' }}>
                          偏移距离: {item.positionOffset.distance.toFixed(1)}px
                        </div>
                      )}
                    </div>
                  }
                />
              </List.Item>
            );
          }}
        />
      </div>
    </div>
  );
}
