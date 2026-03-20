import { marked } from 'marked';

/**
 * ===================================
 * 格式化工具模块 (Node.js/TypeScript 版)
 * ===================================
 * 
 * 提供内容格式化工具函数，用于将 Markdown 转换为 HTML、纯文本以及智能分页。
 */

const TRUNCATION_SUFFIX = "\n\n...(本段内容过长已截断)";
const PAGE_MARKER_PREFIX = "\n\n📄";
const PAGE_MARKER_SAFE_BYTES = 16;
const MIN_MAX_BYTES = 40;

const _pageMarker = (i: number, total: number): string => {
  return `${PAGE_MARKER_PREFIX} ${i + 1}/${total}`;
};

/**
 * 将 Markdown 转换为完整的 HTML 文档
 */
export const markdownToHtmlDocument = (markdownText: string): string => {
  const htmlContent = marked(markdownText);

  const cssStyle = `
            body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
                line-height: 1.5;
                color: #24292e;
                font-size: 14px;
                padding: 15px;
                max-width: 900px;
                margin: 0 auto;
            }
            h1 {
                font-size: 20px;
                border-bottom: 1px solid #eaecef;
                padding-bottom: 0.3em;
                margin-top: 1.2em;
                margin-bottom: 0.8em;
                color: #0366d6;
            }
            h2 {
                font-size: 18px;
                border-bottom: 1px solid #eaecef;
                padding-bottom: 0.3em;
                margin-top: 1.0em;
                margin-bottom: 0.6em;
            }
            h3 {
                font-size: 16px;
                margin-top: 0.8em;
                margin-bottom: 0.4em;
            }
            p {
                margin-top: 0;
                margin-bottom: 8px;
            }
            table {
                border-collapse: collapse;
                width: 100%;
                margin: 12px 0;
                display: block;
                overflow-x: auto;
                font-size: 13px;
            }
            th, td {
                border: 1px solid #dfe2e5;
                padding: 6px 10px;
                text-align: left;
            }
            th {
                background-color: #f6f8fa;
                font-weight: 600;
            }
            tr:nth-child(2n) {
                background-color: #f8f8f8;
            }
            tr:hover {
                background-color: #f1f8ff;
            }
            blockquote {
                color: #6a737d;
                border-left: 0.25em solid #dfe2e5;
                padding: 0 1em;
                margin: 0 0 10px 0;
            }
            code {
                padding: 0.2em 0.4em;
                margin: 0;
                font-size: 85%;
                background-color: rgba(27,31,35,0.05);
                border-radius: 3px;
                font-family: SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace;
            }
            pre {
                padding: 12px;
                overflow: auto;
                line-height: 1.45;
                background-color: #f6f8fa;
                border-radius: 3px;
                margin-bottom: 10px;
            }
            hr {
                height: 0.25em;
                padding: 0;
                margin: 16px 0;
                background-color: #e1e4e8;
                border: 0;
            }
            ul, ol {
                padding-left: 20px;
                margin-bottom: 10px;
            }
            li {
                margin: 2px 0;
            }
        `;

  return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                ${cssStyle}
            </style>
        </head>
        <body>
            ${htmlContent}
        </body>
        </html>
        `;
};

/**
 * 将 Markdown 转换为纯文本 (清理 Markdown 标签)
 */
export const markdownToPlainText = (markdownText: string): string => {
  let text = markdownText;
  
  text = text.replace(/^#{1,6}\s+/gm, '');
  text = text.replace(/\*\*(.+?)\*\*/g, '$1');
  text = text.replace(/\*(.+?)\*/g, '$1');
  text = text.replace(/^>\s+/gm, '');
  text = text.replace(/^[-*]\s+/gm, '• ');
  text = text.replace(/^---+$|^- - -+$/gm, '────────');
  text = text.replace(/\|[-:]+\|[-:|\s]+\|/g, '');
  text = text.replace(/^\|(.+)\|\s*$/gm, '$1');
  text = text.replace(/\n{3,}/g, '\n\n');
  
  return text.trim();
};

const _getBytes = (s: string): number => Buffer.byteLength(s, 'utf8');

/**
 * 智能截断字符串到指定字节数
 */
export const sliceAtMaxBytes = (text: string, maxBytes: number): [string, string] => {
  const buf = Buffer.from(text, 'utf8');
  if (buf.length <= maxBytes) return [text, ""];

  let truncatedBuf = buf.subarray(0, maxBytes);
  // 检查最后一个字节是否是多字节字符的一部分，并向前退回
  while (truncatedBuf.length > 0 && (truncatedBuf[truncatedBuf.length - 1] & 0xC0) === 0x80) {
    truncatedBuf = truncatedBuf.subarray(0, truncatedBuf.length - 1);
  }
  // 还要检查最后一个字节是否是多字节字符的起始字节 (0xC0, 0xE0, 0xF0)
  if (truncatedBuf.length > 0 && (truncatedBuf[truncatedBuf.length - 1] & 0x80) !== 0) {
    truncatedBuf = truncatedBuf.subarray(0, truncatedBuf.length - 1);
  }

  const truncated = truncatedBuf.toString('utf8');
  return [truncated, text.slice(truncated.length)];
};

/**
 * 尝试根据分隔符对内容进行分割
 */
const _chunkBySeparators = (content: string): [string[], string] => {
  if (content.includes('\n---\n')) return [content.split('\n---\n'), '\n---\n'];
  if (content.includes('\n# ')) {
    const parts = content.split('\n## ');
    return [[parts[0], ...parts.slice(1).map(p => `## ${p}`)], '\n'];
  }
  if (content.includes('\n## ')) {
    const parts = content.split('\n## ');
    return [[parts[0], ...parts.slice(1).map(p => `## ${p}`)], '\n'];
  }
  if (content.includes('\n### ')) {
    const parts = content.split('\n### ');
    return [[parts[0], ...parts.slice(1).map(p => `### ${p}`)], '\n'];
  }
  if (content.includes('\n**')) {
    const parts = content.split('\n**');
    return [[parts[0], ...parts.slice(1).map(p => `**${p}`)], '\n'];
  }
  if (content.includes('\n')) return [content.split('\n'), '\n'];
  
  return [[content], ''];
};

