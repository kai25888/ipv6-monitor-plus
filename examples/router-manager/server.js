// 路由器管理服务器
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import http from 'http';
import path from 'path';
import fs from 'fs';

import { checkEnv, getEnv } from './config/env.js';
import { RouterOperations } from './lib/operations.js';
import { writeLog, readLogs, cleanLogs, formatTimestamp, isValidIP } from './lib/utils.js';

// 检查环境配置
checkEnv();

// 创建 Express 应用
const app = express();
const server = http.createServer(app);
const PORT = getEnv('PORT');

// 创建路由器操作实例
let routerOps = null;

// 速率限制
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15分钟
    max: getEnv('RATE_LIMIT_MAX'), // 限制请求数
    message: { error: '请求过于频繁，请稍后再试' },
    standardHeaders: true,
    legacyHeaders: false
});

// 中间件配置
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    }
}));
app.use(cors());
app.use(limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 简单的身份验证中间件
const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Basic ')) {
        res.status(401).json({ error: '需要身份验证' });
        return;
    }

    try {
        const base64Credentials = authHeader.split(' ')[1];
        const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
        const [username, password] = credentials.split(':');

        if (username === getEnv('WEB_USERNAME') && password === getEnv('WEB_PASSWORD')) {
            next();
        } else {
            res.status(401).json({ error: '身份验证失败' });
        }
    } catch (error) {
        res.status(401).json({ error: '身份验证格式错误' });
    }
};

// 静态文件服务
const publicDir = path.join(process.cwd(), 'public');
if (fs.existsSync(publicDir)) {
    app.use(express.static(publicDir));
}

// API 路由

// 1. 基础信息
app.get('/', (req, res) => {
    res.json({
        service: '路由器管理工具',
        version: '1.0.0',
        status: 'running',
        timestamp: new Date().toISOString(),
        router: {
            type: getEnv('ROUTER_TYPE'),
            ip: getEnv('ROUTER_IP')
        },
        endpoints: {
            health: 'GET /health',
            status: 'GET /api/status',
            connect: 'POST /api/connect',
            info: 'GET /api/router/info',
            restart_ipv6: 'POST /api/router/restart-ipv6',
            reboot: 'POST /api/router/reboot',
            diagnosis: 'POST /api/diagnosis',
            batch: 'POST /api/batch',
            logs: 'GET /api/logs',
            history: 'GET /api/history'
        },
        authentication: 'Basic Auth Required for API endpoints'
    });
});

// 2. 健康检查
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: '路由器管理工具',
        router: {
            type: getEnv('ROUTER_TYPE'),
            ip: getEnv('ROUTER_IP'),
            configured: !!getEnv('ROUTER_PASSWORD')
        }
    });
});

