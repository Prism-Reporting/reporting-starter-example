/**
 * Report specs — 10 examples showcasing layout, filters, and widgets.
 * All dataSources use queries from the query catalog: projects, milestones, tasks, risks.
 */

// --- 1. Showcase Complex: tabs + multi data source + multiSelect + dateRange + search + presets + layoutOptions ---
export const showcaseComplexSpec = {
  id: 'showcase-complex',
  title: 'Showcase Complex',
  version: '1.0',
  layout: 'twoColumn',
  layoutOptions: { columnGap: '16px', rowGap: '12px' },
  dataSources: {
    projects: { name: 'projects', query: 'projects', delivery: { mode: 'paginatedList', pageSize: 20 } },
    projectsSummary: { name: 'projectsSummary', query: 'projectsSummary', delivery: { mode: 'summary' } },
    projectsVisual: { name: 'projectsVisual', query: 'projectsVisual', delivery: { mode: 'fullVisual', maxRows: 1000 } },
    milestones: { name: 'milestones', query: 'milestones', delivery: { mode: 'paginatedList', pageSize: 20 } },
    milestonesSummary: { name: 'milestonesSummary', query: 'milestonesSummary', delivery: { mode: 'summary' } },
    milestonesVisual: { name: 'milestonesVisual', query: 'milestonesVisual', delivery: { mode: 'fullVisual', maxRows: 1000 } },
    tasks: { name: 'tasks', query: 'tasks', delivery: { mode: 'paginatedList', pageSize: 20 } },
    tasksSummary: { name: 'tasksSummary', query: 'tasksSummary', delivery: { mode: 'summary' } },
  },
  filters: [
    {
      type: 'multiSelect',
      id: 'projectStatus',
      label: 'Project status',
      dataSource: ['projects', 'projectsSummary', 'projectsVisual'],
      paramKey: 'status',
      options: [
        { value: 'ON_TRACK', label: 'On Track' },
        { value: 'AT_RISK', label: 'At Risk' },
        { value: 'BLOCKED', label: 'Blocked' },
        { value: 'COMPLETE', label: 'Complete' },
      ],
    },
    {
      type: 'dateRange',
      id: 'milestoneTarget',
      label: 'Milestone target',
      dataSource: ['milestones', 'milestonesSummary', 'milestonesVisual'],
      groupIds: ['milestones-tab'],
      paramKeyFrom: 'targetFrom',
      paramKeyTo: 'targetTo',
    },
    {
      type: 'search',
      id: 'taskSearch',
      label: 'Search tasks',
      dataSource: ['tasks', 'tasksSummary'],
      groupIds: ['tasks-tab'],
      paramKey: 'search',
      placeholder: 'Search by name, owner, project',
    },
    {
      type: 'search',
      id: 'projectFocus',
      label: 'Project focus',
      dataSource: ['projects', 'projectsVisual'],
      groupIds: ['projects-detail'],
      paramKey: 'search',
      placeholder: 'Filter the project table and chart',
    },
  ],
  groups: [
    {
      id: 'projects-detail',
      label: 'Project detail',
      widgetIds: ['sc-projects-table', 'sc-projects-bar'],
    },
  ],
  presets: [
    {
      id: 'this-quarter',
      label: 'This quarter',
      filterState: { milestoneTarget: { from: '2026-01-01', to: '2026-03-31' } },
    },
    {
      id: 'at-risk-only',
      label: 'At risk only',
      filterState: { projectStatus: ['AT_RISK'] },
    },
  ],
  tabs: [
    { id: 'projects-tab', label: 'Projects', widgetIds: ['sc-projects-kpi', 'sc-projects-table', 'sc-projects-bar'] },
    { id: 'milestones-tab', label: 'Milestones', widgetIds: ['sc-milestones-kpi', 'sc-milestones-table', 'sc-milestones-line'] },
    { id: 'tasks-tab', label: 'Tasks', widgetIds: ['sc-tasks-kpi', 'sc-tasks-table'] },
  ],
  widgets: [
    {
      type: 'kpi',
      id: 'sc-projects-kpi',
      title: 'Projects',
      dataSource: 'projectsSummary',
      config: { valueKey: 'count', label: 'Total projects', format: 'number' },
      width: '100%',
      height: '80px',
    },
    {
      type: 'table',
      id: 'sc-projects-table',
      title: 'Projects',
      dataSource: 'projects',
      config: {
        columns: [
          { key: 'name', label: 'Project' },
          { key: 'owner', label: 'Owner' },
          { key: 'status', label: 'Status' },
          { key: 'percentComplete', label: '% Complete' },
          { key: 'endDate', label: 'End Date', type: 'date' },
        ],
      },
      width: '100%',
    },
    {
      type: 'barChart',
      id: 'sc-projects-bar',
      title: 'Progress by project',
      dataSource: 'projectsVisual',
      config: { categoryKey: 'name', valueKey: 'percentComplete' },
      width: '100%',
      height: '280px',
    },
    {
      type: 'kpi',
      id: 'sc-milestones-kpi',
      title: 'Milestones',
      dataSource: 'milestonesSummary',
      config: { valueKey: 'count', label: 'Total milestones', format: 'number' },
    },
    {
      type: 'table',
      id: 'sc-milestones-table',
      title: 'Milestones',
      dataSource: 'milestones',
      config: {
        groupByKey: 'projectName',
        groupLabelKey: 'projectName',
        columns: [
          { key: 'name', label: 'Milestone' },
          { key: 'status', label: 'Status' },
          { key: 'targetDate', label: 'Target', type: 'date' },
          { key: 'percentComplete', label: '% Complete' },
        ],
      },
    },
    {
      type: 'lineChart',
      id: 'sc-milestones-line',
      title: 'Milestone progress over time',
      dataSource: 'milestonesVisual',
      config: { categoryKey: 'targetDate', valueKey: 'percentComplete' },
      height: '260px',
    },
    {
      type: 'kpi',
      id: 'sc-tasks-kpi',
      title: 'Tasks',
      dataSource: 'tasksSummary',
      config: { valueKey: 'count', label: 'Total tasks', format: 'number', trend: { dataKey: 'trendPercentComplete' } },
    },
    {
      type: 'table',
      id: 'sc-tasks-table',
      title: 'Tasks',
      dataSource: 'tasks',
      config: {
        columns: [
          { key: 'name', label: 'Task' },
          { key: 'projectName', label: 'Project' },
          { key: 'status', label: 'Status' },
          { key: 'dueDate', label: 'Due', type: 'date' },
          { key: 'percentComplete', label: '% Complete' },
        ],
      },
    },
  ],
};

