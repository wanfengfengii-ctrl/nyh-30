import { Card, Select, Input, Button, Space, Tag, Divider } from 'antd';
import {
  FilterOutlined,
  SearchOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useApp } from '../store/AppContext';
import {
  DEFECT_TYPE_LABELS,
  DEFECT_TYPE_COLORS,
  SEVERITY_LABELS,
  REVIEW_STATUS_LABELS,
  REVIEW_STATUS_COLORS,
} from '../types';
import type { DefectType, Severity, ReviewStatus } from '../types';

const { Search } = Input;

export default function FilterPanel() {
  const { state, setFilters, resetFilters, plateAnnotations, filteredAnnotations } = useApp();
  const { filters } = state;

  const handleDefectTypeChange = (values: DefectType[]) => {
    setFilters({ defectTypes: values });
  };

  const handleSeverityChange = (values: Severity[]) => {
    setFilters({ severities: values });
  };

  const handleReviewStatusChange = (values: ReviewStatus[]) => {
    setFilters({ reviewStatuses: values });
  };

  const handleKeywordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters({ keyword: e.target.value });
  };

  const hasActiveFilters =
    filters.defectTypes.length > 0 ||
    filters.severities.length > 0 ||
    filters.reviewStatuses.length > 0 ||
    filters.keyword !== '';

  const activeFilterCount =
    filters.defectTypes.length +
    filters.severities.length +
    filters.reviewStatuses.length +
    (filters.keyword ? 1 : 0);

  return (
    <Card
      size="small"
      title={
        <Space>
          <FilterOutlined />
          <span>筛选检索</span>
          {hasActiveFilters && (
            <Tag color="blue" style={{ margin: 0 }}>
              {activeFilterCount} 个条件
            </Tag>
          )}
        </Space>
      }
      extra={
        hasActiveFilters && (
          <Button
            type="link"
            size="small"
            icon={<ReloadOutlined />}
            onClick={resetFilters}
          >
            重置
          </Button>
        )
      }
    >
      <Space direction="vertical" size="small" style={{ width: '100%' }}>
        <Search
          placeholder="搜索描述、建议或标注人..."
          prefix={<SearchOutlined />}
          allowClear
          value={filters.keyword}
          onChange={handleKeywordChange}
          size="small"
        />

        <Divider style={{ margin: '8px 0' }} />

        <div>
          <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 4 }}>
            缺陷类型
          </div>
          <Select
            mode="multiple"
            size="small"
            style={{ width: '100%' }}
            placeholder="选择缺陷类型"
            value={filters.defectTypes}
            onChange={handleDefectTypeChange}
            options={Object.entries(DEFECT_TYPE_LABELS).map(([value, label]) => ({
              value: value as DefectType,
              label: (
                <Space size="small">
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
            maxTagCount="responsive"
          />
        </div>

        <div>
          <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 4 }}>
            严重程度
          </div>
          <Select
            mode="multiple"
            size="small"
            style={{ width: '100%' }}
            placeholder="选择严重程度"
            value={filters.severities}
            onChange={handleSeverityChange}
            options={Object.entries(SEVERITY_LABELS).map(([value, label]) => ({
              value: value as Severity,
              label,
            }))}
          />
        </div>

        <div>
          <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 4 }}>
            复核状态
          </div>
          <Select
            mode="multiple"
            size="small"
            style={{ width: '100%' }}
            placeholder="选择复核状态"
            value={filters.reviewStatuses}
            onChange={handleReviewStatusChange}
            options={Object.entries(REVIEW_STATUS_LABELS).map(([value, label]) => ({
              value: value as ReviewStatus,
              label: (
                <Tag color={REVIEW_STATUS_COLORS[value as ReviewStatus]} style={{ margin: 0 }}>
                  {label}
                </Tag>
              ),
            }))}
          />
        </div>

        {hasActiveFilters && (
          <div
            style={{
              padding: '8px 12px',
              background: '#f0f5ff',
              borderRadius: 4,
              fontSize: 12,
              color: '#1677ff',
            }}
          >
            显示 {filteredAnnotations.length} / {plateAnnotations.length} 条标注
          </div>
        )}
      </Space>
    </Card>
  );
}
