#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
健康检查脚本
"""

import sys
import requests
import os

def main():
    try:
        port = os.environ.get('PORT', 8000)
        url = f'http://localhost:{port}/health'
        
        response = requests.get(url, timeout=5)
        
        if response.status_code == 200:
            print('健康检查通过')
            sys.exit(0)
        else:
            print(f'健康检查失败，状态码: {response.status_code}')
            sys.exit(1)
            
    except Exception as e:
        print(f'健康检查异常: {e}')
        sys.exit(1)

if __name__ == '__main__':
    main()