/**
 * 按最大字节数强制分割
 */
const _chunkByMaxBytesForce = (content: string, maxBytes: number): string[] => {
  if (_getBytes(content) <= maxBytes) return [content];
  if (maxBytes < MIN_MAX_BYTES) throw new Error(`maxBytes=${maxBytes} too small`);

  const sections: string[] = [];
  let remaining = content;
  const suffix = TRUNCATION_SUFFIX;
  const suffixBytes = _getBytes(suffix);
  const effectiveMax = maxBytes - suffixBytes > 0 ? maxBytes - suffixBytes : maxBytes;

  while (remaining.length > 0) {
    const [chunk, nextRemaining] = sliceAtMaxBytes(remaining, effectiveMax);
    if (nextRemaining.trim() !== '') {
      sections.push(chunk + suffix);
    } else {
      sections.push(chunk);
      break;
    }
    remaining = nextRemaining;
  }
  return sections;
};

/**
 * 智能分页处理 (按字节数)
 */
export const chunkContentByMaxBytes = (content: string, maxBytes: number, addPageMarker: boolean = false): string[] => {
  const actualMax = addPageMarker ? maxBytes - PAGE_MARKER_SAFE_BYTES : maxBytes;

  const recursiveChunk = (text: string, limit: number): string[] => {
    if (_getBytes(text) <= limit) return [text];

    const [sections, separator] = _chunkBySeparators(text);
    if (separator === '' && sections.length === 1) {
      return _chunkByMaxBytesForce(text, limit);
    }

    const chunks: string[] = [];
    let currentChunk: string[] = [];
    let currentBytes = 0;
    const separatorBytes = _getBytes(separator);
    const effectiveLimit = limit - separatorBytes;

    for (let section of sections) {
      const sectionWithSep = section + separator;
      const sectionBytes = _getBytes(sectionWithSep);

      if (sectionBytes > effectiveLimit) {
        if (currentChunk.length > 0) {
          chunks.push(currentChunk.join(''));
          currentChunk = [];
          currentBytes = 0;
        }
        const forceChunks = recursiveChunk(section, effectiveLimit);
        forceChunks[forceChunks.length - 1] += separator;
        chunks.push(...forceChunks);
        continue;
      }

      if (currentBytes + sectionBytes > effectiveLimit) {
        if (currentChunk.length > 0) chunks.push(currentChunk.join(''));
        currentChunk = [sectionWithSep];
        currentBytes = sectionBytes;
      } else {
        currentChunk.push(sectionWithSep);
        currentBytes += sectionBytes;
      }
    }

    if (currentChunk.length > 0) chunks.push(currentChunk.join(''));

    // 移除最后一个块的末尾分隔符
    if (chunks.length > 0) {
      const last = chunks[chunks.length - 1];
      if (last.endsWith(separator)) {
        chunks[chunks.length - 1] = last.slice(0, -separator.length);
      }
    }

    return chunks;
  };

  const finalChunks = recursiveChunk(content, actualMax);
  if (addPageMarker) {
    return finalChunks.map((chunk, i) => chunk + _pageMarker(i, finalChunks.length));
  }
  return finalChunks;
};
