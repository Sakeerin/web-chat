import React from 'react'
import { Dialog, DialogContent } from '@ui/components/dialog'
import { SearchInterface } from './SearchInterface'

interface SearchModalProps {
  isOpen: boolean
  onClose: () => void
  initialQuery?: string
  initialType?: 'global' | 'messages' | 'users' | 'conversations'
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  initialQuery = '',
  initialType = 'global',
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[80vh] p-0">
        <SearchInterface
          initialQuery={initialQuery}
          initialType={initialType}
          onClose={onClose}
          isModal={true}
          className="h-full"
        />
      </DialogContent>
    </Dialog>
  )
}