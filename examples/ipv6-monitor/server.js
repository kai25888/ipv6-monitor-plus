const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cron = require('node-cron');
const { checkIpV6, restartIPv6Router } = require('./utils');

const app = express();
const PORT = process.env.PORT || 3003;

// 中间件
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Puppeteer 配置 - 使用基础镜像中的 Chromium
const BROWSER_CONFIG = {
  executablePath: '/usr/bin/chromium-browser',
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--no-first-run',
    '--no-zygote',
    '--single-process',
    '--disable-gpu'
  ],
  headless: 'new'
};

// 监控状态
let monitorStatus = {
  isRunning: false,
  lastCheck: null,
  lastRestart: null,
  ipv6Status: null,
  restartCount: 0
};

// 重启冷却时间（5分钟）
const RESTART_COOLDOWN = 300000;

// IPv6 检测和重启逻辑
const performIPv6Check = async () => {
  try {
    console.log('🔍 开始 IPv6 检测...', new Date().toISOString());
    monitorStatus.lastCheck = new Date().toISOString();
    
    const ipv6 = await checkIpV6();
    monitorStatus.ipv6Status = ipv6;
    
    if (!ipv6) {
      console.log('❌ IPv6 丢失，准备重启路由器模块...');
      
      // 检查重启冷却时间
      if (monitorStatus.lastRestart && 
          Date.now() - new Date(monitorStatus.lastRestart).getTime() < RESTART_COOLDOWN) {
        console.log('🚫 重启冷却中，跳过此次重启');
        return { success: false, reason: 'cooldown' };
      }
      
      // 执行重启
      const restartResult = await restartIPv6Router(BROWSER_CONFIG);
      if (restartResult.success) {
        monitorStatus.lastRestart = new Date().toISOString();
        monitorStatus.restartCount++;
        console.log('✅ IPv6 模块重启完成');
        
        // 等待网络恢复并再次检测
        await new Promise(resolve => setTimeout(resolve, 30000));
        const newIpv6 = await checkIpV6();
        monitorStatus.ipv6Status = newIpv6;
        
        if (newIpv6) {
          console.log(`🎉 IPv6 恢复成功: ${newIpv6}`);
          return { success: true, newIpv6 };
        } else {
          console.log('⚠️ 重启后仍未获取到 IPv6');
          return { success: false, reason: 'no_ipv6_after_restart' };
        }
      } else {
        console.log('❌ IPv6 模块重启失败');
        return { success: false, reason: 'restart_failed' };
      }
    } else {
      console.log('✅ IPv6 状态正常:', ipv6);
      return { success: true, ipv6 };
    }
  } catch (error) {
    console.error('🔥 IPv6 检测过程出错:', error);
    return { success: false, reason: 'error', error: error.message };
  }
};

// 路由: 健康检查
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    monitor: monitorStatus
  });
});

// 路由: 获取监控状态
app.get('/status', (req, res) => {
  res.json({
    monitor: monitorStatus,
    timestamp: new Date().toISOString()
  });
});

