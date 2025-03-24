import { readdir, readFile, stat } from 'fs/promises';
import path from 'path';
import type { MCPServer } from '@/types/server';
import matter from 'gray-matter';
import { locales } from '@/i18n/config';

/**
 * 从本地文件系统加载服务器数据
 * @param locale 语言
 * @param limit 限制返回的服务器数量
 * @param filterFn 可选的过滤函数
 * @returns Promise<{servers: MCPServer[], tags: string[]}>
 */
export async function loadServersData(
  locale: string, 
  limit?: number,
  filterFn?: (server: MCPServer) => boolean
) {
  try {
    // 检查locale是否有效
    if (!locales.includes(locale as any)) {
      console.warn(`Invalid locale: ${locale}, falling back to 'en'`);
      locale = 'en'; // 使用默认语言
    }
    
    // 从服务器目录中读取所有服务器文件
    const serversDir = path.join(process.cwd(), 'servers', locale);
    
    try {
      const dirStat = await stat(serversDir);
      if (!dirStat.isDirectory()) {
        throw new Error(`Not a directory: ${serversDir}`);
      }
    } catch (err) {
      console.error(`Directory does not exist: ${serversDir}`, err);
      return {
        servers: [],
        tags: []
      };
    }
    
    const files = await readdir(serversDir);
    
    // 读取每个服务器的元数据
    const servers: MCPServer[] = [];
    const allTags = new Set<string>();
    
    for (const file of files) {
      if (file.endsWith('.md')) {
        const filePath = path.join(serversDir, file);
        const content = await readFile(filePath, 'utf-8');
        
        // 使用gray-matter解析Markdown front matter
        const { data, content: description } = matter(content);
        
        // 从文件名获取ID (去掉 .md 后缀)
        const id = file.replace(/\.md$/, '');
        
        // 处理标签数据
        const tags = Array.isArray(data.tags) ? data.tags : [];
        tags.forEach(tag => allTags.add(tag));
        
        const server: MCPServer = {
          id,
          name: data.name || id,
          digest: data.digest || '',
          description: description.trim(),
          author: data.author || '',
          icon: data.icon,
          homepage: data.homepage,
          repository: data.repository,
          createTime: data.createTime || new Date().toISOString(),
          capabilities: {
            resources: data.resources === true,
            tools: data.tools === true,
            prompts: data.prompts === true,
          },
          tags: tags,
        };
        
        // 应用过滤函数
        if (!filterFn || filterFn(server)) {
          servers.push(server);
        }
      }
    }
    
    // 排序服务器 (按创建时间降序)
    servers.sort((a, b) => {
      const dateA = new Date(a.createTime).getTime();
      const dateB = new Date(b.createTime).getTime();
      return dateB - dateA;
    });
    
    // 限制返回的服务器数量
    const limitedServers = limit ? servers.slice(0, limit) : servers;
    
    return {
      servers: limitedServers,
      tags: Array.from(allTags).sort()
    };
  } catch (error) {
    console.error(`Failed to load servers for ${locale}:`, error);
    return {
      servers: [],
      tags: []
    };
  }
}

/**
 * 加载单个服务器详情
 * @param locale 语言
 * @param id 服务器ID
 * @returns Promise<MCPServer | null>
 */
export async function loadServerDetail(locale: string, id: string): Promise<MCPServer | null> {
  try {
    // 检查locale是否有效
    if (!locales.includes(locale as any)) {
      console.warn(`Invalid locale: ${locale}, falling back to 'en'`);
      locale = 'en'; // 使用默认语言
    }
    
    // 服务器文件路径
    const filePath = path.join(process.cwd(), 'servers', locale, `${id}.md`);
    
    try {
      const content = await readFile(filePath, 'utf-8');
      
      // 使用gray-matter解析Markdown front matter
      const { data, content: description } = matter(content);
      
      // 处理标签数据
      const tags = Array.isArray(data.tags) ? data.tags : [];
      
      return {
        id,
        name: data.name || id,
        digest: data.digest || '',
        description: description.trim(),
        author: data.author || '',
        icon: data.icon,
        homepage: data.homepage,
        repository: data.repository,
        createTime: data.createTime || new Date().toISOString(),
        capabilities: {
          resources: data.resources === true,
          tools: data.tools === true,
          prompts: data.prompts === true,
        },
        tags: tags,
      };
    } catch (err) {
      console.error(`Failed to read server file: ${filePath}`, err);
      return null;
    }
  } catch (error) {
    console.error(`Failed to load server detail for ${locale}/${id}:`, error);
    return null;
  }
} 