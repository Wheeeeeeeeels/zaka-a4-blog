const { exec } = require('child_process');
const path = require('path');

module.exports = async (req, res) => {
  try {
    console.log('开始同步 Notion 内容...');
    
    // 执行同步命令
    exec('npm run notion:sync', { cwd: path.join(__dirname, '..') }, (error, stdout, stderr) => {
      if (error) {
        console.error('同步失败:', error);
        return res.status(500).json({ error: '同步失败', details: error.message });
      }
      
      console.log('同步成功:', stdout);
      res.status(200).json({ message: '同步成功', output: stdout });
    });
  } catch (error) {
    console.error('API 错误:', error);
    res.status(500).json({ error: '服务器错误', details: error.message });
  }
}; 