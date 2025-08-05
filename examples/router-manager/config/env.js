// 环境配置管理
import dotenv from 'dotenv';

dotenv.config();

const env = {
    // 路由器连接配置
    ROUTER_IP: process.env.ROUTER_IP || '192.168.1.1',
    ROUTER_USERNAME: process.env.ROUTER_USERNAME || 'admin',
    ROUTER_PASSWORD: process.env.ROUTER_PASSWORD,
    ROUTER_KEY: process.env.ROUTER_KEY || '',
    ROUTER_TYPE: process.env.ROUTER_TYPE || 'xiaomi', // xiaomi | huawei
    
    // 服务配置
    PORT: parseInt(process.env.PORT) || 3003,
    TIMEOUT: parseInt(process.env.TIMEOUT) || 30000, // 毫秒
    
    // Web 服务配置
    WEB_USERNAME: process.env.WEB_USERNAME || 'admin',
    WEB_PASSWORD: process.env.WEB_PASSWORD || 'admin123',
    
    // 日志配置
    LOG_LEVEL: process.env.LOG_LEVEL || 'info',
    LOG_TO_FILE: process.env.LOG_TO_FILE === 'true',
    
    // 安全配置
    SESSION_SECRET: process.env.SESSION_SECRET || 'router-manager-secret',
    RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX) || 100
};

export const checkEnv = () => {
    const required = ['ROUTER_PASSWORD'];
    let valid = true;
    
    required.forEach(key => {
        if (!env[key]) {
            console.error(`❌ 必需的环境变量 ${key} 未设置`);
            valid = false;
        }
    });
    
    if (!valid) {
        console.error('请设置必需的环境变量后重新启动服务');
        console.error('示例: ROUTER_PASSWORD=your_password npm start');
        process.exit(1);
    }
    
    console.log('✅ 环境配置检查通过');
    console.log(`📍 路由器: ${env.ROUTER_TYPE} @ ${env.ROUTER_IP}`);
    console.log(`🔐 用户: ${env.ROUTER_USERNAME}`);
    console.log(`🌐 服务端口: ${env.PORT}`);
    
    return valid;
};

export const getEnv = (key) => {
    return env[key];
};

export default env;