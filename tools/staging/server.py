#!/usr/bin/env python3
"""Zero to Diamond — isolated static preview server for the entire repository.

No credentials, no production APIs, no write handlers. Public URLs that normally
begin /joseph-link-in-bio-Copia/ resolve against this checkout unchanged.
"""
from __future__ import annotations

import argparse
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit
import html
import os
import re

ROOT = Path(__file__).resolve().parents[2]
PREFIX = "/joseph-link-in-bio-Copia"
LAB = "/__staging__/"
SCRIPT = """
<style id="ztd-sandbox-style">
#ztd-sandbox{position:sticky;top:0;z-index:2147483000;background:#472305;color:#fff;
  padding:9px 15px;text-align:center;font:700 13px/1.45 system-ui,Arial,sans-serif;
  border-bottom:3px solid #f5bf66}
#ztd-sandbox small{font-weight:400;margin-left:10px}
#ztd-sandbox a{color:#fff;text-decoration:underline}
#ztd-sandbox-feedback{position:fixed;left:15px;bottom:12px;z-index:2147483001;
  background:#472305;color:white;padding:12px 15px;border-radius:5px;display:none;
  font:13px system-ui,Arial,sans-serif}
</style>
<script>
(()=>{'use strict';if(window.__ZTD_SANDBOX__)return;
  window.__ZTD_SANDBOX__=true;
  const notice=document.createElement('aside');
  notice.id='ztd-sandbox';
  notice.innerHTML='AMBIENTE DI COLLAUDO · ZERO TO DIAMOND <small>Dati sintetici · Servizi esterni e invii reali bloccati · <a href="/__staging__/">Indice test</a></small>';
  const toast=document.createElement('div');toast.id='ztd-sandbox-feedback';toast.setAttribute('role','status');
  const alertBlocked=()=>{toast.textContent='Collegamento esterno bloccato nel laboratorio. Non inviare messaggi reali.';toast.style.display='block'};
  function attach(){document.body.prepend(notice);document.body.append(toast)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',attach,{once:true});else attach();
  document.addEventListener('click',event=>{
    const link=event.target.closest?.('a[href]');
    if(!link)return;
    try{const dest=new URL(link.href,location.href);
      if((dest.protocol==='https:'||dest.protocol==='http:')&&dest.origin!==location.origin ||
        ['mailto:','tel:','sms:','whatsapp:'].includes(dest.protocol)){
          event.preventDefault();event.stopImmediatePropagation();alertBlocked();
      }
    }catch(_) {}
  },true);
  document.addEventListener('submit',event=>{
    // Native POSTs and external form submissions are never allowed in staging.
    const form=event.target;
    const action=new URL(form.action||location.href,location.href);
    if(form.method.toLowerCase()!=='get'||action.origin!==location.origin){
      event.preventDefault();event.stopImmediatePropagation();alertBlocked();
    }
  },true);
  const nativeOpen=window.open.bind(window);
  window.open=(url,target,features)=>{try{if(new URL(url,location.href).origin!==location.origin){
     alertBlocked();return null
  }}catch(_){alertBlocked();return null}
  return nativeOpen(url,target,features)};
})();
</script>
"""
CSP = (
    "default-src 'self' data: blob:; "
    "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com "
    "https://unpkg.com https://cdn.sheetjs.com https://cdn.jsdelivr.net; "
    "style-src 'self' 'unsafe-inline' https:; "
    "img-src 'self' data: blob: https:; "
    "font-src 'self' data: https:; "
    "frame-src 'self' blob:; "
    "connect-src 'self'; form-action 'none'; "
    "object-src 'none'; base-uri 'self'"
)

class StagingHandler(SimpleHTTPRequestHandler):
    server_version = "ZTDSandbox/1.0"

    def _site_path(self) -> str:
        path = unquote(urlsplit(self.path).path)
        if path in ("/", "/index.html"):
            return "/tools/staging/index.html"
        if path.startswith(LAB):
            return "/tools/staging/" + path[len(LAB):]
        if path == PREFIX:
            return "/index.html"
        if path.startswith(PREFIX + "/"):
            return path[len(PREFIX):]
        return path

    def translate_path(self, path: str) -> str:
        # Resolve symlinks and traversal safely within this checkout.
        current = self._site_path()
        candidate = (ROOT / current.lstrip("/")).resolve()
        if not candidate.is_relative_to(ROOT.resolve()):
            return str(ROOT / "404.html")
        return str(candidate)

    def send_response(self, code, message=None):
        super().send_response(code, message)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
        self.send_header("X-Robots-Tag", "noindex, nofollow")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Content-Security-Policy", CSP)
        super().end_headers()

    def do_POST(self): self.send_error(405, "Staging is read-only")
    def do_PUT(self): self.send_error(405, "Staging is read-only")
    def do_PATCH(self): self.send_error(405, "Staging is read-only")
    def do_DELETE(self): self.send_error(405, "Staging is read-only")

    def do_GET(self):
        if self._site_path().endswith(".html") or self._site_path().endswith("/"):
            path = Path(self.translate_path(self.path))
            if path.is_dir():
                path = path / "index.html"
            if path.is_file() and path.suffix == ".html":
                source = path.read_text(encoding="utf-8", errors="replace")
                insert = re.sub(r"(?i)</head>", SCRIPT + "</head>", source, count=1)
                if insert == source:
                    insert = SCRIPT + source
                data = insert.encode("utf-8")
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Content-Length", str(len(data)))
                self.end_headers()
                self.wfile.write(data)
                return
        super().do_GET()

    def log_message(self, fmt, *args):
        super().log_message("[STAGING] " + fmt, *args)

def main():
    parser = argparse.ArgumentParser(description="Launch read-only ZTD lab")
    parser.add_argument("--host", default=os.environ.get("STAGING_HOST", "0.0.0.0"))
    parser.add_argument("--port", type=int, default=int(os.environ.get("STAGING_PORT", "8765")))
    args = parser.parse_args()
    with ThreadingHTTPServer((args.host, args.port), StagingHandler) as server:
        print(f"ZTD lab: http://127.0.0.1:{args.port}/__staging__/", flush=True)
        print("Read-only HTTP server; production APIs blocked by CSP.", flush=True)
        server.serve_forever()

if __name__ == "__main__":
    main()
