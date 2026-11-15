(function(){
  const pages=[
    ["index.html","Bosh sahifa"],
    ["projects.html","Loyihalar"],
    ["teams.html","Jamoalar"],
    ["investors.html","Investorlar"],
    ["specialists.html","Mutaxassislar"],
    ["offers.html","Takliflar"],
    ["marketplace.html","Global bozor"],
    ["profile.html","Kabinet"]
  ];
  const path=location.pathname.split("/").pop()||"index.html";
  document.querySelectorAll("header.navbar").forEach(el=>{el.dataset.ilLegacy="true";el.style.display="none";});
  const header=document.createElement("header");
  header.className="il-shell-header";
  header.innerHTML='<div class="il-shell-inner"><a class="il-brand" href="index.html"><span class="il-brand-mark">✦</span><span class="il-brand-word">IDEA <span>LAB</span></span></a><nav class="il-nav" aria-label="IDEA LAB asosiy navigatsiyasi"></nav><div class="il-shell-tools"><span class="il-live-chip"><i class="il-live-dot"></i> DEMO MUHIT</span><a class="il-profile-link" href="profile.html">Shaxsiy kabinet ↗</a></div></div>';
  const nav=header.querySelector(".il-nav");
  pages.forEach(([href,label])=>{
    const a=document.createElement("a");a.href=href;a.textContent=label;
    if(path===href || (path==="project-detail.html" && href==="projects.html") || (path==="project.html" && href==="projects.html")) a.setAttribute("aria-current","page");
    nav.appendChild(a);
  });
  const sub=document.createElement("div");sub.className="il-subbar";
  sub.innerHTML='<div class="il-subbar-inner"><div class="il-subbar-left"><span class="il-subbar-item"><i class="il-pulse"></i> IDEA LAB <b>WORKSPACE</b></span><span class="il-subbar-item">Modullar: <b>yagona navigatsiyada</b></span></div><div class="il-subbar-right"><span class="il-subbar-item">Ko‘rsatkichlar: <b>demo ma’lumotlar</b></span><span class="il-subbar-item" id="il-clock"></span></div></div>';
  document.body.insertBefore(sub,document.body.firstChild);
  document.body.insertBefore(header,document.body.firstChild);
  const clock=document.getElementById("il-clock");
  function tick(){if(clock)clock.textContent=new Intl.DateTimeFormat("uz-UZ",{hour:"2-digit",minute:"2-digit"}).format(new Date());}
  tick();setInterval(tick,30000);
  document.body.classList.add("il-shell-ready");
})();