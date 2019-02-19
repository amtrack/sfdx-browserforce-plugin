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

export default class CustomerPortalSetup extends BrowserforcePlugin {
  public async retrieve(definition?) {
    const page = await this.browserforce.openPage(PATHS.LIST_VIEW);
    await page.waitForXPath(SELECTORS.LIST_VIEW_PORTAL_LINKS_XPATH);
    const customerPortalLinks = await page.$x(
      SELECTORS.LIST_VIEW_PORTAL_LINKS_XPATH
    );
    const response = await page.evaluate((...links) => {
      return links.map((a: HTMLAnchorElement) => {
        return {
          id: a.pathname.split('/')[1],
          name: a.text,
          portalProfileMemberships: []
        };
      });
    }, ...customerPortalLinks);
    for (const portal of response) {
      const portalPage = await this.browserforce.openPage(`${portal.id}/e`);
      await portalPage.waitFor(SELECTORS.PORTAL_DESCRIPTION);
      portal['description'] = await portalPage.$eval(
        SELECTORS.PORTAL_DESCRIPTION,
        (el: HTMLInputElement) => el.value
      );
      portal['adminUser'] = await portalPage.$eval(
        `#${SELECTORS.PORTAL_ADMIN_ID}`,
        (el: HTMLInputElement) => el.value
      );
      portal['isSelfRegistrationActivated'] = await portalPage.$eval(
        `#${SELECTORS.PORTAL_IS_SELF_REGISTRATION_ACTIVATED_ID}`,
        (el: HTMLInputElement) => el.checked
      );
      portal['selfRegUserDefaultLicense'] = await portalPage.$eval(
        `#${SELECTORS.PORTAL_SELF_REG_USER_DEFAULT_LICENSE_ID}`,
        (el: HTMLSelectElement) => el.selectedOptions[0].text
      );
      portal['selfRegUserDefaultRole'] = await portalPage.$eval(
        `#${SELECTORS.PORTAL_SELF_REG_USER_DEFAULT_ROLE_ID}`,
        (el: HTMLSelectElement) => el.selectedOptions[0].text
      );
      portal['selfRegUserDefaultProfile'] = await portalPage.$eval(
        `#${SELECTORS.PORTAL_SELF_REG_USER_DEFAULT_PROFILE_ID}`,
        (el: HTMLSelectElement) => el.selectedOptions[0].text
      );
      // portalProfileMemberships
      const portalProfilePage = await this.browserforce.openPage(
        `${PATHS.PORTAL_PROFILE_MEMBERSHIP}?portalId=${
          portal.id
        }&setupid=CustomerSuccessPortalSettings`
      );
      await portalProfilePage.waitFor(SELECTORS.PORTAL_ID);
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
              id: input.id
            };
          });
        }
      );
      const portalProfileMemberships = [];
      for (let i = 0; i < profiles.length; i++) {
        portalProfileMemberships.push({
          name: profiles[i],
          active: checkboxes[i].active,
          id: checkboxes[i].id
        });
      }
      portal['portalProfileMemberships'] = portalProfileMemberships;
    }
    return response;
  }

  public diff(source, target) {
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
            `Portal with name '${portal.name} (oldName: ${
              portal.oldName
            })' not found. Setting up new Portals is not yet supported.`
          );
        }
        delete portal['oldName'];
        if (sourcePortal) {
          // move id of existing portal to new portal to be retained and used
          portal.id = sourcePortal.id;
          delete sourcePortal.id;
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
              member.id = sourceMember.id;
              delete sourceMember.id;
            } else {
              throw new Error(
                `Could not find portal profile membership for '${member.name}'`
              );
            }
            const membershipDiff = semanticallyCleanObject(
              removeNullValues(jsonMergePatch.generate(sourceMember, member))
            );
            if (membershipDiff) {
              membershipResponse.push(membershipDiff);
            }
          }
          delete sourcePortal.portalProfileMemberships;
          delete portal.portalProfileMemberships;
          if (membershipResponse.length) {
            portal['portalProfileMemberships'] = membershipResponse;
          }
        }
        const diff = semanticallyCleanObject(
          removeNullValues(jsonMergePatch.generate(sourcePortal, portal))
        );
        if (diff) {
          response.push(diff);
        }
      }
    }
    return response;
  }

  public async apply(config) {

    for (const portal of config) {
      if (portal.id) {
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
          `${portal.id}/e?${queryString.stringify(urlAttributes)}`
        );
        await page.waitFor(SELECTORS.PORTAL_DESCRIPTION);
        if (portal.selfRegUserDefaultLicense) {
          const licenseValue = await page.evaluate(
            (option: HTMLOptionElement) => option.value,
            (await page.$x(
              `//select[@id="${
                SELECTORS.PORTAL_SELF_REG_USER_DEFAULT_LICENSE_ID
              }"]//option[text()="${portal.selfRegUserDefaultLicense}"]`
            ))[0]
          );
          await page.select(
            `#${SELECTORS.PORTAL_SELF_REG_USER_DEFAULT_LICENSE_ID}`,
            licenseValue
          );
        }
        if (portal.selfRegUserDefaultRole) {
          const roleValue = await page.evaluate(
            (option: HTMLOptionElement) => option.value,
            (await page.$x(
              `//select[@id="${
                SELECTORS.PORTAL_SELF_REG_USER_DEFAULT_ROLE_ID
              }"]//option[text()="${portal.selfRegUserDefaultRole}"]`
            ))[0]
          );
          await page.select(
            `#${SELECTORS.PORTAL_SELF_REG_USER_DEFAULT_ROLE_ID}`,
            roleValue
          );
        }
        if (portal.selfRegUserDefaultProfile) {
          const profileValue = await page.evaluate(
            (option: HTMLOptionElement) => option.value,
            (await page.$x(
              `//select[@id="${
                SELECTORS.PORTAL_SELF_REG_USER_DEFAULT_PROFILE_ID
              }"]//option[text()="${portal.selfRegUserDefaultProfile}"]`
            ))[0]
          );
          await page.select(
            `#${SELECTORS.PORTAL_SELF_REG_USER_DEFAULT_PROFILE_ID}`,
            profileValue
          );
        }
        await page.waitFor(SELECTORS.SAVE_BUTTON);
        await Promise.all([
          page.waitForNavigation({
            waitUntil: ['load', 'domcontentloaded', 'networkidle0']
          }),
          page.click(SELECTORS.SAVE_BUTTON)
        ]);
        if ((await page.url()).includes(portal.id)) {
          // error handling
          await page.waitFor(SELECTORS.PORTAL_DESCRIPTION);
          await this.browserforce.throwPageErrors(page);
          throw new Error(`saving customer portal '${portal.id}' failed`);
        }
        // portalProfileMemberships
        if (portal.portalProfileMemberships) {
          const membershipUrlAttributes = {};
          for (const member of portal.portalProfileMemberships) {
            membershipUrlAttributes[member.id] = member.active ? 1 : 0;
          }
          const portalProfilePage = await this.browserforce.openPage(
            `${PATHS.PORTAL_PROFILE_MEMBERSHIP}?portalId=${
              portal.id
            }&setupid=CustomerSuccessPortalSettings&${queryString.stringify(
              membershipUrlAttributes
            )}`
          );
          await portalProfilePage.waitFor(SELECTORS.SAVE_BUTTON);
          await Promise.all([
            portalProfilePage.waitForNavigation(),
            portalProfilePage.click(SELECTORS.SAVE_BUTTON)
          ]);
        }
      }
    }
  }
}
