import re

path = '/etc/nginx/conf.d/bammby.conf'
with open(path) as f:
    content = f.read()

# Add cache-control header inside location / block, before proxy_pass
if 'Cache-Control' not in content:
    content = content.replace(
        'location / {\n        proxy_pass http://127.0.0.1:9012;',
        'location / {\n        add_header Cache-Control "no-cache, no-store, must-revalidate";\n        proxy_pass http://127.0.0.1:9012;'
    )
    with open(path, 'w') as f:
        f.write(content)
    print('Added Cache-Control header')
else:
    print('Cache-Control header already present')
