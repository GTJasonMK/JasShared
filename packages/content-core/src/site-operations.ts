import type { SiteConfig } from "./site";
import type { Photo } from "./photography";
import type { Publication } from "./publication";

export interface SiteWorkspaceData { site: SiteConfig; photos: Photo[]; pages: Array<{ slug: string; title: string; publication: Publication }>; documents: Record<string, Publication>; siteVersion: string; photoVersion: string }
export interface PublishState { root: string; phase: string; message: string; sourceSha?: string; deploySha?: string; sourceRun?: number; pagesRun?: number; url?: string; updatedAt: number; pendingCommit?: { parentSha: string; paths: string[]; message: string; blobs: Record<string, string | null> } }
export interface PublishInspection { repo: string; branch: string; changes: string[]; blockers: string[] }
export type SiteToolCommand = "load_workspace" | "save_site" | "save_photos" | "import_image" | "import_photo" | "inspect_publication" | "publication_state" | "publish" | "check_document_delete";
