import { useNavigationType } from 'react-router-dom';

export function useNavigationDirection() {
  const navType = useNavigationType();
  return navType === 'POP' ? 'back' : 'forward';
}
