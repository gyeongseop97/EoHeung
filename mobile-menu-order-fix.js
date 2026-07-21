(function(){
  function style(){
    let sheet=document.getElementById('eoMobileMenuOrderStyle');
    if(!sheet){sheet=document.createElement('style');sheet.id='eoMobileMenuOrderStyle';document.head.appendChild(sheet)}
    sheet.textContent='@media(max-width:900px){.nav button[data-page="links"]{order:50!important}.nav button[data-page="about"]{order:51!important}.nav #photoFrameNavBtn{order:52!important}.nav button[data-page="settings"]{order:53!important}.nav #mobileDrawerFooter{order:99!important}}';
  }
  function order(){
    const nav=document.querySelector('.nav');
    if(!nav)return;
    const links=nav.querySelector('button[data-page="links"]');
    const about=nav.querySelector('button[data-page="about"]');
    const photo=nav.querySelector('#photoFrameNavBtn');
    const settings=nav.querySelector('button[data-page="settings"]');
    const footer=document.getElementById('mobileDrawerFooter');
    if(links)links.style.order='50';
    if(about)about.style.order='51';
    if(photo)photo.style.order='52';
    if(settings)settings.style.order='53';
    if(footer)footer.style.order='99';
  }
  function boot(){style();order();[100,300,800,1500,3000].forEach(delay=>setTimeout(order,delay));setInterval(order,1800)}
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot):boot();
})();