// --- 2. Tabbed Portfolio: tabs per entity ---
export const tabbedPortfolioSpec = {
  id: 'tabbed-portfolio',
  title: 'Tabbed Portfolio',
  layout: 'singleColumn',
  dataSources: {
    projects: { name: 'projects', query: 'projects', delivery: { mode: 'paginatedList', pageSize: 20 } },
    projectsSummary: { name: 'projectsSummary', query: 'projectsSummary', delivery: { mode: 'summary' } },
    milestones: { name: 'milestones', query: 'milestones', delivery: { mode: 'paginatedList', pageSize: 20 } },
    milestonesSummary: { name: 'milestonesSummary', query: 'milestonesSummary', delivery: { mode: 'summary' } },
    tasks: { name: 'tasks', query: 'tasks', delivery: { mode: 'paginatedList', pageSize: 20 } },
    tasksSummary: { name: 'tasksSummary', query: 'tasksSummary', delivery: { mode: 'summary' } },
    risks: { name: 'risks', query: 'risks', delivery: { mode: 'paginatedList', pageSize: 20 } },
    risksSummary: { name: 'risksSummary', query: 'risksSummary', delivery: { mode: 'summary' } },
  },
  filters: [
    {
      type: 'select',
      id: 'owner',
      label: 'Owner',
      dataSource: [
        'projects',
        'projectsSummary',
        'milestones',
        'milestonesSummary',
        'tasks',
        'tasksSummary',
        'risks',
        'risksSummary',
      ],
      paramKey: 'owner',
      options: [
        { value: 'Ava Patel', label: 'Ava Patel' },
        { value: 'Marcus Reed', label: 'Marcus Reed' },
        { value: 'Nina Alvarez', label: 'Nina Alvarez' },
        { value: 'Liam Chen', label: 'Liam Chen' },
        { value: 'Zoe Martin', label: 'Zoe Martin' },
      ],
    },
    {
      type: 'search',
      id: 'projectSearch',
      label: 'Project search',
      dataSource: ['projects', 'projectsSummary'],
      groupIds: ['p'],
      paramKey: 'search',
      placeholder: 'Search projects',
    },
    {
      type: 'select',
      id: 'taskStatus',
      label: 'Task status',
      dataSource: ['tasks', 'tasksSummary'],
      groupIds: ['t'],
      paramKey: 'status',
      options: [
        { value: 'NOT_STARTED', label: 'Not Started' },
        { value: 'IN_PROGRESS', label: 'In Progress' },
        { value: 'DONE', label: 'Done' },
        { value: 'DEFERRED', label: 'Deferred' },
      ],
    },
    {
      type: 'select',
      id: 'riskStatus',
      label: 'Risk status',
      dataSource: ['risks', 'risksSummary'],
      groupIds: ['r'],
      paramKey: 'status',
      options: [
        { value: 'OPEN', label: 'Open' },
        { value: 'MITIGATING', label: 'Mitigating' },
        { value: 'MITIGATED', label: 'Mitigated' },
        { value: 'CLOSED', label: 'Closed' },
      ],
    },
  ],
  tabs: [
    { id: 'p', label: 'Projects', widgetIds: ['tp-p-kpi', 'tp-p-table'] },
    { id: 'm', label: 'Milestones', widgetIds: ['tp-m-kpi', 'tp-m-table'] },
    { id: 't', label: 'Tasks', widgetIds: ['tp-t-kpi', 'tp-t-table'] },
    { id: 'r', label: 'Risks', widgetIds: ['tp-r-kpi', 'tp-r-table'] },
  ],
  widgets: [
    { type: 'kpi', id: 'tp-p-kpi', title: 'Projects', dataSource: 'projectsSummary', config: { valueKey: 'count', label: 'Count', format: 'number' } },
    { type: 'table', id: 'tp-p-table', title: 'Projects', dataSource: 'projects', config: { columns: [{ key: 'name', label: 'Project' }, { key: 'owner', label: 'Owner' }, { key: 'status', label: 'Status' }, { key: 'endDate', label: 'End', type: 'date' }] } },
    { type: 'kpi', id: 'tp-m-kpi', title: 'Milestones', dataSource: 'milestonesSummary', config: { valueKey: 'count', label: 'Count', format: 'number' } },
    { type: 'table', id: 'tp-m-table', title: 'Milestones', dataSource: 'milestones', config: { columns: [{ key: 'name', label: 'Milestone' }, { key: 'projectName', label: 'Project' }, { key: 'status', label: 'Status' }, { key: 'targetDate', label: 'Target', type: 'date' }] } },
    { type: 'kpi', id: 'tp-t-kpi', title: 'Tasks', dataSource: 'tasksSummary', config: { valueKey: 'count', label: 'Count', format: 'number' } },
    { type: 'table', id: 'tp-t-table', title: 'Tasks', dataSource: 'tasks', config: { columns: [{ key: 'name', label: 'Task' }, { key: 'projectName', label: 'Project' }, { key: 'status', label: 'Status' }, { key: 'dueDate', label: 'Due', type: 'date' }] } },
    { type: 'kpi', id: 'tp-r-kpi', title: 'Risks', dataSource: 'risksSummary', config: { valueKey: 'count', label: 'Count', format: 'number' } },
    { type: 'table', id: 'tp-r-table', title: 'Risks', dataSource: 'risks', config: { columns: [{ key: 'title', label: 'Risk' }, { key: 'projectName', label: 'Project' }, { key: 'severity', label: 'Severity' }, { key: 'status', label: 'Status' }] } },
  ],
};

