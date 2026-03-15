import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { resolveReport } from '@prism-reporting/core';
import { KpiView, ResolvedQueryInspector } from '@prism-reporting/react-ui';

describe('resolved query metadata', () => {
  it('captures merged query params from data source defaults and active filters', async () => {
    const spec = {
      id: 'initiative-report',
      title: 'Initiatives',
      layout: 'singleColumn',
      dataSources: {
        initiatives: {
          name: 'initiatives',
          query: 'initiatives',
          params: {
            scoreFrom: 70,
            scoreTo: 95,
          },
        },
      },
      filters: [
        {
          type: 'select',
          id: 'portfolio',
          label: 'Portfolio',
          dataSource: 'initiatives',
          paramKey: 'portfolio',
          options: [{ value: 'Growth', label: 'Growth' }],
        },
      ],
      widgets: [
        {
          type: 'table',
          id: 'initiatives-table',
          dataSource: 'initiatives',
          config: {
            columns: [{ key: 'name', label: 'Initiative' }],
          },
        },
      ],
    };

    const resolved = await resolveReport(
      spec,
      {
        async runQuery() {
          return [{ name: 'Aurora Commerce Expansion' }];
        },
      },
      { portfolio: 'Growth' }
    );

    assert.deepEqual(resolved.queries, [
      {
        dataSource: 'initiatives',
        query: 'initiatives',
        widgetId: 'initiatives-table',
        params: {
          scoreFrom: 70,
          scoreTo: 95,
          portfolio: 'Growth',
        },
        rowCount: 1,
        deliveryMode: 'fullVisual',
      },
    ]);
  });

  it('renders a compact inspector for the applied query params', () => {
    const html = renderToStaticMarkup(
      React.createElement(ResolvedQueryInspector, {
        queries: [
          {
            dataSource: 'initiatives',
            query: 'initiatives',
            params: {
              scoreFrom: 70,
              scoreTo: 95,
              portfolio: 'Growth',
            },
          },
        ],
        conditionalFormatting: [
          {
            target: { type: 'row' },
            when: { field: 'status', op: 'eq', value: 'At Risk' },
            tone: 'danger',
            label: 'Delivery risk',
          },
        ],
      })
    );

    assert.match(html, /Query info/);
    assert.match(html, /initiatives/);
    assert.match(html, /scoreFrom/);
    assert.match(html, /Growth/);
    assert.match(html, /Formatting rules/);
    assert.match(html, /Delivery risk/);
    assert.match(html, /Highlight row danger when status = At Risk/);
  });

  it('renders widget-level query info next to the component title', () => {
    const html = renderToStaticMarkup(
      React.createElement(KpiView, {
        title: 'Initiatives',
        data: {
          value: 3,
          label: 'Growth initiatives',
        },
        queryInfo: {
          dataSource: 'initiatives',
          query: 'initiatives',
          params: {
            scoreFrom: 70,
            scoreTo: 95,
            portfolio: 'Growth',
          },
        },
        conditionalFormatting: [
          {
            target: { type: 'card' },
            when: { field: 'status', op: 'in', values: ['Blocked', 'At Risk'] },
            tone: 'danger',
            label: 'Delivery risk',
          },
        ],
      })
    );

    assert.match(html, /Initiatives/);
    assert.match(html, /Query/);
    assert.match(html, /initiatives/);
    assert.match(html, /Growth/);
  });
});
