/* IDEA LAB — server-backed organization cabinet */
(() => {
  "use strict";
  const $ = (tag, attrs = {}, text = "") => {
    const el = document.createElement(tag);
    Object.entries(attrs).forEach(([key, value]) => {
      if (key === "className") el.className = value;
      else if (key === "type" || key === "placeholder" || key === "required" || key === "maxLength") el[key] = value;
      else el.setAttribute(key, value);
    });
    if (text) el.textContent = text;
    return el;
  };
  const style = `
    #orgServerRoot{max-width:1180px;margin:28px auto;padding:0 16px;color:#eef5ff}
    #orgServerRoot .os-hero,#orgServerRoot .os-panel{background:linear-gradient(145deg,#10243a,#091729);border:1px solid #29415f;border-radius:18px;padding:20px;margin-bottom:16px}
    #orgServerRoot h1{font-size:clamp(26px,4vw,38px);margin:4px 0 8px}
    #orgServerRoot h2{font-size:18px;margin:0 0 12px}
    #orgServerRoot p,#orgServerRoot small{color:#9db1c9}
    #orgServerRoot .os-grid{display:grid;grid-template-columns:minmax(260px,.8fr) minmax(0,1.5fr);gap:16px}
    #orgServerRoot .os-field{display:grid;gap:6px;margin:11px 0}
    #orgServerRoot label{font-size:12px;color:#b9cbe0}
    #orgServerRoot input,#orgServerRoot select,#orgServerRoot textarea{width:100%;box-sizing:border-box;padding:11px;border-radius:9px;border:1px solid #304b69;background:#071525;color:#fff}
    #orgServerRoot textarea{min-height:82px}
    #orgServerRoot button{border:1px solid #218bb5;border-radius:9px;padding:10px 13px;background:linear-gradient(110deg,#087eaf,#245fdf);color:white;font-weight:700;cursor:pointer}
    #orgServerRoot button.secondary{background:#172b43;border-color:#38516d}
    #orgServerRoot button:disabled{opacity:.5;cursor:wait}
    #orgServerRoot .os-list{display:grid;gap:8px}
    #orgServerRoot .os-org{display:block;width:100%;text-align:left;background:#0b1c30;border:1px solid #29415f}
    #orgServerRoot .os-org[aria-pressed=true]{border-color:#27d7e8}
    #orgServerRoot .os-row{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid #263b53}
    #orgServerRoot .os-msg{min-height:18px;color:#8cecf3;font-size:12px;margin-top:9px}
    #orgServerRoot .os-muted{font-size:12px;color:#9db1c9}
    @media(max-width:760px){#orgServerRoot .os-grid{grid-template-columns:1fr}}
  `;
  const styleNode = $("style"); styleNode.textContent = style; document.head.append(styleNode);
  const old = document.querySelector(".oc-wrap"); if (old) old.hidden = true;
  const root = $("section", { id: "orgServerRoot" });
  root.innerHTML = `
    <section class="os-hero"><small>IDEA LAB / SERVER CABINET</small><h1>Tashkilotlar markazi</h1>
      <p>Tashkilotlar va a’zoliklar serverda saqlanadi. Bu sahifa faqat tizimga kirgan foydalanuvchi uchun ishlaydi.</p>
      <div id="osAuth" class="os-msg">Akkaunt tekshirilmoqda…</div></section>
    <div class="os-grid">
      <aside class="os-panel"><h2>Mening tashkilotlarim</h2><div id="osList" class="os-list"></div>
        <hr style="border-color:#263b53;margin:18px 0">
        <h2>Yangi tashkilot</h2><form id="osCreate">
          <div class="os-field"><label for="osName">Nomi</label><input id="osName" maxlength="120" required></div>
          <div class="os-field"><label for="osType">Turi</label><select id="osType"><option value="company">Kompaniya</option><option value="nonprofit">NNT / jamoat birlashmasi</option><option value="educational_institution">Ta’lim muassasasi</option><option value="community">Hamjamiyat</option><option value="team">Jamoa</option><option value="other">Boshqa</option></select></div>
          <div class="os-field"><label for="osLocation">Joylashuv</label><input id="osLocation" maxlength="160"></div>
          <div class="os-field"><label for="osWebsite">Sayt</label><input id="osWebsite" type="url" maxlength="500" placeholder="https://..."></div>
          <div class="os-field"><label for="osDescription">Tavsif</label><textarea id="osDescription" maxlength="2400"></textarea></div>
          <button type="submit">Tashkilot yaratish</button><div id="osCreateMsg" class="os-msg" role="status"></div>
        </form></aside>
      <section class="os-panel"><div id="osEmpty" class="os-muted">Tashkilotni tanlang yoki yangisini yarating.</div>
        <div id="osDetail" hidden>
          <h2 id="osDetailName"></h2><p id="osDetailMeta" class="os-muted"></p>
          <form id="osEdit"><h2>Ma’lumotlarni tahrirlash</h2>
            <div class="os-field"><label for="osEditName">Nomi</label><input id="osEditName" maxlength="120" required></div>
            <div class="os-field"><label for="osEditType">Turi</label><select id="osEditType"><option value="company">Kompaniya</option><option value="nonprofit">NNT / jamoat birlashmasi</option><option value="educational_institution">Ta’lim muassasasi</option><option value="community">Hamjamiyat</option><option value="team">Jamoa</option><option value="other">Boshqa</option></select></div>
            <div class="os-field"><label for="osEditLocation">Joylashuv</label><input id="osEditLocation" maxlength="160"></div>
            <div class="os-field"><label for="osEditWebsite">Sayt</label><input id="osEditWebsite" type="url" maxlength="500"></div>
            <div class="os-field"><label for="osEditDescription">Tavsif</label><textarea id="osEditDescription" maxlength="2400"></textarea></div>
            <button type="submit">O‘zgarishlarni saqlash</button><div id="osEditMsg" class="os-msg" role="status"></div>
          </form>
          <hr style="border-color:#263b53;margin:20px 0"><h2>A’zolar</h2><div id="osMembers" class="os-list"></div>
          <form id="osInvite"><h2>A’zoni taklif qilish</h2>
            <p class="os-muted">Taklif qilinadigan foydalanuvchining IDEA LAB akkaunt UUID identifikatorini kiriting. Email, telefon yoki parol kiritmang.</p>
            <div class="os-field"><label for="osUserId">Foydalanuvchi UUID</label><input id="osUserId" maxlength="36" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" required></div>
            <div class="os-field"><label for="osRole">Vakolat</label><select id="osRole"><option value="member">A’zo</option><option value="editor">Muharrir</option><option value="admin">Administrator</option></select></div>
            <button type="submit">Taklif yuborish</button><div id="osInviteMsg" class="os-msg" role="status"></div>
          </form>
        </div>
      </section>
    </div>`;
  document.body.insertBefore(root, document.querySelector('script[src="assets/idea-shell.js"]') || null);

  const auth = window.IDEALAB_AUTH, data = window.IDEALAB_DATA;
  let current = null, organizations = [];
  const message = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value; };
  const resultError = r => r && r.error && r.error.message ? r.error.message : "Server amali bajarilmadi. Qayta urinib ko‘ring.";
  function renderList() {
    const list = document.getElementById("osList"); list.replaceChildren();
    if (!organizations.length) { list.append($("p", {className:"os-muted"}, "Hozircha serverda tashkilot yo‘q.")); return; }
    organizations.forEach(org => {
      const b = $("button", {type:"button",className:"os-org", "aria-pressed":String(current && current.id===org.id)}, org.name);
      b.addEventListener("click", () => selectOrganization(org)); list.append(b);
    });
  }
  async function loadOrganizations() {
    const r = await data.listMyOrganizations();
    if (!r.ok) { message("osAuth", resultError(r)); return; }
    organizations = Array.isArray(r.data) ? r.data : [];
    renderList();
    if (current) {
      const fresh = organizations.find(x => x.id === current.id);
      if (fresh) await selectOrganization(fresh); else { current = null; document.getElementById("osDetail").hidden=true; document.getElementById("osEmpty").hidden=false; }
    }
  }
  async function selectOrganization(org) {
    current = org; document.getElementById("osEmpty").hidden=true; document.getElementById("osDetail").hidden=false;
    document.getElementById("osDetailName").textContent = org.name;
    document.getElementById("osDetailMeta").textContent = (org.organization_type || "Tashkilot") + " · " + (org.location_label || "Joylashuv kiritilmagan") + " · " + (org.status || "draft");
    document.getElementById("osEditName").value=org.name||"";
    document.getElementById("osEditType").value=org.organization_type||"other";
    document.getElementById("osEditLocation").value=org.location_label||"";
    document.getElementById("osEditWebsite").value=org.website_url||"";
    document.getElementById("osEditDescription").value=org.description||"";
    renderList();
    const r = await data.listOrganizationMembers(org.id);
    const box=document.getElementById("osMembers"); box.replaceChildren();
    if (!r.ok) { box.append($("p",{className:"os-muted"},resultError(r))); return; }
    const members=Array.isArray(r.data)?r.data:[];
    if (!members.length) box.append($("p",{className:"os-muted"},"A’zolar topilmadi."));
    members.forEach(m=>{
      const row=$("div",{className:"os-row"});
      const info=$("div"); info.append($("strong",{},m.user_id),$("div",{className:"os-muted"},(m.membership_role||"member")+" · "+(m.membership_status||"unknown")));
      row.append(info);
      if(m.membership_status==="invited" && m.user_id===window.__IDEALAB_USER_ID){
        const accept=$("button",{type:"button",className:"secondary"},"Taklifni qabul qilish");
        accept.addEventListener("click",async()=>{accept.disabled=true;const a=await data.acceptOrganizationInvite(m.id);message("osInviteMsg",a.ok?"Taklif qabul qilindi.":resultError(a));await loadOrganizations();});
        row.append(accept);
      }
      box.append(row);
    });
  }
  document.getElementById("osCreate").addEventListener("submit",async e=>{
    e.preventDefault();const btn=e.submitter;btn.disabled=true;message("osCreateMsg","Serverga saqlanmoqda…");
    const r=await data.createOrganization({name:document.getElementById("osName").value.trim(),type:document.getElementById("osType").value,
      location:document.getElementById("osLocation").value.trim(),websiteUrl:document.getElementById("osWebsite").value.trim()||null,
      description:document.getElementById("osDescription").value.trim(),visibility:"private"});
    btn.disabled=false;
    if(!r.ok){message("osCreateMsg",resultError(r));return;}
    document.getElementById("osCreate").reset();message("osCreateMsg","Tashkilot serverda yaratildi.");
    await loadOrganizations();
    const id=typeof r.data==="string"?r.data:r.data&&r.data.id;
    const created=organizations.find(x=>x.id===id);if(created)await selectOrganization(created);
  });
  document.getElementById("osEdit").addEventListener("submit",async e=>{
    e.preventDefault();if(!current)return;const btn=e.submitter;btn.disabled=true;message("osEditMsg","Saqlanmoqda…");
    const r=await data.updateOrganization({organizationId:current.id,name:document.getElementById("osEditName").value.trim(),
      type:document.getElementById("osEditType").value,location:document.getElementById("osEditLocation").value.trim(),
      websiteUrl:document.getElementById("osEditWebsite").value.trim()||null,description:document.getElementById("osEditDescription").value.trim(),
      visibility:current.visibility||"private",status:current.status||"draft"});
    btn.disabled=false;message("osEditMsg",r.ok?"Tashkilot ma’lumotlari serverda saqlandi.":resultError(r));if(r.ok)await loadOrganizations();
  });
  document.getElementById("osInvite").addEventListener("submit",async e=>{
    e.preventDefault();if(!current)return;const btn=e.submitter;btn.disabled=true;
    const userId=document.getElementById("osUserId").value.trim();
    const r=await data.inviteOrganizationMember({organizationId:current.id,userId,role:document.getElementById("osRole").value});
    btn.disabled=false;message("osInviteMsg",r.ok?"Taklif serverga yuborildi.":resultError(r));if(r.ok){document.getElementById("osInvite").reset();await selectOrganization(current);}
  });

  async function start() {
    if(!auth||!data){message("osAuth","Backend adapterlari yuklanmagan. Sahifani yangilang.");return;}
    const configured=auth.configure(window.IDEALAB_CONFIG,window.supabase);
    if(!configured.ok){message("osAuth","Backend konfiguratsiyasi yoki Supabase SDK mavjud emas.");return;}
    const session=await auth.getSession();
    if(!session.ok || !session.data || !session.data.session || !session.data.session.user){
      message("osAuth","Tashkilotlar kabinetidan foydalanish uchun avval IDEA LAB akkauntiga kiring.");return;
    }
    window.__IDEALAB_USER_ID=session.data.session.user.id;
    message("osAuth","Serverga ulandi · akkaunt tasdiqlandi.");
    await loadOrganizations();
  }
  start().catch(()=>message("osAuth","Kabinetni yuklashda xatolik. Sahifani yangilang."));
})();