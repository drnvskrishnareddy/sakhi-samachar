# End-to-end check of the web app with simulated Google sign-in and Drive (needs Playwright and a built web app served on :8767).
import json, re, datetime
from urllib.parse import urlparse, parse_qs
from playwright.sync_api import sync_playwright

B='http://localhost:8767'
GIS = """window.google={accounts:{oauth2:{
 initTokenClient:function(cfg){return{requestAccessToken:function(o){window.__gis=(window.__gis||0)+1;
   setTimeout(function(){cfg.callback({access_token:'tok-'+Date.now(),expires_in:3600,scope:cfg.scope})},60)}}},
 hasGrantedAllScopes:function(){return true},
 revoke:function(t,d){window.__revoked=t; d&&d()}}}};"""

drive={'files':{}, 'n':0, 'calls':[]}
CORS={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Authorization, Content-Type','Access-Control-Allow-Methods':'GET, POST, PATCH, DELETE, OPTIONS'}
class R:
    def __init__(s,route): s.route=route; s.request=route.request
    def fulfill(s,status=200,content_type='text/plain',body=''):
        return s.route.fulfill(status=status,headers={**CORS,'Content-Type':content_type},body=body)
def fake(route):
    if route.request.method=='OPTIONS': return route.fulfill(status=204,headers=CORS,body='')
    route=R(route)
    req=route.request; u=urlparse(req.url); m=req.method; q=parse_qs(u.query)
    drive['calls'].append(f'{m} {u.path}')
    if u.path=='/oauth2/v3/userinfo': return route.fulfill(status=200,content_type='application/json',body=json.dumps({'email':'priya@example.com','name':'Priya'}))
    files=drive['files']
    def new(meta,content=''):
        drive['n']+=1; fid=f"f{drive['n']}"; files[fid]={**meta,'id':fid,'trashed':False,'content':content}; return fid
    mid=re.match(r'^/(?:upload/)?drive/v3/files/([^/]+)$',u.path)
    if u.path=='/drive/v3/files' and m=='GET':
        tag=re.search(r"value='(\w+)'",q.get('q',[''])[0]).group(1)
        out=[{'id':f['id']} for f in files.values() if f.get('appProperties',{}).get('sakhi')==tag and not f['trashed']]
        return route.fulfill(status=200,content_type='application/json',body=json.dumps({'files':out}))
    if u.path=='/drive/v3/files' and m=='POST':
        return route.fulfill(status=200,content_type='application/json',body=json.dumps({'id':new(json.loads(req.post_data))}))
    if u.path=='/upload/drive/v3/files' and m=='POST':
        body=req.post_data; parts=re.split(r'\r\n--sakhi\w+(?:--)?',body)
        meta=json.loads(parts[0].split('\r\n\r\n',1)[1]); content=parts[1].split('\r\n\r\n',1)[1]
        return route.fulfill(status=200,content_type='application/json',body=json.dumps({'id':new(meta,content)}))
    if mid:
        f=files.get(mid.group(1))
        if not f: return route.fulfill(status=404,body='nf')
        if m=='DELETE':
            for k in [k for k,v in files.items() if k==f['id'] or f['id'] in v.get('parents',[])]: files.pop(k)
            return route.fulfill(status=204,body='')
        if m=='PATCH': f['content']=req.post_data; return route.fulfill(status=200,content_type='application/json',body=json.dumps({'id':f['id']}))
        if q.get('alt')==['media']: return route.fulfill(status=200,content_type='application/json',body=f['content'])
        return route.fulfill(status=200,content_type='application/json',body=json.dumps({'id':f['id'],'trashed':f['trashed']}))
    return route.fulfill(status=400,body='unexpected')

def ctx(b):
    c=b.new_context(viewport={'width':390,'height':844},device_scale_factor=2)
    c.route('https://accounts.google.com/gsi/client', lambda r: r.fulfill(status=200,content_type='text/javascript',body=GIS))
    c.route('https://www.googleapis.com/**', fake)
    return c

with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome')
    errs=[]
    # ---- phone 1 ----
    c1=ctx(b); pg=c1.new_page(); pg.on('pageerror',lambda e: errs.append(str(e)[:200]))
    pg.goto(B+'/'); pg.wait_for_timeout(3000)
    pg.screenshot(path='g-welcome.png', full_page=True)
    pg.get_by_role('checkbox').first.click(); pg.wait_for_timeout(200)
    pg.get_by_text('Continue with Google').click(); pg.wait_for_timeout(2500)
    t=pg.inner_text('body'); print('signed in, home:', 'Cycle day' in t or 'Start your diary' in t)
    pg.get_by_text('Menses started today').click(); pg.wait_for_timeout(1200)
    pg.get_by_text('Heavy',exact=True).click(); pg.wait_for_timeout(300)
    pg.get_by_text('HMB · Heavy menstrual bleeding').click(); pg.wait_for_timeout(300)
    pg.get_by_label('Go back').first.click(); pg.wait_for_timeout(4000)
    t=pg.inner_text('body'); print('status shows saved:', 'Saved to Drive' in t); print('calls:', drive['calls'][:12])
    pg.screenshot(path='g-home.png')
    files=drive['files'].values()
    folder=[f for f in files if f.get('mimeType')=='application/vnd.google-apps.folder']
    diary=[f for f in files if f.get('appProperties',{}).get('sakhi')=='diary']
    csv=[f for f in files if f.get('appProperties',{}).get('sakhi')=='csv']
    print('drive folder:', [f['name'] for f in folder])
    print('drive files:', sorted(f['name'] for f in files if f.get('parents')==[folder[0]['id']]))
    doc=json.loads(diary[0]['content']); today=datetime.date.today().isoformat()
    print('diary has today:', doc['logs'].get(today,{}).get('bleeding'), doc['logs'].get(today,{}).get('volume'), doc['logs'].get(today,{}).get('hmb_qol'), '| consent recorded:', bool(doc['settings'].get('consent_at')))
    print('csv first line:', csv[0]['content'].splitlines()[0][:80])
    pg.get_by_text('Settings').last.click(); pg.wait_for_timeout(1500)
    pg.screenshot(path='g-settings.png', full_page=True)
    # ---- phone 2: same Google account, empty phone ----
    c2=ctx(b); pg2=c2.new_page(); pg2.on('pageerror',lambda e: errs.append(str(e)[:200]))
    pg2.goto(B+'/'); pg2.wait_for_timeout(2500)
    pg2.get_by_role('checkbox').first.click(); pg2.get_by_text('Continue with Google').click(); pg2.wait_for_timeout(3500)
    d=datetime.date.today()
    lbl=pg2.locator(f'[aria-label^="Today, {d.day} "]').first.get_attribute('aria-label')
    print('phone 2 sees it:', lbl)
    # ---- delete my diary on phone 1 ----
    pg.get_by_text('Delete my diary and disconnect').click(); pg.wait_for_timeout(500)
    pg.get_by_text('Delete permanently').click(); pg.wait_for_timeout(2500)
    print('after delete — drive empty:', len(drive['files'])==0, '| back at welcome:', 'Continue with Google' in pg.inner_text('body'))
    print('errors:', errs)
    b.close()
