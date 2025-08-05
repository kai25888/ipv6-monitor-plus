const { spawn } = require('child_process');
const puppeteer = require('puppeteer');

// 延时工具函数
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 检测 IPv6 连接状态
async function checkIpV6() {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      resolve(null);
    }, 10000); // 10秒超时

    const process = spawn('ping6', ['-c', '1', 'ipv6.google.com']);
    
    let stdout = '';
    let stderr = '';
    
    process.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    process.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    process.on('close', (code) => {
      clearTimeout(timeout);
      if (code === 0) {
        // 从 ping 输出中提取 IPv6 地址
        const match = stdout.match(/PING.*\(([0-9a-f:]+)\)/);
        const ipv6 = match ? match[1] : 'connected';
        resolve(ipv6);
      } else {
        console.log('IPv6 ping 失败:', stderr);
        resolve(null);
      }
    });
    
    process.on('error', (error) => {
      clearTimeout(timeout);
      console.log('IPv6 检测进程错误:', error);
      resolve(null);
    });
  });
}

// 使用 Puppeteer 重启华为路由器的 IPv6 模块
async function restartIPv6Router(browserConfig) {
  let browser = null;
  let page = null;
  
  try {
    // 检查必要的环境变量
    const routerPassword = process.env.ROUTER_PASSWORD || 'admin';
    const routerIP = process.env.ROUTER_IP || '192.168.3.1';
    
    console.log(`🔧 连接到路由器: ${routerIP}`);
    
    browser = await puppeteer.launch(browserConfig);
    page = await browser.newPage();
    
    // 1. 登录路由器
    const loginUrl = `http://${routerIP}/html/index.html#/login`;
    await page.goto(loginUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // 等待密码输入框
    await page.waitForSelector('#userpassword_ctrl', { visible: true, timeout: 15000 });
    
    // 输入密码并登录
    await page.type('#userpassword_ctrl', routerPassword);
    await page.keyboard.press('Enter');
    
    // 等待登录完成
    await page.waitForSelector('#more', { timeout: 20000 });
    await sleep(2000);
    
    // 2. 导航到 IPv6 设置页面
    await page.click('#more');
    await sleep(1000);
    
    await page.waitForSelector('#netsettingsparent_menuId', { timeout: 10000 });
    await page.click('#netsettingsparent_menuId');
    await sleep(1000);
    
    await page.waitForSelector('#ipv6_menuId', { timeout: 10000 });
    await page.click('#ipv6_menuId');
    await sleep(2000);
    
    // 3. 重启 IPv6 模块
    // 先检查当前状态，如果是开启的就先关闭
    const ipv6OnElement = await page.$('#ipv6_on');
    if (ipv6OnElement) {
      await page.click('#ipv6_on'); // 关闭 IPv6
      await sleep(3000);
    }
    
    // 重新开启 IPv6
    await page.waitForSelector('#ipv6_off', { timeout: 10000 });
    await page.click('#ipv6_off');
    await sleep(5000);
    
    // 保存设置
    await page.waitForSelector('#ipv6_submit_btn', { timeout: 10000 });
    await page.click('#ipv6_submit_btn');
    await sleep(2000);
    
    console.log('✅ IPv6 模块重启操作完成');
    
    return {
      success: true,
      message: 'IPv6 模块重启成功',
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('❌ IPv6 模块重启失败:', error);
    
    // 保存错误截图用于调试
    if (page) {
      try {
        const screenshotPath = `/tmp/router_error_${Date.now()}.png`;
        await page.screenshot({ path: screenshotPath });
        console.log(`📸 错误截图已保存: ${screenshotPath}`);
      } catch (screenshotError) {
        console.error('截图保存失败:', screenshotError);
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