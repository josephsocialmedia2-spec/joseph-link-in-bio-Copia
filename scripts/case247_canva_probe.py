import os,urllib.request
from PIL import Image
from io import BytesIO
url=os.environ["URL"]
variants={
"full":url.replace("/height:200/","/height:1254/").replace("/width:200?","/width:1254?"),
"thumb":url
}
for key,link in variants.items():
 try:
  req=urllib.request.Request(link,headers={"User-Agent":"Mozilla/5.0"})
  with urllib.request.urlopen(req,timeout=20) as r:
   data=r.read(5000000)
   print(key,"HTTP",r.status,"type",r.headers.get("Content-Type"),"bytes",len(data))
   with Image.open(BytesIO(data)) as im:
    print(key,"dimensions",im.size,"format",im.format)
 except Exception as e:print(key,"ERROR",repr(e))
