import os, glob

# Check server-rendered HTML for the publishable key
for path in ['/home/venservant/bammby/web/.next/standalone/.next/server/app/index.html']:
    if os.path.exists(path):
        with open(path) as f:
            content = f.read()
            if 'pk_live_' in content:
                print('Found pk_live_ in server HTML')
            else:
                print('NO pk_live_ in server HTML')

# Check client JS chunks
for pattern in ['/home/venservant/bammby/web/.next/standalone/.next/static/chunks/*.js']:
    for path in glob.glob(pattern):
        with open(path) as f:
            content = f.read()
            if 'pk_live_' in content:
                print(f'Found pk_live_ in {os.path.basename(path)}')
                break
    else:
        print('NO pk_live_ in client JS')
