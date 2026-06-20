import urllib.request, ssl
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE
url = 'https://bammby.suya.surf/_next/static/chunks/05isyq.2hpcgk.css'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
resp = urllib.request.urlopen(req, context=ctx, timeout=10)
css = resp.read().decode('utf-8')
print(f"CSS length: {len(css)} chars")
print(f"First 500 chars:\n{css[:500]}")
print(f"\nLast 200 chars:\n{css[-200:]}")
