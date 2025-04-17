const { Client } = require('@notionhq/client');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// 初始化 Notion 客户端
const notion = new Client({
  auth: process.env.NOTION_TOKEN,
});

// 配置信息
const config = {
  databaseId: process.env.NOTION_DATABASE_ID,
  outputDir: path.join(__dirname, '../source/_posts'),
};

async function syncNotionToHexo() {
  try {
    console.log('开始同步...');
    console.log('Database ID:', config.databaseId);
    
    // 获取数据库中的所有页面
    const response = await notion.databases.query({
      database_id: config.databaseId,
    });

    console.log('获取到页面数量:', response.results.length);

    // 处理每个页面
    for (const page of response.results) {
      const pageId = page.id;
      
      // 获取页面属性
      const pageInfo = await notion.pages.retrieve({ page_id: pageId });
      
      // 获取标题
      const title = pageInfo.properties['文档名称']?.title[0]?.plain_text || 'Untitled';
      const date = new Date(pageInfo.created_time).toISOString().split('T')[0];
      
      console.log('处理页面:', title);
      
      // 获取页面内容
      const blocks = await notion.blocks.children.list({
        block_id: pageId,
      });

      // 生成 Markdown 内容
      let content = `---
title: "${title}"
date: ${date}
---

`;

      // 处理块内容
      for (const block of blocks.results) {
        console.log('处理块类型:', block.type);
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

      // 确保输出目录存在
      if (!fs.existsSync(config.outputDir)) {
        fs.mkdirSync(config.outputDir, { recursive: true });
      }

      // 保存文件
      const safeTitle = title.replace(/[^\w\u4e00-\u9fa5]/g, '_');
      const filename = `${date}-${safeTitle}.md`;
      const filepath = path.join(config.outputDir, filename);
      fs.writeFileSync(filepath, content);
      console.log('已保存文件:', filepath);
    }

    console.log('Notion 同步完成！');
  } catch (error) {
    console.error('同步失败:', error);
    console.error('错误详情:', {
      message: error.message,
      code: error.code,
      status: error.status,
      body: error.body
    });
  }
}

syncNotionToHexo(); 