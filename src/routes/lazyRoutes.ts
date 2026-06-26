import type { ComponentType } from 'react';
import { RouteHydrateFallback } from './RouteHydrateFallback';

type ModuleWithExport<T extends string> = Record<T, ComponentType>;

const lazyExtras = { HydrateFallback: RouteHydrateFallback };

export async function lazyNamed<T extends string>(
  loader: () => Promise<ModuleWithExport<T>>,
  exportName: T,
) {
  const mod = await loader();
  return { Component: mod[exportName], ...lazyExtras };
}

export async function lazyDefault(loader: () => Promise<{ default: ComponentType }>) {
  const mod = await loader();
  return { Component: mod.default, ...lazyExtras };
}
