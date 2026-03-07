const PROJECTS = [
  {
    id: "p-100",
    name: "Customer Portal Refresh",
    owner: "Ava Patel",
    status: "ON_TRACK",
    quarter: "2026-Q2",
    percentComplete: 72,
    budgetPlanned: 420000,
    budgetActual: 401000,
    timelineStatus: "ON_TRACK",
    startDate: "2026-01-15",
    endDate: "2026-06-20",
    executiveSummary: "Beta adoption is ahead of plan and engineering burn rate is stable.",
  },
  {
    id: "p-101",
    name: "ERP Migration",
    owner: "Marcus Reed",
    status: "AT_RISK",
    quarter: "2026-Q2",
    percentComplete: 58,
    budgetPlanned: 760000,
    budgetActual: 812000,
    timelineStatus: "SLIPPING",
    startDate: "2025-11-03",
    endDate: "2026-06-28",
    executiveSummary: "Data mapping is taking longer than planned and vendor cutover needs a revised sequence.",
  },
  {
    id: "p-102",
    name: "Field Service Mobile App",
    owner: "Nina Alvarez",
    status: "ON_TRACK",
    quarter: "2026-Q2",
    percentComplete: 81,
    budgetPlanned: 530000,
    budgetActual: 521000,
    timelineStatus: "ON_TRACK",
    startDate: "2026-01-08",
    endDate: "2026-06-10",
    executiveSummary: "Pilot crews are already using the release candidate and defect volume is trending down.",
  },
  {
    id: "p-103",
    name: "Pricing Intelligence Rollout",
    owner: "Liam Chen",
    status: "BLOCKED",
    quarter: "2026-Q2",
    percentComplete: 44,
    budgetPlanned: 390000,
    budgetActual: 398000,
    timelineStatus: "LATE",
    startDate: "2026-02-01",
    endDate: "2026-06-30",
    executiveSummary: "Legal approval for external market feeds is still outstanding, which blocks the final analytics layer.",
  },
  {
    id: "p-104",
    name: "Compliance Automation",
    owner: "Zoe Martin",
    status: "AT_RISK",
    quarter: "2026-Q2",
    percentComplete: 63,
    budgetPlanned: 280000,
    budgetActual: 309000,
    timelineStatus: "SLIPPING",
    startDate: "2026-01-20",
    endDate: "2026-06-24",
    executiveSummary: "Audit workflow integration is working, but control evidence exports still require manual review.",
  },
  {
    id: "p-105",
    name: "Revenue Forecasting Workspace",
    owner: "Ava Patel",
    status: "COMPLETE",
    quarter: "2026-Q2",
    percentComplete: 100,
    budgetPlanned: 210000,
    budgetActual: 205000,
    timelineStatus: "ON_TRACK",
    startDate: "2026-01-10",
    endDate: "2026-05-18",
    executiveSummary: "Delivered to finance on schedule with a lighter than expected services footprint.",
  },
  {
    id: "p-106",
    name: "Partner API Expansion",
    owner: "Marcus Reed",
    status: "ON_TRACK",
    quarter: "2026-Q3",
    percentComplete: 24,
    budgetPlanned: 340000,
    budgetActual: 97000,
    timelineStatus: "ON_TRACK",
    startDate: "2026-05-20",
    endDate: "2026-09-29",
    executiveSummary: "Discovery is complete and the external developer program is ready for onboarding.",
  },
  {
    id: "p-107",
    name: "Marketing Data Lake",
    owner: "Nina Alvarez",
    status: "ON_TRACK",
    quarter: "2026-Q3",
    percentComplete: 31,
    budgetPlanned: 460000,
    budgetActual: 158000,
    timelineStatus: "ON_TRACK",
    startDate: "2026-05-12",
    endDate: "2026-09-15",
    executiveSummary: "Source-system ingestion is stable and dashboard requirements are nearly finalized.",
  },
];

