import { Identifiable } from './identifiable';

export interface TestDataNodeJoinColumn extends Identifiable {
  from: string;
  to: string;
}
