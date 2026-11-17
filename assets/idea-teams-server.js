/* IDEA LAB — server-backed teams module
 * Team records reuse idea_app.organizations with organization_type='team'.
 * Private phone/Telegram fields from the legacy form are intentionally not uploaded.
 */
(() => {
  "use strict";
  const auth = window.IDEALAB_AUTH;
  const data = window.IDEALAB_DATA;
  const $ = (id) => document.getElementById(id);
  const text = (value) => String(value ?? "").trim();
  const message = (node, value) => { if (node) node.textContent = value; };
  let teams = [];
  let signedInUserId = null;

  const status = document.createElement("div");
  status.className = "form-panel";
  status.id = "ilTeamServerStatus";
  status.setAttribute("role", "status");
  status.textContent = "Jamoalar serveri tekshirilmoqda…";
  const section = $("team-section");
  if (section) section.insertBefore(status, $("teamList"));

  const requestPanel = document.createElement("section");
  requestPanel.className = "section";
  requestPanel.innerHTML = '<div class="section-heading"><div><h2>Jamoa a’zoligi so‘rovlari</h2><p>O‘zingiz yuborgan so‘rovlar va siz boshqaradigan jamoalarga kelgan arizalar.</p></div></div><div id="ilMyTeamMemberships" class="cards"></div><div id="ilTeamRequests" class="cards" style="margin-top:18px"></div>';
  if (section) section.append(requestPanel);

  const fieldPhone = $("teamPhone")?.closest(".field");
  const fieldTelegram = $("teamTelegram")?.closest(".field");
  if (fieldPhone) fieldPhone.remove();
  if (fieldTelegram) fieldTelegram.remove();
  const legacyMyApplications = $("myApplications")?.closest(".section");
  const legacyTeamManager = $("teamManagerApplications")?.closest(".section");
  if (legacyMyApplications) legacyMyApplications.hidden = true;
  if (legacyTeamManager) legacyTeamManager.hidden = true;

  const oldJobsTitle = document.querySelector("#career-section .section-heading p");
  if (oldJobsTitle) oldJobsTitle.textContent = "Vakansiya joylashtirish va arizalar hozircha demo rejimida; serverga yuborilmaydi.";

  function setStatus(value, isError = false) {
    status.textContent = value;
    status.style.borderColor = isError ? "rgba(255,100,124,.65)" : "rgba(22,199,181,.35)";
  }
  function resultMessage(result) {
    return result?.error?.message || "Server amali bajarilmadi. Qayta urinib ko‘ring.";
  }
  function parseDescription(value) {
    const raw = String(value || "");
    const take = (label) => {
      const match = raw.match(new RegExp("^" + label + ":\\s*(.*)$", "mi"));
      return match ? match[1].trim() : "";
    };
    const body = raw.split(/\n\s*\n/).slice(1).join("\n\n").trim();
    return { direction: take("Yo‘nalish") || "Boshqa", leader: take("Rahbar"), roles: take("Kerakli mutaxassislar"), project: take("Bog‘liq loyiha"), body: body || raw };
  }
  function emptyCard(container, value) {
    const node = document.createElement("div");
    node.className = "empty";
    node.textContent = value;
    container.append(node);
  }
  function renderTeams() {
    const list = $("teamList");
    if (!list) return;
    list.replaceChildren();
    const search = text($("teamSearch")?.value).toLocaleLowerCase("uz-UZ");
    const filter = text($("teamFilter")?.value);
    const filtered = teams.filter((team) => {
      const meta = parseDescription(team.description);
      const haystack = [team.name, team.description, meta.direction, meta.leader, meta.roles, meta.project].join(" ").toLocaleLowerCase("uz-UZ");
      return haystack.includes(search) && (!filter || meta.direction === filter);
    });
    if ($("teamCount")) $("teamCount").textContent = String(teams.length);
    if (!filtered.length) { emptyCard(list, "Serverda hozircha ochiq jamoa yo‘q. Birinchi jamoani yarating."); return; }
    filtered.forEach((team) => {
      const meta = parseDescription(team.description);
      const card = document.createElement("article"); card.className = "card";
      const top = document.createElement("div"); top.className = "card-top";
      const tag = document.createElement("span"); tag.className = "tag"; tag.textContent = meta.direction;
      const kind = document.createElement("span"); kind.className = "tag"; kind.textContent = "SERVER JAMOASI";
      top.append(tag, kind);
      const title = document.createElement("h3"); title.textContent = team.name;
      const desc = document.createElement("p"); desc.textContent = meta.body;
      card.append(top, title);
      [["Rahbar: ",meta.leader],["Kerakli mutaxassislar: ",meta.roles],["Bog‘liq loyiha: ",meta.project],["",meta.body]].forEach(([label,value]) => {
        if (!value) return;
        const p = document.createElement("p"); p.textContent = label + value; card.append(p);
      });
      const action = document.createElement("div"); action.className = "card-actions";
      const join = document.createElement("button"); join.className = "btn"; join.type = "button";
      join.textContent = signedInUserId ? "A’zolik so‘rovini yuborish" : "Kirish orqali qo‘shilish";
      join.addEventListener("click", async () => {
        if (!signedInUserId) { location.href = "auth.html?next=teams.html"; return; }
        join.disabled = true;
        const r = await data.requestTeamMembership(team.id);
        join.disabled = false;
        if (r.ok) { join.textContent = "So‘rov yuborildi"; join.disabled = true; await loadMyMemberships(); }
        else alert(resultMessage(r));
      });
      action.append(join); card.append(action); list.append(card);
    });
  }
  async function loadTeams() {
    const r = await data.listPublicTeams({limit:50});
    if (!r.ok) { setStatus(resultMessage(r), true); teams=[]; renderTeams(); return; }
    teams = Array.isArray(r.data) ? r.data : [];
    setStatus("Ochiq jamoalar serverdan yuklandi. Jamoa yaratish va a’zolik so‘rovlari akkaunt orqali saqlanadi.");
    renderTeams();
  }
  async function loadMyMemberships() {
    const box = $("ilMyTeamMemberships"); if (!box) return;
    box.replaceChildren();
    if (!signedInUserId) { emptyCard(box, "O‘z a’zolik so‘rovlaringizni ko‘rish uchun akkauntga kiring."); return; }
    const r = await data.listMyTeamMemberships();
    if (!r.ok) { emptyCard(box, resultMessage(r)); return; }
    if (!r.data?.length) { emptyCard(box, "Hozircha jamoalarga yuborgan so‘rovingiz yo‘q."); return; }
    r.data.forEach((item) => {
      const card=document.createElement("article");card.className="card";
      const h=document.createElement("h3");h.textContent=item.team_name;
      const p=document.createElement("p");p.textContent="Holat: "+({pending:"Ko‘rib chiqilmoqda",active:"A’zolik tasdiqlandi",declined:"So‘rov rad etildi",invited:"Taklif yuborildi",removed:"A’zolik yakunlandi"}[item.membership_status]||item.membership_status);
      card.append(h,p);box.append(card);
    });
  }
  async function loadOwnerRequests() {
    const box=$("ilTeamRequests");if(!box)return;box.replaceChildren();
    if(!signedInUserId){emptyCard(box,"Jamoa arizalarini boshqarish uchun akkauntga kiring.");return;}
    const own=await data.listMyOrganizations();
    if(!own.ok){emptyCard(box,resultMessage(own));return;}
    const mine=(own.data||[]).filter(x=>x.organization_type==="team");
    let count=0;
    for(const team of mine){
      const r=await data.listOrganizationMembers(team.id);
      if(!r.ok)continue;
      (r.data||[]).filter(x=>x.membership_status==="pending").forEach(member=>{
        count++;
        const card=document.createElement("article");card.className="card";
        const h=document.createElement("h3");h.textContent=team.name;
        const p=document.createElement("p");p.textContent="Yangi a’zolik so‘rovi · "+member.user_id;
        const actions=document.createElement("div");actions.className="card-actions";
        const approve=document.createElement("button");approve.className="btn btn-green";approve.type="button";approve.textContent="Qabul qilish";
        const reject=document.createElement("button");reject.className="btn btn-danger";reject.type="button";reject.textContent="Rad etish";
        const decide=async(ok)=>{approve.disabled=true;reject.disabled=true;const result=await data.reviewTeamMembership(member.id,ok);if(!result.ok||result.data!==true){alert(resultMessage(result));approve.disabled=false;reject.disabled=false;return;}await loadOwnerRequests();await loadMyMemberships();};
        approve.addEventListener("click",()=>decide(true));reject.addEventListener("click",()=>decide(false));
        actions.append(approve,reject);card.append(h,p,actions);box.append(card);
      });
    }
    if($("teamApplicationCount")) $("teamApplicationCount").textContent=String(count);
    if(!count)emptyCard(box,"Sizning jamoalaringizga yangi a’zolik so‘rovlari yo‘q.");
  }
  async function createTeam(event) {
    event.preventDefault();
    const form=$("teamForm");
    const name=text($("teamName")?.value),direction=text($("teamDirection")?.value);
    const leader=text($("teamLeader")?.value),roles=text($("teamRoles")?.value);
    const project=text($("teamProject")?.value),body=text($("teamDescription")?.value);
    if(!name||!direction||!leader||!body){alert("Majburiy maydonlarni to‘ldiring.");return;}
    if(!signedInUserId){alert("Jamoa yaratish uchun avval IDEA LAB akkauntiga kiring.");location.href="auth.html?next=teams.html";return;}
    const submit=form.querySelector('[type="submit"]');if(submit)submit.disabled=true;
    setStatus("Jamoa serverda yaratilmoqda…");
    const description="Yo‘nalish: "+direction+"\nRahbar: "+leader+"\nKerakli mutaxassislar: "+(roles||"Aniqlashtirilmagan")+"\nBog‘liq loyiha: "+(project||"Ko‘rsatilmagan")+"\n\n"+body;
    const slug="team-"+crypto.randomUUID().slice(0,8);
    const created=await data.createOrganization({name,slug,type:"team",description,visibility:"private"});
    if(!created.ok){if(submit)submit.disabled=false;setStatus(resultMessage(created),true);return;}
    const id=typeof created.data==="string"?created.data:created.data?.id;
    const published=await data.updateOrganization({organizationId:id,name,slug,type:"team",description,visibility:"public",status:"active"});
    if(!published.ok||published.data!==true){
      if(submit)submit.disabled=false;
      setStatus("Jamoa qoralama sifatida serverda saqlandi, lekin ochiq katalogga chiqarilmadi. Qayta urinib ko‘ring.",true);
      return;
    }
    form.reset();$("teamFormPanel")?.classList.add("hidden");$("teamFormPanel").style.display="";
    if(submit)submit.disabled=false;
    setStatus("Jamoa muvaffaqiyatli serverga joylandi va ochiq katalogda ko‘rinadi.");
    await loadTeams();await loadOwnerRequests();
  }
  function installFilters() {
    $("teamSearch")?.addEventListener("input",renderTeams);
    $("teamFilter")?.addEventListener("change",renderTeams);
    document.addEventListener("submit",(event)=>{
      if(event.target?.id==="teamForm"){event.preventDefault();event.stopImmediatePropagation();createTeam(event);}
    },true);
  }
  async function start() {
    if(!auth||!data){setStatus("Backend modullari yuklanmagan. Sahifani yangilang.",true);return;}
    const configured=auth.getStatus()?.configured?{ok:true}:auth.configure(window.IDEALAB_CONFIG,window.supabase);
    if(!configured.ok){setStatus("Supabase konfiguratsiyasi yoki SDK yuklanmadi.",true);return;}
    const session=await auth.getSession();
    signedInUserId=session.ok?session.data?.session?.user?.id||null:null;
    installFilters();
    await loadTeams();
    await loadMyMemberships();
    await loadOwnerRequests();
  }
  start().catch(()=>setStatus("Jamoalar serverini yuklashda xatolik yuz berdi.",true));
})();