// --- 3. Sectioned Delivery: sections with headers ---
export const sectionedDeliverySpec = {
  id: 'sectioned-delivery',
  title: 'Sectioned Delivery',
  layout: 'twoColumn',
  dataSources: {
    projects: { name: 'projects', query: 'projects', delivery: { mode: 'paginatedList', pageSize: 20 } },
    projectsSummary: { name: 'projectsSummary', query: 'projectsSummary', delivery: { mode: 'summary' } },
    milestones: { name: 'milestones', query: 'milestones', delivery: { mode: 'paginatedList', pageSize: 20 } },
    milestonesSummary: { name: 'milestonesSummary', query: 'milestonesSummary', delivery: { mode: 'summary' } },
    risks: { name: 'risks', query: 'risks', delivery: { mode: 'paginatedList', pageSize: 20 } },
    risksSummary: { name: 'risksSummary', query: 'risksSummary', delivery: { mode: 'summary' } },
  },
  filters: [
    {
      type: 'select',
      id: 'quarter',
      label: 'Quarter',
      dataSource: ['projects', 'projectsSummary', 'milestones', 'milestonesSummary'],
      paramKey: 'quarter',
      options: [
        { value: '2026-Q1', label: '2026 Q1' },
        { value: '2026-Q2', label: '2026 Q2' },
        { value: '2026-Q3', label: '2026 Q3' },
        { value: '2026-Q4', label: '2026 Q4' },
      ],
    },
    {
      type: 'select',
      id: 'projectStatus',
      label: 'Project status',
      dataSource: ['projects'],
      groupIds: ['projects'],
      paramKey: 'status',
      options: [
        { value: 'ON_TRACK', label: 'On Track' },
        { value: 'AT_RISK', label: 'At Risk' },
        { value: 'COMPLETE', label: 'Complete' },
      ],
    },
    {
      type: 'select',
      id: 'milestoneStatus',
      label: 'Milestone status',
      dataSource: ['milestones'],
      groupIds: ['milestones'],
      paramKey: 'status',
      options: [
        { value: 'NOT_STARTED', label: 'Not Started' },
        { value: 'IN_PROGRESS', label: 'In Progress' },
        { value: 'AT_RISK', label: 'At Risk' },
        { value: 'DONE', label: 'Done' },
      ],
    },
    {
      type: 'select',
      id: 'riskStatus',
      label: 'Risk status',
      dataSource: ['risks'],
      groupIds: ['risks'],
      paramKey: 'status',
      options: [
        { value: 'OPEN', label: 'Open' },
        { value: 'MITIGATING', label: 'Mitigating' },
        { value: 'MITIGATED', label: 'Mitigated' },
        { value: 'CLOSED', label: 'Closed' },
      ],
    },
  ],
  sections: [
    { id: 'summary', title: 'Summary', widgetIds: ['sd-p-kpi', 'sd-m-kpi', 'sd-r-kpi'] },
    { id: 'projects', title: 'Projects', widgetIds: ['sd-projects-table'] },
    { id: 'milestones', title: 'Milestones', widgetIds: ['sd-milestones-table'] },
    { id: 'risks', title: 'Risks', widgetIds: ['sd-risks-table'] },
  ],
  widgets: [
    { type: 'kpi', id: 'sd-p-kpi', title: 'Projects', dataSource: 'projectsSummary', config: { valueKey: 'count', label: 'Total', format: 'number' } },
    { type: 'kpi', id: 'sd-m-kpi', title: 'Milestones', dataSource: 'milestonesSummary', config: { valueKey: 'count', label: 'Total', format: 'number' } },
    { type: 'kpi', id: 'sd-r-kpi', title: 'Risks', dataSource: 'risksSummary', config: { valueKey: 'count', label: 'Total', format: 'number' } },
    { type: 'table', id: 'sd-projects-table', title: 'Projects', dataSource: 'projects', config: { columns: [{ key: 'name', label: 'Project' }, { key: 'owner', label: 'Owner' }, { key: 'status', label: 'Status' }, { key: 'percentComplete', label: '%' }, { key: 'endDate', label: 'End', type: 'date' }] } },
    { type: 'table', id: 'sd-milestones-table', title: 'Milestones by project', dataSource: 'milestones', config: { groupByKey: 'projectName', groupLabelKey: 'projectName', columns: [{ key: 'name', label: 'Milestone' }, { key: 'status', label: 'Status' }, { key: 'targetDate', label: 'Target', type: 'date' }] } },
    { type: 'table', id: 'sd-risks-table', title: 'Risks', dataSource: 'risks', config: { columns: [{ key: 'title', label: 'Risk' }, { key: 'projectName', label: 'Project' }, { key: 'severity', label: 'Severity' }, { key: 'status', label: 'Status' }] } },
  ],
};

