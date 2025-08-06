const { spawn } = require('child_process');
const puppeteer = require('puppeteer');
const https = require('https');

// 延时工具函数
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 检测 IPv6 连接状态 - 使用您改进的实现
async function checkIpV6() {
  try {
    const response = await fetch('https://6.ipw.cn', {
      agent: new https.Agent({ 
        family: 6, // 修改为强制IPv6连接
        rejectUnauthorized: false 
      })
    });
    const result = await response.text();
    console.log('✅ IPv6 连接测试成功: 6.ipw.cn');
    return result || 'connected';
  } catch (error) {
    console.error("❌ 获取IPv6失败:", error.message);
    return null;
  }
}

// 增强的等待函数，带重试机制
async function waitForSelectorWithRetry(page, selector, options = {}) {
  const { timeout = 15000, retries = 3, visible = true } = options;
  
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`🔍 等待选择器 ${selector} (第${i + 1}次尝试)`);
      await page.waitForSelector(selector, { visible, timeout: timeout / retries });
      console.log(`✅ 找到选择器 ${selector}`);
      return true;
    } catch (error) {
      console.log(`⚠️ 第${i + 1}次尝试失败: ${selector}`);
      if (i < retries - 1) {
        await sleep(1000); // 重试前等待1秒
        // 刷新页面状态
        try {
          await page.evaluate(() => window.location.reload());
          await sleep(2000);
        } catch (reloadError) {
          console.log(`页面刷新失败: ${reloadError.message}`);
        }
      }
    }
  }
  throw new Error(`选择器 ${selector} 在 ${retries} 次重试后仍未找到`);
}

// 安全点击函数，确保元素可点击
async function safeClick(page, selector, description = '') {
  try {
    console.log(`🖱️ 点击 ${description}: ${selector}`);
    
    // 确保元素存在且可见
    await page.waitForSelector(selector, { visible: true, timeout: 5000 });
    
    // 等待元素可交互
    await page.waitForFunction(
      (sel) => {
        const element = document.querySelector(sel);
        return element && !element.disabled && element.offsetParent !== null;
      },
      { timeout: 5000 },
      selector
    );
    
    await page.click(selector);
    console.log(`✅ 成功点击 ${description}`);
    return true;
  } catch (error) {
    console.error(`❌ 点击失败 ${description}: ${error.message}`);
    throw error;
  }
}

