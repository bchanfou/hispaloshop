import React from 'react';
import * as HoverCard from '@radix-ui/react-hover-card';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

export default function RoleCard({
  role,
  isSelected,
  onSelect,
}) {
  const Icon = role.icon;
  const PreviewIcon = role.previewIcon || role.icon;

  return (
    <HoverCard.Root openDelay={120} closeDelay={80}>
      <motion.div
        layout
        whileHover={{ y: -6 }}
        transition={{ type: 'spring', stiffness: 260, damping: 18 }}
        className="h-full"
      >
        <HoverCard.Trigger asChild>
          <Link
            to={role.href}
            onClick={() => onSelect(role)}
            className={`group relative flex h-full flex-col overflow-hidden rounded-[1.75rem] border p-5 shadow-[0_16px_40px_rgba(28,28,28,0.08)] transition-all duration-300 ${role.cardClassName} ${isSelected ? 'ring-2 ring-black/10' : ''}`}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.34),_transparent_44%)]" />
            <div className="relative flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-black/55">{role.eyebrow}</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-stone-950">{role.headline}</h2>
              </div>
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border border-white/70 bg-white/70 ${role.iconColor}`}>
                <Icon className="h-5 w-5" />
              </div>
            </div>

            <p className="relative mt-4 text-sm leading-6 text-black/75">{role.copy}</p>

            {role.badge && (
              <span className="relative mt-4 inline-flex w-fit rounded-full border border-white/70 bg-white/80 px-3 py-1 text-[11px] font-semibold text-stone-950 shadow-sm">
                {role.badge}
              </span>
            )}

            {role.socialProof && (
              <span className="relative mt-3 inline-flex w-fit rounded-full border border-white/70 bg-white/85 px-3 py-1 text-[11px] font-medium text-black/75 shadow-sm">
                {role.socialProof}
              </span>
            )}

            <div className="relative mt-5 flex items-center justify-between border-t border-black/10 pt-4">
              <span className="text-sm font-semibold text-stone-950">{role.cta}</span>
              <ArrowRight className="h-4 w-4 text-stone-950 transition-transform duration-200 group-hover:translate-x-1" />
            </div>
          </Link>
        </HoverCard.Trigger>

        <HoverCard.Portal>
          <HoverCard.Content
            side="top"
            align="start"
            sideOffset={14}
            className="z-50 hidden max-w-xs rounded-2xl border border-stone-200 bg-white/95 p-4 shadow-[0_24px_60px_rgba(28,28,28,0.14)] backdrop-blur md:block"
          >
            <div className="flex items-start gap-3">
              <div className={`mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl ${role.previewColor || 'bg-stone-100'} ${role.iconColor}`}>
                <PreviewIcon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-stone-950">{role.previewTitle}</p>
                <p className="mt-1 text-xs leading-5 text-stone-600">{role.previewCopy}</p>
              </div>
            </div>
          </HoverCard.Content>
        </HoverCard.Portal>
      </motion.div>
    </HoverCard.Root>
  );
}
