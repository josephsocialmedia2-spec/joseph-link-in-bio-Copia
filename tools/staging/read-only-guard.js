/* Browser-only read-only preview guard. Backend and APIs are disabled on Vercel. */
(()=>{'use strict';
 if(window.__ZTD_SANDBOX__)return;
 window.__ZTD_SANDBOX__=true;
 const banner=document.createElement('aside');
 banner.id='ztd-sandbox';
 banner.style.cssText='position:sticky;top:0;z-index:2147483000;background:#563307;color:#fff;padding:10px 15px;text-align:center;border-bottom:3px solid #edbd66;font:700 13px/1.5 system-ui,Arial,sans-serif';
 banner.textContent='ZERO TO DIAMOND · PREVIEW DI SOLA LETTURA · NESSUN CRM O INVIO REALE · ';
 const home=document.createElement('a');home.textContent='Indice laboratorio';home.href='/__staging__/';
 home.style.cssText='color:#fff;text-decoration:underline;margin-left:5px';banner.append(home);
 const message=document.createElement('div');
 message.id='ztd-preview-blocked';message.setAttribute('role','status');
 message.style.cssText='display:none;position:fixed;bottom:10px;left:10px;right:10px;max-width:550px;padding:12px 15px;background:#563307;color:white;z-index:2147483001;font:13px system-ui,Arial,sans-serif';
 const stop=()=>{message.textContent='Operazione esterna o invio bloccato. Questa è un’anteprima senza backend.';message.style.display='block'};
 function mount(){document.body.prepend(banner);document.body.append(message)}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
 else mount();
 document.addEventListener('click',event=>{
   const el=event.target.closest?.('a[href]');
   if(!el)return;
   try{
     const url=new URL(el.href,location.href);
     if(url.origin!==location.origin||['mailto:','tel:','sms:','whatsapp:'].includes(url.protocol)){
       // Exception: opening Codespaces for the complete lab is a deliberate handoff.
       if(url.hostname==='github.com'&&url.pathname==='/codespaces/new')return;
       event.preventDefault();event.stopImmediatePropagation();stop();
     }
   }catch(_){event.preventDefault();stop()}
 },true);
 document.addEventListener('submit',event=>{
   event.preventDefault();event.stopImmediatePropagation();stop();
 },true);
 const old=window.open.bind(window);
 window.open=(url,target,features)=>{
   try{
     if(new URL(url,location.href).origin===location.origin)return old(url,target,features);
   }catch(_){}
   stop();return null;
 };
})();