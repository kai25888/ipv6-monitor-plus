// 路由器客户端 - 统一的路由器管理接口
import puppeteer from 'puppeteer';
import { getEnv } from '../config/env.js';
import { createNonce, hashPassword, hashPasswordSHA256, sleep } from './utils.js';

/**
 * Puppeteer 浏览器配置（使用基础镜像中的 Chromium）
 */
const getBrowserConfig = () => ({
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
        '--disable-renderer-backgrounding',
        '--disable-extensions',
        '--disable-default-apps'
    ],
    headless: 'new',
    defaultViewport: { width: 1920, height: 1080 }
});

/**
 * 路由器客户端基类
 */
class RouterClient {
    constructor(config = {}) {
        this.config = {
            ip: config.ip || getEnv('ROUTER_IP'),
            username: config.username || getEnv('ROUTER_USERNAME'),
            password: config.password || getEnv('ROUTER_PASSWORD'),
            type: config.type || getEnv('ROUTER_TYPE'),
            key: config.key || getEnv('ROUTER_KEY'),
            timeout: config.timeout || getEnv('TIMEOUT') || 30000
        };
        
        this.browser = null;
        this.page = null;
        this.isAuthenticated = false;
        this.authToken = null;
    }

    /**
     * 初始化浏览器
     */
    async initBrowser() {
        if (!this.browser) {
            console.log('🚀 启动 Chromium 浏览器...');
            this.browser = await puppeteer.launch(getBrowserConfig());
            console.log('✅ Chromium 浏览器启动成功');
        }
        
        if (!this.page) {
            this.page = await this.browser.newPage();
            await this.page.setUserAgent(
                'Mozilla/5.0 (Linux; X11; Ubuntu) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            );
            this.page.setDefaultTimeout(this.config.timeout);
            this.page.setDefaultNavigationTimeout(this.config.timeout);
        }
    }

    /**
     * 关闭浏览器
     */
    async closeBrowser() {
        if (this.page) {
            await this.page.close();
            this.page = null;
        }
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
            console.log('🔒 浏览器已关闭');
        }
        this.isAuthenticated = false;
        this.authToken = null;
    }

    /**
     * 截图调试
     */
    async takeScreenshot(filename = null) {
        if (!this.page) return null;
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const screenshotPath = `/app/logs/router_${filename || timestamp}.png`;
        
        try {
            await this.page.screenshot({ 
                path: screenshotPath,
                fullPage: true 
            });
            console.log(`📸 截图已保存: ${screenshotPath}`);
            return screenshotPath;
        } catch (error) {
            console.error(`截图失败: ${error.message}`);
            return null;
        }
    }

    /**
     * 连接路由器（抽象方法）
     */
    async connect() {
        throw new Error('connect 方法需要在子类中实现');
    }

    /**
     * 断开连接
     */
    async disconnect() {
        await this.closeBrowser();
        this.isAuthenticated = false;
        this.authToken = null;
        console.log('🔌 已断开路由器连接');
    }

    /**
     * 检查连接状态
     */
    isConnected() {
        return this.isAuthenticated;
    }

    /**
     * 获取路由器信息
     */
    async getRouterInfo() {
        throw new Error('getRouterInfo 方法需要在子类中实现');
    }

    /**
     * 重启 IPv6 模块
     */
    async restartIPv6() {
        throw new Error('restartIPv6 方法需要在子类中实现');
    }

    /**
     * 重启路由器
     */
    async rebootRouter() {
        throw new Error('rebootRouter 方法需要在子类中实现');
    }
}

/**
 * 小米路由器客户端
 */
class XiaomiRouterClient extends RouterClient {
    constructor(config = {}) {
        super(config);
        this.apiBase = `http://${this.config.ip}/cgi-bin/luci/api`;
        this.loginUrl = `http://${this.config.ip}/cgi-bin/luci/web/home`;
    }

