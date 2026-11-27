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
  let userId=null,jobs=[],ownedJobs=[],selectedJob=null,activeMode="seeker",appliedJobIds=new Set();
  const section=$("career-section"),jobList=$("jobList"),form=$("jobForm");
  function setCareerMode(mode){
    const active=mode==="employer"?"employer":"seeker";activeMode=active;
    document.querySelectorAll("[data-career-flow]").forEach(node=>{node.hidden=node.dataset.careerFlow!=="both"&&node.dataset.careerFlow!==active;});document.querySelectorAll(".career-apply-action").forEach(button=>{button.hidden=active==="employer";});
    if(active==="seeker"){$("employerOrgPanel").hidden=true;$("jobFormPanel").hidden=true;}else if(typeof applicationPanel!=="undefined"){applicationPanel.hidden=true;selectedJob=null;}
    $("modeSeeker").className=active==="seeker"?"btn green":"btn secondary";
    $("modeEmployer").className=active==="employer"?"btn green":"btn secondary";
  }
  const resumeForm=$("jobSeekerResumeForm"),matchBox=$("matchingJobs"),employerOrgForm=$("employerOrgForm");
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
  myPosts.dataset.careerFlow="employer";
  myPosts.innerHTML='<div class="section-heading"><div><h2>Mening vakansiyalarim</h2><p>Joylashtirgan e’lonlaringizni boshqaring va arizalarni ko‘rib chiqing.</p></div></div><div id="ilMyJobPosts" class="cards"></div><div id="ilJobOwnerApplications" class="cards" style="margin-top:16px"></div>';
  section.append(myPosts);
  const myApps=document.createElement("section");
  myApps.className="section";
  myApps.dataset.careerFlow="seeker";
  myApps.innerHTML='<div class="section-heading"><div><h2>Mening ish arizalarim</h2><p>Yuborgan arizalaringiz holati.</p></div></div><div id="ilMyJobApplications" class="cards"></div>';
  section.append(myApps);
  const myActivity=document.createElement("section");
  myActivity.className="section";
  myActivity.dataset.careerFlow="both";
  myActivity.innerHTML='<div class="section-heading"><div><h2>Bildirishnomalar</h2><p>Ish beruvchi yoki nomzod arizasi bo‘yicha yangilanishlar shu yerda ko‘rinadi.</p></div></div><div id="ilMyJobActivity" class="cards"></div>';
  section.append(myActivity);

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
  applicationPanel.innerHTML='<h3 id="ilApplyTitle">Vakansiyaga ariza</h3><p class="notice">Ariza yuborilganda ism-familiya, kasb yo‘nalishi, ko‘nikmalar, ta’lim va tajriba ma’lumotlaringiz ushbu ish beruvchiga ko‘rinadi. Telefon, pasport yoki uy manzilingizni kiritmang.</p><div id="ilApplyFeedback" class="notice" role="status" aria-live="polite" hidden></div><form id="ilApplyForm"><div class="field"><label for="ilApplyMessage">Ish beruvchiga xabar (10–2000 belgi)</label><textarea id="ilApplyMessage" required minlength="10" maxlength="2000" rows="5" placeholder="Tajriba, qiziqish va mosligingiz haqida yozing. Telefon, manzil yoki boshqa maxfiy ma’lumotlarni kiritmang."></textarea></div><button class="btn btn-green" type="submit">Ariza yuborish</button><button class="btn btn-secondary" id="ilApplyCancel" type="button">Bekor qilish</button></form>';
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
    const locationQuery=clean($("jobLocationFilter")?.value).toLocaleLowerCase("uz-UZ");
    const salaryFloor=Number($("jobSalaryFilter")?.value||0);
    const sortMode=$("jobSort")?.value||"default";
    const salaryNumber=job=>{
      const label=clean(job.salary_label).toLocaleLowerCase("uz-UZ");
      const first=label.match(/\d[\d\s.,]*/);if(!first)return 0;
      const raw=first[0].trim().replace(/\s/g,"").replace(/,/g,".");
      const amount=Number(raw);if(!Number.isFinite(amount))return 0;
      if(/mln|million|млн/.test(label))return amount*1000000;
      if(/ming|тыс/.test(label))return amount*1000;
      return amount;
    };
    const visible=jobs.filter(job=>{
      const hay=[job.title,job.company_name,job.location_label,job.description,job.schedule_label,employmentType(job.employment_type),...(job.required_skills||[])].join(" ").toLocaleLowerCase("uz-UZ");
      const location=clean(job.location_label).toLocaleLowerCase("uz-UZ");
      const salary=salaryNumber(job);
      return hay.includes(q)&&(!locationQuery||location.includes(locationQuery))&&(!f||employmentType(job.employment_type)===f)&&(!salaryFloor||salary>=salaryFloor);
    });
    if(sortMode==="title")visible.sort((a,b)=>clean(a.title).localeCompare(clean(b.title),"uz"));
    else if(sortMode==="salary")visible.sort((a,b)=>salaryNumber(b)-salaryNumber(a));
    const summary=$("jobResultSummary");
    if(summary)summary.textContent=visible.length+" ta vakansiya ko‘rsatildi (jami "+jobs.length+" ta faol e’lon).";
    if(!visible.length){empty(jobList,"Tanlangan filtrlar bo‘yicha vakansiya topilmadi. Filtrlarni o‘zgartirib ko‘ring.");updateCounts();return;}
    visible.forEach(job=>{
      const node=card(job.title,[job.company_name,job.description]);
      const paragraphs=node.querySelectorAll("p");if(paragraphs[1])paragraphs[1].className="career-description";
      const meta=document.createElement("div");meta.className="career-meta";
      const chips=[job.location_label,employmentType(job.employment_type),job.schedule_label||"",job.experience_years_min>0?"Tajriba: "+job.experience_years_min+" yil":"Tajriba shart emas",job.salary_label||"Maosh kelishiladi"];
      chips.filter(Boolean).forEach((label,index)=>{const chip=document.createElement("span");chip.className="career-chip"+(index===4?" career-salary":"");chip.textContent=label;meta.append(chip);});
      const skills=job.required_skills||[];
      if(skills.length){const skillLine=document.createElement("p");skillLine.textContent="Ko‘nikmalar: "+skills.join(", ");node.append(skillLine);}
      node.insertBefore(meta,node.children[1]||null);
      const actions=document.createElement("div");actions.className="card-actions";
      const apply=document.createElement("button");apply.className="btn btn-green";apply.type="button";
      const alreadyApplied=appliedJobIds.has(job.id);
      apply.textContent=alreadyApplied?"Avval ariza yuborilgan":userId?"Ariza yuborish":"Kirish orqali ariza yuborish";
      apply.disabled=alreadyApplied;
      apply.setAttribute("aria-label",alreadyApplied?job.title+" vakansiyasiga avval ariza yuborilgan":job.title+" vakansiyasiga ariza yuborish");
      apply.classList.add("career-apply-action");apply.hidden=activeMode==="employer";
      apply.addEventListener("click",()=>{
        if(!userId){location.href="auth.html?next=career.html";return;}
        selectedJob=job;$("ilApplyTitle").textContent=job.title+" — ariza";
        $("ilApplyMessage").value="";applicationPanel.hidden=false;applicationPanel.scrollIntoView({behavior:"smooth",block:"center"});
      });
      actions.append(apply);node.append(actions);jobList.append(node);
    });
    updateCounts();
  }
  function splitTags(value,max){
    return clean(value).split(",").map(x=>x.trim()).filter(Boolean).slice(0,max);
  }
  function fillResume(profile){
    if(!resumeForm||!profile)return;
    $("resumeFullName").value=profile.full_name||"";
    $("resumeCity").value=profile.city||"";
    $("resumeRoles").value=(profile.desired_roles||[]).join(", ");
    $("resumeSkills").value=(profile.skill_tags||[]).join(", ");
    $("resumeYears").value=String(profile.experience_years??0);
    $("resumeExperience").value=profile.experience_summary||"";
    $("resumeEducation").value=profile.education_summary||"";
    $("resumeMinSalary").value=profile.min_salary_uzs??"";
    $("resumeMaxSalary").value=profile.max_salary_uzs??"";
    $("resumeAvailability").value=profile.availability_status||"open";
    const selected=new Set(profile.employment_types||["full_time"]);
    Array.from($("resumeEmploymentTypes").querySelectorAll('input[type="checkbox"]')).forEach(option=>option.checked=selected.has(option.value));
  }
  async function loadResume(){
    if(!resumeForm)return;
    if(!userId){resumeForm.querySelectorAll("input,textarea,select,button").forEach(x=>x.disabled=true);$("resumeSaveStatus").textContent="Rezyumeni yaratish uchun avval IDEA LAB akkauntiga kiring.";return;}
    const r=await data.getMyJobSeekerProfile();
    if(!r.ok){$("resumeSaveStatus").textContent=errorText(r);return;}
    const profile=Array.isArray(r.data)?r.data[0]:r.data;
    if(profile){fillResume(profile);$("resumeSaveStatus").textContent="Saqlangan rezyume yuklandi.";}
    else $("resumeSaveStatus").textContent="Rezyumeni to‘ldirib saqlang — mos vakansiyalar shundan keyin ko‘rinadi.";
  }
  async function saveResume(event){
    event.preventDefault();
    if(!userId){location.href="auth.html?next=career.html";return;}
    const types=Array.from($("resumeEmploymentTypes").querySelectorAll('input[type="checkbox"]:checked')).map(x=>x.value);
    const input={
      fullName:clean($("resumeFullName").value),
      city:clean($("resumeCity").value),
      desiredRoles:splitTags($("resumeRoles").value,8),
      skills:splitTags($("resumeSkills").value,30),
      experienceYears:Number($("resumeYears").value||0),
      experienceSummary:clean($("resumeExperience").value),
      educationSummary:clean($("resumeEducation").value),
      minSalary:$("resumeMinSalary").value,
      maxSalary:$("resumeMaxSalary").value,
      employmentTypes:types.length?types:["full_time"],
      availabilityStatus:$("resumeAvailability").value
    };
    if(!input.desiredRoles.length){$("resumeSaveStatus").textContent="Kamida bitta kasb yoki lavozimni kiriting.";return;}
    const min=Number(input.minSalary||0),max=Number(input.maxSalary||0);
    if(input.minSalary!==""&&input.maxSalary!==""&&min>max){$("resumeSaveStatus").textContent="Maosh oralig‘ida eng kam qiymat yuqori qiymatdan oshmasligi kerak.";return;}
    const button=resumeForm.querySelector('[type="submit"]');button.disabled=true;
    $("resumeSaveStatus").textContent="Rezyume saqlanmoqda…";
    const r=await data.upsertJobSeekerProfile(input);
    button.disabled=false;
    if(!r.ok){$("resumeSaveStatus").textContent=errorText(r);return;}
    $("resumeSaveStatus").textContent="Rezyume muvaffaqiyatli saqlandi.";
    await loadMatches();
  }
  async function loadMatches(){
    if(!matchBox)return;
    matchBox.replaceChildren();
    if(!userId){empty(matchBox,"Mos vakansiyalarni ko‘rish uchun tizimga kiring va rezyume yarating.");return;}
    const r=await data.listMatchingJobs();
    if(!r.ok){empty(matchBox,errorText(r));return;}
    if(!r.data?.length){empty(matchBox,"Hozircha rezyumengizga mos haqiqiy vakansiya topilmadi. Yangi e’lonlar joylashtirilganda shu yerda ko‘rinadi.");return;}
    r.data.forEach(job=>{
      const reasons=Array.isArray(job.match_reasons)?job.match_reasons.join(" • "):"";
      const node=card(job.title,[job.company_name,job.location_label,employmentType(job.employment_type),job.schedule_label||"",job.experience_years_min>0?"Eng kam tajriba: "+job.experience_years_min+" yil":"Tajriba shart emas",job.required_skills?.length?"Kerakli ko‘nikmalar: "+job.required_skills.join(", "):"",job.salary_label||"Maosh: kelishiladi",reasons]);
      const score=document.createElement("p");score.className="notice";score.textContent="Moslik: "+Number(job.match_score||0)+"% — bu yo‘naltiruvchi baho, ishga qabul qilish kafolati emas.";node.append(score);
      const actions=document.createElement("div");actions.className="card-actions";
      const apply=document.createElement("button");apply.className="btn green career-apply-action";apply.type="button";apply.textContent=userId?"Ariza yuborish":"Kirish orqali ariza yuborish";apply.hidden=activeMode==="employer";
      apply.addEventListener("click",()=>{if(!userId){location.href="auth.html?next=career.html";return;}selectedJob=job;$("ilApplyTitle").textContent=job.title+" — ariza";$("ilApplyMessage").value="";applicationPanel.hidden=false;applicationPanel.scrollIntoView({behavior:"smooth",block:"center"});});
      actions.append(apply);node.append(actions);matchBox.append(node);
    });
  }
  async function loadModeration(){
    const panel=$("moderationPanel"),orgBox=$("moderationOrganizations"),jobBox=$("moderationJobs");
    if(!panel||!orgBox||!jobBox||!userId)return;
    const access=await data.isJobModerator();
    if(!access.ok||access.data!==true){panel.hidden=true;return;}
    panel.hidden=false;
    const orgResult=await data.listPendingOrganizations();
    orgBox.replaceChildren();
    if(!orgResult.ok)empty(orgBox,errorText(orgResult));
    else if(!orgResult.data?.length)empty(orgBox,"Tekshiruv navbatida tashkilot yo‘q.");
    else orgResult.data.forEach(org=>{
      const node=card(org.name,[org.organization_type,org.location_label||"Hudud ko‘rsatilmagan",org.description,org.website_url||"", "Yuborilgan: "+new Date(org.created_at).toLocaleString("uz-UZ")]);
      const actions=document.createElement("div");actions.className="card-actions";
      const approveButton=document.createElement("button");approveButton.className="btn";approveButton.type="button";approveButton.textContent="Tasdiqlash";
      approveButton.addEventListener("click",async()=>{approveButton.disabled=true;const reviewed=await data.reviewOrganization(org.organization_id,true);if(!reviewed.ok||reviewed.data!==true){alert(errorText(reviewed));approveButton.disabled=false;return;}await loadModeration();await loadOrganizations();});
      actions.append(approveButton);
      node.append(actions);orgBox.append(node);
    });
    const jobResult=await data.listPendingJobPosts();
    jobBox.replaceChildren();
    if(!jobResult.ok)empty(jobBox,errorText(jobResult));
    else if(!jobResult.data?.length)empty(jobBox,"Tekshiruv navbatida vakansiya yo‘q.");
    else jobResult.data.forEach(job=>{
      const node=card(job.title,[job.company_name,job.location_label,employmentType(job.employment_type),job.schedule_label||"",job.experience_years_min>0?"Eng kam tajriba: "+job.experience_years_min+" yil":"Tajriba shart emas",job.required_skills?.length?"Ko‘nikmalar: "+job.required_skills.join(", "):"",job.salary_label||"Maosh: kelishiladi",job.description,"Yuborilgan: "+new Date(job.created_at).toLocaleString("uz-UZ")]);
      const actions=document.createElement("div");actions.className="card-actions";
      [["Vakansiyani tasdiqlash",true],["Rad etish",false]].forEach(([label,approve])=>{
        const button=document.createElement("button");button.className="btn";button.type="button";button.textContent=label;
        button.addEventListener("click",async()=>{button.disabled=true;const reviewed=await data.reviewJobPost(job.job_post_id,approve);if(!reviewed.ok||reviewed.data!==true){alert(errorText(reviewed));button.disabled=false;return;}await loadModeration();await loadJobs();await loadOwnedJobs();});
        actions.append(button);
      });
      node.append(actions);jobBox.append(node);
    });
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
    const statusBox=$("employerOrgStatus");if(statusBox)statusBox.replaceChildren();
    const orgHelp=$("jobOrganizationHelp");if(orgHelp){orgHelp.hidden=false;orgHelp.textContent="Vakansiya joylash uchun faol tashkilot kerak. Tashkilot profili avtomatik faollashadi; vakansiya alohida tekshiriladi."; }
    if(!userId){select.disabled=true;if(statusBox)empty(statusBox,"Tashkilot holatini ko‘rish uchun akkauntga kiring.");if(orgHelp)orgHelp.textContent="Avval akkauntga kiring, keyin tashkilot profilini yarating.";return;}
    const r=await data.listMyOrganizations();
    if(!r.ok){select.disabled=true;setStatus(errorText(r),true);if(statusBox)empty(statusBox,errorText(r));return;}
    const all=Array.isArray(r.data)?r.data:[];
    const organizations=all.filter(x=>x.organization_type!=="team"&&x.visibility==="public"&&x.status==="active");
    organizations.forEach(org=>select.add(new Option(org.name,org.id)));
    select.disabled=false;
    if(statusBox){
      if(!all.length)empty(statusBox,"Hali ish beruvchi tashkilot profilingiz yo‘q.");
      all.forEach(org=>{
        const labels={draft:"Qoralama",pending_review:"Tekshiruvda",active:"Faol — avtomatik",rejected:"Rad etilgan",archived:"Arxivlangan"};
        const details=["Holat: "+(labels[org.status]||org.status),org.location_label||"Hudud ko‘rsatilmagan"];
        if(org.status==="active")details.push("Avtomatik faollashtirilgan; bu yuridik tekshiruvdan o‘tganini anglatmaydi.");
        statusBox.append(card(org.name,details));
      });
    }
    if(!organizations.length){
      select.add(new Option("Faol tashkilot yo‘q",""));
      select.disabled=true;
      const message=all.some(x=>x.status==="pending_review")
        ?"Tashkilot profilingiz tekshiruvda. Moderator tasdiqlagach vakansiya joylashtirish ochiladi."
        :"Avval tashkilot profilini yarating. U avtomatik faollashadi, vakansiya esa alohida tekshiriladi.";
      formHint.textContent=message;
      if(orgHelp)orgHelp.textContent=message+" Quyidagi “Tashkilot yaratish” tugmasi orqali davom eting.";
    }else{select.disabled=false;if(orgHelp)orgHelp.textContent="Tashkilotni tanlang, keyin vakansiya ma’lumotlarini to‘ldiring.";}
  }
  async function createEmployerOrganization(event){
    event.preventDefault();
    if(!userId){location.href="auth.html?next=career.html";return;}
    const input={
      name:clean($("employerOrgName").value),
      location:clean($("employerOrgLocation").value),
      description:clean($("employerOrgDescription").value),
      websiteUrl:clean($("employerOrgWebsite").value),
      type:"company",visibility:"public"
    };
    const button=employerOrgForm.querySelector('[type="submit"]');button.disabled=true;
    setStatus("Tashkilot ma’lumotlari saqlanmoqda…");
    const submitted=await data.createActiveOrganization(input);
    button.disabled=false;
    if(!submitted.ok){
      setStatus(errorText(submitted),true);
      await loadOrganizations();return;
    }
    const organizationId=typeof submitted.data==="string"?submitted.data:submitted.data?.id;
    if(!organizationId){
      setStatus("Tashkilot yuborildi, lekin ID qaytmadi. Kabinetdan holatini tekshiring.",true);
      await loadOrganizations();return;
    }
    employerOrgForm.reset();
    setStatus("Tashkilot avtomatik faollashtirildi. Bu yuridik tekshiruvdan o‘tganini anglatmaydi; vakansiyalar alohida tekshiruvdan o‘tadi.");
    await loadOrganizations();
  }
  async function loadMyApplications(){
    const box=$("ilMyJobApplications");box.replaceChildren();
    if(!userId){if($("jobApplicationCount"))$("jobApplicationCount").textContent="0";empty(box,"Arizalaringizni ko‘rish uchun akkauntga kiring.");return;}
    const r=await data.listMyJobApplications();
    if(!r.ok){if($("jobApplicationCount"))$("jobApplicationCount").textContent="0";empty(box,errorText(r));return;}
    appliedJobIds=new Set((Array.isArray(r.data)?r.data:[]).map(item=>item.job_post_id).filter(Boolean));
    renderJobs();
    if($("jobApplicationCount"))$("jobApplicationCount").textContent=String((r.data||[]).length);
    if(!r.data?.length){empty(box,"Hozircha ish vakansiyalariga ariza yubormagansiz.");return;}
    r.data.forEach(item=>{
      const node=card(item.job_title,[item.company_name,"Holat: "+(statusLabels[item.status]||item.status),"Yuborilgan: "+new Date(item.submitted_at).toLocaleString("uz-UZ")]);
      if(item.status==="submitted"){
        const button=document.createElement("button");button.className="btn secondary";button.type="button";button.textContent="Arizani qaytarib olish";
        button.addEventListener("click",async()=>{button.disabled=true;const x=await data.withdrawJobApplication(item.application_id);if(!x.ok||x.data!==true){alert(errorText(x));button.disabled=false;return;}await loadMyApplications();await loadMyActivity();});
        node.append(button);
      }
      box.append(node);
    });
  }
  async function loadMyActivity(){
    const box=$("ilMyJobActivity");if(!box)return;
    box.replaceChildren();
    if(!userId){empty(box,"Bildirishnomalarni ko‘rish uchun akkauntga kiring.");return;}
    const r=await data.listMyJobActivity();
    if(!r.ok){empty(box,errorText(r));return;}
    if(!r.data?.length){empty(box,"Hozircha yangi bildirishnoma yo‘q.");return;}
    r.data.forEach(item=>{
      const labels={submitted:"Yangi ariza kelib tushdi",accepted:"Arizangiz qabul qilindi",declined:"Arizangiz rad etildi",withdrawn:"Ariza qaytarib olindi"};
      const node=card(item.job_title||"Ish arizasi",[item.company_name||"Ish beruvchi",labels[item.to_status]||"Ariza holati: "+item.to_status,new Date(item.created_at).toLocaleString("uz-UZ"),item.read_at?"O‘qilgan":"Yangi bildirishnoma"]);
      if(!item.read_at){
        const button=document.createElement("button");button.className="btn secondary";button.type="button";button.textContent="O‘qildi deb belgilash";
        button.addEventListener("click",async()=>{button.disabled=true;const x=await data.markJobActivityRead(item.activity_id);if(!x.ok){alert(errorText(x));button.disabled=false;return;}await loadMyActivity();});
        node.append(button);
      }
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
      const labels={pending_review:"Tekshiruvda",published:"Ochiq",closed:"Yopilgan",rejected:"Rad etilgan"};
      const node=card(job.title,[job.company_name,job.location_label,employmentType(job.employment_type),job.schedule_label||"",job.experience_years_min>0?"Eng kam tajriba: "+job.experience_years_min+" yil":"Tajriba shart emas",job.required_skills?.length?"Ko‘nikmalar: "+job.required_skills.join(", "):"","Holat: "+(labels[job.status]||job.status)]);
      const actions=document.createElement("div");actions.className="card-actions";
      if(job.status!=="pending_review"&&job.status!=="rejected"){
        const toggle=document.createElement("button");toggle.className="btn";toggle.type="button";
        toggle.textContent=job.status==="published"?"Vakansiyani yopish":"Tekshiruvga qayta yuborish";
        toggle.addEventListener("click",async()=>{toggle.disabled=true;const x=await data.updateJobPostStatus(job.job_post_id,job.status==="published"?"closed":"pending_review");if(!x.ok||x.data!==true){alert(errorText(x));toggle.disabled=false;return;}await loadJobs();await loadOwnedJobs();});
        actions.append(toggle);
      } else if(job.status==="pending_review") {
        const waiting=document.createElement("span");waiting.className="notice";waiting.textContent="Moderator tekshiruvi kutilmoqda";actions.append(waiting);
      }
      if(job.status==="published"||job.status==="closed"){
        const view=document.createElement("button");view.className="btn secondary";view.type="button";view.textContent="Arizalarni ko‘rish";
        view.addEventListener("click",async()=>{view.disabled=true;await loadApplicationsFor(job,requests);view.disabled=false;});
        actions.append(view);
      }
      if(actions.childNodes.length)node.append(actions);box.append(node);
    }
    updateCounts();
    if(!ownedJobs.length)empty(requests,"Hozircha ko‘rib chiqiladigan arizalar yo‘q.");
  }
  async function loadApplicationsFor(job,box){
    box.replaceChildren();
    const r=await data.listJobPostApplications(job.job_post_id);
    if(!r.ok){empty(box,errorText(r));return;}
    const applications=Array.isArray(r.data)?r.data:[];
    if(!applications.length){empty(box,"Bu vakansiya uchun hali ariza kelib tushmagan.");return;}
    applications.forEach(item=>{
      const statusLabels={submitted:"Ko‘rib chiqilmoqda",accepted:"Qabul qilindi",declined:"Rad etildi",withdrawn:"Qaytarib olindi"};
      const candidateLines=[
        item.candidate_city||"",
        item.candidate_roles?.length?"Kasblar: "+item.candidate_roles.join(", "):"",
        item.candidate_skills?.length?"Ko‘nikmalar: "+item.candidate_skills.join(", "):"",
        item.candidate_experience_years!=null?"Tajriba: "+item.candidate_experience_years+" yil":"",
        item.candidate_experience_summary||"",
        item.candidate_education_summary||"",
        "Ariza holati: "+(statusLabels[item.status]||item.status),
        "Ariza xabari: "+item.message,
        "Yuborilgan: "+new Date(item.submitted_at).toLocaleString("uz-UZ")
      ];
      const node=card(item.candidate_name||"Nomzod",candidateLines);
      if(item.status==="submitted"){
        const actions=document.createElement("div");actions.className="card-actions";
        [["Qabul qilish","accepted"],["Rad etish","declined"]].forEach(([label,status])=>{
          const button=document.createElement("button");button.className="btn";button.type="button";button.textContent=label;
          button.addEventListener("click",async()=>{button.disabled=true;const x=await data.reviewJobApplication(item.application_id,status);if(!x.ok||x.data!==true){alert(errorText(x));button.disabled=false;return;}await loadApplicationsFor(job,box);});
          actions.append(button);
        });
        node.append(actions);
      }
      box.append(node);
    });
  }
  async function createJob(event){
    event.preventDefault();
    if(!userId){alert("Vakansiya joylashtirish uchun avval akkauntga kiring.");location.href="auth.html?next=career.html";return;}
    const input={
      organizationId:clean($("jobOrganization")?.value),
      title:clean($("jobTitle")?.value),
      salary:clean($("jobSalary")?.value),
      location:clean($("jobLocation")?.value),
      employmentType:({ "To‘liq ish kuni":"full_time","Yarim stavka":"part_time","Masofaviy":"remote","Amaliyot":"internship","Frilans":"freelance" })[clean($("jobType")?.value)]||"full_time",
      requiredSkills:splitTags($("jobSkills")?.value,20),
      experienceYearsMin:Number($("jobExperienceYears")?.value||0),
      schedule:clean($("jobSchedule")?.value),
      description:clean($("jobDescription")?.value)
    };
    if(!input.organizationId){alert("Avval o‘zingizga tegishli tashkilotni tanlang.");return;}
    const submit=form.querySelector('[type="submit"]');if(submit)submit.disabled=true;
    setStatus("Vakansiya serverga joylanmoqda…");
    const r=await data.createJobPost(input);
    if(!r.ok){setStatus(errorText(r),true);if(submit)submit.disabled=false;return;}
    form.reset();if($("jobFormPanel"))$("jobFormPanel").hidden=true;if(submit)submit.disabled=false;
    setStatus("Vakansiya moderator tekshiruviga yuborildi. Tasdiqlangach katalogda ko‘rinadi.");
    await loadJobs();await loadOwnedJobs();
  }
  document.addEventListener("submit",async event=>{
    if(event.target?.id==="employerOrgForm"){
      event.preventDefault();event.stopImmediatePropagation();
      try{await createEmployerOrganization(event);}
      catch(error){const button=employerOrgForm.querySelector('[type="submit"]');if(button)button.disabled=false;setStatus("Tashkilot yuborilmadi. Internetni tekshirib, qayta urinib ko‘ring.",true);}
      return;
    }
    if(event.target?.id==="jobSeekerResumeForm"){
      event.preventDefault();event.stopImmediatePropagation();
      try{await saveResume(event);}
      catch(error){const button=resumeForm.querySelector('[type="submit"]');if(button)button.disabled=false;$("resumeSaveStatus").textContent="Rezyumeni saqlashda xatolik yuz berdi. Qayta urinib ko‘ring.";}
      return;
    }
    if(event.target?.id==="jobForm"){
      event.preventDefault();event.stopImmediatePropagation();
      try{await createJob(event);}
      catch(error){const button=form.querySelector('[type="submit"]');if(button)button.disabled=false;setStatus("Vakansiya joylanmadi. Internetni tekshirib, qayta urinib ko‘ring.",true);}
      return;
    }
    if(event.target?.id==="ilApplyForm"){
      event.preventDefault();event.stopImmediatePropagation();
      if(!selectedJob)return;
      const message=clean($("ilApplyMessage").value);
      const feedback=$("ilApplyFeedback");feedback.hidden=false;feedback.textContent="";feedback.style.borderColor="";
      const button=event.target.querySelector('[type="submit"]');button.disabled=true;
      const originalText=button.textContent;button.textContent="Yuborilmoqda…";
      try{
        const r=await data.applyJobPost(selectedJob.id,message);
        if(!r.ok){feedback.textContent=errorText(r);feedback.style.borderColor="rgba(255,100,124,.65)";return;}
        feedback.textContent="Arizangiz muvaffaqiyatli yuborildi. Holatini “Mening ish arizalarim” bo‘limidan kuzatishingiz mumkin.";
        feedback.style.borderColor="rgba(22,199,181,.35)";
        selectedJob=null;event.target.reset();await loadMyApplications();await loadMyActivity();
      }catch(error){
        feedback.textContent="Ariza yuborishda vaqtinchalik xatolik yuz berdi. Internetni tekshirib, qayta urinib ko‘ring.";
        feedback.style.borderColor="rgba(255,100,124,.65)";
      }finally{
        button.disabled=false;button.textContent=originalText;
      }
    }
  },true);
  $("ilApplyCancel").addEventListener("click",()=>{applicationPanel.hidden=true;selectedJob=null;$("ilApplyFeedback").hidden=true;$("ilApplyFeedback").textContent="";});
  $("modeSeeker")?.addEventListener("click",()=>setCareerMode("seeker"));
  $("modeEmployer")?.addEventListener("click",()=>setCareerMode("employer"));
  setCareerMode("seeker");
  $("openEmployerOrg")?.addEventListener("click",()=>{if(!userId){location.href="auth.html?next=career.html";return;}$("employerOrgPanel").hidden=!$("employerOrgPanel").hidden;loadOrganizations();});
  $("cancelEmployerOrg")?.addEventListener("click",()=>{$("employerOrgPanel").hidden=true;});
  $("refreshMatches")?.addEventListener("click",loadMatches);
  document.addEventListener("input",event=>{
    if(["jobSearch","jobLocationFilter","jobSalaryFilter","jobSort"].includes(event.target?.id)){event.stopImmediatePropagation();renderJobs();}
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
    await loadOrganizations();await loadJobs();await loadOwnedJobs();await loadMyApplications();await loadMyActivity();await loadResume();await loadMatches();await loadModeration();
  }
  start().catch(()=>setStatus("Karyera markazini yuklashda xatolik yuz berdi.",true));
})();
