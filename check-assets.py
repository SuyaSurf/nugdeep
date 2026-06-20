import urllib.request, ssl
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

urls = [
    'https://bammby.suya.surf/_next/static/chunks/05isyq.2hpcgk.css',
    'https://bammby.suya.surf/_next/static/chunks/0-2ex4lpkdav-.js',
]
for url in urls:
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        resp = urllib.request.urlopen(req, context=ctx, timeout=10)
        print(f"{url}: {resp.status} {resp.headers.get('content-type', 'unknown')}")
    except Exception as e:
        print(f"{url}: ERROR - {e}")
