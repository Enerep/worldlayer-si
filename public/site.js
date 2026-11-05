/* Atlas controls and a private, browser-local domain inquiry draft. */
(() => {
  'use strict';
  const config=window.SITE_CONFIG,atlas=window.WorldAtlas;
  const $=selector=>document.querySelector(selector);
  const notes=$('#notes-dialog'),inquiryDialog=$('#inquiry-dialog'),form=$('#inquiry-form');
  const status=$('#app-status'),inquiryStatus=$('#inquiry-status');
  const returnFocus=new WeakMap();let inquiry=null,statusTimer;
  function notify(message){status.textContent=message;status.classList.add('visible');clearTimeout(statusTimer);statusTimer=setTimeout(()=>status.classList.remove('visible'),4200);}
  function update(detail){
    $('#world-name').textContent=detail.name;$('#seed-value').textContent=String(detail.seed).padStart(6,'0');$('#biome-label').textContent=['ALPINE','DUNE','LUNAR'][detail.biome];
    document.querySelectorAll('[data-biome]').forEach(button=>{const active=Number(button.dataset.biome)===detail.biome;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));});
    const motion=$('#motion-toggle');motion.setAttribute('aria-pressed',String(detail.paused));motion.setAttribute('aria-label',detail.paused?'Play motion':'Pause motion');motion.title=detail.paused?'Play motion':'Pause motion';
  }
  document.addEventListener('atlaschange',event=>update(event.detail));
  if(atlas)update(atlas.getState());
  if(['localhost','127.0.0.1','[::1]'].includes(window.location.hostname)){
    const sister=new URL(window.location.href);sister.port='4311';sister.pathname='/';sister.search='';sister.hash='';$('[data-sister-link]').href=sister.href;
  }
  document.querySelectorAll('[data-year]').forEach(el=>el.textContent=new Date().getFullYear());
  document.querySelectorAll('[data-contact]').forEach(el=>{el.href=`mailto:${config.contactEmail}`;el.textContent=`${config.contactEmail} ↗`;});
  $('#generate-world').addEventListener('click',()=>{atlas?.regenerate();});
  document.querySelectorAll('[data-biome]').forEach(button=>button.addEventListener('click',()=>atlas?.setBiome(button.dataset.biome)));
  $('#layer-depth').addEventListener('input',event=>{const value=Number(event.target.value);$('#depth-value').value=`${value}%`;atlas?.setLayers(value/100);});
  $('#motion-toggle').addEventListener('click',()=>atlas?.toggleMotion());
  $('#reset-view').addEventListener('click',()=>{atlas?.reset();notify('Back to the first perspective.');});
  $('#capture-world').addEventListener('click',async event=>{
    const button=event.currentTarget;button.disabled=true;
    try{await document.fonts.ready;const saved=await atlas?.capture();notify(saved?'A little world, saved as a postcard.':'Your browser could not save this world.');}
    catch(_){notify('Your browser could not save this world.');}
    finally{button.disabled=false;}
  });
  document.addEventListener('keydown',event=>{
    if(event.altKey||event.ctrlKey||event.metaKey||event.repeat||document.querySelector('dialog[open]'))return;
    if(event.target.closest('input,textarea,select,[contenteditable="true"]'))return;
    if(event.key.toLowerCase()==='n'){event.preventDefault();atlas?.regenerate();}
    if(['1','2','3'].includes(event.key)){event.preventDefault();atlas?.setBiome(Number(event.key)-1);}
  });
  function openDialog(dialog,trigger){
    returnFocus.set(dialog,trigger||document.activeElement);
    document.querySelectorAll('dialog[open]').forEach(other=>{if(other!==dialog)other.close();});
    if(!dialog.open)dialog.showModal();document.body.classList.add('dialog-open');
  }
  $('#field-notes').addEventListener('click',event=>openDialog(notes,event.currentTarget));
  document.querySelectorAll('[data-inquire]').forEach(button=>button.addEventListener('click',()=>openDialog(inquiryDialog,button.closest('dialog')?$('.sale-link'):button)));
  document.querySelectorAll('dialog').forEach(dialog=>{
    dialog.querySelector('[data-close]').addEventListener('click',()=>dialog.close());
    dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();});
    dialog.addEventListener('close',()=>{if(document.querySelector('dialog[open]'))return;document.body.classList.remove('dialog-open');returnFocus.get(dialog)?.focus({preventScroll:true});});
  });
  form.addEventListener('submit',event=>{
    event.preventDefault();if(!form.reportValidity())return;
    const data=new FormData(form),name=String(data.get('name')).trim(),email=String(data.get('email')).trim(),amount=data.get('offer');
    if(!name){form.elements.name.setCustomValidity('Please enter your name.');form.elements.name.reportValidity();return;}
    const offer=amount?`Offer: USD ${Number(amount).toLocaleString('en-US',{maximumFractionDigits:2})}`:'Offer: Let’s discuss';
    inquiry={subject:`Domain inquiry: ${config.domain}`,body:`Hello,\n\nI’m interested in acquiring ${config.domain}.\n\nName: ${name}\nEmail: ${email}\n${offer}\n\n${String(data.get('message')).trim()||'I would love to discuss the domain and next steps.'}\n\nThank you,\n${name}`};
    $('#webmail-inquiry').href=`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(config.contactEmail)}&su=${encodeURIComponent(inquiry.subject)}&body=${encodeURIComponent(inquiry.body)}`;
    $('#email-app-inquiry').href=`mailto:${config.contactEmail}?subject=${encodeURIComponent(inquiry.subject)}&body=${encodeURIComponent(inquiry.body)}`;
    $('#draft-preview').textContent=`To: ${config.contactEmail}\nSubject: ${inquiry.subject}\n\n${inquiry.body}`;
    $('#inquiry-result').hidden=false;inquiryStatus.textContent='Your draft is ready. Review it, then choose your email app, Gmail, or copy the inquiry.';
    $('#inquiry-result').scrollIntoView({block:'nearest'});
  });
  form.elements.name.addEventListener('input',()=>form.elements.name.setCustomValidity(''));
  form.addEventListener('input',()=>{inquiry=null;$('#inquiry-result').hidden=true;inquiryStatus.textContent='';});
  $('#copy-inquiry').addEventListener('click',async()=>{
    if(!inquiry)return;const value=`To: ${config.contactEmail}\nSubject: ${inquiry.subject}\n\n${inquiry.body}`;
    try{if(!navigator.clipboard)throw new Error('Clipboard unavailable');await navigator.clipboard.writeText(value);inquiryStatus.textContent='Inquiry copied. Paste it into an email to the owner.';}
    catch(_){const blob=new Blob([value],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`${config.domain}-inquiry.txt`;link.click();setTimeout(()=>URL.revokeObjectURL(url),2000);inquiryStatus.textContent='Your inquiry was downloaded as a text file.';}
  });
})();
