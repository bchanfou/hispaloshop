export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

export interface ApiError {
  detail: string;
  status_code?: number;
}

export type SortOrder = 'asc' | 'desc';