// 使用 Puppeteer 重启华为路由器的 IPv6 模块 - 优化版本
async function restartIPv6Router(browserConfig) {
  let browser = null;
  let page = null;
  
  try {
    // 检查必要的环境变量
    const routerPassword = process.env.ROUTER_PASSWORD || 'admin';
    const routerIP = process.env.ROUTER_IP || '192.168.3.1';
    
    console.log(`🔧 开始连接路由器: ${routerIP}`);
    
    browser = await puppeteer.launch(browserConfig);
    page = await browser.newPage();
    
    // 设置用户代理和视口
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    await page.setViewport({ width: 1366, height: 768 });
    
    console.log('📝 步骤1: 登录路由器');
    // 1. 登录路由器
    const loginUrl = `http://${routerIP}/html/index.html#/login`;
    console.log(`🌐 访问登录页面: ${loginUrl}`);
    
    await page.goto(loginUrl, { 
      waitUntil: ['networkidle0', 'domcontentloaded'], 
      timeout: 45000 
    });
    
    // 等待页面完全加载
    await sleep(3000);
    
    // 等待密码输入框
    console.log('⏳ 等待密码输入框...');
    await waitForSelectorWithRetry(page, '#userpassword_ctrl', { 
      timeout: 20000, 
      retries: 3, 
      visible: true 
    });
    
    // 清空并输入密码
    await page.click('#userpassword_ctrl');
    await page.keyboard.down('Control');
    await page.keyboard.press('KeyA');
    await page.keyboard.up('Control');
    await page.type('#userpassword_ctrl', routerPassword, { delay: 100 });
    
    console.log('🔑 输入密码并登录');
    await page.keyboard.press('Enter');
    await sleep(3000);
    
    console.log('📝 步骤2: 等待主页面加载');
    // 等待登录完成，使用增强等待
    await waitForSelectorWithRetry(page, '#more', { 
      timeout: 30000, 
      retries: 3, 
      visible: true 
    });
    
    // 确保页面稳定
    await sleep(3000);
    
    console.log('📝 步骤3: 导航到网络设置');
    // 2. 导航到 IPv6 设置页面
    await safeClick(page, '#more', '更多设置按钮');
    await sleep(2000);
    
    console.log('⏳ 等待网络设置菜单...');
    await waitForSelectorWithRetry(page, '#netsettingsparent_menuId', { 
      timeout: 15000, 
      retries: 2 
    });
    
    await safeClick(page, '#netsettingsparent_menuId', '网络设置父菜单');
    await sleep(2000);
    
    console.log('⏳ 等待IPv6菜单...');
    await waitForSelectorWithRetry(page, '#ipv6_menuId', { 
      timeout: 15000, 
      retries: 2 
    });
    
    await safeClick(page, '#ipv6_menuId', 'IPv6菜单');
    await sleep(3000);
    
    console.log('📝 步骤4: 执行IPv6重启操作');
    // 3. 重启 IPv6 模块
    console.log('🔍 检查IPv6当前状态...');
    
    // 先检查当前状态，如果是开启的就先关闭
    const ipv6OnElement = await page.$('#ipv6_on');
    if (ipv6OnElement) {
      console.log('📴 关闭IPv6模块');
      await safeClick(page, '#ipv6_on', 'IPv6关闭按钮');
      await sleep(5000); // 给更多时间让状态改变
    }
    
    // 重新开启 IPv6
    console.log('📶 重新开启IPv6模块');
    await waitForSelectorWithRetry(page, '#ipv6_off', { 
      timeout: 15000, 
      retries: 2 
    });
    
    await safeClick(page, '#ipv6_off', 'IPv6开启按钮');
    await sleep(5000);
    
    // 保存设置
    console.log('💾 保存设置');
    await waitForSelectorWithRetry(page, '#ipv6_submit_btn', { 
      timeout: 15000, 
      retries: 2 
    });
    
    await safeClick(page, '#ipv6_submit_btn', '保存按钮');
    await sleep(3000);
    
    console.log('✅ IPv6 模块重启操作完成');
    
    return {
      success: true,
      message: 'IPv6 模块重启成功',
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('❌ IPv6 模块重启失败:', error.message);
    
    // 保存错误截图用于调试
    if (page) {
      try {
        const screenshotDir = process.env.SCREENSHOT_DIR || '/app/screenshots';
        const screenshotPath = `${screenshotDir}/router_error_${Date.now()}.png`;
        await page.screenshot({ 
          path: screenshotPath, 
          fullPage: true 
        });
        console.log(`📸 错误截图已保存: ${screenshotPath}`);
        
        // 保存页面HTML用于调试
        const htmlPath = `${screenshotDir}/router_error_${Date.now()}.html`;
        const htmlContent = await page.content();
        require('fs').writeFileSync(htmlPath, htmlContent);
        console.log(`📄 页面HTML已保存: ${htmlPath}`);
        
      } catch (screenshotError) {
        console.error('截图保存失败:', screenshotError.message);
      }
    }
    
    return {
      success: false,
      message: 'IPv6 模块重启失败',
      error: error.message,
      timestamp: new Date().toISOString()
    };
    
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error('浏览器关闭失败:', closeError);
      }
    }
  }
}

// 创建随机 nonce（如果需要更复杂的认证）
function createNonce() {
  const typeVar = 0;
  const deviceID = 'monitor';
  const timeVar = Math.floor(Date.now() / 1000);
  const randomVar = Math.floor(Math.random() * 10000);
  return `${typeVar}_${deviceID}_${timeVar}_${randomVar}`;
}

// 检查网络连通性
async function checkNetworkConnectivity() {
  try {
    const ipv4Result = await new Promise((resolve) => {
      const process = spawn('ping', ['-c', '1', '-W', '5', 'google.com']);
      process.on('close', (code) => resolve(code === 0));
      process.on('error', () => resolve(false));
    });
    
    const ipv6Result = await checkIpV6();
    
    return {
      ipv4: ipv4Result,
      ipv6: !!ipv6Result,
      ipv6Address: ipv6Result
    };
  } catch (error) {
    console.error('网络连通性检查失败:', error);
    return {
      ipv4: false,
      ipv6: false,
      ipv6Address: null
    };
  }
}

module.exports = {
  sleep,
  checkIpV6,
  restartIPv6Router,
  createNonce,
  checkNetworkConnectivity
};