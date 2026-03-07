export const portfolioQuarterlyOverviewSpec = {
  id: "portfolio-quarterly-overview",
  title: "Portfolio Quarterly Overview",
  layout: "twoColumn",
  dataSources: {
    projects: {
      name: "projects",
      query: "projects",
    },
    milestones: {
      name: "milestones",
      query: "milestones",
    },
  },
  filters: [
    {
      type: "select",
      id: "projectStatus",
      label: "Project status",
      dataSource: "projects",
      paramKey: "status",
      options: [
        { value: "ON_TRACK", label: "On Track" },
        { value: "AT_RISK", label: "At Risk" },
        { value: "BLOCKED", label: "Blocked" },
        { value: "COMPLETE", label: "Complete" },
      ],
    },
    {
      type: "select",
      id: "milestoneStatus",
      label: "Milestone status",
      dataSource: "milestones",
      paramKey: "status",
      options: [
        { value: "NOT_STARTED", label: "Not Started" },
        { value: "IN_PROGRESS", label: "In Progress" },
        { value: "AT_RISK", label: "At Risk" },
        { value: "DONE", label: "Done" },
      ],
    },
    {
      type: "search",
      id: "projectSearch",
      label: "Find project",
      dataSource: "projects",
      paramKey: "search",
      placeholder: "Search by project, owner, or summary",
    },
  ],
  widgets: [
    {
      type: "kpi",
      id: "projects-kpi",
      title: "Projects",
      dataSource: "projects",
      config: {
        valueKey: "_count",
        label: "Total projects",
        format: "number",
      },
    },
    {
      type: "table",
      id: "projects-table",
      title: "Executive Project View",
      dataSource: "projects",
      config: {
        columns: [
          { key: "name", label: "Project" },
          { key: "owner", label: "Owner" },
          { key: "status", label: "Status" },
          { key: "timelineStatus", label: "Timeline" },
          { key: "percentComplete", label: "% Complete" },
          { key: "budgetVariance", label: "Budget Variance" },
          { key: "endDate", label: "End Date", type: "date" },
        ],
      },
    },
    {
      type: "kpi",
      id: "milestones-kpi",
      title: "Milestones",
      dataSource: "milestones",
      config: {
        valueKey: "_count",
        label: "Total milestones",
        format: "number",
      },
    },
    {
      type: "table",
      id: "milestones-by-project",
      title: "Milestones by Project",
      dataSource: "milestones",
      config: {
        groupByKey: "projectName",
        groupLabelKey: "projectName",
        columns: [
          { key: "name", label: "Milestone" },
          { key: "owner", label: "Owner" },
          { key: "status", label: "Status" },
          { key: "targetDate", label: "Target Date", type: "date" },
          { key: "completedDate", label: "Completed", type: "date" },
          { key: "percentComplete", label: "% Complete" },
        ],
      },
    },
  ],
};

export const projectsAtRiskSpec = {
  id: "projects-at-risk",
  title: "Projects At Risk",
  layout: "singleColumn",
  dataSources: {
    projects: {
      name: "projects",
      query: "projects",
      params: {
        status: "AT_RISK",
      },
    },
  },
  filters: [
    {
      type: "select",
      id: "timelineStatus",
      label: "Timeline",
      dataSource: "projects",
      paramKey: "timelineStatus",
      options: [
        { value: "ON_TRACK", label: "On Track" },
        { value: "SLIPPING", label: "Slipping" },
        { value: "LATE", label: "Late" },
      ],
    },
    {
      type: "select",
      id: "budgetStatus",
      label: "Budget",
      dataSource: "projects",
      paramKey: "budgetStatus",
      options: [
        { value: "ON_BUDGET", label: "On Budget" },
        { value: "OVER_BUDGET", label: "Over Budget" },
      ],
    },
    {
      type: "search",
      id: "riskSearch",
      label: "Find project",
      dataSource: "projects",
      paramKey: "search",
      placeholder: "Search by project, owner, or summary",
    },
  ],
  widgets: [
    {
      type: "kpi",
      id: "at-risk-projects-kpi",
      title: "At Risk",
      dataSource: "projects",
      config: {
        valueKey: "_count",
        label: "At-risk projects",
        format: "number",
      },
    },
    {
      type: "table",
      id: "at-risk-projects-table",
      title: "Projects Requiring Attention",
      dataSource: "projects",
      config: {
        columns: [
          { key: "name", label: "Project" },
          { key: "owner", label: "Owner" },
          { key: "status", label: "Status" },
          { key: "timelineStatus", label: "Timeline" },
          { key: "budgetStatus", label: "Budget" },
          { key: "budgetVariance", label: "Budget Variance" },
          { key: "executiveSummary", label: "Executive Summary" },
        ],
      },
    },
  ],
};

export const milestonesByProjectSpec = {
  id: "milestones-by-project",
  title: "Milestones by Project",
  layout: "singleColumn",
  dataSources: {
    milestones: {
      name: "milestones",
      query: "milestones",
    },
  },
  filters: [
    {
      type: "select",
      id: "milestoneStatus",
      label: "Status",
      dataSource: "milestones",
      paramKey: "status",
      options: [
        { value: "NOT_STARTED", label: "Not Started" },
        { value: "IN_PROGRESS", label: "In Progress" },
        { value: "AT_RISK", label: "At Risk" },
        { value: "DONE", label: "Done" },
      ],
    },
    {
      type: "select",
      id: "milestoneOwner",
      label: "Owner",
      dataSource: "milestones",
      paramKey: "owner",
      options: [
        { value: "Ava Patel", label: "Ava Patel" },
        { value: "Marcus Reed", label: "Marcus Reed" },
        { value: "Nina Alvarez", label: "Nina Alvarez" },
        { value: "Liam Chen", label: "Liam Chen" },
        { value: "Zoe Martin", label: "Zoe Martin" },
      ],
    },
    {
      type: "dateRange",
      id: "targetDateRange",
      label: "Target Date",
      dataSource: "milestones",
      paramKeyFrom: "targetFrom",
      paramKeyTo: "targetTo",
    },
  ],
  widgets: [
    {
      type: "kpi",
      id: "milestones-total-kpi",
      title: "Milestones",
      dataSource: "milestones",
      config: {
        valueKey: "_count",
        label: "Total milestones",
        format: "number",
      },
    },
    {
      type: "table",
      id: "milestones-grouped-table",
      title: "Delivery Milestones",
      dataSource: "milestones",
      config: {
        groupByKey: "projectName",
        groupLabelKey: "projectName",
        columns: [
          { key: "name", label: "Milestone" },
          { key: "owner", label: "Owner" },
          { key: "status", label: "Status" },
          { key: "targetDate", label: "Target Date", type: "date" },
          { key: "completedDate", label: "Completed", type: "date" },
          { key: "summary", label: "Summary" },
        ],
      },
    },
  ],
};

export const starterReports = [
  { id: "overview", label: "Quarterly Overview", spec: portfolioQuarterlyOverviewSpec },
  { id: "risk", label: "Projects At Risk", spec: projectsAtRiskSpec },
  { id: "milestones", label: "Milestones By Project", spec: milestonesByProjectSpec },
];
