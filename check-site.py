import urllib.request, ssl
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE
req = urllib.request.Request('https://bammby.suya.surf/', headers={'User-Agent': 'Mozilla/5.0'})
resp = urllib.request.urlopen(req, context=ctx, timeout=15)
html = resp.read().decode('utf-8', errors='replace')
print(html[:2000])
print('\n--- CSS/JS links ---')
import re
for m in re.findall(r'src=["\']([^"\']+)["\']|href=["\']([^"\']+)["\']', html):
    url = m[0] or m[1]
    if '.css' in url or '.js' in url:
        print(url)
