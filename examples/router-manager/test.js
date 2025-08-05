// 路由器管理工具测试脚本
import { RouterOperations } from './lib/operations.js';
import { RouterClientFactory } from './lib/router-client.js';
import { getEnv, checkEnv } from './config/env.js';
import { isValidIP, checkPort, formatTimestamp } from './lib/utils.js';

console.log('🧪 路由器管理工具测试开始...\n');

// 检查环境配置
if (!checkEnv()) {
    console.error('❌ 环境配置检查失败');
    process.exit(1);
}

async function runTests() {
    const tests = [
        { name: '环境配置测试', fn: testEnvironment },
        { name: '工具函数测试', fn: testUtilFunctions },
        { name: '路由器客户端测试', fn: testRouterClient },
        { name: '路由器操作测试', fn: testRouterOperations },
        { name: '网络连接测试', fn: testNetworkConnection }
    ];

    const results = [];

    for (const test of tests) {
        console.log(`\n🔬 执行测试: ${test.name}`);
        console.log('─'.repeat(50));
        
        const startTime = Date.now();
        
        try {
            const result = await test.fn();
            const duration = Date.now() - startTime;
            
            results.push({
                name: test.name,
                success: true,
                result: result,
                duration: duration
            });
            
            console.log(`✅ ${test.name} 通过 (${duration}ms)`);
        } catch (error) {
            const duration = Date.now() - startTime;
            
            results.push({
                name: test.name,
                success: false,
                error: error.message,
                duration: duration
            });
            
            console.log(`❌ ${test.name} 失败: ${error.message} (${duration}ms)`);
        }
    }

    // 输出测试总结
    console.log('\n' + '='.repeat(60));
    console.log('📊 测试结果总结');
    console.log('='.repeat(60));
    
    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;
    const successRate = (successCount / totalCount * 100).toFixed(1);
    
    console.log(`总测试数: ${totalCount}`);
    console.log(`通过数: ${successCount}`);
    console.log(`失败数: ${totalCount - successCount}`);
    console.log(`成功率: ${successRate}%`);
    
    results.forEach(result => {
        const status = result.success ? '✅' : '❌';
        console.log(`${status} ${result.name} (${result.duration}ms)`);
        if (!result.success) {
            console.log(`   错误: ${result.error}`);
        }
    });

    if (successCount === totalCount) {
        console.log('\n🎉 所有测试通过！服务可以正常使用。');
        process.exit(0);
    } else {
        console.log('\n⚠️ 部分测试失败，请检查配置和网络连接。');
        process.exit(1);
    }
}

// 测试环境配置
async function testEnvironment() {
    const config = {
        routerIP: getEnv('ROUTER_IP'),
        routerType: getEnv('ROUTER_TYPE'),
        routerUsername: getEnv('ROUTER_USERNAME'),
        hasPassword: !!getEnv('ROUTER_PASSWORD'),
        hasKey: !!getEnv('ROUTER_KEY'),
        port: getEnv('PORT'),
        timeout: getEnv('TIMEOUT')
    };

    console.log('配置信息:');
    console.log(`  路由器: ${config.routerType} @ ${config.routerIP}`);
    console.log(`  用户名: ${config.routerUsername}`);
    console.log(`  密码: ${config.hasPassword ? '已设置' : '未设置'}`);
    console.log(`  密钥: ${config.hasKey ? '已设置' : '未设置'}`);
    console.log(`  服务端口: ${config.port}`);
    console.log(`  超时时间: ${config.timeout}ms`);

    if (!config.hasPassword) {
        throw new Error('路由器密码未设置');
    }

    if (!isValidIP(config.routerIP)) {
        throw new Error('路由器IP地址格式无效');
    }

    if (!['xiaomi', 'huawei'].includes(config.routerType.toLowerCase())) {
        throw new Error('不支持的路由器类型');
    }

    return config;
}

