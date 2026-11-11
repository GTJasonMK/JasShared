const MARKDOWN_EXTENSION = /\.md$/i;
export function isMarkdownFileName(fileName: string): boolean { return MARKDOWN_EXTENSION.test(fileName); }
export function stripMarkdownExtension(fileName: string): string { return fileName.replace(MARKDOWN_EXTENSION, ""); }
