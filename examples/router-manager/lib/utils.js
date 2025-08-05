// 工具函数模块
import fs from 'fs';
import path from 'path';

/**
 * 等待指定时间
 * @param {number} ms 毫秒数
 */
export const sleep = async (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * 格式化时间戳
 * @param {Date} date 日期对象
 */
export const formatTimestamp = (date = new Date()) => {
    return date.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');
};

/**
 * 创建 nonce 值（用于路由器认证）
 */
export function createNonce() {
    const typeVar = 0;
    const deviceID = 'routermgr';
    const timeVar = Math.floor(Date.now() / 1000);
    const randomVar = Math.floor(Math.random() * 10000);
    return `${typeVar}_${deviceID}_${timeVar}_${randomVar}`;
}

/**
 * SHA-1 密码哈希（小米路由器）
 * @param {string} password 密码
 * @param {string} nonce 随机数
 * @param {string} key 密钥
 */
export async function hashPassword(password, nonce, key) {
    const pwdKey = password + key;
    const pwdKeyHash = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(pwdKey));
    const pwdKeyHashStr = Array.from(new Uint8Array(pwdKeyHash))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

    const noncePwdKey = nonce + pwdKeyHashStr;
    const noncePwdKeyHash = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(noncePwdKey));
    const noncePwdKeyHashStr = Array.from(new Uint8Array(noncePwdKeyHash))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

    return noncePwdKeyHashStr;
}

/**
 * SHA-256 密码哈希（华为路由器）
 * @param {string} password 密码
 * @param {string} nonce 随机数
 * @param {string} key 密钥
 */
export async function hashPasswordSHA256(password, nonce, key) {
    const pwdKey = password + key;
    const pwdKeyHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pwdKey));
    const pwdKeyHashStr = Array.from(new Uint8Array(pwdKeyHash))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

    const noncePwdKey = nonce + pwdKeyHashStr;
    const noncePwdKeyHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(noncePwdKey));
    const noncePwdKeyHashStr = Array.from(new Uint8Array(noncePwdKeyHash))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

    return noncePwdKeyHashStr;
}

/**
 * 验证 IP 地址格式
 * @param {string} ip 
 */
export const isValidIP = (ip) => {
    if (!ip || typeof ip !== 'string') return false;
    
    // IPv4 格式验证
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (ipv4Regex.test(ip)) {
        const parts = ip.split('.');
        return parts.every(part => {
            const num = parseInt(part, 10);
            return num >= 0 && num <= 255;
        });
    }
    
    // 简单的 IPv6 格式验证
    const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$/;
    return ipv6Regex.test(ip);
};

/**
 * 检查端口是否可用
 * @param {string} host 
 * @param {number} port 
 * @param {number} timeout 
 */
export const checkPort = async (host, port, timeout = 5000) => {
    return new Promise((resolve) => {
        const start = Date.now();
        
        try {
            const request = fetch(`http://${host}:${port}`, {
                method: 'HEAD',
                signal: AbortSignal.timeout(timeout)
            }).then((response) => {
                resolve({
                    success: true,
                    status: response.status,
                    responseTime: Date.now() - start,
                    host,
                    port
                });
            }).catch((error) => {
                resolve({
                    success: false,
                    error: error.message,
                    responseTime: Date.now() - start,
                    host,
                    port
                });
            });
        } catch (error) {
            resolve({
                success: false,
                error: error.message,
                responseTime: Date.now() - start,
                host,
                port
            });
        }
    });
};

/**
 * 重试函数
 * @param {Function} fn 要重试的函数
 * @param {number} retries 重试次数
 * @param {number} delay 重试间隔（毫秒）
 */
export const retry = async (fn, retries = 3, delay = 1000) => {
    for (let i = 0; i < retries; i++) {
        try {
            return await fn();
        } catch (error) {
            console.log(`🔄 重试 ${i + 1}/${retries}: ${error.message}`);
            if (i === retries - 1) throw error;
            await sleep(delay);
        }
    }
};

/**
 * 生成随机字符串
 * @param {number} length 长度
 */
export const generateRandomString = (length = 10) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

/**
 * 确保目录存在
 * @param {string} dirPath 目录路径
 */
export const ensureDir = (dirPath) => {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
};

/**
 * 写入日志文件
 * @param {string} message 日志消息
 * @param {string} level 日志级别
 */
export const writeLog = (message, level = 'info') => {
    const timestamp = formatTimestamp();
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;
    
    const logDir = '/app/logs';
    ensureDir(logDir);
    
    const logFile = path.join(logDir, `router-manager.log`);
    
    try {
        fs.appendFileSync(logFile, logMessage);
    } catch (error) {
        console.error('写入日志失败:', error.message);
    }
};

/**
 * 读取日志文件
 * @param {number} lines 读取行数
 */
export const readLogs = (lines = 100) => {
    const logFile = '/app/logs/router-manager.log';
    
    try {
        if (!fs.existsSync(logFile)) {
            return [];
        }
        
        const content = fs.readFileSync(logFile, 'utf8');
        const logLines = content.trim().split('\n');
        
        return logLines.slice(-lines).map(line => {
            const match = line.match(/^\[([^\]]+)\] \[([^\]]+)\] (.+)$/);
            if (match) {
                return {
                    timestamp: match[1],
                    level: match[2].toLowerCase(),
                    message: match[3]
                };
            }
            return { timestamp: '', level: 'unknown', message: line };
        });
    } catch (error) {
        console.error('读取日志失败:', error.message);
        return [];
    }
};

/**
 * 清理日志文件
 * @param {number} maxSizeMB 最大文件大小（MB）
 */
export const cleanLogs = (maxSizeMB = 10) => {
    const logFile = '/app/logs/router-manager.log';
    
    try {
        if (!fs.existsSync(logFile)) {
            return;
        }
        
        const stats = fs.statSync(logFile);
        const fileSizeMB = stats.size / (1024 * 1024);
        
        if (fileSizeMB > maxSizeMB) {
            // 保留最后1000行
            const content = fs.readFileSync(logFile, 'utf8');
            const lines = content.trim().split('\n');
            const keepLines = lines.slice(-1000);
            
            fs.writeFileSync(logFile, keepLines.join('\n') + '\n');
            console.log(`📝 日志文件已清理，保留最后 ${keepLines.length} 行`);
        }
    } catch (error) {
        console.error('清理日志失败:', error.message);
    }
};

/**
 * 解析路由器型号
 * @param {string} userAgent 或其他识别信息
 */
export const parseRouterModel = (info) => {
    // 这里可以根据实际情况解析路由器型号
    const models = {
        'xiaomi': ['mi', 'redmi', 'ax', 'ac'],
        'huawei': ['honor', 'ws', 'ax3']
    };
    
    const infoLower = info.toLowerCase();
    
    for (const [brand, keywords] of Object.entries(models)) {
        if (keywords.some(keyword => infoLower.includes(keyword))) {
            return brand;
        }
    }
    
    return 'unknown';
};