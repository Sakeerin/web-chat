
import { ContactsManager } from '@/components/contacts'
import type { Contact } from '@/types/contacts'

export function ContactsPage() {
  const handleContactSelect = (contact: Contact) => {
    console.log('Selected contact:', contact)
    // This could navigate to a chat with the contact
    // or show contact details in a sidebar
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Contacts</h1>
        <p className="text-muted-foreground">
          Manage your contacts, send requests, and find new people to connect with.
        </p>
      </div>
      
      <ContactsManager onContactSelect={handleContactSelect} />
    </div>
  )
}