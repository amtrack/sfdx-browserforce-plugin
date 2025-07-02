import * as queryString from 'querystring';
import { BrowserforcePlugin } from '../../../plugin.js';
import { semanticallyCleanObject } from '../../utils.js';

const LIST_VIEW_PATH = '_ui/core/portal/CustomerSuccessPortalSetup/d';
const PORTAL_PROFILE_MEMBERSHIP_PATH =
  '_ui/core/portal/PortalProfileMembershipPage/e';

const SAVE_BUTTON_SELECTOR = 'input[name="save"]';
const LIST_VIEW_PORTAL_LINKS_XPATH_SELECTOR =
  '//div[contains(@class,"pbBody")]//th[contains(@class,"dataCell")]//a[starts-with(@href, "/060")]';
const PORTAL_DESCRIPTION_SELECTOR = 'input#Description';
const PORTAL_ID_SELECTOR = '#portalId';
const PORTAL_ADMIN_ID_SELECTOR = 'input#Admin';
const PORTAL_IS_SELF_REGISTRATION_ACTIVATED_ID_SELECTOR =
  'input#IsSelfRegistrationActivated';
const PORTAL_SELF_REG_USER_DEFAULT_LICENSE_ID_SELECTOR =
  'select#SelfRegUserDefaultLicense';
const PORTAL_SELF_REG_USER_DEFAULT_ROLE_ID_SELECTOR =
  'select#SelfRegUserDefaultRole';
const PORTAL_SELF_REG_USER_DEFAULT_PROFILE_ID_SELECTOR =
  'select#SelfRegUserDefaultProfile';
