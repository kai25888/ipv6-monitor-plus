// 路由器操作封装模块
import { RouterClientFactory } from './router-client.js';
import { writeLog, retry, sleep } from './utils.js';

/**
 * 路由器操作管理器
 */
export class RouterOperations {
    constructor(config = {}) {
        this.client = RouterClientFactory.create(config);
        this.config = config;
        this.operationHistory = [];
    }

    /**
     * 记录操作历史
     */
    recordOperation(operation, result) {
        const record = {
            id: Math.random().toString(36).substr(2, 9),
            timestamp: new Date().toISOString(),
            operation: operation,
            result: result,
            success: result.success || false
        };

        this.operationHistory.push(record);
        
        // 限制历史记录数量
        if (this.operationHistory.length > 100) {
            this.operationHistory.shift();
        }

        // 写入日志
        const logLevel = result.success ? 'info' : 'error';
        const message = `操作: ${operation} | 结果: ${result.success ? '成功' : '失败'} | ${result.message || result.error || ''}`;
        writeLog(message, logLevel);

        return record;
    }

    /**
     * 获取操作历史
     */
    getOperationHistory(limit = 20) {
        return this.operationHistory.slice(-limit);
    }

    /**
     * 测试路由器连接
     */
    async testConnection() {
        const operation = 'test_connection';
        console.log('🔍 测试路由器连接...');

        try {
            const connected = await retry(() => this.client.connect(), 2, 2000);
            
            if (connected) {
                const result = { 
                    success: true, 
                    message: `成功连接到 ${this.client.config.type} 路由器`,
                    routerType: this.client.config.type,
                    routerIP: this.client.config.ip
                };
                
                this.recordOperation(operation, result);
                console.log('✅ 路由器连接测试成功');
                return result;
            } else {
                throw new Error('连接返回false');
            }
        } catch (error) {
            const result = { 
                success: false, 
                error: error.message,
                routerType: this.client.config.type,
                routerIP: this.client.config.ip
            };
            
            this.recordOperation(operation, result);
            console.log('❌ 路由器连接测试失败');
            return result;
        } finally {
            try {
                await this.client.disconnect();
            } catch (error) {
                console.log('断开连接时出错:', error.message);
            }
        }
    }

    /**
     * 获取路由器信息
     */
    async getRouterInfo() {
        const operation = 'get_router_info';
        console.log('📊 获取路由器信息...');

        try {
            await this.client.connect();
            const info = await this.client.getRouterInfo();
            
            const result = { 
                success: true, 
                message: '成功获取路由器信息',
                data: info
            };
            
            this.recordOperation(operation, result);
            console.log('✅ 路由器信息获取成功');
            return result;
        } catch (error) {
            const result = { 
                success: false, 
                error: error.message
            };
            
            this.recordOperation(operation, result);
            console.log('❌ 路由器信息获取失败');
            return result;
        } finally {
            try {
                await this.client.disconnect();
            } catch (error) {
                console.log('断开连接时出错:', error.message);
            }
        }
    }

    /**
     * 重启 IPv6 模块
     */
    async restartIPv6() {
        const operation = 'restart_ipv6';
        console.log('🔄 重启 IPv6 模块...');

        try {
            await this.client.connect();
            const result = await this.client.restartIPv6();
            
            this.recordOperation(operation, result);
            
            if (result.success) {
                console.log('✅ IPv6 模块重启成功');
            } else {
                console.log('❌ IPv6 模块重启失败');
            }
            
            return result;
        } catch (error) {
            const result = { 
                success: false, 
                error: error.message
            };
            
            this.recordOperation(operation, result);
            console.log('❌ IPv6 模块重启异常');
            return result;
        } finally {
            try {
                await this.client.disconnect();
            } catch (error) {
                console.log('断开连接时出错:', error.message);
            }
        }
    }

    /**
     * 重启路由器
     */
    async rebootRouter() {
        const operation = 'reboot_router';
        console.log('🔄 重启路由器...');

        try {
            await this.client.connect();
            const result = await this.client.rebootRouter();
            
            this.recordOperation(operation, result);
            
            if (result.success) {
                console.log('✅ 路由器重启命令已发送');
            } else {
                console.log('❌ 路由器重启失败');
            }
            
            return result;
        } catch (error) {
            const result = { 
                success: false, 
                error: error.message
            };
            
            this.recordOperation(operation, result);
            console.log('❌ 路由器重启异常');
            return result;
        } finally {
            try {
                await this.client.disconnect();
            } catch (error) {
                console.log('断开连接时出错:', error.message);
            }
        }
    }

