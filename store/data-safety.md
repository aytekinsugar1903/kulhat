# Data safety form — draft

Play Console → App content → Data safety. Answers for this build only.

| Question | Answer |
| --- | --- |
| Does the app collect or share any of the required user data types? | No |
| Is all of the user data collected by your app encrypted in transit? | Not applicable. No data leaves the device. |
| Do you provide a way for users to request that their data be deleted? | Not applicable. Uninstalling the app deletes the local save. There is no account. |
| Ads | No. The app does not contain ads. |
| In-app purchases | No. |
| Data types (location, personal info, financial, photos, audio, files, calendar, contacts, app activity, web browsing, device IDs, diagnostics, health) | None collected. None shared. |
| Crash logs / diagnostics sent to the developer | No SDK. |
| Advertising ID | Not used. |
| Account creation | No. |

Local save keys live in the app WebView storage (`kulhat-save-v2`, `kulhat-lang`). They are not synced.

YouTube Playables is a separate web package. Its cloud save is YouTube's own `saveData` API and is not part of this Android build.

Do not mark "data is collected" to match a future analytics SDK. This draft matches the current binary.