const MILESTONES = [
  {
    id: "m-1001",
    projectId: "p-100",
    projectName: "Customer Portal Refresh",
    name: "Design system sign-off",
    owner: "Ava Patel",
    status: "DONE",
    quarter: "2026-Q2",
    targetDate: "2026-04-04",
    completedDate: "2026-04-01",
    percentComplete: 100,
    summary: "New navigation and self-service patterns were approved by support and product leads.",
  },
  {
    id: "m-1002",
    projectId: "p-100",
    projectName: "Customer Portal Refresh",
    name: "Authenticated beta launch",
    owner: "Ava Patel",
    status: "DONE",
    quarter: "2026-Q2",
    targetDate: "2026-04-29",
    completedDate: "2026-04-26",
    percentComplete: 100,
    summary: "The beta launched to enterprise accounts with strong engagement in the first week.",
  },
  {
    id: "m-1003",
    projectId: "p-100",
    projectName: "Customer Portal Refresh",
    name: "Billing handoff",
    owner: "Ava Patel",
    status: "IN_PROGRESS",
    quarter: "2026-Q2",
    targetDate: "2026-05-28",
    completedDate: "",
    percentComplete: 68,
    summary: "Billing integration is on pace, with only minor edge-case testing left.",
  },
  {
    id: "m-1004",
    projectId: "p-100",
    projectName: "Customer Portal Refresh",
    name: "General availability",
    owner: "Ava Patel",
    status: "IN_PROGRESS",
    quarter: "2026-Q2",
    targetDate: "2026-06-18",
    completedDate: "",
    percentComplete: 54,
    summary: "Launch readiness is on track pending performance validation in the final environment.",
  },
  {
    id: "m-1011",
    projectId: "p-101",
    projectName: "ERP Migration",
    name: "Data model freeze",
    owner: "Marcus Reed",
    status: "DONE",
    quarter: "2026-Q2",
    targetDate: "2026-03-22",
    completedDate: "2026-03-25",
    percentComplete: 100,
    summary: "The canonical finance and supply chain model is stable.",
  },
  {
    id: "m-1012",
    projectId: "p-101",
    projectName: "ERP Migration",
    name: "Integration test wave 1",
    owner: "Marcus Reed",
    status: "AT_RISK",
    quarter: "2026-Q2",
    targetDate: "2026-05-06",
    completedDate: "",
    percentComplete: 57,
    summary: "Vendor connectors need rework for inventory adjustments and returns.",
  },
  {
    id: "m-1013",
    projectId: "p-101",
    projectName: "ERP Migration",
    name: "Finance cutover rehearsal",
    owner: "Marcus Reed",
    status: "NOT_STARTED",
    quarter: "2026-Q2",
    targetDate: "2026-06-04",
    completedDate: "",
    percentComplete: 12,
    summary: "The rehearsal is waiting on data reconciliation from the first test wave.",
  },
  {
    id: "m-1014",
    projectId: "p-101",
    projectName: "ERP Migration",
    name: "Go-live readiness review",
    owner: "Marcus Reed",
    status: "NOT_STARTED",
    quarter: "2026-Q2",
    targetDate: "2026-06-26",
    completedDate: "",
    percentComplete: 0,
    summary: "Executive readiness review depends on the integration recovery plan.",
  },
  {
    id: "m-1021",
    projectId: "p-102",
    projectName: "Field Service Mobile App",
    name: "Offline sync validation",
    owner: "Nina Alvarez",
    status: "DONE",
    quarter: "2026-Q2",
    targetDate: "2026-04-10",
    completedDate: "2026-04-07",
    percentComplete: 100,
    summary: "Technician sync tests passed in low-connectivity scenarios.",
  },
  {
    id: "m-1022",
    projectId: "p-102",
    projectName: "Field Service Mobile App",
    name: "Pilot deployment",
    owner: "Nina Alvarez",
    status: "DONE",
    quarter: "2026-Q2",
    targetDate: "2026-04-26",
    completedDate: "2026-04-24",
    percentComplete: 100,
    summary: "Three regions are actively using the pilot build with positive feedback.",
  },
  {
    id: "m-1023",
    projectId: "p-102",
    projectName: "Field Service Mobile App",
    name: "Training package release",
    owner: "Nina Alvarez",
    status: "IN_PROGRESS",
    quarter: "2026-Q2",
    targetDate: "2026-05-20",
    completedDate: "",
    percentComplete: 73,
    summary: "Manager training content is being localized for two additional regions.",
  },
  {
    id: "m-1024",
    projectId: "p-102",
    projectName: "Field Service Mobile App",
    name: "Company-wide rollout",
    owner: "Nina Alvarez",
    status: "IN_PROGRESS",
    quarter: "2026-Q2",
    targetDate: "2026-06-12",
    completedDate: "",
    percentComplete: 61,
    summary: "Support staffing and deployment sequencing are aligned for the final rollout.",
  },
  {
    id: "m-1031",
    projectId: "p-103",
    projectName: "Pricing Intelligence Rollout",
    name: "Market feed contract approval",
    owner: "Liam Chen",
    status: "AT_RISK",
    quarter: "2026-Q2",
    targetDate: "2026-04-12",
    completedDate: "",
    percentComplete: 35,
    summary: "Legal review is still open on data licensing terms.",
  },
  {
    id: "m-1032",
    projectId: "p-103",
    projectName: "Pricing Intelligence Rollout",
    name: "Pricing model calibration",
    owner: "Liam Chen",
    status: "NOT_STARTED",
    quarter: "2026-Q2",
    targetDate: "2026-05-18",
    completedDate: "",
    percentComplete: 8,
    summary: "Calibration cannot start until the market feed contract is cleared.",
  },
  {
    id: "m-1033",
    projectId: "p-103",
    projectName: "Pricing Intelligence Rollout",
    name: "Commercial team enablement",
    owner: "Liam Chen",
    status: "NOT_STARTED",
    quarter: "2026-Q2",
    targetDate: "2026-06-10",
    completedDate: "",
    percentComplete: 0,
    summary: "Enablement materials are drafted but awaiting final pricing guidance.",
  },
  {
    id: "m-1041",
    projectId: "p-104",
    projectName: "Compliance Automation",
    name: "Control library import",
    owner: "Zoe Martin",
    status: "DONE",
    quarter: "2026-Q2",
    targetDate: "2026-03-28",
    completedDate: "2026-03-27",
    percentComplete: 100,
    summary: "The control library is live in the governance workspace.",
  },
  {
    id: "m-1042",
    projectId: "p-104",
    projectName: "Compliance Automation",
    name: "Evidence export automation",
    owner: "Zoe Martin",
    status: "AT_RISK",
    quarter: "2026-Q2",
    targetDate: "2026-05-14",
    completedDate: "",
    percentComplete: 49,
    summary: "Large-file handling is still too slow for the audit evidence workflow.",
  },
  {
    id: "m-1043",
    projectId: "p-104",
    projectName: "Compliance Automation",
    name: "Audit dry run",
    owner: "Zoe Martin",
    status: "NOT_STARTED",
    quarter: "2026-Q2",
    targetDate: "2026-06-06",
    completedDate: "",
    percentComplete: 21,
    summary: "The dry run is waiting for the export automation reliability fixes.",
  },
  {
    id: "m-1044",
    projectId: "p-104",
    projectName: "Compliance Automation",
    name: "Executive compliance review",
    owner: "Zoe Martin",
    status: "NOT_STARTED",
    quarter: "2026-Q2",
    targetDate: "2026-06-23",
    completedDate: "",
    percentComplete: 0,
    summary: "The review package will be assembled after the audit dry run.",
  },
  {
    id: "m-1051",
    projectId: "p-105",
    projectName: "Revenue Forecasting Workspace",
    name: "Forecast model sign-off",
    owner: "Ava Patel",
    status: "DONE",
    quarter: "2026-Q2",
    targetDate: "2026-03-18",
    completedDate: "2026-03-16",
    percentComplete: 100,
    summary: "Finance leadership approved the new scenario planning model.",
  },
  {
    id: "m-1052",
    projectId: "p-105",
    projectName: "Revenue Forecasting Workspace",
    name: "Planner onboarding",
    owner: "Ava Patel",
    status: "DONE",
    quarter: "2026-Q2",
    targetDate: "2026-04-22",
    completedDate: "2026-04-18",
    percentComplete: 100,
    summary: "Regional planners completed onboarding two weeks ahead of schedule.",
  },
  {
    id: "m-1053",
    projectId: "p-105",
    projectName: "Revenue Forecasting Workspace",
    name: "Quarterly close support",
    owner: "Ava Patel",
    status: "DONE",
    quarter: "2026-Q2",
    targetDate: "2026-05-16",
    completedDate: "2026-05-14",
    percentComplete: 100,
    summary: "Finance used the workspace successfully for the quarterly close.",
  },
  {
    id: "m-1061",
    projectId: "p-106",
    projectName: "Partner API Expansion",
    name: "Partner onboarding blueprint",
    owner: "Marcus Reed",
    status: "IN_PROGRESS",
    quarter: "2026-Q3",
    targetDate: "2026-07-08",
    completedDate: "",
    percentComplete: 44,
    summary: "Platform and support teams aligned on the onboarding workflow.",
  },
  {
    id: "m-1062",
    projectId: "p-106",
    projectName: "Partner API Expansion",
    name: "Sandbox release",
    owner: "Marcus Reed",
    status: "NOT_STARTED",
    quarter: "2026-Q3",
    targetDate: "2026-08-01",
    completedDate: "",
    percentComplete: 5,
    summary: "The sandbox release is queued behind identity hardening work.",
  },
  {
    id: "m-1071",
    projectId: "p-107",
    projectName: "Marketing Data Lake",
    name: "Source inventory completion",
    owner: "Nina Alvarez",
    status: "DONE",
    quarter: "2026-Q3",
    targetDate: "2026-06-28",
    completedDate: "2026-06-25",
    percentComplete: 100,
    summary: "The campaign, web, and partner data sources are all documented.",
  },
  {
    id: "m-1072",
    projectId: "p-107",
    projectName: "Marketing Data Lake",
    name: "Attribution dashboard alpha",
    owner: "Nina Alvarez",
    status: "IN_PROGRESS",
    quarter: "2026-Q3",
    targetDate: "2026-08-14",
    completedDate: "",
    percentComplete: 39,
    summary: "The first dashboard slice is in build with attribution rules under review.",
  },
];

