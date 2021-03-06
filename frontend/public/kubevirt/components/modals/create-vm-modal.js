import { modalResourceLauncher } from '../utils/modalResourceLauncher';
import { CreateVmWizard, TEMPLATE_TYPE_LABEL, getResource, TEMPLATE_TYPE_VM, TEMPLATE_TYPE_BASE } from 'kubevirt-web-ui-components';
import { k8sCreate, k8sGet, k8sPatch, k8sKill } from '../../module/okdk8s';
import {
  NamespaceModel,
  TemplateModel,
  NetworkAttachmentDefinitionModel,
  StorageClassModel,
  PersistentVolumeClaimModel,
  VmTemplateModel,
  DataVolumeModel,
  VirtualMachineModel,
} from '../../models';
import { WithResources } from '../utils/withResources';
import { units } from '../utils/okdutils';

export const openCreateVmWizard = ( activeNamespace, createTemplate = false ) => {
  const launcher = modalResourceLauncher(CreateVmWizard, {
    namespaces: {
      resource: getResource(NamespaceModel),
    },
    virtualMachines: {
      resource: getResource(VirtualMachineModel),
      required: true,
    },
    userTemplates: {
      resource: getResource(TemplateModel, {namespace: activeNamespace, prop: 'userTemplates', matchLabels: {[TEMPLATE_TYPE_LABEL]: TEMPLATE_TYPE_VM}}),
    },
    commonTemplates: {
      resource: getResource(VmTemplateModel, {namespace: 'openshift', prop: 'commonTemplates', matchLabels: {[TEMPLATE_TYPE_LABEL]: TEMPLATE_TYPE_BASE}}),
    },
    networkConfigs: {
      resource: getResource(NetworkAttachmentDefinitionModel, {namespace: activeNamespace}),
    },
    storageClasses: {
      resource:  getResource(StorageClassModel),
    },
    persistentVolumeClaims: {
      resource:  getResource(PersistentVolumeClaimModel, {namespace: activeNamespace}),
    },
    dataVolumes: {
      resource:  getResource(DataVolumeModel, {namespace: activeNamespace}),
    },
  },(({namespaces, userTemplates, commonTemplates}) => {
      let selectedNamespace;

      if (namespaces && activeNamespace){
        selectedNamespace = namespaces.find(namespace => namespace.metadata.name === activeNamespace);
      }

      let templates;
      if (userTemplates && commonTemplates) {
        templates = userTemplates.concat(commonTemplates);
      }

      return {
        selectedNamespace,
        templates,
      };
    }));

  launcher({
    k8sCreate, // TODO: wrap in sort of "Context" object
    k8sGet,
    k8sPatch,
    k8sKill,
    units,
    WithResources, // for loading of data subsets based on actual user's selection
    createTemplate,
  });

};
