/* IDEA LAB — server-backed career centre.
 * Public vacancies omit private contact details. Applications remain visible only
 * to the applicant and the organization that published the vacancy.
 */
(() => {
  "use strict";
  const auth=window.IDEALAB_AUTH, data=window.IDEALAB_DATA;
  const $=id=>document.getElementById(id);
  const clean=value=>String(value??"").trim();
  const typeLabels={full_time:"To‘liq ish kuni",part_time:"Yarim stavka",remote:"Masofaviy",internship:"Amaliyot",freelance:"Frilans"};
  const statusLabels={submitted:"Ko‘rib chiqilmoqda",accepted:"Qabul qilindi",declined:"Rad etildi",withdrawn:"Qaytarib olindi"};
  let userId=null,jobs=[],ownedJobs=[],selectedJob=null;
  const section=$("career-section"),jobList=$("jobList"),form=$("jobForm");
  if(!section||!jobList||!form)return;
  jobList.replaceChildren();
  const legacyEmployerPanel=$("employerApplications")?.closest(".section");
  if(legacyEmployerPanel)legacyEmployerPanel.hidden=true;

  const notice=document.createElement("p");
  notice.className="notice";
  notice.setAttribute("role","status");
  notice.textContent="Xavfsizlik: vakansiya shartlari, ish beruvchi va yosh bo‘yicha talablarni ariza yuborishdan oldin ishonchli katta bilan tekshiring. Shaxsiy telefon raqamlar ochiq katalogda ko‘rsatilmaydi.";
  section.insertBefore(notice,form.parentElement);

  const myPosts=document.createElement("section");
  myPosts.className="section";
  myPosts.innerHTML='<div class="section-heading"><div><h2>Mening vakansiyalarim</h2><p>Joylashtirgan e’lonlaringizni boshqaring va arizalarni ko‘rib chiqing.</p></div></div><div id="ilMyJobPosts" class="cards"></div><div id="ilJobOwnerApplications" class="cards" style="margin-top:16px"></div>';
  section.append(myPosts);
  const myApps=document.createElement("section");
  myApps.className="section";
  myApps.innerHTML='<div class="section-heading"><div><h2>Mening ish arizalarim</h2><p>Yuborgan arizalaringiz holati.</p></div></div><div id="ilMyJobApplications" class="cards"></div>';
  section.append(myApps);

  const oldCompany=$("companyName");
  if(oldCompany){
    const select=document.createElement("select");select.id="jobOrganization";select.required=true;select.className=oldCompany.className;
    select.innerHTML='<option value="">Tashkilotni tanlang</option>';
    const field=oldCompany.closest(".field");oldCompany.replaceWith(select);
    const label=field?.querySelector("label");if(label)label.textContent="Ish beruvchi tashkilot *";
  }
  const phoneField=$("employerPhone")?.closest(".field");if(phoneField)phoneField.remove();
  const formHint=document.createElement("p");formHint.className="notice";formHint.textContent="Vakansiya joylashtirish uchun IDEA LAB’da tashkilot egasi bo‘lishingiz kerak. Aloqa telefonini ochiq e’longa kiritmang.";
  form.insertBefore(formHint,form.firstChild);

  const applicationPanel=document.createElement("div");
  applicationPanel.className="form-panel";
  applicationPanel.hidden=true;
  applicationPanel.innerHTML='<h3 id="ilApplyTitle">Vakansiyaga ariza</h3><form id="ilApplyForm"><div class="field"><label for="ilApplyMessage">Ish beruvchiga xabar (10–2000 belgi)</label><textarea id="ilApplyMessage" required minlength="10" maxlength="2000" rows="5" placeholder="Tajriba, qiziqish va mosligingiz haqida yozing. Telefon, manzil yoki boshqa maxfiy ma’lumotlarni kiritmang."></textarea></div><button class="btn btn-green" type="submit">Ariza yuborish</button><button class="btn btn-secondary" id="ilApplyCancel" type="button">Bekor qilish</button></form>';
  jobList.insertAdjacentElement("afterend",applicationPanel);

  function card(title,lines=[]){
    const node=document.createElement("article");node.className="card";
    const h=document.createElement("h3");h.textContent=title;node.append(h);
    lines.filter(Boolean).forEach(value=>{const p=document.createElement("p");p.textContent=value;node.append(p);});
    return node;
  }
  function empty(node,message){node.replaceChildren();const p=document.createElement("p");p.className="empty";p.textContent=message;node.append(p);}
  function setStatus(message,isError=false){
    notice.textContent=message;
    notice.style.borderColor=isError?"rgba(255,100,124,.65)":"rgba(22,199,181,.35)";
  }
  function errorText(result){return result?.error?.message||"Server amali bajarilmadi. Qayta urinib ko‘ring.";}
  function employmentType(raw){
    const found=Object.entries(typeLabels).find(([key])=>key===raw);return found?found[1]:"Boshqa";
  }
  function updateCounts(){
    if($("jobCount"))$("jobCount").textContent=String(jobs.length);
  }
  function renderJobs(){
    jobList.replaceChildren();
    const q=clean($("jobSearch")?.value).toLocaleLowerCase("uz-UZ");
    const f=clean($("jobFilter")?.value);
    const visible=jobs.filter(job=>{
      const hay=[job.title,job.company_name,job.location_label,job.description].join(" ").toLocaleLowerCase("uz-UZ");
      return hay.includes(q)&&(!f||employmentType(job.employment_type)===f);
    });
    if(!visible.length){empty(jobList,"Hozircha mos ochiq vakansiya yo‘q.");updateCounts();return;}
    visible.forEach(job=>{
      const node=card(job.title,[job.company_name,job.location_label,employmentType(job.employment_type),job.salary_label||"Maosh: kelishiladi",job.description]);
      const actions=document.createElement("div");actions.className="card-actions";
      const apply=document.createElement("button");apply.className="btn btn-green";apply.type="button";apply.textContent=userId?"Ariza yuborish":"Kirish orqali ariza yuborish";
      apply.addEventListener("click",()=>{
        if(!userId){location.href="auth.html?next=teams.html";return;}
        selectedJob=job;$("ilApplyTitle").textContent=job.title+" — ariza";
        $("ilApplyMessage").value="";applicationPanel.hidden=false;applicationPanel.scrollIntoView({behavior:"smooth",block:"center"});
      });
      actions.append(apply);node.append(actions);jobList.append(node);
    });
    updateCounts();
  }
  async function loadJobs(){
    const r=await data.listPublicJobPosts({limit:50});
    if(!r.ok){setStatus(errorText(r),true);jobs=[];renderJobs();return;}
    jobs=Array.isArray(r.data)?r.data:[];
    renderJobs();
  }
  async function loadOrganizations(){
    const select=$("jobOrganization");if(!select)return;
    select.replaceChildren(new Option("Tashkilotni tanlang",""));
    if(!userId){select.disabled=true;return;}
    const r=await data.listMyOrganizations();
    if(!r.ok){select.disabled=true;setStatus(errorText(r),true);return;}
    const organizations=(r.data||[]).filter(x=>x.organization_type!=="team"&&x.visibility==="public"&&x.status==="active");
    organizations.forEach(org=>select.add(new Option(org.name,org.id)));
    select.disabled=false;
    if(!organizations.length){
      select.add(new Option("Avval tashkilot yarating",""));
      formHint.textContent="Vakansiya joylashtirish uchun avval kompaniya yoki tashkilot profilingizni yarating va uni ommaviy, faol holatga o‘tkazing.";
    }
  }
  async function loadMyApplications(){
    const box=$("ilMyJobApplications");box.replaceChildren();
    if(!userId){if($("jobApplicationCount"))$("jobApplicationCount").textContent="0";empty(box,"Arizalaringizni ko‘rish uchun akkauntga kiring.");return;}
    const r=await data.listMyJobApplications();
    if(!r.ok){if($("jobApplicationCount"))$("jobApplicationCount").textContent="0";empty(box,errorText(r));return;}
    if($("jobApplicationCount"))$("jobApplicationCount").textContent=String((r.data||[]).length);
    if(!r.data?.length){empty(box,"Hozircha ish vakansiyalariga ariza yubormagansiz.");return;}
    r.data.forEach(item=>{
      const node=card(item.job_title,[item.company_name,"Holat: "+(statusLabels[item.status]||item.status),"Yuborilgan: "+new Date(item.submitted_at).toLocaleString("uz-UZ")]);
      box.append(node);
    });
  }
  async function loadOwnedJobs(){
    const box=$("ilMyJobPosts"),requests=$("ilJobOwnerApplications");box.replaceChildren();requests.replaceChildren();
    if(!userId){empty(box,"Vakansiyalarni boshqarish uchun akkauntga kiring.");empty(requests,"Ish beruvchi kabineti uchun akkauntga kiring.");ownedJobs=[];updateCounts();return;}
    const r=await data.listMyJobPosts();
    if(!r.ok){empty(box,errorText(r));ownedJobs=[];return;}
    ownedJobs=Array.isArray(r.data)?r.data:[];
    if(!ownedJobs.length)empty(box,"Siz hali vakansiya joylashtirmagansiz.");
    for(const job of ownedJobs){
      const node=card(job.title,[job.company_name,job.location_label,employmentType(job.employment_type),"Holat: "+(job.status==="published"?"Ochiq":"Yopilgan")]);
      const actions=document.createElement("div");actions.className="card-actions";
      const toggle=document.createElement("button");toggle.className="btn";toggle.type="button";toggle.textContent=job.status==="published"?"Vakansiyani yopish":"Qayta ochish";
      toggle.addEventListener("click",async()=>{toggle.disabled=true;const x=await data.updateJobPostStatus(job.job_post_id,job.status==="published"?"closed":"published");if(!x.ok||x.data!==true){alert(errorText(x));toggle.disabled=false;return;}await loadJobs();await loadOwnedJobs();});
      const view=document.createElement("button");view.className="btn btn-secondary";view.type="button";view.textContent="Arizalarni ko‘rish";
      view.addEventListener("click",async()=>{view.disabled=true;await loadApplicationsFor(job,requests);view.disabled=false;});
      actions.append(toggle,view);node.append(actions);box.append(node);
    }
    updateCounts();
    if(!ownedJobs.length)empty(requests,"Hozircha ko‘rib chiqiladigan arizalar yo‘q.");
  }
  async function loadApplicationsFor(job,box){
    box.replaceChildren();
    const r=await data.listJobPostApplications(job.job_post_id);
    if(!r.ok){empty(box,errorText(r));return;}
    const pending=(r.data||[]).filter(x=>x.status==="submitted");
    if(!pending.length){empty(box,"Bu vakansiya uchun yangi arizalar yo‘q.");return;}
    pending.forEach(item=>{
      const node=card("Yangi ariza",[item.job_title,item.message,new Date(item.submitted_at).toLocaleString("uz-UZ")]);
      const actions=document.createElement("div");actions.className="card-actions";
      [["Qabul qilish","accepted"],["Rad etish","declined"]].forEach(([label,status])=>{
        const button=document.createElement("button");button.className="btn";button.type="button";button.textContent=label;
        button.addEventListener("click",async()=>{button.disabled=true;const x=await data.reviewJobApplication(item.application_id,status);if(!x.ok||x.data!==true){alert(errorText(x));button.disabled=false;return;}await loadApplicationsFor(job,box);});
        actions.append(button);
      });
      node.append(actions);box.append(node);
    });
  }
  async function createJob(event){
    event.preventDefault();
    if(!userId){alert("Vakansiya joylashtirish uchun avval akkauntga kiring.");location.href="auth.html?next=teams.html";return;}
    const input={
      organizationId:clean($("jobOrganization")?.value),
      title:clean($("jobTitle")?.value),
      salary:clean($("jobSalary")?.value),
      location:clean($("jobLocation")?.value),
      employmentType:({ "To‘liq ish kuni":"full_time","Yarim stavka":"part_time","Masofaviy":"remote","Amaliyot":"internship","Frilans":"freelance" })[clean($("jobType")?.value)]||"full_time",
      description:clean($("jobDescription")?.value)
    };
    if(!input.organizationId){alert("Avval o‘zingizga tegishli tashkilotni tanlang.");return;}
    const submit=form.querySelector('[type="submit"]');if(submit)submit.disabled=true;
    setStatus("Vakansiya serverga joylanmoqda…");
    const r=await data.createJobPost(input);
    if(!r.ok){setStatus(errorText(r),true);if(submit)submit.disabled=false;return;}
    form.reset();$("jobFormPanel")?.classList.add("hidden");if(submit)submit.disabled=false;
    setStatus("Vakansiya serverga joylandi.");
    await loadJobs();await loadOwnedJobs();
  }
  document.addEventListener("submit",event=>{
    if(event.target?.id==="jobForm"){event.preventDefault();event.stopImmediatePropagation();createJob(event);}
    if(event.target?.id==="ilApplyForm"){
      event.preventDefault();event.stopImmediatePropagation();
      if(!selectedJob)return;
      const message=clean($("ilApplyMessage").value);
      const button=event.target.querySelector('[type="submit"]');button.disabled=true;
      data.applyJobPost(selectedJob.id,message).then(async r=>{
        button.disabled=false;
        if(!r.ok){alert(errorText(r));return;}
        applicationPanel.hidden=true;selectedJob=null;alert("Arizangiz yuborildi.");await loadMyApplications();
      });
    }
  },true);
  $("ilApplyCancel").addEventListener("click",()=>{applicationPanel.hidden=true;selectedJob=null;});
  document.addEventListener("input",event=>{
    if(event.target?.id==="jobSearch"){event.stopImmediatePropagation();renderJobs();}
  },true);
  document.addEventListener("change",event=>{
    if(event.target?.id==="jobFilter"){event.stopImmediatePropagation();renderJobs();}
  },true);

  async function start(){
    if(!auth||!data){setStatus("Backend modullari yuklanmagan. Sahifani yangilang.",true);return;}
    const configured=auth.getStatus()?.configured?{ok:true}:auth.configure(window.IDEALAB_CONFIG,window.supabase);
    if(!configured.ok){setStatus("Supabase konfiguratsiyasi yoki SDK yuklanmadi.",true);return;}
    const session=await auth.getSession();
    userId=session.ok?session.data?.session?.user?.id||null:null;
    await loadOrganizations();await loadJobs();await loadOwnedJobs();await loadMyApplications();
  }
  start().catch(()=>setStatus("Karyera markazini yuklashda xatolik yuz berdi.",true));
})();