    /**
     * 连接小米路由器（API 方式）
     */
    async connect() {
        try {
            console.log('🔐 正在连接小米路由器...');
            
            const nonce = createNonce();
            const hashedPassword = await hashPassword(
                this.config.password, 
                nonce, 
                this.config.key || ''
            );

            const loginUrl = `${this.apiBase}/xqsystem/login`;
            const formData = new URLSearchParams({
                username: this.config.username,
                password: hashedPassword,
                nonce: nonce,
                logtype: '2'
            });

            const response = await fetch(loginUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: formData,
                signal: AbortSignal.timeout(this.config.timeout)
            });

            const result = await response.json();
            
            if (result.code === 0) {
                this.authToken = result.token;
                this.isAuthenticated = true;
                console.log('✅ 小米路由器连接成功');
                return true;
            } else {
                throw new Error(`连接失败: ${result.msg || '未知错误'}`);
            }
        } catch (error) {
            console.error(`❌ 小米路由器连接失败: ${error.message}`);
            this.isAuthenticated = false;
            throw error;
        }
    }

    /**
     * 调用路由器 API
     */
    async callAPI(endpoint, data = null, method = 'GET') {
        if (!this.isAuthenticated) {
            await this.connect();
        }

        try {
            const url = `${this.apiBase}/${endpoint}`;
            const options = {
                method: method,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json',
                },
                signal: AbortSignal.timeout(this.config.timeout)
            };

            if (data && method === 'POST') {
                options.body = typeof data === 'string' ? data : new URLSearchParams(data);
            }

            // 将 token 添加到 URL
            const tokenUrl = url.replace('/api/', `/;stok=${this.authToken}/api/`);
            
            const response = await fetch(tokenUrl, options);
            const result = await response.json();

            if (result.code === 401) {
                // Token 过期，重新连接
                console.log('🔄 Token 过期，重新连接...');
                await this.connect();
                const newTokenUrl = url.replace('/api/', `/;stok=${this.authToken}/api/`);
                const retryResponse = await fetch(newTokenUrl, options);
                return await retryResponse.json();
            }

            return result;
        } catch (error) {
            console.error(`❌ API 调用失败: ${error.message}`);
            throw error;
        }
    }

    /**
     * 获取路由器信息
     */
    async getRouterInfo() {
        try {
            const [wanInfo, sysInfo, status] = await Promise.all([
                this.callAPI('xqnetwork/wan_info'),
                this.callAPI('xqsystem/sys_info'),
                this.callAPI('xqsystem/status')
            ]);

            return {
                wan: wanInfo,
                system: sysInfo,
                status: status,
                type: 'xiaomi',
                ip: this.config.ip
            };
        } catch (error) {
            console.error(`获取路由器信息失败: ${error.message}`);
            throw error;
        }
    }

    /**
     * 重启 IPv6 模块
     */
    async restartIPv6() {
        try {
            console.log('🔄 开始重启小米路由器 IPv6...');

            // 1. 禁用 IPv6
            console.log('1️⃣ 禁用 IPv6...');
            const disableResult = await this.callAPI(
                'xqnetwork/set_wan6',
                'wanType=off',
                'POST'
            );

            if (disableResult.code !== 0) {
                throw new Error(`禁用 IPv6 失败: ${disableResult.msg}`);
            }

            // 等待设置生效
            await sleep(5000);

            // 2. 启用 IPv6
            console.log('2️⃣ 启用 IPv6...');
            const enableResult = await this.callAPI(
                'xqnetwork/set_wan6',
                'wanType=native&autosetipv6=0',
                'POST'
            );

            if (enableResult.code !== 0) {
                throw new Error(`启用 IPv6 失败: ${enableResult.msg}`);
            }

            console.log('✅ 小米路由器 IPv6 重启成功');
            return { success: true, message: '小米路由器 IPv6 重启成功' };

        } catch (error) {
            console.error(`❌ 小米路由器 IPv6 重启失败: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    /**
     * 重启路由器
     */
    async rebootRouter() {
        try {
            console.log('🔄 正在重启小米路由器...');
            
            const result = await this.callAPI(
                'xqsystem/reboot',
                '',
                'POST'
            );

            if (result.code === 0) {
                console.log('✅ 小米路由器重启命令已发送');
                // 重启后连接会断开
                this.isAuthenticated = false;
                this.authToken = null;
                return { success: true, message: '路由器重启命令已发送' };
            } else {
                throw new Error(`重启失败: ${result.msg}`);
            }
        } catch (error) {
            console.error(`❌ 路由器重启失败: ${error.message}`);
            return { success: false, error: error.message };
        }
    }
}

/**
 * 华为路由器客户端
 */
class HuaweiRouterClient extends RouterClient {
    constructor(config = {}) {
        super(config);
        this.loginUrl = `http://${this.config.ip}/html/index.html#/login`;
    }

    /**
     * 连接华为路由器（Web 自动化方式）
     */
    async connect() {
        try {
            console.log('🔐 正在连接华为路由器...');
            
            await this.initBrowser();

            // 访问登录页面
            await this.page.goto(this.loginUrl, { waitUntil: 'networkidle2' });
            
            // 等待密码输入框
            await this.page.waitForSelector('#userpassword_ctrl', { visible: true });
            
            // 输入密码
            await this.page.type('#userpassword_ctrl', this.config.password);
            await this.page.keyboard.press('Enter');
            
            // 等待登录完成
            await this.page.waitForSelector('#more', { timeout: 15000 });
            
            this.isAuthenticated = true;
            console.log('✅ 华为路由器连接成功');
            return true;

        } catch (error) {
            console.error(`❌ 华为路由器连接失败: ${error.message}`);
            await this.takeScreenshot('huawei_login_error');
            this.isAuthenticated = false;
            throw error;
        }
    }

    /**
     * 获取路由器信息
     */
    async getRouterInfo() {
        if (!this.isAuthenticated) {
            await this.connect();
        }

        try {
            // 华为路由器信息需要通过页面解析获取
            // 这里返回基本信息
            return {
                type: 'huawei',
                ip: this.config.ip,
                status: 'connected',
                message: '华为路由器信息需要通过页面解析获取'
            };
        } catch (error) {
            console.error(`获取华为路由器信息失败: ${error.message}`);
            throw error;
        }
    }

    /**
     * 重启 IPv6 模块
     */
    async restartIPv6() {
        if (!this.isAuthenticated) {
            await this.connect();
        }

        try {
            console.log('🔄 开始重启华为路由器 IPv6...');
            
            // 导航到 IPv6 设置页面
            console.log('1️⃣ 导航到 IPv6 设置...');
            await this.page.click('#more');
            await sleep(1000);
            
            await this.page.waitForSelector('#netsettingsparent_menuId');
            await this.page.click('#netsettingsparent_menuId');
            await sleep(1000);
            
            await this.page.waitForSelector('#ipv6_menuId');
            await this.page.click('#ipv6_menuId');
            await sleep(2000);

            // 执行 IPv6 重启
            console.log('2️⃣ 执行 IPv6 重启...');
            
            // 检查当前状态并切换
            const ipv6OnButton = await this.page.$('#ipv6_on');
            if (ipv6OnButton) {
                // 如果当前是开启状态，先关闭
                await this.page.click('#ipv6_on');
                await sleep(3000);
            }

            // 重新开启
            await this.page.waitForSelector('#ipv6_off');
            await this.page.click('#ipv6_off');
            await sleep(8000);

            // 保存设置
            await this.page.waitForSelector('#ipv6_submit_btn');
            await this.page.click('#ipv6_submit_btn');
            await sleep(2000);

            console.log('✅ 华为路由器 IPv6 重启成功');
            return { success: true, message: '华为路由器 IPv6 重启成功' };

        } catch (error) {
            console.error(`❌ 华为路由器 IPv6 重启失败: ${error.message}`);
            await this.takeScreenshot('huawei_ipv6_error');
            return { success: false, error: error.message };
        }
    }

    /**
     * 重启路由器
     */
    async rebootRouter() {
        if (!this.isAuthenticated) {
            await this.connect();
        }

        try {
            console.log('🔄 正在重启华为路由器...');
            
            // 导航到系统设置
            await this.page.click('#more');
            await sleep(1000);
            
            // 这里需要根据具体的华为路由器界面来实现
            // 不同型号的华为路由器界面可能不同
            
            console.log('⚠️ 华为路由器重启功能需要根据具体型号调整');
            return { success: false, error: '华为路由器重启功能需要根据具体型号调整' };

        } catch (error) {
            console.error(`❌ 华为路由器重启失败: ${error.message}`);
            return { success: false, error: error.message };
        }
    }
}

/**
 * 路由器客户端工厂
 */
export class RouterClientFactory {
    static create(config = {}) {
        const routerType = (config.type || getEnv('ROUTER_TYPE')).toLowerCase();
        
        switch (routerType) {
            case 'xiaomi':
            case 'mi':
                return new XiaomiRouterClient(config);
            case 'huawei':
                return new HuaweiRouterClient(config);
            default:
                throw new Error(`不支持的路由器类型: ${routerType}`);
        }
    }
}

export { RouterClient, XiaomiRouterClient, HuaweiRouterClient };