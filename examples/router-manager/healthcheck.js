// 路由器管理服务健康检查
import http from 'http';
import { getEnv } from './config/env.js';

const PORT = getEnv('PORT') || 3003;

const options = {
    hostname: 'localhost',
    port: PORT,
    path: '/health',
    method: 'GET',
    timeout: 8000
};

const req = http.request(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
        data += chunk;
    });
    
    res.on('end', () => {
        try {
            const response = JSON.parse(data);
            
            if (res.statusCode === 200 && response.status === 'healthy') {
                console.log('✅ 路由器管理服务健康检查通过');
                console.log(`服务状态: ${response.status}`);
                console.log(`路由器配置: ${response.router.configured ? '已配置' : '未配置'}`);
                console.log(`目标路由器: ${response.router.type} @ ${response.router.ip}`);
                process.exit(0);
            } else {
                console.log(`❌ 健康检查失败，状态码: ${res.statusCode}`);
                console.log(`响应: ${data}`);
                process.exit(1);
            }
        } catch (error) {
            console.log(`❌ 健康检查响应解析失败: ${error.message}`);
            console.log(`原始响应: ${data}`);
            process.exit(1);
        }
    });
});

req.on('error', (error) => {
    console.log(`❌ 路由器管理服务健康检查请求失败: ${error.message}`);
    process.exit(1);
});

req.on('timeout', () => {
    console.log('❌ 路由器管理服务健康检查超时');
    req.destroy();
    process.exit(1);
});

req.end();