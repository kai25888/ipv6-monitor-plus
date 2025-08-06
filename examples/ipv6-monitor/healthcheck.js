const http = require('http');

const options = {
  hostname: 'localhost',
  port: process.env.PORT || 3003,
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
    if (res.statusCode === 200) {
      try {
        const healthData = JSON.parse(data);
        console.log('✅ IPv6 Monitor 健康检查通过');
        console.log(`📊 监控状态: ${healthData.monitor ? '运行中' : '已停止'}`);
        process.exit(0);
      } catch (error) {
        console.log('⚠️ 健康检查响应解析失败:', error.message);
        process.exit(1);
      }
    } else {
      console.log(`❌ 健康检查失败，状态码: ${res.statusCode}`);
      process.exit(1);
    }
  });
});

req.on('error', (error) => {
  console.log(`❌ 健康检查请求失败: ${error.message}`);
  process.exit(1);
});

req.on('timeout', () => {
  console.log('⏰ 健康检查超时');
  req.destroy();
  process.exit(1);
});

req.end();