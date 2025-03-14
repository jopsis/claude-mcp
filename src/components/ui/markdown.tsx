'use client';

import { useEffect, useState, useRef } from 'react';
import ReactDOMServer from 'react-dom/server';
import { createRoot } from 'react-dom/client';
import { CodeBlock } from './code-block';
import { Mermaid } from './mermaid';

interface MarkdownProps {
  content?: string;  
}

// 添加一个通用的 HTML 实体解码函数
function decodeHtmlEntities(text: string): string {
  return text
    // 首先处理 &#x3C; 编码（小于号的另一种编码形式）
    .replace(/&#x3C;/g, '<')
    .replace(/&lt;|&#x3c;/g, '<')
    .replace(/&gt;|&#x3e;/g, '>')
    .replace(/&amp;|&#x26;/g, '&')
    .replace(/&quot;|&#x22;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&#x2f;/g, '/')
    .replace(/&#x60;/g, '`')
    .replace(/&#x3d;/g, '=')
    .replace(/&#x5b;/g, '[')
    .replace(/&#x5d;/g, ']')
    .replace(/&#x7b;/g, '{')
    .replace(/&#x7d;/g, '}')
    .replace(/&#x28;/g, '(')
    .replace(/&#x29;/g, ')')
    .replace(/&#xa;/g, '\n');
}

export function Markdown({ content = '' }: MarkdownProps) {  
  const [processedContent, setProcessedContent] = useState(content);
  const [mermaidCharts, setMermaidCharts] = useState<Array<{id: string, code: string}>>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 处理代码块
    const processCodeBlocks = (rawContent: string) => {
      if (!rawContent) return '';  

      // 首先对整个内容进行 HTML 实体解码
      let decodedContent = decodeHtmlEntities(rawContent);

      const mermaidDiagrams: Array<{id: string, code: string}> = [];
      
      // 处理 Mermaid 代码块，包括处理更多的 HTML 实体编码
      const processedWithMermaid = decodedContent.replace(
        /<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g,
        (_, code) => {
          // 首先进行通用的 HTML 实体解码
          let decodedCode = decodeHtmlEntities(code);
          
          // 处理 Mermaid 特有的箭头符号，这些可能在通用解码后仍需特殊处理
          decodedCode = decodedCode
            .replace(/<-->/g, '<-->')
            .replace(/<==>/g, '<==>')
            .replace(/<\.->/g, '<.->')
            .replace(/<=\.->/, '<=.->')
            .replace(/<\.->/, '<.->')
            .replace(/<->/g, '<->');
          
          console.log("decodedCode=", decodedCode);
          
          const chartId = `mermaid-${Math.random().toString(36).substring(7)}`;
          mermaidDiagrams.push({ id: chartId, code: decodedCode.trim() });
          return `<div class="mermaid-placeholder" data-chart-id="${chartId}"></div>`;
        }
      );
      
      // 处理其他代码块
      const processedContent = processedWithMermaid.replace(
        /<pre><code class="language-(\w+)">([\s\S]*?)<\/code><\/pre>/g,
        (_, language, code) => {
          // 使用通用解码函数
          const decodedCode = decodeHtmlEntities(code);
          
          return `<div class="not-prose my-6"><div class="code-block-wrapper">${
            ReactDOMServer.renderToString(
              <CodeBlock
                code={decodedCode.trim()}
                language={language}
                className="rounded-lg border bg-muted"
              />
            )
          }</div></div>`;
        }
      );

      setMermaidCharts(mermaidDiagrams);
      return processedContent;
    };

    setProcessedContent(processCodeBlocks(content));
  }, [content]);

  // 在内容渲染后处理 Mermaid 图表
  useEffect(() => {
    if (containerRef.current && mermaidCharts.length > 0) {
      mermaidCharts.forEach(chart => {
        const placeholder = containerRef.current?.querySelector(`[data-chart-id="${chart.id}"]`);
        if (placeholder) {
          const wrapper = document.createElement('div');
          wrapper.className = 'not-prose my-6';
          placeholder.parentNode?.insertBefore(wrapper, placeholder);
          wrapper.appendChild(placeholder);
          
          const mermaidComponent = <Mermaid
            key={chart.id}
            chart={chart.code}
            mermaidKey={chart.id}
            className="rounded-lg bg-muted"
          />;
          
          const root = createRoot(placeholder as HTMLElement);
          root.render(mermaidComponent);
        }
      });
    }
    
    // 清理函数
    return () => {
      if (containerRef.current) {
        mermaidCharts.forEach(chart => {
          const placeholder = containerRef.current?.querySelector(`[data-chart-id="${chart.id}"]`);
          if (placeholder) {
            const root = createRoot(placeholder as HTMLElement);
            root.unmount();
          }
        });
      }
    };
  }, [mermaidCharts]);

  if (!processedContent) {
    return null;  
  }

  return (
    <div 
      ref={containerRef}
      className="prose prose-blue dark:prose-invert max-w-none"
      dangerouslySetInnerHTML={{ __html: processedContent }}
    />
  );
}
