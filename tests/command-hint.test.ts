import { describe, expect, it } from 'vitest'
import { CommandHintBus } from '@kernel/command-hint-bus'

describe('CommandHintBus', () => {
  it('publishes, snapshots, clears and notifies subscribers', () => {
    const bus = new CommandHintBus()
    const snapshots: string[][] = []
    const unsubscribe = bus.subscribe((hints) => {
      snapshots.push(hints.map((hint) => hint.toolId + ':' + hint.samples.join('|')))
    })

    bus.publish({ toolId: 'dice', samples: ['!力度 30', '!力度 60'] })
    bus.publish({ toolId: 'vote', samples: ['!投票 1'] })
    expect(bus.snapshot().map((hint) => hint.toolId)).toEqual(['dice', 'vote'])
    expect(snapshots.at(-1)).toEqual(['dice:!力度 30|!力度 60', 'vote:!投票 1'])

    bus.clear('dice')
    expect(bus.snapshot().map((hint) => hint.toolId)).toEqual(['vote'])
    expect(snapshots.at(-1)).toEqual(['vote:!投票 1'])

    bus.clearAll()
    expect(bus.snapshot()).toEqual([])
    unsubscribe()
    bus.publish({ toolId: 'dice', samples: ['!力度 90'] })
    expect(snapshots).toHaveLength(4)
  })
})
