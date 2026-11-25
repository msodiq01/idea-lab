# IDEA LAB Career Module — 100-point execution tracker

Scope: Employer + job seeker module only. Preserve the rest of IDEA LAB.

## Phase 1 — Foundation and access (1–10)
- [x] 1. Career module page exists inside IDEA LAB
- [x] 2. Seeker/employer modes are separated
- [x] 3. Seeker resume form is available
- [x] 4. Employer organization profile submission flow exists
- [x] 5. Employer organization moderation gate exists
- [x] 6. Vacancy submission flow exists
- [x] 7. Vacancy moderation gate exists
- [x] 8. Public listing uses published server records
- [x] 9. Authenticated actions redirect to sign-in
- [ ] 10. Browser-level smoke test of both modes

## Phase 2 — Seeker onboarding and CV (11–20)
- [x] 11. Resume full name field
- [x] 12. City/location field
- [x] 13. Desired roles field
- [x] 14. Skills field
- [x] 15. Experience years
- [x] 16. Experience summary
- [x] 17. Education summary
- [x] 18. Employment-type preferences
- [x] 19. Availability status
- [x] 20. Optional salary preference storage

## Phase 3 — Job discovery (21–30)
- [x] 21. Public vacancy cards
- [x] 22. Text search by title/company/location/description
- [x] 23. Employment type filter
- [x] 24. Skill-based match scoring
- [x] 25. Role matching
- [x] 26. Experience requirement matching
- [x] 27. Location matching
- [x] 28. Employment-type matching
- [x] 29. Match explanations
- [x] 30. Match score disclaimer

## Phase 4 — Applications (31–40)
- [x] 31. Application message field
- [x] 32. Application submission flow
- [x] 33. Application status display
- [x] 34. Candidate can withdraw pending application
- [x] 35. Employer can review applications
- [x] 36. Employer can accept application
- [x] 37. Employer can decline application
- [x] 38. Candidate resume access scoped to applied employer
- [x] 39. Application notifications
- [x] 40. Mark notification read

## Phase 5 — Employer onboarding and posting (41–50)
- [x] 41. Organization name
- [x] 42. Organization area
- [x] 43. Organization description
- [x] 44. Optional website
- [x] 45. Organization status display
- [x] 46. Organization selector in vacancy form
- [x] 47. Vacancy title
- [x] 48. Vacancy description
- [x] 49. Vacancy salary label
- [x] 50. Vacancy location and employment type

## Phase 6 — Vacancy quality (51–60)
- [x] 51. Required skills
- [x] 52. Minimum experience
- [x] 53. Schedule label
- [x] 54. Salary shown transparently as stated by employer
- [ ] 55. Add form-side salary-format examples
- [ ] 56. Add clearer vacancy preview before submit
- [ ] 57. Prevent double-submit on slow connection robustly
- [ ] 58. Add field-level validation feedback
- [ ] 59. Add employer-side draft editing workflow
- [ ] 60. Add deletion/archive policy and confirmation

## Phase 7 — Moderation and trust (61–70)
- [x] 61. Organization moderation queue
- [x] 62. Organization approval/rejection actions
- [x] 63. Vacancy moderation queue
- [x] 64. Vacancy approval/rejection actions
- [x] 65. Self-approval blocked server-side
- [ ] 66. Provide reviewer checklist for suspicious posts
- [ ] 67. Provide clear rejection reason capture
- [ ] 68. Add report-vacancy flow
- [ ] 69. Add moderation audit trail UI
- [ ] 70. Document safe job-seeking and scam warning

## Phase 8 — Dashboard and usability (71–80)
- [x] 71. Seeker application dashboard
- [x] 72. Employer vacancy dashboard
- [x] 73. Employer application list
- [x] 74. Seeker notification feed
- [x] 75. Empty-state messaging
- [x] 76. Mode-specific actions hidden
- [ ] 77. Add clear mode-specific onboarding steps
- [ ] 78. Add dashboard summary counts and shortcuts
- [ ] 79. Add loading states for every async panel
- [ ] 80. Add retry controls for failed panel loads

## Phase 9 — Accessibility, mobile, privacy (81–90)
- [x] 81. Responsive layout
- [x] 82. Accessible status role on main notice
- [x] 83. No public phone/passport fields in resume
- [x] 84. Private resume data protected by server policies
- [x] 85. Employer candidate data scoped to applications
- [ ] 86. Keyboard-only navigation audit
- [ ] 87. Visible focus styles audit
- [ ] 88. Contrast audit
- [ ] 89. Small-screen interaction audit
- [ ] 90. Privacy copy review across every form

## Phase 10 — QA, deployment, launch readiness (91–100)
- [x] 91. Existing career server-flow test coverage
- [x] 92. Existing custom career behavior tests run previously
- [ ] 93. Repeat automated tests after latest UI commits
- [ ] 94. Confirm latest Pages deployment
- [ ] 95. Test anonymous seeker experience
- [ ] 96. Test authenticated seeker resume save and matching
- [ ] 97. Test employer onboarding and approval
- [ ] 98. Test vacancy approval and public listing
- [ ] 99. Test application lifecycle and notifications end-to-end
- [ ] 100. Launch checklist and final release sign-off

## Status notes
- Checkmarks indicate implemented features or tests previously confirmed in repository/test work; they do not imply fresh browser verification today.
- Live end-to-end testing is blocked until test accounts, an approved employer, a published vacancy, and moderator access are provisioned.
- Keep other IDEA LAB modules out of scope for this tracker.
