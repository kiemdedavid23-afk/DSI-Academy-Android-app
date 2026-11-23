/**
 * Contacts, demandes reçues et envoyées (C3). Un échec de la liste des demandes
 * n'empêche pas d'afficher les contacts (comme le site).
 */

import {
  fetchContactRequests,
  fetchContacts,
} from '@core/api/endpoints/community/contacts.api';
import type {
  ContactEntry,
  ContactRequestEntry,
} from '@core/api/endpoints/community/contacts.types';
import {createResourceStore, storeRegistry} from '@shared/store';

export type ContactsData = {
  contacts: ContactEntry[];
  incoming: ContactRequestEntry[];
  outgoing: ContactRequestEntry[];
};

const TTL_MS = 30_000;

async function loadContacts(): Promise<ContactsData> {
  const [contacts, requests] = await Promise.all([
    fetchContacts(),
    fetchContactRequests(),
  ]);
  if (contacts.kind !== 'success') {
    throw new Error(contacts.code ?? contacts.errorKind);
  }
  return {
    contacts: contacts.items,
    incoming: requests.kind === 'success' ? requests.requests.incoming : [],
    outgoing: requests.kind === 'success' ? requests.requests.outgoing : [],
  };
}

export const contactsStore = createResourceStore<ContactsData>({
  ttlMs: TTL_MS,
  fetcher: loadContacts,
});

storeRegistry.register(contactsStore);
