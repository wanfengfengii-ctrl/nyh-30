import type { Plate, Annotation } from '../types';
import { v4 as uuidv4 } from 'uuid';

const MOCK_PLATES: Plate[] = [
  {
    id: uuidv4(),
    code: 'AP-001',
    name: '猎户座天区底片',
    scanDate: '2024-03-15',
    imageUrl: 'https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?w=1200&q=80',
    status: 'active',
    description: '1978年拍摄的猎户座天区玻璃底片',
    createdAt: '2024-03-15T10:00:00Z',
    updatedAt: '2024-03-15T10:00:00Z',
  },
  {
    id: uuidv4(),
    code: 'AP-002',
    name: '仙女座大星云底片',
    scanDate: '2024-02-20',
    imageUrl: 'https://images.unsplash.com/photo-1506443432602-ac2fcd6f54e0?w=1200&q=80',
    status: 'active',
    description: '1985年拍摄的仙女座大星云底片',
    createdAt: '2024-02-20T10:00:00Z',
    updatedAt: '2024-02-20T10:00:00Z',
  },
  {
    id: uuidv4(),
    code: 'AP-003',
    name: '银河中心区域底片',
    scanDate: '2024-01-10',
    imageUrl: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1200&q=80',
    status: 'archived',
    description: '1990年拍摄的银河系中心区域底片',
    createdAt: '2024-01-10T10:00:00Z',
    updatedAt: '2024-01-10T10:00:00Z',
  },
];

const MOCK_ANNOTATIONS: Annotation[] = [];

export const initialState: State = {
  plates: MOCK_PLATES,
  annotations: MOCK_ANNOTATIONS,
  selectedPlateId: MOCK_PLATES[0]?.id || null,
  selectedAnnotationId: null,
};

export interface State {
  plates: Plate[];
  annotations: Annotation[];
  selectedPlateId: string | null;
  selectedAnnotationId: string | null;
}
