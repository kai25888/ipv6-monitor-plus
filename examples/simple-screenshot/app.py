#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
简单截图服务
基于 Selenium + Chrome 的网页截图 API 服务
"""

import os
import io
import logging
import tempfile
from datetime import datetime
from urllib.parse import urlparse

from flask import Flask, request, jsonify, send_file
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from PIL import Image

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Chrome 配置
CHROME_OPTIONS = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--headless',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    '--disable-features=TranslateUI',
    '--disable-web-security',
    '--disable-extensions',
    '--window-size=1920,1080'
]

CHROME_BINARY = '/usr/bin/chromium-browser'

class ScreenshotService:
    """截图服务类"""
    
    def __init__(self):
        self.driver = None
    
    def _create_driver(self):
        """创建 Chrome 驱动"""
        try:
            chrome_options = Options()
            
            # 添加 Chrome 选项
            for option in CHROME_OPTIONS:
                chrome_options.add_argument(option)
            
            # 设置二进制路径
            chrome_options.binary_location = CHROME_BINARY
            
            # 禁用图片加载以提高速度（可选）
            prefs = {
                "profile.managed_default_content_settings.images": 2,
                "profile.default_content_setting_values.notifications": 2,
            }
            chrome_options.add_experimental_option("prefs", prefs)
            
            # 创建驱动
            self.driver = webdriver.Chrome(options=chrome_options)
            self.driver.set_page_load_timeout(30)
            
            logger.info("Chrome 驱动创建成功")
            return True
            
        except Exception as e:
            logger.error(f"Chrome 驱动创建失败: {e}")
            return False
    
    def take_screenshot(self, url, width=1920, height=1080, full_page=False, element_selector=None):
        """截图方法"""
        try:
            # 创建驱动
            if not self._create_driver():
                raise Exception("驱动创建失败")
            
            # 设置窗口大小
            self.driver.set_window_size(width, height)
            
            # 访问页面
            logger.info(f"访问页面: {url}")
            self.driver.get(url)
            
            # 等待页面加载
            WebDriverWait(self.driver, 10).until(
                EC.presence_of_element_located((By.TAG_NAME, "body"))
            )
            
            # 截图
            if element_selector:
                # 截取特定元素
                element = self.driver.find_element(By.CSS_SELECTOR, element_selector)
                screenshot = element.screenshot_as_png
            elif full_page:
                # 全页截图
                # 获取页面总高度
                total_height = self.driver.execute_script("return document.body.scrollHeight")
                self.driver.set_window_size(width, total_height)
                screenshot = self.driver.get_screenshot_as_png()
            else:
                # 可视区域截图
                screenshot = self.driver.get_screenshot_as_png()
            
            logger.info("截图成功")
            return screenshot
            
        except Exception as e:
            logger.error(f"截图失败: {e}")
            raise e
        finally:
            # 关闭驱动
            if self.driver:
                self.driver.quit()
                self.driver = None

# 创建截图服务实例
screenshot_service = ScreenshotService()

def validate_url(url):
    """验证 URL 格式"""
    try:
        result = urlparse(url)
        return all([result.scheme, result.netloc])
    except Exception:
        return False

@app.route('/', methods=['GET'])
def home():
    """首页"""
    return jsonify({
        'message': '简单截图服务',
        'version': '1.0.0',
        'endpoints': [
            'GET / - 服务信息',
            'GET /health - 健康检查',
            'POST /screenshot - 截图',
            'GET /screenshot - 快速截图（通过 URL 参数）'
        ]
    })

@app.route('/health', methods=['GET'])
def health():
    """健康检查"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'chrome_binary': CHROME_BINARY
    })

@app.route('/screenshot', methods=['GET', 'POST'])
def screenshot():
    """截图接口"""
    try:
        if request.method == 'GET':
            # GET 请求：通过 URL 参数
            url = request.args.get('url')
            width = int(request.args.get('width', 1920))
            height = int(request.args.get('height', 1080))
            full_page = request.args.get('full_page', 'false').lower() == 'true'
            element_selector = request.args.get('element')
        else:
            # POST 请求：通过 JSON 数据
            data = request.get_json() or {}
            url = data.get('url')
            width = int(data.get('width', 1920))
            height = int(data.get('height', 1080))
            full_page = data.get('full_page', False)
            element_selector = data.get('element')
        
        # 验证参数
        if not url:
            return jsonify({'error': '缺少 URL 参数'}), 400
        
        if not validate_url(url):
            return jsonify({'error': 'URL 格式无效'}), 400
        
        if not (100 <= width <= 4000) or not (100 <= height <= 4000):
            return jsonify({'error': '宽度和高度必须在 100-4000 之间'}), 400
        
        # 执行截图
        screenshot_data = screenshot_service.take_screenshot(
            url=url,
            width=width,
            height=height,
            full_page=full_page,
            element_selector=element_selector
        )
        
        # 返回图片
        return send_file(
            io.BytesIO(screenshot_data),
            mimetype='image/png',
            as_attachment=True,
            download_name=f'screenshot_{int(datetime.now().timestamp())}.png'
        )
        
    except Exception as e:
        logger.error(f"截图接口错误: {e}")
        return jsonify({'error': str(e)}), 500

@app.errorhandler(404)
def not_found(error):
    """404 错误处理"""
    return jsonify({'error': '接口不存在'}), 404

@app.errorhandler(500)
def internal_error(error):
    """500 错误处理"""
    return jsonify({'error': '服务器内部错误'}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8000))
    debug = os.environ.get('DEBUG', 'false').lower() == 'true'
    
    logger.info(f"启动截图服务，端口: {port}")
    app.run(host='0.0.0.0', port=port, debug=debug)