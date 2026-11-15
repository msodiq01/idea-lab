/* IDEA LAB — unified responsive product navigation */
(()=> {
 "use strict";
 if(document.getElementById("il-global")) return;
 const primary=[
  ["Bosh sahifa","index.html"],
  ["G‘oyalar","projects.html"],
  ["Global bozor","marketplace.html"],
  ["Jamoalar","teams.html"],
  ["Kabinet","profile.html"]
 ];
 const groups=[
  ["Boshqaruv",[["Dashboard","dashboard.html"],["Shaxsiy kabinet","profile.html"],["Tashkilotlar","organizations.html"]]],
  ["G‘oya va rivojlanish",[["Loyihalar","projects.html"],["Talab va taklif","exchange.html"]]],
  ["Biznes va bozor",[["Global bozor","marketplace.html"],["Investorlar","investors.html"],["Takliflar markazi","offers.html"]]],
  ["Jamoa va imkoniyatlar",[["Jamoalar","teams.html"],["Vakansiyalar","teams.html#career-section"],["Mutaxassislar","specialists.html"]]],
  ["Platforma rivoji",[["Yo‘l xaritasi","roadmap.html"]]]
 ];
 const current=location.pathname.split("/").pop()||"index.html";
 const isCurrent=url=>url.split("#")[0]===current;
 const link=(name,url)=>'<a href="'+url+'" '+(isCurrent(url)?'aria-current="page"':'')+'>'+name+'</a>';
 const root=document.createElement("header");
 root.id="il-global";
 root.innerHTML=
  '<div class="il-top">'+
   '<a class="il-brand" href="index.html"><span class="il-brand-mark">✦</span><span>IDEA <b>LAB</b></span></a>'+
   '<div class="il-links" role="navigation" aria-label="Asosiy yo‘nalishlar">'+
    primary.map(([name,url])=>link(name,url)).join("")+
    '<details class="il-all-menu"><summary>Barcha bo‘limlar</summary><div class="il-menu-panel">'+
     groups.map(([heading,items])=>'<section class="il-menu-group"><strong>'+heading+'</strong>'+items.map(([name,url])=>link(name,url)).join("")+'</section>').join("")+
    '</div></details>'+
   '</div>'+
   '<div class="il-actions"><span class="il-status"><i class="il-dot"></i> Demo rejim</span>'+
    '<a class="il-quick-action" href="exchange.html">+ E’lon joylash</a></div>'+
  '</div>';
 document.body.insertBefore(root,document.body.firstChild);
 /* Eski sahifa menyularini yashiramiz; asosiy kontent va formalar saqlanadi. */
 document.querySelectorAll("body > header.navbar, body > header.header").forEach(node=>node.classList.add("il-legacy-nav-shell"));
 document.querySelectorAll("body > nav, body nav.nav-links, body nav.nav").forEach(node=>{
  if(!root.contains(node)) node.remove();
 });
 const menu=root.querySelector(".il-all-menu");
 document.addEventListener("click",event=>{
  if(menu.open&&!menu.contains(event.target)) menu.open=false;
 });
 document.addEventListener("keydown",event=>{if(event.key==="Escape")menu.open=false});
})();
