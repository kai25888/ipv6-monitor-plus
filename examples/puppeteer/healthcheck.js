const http = require('http');

const options = {
  hostname: 'localhost',
  port: process.env.PORT || 3000,
  path: '/health',
  method: 'GET',
  timeout: 5000
};

const req = http.request(options, (res) => {
  if (res.statusCode === 200) {
    console.log('健康检查通过');
    process.exit(0);
  } else {
    console.log(`健康检查失败，状态码: ${res.statusCode}`);
    process.exit(1);
  }
});

req.on('error', (error) => {
  console.log(`健康检查请求失败: ${error.message}`);
  process.exit(1);
});

req.on('timeout', () => {
  console.log('健康检查超时');
  req.destroy();
  process.exit(1);
});

req.end();