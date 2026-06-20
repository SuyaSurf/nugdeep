import urllib.request, ssl
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

# Check CSS
url = 'https://bammby.suya.surf/_next/static/chunks/00qbidn4kipu3.css'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
resp = urllib.request.urlopen(req, context=ctx, timeout=10)
css = resp.read().decode('utf-8')
print(f"CSS size: {len(css)} chars")
print(f"Has bg-slate-950: {'bg-slate-950' in css}")
print(f"Has backdrop-blur: {'backdrop-blur' in css}")

# Check homepage
req2 = urllib.request.Request('https://bammby.suya.surf/', headers={'User-Agent': 'Mozilla/5.0'})
resp2 = urllib.request.urlopen(req2, context=ctx, timeout=10)
html = resp2.read().decode('utf-8')
print(f"\nHomepage CSS ref: {'00qbidn4kipu3.css' in html or '05isyq.2hpcgk.css' in html}")
