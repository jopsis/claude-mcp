import { readdir, readFile } from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';
import { locales } from '@/i18n/config';

export interface DocMeta {
  slug: string;
  title: string;
  description: string;
  section: string;
  prev?: string;
  next?: string;
  lastModified?: string;
}

export interface DocContent extends DocMeta {
  content: string;
}

// 从文件系统读取所有文档
export async function getDocList(locale: string = 'en'): Promise<Record<string, DocMeta[]>> {
  try {
    // 确保语言代码有效，否则回退到英文
    if (!locale || typeof locale !== 'string' || !locales.includes(locale as any)) {
      console.log(`无效的语言代码 ${locale}，使用默认值 'en'`);
      locale = 'en';
    }

    const docsDir = path.join(process.cwd(), 'docs', locale);
    let files: string[] = [];
    
    try {
      files = await readdir(docsDir);
    } catch (readError) {
      console.error(`读取文档目录失败 ${docsDir}:`, readError);
      return {};
    }
    
    if (!files || !Array.isArray(files) || files.length === 0) {
      console.warn(`没有找到文档文件: ${docsDir}`);
      return {};
    }
    
    const docs: DocMeta[] = [];
    
    // 读取每个文档文件并解析frontmatter
    for (const file of files) {
      if (file.endsWith('.md')) {
        const slug = file.replace('.md', '');
        const filePath = path.join(docsDir, file);
        
        try {
          const content = await readFile(filePath, 'utf-8');
          const { data } = matter(content);
          
          // 确保所有必要的字段都有有效值
          const docMeta: DocMeta = {
            slug,
            title: data.title || slug,
            description: data.description || '',
            section: data.section || 'general',
          };
          
          // 添加可选字段
          if (data.lastModified) docMeta.lastModified = data.lastModified;
          if (data.prev) docMeta.prev = data.prev;
          if (data.next) docMeta.next = data.next;
          
          docs.push(docMeta);
        } catch (err) {
          console.error(`Error reading doc file ${file}:`, err);
        }
      }
    }
    
    // 确保docs是一个数组，防止reduce错误
    if (!Array.isArray(docs)) {
      console.error(`Docs is not an array for locale ${locale}:`, docs);
      return {};
    }
    
    if (docs.length === 0) {
      console.warn(`没有解析到有效的文档: ${locale}`);
      return {};
    }
    
    // 按章节分组
    let grouped: Record<string, DocMeta[]> = {};
    
    try {
      grouped = docs.reduce((acc, doc) => {
        const section = doc.section || 'general';
        if (!acc[section]) {
          acc[section] = [];
        }
        acc[section].push(doc);
        return acc;
      }, {} as Record<string, DocMeta[]>);
    } catch (reduceError) {
      console.error(`分组文档时出错:`, reduceError);
      
      // 出错时创建一个基本分组
      const section = 'general';
      grouped = { [section]: docs };
    }
    
    if (Object.keys(grouped).length === 0) {
      console.warn(`分组后没有文档: ${locale}`);
      return { general: [] };
    }
    
    return grouped;
  } catch (error) {
    console.error(`Failed to get doc list for locale ${locale}:`, error);
    return { general: [] };
  }
}