// --- 4. Multi-Source Filters: projects + milestones + tasks, multiSelect + dateRange + search ---
export const multiSourceFiltersSpec = {
  id: 'multi-source-filters',
  title: 'Multi-Source Filters',
  layout: 'twoColumn',
  dataSources: {
    projects: { name: 'projects', query: 'projects', delivery: { mode: 'paginatedList', pageSize: 20 } },
    projectsSummary: { name: 'projectsSummary', query: 'projectsSummary', delivery: { mode: 'summary' } },
    milestones: { name: 'milestones', query: 'milestones', delivery: { mode: 'paginatedList', pageSize: 20 } },
    milestonesSummary: { name: 'milestonesSummary', query: 'milestonesSummary', delivery: { mode: 'summary' } },
    tasks: { name: 'tasks', query: 'tasks', delivery: { mode: 'paginatedList', pageSize: 20 } },
    tasksSummary: { name: 'tasksSummary', query: 'tasksSummary', delivery: { mode: 'summary' } },
  },
  filters: [
    {
      type: 'select',
      id: 'owner',
      label: 'Owner',
      dataSource: ['projects', 'projectsSummary', 'milestones', 'milestonesSummary', 'tasks', 'tasksSummary'],
      paramKey: 'owner',
      options: [
        { value: 'Ava Patel', label: 'Ava Patel' },
        { value: 'Marcus Reed', label: 'Marcus Reed' },
        { value: 'Nina Alvarez', label: 'Nina Alvarez' },
        { value: 'Liam Chen', label: 'Liam Chen' },
        { value: 'Zoe Martin', label: 'Zoe Martin' },
      ],
    },
    {
      type: 'multiSelect',
      id: 'projectStatus',
      label: 'Project status',
      dataSource: ['projects', 'projectsSummary'],
      groupIds: ['project-widgets'],
      paramKey: 'status',
      options: [{ value: 'ON_TRACK', label: 'On Track' }, { value: 'AT_RISK', label: 'At Risk' }, { value: 'COMPLETE', label: 'Complete' }],
    },
    {
      type: 'dateRange',
      id: 'targetRange',
      label: 'Milestone target',
      dataSource: ['milestones', 'milestonesSummary'],
      groupIds: ['milestone-widgets'],
      paramKeyFrom: 'targetFrom',
      paramKeyTo: 'targetTo',
    },
    {
      type: 'search',
      id: 'taskSearch',
      label: 'Search tasks',
      dataSource: ['tasks', 'tasksSummary'],
      groupIds: ['task-widgets'],
      paramKey: 'search',
      placeholder: 'Search tasks',
    },
  ],
  groups: [
    { id: 'project-widgets', label: 'Projects', widgetIds: ['msf-p', 'msf-projects'] },
    { id: 'milestone-widgets', label: 'Milestones', widgetIds: ['msf-m', 'msf-milestones'] },
    { id: 'task-widgets', label: 'Tasks', widgetIds: ['msf-t', 'msf-tasks'] },
  ],
  widgets: [
    { type: 'kpi', id: 'msf-p', title: 'Projects', dataSource: 'projectsSummary', config: { valueKey: 'count', label: 'Count', format: 'number' } },
    { type: 'kpi', id: 'msf-m', title: 'Milestones', dataSource: 'milestonesSummary', config: { valueKey: 'count', label: 'Count', format: 'number' } },
    { type: 'kpi', id: 'msf-t', title: 'Tasks', dataSource: 'tasksSummary', config: { valueKey: 'count', label: 'Count', format: 'number' } },
    { type: 'table', id: 'msf-projects', title: 'Projects', dataSource: 'projects', config: { columns: [{ key: 'name', label: 'Project' }, { key: 'status', label: 'Status' }, { key: 'percentComplete', label: '%' }] } },
    { type: 'table', id: 'msf-milestones', title: 'Milestones', dataSource: 'milestones', config: { columns: [{ key: 'name', label: 'Milestone' }, { key: 'projectName', label: 'Project' }, { key: 'targetDate', label: 'Target', type: 'date' }] } },
    { type: 'table', id: 'msf-tasks', title: 'Tasks', dataSource: 'tasks', config: { columns: [{ key: 'name', label: 'Task' }, { key: 'projectName', label: 'Project' }, { key: 'dueDate', label: 'Due', type: 'date' }] } },
  ],
};

