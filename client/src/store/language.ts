import Cookies from 'js-cookie';
import { atomWithLocalStorage } from './utils';

const defaultLang = () => {
  return Cookies.get('lang') || localStorage.getItem('lang') || 'de';
};

const lang = atomWithLocalStorage('lang', defaultLang());

export default { lang };
