#!/usr/bin/env python3
"""Zero to Diamond — isolated static preview server for the entire repository.

No credentials or production APIs. Normal project pages are read-only; only the
separate /__staging__/api/ namespace accepts synthetic SQLite test transactions.
Public URLs retain their original repository prefix.
"""
from __future__ import annotations

import argparse
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit
import html
import json
import os
import re
import tempfile
from synthetic_crm import SyntheticCRM, LabError

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
  notice.innerHTML='AMBIENTE DI COLLAUDO · ZERO TO DIAMOND <small>Dati sintetici · Servizi esterni e invii reali bloccati · <a href="/__staging__/">Indice test</a> · <a href="/__staging__/funnel.html">Funnel simulato</a></small>';
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
    server_version = "ZTDSandbox/2.0"
    sandbox_db = None

    def db(self):
        if self.server.sandbox_db is None:
            raise RuntimeError("Synthetic staging database is not configured")
        return self.server.sandbox_db

    def _api_path(self):
        return urlsplit(self.path).path

    def _json_reply(self, status, payload):
        content = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(content)))
        self.end_headers()
        self.wfile.write(content)

    def _api_error(self, error):
        self._json_reply(error.status, {"ok": False, "error": error.code, "message": str(error),
                                        "simulated": True})

    def _check_lab_origin(self):
        origin = self.headers.get("Origin", "")
        host = self.headers.get("Host", "")
        # CSRF protection also works through Codespaces HTTPS port forwarding.
        if not origin or not host or urlsplit(origin).netloc.lower() != host.lower():
            raise LabError("forbidden_origin", "Solo richieste dalla stessa origine staging", status=403)
        if self.headers.get("X-Staging-Lab") != "synthetic-only":
            raise LabError("forbidden_header", "Header di collaudo obbligatorio", status=403)
        if not self.headers.get("Content-Type", "").lower().startswith("application/json"):
            raise LabError("invalid_media_type", "Inviare solo JSON di prova", status=415)

    def _api_post(self):
        self._check_lab_origin()
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            raise LabError("invalid_body", "Dimensione richiesta non valida", status=400)
        if not 0 < length <= 4096:
            raise LabError("invalid_body", "Richiesta vuota o troppo grande", status=413)
        try:
            body = json.loads(self.rfile.read(length).decode("utf-8"))
        except (ValueError, UnicodeError):
            raise LabError("invalid_json", "JSON non valido", status=400)
        if not isinstance(body, dict):
            raise LabError("invalid_json", "Atteso un oggetto JSON", status=400)
        path = self._api_path()
        if path == LAB + "api/requests":
            return 201, {"ok": True, "lead": self.db().create(body), "simulated": True}
        if path == LAB + "api/reset":
            if body != {"confirm": "RESET_SYNTHETIC_ONLY"}:
                raise LabError("reset_not_confirmed", "Conferma esplicita obbligatoria", status=422)
            return 200, {"ok": True, **self.db().reset()}
        match = re.fullmatch(re.escape(LAB) + r"api/leads/([1-9][0-9]{0,7})/([a-z]+)", path)
        if match:
            lead = self.db().action(int(match.group(1)), match.group(2), body)
            return 200, {"ok": True, "lead": lead, "simulated": True}
        raise LabError("not_found", "API di collaudo inesistente", status=404)


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

    def do_POST(self):
        if not self._api_path().startswith(LAB + "api/"):
            self.send_error(405, "Production-path writes are blocked in staging")
            return
        try:
            code, payload = self._api_post()
            self._json_reply(code, payload)
        except LabError as error:
            self._api_error(error)
        except Exception:
            self._json_reply(500, {"ok": False, "error": "lab_internal_error",
                                  "message": "Errore del database sintetico", "simulated": True})

    def do_PUT(self): self.send_error(405, "Staging writes allowed only via synthetic POST actions")
    def do_PATCH(self): self.send_error(405, "Staging writes allowed only via synthetic POST actions")
    def do_DELETE(self): self.send_error(405, "Staging writes allowed only via synthetic POST actions")

    def do_GET(self):
        if self._api_path() == LAB + "api/state":
            self._json_reply(200, {"ok": True, **self.db().state()})
            return
        if self._api_path() == LAB + "api/health":
            self._json_reply(200, {"ok": True, "mode": "SYNTHETIC_ONLY",
                                  "external_deliveries": 0, "production_connections": 0})
            return
        if self._api_path().startswith(LAB + "api/"):
            self._api_error(LabError("not_found", "API di collaudo inesistente", status=404))
            return
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
    db_path = Path(os.environ.get("STAGING_DB_PATH") or
                   (Path(tempfile.gettempdir()) / f"ztd-synthetic-{os.getuid() if hasattr(os,'getuid') else 'user'}-{args.port}.sqlite3"))
    with ThreadingHTTPServer((args.host, args.port), StagingHandler) as server:
        server.sandbox_db = SyntheticCRM(db_path)
        print(f"ZTD lab: http://127.0.0.1:{args.port}/__staging__/", flush=True)
        print("Synthetic SQLite lab API enabled; all production APIs blocked by CSP.", flush=True)
        server.serve_forever()

if __name__ == "__main__":
    main()