// --- 5. Preset Quick Views: presets + select + search ---
export const presetQuickViewsSpec = {
  id: 'preset-quick-views',
  title: 'Preset Quick Views',
  layout: 'twoColumn',
  dataSources: {
    projects: { name: 'projects', query: 'projects', delivery: { mode: 'paginatedList', pageSize: 20 } },
    projectsSummary: { name: 'projectsSummary', query: 'projectsSummary', delivery: { mode: 'summary' } },
    milestones: { name: 'milestones', query: 'milestones', delivery: { mode: 'paginatedList', pageSize: 20 } },
    milestonesSummary: { name: 'milestonesSummary', query: 'milestonesSummary', delivery: { mode: 'summary' } },
  },
  filters: [
    { type: 'select', id: 'status', label: 'Status', dataSource: ['projects', 'projectsSummary'], paramKey: 'status', options: [{ value: 'ON_TRACK', label: 'On Track' }, { value: 'AT_RISK', label: 'At Risk' }, { value: 'COMPLETE', label: 'Complete' }] },
    { type: 'search', id: 'search', label: 'Search', dataSource: ['projects', 'projectsSummary'], paramKey: 'search', placeholder: 'Search projects' },
  ],
  presets: [
    { id: 'this-quarter', label: 'This quarter', filterState: {} },
    { id: 'at-risk', label: 'At risk only', filterState: { status: 'AT_RISK' } },
  ],
  widgets: [
    { type: 'kpi', id: 'pqv-projects', title: 'Projects', dataSource: 'projectsSummary', config: { valueKey: 'count', label: 'Total', format: 'number' } },
    { type: 'kpi', id: 'pqv-milestones', title: 'Milestones', dataSource: 'milestonesSummary', config: { valueKey: 'count', label: 'Total', format: 'number' } },
    { type: 'table', id: 'pqv-table', title: 'Projects', dataSource: 'projects', config: { columns: [{ key: 'name', label: 'Project' }, { key: 'owner', label: 'Owner' }, { key: 'status', label: 'Status' }, { key: 'endDate', label: 'End', type: 'date' }] } },
  ],
};

