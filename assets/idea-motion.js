/* IDEA LAB motion layer — GSAP-enhanced, progressive and reduced-motion aware */
(() => {
  "use strict";
  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const gsap = window.gsap;
  if (reduce) return;
  const selectors = [".hero-content",".stats .stat-card","#idea-job-priority .job-priority-head","#idea-job-priority .job-role-card","#ecosystem-map .workflow-step",".projects-section .section-header",".projects-section .project-card",".create-section .create-info",".create-section .create-form-card","body > .topbar","body > main .hero","body > main .section"];
  const targets = Array.from(new Set(selectors.flatMap(selector => Array.from(document.querySelectorAll(selector)))));
  if (gsap) gsap.set(targets,{opacity:0,y:18});
  if ("IntersectionObserver" in window && gsap) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      observer.unobserve(entry.target);
      gsap.to(entry.target,{opacity:1,y:0,duration:.72,ease:"power2.out",clearProps:"willChange"});
    }),{threshold:.12,rootMargin:"0px 0px -35px 0px"});
    targets.forEach(target => observer.observe(target));
  } else if (gsap) gsap.to(targets,{opacity:1,y:0,duration:.6,stagger:.06,ease:"power2.out"});
  const paths = document.querySelectorAll("#idea-job-priority .job-flow-art path");
  if (gsap && paths.length) {
    paths.forEach((path,index) => {
      const length = path.getTotalLength();
      gsap.set(path,{strokeDasharray:length,strokeDashoffset:length});
      gsap.to(path,{strokeDashoffset:0,duration:2.1+index*.35,delay:.35+index*.18,ease:"power1.inOut"});
    });
    gsap.to("#idea-job-priority .job-flow-art circle",{opacity:.35,scale:.72,transformOrigin:"center",duration:1.35,repeat:-1,yoyo:true,stagger:.3,ease:"sine.inOut"});
  }
  document.querySelectorAll("#idea-job-priority .job-role-card").forEach(card => {
    card.addEventListener("pointerenter",() => gsap && gsap.to(card,{y:-5,duration:.22,ease:"power2.out"}));
    card.addEventListener("pointerleave",() => gsap && gsap.to(card,{y:0,duration:.28,ease:"power2.out"}));
  });
})();