function withBudgetFields(project) {
  const budgetVariance = project.budgetActual - project.budgetPlanned;
  return {
    ...project,
    budgetVariance,
    budgetStatus: budgetVariance > 0 ? "OVER_BUDGET" : "ON_BUDGET",
  };
}

function matchesSearch(row, value, keys) {
  if (!value) return true;
  const query = String(value).trim().toLowerCase();
  if (!query) return true;
  return keys.some((key) => String(row[key] ?? "").toLowerCase().includes(query));
}

function daysInMonth(year, monthIndex) {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

function buildDateString(year, monthIndex, day) {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function getBusinessQuarterRange(value) {
  const match = String(value ?? "").match(/^(\d{4})-Q([1-4])$/);
  if (!match) return null;

  const year = Number(match[1]);
  const quarter = Number(match[2]);
  const starts = [
    { yearOffset: -1, month: 11 }, // Q1 = Dec-Feb
    { yearOffset: 0, month: 2 }, // Q2 = Mar-May
    { yearOffset: 0, month: 5 }, // Q3 = Jun-Aug
    { yearOffset: 0, month: 8 }, // Q4 = Sep-Nov
  ];
  const start = starts[quarter - 1];
  const startYear = year + start.yearOffset;
  const endMonth = (start.month + 2) % 12;
  const endYear = start.month + 2 >= 12 ? startYear + 1 : startYear;

  return {
    from: buildDateString(startYear, start.month, 1),
    to: buildDateString(endYear, endMonth, daysInMonth(endYear, endMonth)),
  };
}

function isWithinDate(dateValue, from, to) {
  if (!dateValue) return false;
  if (from && String(dateValue) < String(from)) return false;
  if (to && String(dateValue) > String(to)) return false;
  return true;
}

function slicePage(rows, page, pageSize) {
  if (!pageSize) return rows;
  const start = Math.max(0, (page - 1) * pageSize);
  return rows.slice(start, start + pageSize);
}

function withProjectDateParams(params = {}) {
  const quarterRange = getBusinessQuarterRange(params.quarter);
  return {
    ...params,
    endFrom: params.endFrom ?? quarterRange?.from,
    endTo: params.endTo ?? quarterRange?.to,
  };
}

function withMilestoneDateParams(params = {}) {
  const quarterRange = getBusinessQuarterRange(params.quarter);
  return {
    ...params,
    targetFrom: params.targetFrom ?? quarterRange?.from,
    targetTo: params.targetTo ?? quarterRange?.to,
  };
}

function filterProjects(params = {}) {
  const effectiveParams = withProjectDateParams(params);

  return PROJECTS.map(withBudgetFields)
    .filter((project) => !params.status || project.status === params.status)
    .filter((project) => !params.owner || project.owner === params.owner)
    .filter((project) => !params.timelineStatus || project.timelineStatus === params.timelineStatus)
    .filter((project) => !params.budgetStatus || project.budgetStatus === params.budgetStatus)
    .filter((project) => matchesSearch(project, params.search, ["name", "owner", "executiveSummary"]))
    .filter((project) => {
      if (!effectiveParams.endFrom && !effectiveParams.endTo) return true;
      return isWithinDate(project.endDate, effectiveParams.endFrom, effectiveParams.endTo);
    })
    .sort((a, b) => a.endDate.localeCompare(b.endDate));
}

function filterMilestones(params = {}) {
  const effectiveParams = withMilestoneDateParams(params);

  return MILESTONES
    .filter((milestone) => !params.status || milestone.status === params.status)
    .filter((milestone) => !params.owner || milestone.owner === params.owner)
    .filter((milestone) => !params.projectId || milestone.projectId === params.projectId)
    .filter((milestone) => matchesSearch(milestone, params.search, ["projectName", "name", "owner", "summary"]))
    .filter((milestone) => {
      if (!effectiveParams.targetFrom && !effectiveParams.targetTo) return true;
      return isWithinDate(milestone.targetDate, effectiveParams.targetFrom, effectiveParams.targetTo);
    })
    .sort((a, b) => a.targetDate.localeCompare(b.targetDate));
}

export function createPortfolioDataProvider({ page = 1, pageSize = 20 } = {}) {
  return {
    async runQuery({ name, params = {} }) {
      if (name === "projects") {
        return slicePage(filterProjects(params), page, pageSize);
      }
      if (name === "milestones") {
        return slicePage(filterMilestones(params), page, pageSize);
      }
      return [];
    },
  };
}
