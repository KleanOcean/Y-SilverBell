#!/usr/bin/env python3
"""启动本地 HTTP 服务并打开 Skeleton Viewer。"""

import http.server
import os
import socketserver
import sys
import threading
import webbrowser

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8888
os.chdir(os.path.dirname(os.path.abspath(__file__)))

with socketserver.TCPServer(("", PORT), http.server.SimpleHTTPRequestHandler) as httpd:
    url = f"http://localhost:{PORT}/index.html"
    print(f"Skeleton Viewer: {url}")
    print("Ctrl+C to stop")
    threading.Timer(0.5, webbrowser.open, args=[url]).start()
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")
