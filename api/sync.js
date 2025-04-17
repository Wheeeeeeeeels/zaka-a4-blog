const { Client } = require('@notionhq/client');
const fs = require('fs');
const path = require('path');

// 初始化 Notion 客户端
const notion = new Client({
  auth: process.env.NOTION_TOKEN,
});

async function syncNotionToHexo() {
  try {
    console.log('开始同步...');
    
    // 获取数据库中的所有页面
    const response = await notion.databases.query({
      database_id: process.env.NOTION_DATABASE_ID,
    });

    // 处理每个页面
    const posts = await Promise.all(response.results.map(async (page) => {
      const pageId = page.id;
      const pageInfo = await notion.pages.retrieve({ page_id: pageId });
      const title = pageInfo.properties['文档名称']?.title[0]?.plain_text || 'Untitled';
      const date = new Date(pageInfo.created_time).toISOString().split('T')[0];
      
      // 获取页面内容
      const blocks = await notion.blocks.children.list({
        block_id: pageId,
      });

      // 生成 Markdown 内容
      let content = `---
title: "${title}"
date: ${date}
---\n\n`;

      // 处理块内容
      for (const block of blocks.results) {
        if (block.type === 'paragraph') {
          const text = block.paragraph.rich_text.map(t => t.plain_text).join('');
          content += text + '\n\n';
        } else if (block.type === 'heading_1') {
          const text = block.heading_1.rich_text.map(t => t.plain_text).join('');
          content += `# ${text}\n\n`;
        } else if (block.type === 'heading_2') {
          const text = block.heading_2.rich_text.map(t => t.plain_text).join('');
          content += `## ${text}\n\n`;
        } else if (block.type === 'heading_3') {
          const text = block.heading_3.rich_text.map(t => t.plain_text).join('');
          content += `### ${text}\n\n`;
        } else if (block.type === 'code') {
          const text = block.code.rich_text.map(t => t.plain_text).join('');
          const language = block.code.language || '';
          content += `\`\`\`${language}\n${text}\n\`\`\`\n\n`;
        }
      }

      return {
        title,
        date,
        content,
        filename: `${date}-${title.replace(/[^\w\u4e00-\u9fa5]/g, '_')}.md`
      };
    }));

    return {
      success: true,
      posts
    };
  } catch (error) {
    console.error('同步失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// API 路由处理函数
module.exports = async (req, res) => {
  // 验证密钥
  const authToken = req.headers['x-auth-token'];
  if (authToken !== process.env.SYNC_AUTH_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const result = await syncNotionToHexo();
  res.json(result);
}; 