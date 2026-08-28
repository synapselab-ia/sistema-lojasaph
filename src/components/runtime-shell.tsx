"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useState } from "react";
import {
  isWorkspaceAreaActive,
  isWorkspaceRouteActive,
  workspaceNavigation,
} from "@/lib/navigation/workspace-navigation";

function WorkspaceNavigation({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="space-y-1" aria-label="Navegação principal">
      {workspaceNavigation.map((area) => {
        const areaActive = isWorkspaceAreaActive(pathname, area);
        const areaRouteActive = area.href ? isWorkspaceRouteActive(pathname, area.href) : false;

        return (
          <div key={area.id} className="py-1">
            {area.href ? (
              <Link
                href={area.href}
                onClick={onNavigate}
                aria-current={areaRouteActive ? "page" : undefined}
                className={`flex min-h-11 items-center rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  areaRouteActive
                    ? "bg-neutral-900 text-white"
                    : areaActive
                      ? "bg-neutral-100 text-neutral-950"
                      : "text-neutral-700 hover:bg-neutral-100 hover:text-neutral-950"
                }`}
              >
                {area.label}
              </Link>
            ) : (
              <div
                className={`flex min-h-10 items-center rounded-lg px-3 py-2 text-sm font-semibold ${
                  areaActive ? "bg-neutral-100 text-neutral-950" : "text-neutral-700"
                }`}
              >
                {area.label}
              </div>
            )}

            {area.items && area.items.length > 0 && (
              <div className="ml-3 mt-1 space-y-1 border-l border-neutral-200 pl-3">
                {area.items.map((item) => {
                  const active = isWorkspaceRouteActive(pathname, item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={`flex min-h-10 items-center rounded-lg px-3 py-2 text-sm transition ${
                        active
                          ? "bg-neutral-900 font-medium text-white"
                          : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-950"
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}

function ShellSidebarContent({
  organizationName,
  roles,
  canSwitchOrganization,
  pathname,
  onNavigate,
}: {
  organizationName: string;
  roles: readonly string[];
  canSwitchOrganization: boolean;
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <>
      <Link href="/" onClick={onNavigate} className="inline-flex min-h-11 items-center text-lg font-semibold tracking-tight">
        Sistema Lojasaph
      </Link>
      <p className="mt-1 text-xs font-medium text-emerald-700">Workspace persistente</p>

      <div className="mt-4 min-w-0 rounded-xl bg-neutral-100 p-3">
        <p className="text-xs text-neutral-500">Organização</p>
        <p className="mt-1 break-words text-sm font-semibold">{organizationName}</p>
        <p className="mt-1 break-words text-xs text-neutral-500">Perfis: {roles.join(", ")}</p>
      </div>

      <div className="mt-5">
        <WorkspaceNavigation pathname={pathname} onNavigate={onNavigate} />
      </div>

      <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs leading-5 text-emerald-900">
        Estoque, compras, contas a pagar, caixa e cadastros administrativos usam Supabase + RLS.
      </div>

      <div className="mt-5 flex flex-col gap-2">
        {canSwitchOrganization && (
          <Link
            href="/workspace/selecionar-organizacao"
            onClick={onNavigate}
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-neutral-300 px-3 py-2 text-center text-xs font-medium"
          >
            Trocar organização
          </Link>
        )}
        <form action="/auth/signout" method="post">
          <button type="submit" className="min-h-11 w-full rounded-lg border border-neutral-300 px-3 py-2 text-xs font-medium">
            Sair
          </button>
        </form>
      </div>
    </>
  );
}

export function RuntimeShell({
  children,
  organizationName,
  roles,
  canSwitchOrganization,
}: {
  children: ReactNode;
  organizationName: string;
  roles: readonly string[];
  canSwitchOrganization: boolean;
}) {
  const pathname = usePathname();
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);

  return (
    <div className="min-h-screen bg-neutral-100 lg:grid lg:grid-cols-[270px_1fr]">
      <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between border-b border-neutral-200 bg-white px-4 lg:hidden">
        <Link href="/" className="font-semibold tracking-tight">Sistema Lojasaph</Link>
        <button
          type="button"
          aria-controls="workspace-mobile-navigation"
          aria-expanded={mobileNavigationOpen}
          onClick={() => setMobileNavigationOpen(true)}
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-neutral-300 px-4 text-sm font-semibold"
        >
          Menu
        </button>
      </header>

      {mobileNavigationOpen && (
        <div className="lg:hidden">
          <button
            type="button"
            aria-label="Fechar menu de navegação"
            onClick={() => setMobileNavigationOpen(false)}
            className="fixed inset-0 z-40 bg-neutral-950/40"
          />
          <aside
            id="workspace-mobile-navigation"
            className="fixed inset-y-0 left-0 z-50 w-[min(88vw,22rem)] overflow-y-auto bg-white p-5 shadow-2xl"
          >
            <div className="mb-2 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setMobileNavigationOpen(false)}
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-neutral-300 px-3 text-sm font-medium"
              >
                Fechar
              </button>
            </div>
            <ShellSidebarContent
              organizationName={organizationName}
              roles={roles}
              canSwitchOrganization={canSwitchOrganization}
              pathname={pathname}
              onNavigate={() => setMobileNavigationOpen(false)}
            />
          </aside>
        </div>
      )}

      <aside className="hidden min-w-0 border-r border-neutral-200 bg-white p-6 lg:sticky lg:top-0 lg:block lg:h-screen lg:overflow-y-auto">
        <ShellSidebarContent
          organizationName={organizationName}
          roles={roles}
          canSwitchOrganization={canSwitchOrganization}
          pathname={pathname}
        />
      </aside>

      <main className="min-w-0 p-4 sm:p-6 lg:p-10">{children}</main>
    </div>
  );
}
