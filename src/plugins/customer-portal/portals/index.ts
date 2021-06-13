import * as jsonMergePatch from 'json-merge-patch';
import * as queryString from 'querystring';
import { BrowserforcePlugin } from '../../../plugin';
import { removeNullValues, semanticallyCleanObject } from '../../utils';

const PATHS = {
  LIST_VIEW: '_ui/core/portal/CustomerSuccessPortalSetup/d',
  PORTAL_PROFILE_MEMBERSHIP: '_ui/core/portal/PortalProfileMembershipPage/e'
};
const SELECTORS = {
  SAVE_BUTTON: 'input[name="save"]',
  LIST_VIEW_PORTAL_LINKS_XPATH:
    '//div[contains(@class,"pbBody")]//th[contains(@class,"dataCell")]//a[starts-with(@href, "/060")]',
  PORTAL_DESCRIPTION: '#Description',
  PORTAL_ID: '#portalId',
  PORTAL_ADMIN_ID: 'Admin',
  PORTAL_IS_SELF_REGISTRATION_ACTIVATED_ID: 'IsSelfRegistrationActivated',
  PORTAL_SELF_REG_USER_DEFAULT_LICENSE_ID: 'SelfRegUserDefaultLicense',
  PORTAL_SELF_REG_USER_DEFAULT_ROLE_ID: 'SelfRegUserDefaultRole',
  PORTAL_SELF_REG_USER_DEFAULT_PROFILE_ID: 'SelfRegUserDefaultProfile',
  PORTAL_PROFILE_MEMBERSHIP_PROFILES: 'th.dataCell',
  PORTAL_PROFILE_MEMBERSHIP_CHECKBOXES: 'td.dataCell input'
};

export type Config = PortalConfig[];

type PortalConfig = {
  adminUser?: string;
  description?: string;
  isSelfRegistrationActivated?: boolean;
  name: string;
  oldName?: string;
  selfRegUserDefaultLicense?: string;
  selfRegUserDefaultProfile?: string;
  selfRegUserDefaultRole?: string;
  portalProfileMemberships?: PortalProfileMembership[];
  _id?: string;
};

type PortalProfileMembership = {
  name: string;
  active: boolean;
  _id?: string;
};

