export type GlobalSearchResultDto = {
  type: string;
  id: string | number;
  label: string;
  sublabel: string | null;
};

export type GlobalSearchResponseDto = {
  query: string;
  warehouse_id: number | null;
  results: GlobalSearchResultDto[];
};
