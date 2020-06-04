// Test exchange modules...

import { AutosincIkoToJetty } from "./exchange/iiko-to-jetti-autosync";

const proj: string = 'SMV';

AutosincIkoToJetty(proj).catch(() => { });
