/**
 * Actions sur les contacts et le blocage (C3). Aucune n'est rejouée
 * automatiquement ; après un succès, la liste des contacts est relue.
 */

import {
  acceptContactRequest,
  blockMember,
  cancelContactRequest,
  rejectContactRequest,
  removeContact,
  requestContact,
  unblockMember,
} from '@core/api/endpoints/community/contacts.api';
import type {CommunityFailure} from '@core/api/endpoints/community/common.types';
import type {RequestOutcome} from '@core/api/endpoints/community/contacts.types';
import {contactsStore} from './contactsStore';
import {failureKey} from './communityErrorKeys';

export type ContactActionResult =
  | {ok: true; infoKey: string | null}
  | {ok: false; errorKey: string};

const OUTCOME_KEY: Record<RequestOutcome, string> = {
  created: 'communityApp.member.requestSent',
  duplicate: 'communityApp.member.requestDuplicate',
  cross: 'communityApp.member.requestCross',
  alreadyContacts: 'communityApp.member.requestAlready',
};

function done(infoKey: string | null = null): ContactActionResult {
  void contactsStore.load({force: true});
  return {ok: true, infoKey};
}

function fail(f: CommunityFailure): ContactActionResult {
  return {ok: false, errorKey: failureKey(f)};
}

export async function requestContactAction(userId: string): Promise<ContactActionResult> {
  const res = await requestContact(userId);
  return res.kind === 'success' ? done(OUTCOME_KEY[res.outcome]) : fail(res);
}

export async function acceptRequestAction(relationId: string): Promise<ContactActionResult> {
  const res = await acceptContactRequest(relationId);
  return res.kind === 'success' ? done('communityApp.contacts.acceptedInfo') : fail(res);
}

export async function rejectRequestAction(relationId: string): Promise<ContactActionResult> {
  const res = await rejectContactRequest(relationId);
  return res.kind === 'success' ? done() : fail(res);
}

export async function cancelRequestAction(relationId: string): Promise<ContactActionResult> {
  const res = await cancelContactRequest(relationId);
  return res.kind === 'success' ? done() : fail(res);
}

export async function removeContactAction(userId: string): Promise<ContactActionResult> {
  const res = await removeContact(userId);
  return res.kind === 'success' ? done() : fail(res);
}

export async function blockMemberAction(userId: string): Promise<ContactActionResult> {
  const res = await blockMember(userId);
  return res.kind === 'success' ? done() : fail(res);
}

export async function unblockMemberAction(userId: string): Promise<ContactActionResult> {
  const res = await unblockMember(userId);
  return res.kind === 'success' ? done() : fail(res);
}
