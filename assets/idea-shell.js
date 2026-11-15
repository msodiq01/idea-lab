(()=>{
const pages=[
["Bosh sahifa","index.html"],
["Dashboard","dashboard.html"],
["Loyihalar","projects.html"],
["Investorlar","investors.html"],
["Takliflar","offers.html"],
["Marketplace","marketplace.html"],
["Jamoalar","teams.html"],
["Mutaxassislar","specialists.html"],
["Kabinet","profile.html"]
];
const current=location.pathname.split("/").pop()||"index.html";
const root=document.createElement("section");
root.id="il-global";
root.innerHTML='<div class="il-top"><a class="il-brand" href="index.html">IDEA <b>LAB</b></a><nav class="il-links" aria-label="IDEA LAB asosiy navigatsiyasi">'+pages.map(([n,u])=>'<a href="'+u+'" '+(u===current?'aria-current="page"':'')+'>'+n+'</a>').join("")+'</nav><span class="il-status"><i class="il-dot"></i> Sensorlar: ulanmagan</span></div><div class="il-metrics"><div class="il-metric"><small>Faol loyihalar</small><strong data-il-metric="projects">0</strong><em>mahalliy</em></div><div class="il-metric"><small>Yangi murojaatlar</small><strong data-il-metric="requests">0</strong><em>mahalliy</em></div><div class="il-metric"><small>Hamkorliklar</small><strong data-il-metric="partners">0</strong><em>mahalliy</em></div><div class="il-metric"><small>IoT qurilmalar</small><strong data-il-metric="devices">0</strong><em>ulanmagan</em></div></div><div class="il-note">Ko‘rsatkichlar ushbu brauzerda saqlangan yozuvlardan olinadi. Server statistikasi va haqiqiy sensor ma’lumotlari hali ulanmagan.</div>';
document.body.insertBefore(root,document.body.firstChild);
const read=(key)=>{try{const value=JSON.parse(localStorage.getItem(key)||"[]");return Array.isArray(value)?value:[]}catch(_){return[]}};
const count=(key)=>read(key).length;
const set=(key,value)=>{const node=root.querySelector('[data-il-metric="'+key+'"]');if(node)node.textContent=String(value)};
set("projects",count("projects"));
set("requests",count("investmentApplications")+count("jobApplications")+count("teamApplications")+count("resourceOrders"));
set("partners",count("teamApplications")+count("resourceOrders"));
set("devices",0);
})();