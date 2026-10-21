import Constants from 'expo-constants';
import { Txt } from './ui';

/** The same disclaimer at the foot of every tab. */
export function Disclaimer() {
  const version = Constants.expoConfig?.version;
  const name = version ? `Sakhi Samachar ${version}` : 'Sakhi Samachar';
  return (
    <Txt v="small" style={{ textAlign: 'center', paddingTop: 8, paddingHorizontal: 8 }}>
      {`${name} is a diary, not medical advice. Not validated for contraceptive advice.`}
    </Txt>
  );
}
