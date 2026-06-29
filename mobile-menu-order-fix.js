(function(){
  function moveMenuItems(){
    var nav=document.querySelector('.nav');
    if(!nav)return;
    var links=nav.querySelector('button[data-page="links"]');
    var about=nav.querySelector('button[data-page="about"]');
    var photo=nav.querySelector('#photoFrameNavBtn');
    var footer=document.getElementById('mobileDrawerFooter');
    if(!links)return;
    if(about)links.after(about);
    if(photo)(about||links).after(photo);
    if(footer)(photo||about||links).after(footer);
    if(links)links.style.order='50';
    if(about)about.style.order='51';
    if(photo)photo.style.order='52';
    if(footer)footer.style.order='99';
  }
  function style(){
    if(document.getElementById('eoMobileMenuOrderStyle'))return;
    var s=document.createElement('style');
    s.id='eoMobileMenuOrderStyle';
    s.textContent='@media(max-width:900px){.nav button[data-page="links"]{order:50!important}.nav button[data-page="about"]{order:51!important}.nav #photoFrameNavBtn{order:52!important}#mobileDrawerFooter{order:99!important}}';
    document.head.appendChild(s);
  }
  function boot(){
    style();
    moveMenuItems();
    [100,300,800,1500,3000,5000].forEach(function(ms){setTimeout(function(){style();moveMenuItems()},ms)});
    setInterval(moveMenuItems,1500);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
