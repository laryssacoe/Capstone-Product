'use client'

import * as React from 'react'
import * as ProgressPrimitive from '@radix-ui/react-progress'
import styled from 'styled-components'

import { cn } from '@/lib/utils'

const ProgressIndicator = styled(ProgressPrimitive.Indicator)<{ $value: number }>`
  transform: ${({ $value }) => `translateX(-${100 - $value}%)`};
`

function Progress({
  className,
  value,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root>) {
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn(
        'bg-primary/20 relative h-2 w-full overflow-hidden rounded-full',
        className,
      )}
      {...props}
    >
      <ProgressIndicator
        data-slot="progress-indicator"
        className="bg-primary h-full w-full flex-1 transition-all"
        $value={value || 0}
      />
    </ProgressPrimitive.Root>
  )
}

export { Progress }
