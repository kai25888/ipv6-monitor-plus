#!/usr/bin/env node

// 路由器管理命令行工具
import { Command } from 'commander';
import { RouterOperations } from './lib/operations.js';
import { getEnv } from './config/env.js';
import { formatTimestamp, isValidIP } from './lib/utils.js';

const program = new Command();

// 配置命令行程序
program
    .name('router-cli')
    .description('路由器管理命令行工具')
    .version('1.0.0');

// 全局选项
program
    .option('-i, --ip <ip>', '路由器IP地址', getEnv('ROUTER_IP'))
    .option('-u, --username <username>', '路由器用户名', getEnv('ROUTER_USERNAME'))
    .option('-p, --password <password>', '路由器密码', getEnv('ROUTER_PASSWORD'))
    .option('-t, --type <type>', '路由器类型 (xiaomi|huawei)', getEnv('ROUTER_TYPE'))
    .option('-k, --key <key>', '路由器密钥 (小米路由器)', getEnv('ROUTER_KEY'))
    .option('--timeout <ms>', '超时时间 (毫秒)', getEnv('TIMEOUT'))
    .option('--verbose', '显示详细信息');

// 创建路由器操作实例
function createRouterOps(options) {
    const config = {
        ip: options.ip,
        username: options.username,
        password: options.password,
        type: options.type,
        key: options.key,
        timeout: parseInt(options.timeout) || 30000
    };

    // 验证必需配置
    if (!config.password) {
        console.error('❌ 错误: 缺少路由器密码');
        console.error('请设置环境变量 ROUTER_PASSWORD 或使用 -p 参数');
        process.exit(1);
    }

    if (!isValidIP(config.ip)) {
        console.error('❌ 错误: 无效的路由器IP地址:', config.ip);
        process.exit(1);
    }

    if (options.verbose) {
        console.log('🔧 路由器配置:');
        console.log(`   类型: ${config.type}`);
        console.log(`   地址: ${config.ip}`);
        console.log(`   用户: ${config.username}`);
        console.log(`   密码: ${'*'.repeat(config.password.length)}`);
        console.log(`   超时: ${config.timeout}ms\n`);
    }

    return new RouterOperations(config);
}

// 格式化输出结果
function formatResult(result, operation) {
    const timestamp = formatTimestamp();
    
    if (result.success) {
        console.log(`✅ [${timestamp}] ${operation} 成功`);
        if (result.message) {
            console.log(`   消息: ${result.message}`);
        }
        if (result.data) {
            console.log('   数据:', JSON.stringify(result.data, null, 2));
        }
    } else {
        console.log(`❌ [${timestamp}] ${operation} 失败`);
        if (result.error) {
            console.log(`   错误: ${result.error}`);
        }
    }
}

// 连接测试命令
program
    .command('connect')
    .description('测试路由器连接')
    .action(async (cmd, options) => {
        const parent = cmd.parent || cmd;
        console.log('🔍 测试路由器连接...\n');
        
        try {
            const routerOps = createRouterOps(parent.opts());
            const result = await routerOps.testConnection();
            formatResult(result, '连接测试');
        } catch (error) {
            console.error('❌ 连接测试异常:', error.message);
            process.exit(1);
        }
    });

// 获取路由器信息命令
program
    .command('info')
    .description('获取路由器信息')
    .action(async (cmd, options) => {
        const parent = cmd.parent || cmd;
        console.log('📊 获取路由器信息...\n');
        
        try {
            const routerOps = createRouterOps(parent.opts());
            const result = await routerOps.getRouterInfo();
            formatResult(result, '获取路由器信息');
        } catch (error) {
            console.error('❌ 获取信息异常:', error.message);
            process.exit(1);
        }
    });

// 重启IPv6命令
program
    .command('restart-ipv6')
    .description('重启IPv6模块')
    .option('-f, --force', '强制重启（跳过确认）')
    .action(async (options, cmd) => {
        const parent = cmd.parent || cmd;
        
        if (!options.force) {
            console.log('⚠️  即将重启路由器IPv6模块，这可能会中断网络连接');
            console.log('请使用 --force 参数确认执行');
            process.exit(0);
        }
        
        console.log('🔄 重启IPv6模块...\n');
        
        try {
            const routerOps = createRouterOps(parent.opts());
            const result = await routerOps.restartIPv6();
            formatResult(result, 'IPv6重启');
        } catch (error) {
            console.error('❌ IPv6重启异常:', error.message);
            process.exit(1);
        }
    });

// 重启路由器命令
program
    .command('reboot')
    .description('重启路由器')
    .option('-f, --force', '强制重启（跳过确认）')
    .action(async (options, cmd) => {
        const parent = cmd.parent || cmd;
        
        if (!options.force) {
            console.log('⚠️  即将重启路由器，这将中断所有网络连接');
            console.log('请使用 --force 参数确认执行');
            process.exit(0);
        }
        
        console.log('🔄 重启路由器...\n');
        
        try {
            const routerOps = createRouterOps(parent.opts());
            const result = await routerOps.rebootRouter();
            formatResult(result, '路由器重启');
            
            if (result.success) {
                console.log('\n⏳ 路由器重启中，请等待几分钟后再尝试连接');
            }
        } catch (error) {
            console.error('❌ 路由器重启异常:', error.message);
            process.exit(1);
        }
    });

