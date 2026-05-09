import { memo } from 'react';
import { UserCircle, Users, ChevronDown } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useLocalize, useLocalStorage } from '~/hooks';
import { cn } from '~/utils';

const PROFILE_ITEMS = [
  {
    key: 'com_tfw_sidebar_item_avatar' as const,
    icon: UserCircle,
    href: '/profile/avatar',
  },
  {
    key: 'com_tfw_sidebar_item_leads' as const,
    icon: Users,
    href: '/profile/leads',
  },
] as const;

const ProfileSection = memo(() => {
  const localize = useLocalize();
  const location = useLocation();
  const [isExpanded, setIsExpanded] = useLocalStorage('tfw:profileSectionExpanded', true);

  return (
    <section aria-label={localize('com_tfw_sidebar_section_profile')} className="px-3 pt-1">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="group flex w-full items-center justify-between rounded-lg px-1 py-2 text-xs font-bold text-text-secondary outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-black dark:focus-visible:ring-white"
      >
        <span className="select-none">{localize('com_tfw_sidebar_section_profile')}</span>
        <ChevronDown
          className={cn(
            'h-3 w-3 transition-transform duration-200',
            isExpanded ? 'rotate-180' : '',
          )}
          aria-hidden="true"
        />
      </button>
      {isExpanded && (
        <ul className="flex flex-col gap-0.5" role="list">
          {PROFILE_ITEMS.map(({ key, icon: Icon, href }) => {
            const isActive = location.pathname === href;
            return (
              <li key={href}>
                <Link
                  to={href}
                  aria-label={localize(key)}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                    isActive
                      ? 'bg-brand-rose-cream font-semibold text-brand-rose-dark'
                      : 'text-text-body hover:bg-surface-hover hover:text-text-primary',
                  )}
                >
                  <Icon
                    className={cn(
                      'h-4 w-4 flex-shrink-0',
                      isActive ? 'text-brand-rose-dark' : 'text-text-secondary',
                    )}
                    aria-hidden="true"
                  />
                  <span>{localize(key)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
});

ProfileSection.displayName = 'ProfileSection';

export default ProfileSection;
