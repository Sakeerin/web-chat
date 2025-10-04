import React from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { SearchInterface } from '@/components/search/SearchInterface'

const SearchPage: React.FC = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  
  const initialQuery = searchParams.get('q') || ''
  const initialType = (searchParams.get('type') as 'global' | 'messages' | 'users' | 'conversations') || 'global'

  const handleClose = () => {
    navigate(-1) // Go back to previous page
  }

  return (
    <div className="h-screen flex flex-col">
      <SearchInterface
        initialQuery={initialQuery}
        initialType={initialType}
        onClose={handleClose}
        isModal={false}
        className="flex-1"
      />
    </div>
  )
}

export default SearchPage