// 路由: 手动执行 IPv6 检测（支持 GET 和 POST）
app.route('/check')
  .get(async (req, res) => {
    try {
      const result = await performIPv6Check();
      const timestamp = new Date().toISOString();
      
      // 检查是否是浏览器请求（Accept header 包含 text/html）
      const acceptHeader = req.get('Accept') || '';
      if (acceptHeader.includes('text/html')) {
        // 返回 HTML 页面给浏览器
        const statusIcon = result.success ? '✅' : '❌';
        const statusText = result.success ? '正常' : '失败';
        const statusColor = result.success ? '#4CAF50' : '#f44336';
        
        res.send(`
          <!DOCTYPE html>
          <html lang="zh-CN">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>IPv6 检测结果</title>
            <style>
              body { 
                font-family: 'Segoe UI', Arial, sans-serif; 
                max-width: 600px; 
                margin: 50px auto; 
                padding: 20px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
              }
              .container {
                background: rgba(255,255,255,0.1);
                padding: 30px;
                border-radius: 15px;
                backdrop-filter: blur(10px);
                box-shadow: 0 8px 32px rgba(31,38,135,0.37);
              }
              .status {
                font-size: 2.5em;
                text-align: center;
                margin: 20px 0;
                color: ${statusColor};
                text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
              }
              .info { 
                background: rgba(255,255,255,0.1); 
                padding: 15px; 
                border-radius: 8px; 
                margin: 15px 0;
                border-left: 4px solid ${statusColor};
              }
              .timestamp { 
                font-size: 0.9em; 
                color: rgba(255,255,255,0.8); 
                text-align: center;
                margin-top: 20px;
              }
              .btn {
                background: rgba(255,255,255,0.2);
                color: white;
                padding: 10px 20px;
                border: none;
                border-radius: 25px;
                cursor: pointer;
                margin: 10px 5px;
                transition: all 0.3s ease;
              }
              .btn:hover {
                background: rgba(255,255,255,0.3);
                transform: translateY(-2px);
              }
              .actions {
                text-align: center;
                margin-top: 25px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h1 style="text-align: center; margin-bottom: 30px;">🌐 IPv6 连接检测</h1>
              
              <div class="status">
                ${statusIcon} IPv6 状态: ${statusText}
              </div>
              
              <div class="info">
                <strong>检测地址:</strong> https://6.ipw.cn<br>
                <strong>检测结果:</strong> ${result.success ? '连接正常' : '连接失败'}<br>
                ${result.ipv6 ? `<strong>IPv6 地址:</strong> ${result.ipv6}<br>` : ''}
              </div>
              
              <div class="actions">
                <button class="btn" onclick="location.reload()">🔄 重新检测</button>
                <button class="btn" onclick="window.open('/status', '_blank')">📊 查看状态</button>
                <button class="btn" onclick="window.open('/', '_blank')">🏠 返回首页</button>
              </div>
              
              <div class="timestamp">
                检测时间: ${new Date(timestamp).toLocaleString('zh-CN')}
              </div>
            </div>
          </body>
          </html>
        `);
      } else {
        // 返回 JSON 给 API 调用
        res.json({
          result,
          timestamp
        });
      }
    } catch (error) {
      res.status(500).json({ 
        error: 'IPv6 检测失败', 
        message: error.message 
      });
    }
  })
  .post(async (req, res) => {
    try {
      const result = await performIPv6Check();
      res.json({
        result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ 
        error: 'IPv6 检测失败', 
        message: error.message 
      });
    }
  });

// 路由: 手动重启 IPv6
app.post('/restart', async (req, res) => {
  try {
    const result = await restartIPv6Router(BROWSER_CONFIG);
    if (result.success) {
      monitorStatus.lastRestart = new Date().toISOString();
      monitorStatus.restartCount++;
    }
    res.json({
      result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      error: '手动重启失败', 
      message: error.message 
    });
  }
});

// 路由: 启动/停止监控
app.post('/monitor/:action', (req, res) => {
  const { action } = req.params;
  
  if (action === 'start') {
    monitorStatus.isRunning = true;
    res.json({ message: '监控已启动', status: monitorStatus });
  } else if (action === 'stop') {
    monitorStatus.isRunning = false;
    res.json({ message: '监控已停止', status: monitorStatus });
  } else {
    res.status(400).json({ error: '无效的操作，只支持 start/stop' });
  }
});

// 根路由
app.get('/', (req, res) => {
  res.json({
    message: 'IPv6 Monitor API Server',
    version: '1.0.0',
    endpoints: [
      'GET /health - 健康检查',
      'GET /status - 获取监控状态',
      'POST /check - 手动执行 IPv6 检测',
      'POST /restart - 手动重启 IPv6',
      'POST /monitor/start - 启动自动监控',
      'POST /monitor/stop - 停止自动监控'
    ]
  });
});

// 定时任务：每30分钟检测一次 IPv6
cron.schedule('*/30 * * * *', async () => {
  if (monitorStatus.isRunning) {
    await performIPv6Check();
  }
});

// 错误处理中间件
app.use((error, req, res, next) => {
  console.error('服务器错误:', error);
  res.status(500).json({ error: '服务器内部错误' });
});

// 启动服务器
app.listen(PORT, async () => {
  console.log(`🌟 IPv6 Monitor API 服务器启动成功`);
  console.log(`📡 监听端口: ${PORT}`);
  console.log(`🌐 访问地址: http://localhost:${PORT}`);
  
  // 启用自动监控
  monitorStatus.isRunning = true;
  
  // 启动时执行一次检测
  console.log('🔍 启动时执行首次 IPv6 检测...');
  await performIPv6Check();
});