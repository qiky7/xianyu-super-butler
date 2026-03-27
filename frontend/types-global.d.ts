// Global type declarations for modules without installed types
// This file allows TypeScript to compile without node_modules

// React types
declare module 'react' {
  export type ReactElement = any;
  export type ReactNode = any;
  export type FC<P = {}> = (props: P) => ReactElement | null;
  export type FormEvent<T = Element> = any;
  export type ChangeEvent<T = Element> = any;
  export type MouseEvent<T = Element, E = Event> = any;
  
  export function useState<S>(initialState: S | (() => S)): [S, (newState: S) => void];
  export function useEffect(effect: () => void | (() => void), deps?: any[]): void;
  export function useMemo<T>(factory: () => T, deps?: any[]): T;
  export function useCallback<T extends (...args: any[]) => any>(callback: T, deps?: any[]): T;
  export function useRef<T>(initialValue: T | null): { current: T | null };
  export function createContext<T>(defaultValue: T): any;
  export function useContext<T>(context: any): T;
  
  export const Fragment: any;
  export const StrictMode: any;
  export const Suspense: any;
  export const memo: any;
  export const forwardRef: any;
  export const createElement: any;
  export const cloneElement: any;
  export const isValidElement: any;
  export const Children: any;
  
  export default React;
  const React: any;
}

declare module 'react/jsx-runtime' {
  export function jsx(type: any, props: any, key?: any): any;
  export function jsxs(type: any, props: any, key?: any): any;
  export function Fragment(type: any, props: any): any;
}

declare module 'react/jsx-dev-runtime' {
  export function jsx(type: any, props: any, key?: any): any;
  export function jsxs(type: any, props: any, key?: any): any;
  export function Fragment(type: any, props: any): any;
}

// lucide-react types
declare module 'lucide-react' {
  export const ShieldCheck: any;
  export const ArrowRight: any;
  export const Loader2: any;
  export const User: any;
  export const Lock: any;
  export const TerminalSquare: any;
  export const QrCode: any;
  export const KeyRound: any;
  export const Eye: any;
  export const EyeOff: any;
  export const Smartphone: any;
  export const MessageSquare: any;
  export const Power: any;
  export const Edit2: any;
  export const Trash2: any;
  export const Check: any;
  export const X: any;
  export const RefreshCw: any;
  export const Save: any;
  export const Clock: any;
  export const MessageCircle: any;
  export const Upload: any;
  export const Key: any;
  export const Bot: any;
  export const Settings: any;
  export const Plus: any;
  export const Mail: any;
  export const LucideProps: any;
  export const Icon: any;
}
