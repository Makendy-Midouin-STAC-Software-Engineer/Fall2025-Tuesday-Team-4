import { InstantSearch, Configure } from 'react-instantsearch'
import type { PropsWithChildren } from 'react'
import { searchClient, indexName } from '@/lib/algoliaClient'

export function AlgoliaProvider({ children }: PropsWithChildren) {
  return (
    <InstantSearch searchClient={searchClient} indexName={indexName}>
      <Configure hitsPerPage={20} />
      {children}
    </InstantSearch>
  )
}


