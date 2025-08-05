const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// 速率限制
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 限制每个IP 100次请求
  message: { error: '请求过于频繁，请稍后再试' }
});

// 中间件
app.use(helmet());
app.use(cors());
app.use(limiter);
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 文件上传配置
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB 限制
  }
});

// Puppeteer 配置
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

// PDF 选项验证
function validatePdfOptions(options) {
  const validFormats = ['A0', 'A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'Letter', 'Legal', 'Tabloid', 'Ledger'];
  const validOrientations = ['portrait', 'landscape'];
  
  return {
    format: validFormats.includes(options.format) ? options.format : 'A4',
    landscape: validOrientations.includes(options.orientation) ? options.orientation === 'landscape' : false,
    printBackground: options.printBackground !== false,
    margin: {
      top: options.margin?.top || '1cm',
      right: options.margin?.right || '1cm', 
      bottom: options.margin?.bottom || '1cm',
      left: options.margin?.left || '1cm'
    },
    scale: Math.min(Math.max(options.scale || 1, 0.1), 2),
    preferCSSPageSize: options.preferCSSPageSize === true
  };
}

// 路由: 健康检查
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    browser: browser ? 'ready' : 'not_ready'
  });
});

// 路由: 服务信息
app.get('/', (req, res) => {
  res.json({
    message: 'PDF 生成服务',
    version: '1.0.0',
    endpoints: [
      'GET /health - 健康检查',
      'POST /pdf/url - 从 URL 生成 PDF',
      'POST /pdf/html - 从 HTML 内容生成 PDF',
      'GET /pdf/url - 快速从 URL 生成 PDF（URL参数）'
    ],
    supported_formats: ['A0', 'A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'Letter', 'Legal', 'Tabloid', 'Ledger']
  });
});

// 路由: 从 URL 生成 PDF
app.post('/pdf/url', async (req, res) => {
  try {
    const { url, options = {} } = req.body;

    if (!url) {
      return res.status(400).json({ error: '缺少 URL 参数' });
    }

    // 验证 URL 格式
    try {
      new URL(url);
    } catch {
      return res.status(400).json({ error: 'URL 格式无效' });
    }

    const browserInstance = await initBrowser();
    const page = await browserInstance.newPage();

    try {
      // 设置视窗
      if (options.viewport) {
        await page.setViewport({
          width: options.viewport.width || 1920,
          height: options.viewport.height || 1080
        });
      }

      // 访问页面
      await page.goto(url, { 
        waitUntil: options.waitUntil || 'networkidle2', 
        timeout: options.timeout || 30000 
      });

      // 等待额外加载时间
      if (options.delay) {
        await page.waitForTimeout(options.delay);
      }

      // 生成 PDF
      const pdfOptions = validatePdfOptions(options);
      const pdf = await page.pdf(pdfOptions);

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Length': pdf.length,
        'Content-Disposition': `attachment; filename="${options.filename || 'generated'}.pdf"`
      });

      res.send(pdf);
    } finally {
      await page.close();
    }
  } catch (error) {
    console.error('URL转PDF失败:', error);
    res.status(500).json({ error: 'PDF生成失败', message: error.message });
  }
});

// 路由: 从 HTML 内容生成 PDF
app.post('/pdf/html', async (req, res) => {
  try {
    const { html, options = {} } = req.body;

    if (!html) {
      return res.status(400).json({ error: '缺少 HTML 内容' });
    }

    const browserInstance = await initBrowser();
    const page = await browserInstance.newPage();

    try {
      // 设置视窗
      if (options.viewport) {
        await page.setViewport({
          width: options.viewport.width || 1920,
          height: options.viewport.height || 1080
        });
      }

      // 设置 HTML 内容
      await page.setContent(html, { 
        waitUntil: options.waitUntil || 'networkidle2',
        timeout: options.timeout || 30000
      });

      // 等待额外加载时间
      if (options.delay) {
        await page.waitForTimeout(options.delay);
      }

      // 生成 PDF
      const pdfOptions = validatePdfOptions(options);
      const pdf = await page.pdf(pdfOptions);

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Length': pdf.length,
        'Content-Disposition': `attachment; filename="${options.filename || 'generated'}.pdf"`
      });

      res.send(pdf);
    } finally {
      await page.close();
    }
  } catch (error) {
    console.error('HTML转PDF失败:', error);
    res.status(500).json({ error: 'PDF生成失败', message: error.message });
  }
});

// 路由: 快速从 URL 生成 PDF（GET请求）
app.get('/pdf/url', async (req, res) => {
  try {
    const url = req.query.url;
    const format = req.query.format || 'A4';
    const landscape = req.query.landscape === 'true';

    if (!url) {
      return res.status(400).json({ error: '缺少 URL 参数' });
    }

    // 验证 URL 格式
    try {
      new URL(url);
    } catch {
      return res.status(400).json({ error: 'URL 格式无效' });
    }

    const browserInstance = await initBrowser();
    const page = await browserInstance.newPage();

    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

      const pdf = await page.pdf({
        format: format,
        landscape: landscape,
        printBackground: true,
        margin: {
          top: '1cm',
          right: '1cm',
          bottom: '1cm',
          left: '1cm'
        }
      });

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Length': pdf.length,
        'Content-Disposition': 'attachment; filename="quick-pdf.pdf"'
      });

      res.send(pdf);
    } finally {
      await page.close();
    }
  } catch (error) {
    console.error('快速PDF生成失败:', error);
    res.status(500).json({ error: 'PDF生成失败', message: error.message });
  }
});

// 路由: 批量生成 PDF
app.post('/pdf/batch', async (req, res) => {
  try {
    const { urls, options = {} } = req.body;

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({ error: '缺少 URLs 数组' });
    }

    if (urls.length > 10) {
      return res.status(400).json({ error: '批量处理最多支持10个URL' });
    }

    const browserInstance = await initBrowser();
    const results = [];

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      const page = await browserInstance.newPage();

      try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
        
        const pdfOptions = validatePdfOptions(options);
        const pdf = await page.pdf(pdfOptions);

        results.push({
          url: url,
          success: true,
          filename: `batch_${i + 1}.pdf`,
          size: pdf.length,
          pdf: pdf.toString('base64')
        });
      } catch (error) {
        results.push({
          url: url,
          success: false,
          error: error.message
        });
      } finally {
        await page.close();
      }
    }

    res.json({
      message: '批量处理完成',
      total: urls.length,
      success: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results: results
    });
  } catch (error) {
    console.error('批量PDF生成失败:', error);
    res.status(500).json({ error: '批量PDF生成失败', message: error.message });
  }
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
  console.log(`🌟 PDF 生成服务启动成功`);
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