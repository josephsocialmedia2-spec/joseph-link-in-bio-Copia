/* Keyboard-accessible isolated tabs; no global onclick or interference with the agenda. */
(function(){
  'use strict';
  function init(){
    const box=document.getElementById('sv-acquisizione');
    if(!box||box.dataset.svReady==='1')return;
    box.dataset.svReady='1';
    const tabs=Array.from(box.querySelectorAll('[role="tab"]'));
    const panels=Array.from(box.querySelectorAll('[role="tabpanel"]'));
    function activate(tab,focus){
      tabs.forEach(button=>{
        const selected=button===tab;
        button.setAttribute('aria-selected',String(selected));
        button.tabIndex=selected?0:-1;
      });
      panels.forEach(panel=>{panel.hidden=panel.id!==tab.getAttribute('aria-controls');});
      if(focus)tab.focus();
    }
    tabs.forEach((tab,index)=>{
      tab.addEventListener('click',()=>activate(tab,false));
      tab.addEventListener('keydown',event=>{
        let next=index;
        if(event.key==='ArrowRight')next=(index+1)%tabs.length;
        else if(event.key==='ArrowLeft')next=(index+tabs.length-1)%tabs.length;
        else if(event.key==='Home')next=0;
        else if(event.key==='End')next=tabs.length-1;
        else return;
        event.preventDefault();activate(tabs[next],true);
      });
    });
    activate(tabs[0],false);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
