#!/usr/bin/env python3
"""Small educational web proxy and static-file server.

Run from the repository root with: python proxy-server.py
"""

from html.parser import HTMLParser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, quote, unquote, urljoin, urlparse
from urllib.request import Request, urlopen
import re


HOST = "127.0.0.1"
PORT = 8000
MAX_BYTES = 8 * 1024 * 1024
ALLOWED_SCHEMES = {"http", "https"}


def target_url(value):
    value = (value or "").strip()
    parsed = urlparse(value)
    if parsed.scheme not in ALLOWED_SCHEMES or not parsed.netloc:
        raise ValueError("Use a complete http:// or https:// URL.")
    return value


def proxy_link(value, base_url, is_css=False):
    if not value or value.startswith(("#", "data:", "javascript:", "mailto:", "tel:", "about:")):
        return value
    absolute = urljoin(base_url, value)
    if urlparse(absolute).scheme not in ALLOWED_SCHEMES:
        return value
    route = "/proxy?url=" + quote(absolute, safe="")
    return route


class HTMLRewriter(HTMLParser):
    URL_ATTRIBUTES = {"href", "src", "action", "poster", "cite", "formaction"}

    def __init__(self, base_url):
        super().__init__(convert_charrefs=False)
        self.base_url = base_url
        self.output = []

    def handle_decl(self, decl):
        self.output.append("<!" + decl + ">")

    def handle_comment(self, data):
        self.output.append("<!--" + data + "-->")

    def handle_entityref(self, name):
        self.output.append("&" + name + ";")

    def handle_charref(self, name):
        self.output.append("&#" + name + ";")

    def handle_data(self, data):
        self.output.append(data)

    def handle_starttag(self, tag, attrs):
        self.output.append(self._tag(tag, attrs, False))

    def handle_startendtag(self, tag, attrs):
        self.output.append(self._tag(tag, attrs, True))

    def handle_endtag(self, tag):
        self.output.append("</" + tag + ">")

    def _tag(self, tag, attrs, self_closing):
        rendered = []
        for name, value in attrs:
            if value is not None and name.lower() in self.URL_ATTRIBUTES:
                value = proxy_link(value, self.base_url)
            elif value is not None and name.lower() == "srcset":
                value = ", ".join(
                    proxy_link(item.strip().rsplit(" ", 1)[0], self.base_url)
                    + (" " + item.strip().rsplit(" ", 1)[1] if " " in item.strip() else "")
                    for item in value.split(",")
                )
            rendered.append(name if value is None else f'{name}="{value}"')
        suffix = " /" if self_closing else ""
        return "<" + tag + (" " + " ".join(rendered) if rendered else "") + suffix + ">"


def rewrite_css(text, base_url):
    def replace(match):
        raw = match.group(1).strip().strip('"\'')
        return "url(" + proxy_link(raw, base_url, True) + ")"

    return re.sub(r"url\(\s*([^)]*?)\s*\)", replace, text, flags=re.IGNORECASE)


class ProxyHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        request = urlparse(self.path)
        if request.path != "/proxy":
            return super().do_GET()

        try:
            remote = target_url(parse_qs(request.query).get("url", [""])[0])
            response = urlopen(Request(remote, headers={"User-Agent": "LocalStudyProxy/1.0"}), timeout=15)
            body = response.read(MAX_BYTES + 1)
            if len(body) > MAX_BYTES:
                raise ValueError("The response is larger than 8 MB.")
            content_type = response.headers.get_content_type()
            if content_type in {"text/html", "application/xhtml+xml"}:
                parser = HTMLRewriter(remote)
                parser.feed(body.decode(response.headers.get_content_charset() or "utf-8", errors="replace"))
                body = "".join(parser.output).encode("utf-8")
                content_type = "text/html"
            elif content_type == "text/css":
                body = rewrite_css(body.decode("utf-8", errors="replace"), remote).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(body)
        except Exception as error:
            message = str(error).encode("utf-8")
            self.send_error(400, message.decode("utf-8", errors="replace"))


if __name__ == "__main__":
    print(f"Proxy running at http://{HOST}:{PORT}")
    ThreadingHTTPServer((HOST, PORT), ProxyHandler).serve_forever()
