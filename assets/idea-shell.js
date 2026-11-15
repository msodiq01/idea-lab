/* IDEA LAB — yagona navigatsiya va umumiy holat */
(()=>{
"use strict";
const pages=[
 ["Bosh sahifa","index.html"],
 ["Dashboard","dashboard.html"],
 ["Loyihalar","projects.html"],
 ["Talab & Taklif","exchange.html"],
 ["Investorlar","investors.html"],
 ["Takliflar","offers.html"],
 ["Global bozor","marketplace.html"],
 ["Jamoalar","teams.html"],
 ["Vakansiyalar","teams.html#career-section"],
 ["Mutaxassislar","specialists.html"],
 ["Kabinet","profile.html"]
];
const current=location.pathname.split("/").pop()||"index.html";
const root=document.createElement("section");
root.id="il-global";
root.innerHTML='<div class="il-top"><a class="il-brand" href="index.html">IDEA <b>LAB</b></a><nav class="il-links" aria-label="IDEA LAB asosiy navigatsiyasi">'+pages.map(([name,url])=>'<a href="'+url+'" '+(url===current?'aria-current="page"':'')+'>'+name+'</a>').join("")+'</nav><span class="il-status"><i class="il-dot"></i> Sensorlar: ulanmagan</span></div><div class="il-metrics"><div class="il-metric"><small>Faol loyihalar</small><strong data-il-metric="projects">0</strong><em>mahalliy</em></div><div class="il-metric"><small>Yangi murojaatlar</small><strong data-il-metric="requests">0</strong><em>mahalliy</em></div><div class="il-metric"><small>Hamkorliklar</small><strong data-il-metric="partners">0</strong><em>mahalliy</em></div><div class="il-metric"><small>Talab va takliflar</small><strong data-il-metric="exchange">0</strong><em>mahalliy</em></div></div><div class="il-note">Ko‘rsatkichlar faqat shu brauzerdagi demo yozuvlardan olinadi. Server va sensorlar ulanmagan.</div>';
document.body.insertBefore(root,document.body.firstChild);
/* Eski sahifa menyularini olib tashlaymiz; sahifa sarlavhasi va kontent qoladi. */
document.querySelectorAll("body nav, body header nav").forEach(nav=>{if(root.contains(nav))return;const legacyShell=nav.closest(".navbar, .header");if(legacyShell&&!root.contains(legacyShell))legacyShell.remove();else nav.remove()});
const read=key=>{try{const data=window.IDEALAB?IDEALAB.legacy.read(key,[]):JSON.parse(localStorage.getItem(key)||"[]");return Array.isArray(data)?data:[]}catch(_){return[]}};
const set=(key,value)=>{const node=root.querySelector('[data-il-metric="'+key+'"]');if(node)node.textContent=String(value)};
const refreshMetrics=()=>{
set("projects",read("projects").length);
set("requests",["investmentApplications","jobApplications","teamApplications","resourceOrders"].reduce((n,k)=>n+read(k).length,0));
set("partners",read("teamApplications").length+read("resourceOrders").length);
set("exchange",read("ideaLabExchangeItems").length+read("offers").length);
};
refreshMetrics();
if(window.IDEALAB)IDEALAB.subscribe("legacy:changed",refreshMetrics);
window.addEventListener("storage",event=>{if(!event.key||window.IDEALAB?.legacy.keys.includes(event.key))refreshMetrics()});
})();
