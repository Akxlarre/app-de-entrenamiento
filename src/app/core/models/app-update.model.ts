export interface AppUpdate {
  id: string;
  version: string;
  build_number: number;
  release_notes: string;
  force_update: boolean;
  apk_path: string;
  created_at: string;
}
