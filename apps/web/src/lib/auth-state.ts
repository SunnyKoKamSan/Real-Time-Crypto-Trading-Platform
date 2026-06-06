import type { AssetBalance, AuthUser } from '@rtctp/domain';

export type AuthStatus = 'anonymous' | 'submitting' | 'authenticated';

export interface AuthState {
  status: AuthStatus;
  user: AuthUser | null;
  balances: AssetBalance[];
  error: string | null;
}

export type AuthAction =
  | { type: 'submit' }
  | { type: 'authenticated'; user: AuthUser; balances: AssetBalance[] }
  | { type: 'error'; message: string }
  | { type: 'logout' };

export const initialAuthState: AuthState = {
  status: 'anonymous',
  user: null,
  balances: [],
  error: null,
};

export function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'submit':
      return { ...state, status: 'submitting', error: null };
    case 'authenticated':
      return {
        status: 'authenticated',
        user: action.user,
        balances: action.balances,
        error: null,
      };
    case 'error':
      return { ...state, status: 'anonymous', error: action.message };
    case 'logout':
      return initialAuthState;
    default:
      return state;
  }
}
