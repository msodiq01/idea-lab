/* IDEA LAB — unified responsive and accessible product navigation */
(()=>{
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
  ["Boshqaruv",[["Dashboard","dashboard.html"],["Shaxsiy kabinet","profile.html"],["Arizalar markazi","applications.html"],["Tashkilotlar","organizations.html"]]],
  ["G‘oya va rivojlanish",[["Loyihalar","projects.html"],["Talab va taklif","exchange.html"]]],
  ["Biznes va bozor",[["Global bozor","marketplace.html"],["Investorlar","investors.html"],["Takliflar markazi","offers.html"]]],
  ["Jamoa va imkoniyatlar",[["Jamoalar","teams.html"],["Vakansiyalar","teams.html#career-section"],["Mutaxassislar","specialists.html"]]],
  ["Platforma rivoji",[["Yo‘l xaritasi","roadmap.html"]]]
 ];
 const current=location.pathname.split("/").pop()||"index.html";
 const isCurrent=url=>url.split("#")[0]===current;
 const link=(name,url)=>'<a href="'+url+'" '+(isCurrent(url)?'aria-current="page"':'')+'>'+name+'</a>';

 /* Keyboard and screen-reader users can bypass repeated navigation. */
 const skip=document.createElement("a");
 skip.className="il-skip-link";
 skip.href="#il-main-content";
 skip.textContent="Asosiy kontentga o‘tish";
 document.body.insertBefore(skip,document.body.firstChild);

 const root=document.createElement("header");
 root.id="il-global";
 root.setAttribute("aria-label","IDEA LAB asosiy navigatsiyasi");
 root.innerHTML=
  '<div class="il-top">'+
   '<a class="il-brand" href="index.html" aria-label="IDEA LAB bosh sahifasi"><span class="il-brand-mark" aria-hidden="true">✦</span><span>IDEA <b>LAB</b></span></a>'+
   '<nav class="il-links" aria-label="Asosiy yo‘nalishlar">'+
    primary.map(([name,url])=>link(name,url)).join("")+
    '<details class="il-all-menu"><summary aria-label="Barcha bo‘limlar menyusini ochish">Barcha bo‘limlar</summary><div class="il-menu-panel" aria-label="Barcha platforma bo‘limlari">'+
     groups.map(([heading,items])=>'<section class="il-menu-group" aria-label="'+heading+'"><strong>'+heading+'</strong>'+items.map(([name,url])=>link(name,url)).join("")+'</section>').join("")+
    '</div></details>'+
   '</nav>'+
   '<div class="il-actions"><span class="il-status"><i class="il-dot" aria-hidden="true"></i> Demo rejim</span>'+
    '<a class="il-quick-action" href="exchange.html">+ E’lon joylash</a></div>'+
  '</div>';

 const main=document.querySelector("main")||document.querySelector(".container, .wrap, .d-wrap, .oc-wrap");
 if(main&&!main.id) main.id="il-main-content";
 document.body.insertBefore(root,skip.nextSibling);

 /* Eski navigatsiya yashiriladi; sahifa mazmuni va formalar saqlanadi. */
 document.querySelectorAll("body > header.navbar, body > header.header").forEach(node=>node.classList.add("il-legacy-nav-shell"));
 document.querySelectorAll("body > nav, body nav.nav-links, body nav.nav").forEach(node=>{
  if(!root.contains(node)) node.remove();
 });

 const menu=root.querySelector(".il-all-menu");
 const summary=menu.querySelector("summary");
 document.addEventListener("click",event=>{
  if(menu.open&&!menu.contains(event.target)) menu.open=false;
 });
 menu.addEventListener("click",event=>{
  if(event.target.closest("a")) menu.open=false;
 });
 document.addEventListener("keydown",event=>{
  if(event.key==="Escape"&&menu.open){
   menu.open=false;
   summary.focus();
  }
 });
})();
