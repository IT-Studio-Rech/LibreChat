import { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import { easings } from '@react-spring/web';
import {
  Target,
  MessageSquare,
  BookOpen,
  Globe,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { EModelEndpoint, PermissionBits, Constants } from 'librechat-data-provider';
import type { Agent } from 'librechat-data-provider';
import { BirthdayIcon, TooltipAnchor, SplitText } from '@librechat/client';
import { useChatContext, useAgentsMapContext, useAssistantsMapContext } from '~/Providers';
import { useGetEndpointsQuery, useGetStartupConfig, useListAgentsQuery } from '~/data-provider';
import ConvoIcon from '~/components/Endpoints/ConvoIcon';
import { useLocalize, useAuthContext } from '~/hooks';
import useNewConvo from '~/hooks/useNewConvo';
import { getIconEndpoint, getEntity } from '~/utils';

const containerClassName =
  'shadow-stroke relative flex h-full items-center justify-center rounded-full bg-white dark:bg-presentation dark:text-white text-black dark:after:shadow-none ';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  'nische': Target,
  'angebot': Target,
  'sales': MessageSquare,
  'tara wiki': BookOpen,
  'wiki': BookOpen,
  'webseiten': Globe,
  'website': Globe,
  'feedback': Globe,
};

function getAgentIcon(name: string | null): React.ComponentType<{ className?: string }> {
  if (!name) return Sparkles;
  const lower = name.toLowerCase();
  for (const [key, Icon] of Object.entries(ICON_MAP)) {
    if (lower.includes(key)) return Icon;
  }
  return Sparkles;
}

const staggerDelays = ['[animation-delay:0ms]', '[animation-delay:100ms]', '[animation-delay:200ms]', '[animation-delay:300ms]'];

function PromotedTile({
  agent,
  index,
  onSelect,
  ariaLabel,
  ctaLabel,
}: {
  agent: Agent;
  index: number;
  onSelect: (id: string) => void;
  ariaLabel: string;
  ctaLabel: string;
}) {
  const Icon = getAgentIcon(agent.name);
  const delay = staggerDelays[index] ?? '[animation-delay:300ms]';

  return (
    <button
      type="button"
      className={`group flex cursor-pointer flex-col items-start gap-3 rounded-brand-lg border-2 border-border-light bg-white p-6 text-left shadow-brand-sm transition-all duration-200 hover:scale-[1.02] hover:border-brand-rose hover:shadow-brand-md animate-brand-slide-in opacity-0 motion-reduce:animate-none motion-reduce:opacity-100 ${delay}`}
      aria-label={ariaLabel}
      onClick={() => onSelect(agent.id)}
    >
      <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-brand-md bg-brand-rose-cream text-brand-rose-dark transition-colors duration-200 group-hover:bg-brand-rose group-hover:text-white">
        <Icon className="h-[22px] w-[22px] stroke-[1.75]" />
      </div>
      <div className="font-serif text-xl font-semibold leading-snug text-text-headline">
        {agent.name}
      </div>
      {agent.description != null && agent.description !== '' && (
        <div className="flex-1 font-sans text-[13.5px] leading-relaxed text-text-body">
          {agent.description}
        </div>
      )}
      <div className="mt-auto flex items-center gap-1 font-ui text-[13px] font-semibold text-brand-rose-dark transition-[gap] duration-200 group-hover:gap-2">
        {ctaLabel}
        <ArrowRight className="h-3.5 w-3.5" />
      </div>
    </button>
  );
}

function PromotedTileSkeleton() {
  return (
    <div className="flex flex-col items-start gap-3 rounded-brand-lg border-2 border-border-light bg-white p-6 shadow-brand-sm">
      <div className="h-11 w-11 animate-pulse rounded-brand-md bg-cream" />
      <div className="h-5 w-3/4 animate-pulse rounded-brand-sm bg-cream" />
      <div className="h-12 w-full animate-pulse rounded-brand-sm bg-cream" />
    </div>
  );
}

function getTextSizeClass(text: string | undefined | null) {
  if (!text) {
    return 'text-xl sm:text-2xl';
  }

  if (text.length < 40) {
    return 'text-2xl sm:text-4xl';
  }

  if (text.length < 70) {
    return 'text-xl sm:text-2xl';
  }

  return 'text-lg sm:text-md';
}

export default function Landing({ centerFormOnLanding }: { centerFormOnLanding: boolean }) {
  const { conversation } = useChatContext();
  const agentsMap = useAgentsMapContext();
  const assistantMap = useAssistantsMapContext();
  const { data: startupConfig } = useGetStartupConfig();
  const { data: endpointsConfig } = useGetEndpointsQuery();
  const { user } = useAuthContext();
  const localize = useLocalize();
  const { newConversation } = useNewConvo();

  const { data: promotedAgentsResponse, isLoading: promotedLoading } = useListAgentsQuery(
    { requiredPermission: PermissionBits.VIEW, promoted: 1, limit: 4 },
    { select: (res) => res.data.filter((a) => a.id) },
  );

  const promotedAgents = promotedAgentsResponse ?? [];

  const handleTileSelect = useCallback(
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

  const [textHasMultipleLines, setTextHasMultipleLines] = useState(false);
  const [lineCount, setLineCount] = useState(1);
  const [contentHeight, setContentHeight] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);

  const endpointType = useMemo(() => {
    let ep = conversation?.endpoint ?? '';
    if (ep === EModelEndpoint.azureOpenAI) {
      ep = EModelEndpoint.openAI;
    }
    return getIconEndpoint({
      endpointsConfig,
      iconURL: conversation?.iconURL,
      endpoint: ep,
    });
  }, [conversation?.endpoint, conversation?.iconURL, endpointsConfig]);

  const { entity, isAgent, isAssistant } = getEntity({
    endpoint: endpointType,
    agentsMap,
    assistantMap,
    agent_id: conversation?.agent_id,
    assistant_id: conversation?.assistant_id,
  });

  const name = entity?.name ?? '';
  const description = (entity?.description || conversation?.greeting) ?? '';

  const getGreeting = useCallback(() => {
    if (typeof startupConfig?.interface?.customWelcome === 'string') {
      const customWelcome = startupConfig.interface.customWelcome;
      // Replace {{user.name}} with actual user name if available
      if (user?.name && customWelcome.includes('{{user.name}}')) {
        return customWelcome.replace(/{{user.name}}/g, user.name);
      }
      return customWelcome;
    }

    const now = new Date();
    const hours = now.getHours();

    const dayOfWeek = now.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // Early morning (midnight to 4:59 AM)
    if (hours >= 0 && hours < 5) {
      return localize('com_ui_late_night');
    }
    // Morning (6 AM to 11:59 AM)
    else if (hours < 12) {
      if (isWeekend) {
        return localize('com_ui_weekend_morning');
      }
      return localize('com_ui_good_morning');
    }
    // Afternoon (12 PM to 4:59 PM)
    else if (hours < 17) {
      return localize('com_ui_good_afternoon');
    }
    // Evening (5 PM to 8:59 PM)
    else {
      return localize('com_ui_good_evening');
    }
  }, [localize, startupConfig?.interface?.customWelcome, user?.name]);

  const handleLineCountChange = useCallback((count: number) => {
    setTextHasMultipleLines(count > 1);
    setLineCount(count);
  }, []);

  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.offsetHeight);
    }
  }, [lineCount, description]);

  const getDynamicMargin = useMemo(() => {
    let margin = 'mb-0';

    if (lineCount > 2 || (description && description.length > 100)) {
      margin = 'mb-10';
    } else if (lineCount > 1 || (description && description.length > 0)) {
      margin = 'mb-6';
    } else if (textHasMultipleLines) {
      margin = 'mb-4';
    }

    if (contentHeight > 200) {
      margin = 'mb-16';
    } else if (contentHeight > 150) {
      margin = 'mb-12';
    }

    return margin;
  }, [lineCount, description, textHasMultipleLines, contentHeight]);

  const greetingText =
    typeof startupConfig?.interface?.customWelcome === 'string'
      ? getGreeting()
      : getGreeting() + (user?.name ? ', ' + user.name : '');

  return (
    <div
      className={`flex h-full transform-gpu flex-col items-center justify-center pb-16 transition-all duration-200 ${centerFormOnLanding ? 'max-h-full sm:max-h-0' : 'max-h-full'} ${getDynamicMargin}`}
    >
      <div ref={contentRef} className="flex flex-col items-center gap-0 p-2">
        <div
          className={`flex ${textHasMultipleLines ? 'flex-col' : 'flex-col md:flex-row'} items-center justify-center gap-2`}
        >
          <div className={`relative size-10 justify-center ${textHasMultipleLines ? 'mb-2' : ''}`}>
            <ConvoIcon
              agentsMap={agentsMap}
              assistantMap={assistantMap}
              conversation={conversation}
              endpointsConfig={endpointsConfig}
              containerClassName={containerClassName}
              context="landing"
              className="h-2/3 w-2/3 text-black dark:text-white"
              size={41}
            />
            {startupConfig?.showBirthdayIcon && (
              <TooltipAnchor
                className="absolute bottom-[27px] right-2"
                description={localize('com_ui_happy_birthday')}
                aria-label={localize('com_ui_happy_birthday')}
              >
                <BirthdayIcon />
              </TooltipAnchor>
            )}
          </div>
          {((isAgent || isAssistant) && name) || name ? (
            <div className="flex flex-col items-center gap-0 p-2">
              <SplitText
                key={`split-text-${name}`}
                text={name}
                className={`${getTextSizeClass(name)} font-medium text-text-primary`}
                delay={50}
                textAlign="center"
                animationFrom={{ opacity: 0, transform: 'translate3d(0,50px,0)' }}
                animationTo={{ opacity: 1, transform: 'translate3d(0,0,0)' }}
                easing={easings.easeOutCubic}
                threshold={0}
                rootMargin="0px"
                onLineCountChange={handleLineCountChange}
              />
            </div>
          ) : (
            <SplitText
              key={`split-text-${greetingText}${user?.name ? '-user' : ''}`}
              text={greetingText}
              className={`${getTextSizeClass(greetingText)} font-medium text-text-primary`}
              delay={50}
              textAlign="center"
              animationFrom={{ opacity: 0, transform: 'translate3d(0,50px,0)' }}
              animationTo={{ opacity: 1, transform: 'translate3d(0,0,0)' }}
              easing={easings.easeOutCubic}
              threshold={0}
              rootMargin="0px"
              onLineCountChange={handleLineCountChange}
            />
          )}
        </div>
        {description && (
          <div className="animate-fadeIn mt-4 max-w-md text-center text-sm font-normal text-text-primary">
            {description}
          </div>
        )}
      </div>
      {(promotedLoading || promotedAgents.length > 0) && (
        <div className="mt-10 w-full max-w-3xl px-2">
          {promotedLoading ? (
            <div
              role="status"
              aria-label={localize('com_tfw_landing_loading')}
              className="grid grid-cols-1 gap-6 md:grid-cols-2"
            >
              <PromotedTileSkeleton />
              <PromotedTileSkeleton />
              <PromotedTileSkeleton />
              <PromotedTileSkeleton />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {promotedAgents.map((agent, i) => (
                <PromotedTile
                  key={agent.id}
                  agent={agent}
                  index={i}
                  onSelect={handleTileSelect}
                  ariaLabel={localize('com_tfw_landing_tile_aria').replace('{{name}}', agent.name ?? '')}
                  ctaLabel={localize('com_tfw_landing_tile_cta')}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