    /**
     * 执行网络诊断
     */
    async performNetworkDiagnosis() {
        const operation = 'network_diagnosis';
        console.log('🔬 执行网络诊断...');

        try {
            const diagnosis = {
                timestamp: new Date().toISOString(),
                tests: {}
            };

            // 1. 测试路由器连接
            console.log('1️⃣ 测试路由器连接...');
            diagnosis.tests.routerConnection = await this.testConnection();

            // 2. 获取路由器信息
            if (diagnosis.tests.routerConnection.success) {
                console.log('2️⃣ 获取路由器信息...');
                diagnosis.tests.routerInfo = await this.getRouterInfo();
            }

            // 3. 测试 IPv6 连通性
            console.log('3️⃣ 测试 IPv6 连通性...');
            diagnosis.tests.ipv6Connectivity = await this.testIPv6Connectivity();

            // 4. 汇总结果
            const routerOK = diagnosis.tests.routerConnection.success;
            const infoOK = diagnosis.tests.routerInfo?.success || false;
            
            diagnosis.overall = {
                status: routerOK && infoOK ? 'healthy' : 'unhealthy',
                score: (
                    (routerOK ? 50 : 0) +
                    (infoOK ? 30 : 0) +
                    (diagnosis.tests.ipv6Connectivity.success ? 20 : 0)
                ),
                recommendations: []
            };

            if (!routerOK) {
                diagnosis.overall.recommendations.push('路由器连接失败，请检查网络和认证信息');
            }
            if (!infoOK) {
                diagnosis.overall.recommendations.push('无法获取路由器信息，可能是权限或兼容性问题');
            }

            const result = { 
                success: true, 
                message: '网络诊断完成',
                data: diagnosis
            };
            
            this.recordOperation(operation, result);
            console.log(`🏥 网络诊断完成，状态: ${diagnosis.overall.status} (${diagnosis.overall.score}/100)`);
            return result;

        } catch (error) {
            const result = { 
                success: false, 
                error: error.message
            };
            
            this.recordOperation(operation, result);
            console.log('❌ 网络诊断失败');
            return result;
        }
    }

    /**
     * 测试 IPv6 连通性
     */
    async testIPv6Connectivity() {
        try {
            const testUrls = [
                'https://6.ipw.cn',
                'https://ipv6.google.com',
                'https://test-ipv6.com/ip/'
            ];

            const results = [];
            for (const url of testUrls) {
                try {
                    const response = await fetch(url, {
                        signal: AbortSignal.timeout(10000)
                    });
                    
                    results.push({
                        url: url,
                        success: response.ok,
                        status: response.status,
                        data: response.ok ? await response.text() : null
                    });
                } catch (error) {
                    results.push({
                        url: url,
                        success: false,
                        error: error.message
                    });
                }
            }

            const successCount = results.filter(r => r.success).length;
            
            return {
                success: successCount > 0,
                results: results,
                successRate: successCount / testUrls.length
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 批量操作
     */
    async performBatchOperations(operations) {
        console.log(`🔄 执行批量操作 (${operations.length} 个)...`);
        
        const results = [];
        
        for (let i = 0; i < operations.length; i++) {
            const op = operations[i];
            console.log(`📝 [${i + 1}/${operations.length}] 执行: ${op.type}`);
            
            try {
                let result;
                
                switch (op.type) {
                    case 'test_connection':
                        result = await this.testConnection();
                        break;
                    case 'get_info':
                        result = await this.getRouterInfo();
                        break;
                    case 'restart_ipv6':
                        result = await this.restartIPv6();
                        break;
                    case 'reboot':
                        result = await this.rebootRouter();
                        break;
                    case 'diagnosis':
                        result = await this.performNetworkDiagnosis();
                        break;
                    default:
                        result = { success: false, error: `未知操作类型: ${op.type}` };
                }
                
                results.push({
                    operation: op,
                    result: result,
                    index: i
                });
                
                // 操作间隔
                if (i < operations.length - 1 && op.delay) {
                    console.log(`⏳ 等待 ${op.delay} 毫秒...`);
                    await sleep(op.delay);
                }
                
            } catch (error) {
                results.push({
                    operation: op,
                    result: { success: false, error: error.message },
                    index: i
                });
            }
        }
        
        const successCount = results.filter(r => r.result.success).length;
        console.log(`✅ 批量操作完成: ${successCount}/${operations.length} 成功`);
        
        return {
            success: true,
            message: `批量操作完成: ${successCount}/${operations.length} 成功`,
            results: results,
            summary: {
                total: operations.length,
                success: successCount,
                failed: operations.length - successCount
            }
        };
    }

    /**
     * 获取客户端状态
     */
    getClientStatus() {
        return {
            connected: this.client.isConnected(),
            routerType: this.client.config.type,
            routerIP: this.client.config.ip,
            lastOperationCount: this.operationHistory.length,
            lastOperation: this.operationHistory[this.operationHistory.length - 1] || null
        };
    }

    /**
     * 清理资源
     */
    async cleanup() {
        try {
            await this.client.disconnect();
            console.log('🧹 路由器操作管理器已清理');
        } catch (error) {
            console.error('清理时出错:', error.message);
        }
    }
}