// Test exchange modules...

import { AutosincIkoToJetty } from "./exchange/iiko-to-jetti-autosync";
import { IJettiProject, SMVProject } from "./exchange/jetti-projects";

const proj: IJettiProject = SMVProject;

AutosincIkoToJetty(proj, 'Russia').catch(() => { });