export class CustomerPortalSetup extends BrowserforcePlugin {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async retrieve(definition?: Config): Promise<Config> {
    const page = await this.browserforce.openPage(PATHS.LIST_VIEW);
    await page.waitForXPath(SELECTORS.LIST_VIEW_PORTAL_LINKS_XPATH);
    const customerPortalLinks = await page.$x(
      SELECTORS.LIST_VIEW_PORTAL_LINKS_XPATH
    );
    const response: Config = await page.evaluate((...links) => {
      return links.map((a: HTMLAnchorElement) => {
        return {
          _id: a.pathname.split('/')[1],
          name: a.text,
          portalProfileMemberships: []
        };
      });
    }, ...customerPortalLinks);
    for (const portal of response) {
      const portalPage = await this.browserforce.openPage(`${portal._id}/e`);
      await portalPage.waitForSelector(SELECTORS.PORTAL_DESCRIPTION);
      portal.description = await portalPage.$eval(
        SELECTORS.PORTAL_DESCRIPTION,
        (el: HTMLInputElement) => el.value
      );
      portal.adminUser = await portalPage.$eval(
        `#${SELECTORS.PORTAL_ADMIN_ID}`,
        (el: HTMLInputElement) => el.value
      );
      portal.isSelfRegistrationActivated = await portalPage.$eval(
        `#${SELECTORS.PORTAL_IS_SELF_REGISTRATION_ACTIVATED_ID}`,
        (el: HTMLInputElement) => el.checked
      );
      portal.selfRegUserDefaultLicense = await portalPage.$eval(
        `#${SELECTORS.PORTAL_SELF_REG_USER_DEFAULT_LICENSE_ID}`,
        (el: HTMLSelectElement) => el.selectedOptions[0].text
      );
      portal.selfRegUserDefaultRole = await portalPage.$eval(
        `#${SELECTORS.PORTAL_SELF_REG_USER_DEFAULT_ROLE_ID}`,
        (el: HTMLSelectElement) => el.selectedOptions[0].text
      );
      portal.selfRegUserDefaultProfile = await portalPage.$eval(
        `#${SELECTORS.PORTAL_SELF_REG_USER_DEFAULT_PROFILE_ID}`,
        (el: HTMLSelectElement) => el.selectedOptions[0].text
      );
      // portalProfileMemberships
      const portalProfilePage = await this.browserforce.openPage(
        `${PATHS.PORTAL_PROFILE_MEMBERSHIP}?portalId=${portal._id}&setupid=CustomerSuccessPortalSettings`
      );
      await portalProfilePage.waitForSelector(SELECTORS.PORTAL_ID);
      const profiles = await portalProfilePage.$$eval(
        SELECTORS.PORTAL_PROFILE_MEMBERSHIP_PROFILES,
        (ths: HTMLTableHeaderCellElement[]) => {
          return ths.map(th => th.innerText.trim());
        }
      );
      const checkboxes = await portalProfilePage.$$eval(
        SELECTORS.PORTAL_PROFILE_MEMBERSHIP_CHECKBOXES,
        (inputs: HTMLInputElement[]) => {
          return inputs.map(input => {
            return {
              active: input.checked,
              _id: input.id
            };
          });
        }
      );
      const portalProfileMemberships = [];
      for (let i = 0; i < profiles.length; i++) {
        portalProfileMemberships.push({
          name: profiles[i],
          active: checkboxes[i].active,
          _id: checkboxes[i]._id
        });
      }
      portal.portalProfileMemberships = portalProfileMemberships;
    }
    return response;
  }

  public diff(source: Config, target: Config): Config {
    const response = [];
    if (source && target) {
      for (const portal of target) {
        let sourcePortal = source.find(p => p.name === portal.name);
        if (portal.oldName && !sourcePortal) {
          // fallback to old name of portal
          sourcePortal = source.find(p => p.name === portal.oldName);
        }
        if (!sourcePortal) {
          throw new Error(
            `Portal with name '${portal.name} (oldName: ${portal.oldName})' not found. Setting up new Portals is not yet supported.`
          );
        }
        delete portal.oldName;
        if (sourcePortal) {
          // move id of existing portal to new portal to be retained and used
          portal._id = sourcePortal._id;
          delete sourcePortal._id;
        }
        if (
          sourcePortal.portalProfileMemberships &&
          portal.portalProfileMemberships
        ) {
          const membershipResponse = [];
          for (const member of portal.portalProfileMemberships) {
            // move id of existing member to new member to be retained and used
            const sourceMember = sourcePortal.portalProfileMemberships.find(
              m => m.name === member.name
            );
            if (sourceMember) {
              member._id = sourceMember._id;
              delete sourceMember._id;
            } else {
              throw new Error(
                `Could not find portal profile membership for '${member.name}'`
              );
            }
            const membershipDiff = semanticallyCleanObject(
              removeNullValues(jsonMergePatch.generate(sourceMember, member)),
              '_id'
            );
            if (membershipDiff) {
              membershipResponse.push(membershipDiff);
            }
          }
          delete sourcePortal.portalProfileMemberships;
          delete portal.portalProfileMemberships;
          if (membershipResponse.length) {
            portal.portalProfileMemberships = membershipResponse;
          }
        }
        const diff = semanticallyCleanObject(
          removeNullValues(jsonMergePatch.generate(sourcePortal, portal)),
          '_id'
        );
        if (diff) {
          response.push(diff);
        }
      }
    }
    return response;
  }

