import type { GlobalThemeOverrides } from 'naive-ui'

export type NoobNaiveThemeBridge = {
  common?: GlobalThemeOverrides['common']
  layout?: {
    pageMaxWidth?: string
    contentPadding?: string
  }
}

export function defineNoobNaiveThemeBridge(
  bridge: NoobNaiveThemeBridge = {}
): NoobNaiveThemeBridge {
  return bridge
}

export function toNoobNaiveThemeOverrides(
  bridge: NoobNaiveThemeBridge = {}
): GlobalThemeOverrides {
  return {
    common: bridge.common
  }
}
