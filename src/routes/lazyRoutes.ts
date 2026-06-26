import type { ComponentType } from 'react';

type ModuleWithExport<T extends string> = Record<T, ComponentType>;

export async function lazyNamed<T extends string>(
  loader: () => Promise<ModuleWithExport<T>>,
  exportName: T,
) {
  const mod = await loader();
  return { Component: mod[exportName] };
}

export async function lazyDefault(loader: () => Promise<{ default: ComponentType }>) {
  const mod = await loader();
  return { Component: mod.default };
}