  public async apply(config: Config): Promise<void> {
    for (const portal of config) {
      if (portal._id) {
        // everything that can be changed using the url
        const urlAttributes = {};
        if (portal.name) {
          urlAttributes['Name'] = portal.name;
        }
        if (portal.description) {
          urlAttributes['Description'] = portal.description;
        }
        if (portal.adminUser) {
          urlAttributes[SELECTORS.PORTAL_ADMIN_ID] = portal.adminUser;
        }
        if (portal.isSelfRegistrationActivated !== undefined) {
          urlAttributes[
            SELECTORS.PORTAL_IS_SELF_REGISTRATION_ACTIVATED_ID
          ] = portal.isSelfRegistrationActivated ? 1 : 0;
        }
        const page = await this.browserforce.openPage(
          `${portal._id}/e?${queryString.stringify(urlAttributes)}`
        );
        await page.waitForSelector(SELECTORS.PORTAL_DESCRIPTION);
        if (portal.selfRegUserDefaultLicense) {
          const licenseValue = await page.evaluate(
            (option: HTMLOptionElement) => option.value,
            (
              await page.$x(
                `//select[@id="${SELECTORS.PORTAL_SELF_REG_USER_DEFAULT_LICENSE_ID}"]//option[text()="${portal.selfRegUserDefaultLicense}"]`
              )
            )[0]
          );
          await page.select(
            `#${SELECTORS.PORTAL_SELF_REG_USER_DEFAULT_LICENSE_ID}`,
            licenseValue
          );
        }
        if (portal.selfRegUserDefaultRole) {
          const roleValue = await page.evaluate(
            (option: HTMLOptionElement) => option.value,
            (
              await page.$x(
                `//select[@id="${SELECTORS.PORTAL_SELF_REG_USER_DEFAULT_ROLE_ID}"]//option[text()="${portal.selfRegUserDefaultRole}"]`
              )
            )[0]
          );
          await page.select(
            `#${SELECTORS.PORTAL_SELF_REG_USER_DEFAULT_ROLE_ID}`,
            roleValue
          );
        }
        if (portal.selfRegUserDefaultProfile) {
          const profileValue = await page.evaluate(
            (option: HTMLOptionElement) => option.value,
            (
              await page.$x(
                `//select[@id="${SELECTORS.PORTAL_SELF_REG_USER_DEFAULT_PROFILE_ID}"]//option[text()="${portal.selfRegUserDefaultProfile}"]`
              )
            )[0]
          );
          await page.select(
            `#${SELECTORS.PORTAL_SELF_REG_USER_DEFAULT_PROFILE_ID}`,
            profileValue
          );
        }
        await page.waitForSelector(SELECTORS.SAVE_BUTTON);
        await Promise.all([
          page.waitForNavigation(),
          page.click(SELECTORS.SAVE_BUTTON)
        ]);
        if ((await page.url()).includes(portal._id)) {
          // error handling
          await page.waitForSelector(SELECTORS.PORTAL_DESCRIPTION);
          await this.browserforce.throwPageErrors(page);
          throw new Error(`saving customer portal '${portal._id}' failed`);
        }
        // portalProfileMemberships
        if (portal.portalProfileMemberships) {
          const membershipUrlAttributes = {};
          for (const member of portal.portalProfileMemberships) {
            membershipUrlAttributes[member._id] = member.active ? 1 : 0;
          }
          const portalProfilePage = await this.browserforce.openPage(
            `${PATHS.PORTAL_PROFILE_MEMBERSHIP}?portalId=${
              portal._id
            }&setupid=CustomerSuccessPortalSettings&${queryString.stringify(
              membershipUrlAttributes
            )}`
          );
          await portalProfilePage.waitForSelector(SELECTORS.SAVE_BUTTON);
          await Promise.all([
            portalProfilePage.waitForNavigation(),
            portalProfilePage.click(SELECTORS.SAVE_BUTTON)
          ]);
        }
      }
    }
  }
}
