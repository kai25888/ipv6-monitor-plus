const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');
const helmet = require('helmet');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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
    '--disable-gpu',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding'
  ],
  headless: 'new'
};

// 全局浏览器实例
let browser = null;

// 初始化浏览器
async function initBrowser() {
  try {
    if (!browser) {
      console.log('🚀 启动 Chromium 浏览器...');
      browser = await puppeteer.launch(BROWSER_CONFIG);
      console.log('✅ Chromium 浏览器启动成功');
    }
    return browser;
  } catch (error) {
    console.error('❌ 浏览器启动失败:', error);
    throw error;
  }
}

// 路由: 健康检查
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    browser: browser ? 'ready' : 'not_ready'
  });
});

// 路由: 获取页面截图
app.post('/screenshot', async (req, res) => {
  try {
    const { url, width = 1920, height = 1080, fullPage = false } = req.body;

    if (!url) {
      return res.status(400).json({ error: '缺少 URL 参数' });
    }

    const browserInstance = await initBrowser();
    const page = await browserInstance.newPage();

    // 设置视窗大小
    await page.setViewport({ width: parseInt(width), height: parseInt(height) });

    // 访问页面
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    // 截图
    const screenshot = await page.screenshot({
      fullPage: fullPage,
      type: 'png'
    });

    await page.close();

    res.set({
      'Content-Type': 'image/png',
      'Content-Length': screenshot.length
    });
    
    res.send(screenshot);
  } catch (error) {
    console.error('截图失败:', error);
    res.status(500).json({ error: '截图失败', message: error.message });
  }
});

// 路由: 获取页面内容
app.post('/content', async (req, res) => {
  try {
    const { url, selector } = req.body;

    if (!url) {
      return res.status(400).json({ error: '缺少 URL 参数' });
    }

    const browserInstance = await initBrowser();
    const page = await browserInstance.newPage();

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    let content;
    if (selector) {
      // 获取特定选择器的内容
      content = await page.$eval(selector, el => el.textContent);
    } else {
      // 获取整个页面的文本内容
      content = await page.evaluate(() => document.body.textContent);
    }

    await page.close();

    res.json({
      url,
      selector: selector || 'body',
      content: content.trim(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('获取内容失败:', error);
    res.status(500).json({ error: '获取内容失败', message: error.message });
  }
});

// 路由: 生成 PDF
app.post('/pdf', async (req, res) => {
  try {
    const { url, format = 'A4', margin = {} } = req.body;

    if (!url) {
      return res.status(400).json({ error: '缺少 URL 参数' });
    }

    const browserInstance = await initBrowser();
    const page = await browserInstance.newPage();

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    const pdf = await page.pdf({
      format: format,
      margin: {
        top: margin.top || '1cm',
        right: margin.right || '1cm',
        bottom: margin.bottom || '1cm',
        left: margin.left || '1cm'
      },
      printBackground: true
    });

    await page.close();

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Length': pdf.length,
      'Content-Disposition': 'attachment; filename="page.pdf"'
    });

    res.send(pdf);
  } catch (error) {
    console.error('PDF 生成失败:', error);
    res.status(500).json({ error: 'PDF 生成失败', message: error.message });
  }
});

// 路由: 执行自定义脚本
app.post('/execute', async (req, res) => {
  try {
    const { url, script } = req.body;

    if (!url || !script) {
      return res.status(400).json({ error: '缺少 URL 或 script 参数' });
    }

    const browserInstance = await initBrowser();
    const page = await browserInstance.newPage();

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    // 执行自定义脚本
    const result = await page.evaluate(script);

    await page.close();

    res.json({
      url,
      result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('脚本执行失败:', error);
    res.status(500).json({ error: '脚本执行失败', message: error.message });
  }
});

// 根路由
app.get('/', (req, res) => {
  res.json({
    message: 'Puppeteer API Server',
    version: '1.0.0',
    endpoints: [
      'GET /health - 健康检查',
      'POST /screenshot - 页面截图',
      'POST /content - 获取页面内容',
      'POST /pdf - 生成 PDF',
      'POST /execute - 执行自定义脚本'
    ]
  });
});

// 错误处理中间件
app.use((error, req, res, next) => {
  console.error('服务器错误:', error);
  res.status(500).json({ error: '服务器内部错误' });
});

// 优雅关闭
process.on('SIGINT', async () => {
  console.log('🛑 收到 SIGINT 信号，正在关闭服务器...');
  if (browser) {
    await browser.close();
    console.log('✅ 浏览器已关闭');
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🛑 收到 SIGTERM 信号，正在关闭服务器...');
  if (browser) {
    await browser.close();
    console.log('✅ 浏览器已关闭');
  }
  process.exit(0);
});

// 启动服务器
app.listen(PORT, async () => {
  console.log(`🌟 Puppeteer API 服务器启动成功`);
  console.log(`📡 监听端口: ${PORT}`);
  console.log(`🌐 访问地址: http://localhost:${PORT}`);
  
  // 预热浏览器
  try {
    await initBrowser();
    console.log('🔥 浏览器预热完成');
  } catch (error) {
    console.error('⚠️  浏览器预热失败:', error);
  }
});