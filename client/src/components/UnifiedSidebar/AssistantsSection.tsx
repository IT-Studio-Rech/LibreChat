import { memo, useCallback } from 'react';
import { Target, MessageSquare, BookOpen, Globe, Sparkles, ChevronDown } from 'lucide-react';
import { EModelEndpoint, PermissionBits, Constants } from 'librechat-data-provider';
import type { Agent } from 'librechat-data-provider';
import useNewConvo from '~/hooks/useNewConvo';
import { useListAgentsQuery } from '~/data-provider';
import { useLocalize, useLocalStorage } from '~/hooks';
import { cn } from '~/utils';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  nische: Target,
  angebot: Target,
  sales: MessageSquare,
  'tara wiki': BookOpen,
  wiki: BookOpen,
  webseiten: Globe,
  website: Globe,
  feedback: Globe,
};

function getAgentIcon(name: string | null): React.ComponentType<{ className?: string }> {
  if (!name) {
    return Sparkles;
  }
  const lower = name.toLowerCase();
  for (const [key, Icon] of Object.entries(ICON_MAP)) {
    if (lower.includes(key)) {
      return Icon;
    }
  }
  return Sparkles;
}

const AgentSkeletonItem = memo(() => (
  <li className="flex items-center gap-3 rounded-brand-sm px-3 py-2" aria-hidden="true">
    <div className="h-4 w-4 flex-shrink-0 animate-pulse rounded bg-cream" />
    <div className="h-3 w-24 animate-pulse rounded bg-cream" />
  </li>
));

AgentSkeletonItem.displayName = 'AgentSkeletonItem';

interface AgentItemProps {
  agent: Agent;
  onSelect: (agentId: string) => void;
}

const AgentItem = memo(({ agent, onSelect }: AgentItemProps) => {
  const localize = useLocalize();
  const Icon = getAgentIcon(agent.name ?? null);

  const handleClick = useCallback(() => {
    onSelect(agent.id);
  }, [agent.id, onSelect]);

  return (
    <li>
      <button
        type="button"
        onClick={handleClick}
        aria-label={localize('com_tfw_sidebar_agent_start').replace('{{name}}', agent.name ?? '')}
        className="group flex w-full items-center gap-3 rounded-brand-sm px-3 py-2 text-[13.5px] font-medium text-text-body transition-colors hover:bg-cream-dark hover:text-text-headline"
      >
        <Icon
          className="h-4 w-4 flex-shrink-0 text-text-muted transition-colors group-hover:text-text-headline"
          aria-hidden="true"
          strokeWidth={1.75}
        />
        <span className="truncate text-left">{agent.name}</span>
      </button>
    </li>
  );
});

AgentItem.displayName = 'AgentItem';

const AssistantsSection = memo(() => {
  const localize = useLocalize();
  const [isExpanded, setIsExpanded] = useLocalStorage('tfw:assistantsSectionExpanded', true);
  const { newConversation } = useNewConvo();

  const { data: agentsResponse, isLoading } = useListAgentsQuery(
    { requiredPermission: PermissionBits.VIEW, promoted: 1, limit: 4 },
    { select: (res) => res.data.filter((a) => a.id) },
  );

  const agents = agentsResponse ?? [];

  const handleSelect = useCallback(
    (agentId: string) => {
      newConversation({
        template: {
          endpoint: EModelEndpoint.agents,
          agent_id: agentId,
          conversationId: Constants.NEW_CONVO as string,
        },
      });
    },
    [newConversation],
  );

  if (!isLoading && agents.length === 0) {
    return null;
  }

  return (
    <section aria-label={localize('com_tfw_sidebar_section_agents')} className="mt-2 px-3 pt-1">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="group flex w-full items-center justify-between rounded-lg px-1 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-text-muted outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-black dark:focus-visible:ring-white"
      >
        <span className="select-none">{localize('com_tfw_sidebar_section_agents')}</span>
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
          {isLoading
            ? Array.from({ length: 4 }, (_, i) => <AgentSkeletonItem key={i} />)
            : agents.map((agent) => (
                <AgentItem key={agent.id} agent={agent} onSelect={handleSelect} />
              ))}
        </ul>
      )}
    </section>
  );
});

AssistantsSection.displayName = 'AssistantsSection';

export default AssistantsSection;
