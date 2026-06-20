path = '/home/venservant/bammby/.env.live'
with open(path, 'rb') as f:
    data = f.read()
data = data.replace(b'\r\n', b'\n').replace(b'\r', b'\n')
with open(path, 'wb') as f:
    f.write(data)
