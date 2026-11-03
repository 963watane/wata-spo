# Local dev server with caching turned off, so edits show up on refresh.
# It also answers Range requests, so videos can be scrubbed in the browser, and lets
# tools/model-prep.html save finished models into assets/models.
# Run:  py serve.py   then open http://localhost:8765
import os
import re
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

PORT = 8765
# Only plain model / texture names, only into assets/models, only from pages this server served.
SAVE_PATH = re.compile(r'^/assets/models/[a-z0-9][a-z0-9-]{0,60}\.(gltf\.json|glb|jpg|png)$')
SAVE_ORIGIN = re.compile(r'^http://(localhost|127\.\d+\.\d+\.\d+):%d$' % PORT)
SAVE_MAX = 40 * 1024 * 1024


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Accept-Ranges', 'bytes')
        super().end_headers()

    def send_head(self):
        self._left = None
        rng = self.headers.get('Range')
        path = self.translate_path(self.path)
        m = re.match(r'bytes=(\d*)-(\d*)$', rng.strip()) if rng else None
        if not m or not os.path.isfile(path) or not (m.group(1) or m.group(2)):
            return super().send_head()
        size = os.path.getsize(path)
        if m.group(1):
            start = int(m.group(1))
            end = int(m.group(2)) if m.group(2) else size - 1
        else:  # "bytes=-N": the last N bytes
            start, end = max(0, size - int(m.group(2))), size - 1
        end = min(end, size - 1)
        if start > end:
            self.send_error(416)
            return None
        f = open(path, 'rb')
        f.seek(start)
        self.send_response(206)
        self.send_header('Content-Type', self.guess_type(path))
        self.send_header('Content-Range', f'bytes {start}-{end}/{size}')
        self.send_header('Content-Length', str(end - start + 1))
        self.end_headers()
        self._left = end - start + 1
        return f

    def do_PUT(self):
        size = int(self.headers.get('Content-Length', 0))
        ok = (self.client_address[0].startswith('127.') and SAVE_ORIGIN.match(self.headers.get('Origin', ''))
              and SAVE_PATH.match(self.path) and 0 < size <= SAVE_MAX)
        if not ok:
            self.send_error(403)
            return
        data = self.rfile.read(size)
        with open(self.translate_path(self.path), 'wb') as f:
            f.write(data)
        self.send_response(200)
        self.end_headers()

    def copyfile(self, source, outputfile):
        left = getattr(self, '_left', None)
        if left is None:
            return super().copyfile(source, outputfile)
        try:
            while left > 0:
                chunk = source.read(min(1 << 20, left))
                if not chunk:
                    break
                outputfile.write(chunk)
                left -= len(chunk)
        except (BrokenPipeError, ConnectionResetError):
            pass


ThreadingHTTPServer.allow_reuse_address = True
with ThreadingHTTPServer(('', PORT), NoCacheHandler) as httpd:
    print(f'Serving on http://localhost:{PORT}')
    httpd.serve_forever()
