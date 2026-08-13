(()=>{'use strict';
  const closeTopModal=()=>{const fan=document.querySelector('#fanModal.show');if(fan){fan.classList.remove('show');return}const modals=[...document.querySelectorAll('.modal-backdrop.show')];modals.at(-1)?.classList.remove('show')};
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeTopModal()});
  document.addEventListener('click',e=>{const button=e.target.closest('.btn,.nav button,[data-fan-member]');if(!button||button.disabled)return;button.classList.add('ui-pressed');setTimeout(()=>button.classList.remove('ui-pressed'),140)});
  document.addEventListener('click',e=>{const backdrop=e.target.closest('.modal-backdrop,.fan-modal');if(backdrop&&e.target===backdrop)backdrop.classList.remove('show')});
  const labelTables=()=>document.querySelectorAll('table').forEach(table=>{const headers=[...table.querySelectorAll('thead th')].map(x=>x.textContent.trim());table.querySelectorAll('tbody tr').forEach(row=>[...row.children].forEach((cell,i)=>{if(headers[i])cell.dataset.label=headers[i]}))});
  const observer=new MutationObserver(labelTables);document.addEventListener('DOMContentLoaded',()=>{labelTables();observer.observe(document.body,{subtree:true,childList:true})});
})();