// --- 6. Custom Layout: layoutOptions + widget width/height ---
export const customLayoutSpec = {
  id: 'custom-layout',
  title: 'Custom Layout',
  layout: 'twoColumn',
  layoutOptions: { columnGap: '24px', rowGap: '16px' },
  dataSources: {
    projects: { name: 'projects', query: 'projects', delivery: { mode: 'paginatedList', pageSize: 20 } },
    projectsSummary: { name: 'projectsSummary', query: 'projectsSummary', delivery: { mode: 'summary' } },
    projectsVisual: { name: 'projectsVisual', query: 'projectsVisual', delivery: { mode: 'fullVisual', maxRows: 1000 } },
    milestones: { name: 'milestones', query: 'milestones', delivery: { mode: 'paginatedList', pageSize: 20 } },
  },
  filters: [
    { type: 'select', id: 'status', label: 'Status', dataSource: ['projects', 'projectsSummary', 'projectsVisual'], paramKey: 'status', options: [{ value: 'ON_TRACK', label: 'On Track' }, { value: 'AT_RISK', label: 'At Risk' }] },
  ],
  widgets: [
    { type: 'kpi', id: 'cl-kpi', title: 'Projects', dataSource: 'projectsSummary', config: { valueKey: 'count', label: 'Count', format: 'number' }, width: '50%', height: '80px' },
    { type: 'barChart', id: 'cl-bar', title: 'Progress by project', dataSource: 'projectsVisual', config: { categoryKey: 'name', valueKey: 'percentComplete' }, width: '100%', height: '300px' },
    { type: 'table', id: 'cl-table', title: 'Milestones', dataSource: 'milestones', config: { columns: [{ key: 'name', label: 'Milestone' }, { key: 'projectName', label: 'Project' }, { key: 'targetDate', label: 'Target', type: 'date' }] }, width: '100%' },
  ],
};

// --- 7. Charts Focus: lineChart + stackedBarChart + barChart + table ---
export const chartsFocusSpec = {
  id: 'charts-focus',
  title: 'Charts Focus',
  layout: 'twoColumn',
  dataSources: {
    projects: { name: 'projects', query: 'projects', delivery: { mode: 'paginatedList', pageSize: 20 } },
    projectsVisual: { name: 'projectsVisual', query: 'projectsVisual', delivery: { mode: 'fullVisual', maxRows: 1000 } },
    milestones: { name: 'milestones', query: 'milestones', delivery: { mode: 'paginatedList', pageSize: 20 } },
    milestonesVisual: { name: 'milestonesVisual', query: 'milestonesVisual', delivery: { mode: 'fullVisual', maxRows: 1000 } },
    risks: { name: 'risks', query: 'risks', delivery: { mode: 'paginatedList', pageSize: 20 } },
  },
  filters: [
    { type: 'dateRange', id: 'targetRange', label: 'Milestone target', dataSource: ['milestones', 'milestonesVisual'], paramKeyFrom: 'targetFrom', paramKeyTo: 'targetTo' },
    { type: 'search', id: 'search', label: 'Search', dataSource: 'risks', paramKey: 'search', placeholder: 'Search risks' },
  ],
  widgets: [
    { type: 'lineChart', id: 'cf-line', title: 'Milestone progress over time', dataSource: 'milestonesVisual', config: { categoryKey: 'targetDate', valueKey: 'percentComplete' }, height: '280px' },
    { type: 'stackedBarChart', id: 'cf-stacked', title: 'Budget by project', dataSource: 'projectsVisual', config: { categoryKey: 'name', series: [{ key: 'budgetPlanned', label: 'Planned' }, { key: 'budgetActual', label: 'Actual' }] }, height: '280px' },
    { type: 'barChart', id: 'cf-bar', title: 'Tasks / projects (sample)', dataSource: 'projectsVisual', config: { categoryKey: 'name', valueKey: 'percentComplete' }, height: '260px' },
    { type: 'table', id: 'cf-table', title: 'Risks', dataSource: 'risks', config: { columns: [{ key: 'title', label: 'Risk' }, { key: 'projectName', label: 'Project' }, { key: 'severity', label: 'Severity' }] } },
  ],
};