// 测试工具函数
async function testUtilFunctions() {
    console.log('测试工具函数...');
    
    const tests = [];

    // 测试IP地址验证
    const ipTests = [
        { ip: '192.168.1.1', expected: true },
        { ip: '192.168.31.1', expected: true },
        { ip: '10.0.0.1', expected: true },
        { ip: '256.1.1.1', expected: false },
        { ip: 'invalid', expected: false },
        { ip: '', expected: false }
    ];

    let ipValidationPassed = true;
    for (const test of ipTests) {
        if (isValidIP(test.ip) !== test.expected) {
            ipValidationPassed = false;
            break;
        }
    }

    tests.push({ 
        name: 'IP地址验证', 
        success: ipValidationPassed,
        error: ipValidationPassed ? null : 'IP地址验证逻辑错误'
    });

    // 测试时间戳格式化
    const timestamp = formatTimestamp();
    const timestampValid = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(timestamp);
    
    tests.push({ 
        name: '时间戳格式化', 
        success: timestampValid,
        error: timestampValid ? null : '时间戳格式错误'
    });

    tests.forEach(test => {
        const status = test.success ? '✅' : '❌';
        console.log(`  ${status} ${test.name}`);
        if (!test.success) {
            console.log(`    错误: ${test.error}`);
        }
    });

    const allPassed = tests.every(test => test.success);
    if (!allPassed) {
        throw new Error('部分工具函数测试失败');
    }

    return { tests: tests, allPassed: allPassed };
}

// 测试路由器客户端
async function testRouterClient() {
    console.log('测试路由器客户端创建...');
    
    const config = {
        ip: getEnv('ROUTER_IP'),
        username: getEnv('ROUTER_USERNAME'),
        password: getEnv('ROUTER_PASSWORD'),
        type: getEnv('ROUTER_TYPE'),
        key: getEnv('ROUTER_KEY')
    };

    // 测试客户端工厂
    const client = RouterClientFactory.create(config);
    
    if (!client) {
        throw new Error('客户端创建失败');
    }

    console.log(`  ✅ ${config.type} 客户端创建成功`);
    console.log(`  路由器类型: ${client.config.type}`);
    console.log(`  路由器地址: ${client.config.ip}`);
    console.log(`  连接状态: ${client.isConnected() ? '已连接' : '未连接'}`);

    return {
        clientType: client.config.type,
        routerIP: client.config.ip,
        configured: true
    };
}

// 测试路由器操作
async function testRouterOperations() {
    console.log('测试路由器操作管理器...');
    
    const routerOps = new RouterOperations();
    
    if (!routerOps) {
        throw new Error('路由器操作管理器创建失败');
    }

    console.log('  ✅ 路由器操作管理器创建成功');
    
    // 测试状态获取
    const status = routerOps.getClientStatus();
    console.log(`  客户端状态: ${JSON.stringify(status)}`);
    
    // 测试操作历史
    const history = routerOps.getOperationHistory();
    console.log(`  操作历史记录数: ${history.length}`);

    return {
        operationsManager: true,
        clientStatus: status,
        historyCount: history.length
    };
}

// 测试网络连接
async function testNetworkConnection() {
    console.log('测试网络连接...');
    
    const routerIP = getEnv('ROUTER_IP');
    const tests = [];

    // 测试基本网络连通性
    console.log(`  测试路由器连通性: ${routerIP}`);
    const portTest = await checkPort(routerIP, 80, 5000);
    
    tests.push({
        name: `路由器连通性 (${routerIP}:80)`,
        success: portTest.success,
        responseTime: portTest.responseTime,
        error: portTest.error
    });

    // 测试外部网络连通性
    console.log('  测试外部网络连通性...');
    try {
        const response = await fetch('https://httpbin.org/ip', {
            signal: AbortSignal.timeout(5000)
        });
        
        tests.push({
            name: '外部网络连通性',
            success: response.ok,
            status: response.status
        });
    } catch (error) {
        tests.push({
            name: '外部网络连通性',
            success: false,
            error: error.message
        });
    }

    tests.forEach(test => {
        const status = test.success ? '✅' : '❌';
        console.log(`  ${status} ${test.name}`);
        if (test.responseTime) {
            console.log(`    响应时间: ${test.responseTime}ms`);
        }
        if (!test.success && test.error) {
            console.log(`    错误: ${test.error}`);
        }
    });

    const networkOK = tests.filter(t => t.success).length > 0;
    if (!networkOK) {
        throw new Error('所有网络连接测试都失败了');
    }

    return {
        tests: tests,
        networkStatus: 'partial_ok'
    };
}

// 运行测试
runTests().catch(error => {
    console.error('\n❌ 测试执行失败:', error.message);
    process.exit(1);
});