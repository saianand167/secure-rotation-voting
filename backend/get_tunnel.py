import subprocess

p = subprocess.Popen(['npx', 'localtunnel', '--port', '3000'], stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, shell=True)
for line in p.stdout:
    print(line, end='', flush=True)
    if 'your url is' in line.lower():
        url = line.strip().split()[-1]
        with open('public_url.txt', 'w') as f:
            f.write(url)
        print(f"\n[SUCCESS] Public URL created: {url}", flush=True)
        break