// --- 8. Table Analytics: aggregations + optional drillDown ---
export const tableAnalyticsSpec = {
  id: 'table-analytics',
  title: 'Table Analytics',
  layout: 'singleColumn',
  dataSources: {
    milestones: { name: 'milestones', query: 'milestones', delivery: { mode: 'paginatedList', pageSize: 20 } },
    tasks: { name: 'tasks', query: 'tasks', delivery: { mode: 'paginatedList', pageSize: 20 } },
  },
  filters: [
    { type: 'select', id: 'mStatus', label: 'Milestone status', dataSource: 'milestones', paramKey: 'status', options: [{ value: 'NOT_STARTED', label: 'Not Started' }, { value: 'IN_PROGRESS', label: 'In Progress' }, { value: 'DONE', label: 'Done' }] },
    { type: 'dateRange', id: 'dueRange', label: 'Task due', dataSource: 'tasks', paramKeyFrom: 'dueFrom', paramKeyTo: 'dueTo' },
  ],
  widgets: [
    {
      type: 'table',
      id: 'ta-milestones',
      title: 'Milestones by project (with aggregates)',
      dataSource: 'milestones',
      config: {
        groupByKey: 'projectName',
        groupLabelKey: 'projectName',
        columns: [
          { key: 'name', label: 'Milestone' },
          { key: 'status', label: 'Status' },
          { key: 'targetDate', label: 'Target', type: 'date' },
          { key: 'percentComplete', label: '% Complete' },
        ],
        aggregations: [
          { key: 'percentComplete', op: 'avg' },
          { key: 'name', op: 'count' },
        ],
      },
    },
    {
      type: 'table',
      id: 'ta-tasks',
      title: 'Tasks (with drill-down)',
      dataSource: 'tasks',
      config: {
        columns: [
          { key: 'name', label: 'Task' },
          { key: 'projectName', label: 'Project' },
          { key: 'status', label: 'Status' },
          { key: 'dueDate', label: 'Due', type: 'date' },
          { key: 'percentComplete', label: '%' },
        ],
        drillDown: {
          urlTemplate: '/tasks?id={id}',
          paramKeys: ['id'],
          target: '_blank',
        },
      },
    },
  ],
};

// --- 9. KPI & Trend: KPI with trend + bar chart ---
export const kpiTrendSpec = {
  id: 'kpi-trend',
  title: 'KPI & Trend',
  layout: 'twoColumn',
  dataSources: {
    projectsVisual: { name: 'projectsVisual', query: 'projectsVisual', delivery: { mode: 'fullVisual', maxRows: 1000 } },
    milestones: { name: 'milestones', query: 'milestones', delivery: { mode: 'paginatedList', pageSize: 20 } },
    milestonesProgressSummary: { name: 'milestonesProgressSummary', query: 'milestonesProgressSummary', delivery: { mode: 'summary' } },
  },
  filters: [
    { type: 'select', id: 'status', label: 'Project status', dataSource: 'projectsVisual', paramKey: 'status', options: [{ value: 'ON_TRACK', label: 'On Track' }, { value: 'AT_RISK', label: 'At Risk' }] },
  ],
  widgets: [
    { type: 'kpi', id: 'kt-kpi', title: 'Progress (with trend)', dataSource: 'milestonesProgressSummary', config: { valueKey: 'avgPercentComplete', label: 'Average % complete', format: 'number', trend: { dataKey: 'trendPercentComplete' }, decimalPlaces: 0 } },
    { type: 'barChart', id: 'kt-bar', title: 'Project progress', dataSource: 'projectsVisual', config: { categoryKey: 'name', valueKey: 'percentComplete' }, height: '280px' },
    { type: 'table', id: 'kt-table', title: 'Milestones', dataSource: 'milestones', config: { columns: [{ key: 'name', label: 'Milestone' }, { key: 'projectName', label: 'Project' }, { key: 'percentComplete', label: '%' }] } },
  ],
};

