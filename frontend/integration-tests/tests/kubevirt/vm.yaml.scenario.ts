/* eslint-disable no-undef */
import { execSync } from 'child_process';
import { browser } from 'protractor';

import { appHost, testName } from '../../protractor.conf';
import { isLoaded } from '../../views/crud.view';
import * as yamlView from '../../views/yaml.view';
import { removeLeakedResources } from './utils/utils';
import Yaml from './models/yaml';
import { VirtualMachine } from './models/virtualMachine';
import { testNad, customVMWithNicDisk } from './mocks';
import { TABS, VM_BOOTUP_TIMEOUT } from './utils/consts';

describe('Test create vm from yaml', () => {
  const leakedResources = new Set<string>();
  const yaml = new Yaml();

  beforeAll(async() => {
    execSync(`echo '${JSON.stringify(testNad)}' | kubectl create -f -`);
  });

  beforeEach(async() => {
    await browser.get(`${appHost}/k8s/ns/${testName}/virtualmachines`);
    await isLoaded();
    await yaml.openYamlPage();
  });

  afterAll(async() => {
    removeLeakedResources(leakedResources);
    execSync(`echo '${JSON.stringify(testNad)}' | kubectl delete -f -`);
  });

  describe('Test create VM from the default yaml', () => {
    it('Creates VM', async() => {
      await yaml.createVMFromYaml();
      await isLoaded();
      const vm = new VirtualMachine({name: 'example', namespace: testName});
      await vm.action('Start');

      // prepare VM source for removing
      leakedResources.add(JSON.stringify({name: 'example', namespace: testName, kind: 'vm'}));
    });
  });

  describe('Test create VM from the default yaml again', () => {
    it('Fails to create VM because VM exists', async() => {
      await yaml.createVMFromYaml();
      await yaml.errorOccurOnCreateVM();
      await yaml.cancelCreateVM();
      expect(browser.getCurrentUrl()).toEqual(`${appHost}/k8s/ns/${testName}/virtualmachines`);
    });
  });

  describe('Test create VM from custome yaml', () => {
    it('Creates VM from a custom vm yaml with additional nics and disks', async() => {
      await yamlView.setContent(customVMWithNicDisk);
      await yaml.createVMFromYaml();
      await isLoaded();
      const vm = new VirtualMachine({name: `vm-${testName}`, namespace: testName});
      await vm.action('Start');

      // Verify additional nic and disk exists.
      // Note: 'testdisk' and 'nic1' are hard coded in vm yaml customVMWithNicDisk
      expect((await vm.getAttachedResources(TABS.DISKS)).includes('testdisk')).toBe(true);
      expect((await vm.getAttachedResources(TABS.NICS)).includes('nic1')).toBe(true);

      // prepare VM source for removing
      leakedResources.add(JSON.stringify({name: `vm-${testName}`, namespace: testName, kind: 'vm'}));
    }, VM_BOOTUP_TIMEOUT);
  });

  describe('Test create VM from an invalid yaml', () => {
    it('Fails to create VM from invalid yaml', async() => {
      await yamlView.setContent(customVMWithNicDisk.replace('VirtualMachine', 'VirtualMachineInstance'));
      await yaml.createVMFromYaml();
      await yaml.errorOccurOnCreateVM();
      await yaml.cancelCreateVM();
      expect(browser.getCurrentUrl()).toEqual(`${appHost}/k8s/ns/${testName}/virtualmachines`);
    });
  });
});
