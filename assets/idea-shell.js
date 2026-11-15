/* IDEA LAB — ixcham global navigatsiya va mahalliy holat */
(()=>{
"use strict";
const primary=[
 ["Bosh sahifa","index.html"],
 ["G‘oyalar va loyihalar","projects.html"],
 ["Global bozor","marketplace.html"],
 ["Jamoalar","teams.html"],
 ["Kabinet","profile.html"]
];
const groups=[
 ["Boshqaruv",[
  ["Dashboard","dashboard.html"],["Shaxsiy kabinet","profile.html"],["Tashkilotlar","organizations.html"]
 ]],
 ["G‘oya va rivojlanish",[
  ["Loyihalar","projects.html"],["Talab & taklif","exchange.html"]
 ]],
 ["Biznes va bozor",[
  ["Global bozor","marketplace.html"],["Investorlar","investors.html"],["Takliflar markazi","offers.html"]
 ]],
 ["Jamoa va imkoniyatlar",[
  ["Jamoalar","teams.html"],["Vakansiyalar","teams.html#career-section"],["Mutaxassislar","specialists.html"]
 ]]
];
const allLinks=groups.flatMap(([,items])=>items);
const current=location.pathname.split("/").pop()||"index.html";
const isCurrent=url=>url.split("#")[0]===current;
const link=(name,url)=>'<a href="'+url+'" '+(isCurrent(url)?'aria-current="page"':'')+'>'+name+'</a>';
const root=document.createElement("section");
root.id="il-global";
root.innerHTML=
 '<div class="il-top">'+
  '<a class="il-brand" href="index.html">IDEA <b>LAB</b></a>'+
  '<nav class="il-links" aria-label="Asosiy yo‘nalishlar">'+primary.map(([name,url])=>link(name,url)).join("")+
   '<details class="il-all-menu"><summary>Barcha bo‘limlar <span aria-hidden="true">⌄</span></summary>'+
    '<div class="il-menu-panel">'+groups.map(([heading,items])=>
     '<section class="il-menu-group"><strong>'+heading+'</strong>'+items.map(([name,url])=>link(name,url)).join("")+'</section>'
    ).join("")+'</div>'+
   '</details>'+
  '</nav>'+
  '<span class="il-status"><i class="il-dot"></i> Offline demo</span>'+
 '</div>'+
 '<div class="il-metrics">'+
  '<div class="il-metric"><small>Faol loyihalar</small><strong data-il-metric="projects">0</strong><em>mahalliy</em></div>'+
  '<div class="il-metric"><small>Murojaatlar</small><strong data-il-metric="requests">0</strong><em>mahalliy</em></div>'+
  '<div class="il-metric"><small>Hamkorliklar</small><strong data-il-metric="partners">0</strong><em>mahalliy</em></div>'+
  '<div class="il-metric"><small>Talab va takliflar</small><strong data-il-metric="exchange">0</strong><em>mahalliy</em></div>'+
 '</div>'+
 '<div class="il-note">Ko‘rsatkichlar faqat ushbu brauzerdagi demo yozuvlardan olinadi; server sinxronlashi hali ulanmagan.</div>';
document.body.insertBefore(root,document.body.firstChild);
/* Eski menyu olib tashlanadi, sahifa mazmuni va formalar saqlanadi. */
document.querySelectorAll("body nav, body header nav").forEach(nav=>{
 if(root.contains(nav))return;
 const legacyShell=nav.closest(".navbar, .header");
 if(legacyShell&&!root.contains(legacyShell))legacyShell.remove();
 else nav.remove();
});
const read=key=>{
 try{
  const data=window.IDEALAB?IDEALAB.legacy.read(key,[]):JSON.parse(localStorage.getItem(key)||"[]");
  return Array.isArray(data)?data:[];
 }catch(_){return[]}
};
const set=(key,value)=>{
 const node=root.querySelector('[data-il-metric="'+key+'"]');
 if(node)node.textContent=String(value);
};
const refreshMetrics=()=>{
 set("projects",read("projects").length);
 set("requests",["investmentApplications","jobApplications","teamApplications","resourceOrders"].reduce((n,k)=>n+read(k).length,0));
 set("partners",read("teamApplications").length+read("resourceOrders").length);
 set("exchange",read("ideaLabExchangeItems").length+read("offers").length);
};
refreshMetrics();
if(window.IDEALAB)IDEALAB.subscribe("legacy:changed",refreshMetrics);
window.addEventListener("storage",event=>{
 if(!event.key||window.IDEALAB?.legacy.keys.includes(event.key))refreshMetrics();
});
})();
