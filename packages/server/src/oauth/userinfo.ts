import {
  formatAddress,
  formatFamilyName,
  formatGivenName,
  formatHumanName,
  getDateProperty,
  getReferenceString,
  ProfileResource,
} from '@medplum/core';
import { Bot, ClientApplication, Reference, User } from '@medplum/fhirtypes';
import { Request, RequestHandler, Response } from 'express';
import { asyncWrap } from '../async';
import { getAuthenticatedContext } from '../context';
import { getSystemRepo } from '../fhir/repo';

/**
 * Handles the OAuth/OpenID UserInfo Endpoint.
 * See: https://openid.net/specs/openid-connect-core-1_0.html#UserInfo
 */
export const userInfoHandler: RequestHandler = asyncWrap(async (_req: Request, res: Response) => {
  const systemRepo = getSystemRepo();
  const ctx = getAuthenticatedContext();
  const user = await systemRepo.readReference(ctx.login.user as Reference<User>);
  const profile = await ctx.repo.readReference(ctx.profile);
  const userInfo: Record<string, any> = {
    sub: profile.id,
  };

  const scopes = ctx.login.scope?.split(' ');
  if (scopes?.includes('profile')) {
    buildProfile(userInfo, profile);
  }
  if (scopes?.includes('email')) {
    buildEmail(userInfo, profile, user);
  }
  if (scopes?.includes('phone')) {
    buildPhone(userInfo, profile);
  }
  if (scopes?.includes('address')) {
    buildAddress(userInfo, profile);
  }

  res.status(200).json(userInfo);
});

function buildProfile(userInfo: Record<string, any>, profile: ProfileResource | Bot | ClientApplication): void {
  userInfo.profile = getReferenceString(profile);
  userInfo.locale = 'en-US';
  userInfo.birthdate = 'birthDate' in profile ? profile.birthDate : '';

  const lastUpdated = getDateProperty(profile.meta?.lastUpdated);
  if (lastUpdated) {
    userInfo.updated_at = lastUpdated.getTime() / 1000;
  }

  const humanName = typeof profile.name === 'object' ? profile.name?.[0] : undefined;
  if (humanName) {
    userInfo.name = formatHumanName(humanName);
    userInfo.given_name = formatGivenName(humanName);
    userInfo.middle_name = '';
    userInfo.family_name = formatFamilyName(humanName);
  }

  userInfo.website = '';
  userInfo.zoneinfo = '';
  userInfo.gender = '';
  userInfo.preferred_username = '';
  userInfo.picture = '';
  userInfo.nickname = '';
}

function buildEmail(
  userInfo: Record<string, any>,
  profile: ProfileResource | Bot | ClientApplication,
  user: User
): void {
  if (user.email) {
    userInfo.email = user.email;
    userInfo.email_verified = Boolean(user.emailVerified);
  } else {
    const contactPoint = 'telecom' in profile ? profile.telecom?.find((cp) => cp.system === 'email') : undefined;
    if (contactPoint) {
      userInfo.email = contactPoint.value;
      userInfo.email_verified = false;
    }
  }
}

function buildPhone(userInfo: Record<string, any>, profile: ProfileResource | Bot | ClientApplication): void {
  const contactPoint = 'telecom' in profile ? profile.telecom?.find((cp) => cp.system === 'phone') : undefined;
  if (contactPoint) {
    userInfo.phone_number = contactPoint.value;
    userInfo.phone_number_verified = false;
  }
}

function buildAddress(userInfo: Record<string, any>, profile: ProfileResource | Bot | ClientApplication): void {
  const address = 'address' in profile ? profile.address?.[0] : undefined;
  if (address) {
    userInfo.address = {
      formatted: formatAddress(address),
    };
  }
}
