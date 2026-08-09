/**
 * UpdateAllDialog 批量更新审阅：manual 只作为独立信息行，不进入权限 diff。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, args?: Record<string, unknown>) =>
      args ? `${key}:${JSON.stringify(args)}` : key,
  }),
}));
vi.mock('@radix-ui/react-dialog', () => ({
  Root: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? children : null,
  Portal: ({ children }: { children: React.ReactNode }) => children,
  Overlay: (props: React.HTMLAttributes<HTMLDivElement>) => <div {...props} />,
  Content: (props: React.HTMLAttributes<HTMLDivElement>) => <div {...props} />,
  Title: (props: React.HTMLAttributes<HTMLHeadingElement>) => <h2 {...props} />,
  Description: (props: React.HTMLAttributes<HTMLParagraphElement>) => <p {...props} />,
  Close: (props: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props} />,
}));
vi.mock('../GhostPluginIcon', () => ({
  GhostPluginIcon: () => <span data-testid="plugin-icon" />,
}));

import type { GhostManifest } from '../../../../shared/ghost';
import { diffGhostPermissionItems } from '../../../../shared/ghost';
import { UpdateAllDialog } from '../UpdateAllDialog';

const installed: GhostManifest = {
  schemaVersion: 2,
  id: 'manual-demo',
  name: 'Manual Demo',
  version: '1.0.0',
  kind: 'chip',
  entry: 'main.js',
  slots: ['network'],
  network: { hosts: ['existing.example.com'] },
};

const expected: GhostManifest = {
  ...installed,
  network: { hosts: ['existing.example.com', 'api.example.com'] },
  manual: {
    items: [
      { dir: 'manual/ops', name: 'ops', description: '操作手册' },
      { dir: 'manual/faq', name: 'faq', description: '常见问题' },
    ],
  },
};

describe('UpdateAllDialog', () => {
  it('同版本扩权审阅展开后显示 manual 篇数，但 manual 不计入权限 diff', () => {
    const permissionDiff = diffGhostPermissionItems(installed, expected);
    expect(permissionDiff.added).toHaveLength(1);
    expect(permissionDiff.added[0]?.key).toBe('network:host:api.example.com');

    render(
      <UpdateAllDialog
        open
        rows={[
          {
            pluginId: 'plugin-a',
            ghostId: 'manual-demo',
            name: 'Manual Demo',
            fromVersion: '1.0.0',
            toVersion: '1.0.0',
            status: 'needs-confirm',
            permissionDiff,
            expectedManifest: expected,
          },
        ]}
        iconByGhostId={new Map()}
        onApprove={vi.fn()}
        onSkip={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'settings.ghosts.updateAll.reviewDiff' }));

    expect(
      screen.getByText(/settings\.ghosts\.perm\.networkHost:.*api\.example\.com/),
    ).toBeTruthy();
    expect(
      screen.getByText(/settings\.ghosts\.installConfirm\.manualCount:.*"count":2/),
    ).toBeTruthy();
  });
});