const PORTAL_PROFILE_MEMBERSHIP_PROFILES_SELECTOR = 'th.dataCell';
const PORTAL_PROFILE_MEMBERSHIP_CHECKBOXES_SELECTOR = 'td.dataCell input';

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
  public async retrieve(): Promise<Config> {
    const page = await this.browserforce.openPage(LIST_VIEW_PATH);
    await page.waitForSelector(
      `::-p-xpath(${LIST_VIEW_PORTAL_LINKS_XPATH_SELECTOR})`
    );
    const customerPortalLinks = await page.$$(
      `xpath/.${LIST_VIEW_PORTAL_LINKS_XPATH_SELECTOR}`
    );
    const response: Config = await page.evaluate((...links) => {
      return links.map((a: HTMLAnchorElement) => {
        return {
          _id: a.pathname.split('/')[1],
          name: a.text,
          portalProfileMemberships: [],
        };
      });
    }, ...customerPortalLinks);
    for (const portal of response) {
      const portalPage = await this.browserforce.openPage(`${portal._id}/e`);
      portal.description = await portalPage
        .locator(PORTAL_DESCRIPTION_SELECTOR)
        .map((input) => input.value)
        .wait();
      portal.adminUser = await portalPage
        .locator(PORTAL_ADMIN_ID_SELECTOR)
        .map((input) => input.value)
        .wait();
      portal.isSelfRegistrationActivated = await portalPage
        .locator(PORTAL_IS_SELF_REGISTRATION_ACTIVATED_ID_SELECTOR)
        .map((checkbox) => checkbox.checked)
        .wait();
      portal.selfRegUserDefaultLicense = await portalPage
        .locator(PORTAL_SELF_REG_USER_DEFAULT_LICENSE_ID_SELECTOR)
        .map((select) => select.selectedOptions[0].text)
        .wait();
      portal.selfRegUserDefaultRole = await portalPage
        .locator(PORTAL_SELF_REG_USER_DEFAULT_ROLE_ID_SELECTOR)
        .map((select) => select.selectedOptions[0].text)
        .wait();
      portal.selfRegUserDefaultProfile = await portalPage
        .locator(PORTAL_SELF_REG_USER_DEFAULT_PROFILE_ID_SELECTOR)
        .map((select) => select.selectedOptions[0].text)
        .wait();
      await portalPage.close();
      // portalProfileMemberships
      const portalProfilePage = await this.browserforce.openPage(
        `${PORTAL_PROFILE_MEMBERSHIP_PATH}?portalId=${portal._id}&setupid=CustomerSuccessPortalSettings`
      );
      await portalProfilePage.waitForSelector(PORTAL_ID_SELECTOR);
      const profiles = await portalProfilePage.$$eval(
        PORTAL_PROFILE_MEMBERSHIP_PROFILES_SELECTOR,
        (ths: HTMLTableHeaderCellElement[]) => {
          return ths.map((th) => th.innerText.trim());
        }
      );
      const checkboxes = await portalProfilePage.$$eval(
        PORTAL_PROFILE_MEMBERSHIP_CHECKBOXES_SELECTOR,
        (inputs: HTMLInputElement[]) => {
          return inputs.map((input) => {
            return {
              active: input.checked,
              _id: input.id,
            };
          });
        }
      );
      const portalProfileMemberships: PortalProfileMembership[] = [];
      for (let i = 0; i < profiles.length; i++) {
        portalProfileMemberships.push({
          name: profiles[i],
          active: checkboxes[i].active,
          _id: checkboxes[i]._id,
        });
      }
      portal.portalProfileMemberships = portalProfileMemberships;
      await portalProfilePage.close();
    }
    await page.close();
    return response;
  }

  public diff(source?: Config, target?: Config): Config | undefined {
    const response: Config = [];
    if (source && target) {
      for (const plannedPortal of target) {
        const portal: PortalConfig = JSON.parse(JSON.stringify(plannedPortal));
        let sourcePortal = source.find((p) => p.name === portal.name);
        if (portal.oldName && !sourcePortal) {
          // fallback to old name of portal
          sourcePortal = source.find((p) => p.name === portal.oldName);
        }
        if (!sourcePortal) {
          throw new Error(
            `Portal with name '${portal.name} (oldName: ${portal.oldName})' not found. Setting up new Portals is not yet supported.`
          );
        }
        delete portal.oldName;
        if (sourcePortal) {
          // copy id of existing portal to new portal to be retained and used
          portal._id = sourcePortal._id;
        }
        if (
          sourcePortal.portalProfileMemberships &&
          portal.portalProfileMemberships
        ) {
          const membershipResponse: PortalProfileMembership[] = [];
          for (const member of portal.portalProfileMemberships) {
            // copy id of existing member to new member to be retained and used
            const sourceMember = sourcePortal.portalProfileMemberships.find(
              (m) => m.name === member.name
            );
            if (sourceMember) {
              member._id = sourceMember._id;
            } else {
              throw new Error(
                `Could not find portal profile membership for '${member.name}'`
              );
            }
            const membershipDiff = semanticallyCleanObject(
              super.diff(sourceMember, member),
              '_id'
            ) as PortalProfileMembership | undefined;
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
          super.diff(sourcePortal, portal),
          '_id'
        ) as PortalConfig | undefined;
        if (diff !== undefined) {
          response.push(diff);
        }
      }
    }
    return response.length ? response : undefined;
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
          urlAttributes['Admin'] = portal.adminUser;
        }
        if (portal.isSelfRegistrationActivated !== undefined) {
          urlAttributes['IsSelfRegistrationActivated'] =
            portal.isSelfRegistrationActivated ? 1 : 0;
        }
        const page = await this.browserforce.openPage(
          `${portal._id}/e?${queryString.stringify(urlAttributes)}`
        );
        await page.waitForSelector(PORTAL_DESCRIPTION_SELECTOR);
        if (portal.selfRegUserDefaultLicense) {
          const licenseValue = await page.evaluate(
            (option: HTMLOptionElement) => option.value,
            (
              await page.$$(
                `xpath/.//select[@id="SelfRegUserDefaultLicense"]//option[text()="${portal.selfRegUserDefaultLicense}"]`
              )
            )[0]
          );
          await page
            .locator(PORTAL_SELF_REG_USER_DEFAULT_LICENSE_ID_SELECTOR)
            .fill(licenseValue);
        }
        if (portal.selfRegUserDefaultRole) {
          const roleValue = await page.evaluate(
            (option: HTMLOptionElement) => option.value,
            (
              await page.$$(
                `xpath/.//select[@id="SelfRegUserDefaultRole"]//option[text()="${portal.selfRegUserDefaultRole}"]`
              )
            )[0]
          );
          await page
            .locator(PORTAL_SELF_REG_USER_DEFAULT_ROLE_ID_SELECTOR)
            .fill(roleValue);
        }
        if (portal.selfRegUserDefaultProfile) {
          const profileValue = await page.evaluate(
            (option: HTMLOptionElement) => option.value,
            (
              await page.$$(
                `xpath/.//select[@id="SelfRegUserDefaultProfile"]//option[text()="${portal.selfRegUserDefaultProfile}"]`
              )
            )[0]
          );
          await page
            .locator(PORTAL_SELF_REG_USER_DEFAULT_PROFILE_ID_SELECTOR)
            .fill(profileValue);
        }
        await Promise.all([
          page.waitForNavigation(),
          page.locator(SAVE_BUTTON_SELECTOR).click(),
        ]);
        if ((await page.url()).includes(portal._id)) {
          // error handling
          await page.locator(PORTAL_DESCRIPTION_SELECTOR).wait();
          await this.browserforce.throwPageErrors(page);
          throw new Error(`saving customer portal '${portal._id}' failed`);
        }
        // portalProfileMemberships
        if (portal.portalProfileMemberships) {
          const membershipUrlAttributes = {};
          for (const member of portal.portalProfileMemberships) {
            membershipUrlAttributes[member._id!] = member.active ? 1 : 0;
          }
          const portalProfilePage = await this.browserforce.openPage(
            `${PORTAL_PROFILE_MEMBERSHIP_PATH}?portalId=${
              portal._id
            }&setupid=CustomerSuccessPortalSettings&${queryString.stringify(
              membershipUrlAttributes
            )}`
          );
          await Promise.all([
            portalProfilePage.waitForNavigation(),
            portalProfilePage.locator(SAVE_BUTTON_SELECTOR).click(),
          ]);
          await portalProfilePage.close();
        }
        await page.close();
      }
    }
  }
}
