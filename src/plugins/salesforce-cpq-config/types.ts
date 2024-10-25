export type FormConfig = {
  [key: string]: {
    label: string;
    component: string; // 'tab'
    id: string;
    properties: {
      [key: string]: {
        label: string;
        component: string; // 'input' | 'select'
        type: string; // 'string' | 'boolean' | 'number'
        name: string;
        immediatelySave?: boolean;
      };
    };
  };
};