// 网络诊断命令
program
    .command('diagnosis')
    .alias('diag')
    .description('执行网络诊断')
    .action(async (cmd, options) => {
        const parent = cmd.parent || cmd;
        console.log('🔬 执行网络诊断...\n');
        
        try {
            const routerOps = createRouterOps(parent.opts());
            const result = await routerOps.performNetworkDiagnosis();
            
            if (result.success && result.data) {
                const diagnosis = result.data;
                const timestamp = formatTimestamp();
                
                console.log(`📋 [${timestamp}] 诊断报告`);
                console.log(`状态: ${diagnosis.overall.status}`);
                console.log(`评分: ${diagnosis.overall.score}/100\n`);
                
                // 显示各项测试结果
                console.log('🧪 测试结果:');
                for (const [testName, testResult] of Object.entries(diagnosis.tests)) {
                    const status = testResult.success ? '✅' : '❌';
                    console.log(`   ${status} ${testName}: ${testResult.success ? '通过' : '失败'}`);
                    if (!testResult.success && testResult.error) {
                        console.log(`      错误: ${testResult.error}`);
                    }
                }
                
                // 显示建议
                if (diagnosis.overall.recommendations.length > 0) {
                    console.log('\n💡 建议措施:');
                    diagnosis.overall.recommendations.forEach(rec => {
                        console.log(`   • ${rec}`);
                    });
                }
            } else {
                formatResult(result, '网络诊断');
            }
        } catch (error) {
            console.error('❌ 网络诊断异常:', error.message);
            process.exit(1);
        }
    });

// 批量操作命令
program
    .command('batch <operations>')
    .description('执行批量操作 (JSON格式)')
    .option('--dry-run', '仅显示要执行的操作，不实际执行')
    .action(async (operations, options, cmd) => {
        const parent = cmd.parent || cmd;
        
        try {
            const ops = JSON.parse(operations);
            
            if (!Array.isArray(ops)) {
                console.error('❌ 错误: 操作列表必须是数组格式');
                process.exit(1);
            }
            
            console.log(`📝 批量操作 (${ops.length} 个):`);
            ops.forEach((op, index) => {
                console.log(`   ${index + 1}. ${op.type}${op.delay ? ` (延迟: ${op.delay}ms)` : ''}`);
            });
            
            if (options.dryRun) {
                console.log('\n🔍 仅预览模式，未执行实际操作');
                return;
            }
            
            console.log('\n🔄 开始执行...\n');
            
            const routerOps = createRouterOps(parent.opts());
            const result = await routerOps.performBatchOperations(ops);
            
            if (result.success) {
                console.log(`✅ 批量操作完成: ${result.summary.success}/${result.summary.total} 成功\n`);
                
                result.results.forEach((item, index) => {
                    const status = item.result.success ? '✅' : '❌';
                    console.log(`${status} [${index + 1}] ${item.operation.type}: ${item.result.message || item.result.error}`);
                });
            } else {
                formatResult(result, '批量操作');
            }
        } catch (error) {
            if (error instanceof SyntaxError) {
                console.error('❌ 错误: 无效的JSON格式');
                console.error('示例: \'[{"type":"test_connection"},{"type":"restart_ipv6","delay":1000}]\'');
            } else {
                console.error('❌ 批量操作异常:', error.message);
            }
            process.exit(1);
        }
    });

// 状态命令
program
    .command('status')
    .description('显示当前状态')
    .action(async (cmd, options) => {
        const parent = cmd.parent || cmd;
        const timestamp = formatTimestamp();
        
        console.log(`📊 [${timestamp}] 路由器管理工具状态\n`);
        
        console.log('🔧 配置信息:');
        console.log(`   路由器类型: ${parent.opts().type}`);
        console.log(`   路由器地址: ${parent.opts().ip}`);
        console.log(`   用户名: ${parent.opts().username}`);
        console.log(`   密码: ${parent.opts().password ? '已设置' : '未设置'}`);
        console.log(`   超时时间: ${parent.opts().timeout}ms`);
        
        // 简单的连通性测试
        console.log('\n🔍 连通性测试:');
        try {
            const response = await fetch(`http://${parent.opts().ip}`, {
                method: 'HEAD',
                signal: AbortSignal.timeout(5000)
            });
            console.log(`   HTTP连接: ✅ 状态码 ${response.status}`);
        } catch (error) {
            console.log(`   HTTP连接: ❌ ${error.message}`);
        }
    });

// 帮助示例
program
    .command('examples')
    .description('显示使用示例')
    .action(() => {
        console.log('📖 路由器管理工具使用示例:\n');
        
        console.log('1. 基础连接测试:');
        console.log('   router-cli connect\n');
        
        console.log('2. 使用自定义配置:');
        console.log('   router-cli -i 192.168.1.1 -p mypassword -t xiaomi connect\n');
        
        console.log('3. 获取路由器信息:');
        console.log('   router-cli info\n');
        
        console.log('4. 重启IPv6模块:');
        console.log('   router-cli restart-ipv6 --force\n');
        
        console.log('5. 执行网络诊断:');
        console.log('   router-cli diagnosis\n');
        
        console.log('6. 批量操作:');
        console.log('   router-cli batch \'[{"type":"test_connection"},{"type":"restart_ipv6"}]\'\n');
        
        console.log('7. 查看详细信息:');
        console.log('   router-cli --verbose connect\n');
        
        console.log('💡 提示: 使用环境变量可避免每次输入密码');
        console.log('   export ROUTER_PASSWORD=your_password');
        console.log('   export ROUTER_IP=192.168.1.1');
    });

// 错误处理
program.exitOverride();

try {
    program.parse();
} catch (error) {
    if (error.code === 'commander.help') {
        process.exit(0);
    } else if (error.code === 'commander.unknownCommand') {
        console.error('❌ 未知命令，使用 --help 查看可用命令');
        process.exit(1);
    } else {
        console.error('❌ 命令执行失败:', error.message);
        process.exit(1);
    }
}