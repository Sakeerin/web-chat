import { useState } from 'react'
import { Card, CardContent } from '@ui/components/card'
import { ContactsList } from './ContactsList'
import { ContactRequests } from './ContactRequests'
import { UserSearch } from './UserSearch'
import { BlockedUsers } from './BlockedUsers'
import type { Contact } from '@/types/contacts'

type ContactsTab = 'contacts' | 'requests' | 'search' | 'blocked'

interface ContactsManagerProps {
  onContactSelect?: (contact: Contact) => void
  defaultTab?: ContactsTab
}

export function ContactsManager({ onContactSelect, defaultTab = 'contacts' }: ContactsManagerProps) {
  const [activeTab, setActiveTab] = useState<ContactsTab>(defaultTab)

  const tabs = [
    { id: 'contacts' as const, label: 'Contacts', component: ContactsList },
    { id: 'requests' as const, label: 'Requests', component: ContactRequests },
    { id: 'search' as const, label: 'Find People', component: UserSearch },
    { id: 'blocked' as const, label: 'Blocked', component: BlockedUsers },
  ]

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Tab Navigation */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex space-x-1 bg-muted p-1 rounded-lg">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === tab.id
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Active Tab Content */}
      <div className="space-y-6">
        {ActiveComponent && (
          <ActiveComponent 
            {...(onContactSelect && { onContactSelect })}
            {...(activeTab === 'contacts' && { showActions: true })}
          />
        )}
      </div>
    </div>
  )
}