// 3. 获取服务状态
app.get('/api/status', authenticate, (req, res) => {
    try {
        const status = {
            service: {
                name: '路由器管理工具',
                version: '1.0.0',
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                timestamp: new Date().toISOString()
            },
            router: {
                type: getEnv('ROUTER_TYPE'),
                ip: getEnv('ROUTER_IP'),
                username: getEnv('ROUTER_USERNAME'),
                configured: !!getEnv('ROUTER_PASSWORD')
            },
            client: routerOps ? routerOps.getClientStatus() : null
        };
        
        res.json(status);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 4. 测试路由器连接
app.post('/api/connect', authenticate, async (req, res) => {
    try {
        console.log('📡 收到连接测试请求');
        writeLog('收到连接测试请求');
        
        // 可以接收自定义配置
        const customConfig = req.body || {};
        
        // 创建或更新路由器操作实例
        const config = {
            ip: customConfig.ip || getEnv('ROUTER_IP'),
            username: customConfig.username || getEnv('ROUTER_USERNAME'),
            password: customConfig.password || getEnv('ROUTER_PASSWORD'),
            type: customConfig.type || getEnv('ROUTER_TYPE'),
            key: customConfig.key || getEnv('ROUTER_KEY')
        };
        
        // 验证配置
        if (!config.password) {
            return res.status(400).json({ error: '缺少路由器密码' });
        }
        
        if (!isValidIP(config.ip)) {
            return res.status(400).json({ error: '无效的路由器IP地址' });
        }
        
        routerOps = new RouterOperations(config);
        
        const result = await routerOps.testConnection();
        
        res.json({
            success: result.success,
            message: result.message || result.error,
            data: result,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('连接测试失败:', error.message);
        writeLog(`连接测试失败: ${error.message}`, 'error');
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// 5. 获取路由器信息
app.get('/api/router/info', authenticate, async (req, res) => {
    try {
        if (!routerOps) {
            routerOps = new RouterOperations();
        }
        
        console.log('📊 收到获取路由器信息请求');
        writeLog('获取路由器信息');
        
        const result = await routerOps.getRouterInfo();
        
        res.json({
            success: result.success,
            message: result.message || result.error,
            data: result.data || null,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('获取路由器信息失败:', error.message);
        writeLog(`获取路由器信息失败: ${error.message}`, 'error');
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// 6. 重启 IPv6 模块
app.post('/api/router/restart-ipv6', authenticate, async (req, res) => {
    try {
        if (!routerOps) {
            routerOps = new RouterOperations();
        }
        
        console.log('🔄 收到重启 IPv6 请求');
        writeLog('重启 IPv6 模块');
        
        const result = await routerOps.restartIPv6();
        
        res.json({
            success: result.success,
            message: result.message || result.error,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('重启 IPv6 失败:', error.message);
        writeLog(`重启 IPv6 失败: ${error.message}`, 'error');
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// 7. 重启路由器
app.post('/api/router/reboot', authenticate, async (req, res) => {
    try {
        if (!routerOps) {
            routerOps = new RouterOperations();
        }
        
        const { confirm = false } = req.body;
        
        if (!confirm) {
            return res.status(400).json({ 
                error: '需要确认重启操作',
                message: '请在请求体中设置 confirm: true'
            });
        }
        
        console.log('🔄 收到重启路由器请求');
        writeLog('重启路由器', 'warn');
        
        const result = await routerOps.rebootRouter();
        
        res.json({
            success: result.success,
            message: result.message || result.error,
            warning: '路由器重启后可能需要等待几分钟才能重新连接',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('重启路由器失败:', error.message);
        writeLog(`重启路由器失败: ${error.message}`, 'error');
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// 8. 执行网络诊断
app.post('/api/diagnosis', authenticate, async (req, res) => {
    try {
        if (!routerOps) {
            routerOps = new RouterOperations();
        }
        
        console.log('🔬 收到网络诊断请求');
        writeLog('执行网络诊断');
        
        const result = await routerOps.performNetworkDiagnosis();
        
        res.json({
            success: result.success,
            message: result.message || result.error,
            diagnosis: result.data || null,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('网络诊断失败:', error.message);
        writeLog(`网络诊断失败: ${error.message}`, 'error');
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// 9. 批量操作
app.post('/api/batch', authenticate, async (req, res) => {
    try {
        if (!routerOps) {
            routerOps = new RouterOperations();
        }
        
        const { operations } = req.body;
        
        if (!operations || !Array.isArray(operations)) {
            return res.status(400).json({ 
                error: '需要提供操作列表',
                example: {
                    operations: [
                        { type: 'test_connection' },
                        { type: 'get_info', delay: 1000 },
                        { type: 'restart_ipv6' }
                    ]
                }
            });
        }
        
        if (operations.length > 10) {
            return res.status(400).json({ 
                error: '批量操作最多支持10个操作'
            });
        }
        
        console.log(`🔄 收到批量操作请求 (${operations.length} 个)`);
        writeLog(`执行批量操作: ${operations.length} 个`);
        
        const result = await routerOps.performBatchOperations(operations);
        
        res.json({
            success: result.success,
            message: result.message,
            results: result.results,
            summary: result.summary,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('批量操作失败:', error.message);
        writeLog(`批量操作失败: ${error.message}`, 'error');
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// 10. 获取操作历史
app.get('/api/history', authenticate, (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        
        if (!routerOps) {
            return res.json({
                history: [],
                count: 0,
                message: '路由器操作实例未初始化'
            });
        }
        
        const history = routerOps.getOperationHistory(limit);
        
        res.json({
            history: history,
            count: history.length,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// 11. 获取日志
app.get('/api/logs', authenticate, (req, res) => {
    try {
        const lines = parseInt(req.query.lines) || 100;
        const logs = readLogs(lines);
        
        res.json({
            logs: logs,
            count: logs.length,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// 12. 清理日志
app.delete('/api/logs', authenticate, (req, res) => {
    try {
        cleanLogs();
        writeLog('日志文件已清理');
        
        res.json({
            success: true,
            message: '日志已清理',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// 错误处理中间件
app.use((error, req, res, next) => {
    console.error('服务器错误:', error.message);
    writeLog(`服务器错误: ${error.message}`, 'error');
    res.status(500).json({ 
        error: '服务器内部错误',
        message: error.message,
        timestamp: new Date().toISOString()
    });
});

// 404 处理
app.use((req, res) => {
    res.status(404).json({ 
        error: '接口不存在',
        path: req.path,
        timestamp: new Date().toISOString()
    });
});

// 优雅关闭
const gracefulShutdown = async () => {
    console.log('🛑 收到关闭信号，正在优雅关闭...');
    writeLog('服务收到关闭信号');
    
    // 清理路由器操作实例
    if (routerOps) {
        await routerOps.cleanup();
    }
    
    server.close(() => {
        console.log('✅ 服务器已关闭');
        writeLog('服务器已关闭');
        process.exit(0);
    });

    // 强制关闭超时
    setTimeout(() => {
        console.log('⚠️ 强制关闭服务器');
        writeLog('强制关闭服务器', 'warn');
        process.exit(1);
    }, 10000);
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

// 启动服务器
server.listen(PORT, () => {
    const startMessage = `路由器管理工具启动成功`;
    console.log(`\n🌟 ${startMessage}`);
    console.log(`📡 Web 界面: http://localhost:${PORT}`);
    console.log(`🔐 认证信息: ${getEnv('WEB_USERNAME')} / ${getEnv('WEB_PASSWORD')}`);
    console.log(`🏠 目标路由器: ${getEnv('ROUTER_TYPE')} @ ${getEnv('ROUTER_IP')}`);
    console.log(`👤 路由器用户: ${getEnv('ROUTER_USERNAME')}\n`);
    
    writeLog(startMessage);
    writeLog(`服务监听端口: ${PORT}`);
});