// --- 10. Portfolio Quarterly Overview (original style) ---
export const portfolioQuarterlyOverviewSpec = {
  id: 'portfolio-quarterly-overview',
  title: 'Portfolio Quarterly Overview',
  layout: 'twoColumn',
  dataSources: {
    projects: { name: 'projects', query: 'projects', delivery: { mode: 'paginatedList', pageSize: 20 } },
    projectsSummary: { name: 'projectsSummary', query: 'projectsSummary', delivery: { mode: 'summary' } },
    milestones: { name: 'milestones', query: 'milestones', delivery: { mode: 'paginatedList', pageSize: 20 } },
    milestonesSummary: { name: 'milestonesSummary', query: 'milestonesSummary', delivery: { mode: 'summary' } },
  },
  filters: [
    { type: 'select', id: 'projectStatus', label: 'Project status', dataSource: ['projects', 'projectsSummary'], paramKey: 'status', options: [{ value: 'ON_TRACK', label: 'On Track' }, { value: 'AT_RISK', label: 'At Risk' }, { value: 'BLOCKED', label: 'Blocked' }, { value: 'COMPLETE', label: 'Complete' }] },
    { type: 'select', id: 'milestoneStatus', label: 'Milestone status', dataSource: ['milestones', 'milestonesSummary'], paramKey: 'status', options: [{ value: 'NOT_STARTED', label: 'Not Started' }, { value: 'IN_PROGRESS', label: 'In Progress' }, { value: 'AT_RISK', label: 'At Risk' }, { value: 'DONE', label: 'Done' }] },
    { type: 'search', id: 'projectSearch', label: 'Find project', dataSource: ['projects', 'projectsSummary'], paramKey: 'search', placeholder: 'Search by project, owner, or summary' },
    { type: 'search', id: 'milestoneProjectName', label: 'Project', dataSource: 'milestones', groupIds: ['milestones-by-project-group'], paramKey: 'projectName', placeholder: 'Filter milestone groups by project' },
  ],
  widgets: [
    { type: 'kpi', id: 'projects-kpi', title: 'Projects', dataSource: 'projectsSummary', config: { valueKey: 'count', label: 'Total projects', format: 'number' } },
    { type: 'table', id: 'projects-table', title: 'Executive Project View', dataSource: 'projects', config: { columns: [{ key: 'name', label: 'Project' }, { key: 'owner', label: 'Owner' }, { key: 'status', label: 'Status' }, { key: 'timelineStatus', label: 'Timeline' }, { key: 'percentComplete', label: '% Complete' }, { key: 'budgetVariance', label: 'Budget Variance' }, { key: 'endDate', label: 'End Date', type: 'date' }] } },
    { type: 'kpi', id: 'milestones-kpi', title: 'Milestones', dataSource: 'milestonesSummary', config: { valueKey: 'count', label: 'Total milestones', format: 'number' } },
    { type: 'table', id: 'milestones-by-project', title: 'Milestones by Project', dataSource: 'milestones', groupIds: ['milestones-by-project-group'], config: { groupByKey: 'projectName', groupLabelKey: 'projectName', columns: [{ key: 'name', label: 'Milestone' }, { key: 'owner', label: 'Owner' }, { key: 'status', label: 'Status' }, { key: 'targetDate', label: 'Target Date', type: 'date' }, { key: 'completedDate', label: 'Completed', type: 'date' }, { key: 'percentComplete', label: '% Complete' }] } },
  ],
};

// --- Starter reports list (10 entries) ---
export const starterReports = [
  { id: 'showcase-complex', label: 'Showcase Complex', spec: showcaseComplexSpec },
  { id: 'tabbed-portfolio', label: 'Tabbed Portfolio', spec: tabbedPortfolioSpec },
  { id: 'sectioned-delivery', label: 'Sectioned Delivery', spec: sectionedDeliverySpec },
  { id: 'multi-source-filters', label: 'Multi-Source Filters', spec: multiSourceFiltersSpec },
  { id: 'preset-quick-views', label: 'Preset Quick Views', spec: presetQuickViewsSpec },
  { id: 'custom-layout', label: 'Custom Layout', spec: customLayoutSpec },
  { id: 'charts-focus', label: 'Charts Focus', spec: chartsFocusSpec },
  { id: 'table-analytics', label: 'Table Analytics', spec: tableAnalyticsSpec },
  { id: 'kpi-trend', label: 'KPI & Trend', spec: kpiTrendSpec },
  { id: 'portfolio-quarterly-overview', label: 'Portfolio Quarterly Overview', spec: portfolioQuarterlyOverviewSpec },
];
