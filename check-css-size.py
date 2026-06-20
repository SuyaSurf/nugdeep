import os
p = '/home/venservant/bammby/web/.next/static/chunks/00qbidn4kipu3.css'
print(os.path.getsize(p))
with open(p) as f:
    content = f.read()
    print('Has bg-slate-950:', 'bg-slate-950' in content)
    print('Has backdrop-blur:', 'backdrop-blur' in content)
    print('Length:', len(content))
    print('First 300 chars:', content[:300])
