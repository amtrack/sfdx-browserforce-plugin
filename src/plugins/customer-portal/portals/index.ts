import * as queryString from 'querystring';
import { waitForPageErrors } from '../../../browserforce.js';
import { BrowserforcePlugin } from '../../../plugin.js';
import { semanticallyCleanObject } from '../../utils.js';

const LIST_VIEW_PATH = '_ui/core/portal/CustomerSuccessPortalSetup/d';
const PORTAL_PROFILE_MEMBERSHIP_PATH =
  '_ui/core/portal/PortalProfileMembershipPage/e';

const SAVE_BUTTON_SELECTOR = 'input[name="save"]';
const LIST_VIEW_PORTAL_LINKS_XPATH_SELECTOR =
  '//div[contains(@class,"pbBody")]//th[contains(@class,"dataCell")]//a[starts-with(@href, "/060")]';
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
    await page
      .locator(`xpath=${LIST_VIEW_PORTAL_LINKS_XPATH_SELECTOR}`)
      .first()
      .waitFor();
    const response: Config = await page
      .locator(
        'xpath=//div[contains(@class,"pbBody")]//th[contains(@class,"dataCell")]//a[starts-with(@href, "/060")]'
      )
      .evaluateAll((links: HTMLAnchorElement[]) => {
        return links.map((a) => {
          return {
            _id: a.pathname.split('/')[1],
            name: a.text,
            portalProfileMemberships: [],
          };
        });
      });
    for (const portal of response) {
      const portalPage = await this.browserforce.openPage(`${portal._id}/e`);
      portal.description = await portalPage
        .locator('input#Description')
        .inputValue();
      portal.adminUser = await portalPage.locator('input#Admin').inputValue();
      portal.isSelfRegistrationActivated = await portalPage
        .locator('input#IsSelfRegistrationActivated')
        .isChecked();
      portal.selfRegUserDefaultLicense = await portalPage
        .locator('select#SelfRegUserDefaultLicense option:checked')
        .textContent();
      portal.selfRegUserDefaultRole = await portalPage
        .locator('select#SelfRegUserDefaultRole option:checked')
        .textContent();
      portal.selfRegUserDefaultProfile = await portalPage
        .locator('select#SelfRegUserDefaultProfile option:checked')
        .textContent();
      await portalPage.close();
      // portalProfileMemberships
      const portalProfilePage = await this.browserforce.openPage(
        `${PORTAL_PROFILE_MEMBERSHIP_PATH}?portalId=${portal._id}&setupid=CustomerSuccessPortalSettings`
      );
      // TODO: is this necessary?
      await portalProfilePage
        .locator('input#portalId[type="hidden"]')
        .waitFor({ state: 'attached' });
      const profiles = await portalProfilePage
        .locator(PORTAL_PROFILE_MEMBERSHIP_PROFILES_SELECTOR)
        .evaluateAll((ths: HTMLTableHeaderCellElement[]) => {
          return ths.map((th) => th.innerText.trim());
        });
      const checkboxes = await portalProfilePage
        .locator(PORTAL_PROFILE_MEMBERSHIP_CHECKBOXES_SELECTOR)
        .evaluateAll((inputs: HTMLInputElement[]) => {
          return inputs.map((input) => {
            return {
              active: input.checked,
              _id: input.id,
            };
          });
        });
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
        const urlAttributes: { [key: string]: string | number } = {};
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
        await page.locator('input#Description').waitFor();
        if (portal.selfRegUserDefaultLicense) {
          await page
            .locator('select#SelfRegUserDefaultLicense')
            .selectOption({ label: portal.selfRegUserDefaultLicense });
        }
        if (portal.selfRegUserDefaultRole) {
          await page
            .locator('select#SelfRegUserDefaultRole')
            .selectOption({ label: portal.selfRegUserDefaultRole });
        }
        if (portal.selfRegUserDefaultProfile) {
          await page
            .locator('select#SelfRegUserDefaultProfile')
            .selectOption({ label: portal.selfRegUserDefaultProfile });
        }
        await page.locator(SAVE_BUTTON_SELECTOR).first().click();
        await Promise.race([
          page.waitForURL((url) => !url.pathname.includes(portal._id)),
          waitForPageErrors(page),
        ]);
        // portalProfileMemberships
        if (portal.portalProfileMemberships) {
          const membershipUrlAttributes: { [key: string]: number } = {};
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
          await portalProfilePage.locator(SAVE_BUTTON_SELECTOR).first().click();
          await Promise.race([
            portalProfilePage.waitForURL(
              (url) => url.pathname !== `/${PORTAL_PROFILE_MEMBERSHIP_PATH}`
            ),
            waitForPageErrors(portalProfilePage),
          ]);
          await portalProfilePage.close();
        }
        await page.close();
      }
    }
  }
}
