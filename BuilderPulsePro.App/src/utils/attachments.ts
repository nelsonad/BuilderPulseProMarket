const allowedAttachmentExtensions = [
  'jpg',
  'jpeg',
  'png',
  'gif',
  'webp',
  'bmp',
  'pdf',
  'docx',
  'xlsx',
  'pptx',
  'txt',
  'rtf',
  'csv',
  'odt',
  'ods',
  'odp',
];

const previewableAttachmentExtensions = [
  'jpg',
  'jpeg',
  'png',
  'gif',
  'webp',
  'bmp',
  'pdf',
];

const allowedAttachmentExtensionsSet = new Set(allowedAttachmentExtensions);
const previewableAttachmentExtensionsSet = new Set(
  previewableAttachmentExtensions,
);

const getExtension = (fileName: string) =>
  fileName.split('.').pop()?.toLowerCase() ?? '';

export const allowedAttachmentExtensionsDisplay = allowedAttachmentExtensions
  .map(ext => `.${ext}`)
  .join(', ');

export const isAllowedAttachmentFileName = (fileName: string) =>
  allowedAttachmentExtensionsSet.has(getExtension(fileName));

export const isPreviewableAttachmentFileName = (fileName: string) =>
  previewableAttachmentExtensionsSet.has(getExtension(fileName));
